"""Bounded offline tests, using a private copy of the stopped checkpoint."""
from __future__ import annotations

import hashlib
import json
import shutil
import socket
import subprocess
import tempfile
import unittest
from contextlib import ExitStack, contextmanager
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
    # Only external sibling-plan discovery is replaced in this relocated copy.
    for name, expected in audit.read_json(original / "manifest.json")["files"].items():
        audit.require(audit.sha256(original / name) == expected, "Copied frozen original changed")
    return {"status": "verified", "fixture_only": True}


def canonical_hash(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


class CheckpointAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp = tempfile.TemporaryDirectory(prefix="credit-checkpoint-offline-")
        cls.addClassCleanup(temp.cleanup)
        cls.original = Path(temp.name).resolve() / "comparison"
        cls.original.mkdir()
        manifest = audit.read_json(ORIGINAL / "manifest.json")
        for name in ["manifest.json", *manifest["files"]]:
            target = cls.original / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ORIGINAL / name, target)
        for name in ("resume-02", "resume-03", "resume-04", "resume-05", "resume-06"):
            shutil.copytree(ORIGINAL / "continuations" / name, cls.original / "continuations" / name)
        cls.previous = cls.original / "continuations/resume-06"
        cls.runtime = cls.original / "runtime"
        source = HERE / "snapshot" if (HERE / "snapshot").is_dir() else ORIGINAL / "runtime"
        shutil.copytree(source, cls.runtime)
        cls.run_dir = cls.runtime / audit.RUN_ID
        cls.session = cls.run_dir / "sessions/session_10"
        cls.recovered = cls.runtime / audit.RECOVERED_RUN / "sessions/session_03"
        journal = cls.runtime / "processes.jsonl"
        old = (cls.previous / "snapshot/processes.jsonl").read_bytes()
        new = [json.loads(line) for line in journal.read_bytes()[len(old):].splitlines()]
        for row in new:
            if row["event"] == "start":
                row["command"][1] = str(cls.previous / "worker.py")
        journal.write_bytes(old + "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in new).encode())

    def setUp(self):
        for owner, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"), (socket, "create_connection"),
                            (subprocess, "Popen"), (subprocess, "run")):
            guard = patch.object(owner, name, side_effect=AssertionError("No network or process is permitted in this audit"))
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
            value = audit.read_json(path)
            mutate(value)
            put(path, value)
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def reject_lines(self, path, mutate):
        with self.changed(path):
            value = audit.read_jsonl(path)
            mutate(value)
            lines(path, value)
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def test_valid_checkpoint_preserves_all_evidence_and_returns_exact_failed_prompt(self):
        before = audit.snapshot(self.runtime)
        result = audit.audit_checkpoint(self.original)
        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["runtime_file_sha256"], before)
        self.assertEqual(audit.snapshot(self.runtime), before)
        self.assertEqual((result["completed_sessions"], result["accepted_turns"], result["next_execution_order"]), (289, 1449, 290))
        self.assertEqual((result["requests"], result["responses"], result["provider_errors"]), (2788, 2755, 33))
        self.assertEqual((result["preserved_prefix_turns"], result["new_accepted_turns"]), (449, 1000))
        self.assertEqual((result["delta_requests"], result["delta_responses"], result["delta_provider_errors"]), (1928, 1905, 23))
        self.assertEqual((result["recovered_timeouts_in_delta"], result["recovered_rate_limits_in_delta"]), (20, 2))
        self.assertEqual((result["run_accepted_turns"], result["partial_accepted_turns"], result["observed_probes"]), (49, 4, 20))
        events = audit.read_jsonl(self.session / "generation-events.jsonl")
        self.assertEqual(result["failed_request"], events[-3])
        self.assertEqual(result["failed_outcome"], events[-2])
        self.assertEqual((result["failed_request"]["stage"], result["failed_request"]["turn_id"]), ("generate_response", "s10t05"))
        self.assertEqual(result["archived_error"]["http_status"], 402)
        self.assertEqual(result["archived_error"]["retry_after"], "120")
        self.assertEqual(result["archived_error"]["provider_error_reason"], "in_flight_budget_exhausted")
        self.assertFalse(result["archived_error"]["visible_content_present"])
        self.assertNotIn("cached_finalization_calls", result)
        self.assertEqual(result["live_requests_by_audit"], 0)

    def test_terminal_402_cannot_be_claimed_as_success_or_different_error(self):
        wire = self.session / "openrouter-api-records.jsonl"
        self.reject_lines(wire, lambda rows: rows[-1].update(http_status=200, event="response"))
        self.reject_lines(wire, lambda rows: rows[-1]["response"].update(choices=[{
            "finish_reason": "error", "error": {"code": 402}, "message": {"content": "A visible patient answer"}}]))
        self.reject_lines(wire, lambda rows: rows[-1].update(retry_after=None))

    def test_failed_prompt_must_match_49_turn_history_even_if_all_hashes_are_recomputed(self):
        event_path = self.session / "generation-events.jsonl"
        wire_path = self.session / "openrouter-api-records.jsonl"
        journal_path = self.session / "timeout-retries.jsonl"
        with ExitStack() as stack:
            for path in (event_path, wire_path, journal_path):
                stack.enter_context(self.changed(path))
            events, wire, journal = map(audit.read_jsonl, (event_path, wire_path, journal_path))
            request = events[-3]
            request["prompt"] += "\nAn extra instruction absent from the frozen protocol."
            size = len(request["prompt"].encode())
            request.update(prompt_utf8_bytes=size, estimated_prompt_tokens=(size + 2) // 3)
            for row in wire[-2:]:
                row["request"]["messages"][0]["content"] = request["prompt"]
            common = {"request_sha256": canonical_hash(wire[-2]["request"]),
                "invocation_sha256": canonical_hash({"prompt": request["prompt"], "generation_config": request["generation_config"], "safety_settings": {}}),
                "prompt_sha256": hashlib.sha256(request["prompt"].encode()).hexdigest()}
            for row in journal[-4:]:
                row.update(common)
            # Preserve all prior native bytes so this reaches the prompt check,
            # rather than failing an unrelated prefix digest.
            wire_prefix = b"".join(wire_path.read_bytes().splitlines(keepends=True)[:-2])
            wire_path.write_bytes(wire_prefix + "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in wire[-2:]).encode())
            lines(event_path, events)
            lines(journal_path, journal)
            with self.assertRaisesRegex(audit.CheckpointAuditError, "Failed patient prompt differs"):
                audit.audit_checkpoint(self.original)

    def test_stop_gate_and_accepted_ledger_must_agree(self):
        self.reject_json(self.runtime / "request-gate.json", lambda value: value["in_flight"].update(gate_request_id="foreign"))
        self.reject_json(self.runtime / "STOP", lambda value: value.update(native_record_id="foreign"))
        self.reject_lines(self.run_dir / "accepted-turns.jsonl", lambda rows: rows[-1].update(patient_text="A replacement answer"))
        self.reject_json(self.session / "session.json", lambda value: value["turns"].append(dict(value["turns"][-1])))

    def test_retry_waits_and_predecessor_recovery_are_auditable(self):
        rate_journal = self.runtime / "jason_smith_001__r01__structured_common_profile/sessions/session_05/timeout-retries.jsonl"
        def remove_wait(rows):
            next(row for row in rows if row["event"] == "attempt_error").update(delay_seconds=0)
        self.reject_lines(rate_journal, remove_wait)
        self.reject_lines(self.session / "timeout-retries.jsonl", lambda rows: rows[-2].update(will_retry=True))
        self.reject_lines(self.recovered / "recovery-resume06.jsonl", lambda rows: rows[0].update(prompt_identical_to_failed_request=False))
        source = self.previous / "worker.py"
        with self.changed(source):
            source.write_bytes(b"raise AssertionError('A changed frozen source must not execute')\n")
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def test_later_artifacts_or_modified_closed_native_state_are_refused(self):
        native = next((self.runtime / audit.RECOVERED_RUN / "runs").glob("*.json"))
        self.reject_json(native, lambda value: value["sessions"][4]["turns"][0].update(patient_response="Changed closed session"))
        self.reject_lines(self.runtime / "processes.jsonl", lambda rows: rows.append(dict(rows[-2])))
        later = self.run_dir / "sessions/session_11"
        later.mkdir()
        try:
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)
        finally:
            later.rmdir()


if __name__ == "__main__":
    unittest.main(verbosity=2)
