"""Bounded corruption tests on an isolated copy of the saved checkpoint.

No API, network, process or credential path is available. The external original
plan-chain verifier is replaced only for relocation; every copied execution
hash and the real continuation/snapshot/wire/state audit remain checked.
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

import checkpoint_audit as audit

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
    return {"status": "verified", "fixture_only": True}


class CheckpointAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp = tempfile.TemporaryDirectory(prefix="finalization-audit-offline-")
        cls.addClassCleanup(temp.cleanup)
        cls.original = Path(temp.name).resolve() / "comparison"
        cls.original.mkdir()
        manifest = audit.read_json(ORIGINAL / "manifest.json")
        for name in ["manifest.json", *manifest["files"]]:
            target = cls.original / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ORIGINAL / name, target)
        for name in ("resume-02", "resume-03", "resume-04"):
            shutil.copytree(ORIGINAL / "continuations" / name, cls.original / "continuations" / name)
        cls.previous = cls.original / "continuations/resume-04"
        cls.runtime = cls.original / "runtime"
        checkpoint = HERE / "snapshot" if (HERE / "snapshot").is_dir() else ORIGINAL / "runtime"
        shutil.copytree(checkpoint, cls.runtime)
        cls.run_dir = cls.runtime / audit.RUN_ID
        cls.session = cls.run_dir / "sessions/session_03"
        cls.native = next((cls.run_dir / "runs").glob("*.json"))
        cls.memory = next((cls.run_dir / "memory").glob("*.jsonl"))
        # Relocate only new worker commands; frozen historical prefix unchanged.
        journal = cls.runtime / "processes.jsonl"
        prefix = (cls.previous / "snapshot/processes.jsonl").read_bytes()
        suffix = [json.loads(row) for row in journal.read_bytes()[len(prefix):].splitlines()]
        for row in suffix:
            if row["event"] == "start":
                row["command"][1] = str(cls.previous / "worker.py")
        journal.write_bytes(prefix + "".join(json.dumps(row) + "\n" for row in suffix).encode())
        cls.retry_path = next(path for path in cls.runtime.glob("*/sessions/*/timeout-retries.jsonl")
                              if any(row["event"] == "attempt_error" for row in audit.read_jsonl(path)))

    def setUp(self):
        for owner, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"), (socket, "create_connection"),
                            (subprocess, "Popen"), (subprocess, "run")):
            guard = patch.object(owner, name, side_effect=AssertionError("Offline audit cannot use network or processes"))
            guard.start()
            self.addCleanup(guard.stop)
        verifier = patch.object(audit, "_verify_original", side_effect=fixture_verifier)
        verifier.start()
        self.addCleanup(verifier.stop)

    @contextmanager
    def changed(self, path):
        data = path.read_bytes()
        try:
            yield
        finally:
            path.write_bytes(data)

    def reject_json(self, path, mutate):
        with self.changed(path):
            value = audit.read_json(path)
            mutate(value)
            put(path, value)
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def reject_lines(self, path, mutate):
        with self.changed(path):
            rows = audit.read_jsonl(path)
            mutate(rows)
            lines(path, rows)
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def test_real_checkpoint_counts_cache_order_and_all_bytes_preserved(self):
        before = audit.snapshot(self.runtime)
        result = audit.audit_checkpoint(self.original)
        self.assertEqual(result["runtime_file_sha256"], before)
        self.assertEqual(audit.snapshot(self.runtime), before)
        self.assertEqual((result["completed_sessions"], result["accepted_turns"], result["next_execution_order"]), (77, 390, 78))
        self.assertEqual((result["requests"], result["responses"], result["provider_errors"]), (749, 741, 8))
        self.assertEqual((result["logical_requests"], result["retry_groups"], result["recovered_timeouts"]), (743, 647, 6))
        self.assertEqual((result["run_id"], result["session_index"], result["partial_accepted_turns"]), (audit.RUN_ID, 3, 5))
        events = audit.read_jsonl(self.session / "generation-events.jsonl")
        self.assertEqual(result["cached_finalization_calls"], [{"request": events[22], "outcome": events[23]},
                                                               {"request": events[24], "outcome": events[25]}])
        self.assertEqual(result["failed_request"], events[26])
        self.assertEqual(result["failed_outcome"], events[27])
        self.assertFalse(result["failed_outcome"]["accepted"])
        self.assertEqual(result["archived_error"]["record_id"], audit.FINAL_RECORD_ID)
        self.assertEqual(result["archived_error"]["http_status"], 200)
        self.assertFalse(result["archived_error"]["visible_content_present"])
        self.assertNotIn("response", result["archived_error"])
        self.assertEqual(result["live_requests_by_audit"], 0)
        # Session2 hashes describe its exact earlier prefix, not today's file.
        previous = audit.read_json(self.run_dir / "sessions/session_02/session.json")
        self.assertNotEqual(previous["state_files_at_close"][self.native.relative_to(self.run_dir).as_posix()], audit.sha256(self.native))
        state = audit.read_json(self.native)["sessions"][2]
        self.assertNotIn("ended_at", state)
        self.assertEqual(state["final_state"]["memory_consolidation"]["validated_facts"], 28)

    def test_empty_terminal_outcome_and_successful_cache_provenance_cannot_change(self):
        events = self.session / "generation-events.jsonl"
        wire = self.session / "openrouter-api-records.jsonl"
        self.reject_lines(events, lambda rows: rows[27].update(accepted=True))
        self.reject_lines(events, lambda rows: rows[23].update(text="Changed successful reflection"))
        self.reject_lines(events, lambda rows: rows[24]["generation_config"].update(temperature=.7))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["message"].update(content="Unexpected completed extraction"))
        self.reject_lines(wire, lambda rows: rows[-1]["response"].update(model="different/model"))

    def test_retry_delay_archive_prefix_and_attempt_limit_are_verified(self):
        def mutate_delay(rows):
            next(row for row in rows if row["event"] == "attempt_error")["delay_seconds"] = 0
        def mutate_prefix(rows):
            next(row for row in rows if row["event"] == "attempt_start" and row["attempt"] == 2)["native_archive_prefix_sha256"] = "foreign"
        def mutate_attempt(rows):
            next(row for row in rows if row["event"] == "attempt_start" and row["attempt"] == 2)["attempt"] = 4
        self.reject_lines(self.retry_path, mutate_delay)
        self.reject_lines(self.retry_path, mutate_prefix)
        self.reject_lines(self.retry_path, mutate_attempt)
        self.reject_lines(self.retry_path, lambda rows: rows.pop())

    def test_partial_native_snapshot_sources_and_closed_prefixes_are_checked(self):
        self.reject_json(self.native, lambda value: value["sessions"][2].update(ended_at="2026-09-29T15:00:00"))
        self.reject_json(self.native, lambda value: value["sessions"][2]["final_state"].update(total_turns=14))
        self.reject_json(self.native, lambda value: value["sessions"][2]["final_state"].update(session_id="foreign-session"))
        self.reject_json(self.native, lambda value: value["sessions"][1]["turns"][0].update(patient_response="Changed completed turn"))
        self.reject_lines(self.memory, lambda rows: rows[-2].update(patient_text="Changed accepted source"))
        self.reject_lines(self.memory, lambda rows: rows[-2].update(id=rows[0]["id"]))
        self.reject_lines(self.memory, lambda rows: rows.append({"id": "unexpected", "type": "fact_batch", "facts": []}))
        self.reject_lines(self.run_dir / "accepted-turns.jsonl", lambda rows: rows.pop())

    def test_foreign_gate_stop_and_frozen_provenance_are_refused(self):
        self.reject_json(self.runtime / "request-gate.json", lambda value: value["in_flight"].update(gate_request_id="foreign"))
        self.reject_json(self.runtime / "STOP", lambda value: value.update(native_record_id="foreign"))
        self.reject_json(self.runtime / "progress.json", lambda value: value.update(provider_errors=9))
        source = self.previous / "timeout_retries.py"
        with self.changed(source):
            source.write_bytes(b"raise AssertionError('changed frozen source must not run')\n")
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def test_no_later_native_call_process_or_artifact_is_accepted(self):
        self.reject_lines(self.session / "generation-events.jsonl", lambda rows: rows.extend([dict(rows[26]), dict(rows[27])]))
        self.reject_lines(self.runtime / "processes.jsonl", lambda rows: rows.append(dict(rows[-2])))
        later = self.run_dir / "sessions/session_04"
        later.mkdir()
        try:
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)
        finally:
            later.rmdir()
        log = self.session / "generation-events.jsonl"
        with self.changed(log):
            log.write_bytes(log.read_bytes()[:-1])
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)


if __name__ == "__main__":
    unittest.main(verbosity=2)
