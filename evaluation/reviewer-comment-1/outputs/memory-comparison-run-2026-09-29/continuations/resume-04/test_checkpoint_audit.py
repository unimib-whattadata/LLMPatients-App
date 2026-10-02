"""Offline tests on private copies of the 49-turn checkpoint.

The real audit was also run read-only against the original checkpoint. In these
mutation tests only the external original plan-chain verifier is substituted
with a verifier of every copied frozen execution hash. All continuation,
snapshot, wire, receipt, ledger, recovery, gate and error checks are real.
"""
from __future__ import annotations

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


def lines(path, values):
    path.write_text("".join(json.dumps(value, ensure_ascii=False) + "\n" for value in values), encoding="utf-8")


def fixture_verifier(original):
    manifest = audit.read_json(original / "manifest.json")
    for name, expected in manifest["files"].items():
        audit.require(audit.sha256(original / name) == expected, "Copied frozen execution input changed")
    return {"status": "verified", "fixture_only": True, "files": len(manifest["files"])}


class CheckpointAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.checkpoint = HERE / "snapshot" if (HERE / "snapshot").is_dir() else ORIGINAL / "runtime"
        cls.manifest = audit.read_json(ORIGINAL / "manifest.json")

    def setUp(self):
        for owner, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"), (socket, "create_connection"),
                            (subprocess, "Popen"), (subprocess, "run")):
            guard = patch.object(owner, name, side_effect=AssertionError("Offline audit cannot call network or processes"))
            guard.start()
            self.addCleanup(guard.stop)
        temp = tempfile.TemporaryDirectory(prefix="checkpoint-audit-offline-")
        self.addCleanup(temp.cleanup)
        self.original = Path(temp.name).resolve() / "comparison"
        self.original.mkdir()
        for name in ["manifest.json", *self.manifest["files"]]:
            target = self.original / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ORIGINAL / name, target)
        for name in ("resume-02", "resume-03"):
            shutil.copytree(ORIGINAL / "continuations" / name, self.original / "continuations" / name)
        self.previous = self.original / "continuations/resume-03"
        self.runtime = self.original / "runtime"
        shutil.copytree(self.checkpoint, self.runtime)
        self.run = self.runtime / audit.RUN_ID
        self.session = self.run / "sessions/session_01"
        self.recovered = self.runtime / audit.STRUCTURED_RUN
        self.recovered_session = self.recovered / "sessions/session_01"
        # Relocate only the two new start commands. Every earlier process byte
        # remains identical to the frozen preceding snapshot.
        journal = self.runtime / "processes.jsonl"
        prefix = (self.previous / "snapshot/processes.jsonl").read_bytes()
        suffix = [json.loads(row) for row in journal.read_bytes()[len(prefix):].splitlines()]
        suffix[1]["command"][1] = str(self.previous / "resume_session.py")
        suffix[3]["command"][1] = str(self.original / "paired_runner.py")
        journal.write_bytes(prefix + "".join(json.dumps(row) + "\n" for row in suffix).encode())
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

    def test_valid_checkpoint_preserves_every_byte_and_both_historical_errors(self):
        before = audit.snapshot(self.runtime)
        result = audit.audit_checkpoint(self.original)
        self.assertEqual(result["runtime_file_sha256"], before)
        self.assertEqual(audit.snapshot(self.runtime), before)
        self.assertEqual((result["completed_sessions"], result["accepted_turns"], result["next_execution_order"]), (9, 49, 10))
        self.assertEqual((result["requests"], result["responses"], result["provider_errors"]), (96, 94, 2))
        self.assertEqual((result["partial_requests"], result["partial_responses"], result["partial_accepted_turns"]), (5, 4, 4))
        self.assertEqual(result["run_id"], audit.RUN_ID)
        self.assertEqual(result["failed_request"], audit.read_jsonl(self.session / "generation-events.jsonl")[8])
        self.assertEqual(result["failed_request"]["prompt"], audit.read_jsonl(self.session / "openrouter-api-records.jsonl")[8]["request"]["messages"][0]["content"])
        errors = result["historical_errors"]
        self.assertEqual(len({row["record_id"] for row in errors}), 2)
        self.assertEqual([row["upstream_code"] for row in errors], [504, 504])
        self.assertEqual(errors[-1]["record_id"], result["stop"]["native_record_id"])
        self.assertEqual(result["archived_error"]["record_id"], errors[-1]["record_id"])
        self.assertFalse(result["archived_error"]["visible_content_present"])
        self.assertNotIn("response", result["archived_error"])
        self.assertEqual(result["execution_manifest_sha256"], audit.sha256(self.original / "manifest.json"))
        self.assertEqual(result["live_requests_by_audit"], 0)

    def test_broken_input_and_changed_frozen_verifiers_refused_before_execution(self):
        for path, data in ((self.runtime / "request-gate.json", b"{invalid"),
                           (self.original / "prepare_execution.py", b"raise AssertionError('must not execute')\n"),
                           (self.previous / "resume_session.py", b"raise AssertionError('must not execute')\n")):
            with self.subTest(path=path.name), self.changed(path):
                path.write_bytes(data)
                with self.assertRaises(audit.CheckpointAuditError):
                    audit.audit_checkpoint(self.original)
        log = self.session / "generation-events.jsonl"
        with self.changed(log):
            log.write_bytes(log.read_bytes()[:-1])
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)

    def test_foreign_error_gate_and_execution_provenance_refused(self):
        self.reject_json(self.runtime / "STOP", lambda value: value.update(native_record_id="foreign-record"))
        self.reject_json(self.runtime / "request-gate.json", lambda value: value["in_flight"].update(gate_request_id="foreign-gate"))
        self.reject_json(self.runtime / "request-gate.json", lambda value: value["in_flight"].update(pid=999999))
        self.reject_json(self.runtime / "request-gate.json", lambda value: value.update(in_flight=None))
        self.reject_json(self.runtime / "active-execution.json", lambda value: value.update(execution_order=11))
        self.reject_lines(self.runtime / "processes.jsonl", lambda rows: rows[-5].update(controller_pid=999999))
        self.reject_json(self.runtime / "progress.json", lambda value: value.update(provider_errors=1))

    def test_completed_ledger_latest_state_and_recovery_provenance_must_match(self):
        self.reject_lines(self.recovered / "accepted-turns.jsonl", lambda rows: rows[-1].update(patient_text="Substituted fifth reply"))
        native = next((self.recovered / "runs").glob("*.json"))
        self.reject_json(native, lambda value: value["sessions"][0]["final_state"].update(total_turns=6))
        self.reject_json(self.recovered_session / "session.json", lambda value: value.update(accepted_ledger_sha256="changed"))
        self.reject_json(self.recovered_session / "session.json", lambda value: value["recovery"].update(classifier_reused=False))
        self.reject_lines(self.recovered_session / "recovery-resume03.jsonl", lambda rows: rows[1].update(non_affect_content_identical=False))
        self.reject_json(self.previous / "resolution.json", lambda value: value["terminal_failure"].update(record_id="foreign"))

    def test_partial_accepted_count_and_visible_response_must_match_wire(self):
        self.reject_json(self.session / "session.json", lambda value: value["turns"].append(value["turns"][-1]))
        self.reject_lines(self.run / "accepted-turns.jsonl", lambda rows: rows[-1].update(turn_index=5))
        self.reject_json(self.session / "session.json", lambda value: value.update(finalization={"status": "baseline_closed"}))
        with ExitStack() as stack:
            ledger = self.run / "accepted-turns.jsonl"
            receipt = self.session / "session.json"
            stack.enter_context(self.changed(ledger))
            stack.enter_context(self.changed(receipt))
            rows = audit.read_jsonl(ledger)
            saved = audit.read_json(receipt)
            rows[-1]["patient_text"] = "A different accepted reply, inconsistent with the raw completion."
            saved["turns"] = rows
            lines(ledger, rows)
            put(receipt, saved)
            with self.assertRaisesRegex(audit.CheckpointAuditError, "native generation"):
                audit.audit_checkpoint(self.original)

    def test_ambiguous_completion_changed_model_and_decoding_refused(self):
        wire = self.session / "openrouter-api-records.jsonl"
        events = self.session / "generation-events.jsonl"
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0].update(finish_reason="stop"))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["message"].update(content="A possible fifth reply."))
        self.reject_lines(wire, lambda rows: rows[-1]["response"]["choices"][0]["error"].update(code=502))
        self.reject_lines(wire, lambda rows: rows[-1]["response"].update(model="another/model"))
        self.reject_lines(events, lambda rows: rows[-2].update(accepted=True))
        self.reject_lines(events, lambda rows: rows[8]["generation_config"].update(max_output_tokens=8192))
        self.reject_lines(events, lambda rows: rows[8].update(gate_request_id=rows[6]["gate_request_id"]))

    def test_consistently_changed_final_prompt_still_fails_full_history_contract(self):
        events_path = self.session / "generation-events.jsonl"
        wire_path = self.session / "openrouter-api-records.jsonl"
        with self.changed(events_path), self.changed(wire_path):
            events, wire = audit.read_jsonl(events_path), audit.read_jsonl(wire_path)
            request = events[8]
            request["prompt"] = request["prompt"].replace("Complete prior conversation from this run, in chronological order.",
                                                        "Only a selected subset of prior conversation is supplied.")
            size = len(request["prompt"].encode("utf-8"))
            request.update(prompt_utf8_bytes=size, estimated_prompt_tokens=max(1, (size + 2) // 3))
            for row in wire[8:]:
                row["request"]["messages"][0]["content"] = request["prompt"]
            lines(events_path, events)
            lines(wire_path, wire)
            with self.assertRaisesRegex(audit.CheckpointAuditError, "exact complete own history"):
                audit.audit_checkpoint(self.original)

    def test_historical_errors_prefixes_and_no_later_artifacts_are_enforced(self):
        log = self.recovered_session / "generation-events.jsonl"
        self.reject_lines(log, lambda rows: rows.pop(19))
        self.reject_lines(self.session / "generation-events.jsonl", lambda rows: rows.append(dict(rows[8])))
        self.reject_lines(self.runtime / "processes.jsonl", lambda rows: rows.append(dict(rows[-2])))
        old = next((self.previous / "snapshot").glob("*/accepted-turns.jsonl"))
        with self.changed(old):
            old.write_bytes(old.read_bytes() + b"\n")
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)
        resolved = self.previous / "resolved-stop.json"
        with self.changed(resolved):
            put(resolved, {"event": "fatal", "kind": "different_error"})
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)
        later = self.run / "sessions/session_02"
        later.mkdir()
        try:
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)
        finally:
            later.rmdir()
        unexpected = self.runtime / "unrecognized-marker.json"
        put(unexpected, {"not_part_of_checkpoint": True})
        try:
            with self.assertRaises(audit.CheckpointAuditError):
                audit.audit_checkpoint(self.original)
        finally:
            unexpected.unlink()


if __name__ == "__main__":
    unittest.main(verbosity=2)
