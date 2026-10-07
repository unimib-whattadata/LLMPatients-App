"""Offline controller gates: fake subprocesses, temporary outputs, no provider.

The prepared 330-entry schedule is compared with its frozen plan. Behavioral
tests use small schedules with the same fields; verify() is mocked because the
execution package is frozen only after this test gate passes. No SDK is needed.
"""
from __future__ import annotations

import json
import signal
import socket
import subprocess
import tempfile
import threading
import unittest
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import AsyncMock, call, patch

import paired_runner as runner
from prepare_execution import PLAN

PACKAGE = Path(__file__).resolve().parent
ARMS = ("structured_common_profile", "flat_full_history")


def block_network(*args, **kwargs):
    raise AssertionError("Offline controller test attempted network access")


def put_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding="utf-8")


def small_schedule():
    items = []
    for index, arms in ((1, ARMS), (2, tuple(reversed(ARMS)))):
        for arm in arms:
            items.append({"execution_order": len(items) + 1, "session_index": index,
                          "pair_order": 1, "pair_id": "offline_profile__r01", "arm": arm,
                          "run_id": f"offline_profile__r01__{arm}",
                          "turn_ids": [f"s{index:02d}t{turn:02d}" for turn in range(1, 6)]})
    return items


class FakeProcess:
    """A worker completes only when polled; no OS process is created."""

    def __init__(self, factory, command, kwargs, item):
        self.factory, self.command, self.kwargs, self.item = factory, command, kwargs, item
        self.pid = 80000 + len(factory.children)
        self.returncode = None
        self.waits = []
        self.polls_remaining = 1

    def poll(self):
        if self.returncode is not None:
            return self.returncode
        if self.factory.hang:
            return None
        if self.polls_remaining:
            self.polls_remaining -= 1
            return None
        code = self.factory.exit_codes.get(self.item["execution_order"], 0)
        if self.factory.receipt:
            receipt = {"status": "completed", "inference_mode": "live_openrouter",
                       "run_id": self.item["run_id"], "session_index": self.item["session_index"],
                       "arm": self.item["arm"], "pid": self.pid,
                       "process_instance_id": f"offline-process-{self.pid}",
                       "execution_manifest_sha256": runner.digest(self.factory.here / "manifest.json")}
            receipt.update(self.factory.receipt_changes)
            put_json(Path(self.kwargs["cwd"]) / "session.json", receipt)
        if self.factory.on_finish:
            self.factory.on_finish(self)
        self.returncode = code
        return code

    def wait(self, timeout=None):
        self.waits.append(timeout)
        if self.factory.wait_timeout_once and len(self.waits) == 1:
            raise subprocess.TimeoutExpired(self.command, timeout)
        self.returncode = -signal.SIGKILL if len(self.waits) > 1 else -signal.SIGTERM
        return self.returncode


class FakeProcesses:
    def __init__(self, here, *, exit_codes=None, receipt=True, receipt_changes=None,
                 hang=False, wait_timeout_once=False, on_finish=None):
        self.here, self.children = here, []
        self.exit_codes = exit_codes or {}
        self.receipt, self.receipt_changes = receipt, receipt_changes or {}
        self.hang, self.wait_timeout_once, self.on_finish = hang, wait_timeout_once, on_finish
        self.lock = threading.Lock()

    def __call__(self, command, **kwargs):
        with self.lock:
            if any(child.returncode is None for child in self.children):
                raise AssertionError("Controller launched another worker while one is running")
            item = json.loads((self.here / "runtime/active-execution.json").read_text())
            child = FakeProcess(self, list(command), kwargs, item)
            self.children.append(child)
            return child


class ControllerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="llmpatient-offline-controller-")
        self.addCleanup(temporary.cleanup)
        self.here = Path(temporary.name)
        self.runtime = self.here / "runtime"
        self.schedule = small_schedule()
        put_json(self.here / "manifest.json", {"fixture": "offline controller only"})
        put_json(self.here / "generation/schedule.json", {"session_executions": self.schedule})
        self.patch(runner, "HERE", self.here)
        self.verify = self.patch(runner, "verify", return_value={"status": "offline_mock"})
        self.patch(runner, "worker_environment", return_value={"OFFLINE_CONTROLLER_TEST": "1"})
        self.patch(runner.time, "sleep", return_value=None)
        self.patch(runner, "print", create=True)
        self.patch(socket.socket, "connect", side_effect=block_network)
        self.patch(socket.socket, "connect_ex", side_effect=block_network)
        self.patch(socket, "create_connection", side_effect=block_network)
        # Every test must explicitly install fake Popen or fail before spawning.
        self.patch(runner.subprocess, "Popen", side_effect=AssertionError("No real subprocess allowed"))
        self.patch(runner.os, "killpg", side_effect=AssertionError("No real process signal allowed"))

    def patch(self, target, attribute, *args, **kwargs):
        patcher = patch.object(target, attribute, *args, **kwargs)
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def processes(self, **kwargs):
        factory = FakeProcesses(self.here, **kwargs)
        self.patch(runner.subprocess, "Popen", side_effect=factory)
        return factory

    def assert_stopped(self, factory, count=1):
        self.assertEqual(count, len(factory.children))
        self.assertTrue((self.runtime / "STOP").is_file())
        progress = json.loads((self.runtime / "progress.json").read_text())
        self.assertEqual("stopped", progress["status"])

    def worker_receipts(self, *, item=None, launch_id="offline-launch"):
        item = dict(self.schedule[0] if item is None else item)
        put_json(self.runtime / "launch.json", {"launch_id": launch_id})
        put_json(self.runtime / "active-execution.json", {**item, "launch_id": launch_id})
        return item

    def test_prepared_schedule_preserves_all_330_frozen_entries(self):
        prepared = (PACKAGE / "generation/schedule.json").read_bytes()
        self.assertEqual((PLAN / "design/schedule.json").read_bytes(), prepared)
        data = json.loads(prepared)
        items = data["session_executions"]
        self.assertEqual(list(range(1, 331)), [item["execution_order"] for item in items])
        self.assertEqual(330, len({(item["run_id"], item["session_index"]) for item in items}))
        self.assertEqual(Counter({arm: 165 for arm in ARMS}), Counter(item["arm"] for item in items))
        runs = {item["run_id"] for item in items}
        self.assertEqual(30, len(runs))
        for run_id in runs:
            self.assertEqual(list(range(1, 12)), [item["session_index"] for item in items if item["run_id"] == run_id])
        reconstructed = []
        for session in data["sessions"]:
            for pair in session["pairs"]:
                for arm in pair["arm_order"]:
                    reconstructed.append((session["session_index"], pair["pair_id"], arm))
        self.assertEqual(reconstructed, [(item["session_index"], item["pair_id"], item["arm"]) for item in items])
        for item in items:
            self.assertEqual([f"s{item['session_index']:02d}t{turn:02d}" for turn in range(1, 6)], item["turn_ids"])

    def test_controller_launches_fresh_workers_in_exact_scheduled_order(self):
        factory = self.processes()
        summary = runner.run_live()
        self.assertEqual(4, len(factory.children))
        launch = json.loads((self.runtime / "launch.json").read_text())
        self.assertEqual(runner.digest(self.here / "manifest.json"), launch["execution_manifest_sha256"])
        for item, child in zip(self.schedule, factory.children):
            self.assertEqual([str(runner.BUNDLED_PYTHON), str(self.here / "paired_runner.py"), "_worker",
                              "--execution-order", str(item["execution_order"]),
                              "--launch-id", launch["launch_id"]], child.command)
            self.assertEqual(self.runtime / item["run_id"] / "sessions" / f"session_{item['session_index']:02d}",
                             child.kwargs["cwd"])
            self.assertTrue(child.kwargs["start_new_session"])
            self.assertEqual({"OFFLINE_CONTROLLER_TEST": "1"}, child.kwargs["env"])
            self.assertEqual(subprocess.STDOUT, child.kwargs["stderr"])
            self.assertTrue(child.kwargs["stdout"].closed)
        self.assertEqual(4, len({child.pid for child in factory.children}))
        events = [json.loads(line) for line in (self.runtime / "processes.jsonl").read_text().splitlines()]
        self.assertEqual([(kind, item["execution_order"]) for item in self.schedule for kind in ("start", "exit")],
                         [(event["event"], event["execution_order"]) for event in events])
        self.assertEqual(4, summary["completed_sessions"])
        self.assertFalse((self.runtime / "STOP").exists())
        self.assertEqual([call()] * 6, self.verify.call_args_list)

    def test_existing_runtime_refuses_automatic_resume(self):
        put_json(self.runtime / "partial-output.json", {"status": "interrupted"})
        factory = self.processes()
        before = (self.runtime / "partial-output.json").read_bytes()
        with self.assertRaisesRegex(RuntimeError, "explicit reviewed continuation"):
            runner.run_live()
        self.assertEqual([], factory.children)
        self.assertEqual(before, (self.runtime / "partial-output.json").read_bytes())
        self.assertFalse((self.runtime / "launch.json").exists())

    def test_completed_runtime_cannot_be_launched_again(self):
        factory = self.processes()
        runner.run_live()
        launch = (self.runtime / "launch.json").read_bytes()
        with self.assertRaisesRegex(RuntimeError, "Live output already exists"):
            runner.run_live()
        self.assertEqual(4, len(factory.children))
        self.assertEqual(launch, (self.runtime / "launch.json").read_bytes())

    def test_two_simultaneous_launchers_have_one_exclusive_winner(self):
        factory = self.processes()
        barrier = threading.Barrier(2)
        original_open = Path.open
        launch_path = self.runtime / "launch.json"

        def racing_open(path, mode="r", *args, **kwargs):
            if path == launch_path and mode == "x":
                barrier.wait(timeout=5)
            return original_open(path, mode, *args, **kwargs)

        def launch():
            try:
                return runner.run_live()
            except FileExistsError as exc:
                return exc

        with patch.object(Path, "open", racing_open), ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(lambda _: launch(), range(2)))
        self.assertEqual(1, sum(isinstance(value, dict) for value in outcomes))
        self.assertEqual(1, sum(isinstance(value, FileExistsError) for value in outcomes))
        self.assertEqual(4, len(factory.children))
        self.assertFalse((self.runtime / "STOP").exists())

    def test_first_failed_worker_stops_before_other_arm(self):
        factory = self.processes(exit_codes={1: 7})
        with self.assertRaisesRegex(RuntimeError, "Worker exit 7"):
            runner.run_live()
        self.assert_stopped(factory)
        self.assertFalse((self.runtime / self.schedule[1]["run_id"]).exists())

    def test_worker_published_stop_prevents_next_worker_and_preserves_reason(self):
        def stop_after_finish(child):
            put_json(self.runtime / "STOP", {"kind": "offline_provider_error", "execution_order": 1})

        factory = self.processes(on_finish=stop_after_finish)
        with self.assertRaisesRegex(RuntimeError, "Global STOP"):
            runner.run_live()
        self.assert_stopped(factory)
        self.assertEqual("offline_provider_error", json.loads((self.runtime / "STOP").read_text())["kind"])

    def test_verification_failure_prevents_next_worker(self):
        factory = self.processes()
        self.verify.side_effect = [{"status": "offline"}, {"status": "offline"}, RuntimeError("fixture changed")]
        with self.assertRaisesRegex(RuntimeError, "fixture changed"):
            runner.run_live()
        self.assert_stopped(factory)

    def test_subprocess_timeout_terminates_group_before_next_arm(self):
        factory = self.processes(hang=True)
        signals = self.patch(runner.os, "killpg")
        self.patch(runner.time, "monotonic", side_effect=[0.0, 1201.0])
        with self.assertRaisesRegex(RuntimeError, "Session timeout; no replay"):
            runner.run_live()
        self.assert_stopped(factory)
        child = factory.children[0]
        self.assertEqual([call(child.pid, signal.SIGTERM)], signals.call_args_list)
        self.assertEqual([10], child.waits)
        self.assertEqual("worker_interrupted_or_timeout", json.loads((self.runtime / "STOP").read_text())["kind"])

    def test_timeout_escalates_to_kill_when_worker_ignores_term(self):
        factory = self.processes(hang=True, wait_timeout_once=True)
        signals = self.patch(runner.os, "killpg")
        self.patch(runner.time, "monotonic", side_effect=[0.0, 1201.0])
        with self.assertRaisesRegex(RuntimeError, "Session timeout"):
            runner.run_live()
        self.assert_stopped(factory)
        child = factory.children[0]
        self.assertEqual([call(child.pid, signal.SIGTERM), call(child.pid, signal.SIGKILL)], signals.call_args_list)
        self.assertEqual([10, 10], child.waits)

    def reject_receipt(self, changes):
        factory = self.processes(receipt_changes=changes)
        with self.assertRaises(RuntimeError):
            runner.run_live()
        self.assert_stopped(factory)

    def test_stopped_receipt_is_refused_even_with_zero_exit_code(self):
        self.reject_receipt({"status": "stopped"})

    def test_offline_receipt_cannot_be_counted_as_live(self):
        self.reject_receipt({"inference_mode": "offline_stub"})

    def test_receipt_from_wrong_run_is_refused(self):
        self.reject_receipt({"run_id": self.schedule[1]["run_id"]})

    def test_receipt_from_wrong_session_is_refused(self):
        self.reject_receipt({"session_index": 11})

    def test_receipt_from_wrong_arm_is_refused(self):
        self.reject_receipt({"arm": self.schedule[1]["arm"]})

    def test_receipt_from_wrong_manifest_is_refused(self):
        self.reject_receipt({"execution_manifest_sha256": "wrong-manifest"})

    def test_missing_receipt_is_refused_even_with_zero_exit_code(self):
        factory = self.processes(receipt=False)
        with self.assertRaises(FileNotFoundError):
            runner.run_live()
        self.assert_stopped(factory)

    def test_live_worker_dispatches_only_the_active_frozen_entry(self):
        item = self.worker_receipts(item=self.schedule[2])
        config = {"run_id": item["run_id"]}
        loaded = self.patch(runner, "load_run", return_value=config)
        execute = self.patch(runner, "execute_session", new=AsyncMock(return_value={"status": "offline_fixture"}))
        self.assertEqual({"status": "offline_fixture"}, runner.live_worker(3, "offline-launch"))
        self.verify.assert_called_once_with(worker=True)
        loaded.assert_called_once_with(item["run_id"])
        execute.assert_awaited_once_with(config, item["session_index"], self.runtime)

    def test_live_worker_refuses_wrong_launch_id_before_loading_run(self):
        self.worker_receipts()
        loaded = self.patch(runner, "load_run")
        execute = self.patch(runner, "execute_session", new=AsyncMock())
        with self.assertRaisesRegex(RuntimeError, "current scheduled execution"):
            runner.live_worker(1, "other-launch")
        loaded.assert_not_called()
        execute.assert_not_awaited()

    def test_live_worker_refuses_wrong_active_launch_id(self):
        item = self.worker_receipts()
        put_json(self.runtime / "active-execution.json", {**item, "launch_id": "other-launch"})
        execute = self.patch(runner, "execute_session", new=AsyncMock())
        with self.assertRaisesRegex(RuntimeError, "current scheduled execution"):
            runner.live_worker(1, "offline-launch")
        execute.assert_not_awaited()

    def test_live_worker_refuses_wrong_execution_order(self):
        self.worker_receipts()
        execute = self.patch(runner, "execute_session", new=AsyncMock())
        with self.assertRaisesRegex(RuntimeError, "current scheduled execution"):
            runner.live_worker(2, "offline-launch")
        execute.assert_not_awaited()

    def test_live_worker_refuses_every_changed_active_schedule_field(self):
        loaded = self.patch(runner, "load_run")
        execute = self.patch(runner, "execute_session", new=AsyncMock())
        changes = {"run_id": "other-run", "session_index": 2, "arm": ARMS[1],
                   "pair_id": "other-pair", "pair_order": 2, "turn_ids": ["wrong-turn"]}
        for key, value in changes.items():
            with self.subTest(field=key):
                item = self.worker_receipts()
                put_json(self.runtime / "active-execution.json", {**item, key: value, "launch_id": "offline-launch"})
                with self.assertRaisesRegex(RuntimeError, "differs from frozen schedule"):
                    runner.live_worker(1, "offline-launch")
        loaded.assert_not_called()
        execute.assert_not_awaited()

    def test_live_worker_stop_latch_reaches_no_bootstrap_or_provider(self):
        item = self.worker_receipts()
        put_json(self.runtime / "STOP", {"kind": "offline_manual_stop"})
        self.patch(runner, "load_run", return_value={"run_id": item["run_id"]})
        bootstrap = self.patch(runner, "bootstrap_runtime", side_effect=AssertionError("No bootstrap after STOP"))
        # Real execute_session must reject before config lookup or provider imports.
        with self.assertRaisesRegex(RuntimeError, "Global STOP exists"):
            runner.live_worker(1, "offline-launch")
        bootstrap.assert_not_called()
        self.assertFalse((self.runtime / item["run_id"]).exists())


if __name__ == "__main__":
    unittest.main()
