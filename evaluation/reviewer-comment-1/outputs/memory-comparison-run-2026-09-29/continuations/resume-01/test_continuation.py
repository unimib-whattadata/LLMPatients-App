"""Stdlib offline checks for the authorized continuation controller.

All workers, ps and launchctl calls are mocked. Fixtures and mutations live only
in TemporaryDirectory, never in the frozen experiment or its real runtime.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
import plistlib
import socket
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch


def no_network(*args, **kwargs):
    raise AssertionError("Continuation unit tests forbid network access")


socket.socket.connect = no_network
socket.socket.connect_ex = no_network
socket.create_connection = no_network

# Import the actual prefix_audit module through the controller. The run entry
# tests patch audit results for their isolated controller fixtures; no import
# shim remains in the delivered suite.
import continue_run as continuation


def dump(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_lines(path, rows):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


class OriginalFixtureFailure(RuntimeError):
    pass


class ContinuationTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="continuation-offline-")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.original = self.root / "frozen-original"
        self.here = self.original / "continuations/resume-01"
        self.here.mkdir(parents=True)
        self.runtime = self.original / "runtime"
        self.runtime.mkdir()
        self.replace(continuation, "HERE", self.here)
        self.replace(continuation, "ORIGINAL", self.original)
        self.replace(continuation, "PLIST", self.here / "launchd.plist")
        self.popen_block = self.replace(continuation.subprocess, "Popen", side_effect=AssertionError("No real child may start"))
        self.run_block = self.replace(continuation.subprocess, "run", side_effect=AssertionError("No real ps or launchctl may run"))
        self.kill_block = self.replace(continuation.os, "killpg", side_effect=AssertionError("No real process may be signaled"))

        self.schedule = [{"execution_order": index, "run_id": f"OFFLINE_run_{index:02d}",
                          "session_index": 1, "arm": "flat_full_history" if index % 2 else "structured_common_profile",
                          "pair_id": f"OFFLINE_pair_{(index + 1) // 2:02d}"} for index in range(1, 11)]
        dump(self.original / "manifest.json", {"fixture": "original frozen inference manifest"})
        (self.original / "paired_runner.py").write_text("# Frozen command target fixture; never executed.\n")
        self.launch = {"launch_id": "OFFLINE_ORIGINAL_LAUNCH_ID",
                       "execution_manifest_sha256": continuation.original.digest(self.original / "manifest.json")}
        dump(self.runtime / "launch.json", self.launch)
        dump(self.runtime / "request-gate.json", {"last_started": 123456.0, "in_flight": None})
        self.gate_before = (self.runtime / "request-gate.json").read_bytes()
        write_lines(self.runtime / "processes.jsonl", [{"event": "start", "execution_order": 8,
                                                       "pid": 12345, "fixture": "exit intentionally absent"}])
        self.process_before = (self.runtime / "processes.jsonl").read_bytes()
        self.native_relative = None
        self.memory_relative = None
        for item in self.schedule[:8]:
            run_dir = self.runtime / item["run_id"]
            turns = [{"run_id": item["run_id"], "turn_index": n, "turn_id": f"s01t{n:02d}",
                      "therapist_text": f"Offline recorded therapist turn {n}.",
                      "patient_text": f"Offline archived reply {item['execution_order']}-{n}."}
                     for n in range(1, 6)]
            write_lines(run_dir / "accepted-turns.jsonl", turns)
            dump(run_dir / "sessions/session_01/session.json", self.receipt(item, turns=turns))
            if item["arm"] == "structured_common_profile":
                memory = run_dir / "memory/fixture.jsonl"
                write_lines(memory, [{"type": "conversation_turn", "turn_index": t["turn_index"],
                                      "patient_text": t["patient_text"]} for t in turns])
                native = run_dir / "runs/fixture.json"
                dump(native, {"therapist_id": item["run_id"], "sessions": [{
                    "session_id": "comparison_s01", "patient_id": "OFFLINE_PATIENT",
                    "ended_at": "OFFLINE_CLOSED", "turns": turns,
                    "final_state": {"total_turns": 5, "summary": "Original closed snapshot"}}]})
                self.native_relative = str(native.relative_to(self.runtime))
                self.memory_relative = str(memory.relative_to(self.runtime))
        dump(self.original / "generation/schedule.json", {"session_executions": self.schedule})
        dump(self.original / "generation/provider-fixture.json", {
            "model": "google/gemini-2.5-pro", "temperature": .7, "top_p": .95,
            "allow_fallbacks": False, "fixture": "Configuration is never sent"})
        self.provider_before = (self.original / "generation/provider-fixture.json").read_bytes()
        self.worker_before = (self.original / "paired_runner.py").read_bytes()

        self.prefix_bytes = {str(path.relative_to(self.runtime)): path.read_bytes()
                             for path in self.runtime.rglob("*") if path.is_file()}
        files = {name: hashlib.sha256(data).hexdigest() for name, data in self.prefix_bytes.items()}
        for relative, data in self.prefix_bytes.items():
            target = self.here / "snapshot" / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        dump(self.here / "snapshot-manifest.json", {"files": files})
        self.audit = {"completed_sessions": 8, "accepted_turns": 40, "next_execution_order": 9,
                      "requests": 76, "responses": 76, "runtime_file_sha256": files}
        dump(self.here / "prefix-audit.json", self.audit)
        self.manifest = {"next_execution_order": 9, "completed_sessions_preserved": 8,
                         "accepted_turns_preserved": 40}
        dump(self.here / "manifest.json", self.manifest)
        self.replace(continuation, "verify", return_value=self.manifest)
        self.replace(continuation, "audit_prefix", return_value=copy.deepcopy(self.audit))
        self.replace(continuation.original, "summarize", return_value={"status": "offline_fixture"})
        self.environment = {"PYTHONPATH": "OFFLINE_UNCHANGED_ENVIRONMENT",
                            "OPENROUTER_API_KEY_FILE": str(self.root / "NONEXISTENT_FAKE_KEY")}
        self.environment_mock = self.replace(continuation.original, "worker_environment", return_value=self.environment)
        self.calls = []

    def replace(self, target, name, *args, **kwargs):
        patcher = patch.object(target, name, *args, **kwargs)
        value = patcher.start()
        self.addCleanup(patcher.stop)
        return value

    def receipt(self, item, *, turns=None):
        return {"status": "completed", "inference_mode": "live_openrouter", "run_id": item["run_id"],
                "session_index": item["session_index"], "arm": item["arm"],
                "execution_manifest_sha256": self.launch["execution_manifest_sha256"],
                "turns": turns if turns is not None else [{"fixture": n} for n in range(5)]}

    def fake_popen(self, command, *, failure_order=None, wrong_receipt=False, running=False, **kwargs):
        self.calls.append({"command": command, **kwargs})
        order = int(command[command.index("--execution-order") + 1])
        item = next(row for row in self.schedule if row["execution_order"] == order)
        receipt = self.receipt(item)
        if wrong_receipt:
            receipt["run_id"] = "FOREIGN_RUN"
        if order != failure_order and not running:
            dump(Path(kwargs["cwd"]) / "session.json", receipt)
        code = None if running else (7 if order == failure_order else 0)
        return SimpleNamespace(pid=90000 + order, returncode=code, poll=Mock(return_value=code), wait=Mock(return_value=0))

    def test_run_filters_orders_one_to_eight_and_uses_the_original_worker_and_gate(self):
        with patch.object(continuation, "no_other_workers"), \
             patch.object(continuation.subprocess, "Popen", side_effect=self.fake_popen), \
             patch("builtins.print"):
            result = continuation.run()
            with self.assertRaises(FileExistsError):
                continuation.run()
        self.assertEqual({"status": "offline_fixture"}, result)
        self.assertEqual(2, len(self.calls))
        for item, observed in zip(self.schedule[8:], self.calls):
            self.assertEqual([str(continuation.original.BUNDLED_PYTHON), str(self.original / "paired_runner.py"),
                              "_worker", "--execution-order", str(item["execution_order"]),
                              "--launch-id", self.launch["launch_id"]], observed["command"])
            self.assertEqual(self.environment, observed["env"])
            self.assertEqual(self.runtime / item["run_id"] / "sessions/session_01", observed["cwd"])
            self.assertTrue(observed["start_new_session"])
        self.assertEqual(8, continuation.original.read_json(self.here / "started.json")["resumes_after_execution_order"])
        self.assertEqual(self.launch, continuation.original.read_json(self.runtime / "launch.json"))
        self.assertEqual(self.gate_before, (self.runtime / "request-gate.json").read_bytes())
        self.assertEqual(self.provider_before, (self.original / "generation/provider-fixture.json").read_bytes())
        self.assertEqual(self.worker_before, (self.original / "paired_runner.py").read_bytes())
        self.assertTrue((self.runtime / "processes.jsonl").read_bytes().startswith(self.process_before))
        continuation.verify_preserved_prefix()

    def test_launchd_parameters_are_one_shot_and_a_successful_launch_is_not_repeated(self):
        plist = plistlib.loads(plistlib.dumps(continuation.make_plist()))
        self.assertIs(False, plist["KeepAlive"])
        self.assertIs(True, plist["RunAtLoad"])
        self.assertEqual(["/usr/bin/caffeinate", "-i", str(continuation.original.BUNDLED_PYTHON),
                          str(self.here / "continue_run.py"), "run"], plist["ProgramArguments"])
        self.assertEqual(self.environment, plist["EnvironmentVariables"])
        with patch.object(continuation, "no_other_workers"), \
             patch.object(continuation.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout="offline", stderr="")) as launchctl:
            result = continuation.launch()
            with self.assertRaisesRegex(RuntimeError, "already attempted"):
                continuation.launch()
        self.assertIs(False, result["automatic_restart"])
        launchctl.assert_called_once_with(["/bin/launchctl", "bootstrap", f"gui/{os.getuid()}", str(self.here / "launchd.plist")],
                                          capture_output=True, text=True)
        self.popen_block.assert_not_called()

    def test_failed_launchctl_bootstrap_is_not_automatically_retried(self):
        with patch.object(continuation, "no_other_workers"), \
             patch.object(continuation.subprocess, "run", return_value=SimpleNamespace(returncode=5, stdout="", stderr="offline failure")) as launchctl:
            with self.assertRaisesRegex(RuntimeError, "bootstrap failed"):
                continuation.launch()
            with self.assertRaisesRegex(RuntimeError, "already attempted"):
                continuation.launch()
        launchctl.assert_called_once()
        self.assertEqual(5, continuation.original.read_json(self.here / "launch-result.json")["returncode"])

    def test_failed_first_worker_stops_before_the_next_execution(self):
        def spawn(command, **kwargs):
            return self.fake_popen(command, failure_order=9, **kwargs)
        with patch.object(continuation.subprocess, "Popen", side_effect=spawn):
            with self.assertRaisesRegex(RuntimeError, "Worker exited 7"):
                continuation.run_schedule(self.schedule[8:], self.launch)
        self.assertEqual(1, len(self.calls))
        self.assertFalse((self.runtime / self.schedule[9]["run_id"]).exists())
        self.assertEqual("continuation_controller_failure", continuation.original.read_json(self.runtime / "STOP")["kind"])
        self.assertEqual("stopped", continuation.original.read_json(self.here / "state.json")["status"])
        continuation.verify_preserved_prefix()

    def test_receipts_with_foreign_identity_model_mode_manifest_or_wrong_count_are_rejected(self):
        item = self.schedule[8]
        good = self.receipt(item)
        continuation.require_completed_receipt(good, item, self.launch)
        changes = {"status": "running", "inference_mode": "offline_stub", "run_id": "FOREIGN_RUN",
                   "session_index": 2, "arm": "FOREIGN_ARM", "execution_manifest_sha256": "FOREIGN_MANIFEST"}
        for field, wrong in changes.items():
            with self.subTest(field=field):
                saved = copy.deepcopy(good)
                saved[field] = wrong
                with self.assertRaisesRegex(RuntimeError, "receipt"):
                    continuation.require_completed_receipt(saved, item, self.launch)
        for length in (0, 4, 6):
            with self.subTest(turn_count=length):
                saved = copy.deepcopy(good)
                saved["turns"] = [{}] * length
                with self.assertRaisesRegex(RuntimeError, "receipt"):
                    continuation.require_completed_receipt(saved, item, self.launch)

    def test_foreign_receipt_halts_the_schedule_without_another_worker(self):
        def spawn(command, **kwargs):
            return self.fake_popen(command, wrong_receipt=True, **kwargs)
        with patch.object(continuation.subprocess, "Popen", side_effect=spawn):
            with self.assertRaisesRegex(RuntimeError, "receipt"):
                continuation.run_schedule(self.schedule[8:], self.launch)
        self.assertEqual(1, len(self.calls))
        self.assertFalse((self.runtime / self.schedule[9]["run_id"]).exists())

    def test_existing_session_artifact_is_preserved_and_never_replayed(self):
        target = self.runtime / self.schedule[8]["run_id"] / "sessions/session_01"
        target.mkdir(parents=True)
        marker = target / "uncertain-previous-attempt.txt"
        marker.write_bytes(b"KEEP ORIGINAL UNCERTAIN OUTCOME\n")
        with self.assertRaisesRegex(RuntimeError, "already has artifacts"):
            continuation.run_schedule(self.schedule[8:], self.launch)
        self.popen_block.assert_not_called()
        self.assertEqual(b"KEEP ORIGINAL UNCERTAIN OUTCOME\n", marker.read_bytes())
        self.assertFalse((self.runtime / self.schedule[9]["run_id"]).exists())

    def test_active_child_is_terminated_when_stop_persistence_also_fails(self):
        child = SimpleNamespace(pid=90009, returncode=None, poll=Mock(return_value=None), wait=Mock(return_value=0))
        original_error = OriginalFixtureFailure("offline journal failure after child creation")
        with patch.object(continuation.subprocess, "Popen", return_value=child) as spawn, \
             patch.object(continuation.original, "append_jsonl", side_effect=original_error), \
             patch.object(continuation.original, "stop_campaign", side_effect=OSError("offline STOP write failure")), \
             patch.object(continuation.original.os, "killpg") as kill:
            with self.assertRaises(OriginalFixtureFailure) as caught:
                continuation.run_schedule(self.schedule[8:], self.launch)
        self.assertIs(original_error, caught.exception)
        spawn.assert_called_once()
        kill.assert_called_once_with(child.pid, continuation.signal.SIGTERM)
        child.wait.assert_called_once_with(timeout=10)
        self.assertTrue(any("STOP" in note for note in original_error.__notes__))
        self.assertFalse((self.runtime / self.schedule[9]["run_id"]).exists())

    def test_prefix_accepts_only_appended_records_and_appended_native_sessions(self):
        ledger_relative = str(Path(self.schedule[0]["run_id"]) / "accepted-turns.jsonl")
        for relative in (ledger_relative, self.memory_relative, "processes.jsonl"):
            with (self.runtime / relative).open("ab") as stream:
                stream.write(b'{"offline":"new appended record"}\n')
        path = self.runtime / self.native_relative
        native = continuation.original.read_json(path)
        native["sessions"].append({"session_id": "comparison_s02", "fixture": "later session"})
        dump(path, native)
        dump(self.runtime / "request-gate.json", {"last_started": 234567.0, "in_flight": None})
        continuation.verify_preserved_prefix()
        for relative, before in self.prefix_bytes.items():
            self.assertEqual(before, (self.here / "snapshot" / relative).read_bytes())

    def test_rewritten_ledger_memory_or_closed_native_session_is_rejected(self):
        ledger_relative = str(Path(self.schedule[0]["run_id"]) / "accepted-turns.jsonl")
        for relative in (ledger_relative, self.memory_relative, self.native_relative):
            with self.subTest(path=relative):
                path = self.runtime / relative
                before = path.read_bytes()
                try:
                    if relative == self.native_relative:
                        native = json.loads(before)
                        native["sessions"][0]["final_state"]["summary"] = "REWRITTEN CLOSED STATE"
                        dump(path, native)
                    else:
                        path.write_bytes(b"REWRITTEN_PREFIX\n" + before)
                    with self.assertRaisesRegex(RuntimeError, "changed"):
                        continuation.verify_preserved_prefix()
                finally:
                    path.write_bytes(before)

    def test_process_check_ignores_only_own_pid_and_own_caffeinate_parent(self):
        lines = "\n".join([
            f"200 /offline/python {self.here / 'continue_run.py'} run",
            f"100 /usr/bin/caffeinate -i /offline/python {self.here / 'continue_run.py'} run",
            "300 /unrelated/paired_runner.py _worker --execution-order 9",
            f"400 /offline/python {self.here / 'continue_run.py'} verify",
            "not-a-pid malformed row",
        ])
        with patch.object(continuation.os, "getpid", return_value=200), \
             patch.object(continuation.os, "getppid", return_value=100), \
             patch.object(continuation.subprocess, "run", return_value=SimpleNamespace(stdout=lines)) as ps:
            continuation.no_other_workers()
        ps.assert_called_once_with(["/bin/ps", "-A", "-o", "pid=,args="], capture_output=True, text=True, check=True)

    def test_process_check_rejects_other_frozen_workers_controllers_and_wrappers(self):
        commands = [f"/offline/python {self.original / 'paired_runner.py'} _worker --execution-order 9",
                    f"/offline/python {self.original / 'paired_runner.py'} live",
                    f"/offline/python {self.here / 'continue_run.py'} run",
                    f"/usr/bin/caffeinate -i /offline/python {self.here / 'continue_run.py'} run"]
        for command in commands:
            with self.subTest(command=command), \
                 patch.object(continuation.os, "getpid", return_value=200), \
                 patch.object(continuation.os, "getppid", return_value=100), \
                 patch.object(continuation.subprocess, "run", return_value=SimpleNamespace(stdout=f"999 {command}")):
                with self.assertRaisesRegex(RuntimeError, "999"):
                    continuation.no_other_workers()


if __name__ == "__main__":
    unittest.main()
