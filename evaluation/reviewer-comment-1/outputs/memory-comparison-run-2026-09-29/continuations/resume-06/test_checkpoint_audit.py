"""Bounded offline delta/provenance tests on private checkpoint copies."""
from __future__ import annotations

import json
import shutil
import socket
import subprocess
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

import checkpoint_audit as audit

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]


def put(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def lines(path, rows):
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def fixture_verifier(original):
    for name, expected in audit.read_json(original / "manifest.json")["files"].items():
        audit.require(audit.sha256(original / name) == expected, "Copied frozen original input changed")
    return {"status": "verified", "fixture_only": True}


class CheckpointAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp = tempfile.TemporaryDirectory(prefix="rate-checkpoint-offline-")
        cls.addClassCleanup(temp.cleanup)
        cls.original = Path(temp.name).resolve() / "comparison"
        cls.original.mkdir()
        manifest = audit.read_json(ORIGINAL / "manifest.json")
        for name in ["manifest.json", *manifest["files"]]:
            target = cls.original / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ORIGINAL / name, target)
        for name in ("resume-02", "resume-03", "resume-04", "resume-05"):
            shutil.copytree(ORIGINAL / "continuations" / name, cls.original / "continuations" / name)
        cls.previous = cls.original / "continuations/resume-05"
        cls.runtime = cls.original / "runtime"
        checkpoint = HERE / "snapshot" if (HERE / "snapshot").is_dir() else ORIGINAL / "runtime"
        shutil.copytree(checkpoint, cls.runtime)
        cls.run_dir = cls.runtime / audit.RUN_ID
        cls.session = cls.run_dir / "sessions/session_03"
        cls.native = next((cls.run_dir / "runs").glob("*.json"))
        cls.memory = next((cls.run_dir / "memory").glob("*.jsonl"))
        cls.recovered = cls.runtime / audit.RECOVERED_RUN / "sessions/session_03"
        journal = cls.runtime / "processes.jsonl"
        old = (cls.previous / "snapshot/processes.jsonl").read_bytes()
        new = [json.loads(line) for line in journal.read_bytes()[len(old):].splitlines()]
        for row in new:
            if row["event"] == "start":
                row["command"][1] = str(cls.previous / "worker.py")
        journal.write_bytes(old + "".join(json.dumps(row) + "\n" for row in new).encode())

    def setUp(self):
        for owner, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"), (socket, "create_connection"),
                            (subprocess, "Popen"), (subprocess, "run")):
            guard = patch.object(owner, name, side_effect=AssertionError("No network or process is allowed in this audit"))
            guard.start()
            self.addCleanup(guard.stop)
        verifier = patch.object(audit, "_verify_original", side_effect=fixture_verifier)
        verifier.start()
        self.addCleanup(verifier.stop)

    @contextmanager
    def changed(self, path):
        before = path.read_bytes()
        try:
            yield
        finally:
            path.write_bytes(before)

    def reject_json(self, path, mutate):
        with self.changed(path):
            data = audit.read_json(path)
            mutate(data)
            put(path, data)
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def reject_lines(self, path, mutate):
        with self.changed(path):
            data = audit.read_jsonl(path)
            mutate(data)
            lines(path, data)
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def test_real_checkpoint_preserves_prefix_and_returns_only_failed_classifier(self):
        before = audit.snapshot(self.runtime)
        result = audit.audit_checkpoint(self.original)
        self.assertEqual(result["runtime_file_sha256"], before)
        self.assertEqual(audit.snapshot(self.runtime), before)
        self.assertEqual((result["completed_sessions"], result["accepted_turns"], result["next_execution_order"]), (89, 449, 90))
        self.assertEqual((result["requests"], result["responses"], result["provider_errors"]), (860, 850, 10))
        self.assertEqual((result["preserved_prefix_turns"], result["new_accepted_turns"]), (390, 59))
        self.assertEqual((result["delta_requests"], result["delta_responses"], result["delta_provider_errors"]), (111, 109, 2))
        self.assertEqual((result["run_accepted_turns"], result["partial_accepted_turns"]), (14, 4))
        events = audit.read_jsonl(self.session / "generation-events.jsonl")
        self.assertEqual(result["failed_request"], events[-3])
        self.assertEqual(result["failed_outcome"], events[-2])
        self.assertEqual(result["failed_request"]["stage"], "classify_topic_and_emotion")
        self.assertEqual(result["failed_request"]["turn_id"], "s03t05")
        self.assertNotIn("cached_finalization_calls", result)
        self.assertEqual(result["archived_error"]["upstream_code"], 429)
        self.assertEqual(result["archived_error"]["provider_error_type"], "rate_limit_exceeded")
        self.assertIsNone(result["archived_error"]["retry_after"])
        self.assertFalse(result["archived_error"]["visible_content_present"])
        self.assertEqual(result["live_requests_by_audit"], 0)
        state = audit.read_json(self.native)["sessions"][-1]["final_state"]
        self.assertEqual((state["total_turns"], state["last_episode_turn"], len(state["history"]), len(state["messages"])), (14, 10, 5, 10))

    def test_terminal_error_cannot_be_promoted_or_change_provenance(self):
        events = self.session / "generation-events.jsonl"
        wire = self.session / "openrouter-api-records.jsonl"
        self.reject_lines(events, lambda rows: rows[-2].update(event="outcome", accepted=True, text="A classifier answer"))
        self.reject_lines(events, lambda rows: rows[-3]["generation_config"].update(temperature=.7))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["message"].update(content="A classifier answer"))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["error"].update(code=504))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["error"]["metadata"].update(error_type="different_failure"))
        self.reject_lines(wire, lambda rows: rows[-1].update(retry_after=30))

    def test_terminal_retry_group_gate_and_stop_must_identify_same_failure(self):
        journal = self.session / "timeout-retries.jsonl"
        self.reject_lines(journal, lambda rows: rows[-2].update(will_retry=True, retry_eligible=True))
        self.reject_lines(journal, lambda rows: rows[-3].update(native_archive_prefix_sha256="foreign"))
        self.reject_lines(journal, lambda rows: rows[-1].update(outcome="returned_response"))
        self.reject_json(self.runtime / "request-gate.json", lambda value: value["in_flight"].update(gate_request_id="foreign"))
        self.reject_json(self.runtime / "STOP", lambda value: value.update(native_record_id="foreign"))

    def test_pending_native_window_source_and_accepted_count_are_consistent(self):
        self.reject_json(self.native, lambda value: value["sessions"][2]["final_state"].update(total_turns=15))
        self.reject_json(self.native, lambda value: value["sessions"][2]["final_state"]["history"].pop(0))
        self.reject_json(self.native, lambda value: value["sessions"][2]["final_state"].update(last_episode_turn=15))
        self.reject_json(self.native, lambda value: value["sessions"][2].update(ended_at="2026-09-29T19:00:00"))
        self.reject_lines(self.memory, lambda rows: rows[-1].update(id=None))
        self.reject_lines(self.memory, lambda rows: rows[-1].update(patient_text="A different accepted source"))
        self.reject_json(self.session / "session.json", lambda value: value["turns"].append(dict(value["turns"][-1])))

    def test_recovery_cache_and_frozen_390_turn_prefix_are_not_rewritten(self):
        proof = self.recovered / "recovery-resume05.jsonl"
        self.reject_lines(proof, lambda rows: rows[0].update(external_call=True))
        self.reject_lines(proof, lambda rows: rows[-1].update(prompt_identical_to_failed_request=False))
        self.reject_json(self.recovered / "session.json", lambda value: value["recovery"].update(cached_narrative_generations=1))
        self.reject_json(self.native, lambda value: value["sessions"][1]["turns"][0].update(patient_response="Changed prior session"))
        source = self.previous / "worker.py"
        with self.changed(source):
            source.write_bytes(b"raise AssertionError('changed frozen source must not execute')\n")
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def test_no_later_call_or_artifact_can_be_claimed_by_this_checkpoint(self):
        self.reject_lines(self.session / "generation-events.jsonl", lambda rows: rows.extend([dict(rows[-3]), dict(rows[-2])]))
        self.reject_lines(self.runtime / "processes.jsonl", lambda rows: rows.append(dict(rows[-2])))
        self.reject_json(self.runtime / "progress.json", lambda value: value.update(accepted_turns=450))
        later = self.run_dir / "sessions/session_04"
        later.mkdir()
        try:
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)
        finally:
            later.rmdir()


if __name__ == "__main__":
    unittest.main(verbosity=2)
