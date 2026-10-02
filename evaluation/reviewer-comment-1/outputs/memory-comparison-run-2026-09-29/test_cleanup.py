"""Offline failure-injection tests: no process, provider, model, or live API.

Temporary fixtures exercise the real cleanup paths with fake runners/executors
and a fake child. Signals and process creation are always mocked.
"""
from __future__ import annotations

import asyncio
from contextlib import ExitStack
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, call, patch


def no_network(*args, **kwargs):
    raise AssertionError("Cleanup tests cannot contact a provider")


socket.socket.connect = no_network
socket.socket.connect_ex = no_network
socket.create_connection = no_network

import paired_runner as paired


class OriginalFailure(RuntimeError):
    pass


class FakeAbort(RuntimeError):
    def __init__(self, reason, details):
        super().__init__(reason)
        self.details = details


class FakeRunner:
    abort_type = FakeAbort

    def __init__(self, failure=None):
        self.fatal = None
        self.fatal_lock = threading.Lock()
        self.failure = failure

    def check(self):
        if self.fatal is not None:
            raise self.fatal
        if self.failure is not None:
            raise self.failure


class CleanupTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="comparison-cleanup-offline-")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.original_cwd = Path.cwd()
        self.addCleanup(os.chdir, self.original_cwd)
        here = patch.object(paired, "HERE", self.root)
        here.start()
        self.addCleanup(here.stop)
        self.runtime = self.root / "runtime"

    def setup_session(self, failure=None):
        generation = self.root / "generation"
        generation.mkdir()
        (generation / "case.txt").write_text("Offline common case fixture.\n")
        (generation / "scenario.json").write_text(json.dumps({"sessions": [{
            "session_index": 1, "turns": [{"turn_id": f"s01t{n:02d}",
                                           "text": f"Offline therapist fixture {n}?"}
                                          for n in range(1, 6)]}]}))
        config = {"run_id": "offline_flat", "native_api_id": "offline_patient",
                  "archived_patient_id": "offline_patient", "arm": "flat_full_history",
                  "profile_id": "offline_profile", "case_path": "case.txt",
                  "scenario_path": "scenario.json", "case_sha256": "offline_fixture_only"}
        runner = FakeRunner(failure)

        def sanitize(state):
            state.safe_user_input = state.user_input
            state.safety_flags = []

        builder = SimpleNamespace(
            State=SimpleNamespace, sanitize_user_input=sanitize,
            generate_response=Mock(return_value={"response": "Offline response fixture, never model output."}),
            SUMMARY_EXECUTOR=SimpleNamespace(shutdown=Mock()),
        )
        return config, runner, builder

    def fail_stop_open(self, path, *args, **kwargs):
        if path.name == "STOP":
            raise OSError("offline injected STOP storage failure")
        return self.real_open(path, *args, **kwargs)

    def test_stop_latches_before_any_io_and_keeps_the_existing_failure(self):
        runner = FakeRunner()
        storage_error = OSError("offline mkdir failure")

        def fail_mkdir(*args, **kwargs):
            self.assertIsNotNone(runner.fatal, "Fatal must latch before filesystem access")
            raise storage_error

        with patch.object(Path, "mkdir", side_effect=fail_mkdir):
            with self.assertRaises(OSError) as caught:
                paired.stop_campaign(self.runtime, "original_failure", runner=runner, original="kept")
            self.assertIs(storage_error, caught.exception)
            first_fatal = runner.fatal
            with self.assertRaises(OSError):
                paired.stop_campaign(self.runtime, "later_cleanup_failure", runner=runner)
        self.assertIs(first_fatal, runner.fatal)
        self.assertEqual({"kind": "original_failure", "original": "kept"}, runner.fatal.details)

    def test_stop_does_not_overwrite_a_previous_durable_cause(self):
        paired.stop_campaign(self.runtime, "first_failure", sequence=1)
        before = (self.runtime / "STOP").read_bytes()
        paired.stop_campaign(self.runtime, "later_cleanup_failure", sequence=2)
        self.assertEqual(before, (self.runtime / "STOP").read_bytes())

    def test_child_is_terminated_and_killed_after_timeout_even_if_stop_write_fails(self):
        child = Mock(pid=876543, poll=Mock(return_value=None))
        child.wait.side_effect = [subprocess.TimeoutExpired("offline fake child", 10), 0]
        original = OSError("offline STOP failure")
        with patch.object(paired, "stop_campaign", side_effect=original), patch.object(paired.os, "killpg") as kill:
            with self.assertRaises(OSError) as caught:
                paired.terminate_worker(child, self.runtime)
        self.assertIs(original, caught.exception)
        self.assertEqual([call(child.pid, signal.SIGTERM), call(child.pid, signal.SIGKILL)], kill.call_args_list)
        self.assertEqual([call(timeout=10), call(timeout=10)], child.wait.call_args_list)

    def test_child_exit_between_poll_and_signal_still_gets_reaped(self):
        child = Mock(pid=876543, poll=Mock(return_value=None))
        child.wait.return_value = 0
        with patch.object(paired.os, "killpg", side_effect=ProcessLookupError("offline exited child")):
            paired.terminate_worker(child, self.runtime)
        child.wait.assert_called_once_with(timeout=10)

    def test_worker_keeps_original_failure_and_cleans_up_after_multiple_io_errors(self):
        original = OriginalFailure("original offline application failure")
        config, runner, builder = self.setup_session(original)
        writes = 0
        real_write = paired.write_json

        def write_receipt(path, value):
            nonlocal writes
            writes += 1
            if writes == 3:  # final receipt after failure in the first turn's check
                self.assertIsNotNone(runner.fatal)
                raise OSError("offline final receipt failure")
            real_write(path, value)

        def shutdown(*args, **kwargs):
            self.assertIsNotNone(runner.fatal)
            raise OSError("offline executor cleanup failure")

        builder.SUMMARY_EXECUTOR.shutdown.side_effect = shutdown
        self.real_open = Path.open
        with ExitStack() as stack:
            stack.enter_context(patch.object(paired, "validate_prefix", return_value=([], [])))
            stack.enter_context(patch.object(paired, "bootstrap_runtime", return_value=(None, builder, None, runner)))
            stack.enter_context(patch.object(paired, "write_json", side_effect=write_receipt))
            stack.enter_context(patch.object(Path, "open", autospec=True, side_effect=self.fail_stop_open))
            with self.assertRaises(OriginalFailure) as caught:
                asyncio.run(paired.execute_session(config, 1, self.runtime, offline_model=object()))
        self.assertIs(original, caught.exception)
        self.assertEqual(self.original_cwd, Path.cwd())
        builder.SUMMARY_EXECUTOR.shutdown.assert_called_once_with(wait=True, cancel_futures=True)
        builder.generate_response.assert_not_called()
        self.assertEqual("worker_failure", runner.fatal.details["kind"])
        self.assertTrue(any("result_write" in note for note in original.__notes__))
        self.assertTrue(any("executor_shutdown" in note for note in original.__notes__))

    def test_final_receipt_error_latches_before_shutdown_and_retains_all_visible_replies(self):
        config, runner, builder = self.setup_session()
        original = OSError("offline completed receipt write failure")
        real_write = paired.write_json

        def write_receipt(path, value):
            if Path(path).name == "session.json" and value.get("status") == "completed":
                raise original
            real_write(path, value)

        def shutdown(*args, **kwargs):
            self.assertIsNotNone(runner.fatal, "Final write failure must latch before executor shutdown")

        builder.SUMMARY_EXECUTOR.shutdown.side_effect = shutdown
        with ExitStack() as stack:
            stack.enter_context(patch.object(paired, "validate_prefix", return_value=([], [])))
            stack.enter_context(patch.object(paired, "bootstrap_runtime", return_value=(None, builder, None, runner)))
            stack.enter_context(patch.object(paired, "write_json", side_effect=write_receipt))
            stack.enter_context(patch("builtins.print"))
            with self.assertRaises(OSError) as caught:
                asyncio.run(paired.execute_session(config, 1, self.runtime, offline_model=object()))
        self.assertIs(original, caught.exception)
        self.assertEqual(self.original_cwd, Path.cwd())
        builder.SUMMARY_EXECUTOR.shutdown.assert_called_once_with(wait=True, cancel_futures=True)
        self.assertEqual(5, builder.generate_response.call_count)
        ledger = paired.read_jsonl(self.runtime / config["run_id"] / "accepted-turns.jsonl")
        self.assertEqual([1, 2, 3, 4, 5], [row["turn_index"] for row in ledger])
        self.assertEqual(5, len(ledger))
        self.assertEqual("worker_cleanup_failure", paired.read_json(self.runtime / "STOP")["kind"])

    def test_controller_terminates_child_despite_stop_and_progress_write_failures(self):
        (self.root / "manifest.json").write_text("{}")
        (self.root / "generation").mkdir()
        schedule = {"session_executions": [{"execution_order": 1, "run_id": "offline_flat", "session_index": 1}]}
        (self.root / "generation/schedule.json").write_text(json.dumps(schedule))
        original = OriginalFailure("offline process journal failure after Popen")
        child = Mock(pid=876543, poll=Mock(return_value=None))
        child.wait.return_value = 0
        real_write = paired.write_json

        def write_progress(path, value):
            if Path(path).name == "progress.json":
                raise OSError("offline progress write failure")
            real_write(path, value)

        self.real_open = Path.open
        with ExitStack() as stack:
            stack.enter_context(patch.object(paired, "verify", return_value={"status": "offline fixture"}))
            stack.enter_context(patch.object(paired, "worker_environment", return_value={}))
            popen = stack.enter_context(patch.object(paired.subprocess, "Popen", return_value=child))
            stack.enter_context(patch.object(paired, "append_jsonl", side_effect=original))
            stack.enter_context(patch.object(paired, "write_json", side_effect=write_progress))
            stack.enter_context(patch.object(paired, "summarize", return_value={"offline": True}))
            stack.enter_context(patch.object(Path, "open", autospec=True, side_effect=self.fail_stop_open))
            kill = stack.enter_context(patch.object(paired.os, "killpg"))
            with self.assertRaises(OriginalFailure) as caught:
                paired.run_live()  # every process/provider boundary is mocked
        self.assertIs(original, caught.exception)
        popen.assert_called_once()
        kill.assert_called_once_with(child.pid, signal.SIGTERM)
        child.wait.assert_called_once_with(timeout=10)
        self.assertTrue(any("progress" in note for note in original.__notes__))
        self.assertTrue(any("STOP" in note for note in original.__notes__))


if __name__ == "__main__":
    unittest.main()
