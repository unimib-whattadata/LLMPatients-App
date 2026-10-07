"""Offline checkpoint corruption tests; no network, real subprocess or key.

Each case uses a private copy of archived evidence. Only the external original
plan-chain verifier is replaced with a hash verifier for the copied frozen
execution files. The prior controller, snapshot, forty-turn preservation and
all partial-session checks execute their real code. Run the unmodified audit
separately against the original checkpoint for full provenance verification.
"""
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

import partial_audit as audit

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]


def put(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def lines(path, values):
    path.write_text("".join(json.dumps(value, ensure_ascii=False) + "\n" for value in values), encoding="utf-8")


def fixture_verifier(original):
    manifest = audit.read_json(original / "manifest.json")
    for name, expected in manifest["files"].items():
        audit.require(audit.sha256(original / name) == expected, "Copied frozen execution input changed")
    return {"status": "verified", "fixture_only": True, "files": len(manifest["files"])}


class PartialAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # After prepare(), use the retained 44-turn snapshot rather than a live
        # runtime that a later explicitly authorized continuation may extend.
        cls.checkpoint = HERE / "snapshot" if (HERE / "snapshot").is_dir() else ORIGINAL / "runtime"
        cls.frozen_manifest = audit.read_json(ORIGINAL / "manifest.json")

    def setUp(self):
        for target, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"),
                             (socket, "create_connection"), (subprocess, "Popen"), (subprocess, "run")):
            guard = patch.object(target, name, side_effect=AssertionError("Offline audit must not call network or subprocess"))
            guard.start()
            self.addCleanup(guard.stop)
        temporary = tempfile.TemporaryDirectory(prefix="partial-audit-offline-")
        self.addCleanup(temporary.cleanup)
        self.original = Path(temporary.name).resolve() / "comparison"
        self.original.mkdir()
        for name in ["manifest.json", *self.frozen_manifest["files"]]:
            target = self.original / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ORIGINAL / name, target)
        self.previous = self.original / "continuations/resume-02"
        shutil.copytree(ORIGINAL / "continuations/resume-02", self.previous)
        self.runtime = self.original / "runtime"
        shutil.copytree(self.checkpoint, self.runtime)
        self.run = self.runtime / audit.RUN_ID
        self.session = self.run / "sessions/session_01"
        self.native = self.run / "runs" / f"comparison_{audit.RUN_ID}.json"
        self.memory = next((self.run / "memory").glob("*.jsonl"))
        # Only the new process-start path changes for the relocated fixture;
        # its original fifteen journal records remain an exact byte prefix.
        journal = self.runtime / "processes.jsonl"
        old = (self.previous / "snapshot/processes.jsonl").read_bytes()
        suffix = [json.loads(row) for row in journal.read_bytes()[len(old):].splitlines()]
        suffix[1]["command"][1] = str(self.original / "paired_runner.py")
        journal.write_bytes(old + "".join(json.dumps(row) + "\n" for row in suffix).encode())
        verifier = patch.object(audit, "_verify_original", side_effect=fixture_verifier)
        verifier.start()
        self.addCleanup(verifier.stop)

    @contextmanager
    def changed(self, path):
        original = path.read_bytes()
        try:
            yield
        finally:
            path.write_bytes(original)

    def reject_json(self, path, mutate):
        with self.changed(path):
            data = audit.read_json(path)
            mutate(data)
            put(path, data)
            with self.assertRaises(audit.PartialAuditError):
                audit.audit_partial(self.original)

    def reject_lines(self, path, mutate):
        with self.changed(path):
            data = audit.read_jsonl(path)
            mutate(data)
            lines(path, data)
            with self.assertRaises(audit.PartialAuditError):
                audit.audit_partial(self.original)

    def test_exact_checkpoint_returns_cached_classifier_and_preserves_all_bytes(self):
        before = audit.snapshot(self.runtime)
        result = audit.audit_partial(self.original)
        self.assertEqual(result["runtime_file_sha256"], before)
        self.assertEqual(audit.snapshot(self.runtime), before)
        self.assertEqual((result["completed_sessions"], result["accepted_turns"], result["next_execution_order"]), (8, 44, 9))
        self.assertEqual((result["partial_requests"], result["partial_responses"], result["native_source_turns"]), (10, 9, 4))
        self.assertEqual((result["requests"], result["responses"], result["provider_errors"]), (86, 85, 1))
        self.assertEqual(result["live_requests_by_audit"], 0)
        events = audit.read_jsonl(self.session / "generation-events.jsonl")
        self.assertEqual(result["saved_classifier_request"], events[16])
        self.assertEqual(result["saved_classifier_outcome"], events[17])
        self.assertEqual(result["failed_request"], events[18])
        self.assertEqual(result["saved_classifier_request"]["turn_id"], "s01t05")
        self.assertEqual(result["saved_classifier_request"]["stage"], "classify_topic_and_emotion")
        self.assertTrue(result["saved_classifier_outcome"]["accepted"])
        self.assertEqual(result["archived_error"]["record_id"], result["stop"]["native_record_id"])
        self.assertEqual(result["archived_error"]["upstream_code"], 504)
        self.assertFalse(result["archived_error"]["visible_content_present"])
        self.assertNotIn("response", result["archived_error"])
        self.assertEqual(result["gate"]["in_flight"]["gate_request_id"], events[18]["gate_request_id"])

    def test_broken_json_truncated_log_and_changed_frozen_input_refused(self):
        cases = [(self.runtime / "request-gate.json", b"{broken"),
                 (self.session / "generation-events.jsonl", (self.session / "generation-events.jsonl").read_bytes()[:-1]),
                 (self.original / "prepare_execution.py", b"raise AssertionError('must not execute modified code')\n"),
                 (self.previous / "continue_run.py", b"raise AssertionError('must not execute modified code')\n")]
        for path, value in cases:
            with self.subTest(path=path.name), self.changed(path):
                path.write_bytes(value)
                with self.assertRaises(audit.PartialAuditError):
                    audit.audit_partial(self.original)

    def test_foreign_stop_gate_execution_and_authorization_markers_refused(self):
        self.reject_json(self.runtime / "STOP", lambda row: row.update(native_record_id="foreign-native-id"))
        self.reject_json(self.runtime / "request-gate.json",
                         lambda row: row["in_flight"].update(gate_request_id="foreign-gate-id"))
        self.reject_json(self.runtime / "request-gate.json", lambda row: row["in_flight"].update(pid=999999))
        self.reject_json(self.runtime / "request-gate.json", lambda row: row.update(in_flight=None))
        self.reject_json(self.runtime / "active-execution.json", lambda row: row.update(execution_order=10))
        self.reject_lines(self.runtime / "processes.jsonl", lambda rows: rows[-3].update(controller_pid=999999))

    def test_accepted_receipt_native_state_and_source_mismatch_refused(self):
        self.reject_lines(self.run / "accepted-turns.jsonl", lambda rows: rows[0].update(patient_text="Substituted reply"))
        self.reject_json(self.session / "session.json", lambda row: row["turns"].append(row["turns"][-1]))
        self.reject_json(self.native, lambda row: row["sessions"][0]["final_state"].update(total_turns=5))
        self.reject_json(self.native, lambda row: row["sessions"][0]["final_state"]["messages"].pop())
        self.reject_json(self.native, lambda row: row["sessions"][0].update(ended_at="2026-09-29T10:00:00"))
        self.reject_lines(self.memory, lambda rows: rows[-1].update(usable=False))
        self.reject_lines(self.memory, lambda rows: rows[-1].update(patient_id="different-patient"))

    def test_ambiguous_success_instead_of_explicit_failed_completion_refused(self):
        wire = self.session / "openrouter-api-records.jsonl"
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0].update(finish_reason="stop"))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["message"].update(content="A possible fifth reply."))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["error"].update(code=502))
        self.reject_lines(self.session / "generation-events.jsonl", lambda rows: rows[-2].update(accepted=True))
        self.reject_lines(self.session / "generation-events.jsonl", lambda rows: rows[17].update(accepted=False))

    def test_model_decoding_budget_and_cross_request_identity_refused(self):
        events = self.session / "generation-events.jsonl"
        self.reject_lines(events, lambda rows: rows[18]["generation_config"].update(temperature=.2))
        self.reject_lines(events, lambda rows: rows[16]["generation_config"].update(max_output_tokens=8192))
        self.reject_lines(events, lambda rows: rows[18].update(estimated_prompt_token_limit=128000))
        self.reject_lines(events, lambda rows: rows[18].update(gate_request_id=rows[16]["gate_request_id"]))
        self.reject_lines(self.session / "openrouter-api-records.jsonl",
                          lambda rows: rows[-1]["response"].update(model="another/model"))

    def test_additional_calls_workers_memory_and_later_artifacts_refused(self):
        self.reject_lines(self.session / "generation-events.jsonl", lambda rows: rows.append(dict(rows[18])))
        self.reject_lines(self.session / "openrouter-api-records.jsonl", lambda rows: rows.append(dict(rows[-2])))
        self.reject_lines(self.runtime / "processes.jsonl", lambda rows: rows.append(dict(rows[-2])))
        self.reject_lines(self.memory, lambda rows: rows.append({"id": "extra", "type": "fact_batch", "facts": []}))
        later = self.run / "sessions/session_02"
        later.mkdir()
        try:
            with self.assertRaises(audit.PartialAuditError):
                audit.audit_partial(self.original)
        finally:
            later.rmdir()
        unknown = self.runtime / "unrecognized-marker.json"
        put(unknown, {"unexpected": True})
        try:
            with self.assertRaises(audit.PartialAuditError):
                audit.audit_partial(self.original)
        finally:
            unknown.unlink()

    def test_original_forty_turns_and_frozen_snapshot_remain_immutable(self):
        archived = next((self.previous / "snapshot").glob("*/accepted-turns.jsonl"))
        current = self.runtime / archived.relative_to(self.previous / "snapshot")
        self.reject_lines(current, lambda rows: rows.append(dict(rows[-1])))
        closed = next((self.previous / "snapshot").glob("*/runs/*.json"))
        self.reject_json(self.runtime / closed.relative_to(self.previous / "snapshot"),
                         lambda row: row["sessions"][0]["turns"][0].update(patient_response="Changed closed session"))
        with self.changed(archived):
            archived.write_bytes(archived.read_bytes() + b"\n")
            with self.assertRaises(audit.PartialAuditError):
                audit.audit_partial(self.original)


if __name__ == "__main__":
    unittest.main(verbosity=2)
