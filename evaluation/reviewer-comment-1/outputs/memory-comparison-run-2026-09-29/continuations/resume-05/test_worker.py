"""Offline resume-05 contracts; all runtime imports, sockets and processes stubbed."""
from __future__ import annotations

from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch


WORKER_PATH = Path(__file__).with_name("worker.py")
STAGES = ("_generate_session_reflection", "_generate_long_term_summary_from_reflection", "_generate_factual_memory")


class ReplayAbort(RuntimeError):
    pass


class StubRunner:
    def __init__(self):
        self.fatal = None
        self.ordinary = Mock(return_value='{"facts":[{"fixture":"new provider result"}]}')
        self.generate = self.ordinary

    def check(self):
        if self.fatal is not None:
            raise self.fatal

    def abort(self, message, details):
        self.fatal = ReplayAbort(message)
        self.fatal.details = details
        raise self.fatal


def finish_coroutine(coroutine):
    """Run only the async test stub, without creating an event loop or socket."""
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    finally:
        coroutine.close()
    raise AssertionError("Unexpected asynchronous work in the mocked recovery")


class WorkerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="resume05-worker-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.here = self.root / "continuations/resume-05"
        self.runtime = self.root / "runtime"
        self.events = []
        self.stage = None
        self.launch_id = "offline-authorized-launch"
        self.write_json(self.here / "manifest.json", {"fixture": "offline only"})

        self.original = types.ModuleType("paired_runner")
        self.original.read_json = self.read_json
        self.original.write_json = Mock(side_effect=self.write_json)
        self.original.append_jsonl = Mock(side_effect=self.append_jsonl)
        self.original.digest = self.digest
        self.original.now = Mock(return_value="offline-timestamp")
        self.original.live_worker = Mock()
        self.original.bootstrap_runtime = Mock(side_effect=AssertionError("No native bootstrap in unit tests"))
        adapter = types.ModuleType("runtime_adapter")
        adapter.current_stage = lambda: self.stage
        self.continuation = types.ModuleType("continue_run")
        self.continuation.verify = Mock(side_effect=lambda: self.events.append("verify"))
        self.continuation.verify_preserved_prefix = Mock(side_effect=lambda: self.events.append("prefix"))
        self.retry = types.ModuleType("timeout_retries")
        self.retry.install_retry_policy = Mock(side_effect=lambda runtime: self.events.append("install"))
        modules = {"paired_runner": self.original, "runtime_adapter": adapter,
                   "continue_run": self.continuation, "timeout_retries": self.retry}
        self.start_patch(patch.dict(sys.modules, modules))
        for target in ("socket.socket", "socket.create_connection", "subprocess.Popen", "os.system"):
            self.start_patch(patch(target, side_effect=AssertionError("Offline test forbids sockets and processes")))
        with patch.object(sys, "path", list(sys.path)):
            spec = importlib.util.spec_from_file_location("resume05_worker_under_test", WORKER_PATH)
            self.worker = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.worker)
        self.worker.HERE, self.worker.ORIGINAL = self.here, self.root
        self.start_patch(patch.object(self.worker.asyncio, "run", side_effect=finish_coroutine))
        self.schedule = [{"execution_order": order, "run_id": f"future_{order:03d}",
                          "session_index": 2, "arm": "flat_full_history"} for order in range(1, 331)]
        self.schedule[77] = {"execution_order": 78, "run_id": self.worker.RUN_ID,
                             "session_index": 3, "arm": "structured_common_profile"}
        self.write_json(self.root / "generation/schedule.json", {"session_executions": self.schedule})
        self.audit = {
            "cached_finalization_calls": [
                {"request": {"stage": stage, "prompt": f"{stage}\nCaffè, una pausa.\n",
                             "logical_id": f"cached-logical-{index}",
                             "graph_requested_config": {"temperature": None, "max_tokens": 4096, "thinking_budget": None}},
                 "outcome": {"accepted": True, "finish_reasons": ["STOP"],
                             "text": f"Previously archived narrative {index}.\n",
                             "native_record_id": f"cached-native-{index}"}}
                for index, stage in enumerate(STAGES[:2], 1)
            ],
            "failed_request": {"stage": STAGES[2], "prompt": 'Extract facts from [{"therapist":"Caffè?"}]\n',
                               "logical_id": "failed-factual-logical",
                               "graph_requested_config": {"temperature": 0.2, "max_tokens": 8192, "thinking_budget": 1024}},
            "failed_outcome": {"native_record_id": "failed-factual-native"},
        }
        self.write_json(self.here / "checkpoint-audit.json", self.audit)

    def start_patch(self, patcher):
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    @staticmethod
    def read_json(path):
        return json.loads(Path(path).read_text(encoding="utf-8"))

    @staticmethod
    def read_jsonl(path):
        return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line]

    @staticmethod
    def write_json(path, value):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False) + "\n", encoding="utf-8")

    @staticmethod
    def append_jsonl(path, value):
        with Path(path).open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(value, ensure_ascii=False) + "\n")

    @staticmethod
    def digest(path):
        return hashlib.sha256(Path(path).read_bytes()).hexdigest()

    def install(self, *, preflight=False, audit=None):
        runner = StubRunner()
        evidence = self.root / f"replay-{len(list(self.root.glob('replay-*')))}.jsonl"
        evidence.touch()
        progress = self.worker.install_finalization_replay(runner, audit or self.audit, evidence, preflight=preflight)
        return runner, progress, evidence

    def invoke(self, runner, request, **overrides):
        self.stage = overrides.pop("stage", request["stage"])
        prompt = overrides.pop("prompt", request["prompt"])
        options = {**request["graph_requested_config"], **overrides}
        return runner.generate(prompt, **options)

    def reuse_narratives(self, runner):
        for cached in self.audit["cached_finalization_calls"]:
            self.assertEqual(self.invoke(runner, cached["request"]), cached["outcome"]["text"])

    def logger_fixture(self):
        patient = "offline-native-patient"
        sessions = [{"ended_at": "prior-close", "session_id": f"comparison_s{i:02d}", "turns": [None] * 5}
                    for i in (1, 2)]
        sessions.append({"ended_at": None, "session_id": self.worker.SESSION_ID,
                         "patient_id": patient, "turns": [{"ordinal": i} for i in range(11, 16)]})
        restored = {"total_turns": 15, "session_id": self.worker.SESSION_ID, "fixture": "post-turn15"}
        logger = types.SimpleNamespace(data={"sessions": sessions}, current_session_index=None,
                                       restore_state=Mock(return_value=restored), start_run=Mock(), start_session=Mock())
        run_logger = types.SimpleNamespace(RunLogger=Mock(return_value=logger))
        api = types.SimpleNamespace(session_loggers={})
        return api, run_logger, logger, {"native_api_id": patient}

    def authorize(self, order):
        item = self.schedule[order - 1]
        self.write_json(self.runtime / "active-execution.json", {**item, "launch_id": self.launch_id})
        self.write_json(self.runtime / "launch.json", {"launch_id": self.launch_id})
        (self.runtime / "STOP").unlink(missing_ok=True)
        return self.runtime / item["run_id"] / "sessions" / f"session_{item['session_index']:02d}/session.json"

    def assert_policy(self, result):
        self.assertEqual(result["transport_amendment"], {
            "continuation": "resume-05", "policy": "bounded_timeout_retry_v1", "policy_source_continuation": "resume-04",
            "max_attempts": 3, "retry_delays_seconds": [30, 60],
            "continuation_manifest_sha256": self.digest(self.here / "manifest.json"),
        })

    def test_exact_replay_preserves_provenance_then_calls_factual_once(self):
        before = deepcopy(self.audit)
        runner, progress, evidence = self.install()
        self.reuse_narratives(runner)
        runner.ordinary.assert_not_called()
        result = self.invoke(runner, self.audit["failed_request"])
        self.assertEqual(result, runner.ordinary.return_value)
        runner.ordinary.assert_called_once_with(self.audit["failed_request"]["prompt"], 0.2, 8192, thinking_budget=1024)
        self.assertEqual(progress, {"reused_generations": 2, "factual_calls": 1})
        rows = self.read_jsonl(evidence)
        self.assertEqual(len(rows), 3)
        for row, cached in zip(rows[:2], self.audit["cached_finalization_calls"]):
            self.assertEqual(row["event"], "reuse_successful_finalization")
            self.assertEqual(row["stage"], cached["request"]["stage"])
            self.assertEqual(row["logical_id"], cached["request"]["logical_id"])
            self.assertEqual(row["native_record_id"], cached["outcome"]["native_record_id"])
            self.assertIs(row["external_call"], False)
            self.assertEqual(row["prompt_sha256"], self.worker.sha_text(cached["request"]["prompt"]))
            self.assertEqual(row["response_sha256"], self.worker.sha_text(cached["outcome"]["text"]))
        self.assertEqual(rows[2]["prior_logical_id"], "failed-factual-logical")
        self.assertEqual(rows[2]["prior_native_record_id"], "failed-factual-native")
        self.assertIs(rows[2]["prompt_identical_to_failed_request"], True)
        self.assertEqual(rows[2]["graph_requested_config"], self.audit["failed_request"]["graph_requested_config"])
        self.assertEqual(rows[2]["mode"], "live")
        with self.assertRaises(ReplayAbort):
            self.invoke(runner, self.audit["failed_request"])
        runner.ordinary.assert_called_once()
        self.assertEqual(self.read_jsonl(evidence), rows)
        self.assertEqual(self.audit, before)

    def test_byte_changes_settings_and_reordered_stages_abort_before_call(self):
        for position in range(3):
            for mismatch in ("prompt", "temperature", "max_tokens", "thinking_budget", "stage"):
                with self.subTest(position=position, mismatch=mismatch):
                    runner, progress, evidence = self.install()
                    requests = [c["request"] for c in self.audit["cached_finalization_calls"]] + [self.audit["failed_request"]]
                    for request in requests[:position]:
                        self.invoke(runner, request)
                    request = requests[position]
                    changed = {"prompt": request["prompt"] + " ", "temperature": 0.9, "max_tokens": 7,
                               "thinking_budget": 17, "stage": STAGES[(position + 1) % 3]}
                    with self.assertRaises(ReplayAbort):
                        self.invoke(runner, request, **{mismatch: changed[mismatch]})
                    runner.ordinary.assert_not_called()
                    self.assertEqual(progress, {"reused_generations": position, "factual_calls": 0})
                    self.assertEqual(len(self.read_jsonl(evidence)), position)
                    with self.assertRaises(ReplayAbort):
                        self.invoke(runner, request)
                    runner.ordinary.assert_not_called()

    def test_invalid_audit_order_or_nonaccepted_cached_output_is_rejected(self):
        for corruption in ("reordered", "wrong_failed_stage", "not_accepted", "truncated", "empty"):
            with self.subTest(corruption=corruption):
                audit = deepcopy(self.audit)
                if corruption == "reordered": audit["cached_finalization_calls"].reverse()
                elif corruption == "wrong_failed_stage": audit["failed_request"]["stage"] = STAGES[0]
                elif corruption == "not_accepted": audit["cached_finalization_calls"][0]["outcome"]["accepted"] = False
                elif corruption == "truncated": audit["cached_finalization_calls"][0]["outcome"]["finish_reasons"] = ["MAX_TOKENS"]
                elif corruption == "empty": audit["cached_finalization_calls"][0]["outcome"]["text"] = " \n"
                if corruption in ("reordered", "wrong_failed_stage"):
                    runner = StubRunner()
                    with self.assertRaisesRegex(RuntimeError, "generation sequence"):
                        self.worker.install_finalization_replay(runner, audit, self.root / "unused.jsonl")
                    runner.ordinary.assert_not_called()
                else:
                    runner, progress, evidence = self.install(audit=audit)
                    with self.assertRaises(ReplayAbort):
                        self.invoke(runner, audit["cached_finalization_calls"][0]["request"])
                    runner.ordinary.assert_not_called()
                    self.assertEqual(progress, {"reused_generations": 0, "factual_calls": 0})
                    self.assertEqual(self.read_jsonl(evidence), [])

    def test_preflight_fixture_never_invokes_underlying_runner(self):
        runner, progress, evidence = self.install(preflight=True)
        self.reuse_narratives(runner)
        self.assertEqual(self.invoke(runner, self.audit["failed_request"]), '{"facts":[]}')
        runner.ordinary.assert_not_called()
        self.original.bootstrap_runtime.assert_not_called()
        self.assertEqual(progress, {"reused_generations": 2, "factual_calls": 1})
        self.assertEqual(self.read_jsonl(evidence)[2]["mode"], "offline_preflight")

    def test_attach_reuses_open_third_session_and_post_turn15_state(self):
        api, run_logger, logger, config = self.logger_fixture()
        before = deepcopy(logger.data)
        key = self.worker.attach_open_session(api, run_logger, config)
        self.assertEqual(key, (f"comparison_{self.worker.RUN_ID}", config["native_api_id"], self.worker.SESSION_ID))
        self.assertEqual(logger.current_session_index, 2)
        self.assertIs(api.session_loggers[key]["logger"], logger)
        self.assertIs(api.session_loggers[key]["latest_state"], logger.restore_state.return_value)
        self.assertEqual(api.session_loggers[key]["latest_state"]["total_turns"], 15)
        self.assertEqual(logger.data, before)
        run_logger.RunLogger.assert_called_once_with(f"comparison_{self.worker.RUN_ID}")
        logger.restore_state.assert_called_once_with(config["native_api_id"])
        logger.start_run.assert_not_called()
        logger.start_session.assert_not_called()

    def test_attach_rejects_wrong_session_snapshot_or_existing_registration(self):
        for corruption in ("missing_session", "open_prior", "closed_current", "four_turns", "patient", "session", "state_turns", "state_session", "registered"):
            with self.subTest(corruption=corruption):
                api, run_logger, logger, config = self.logger_fixture()
                sessions = logger.data["sessions"]
                if corruption == "missing_session": sessions.pop()
                elif corruption == "open_prior": sessions[0]["ended_at"] = None
                elif corruption == "closed_current": sessions[2]["ended_at"] = "closed"
                elif corruption == "four_turns": sessions[2]["turns"].pop()
                elif corruption == "patient": sessions[2]["patient_id"] = "other-patient"
                elif corruption == "session": sessions[2]["session_id"] = "comparison_s02"
                elif corruption == "state_turns": logger.restore_state.return_value["total_turns"] = 14
                elif corruption == "state_session": logger.restore_state.return_value["session_id"] = "comparison_s02"
                elif corruption == "registered":
                    key = (f"comparison_{self.worker.RUN_ID}", config["native_api_id"], self.worker.SESSION_ID)
                    api.session_loggers[key] = {"existing": True}
                before = deepcopy(api.session_loggers)
                with self.assertRaises(RuntimeError):
                    self.worker.attach_open_session(api, run_logger, config)
                self.assertEqual(api.session_loggers, before)
                self.assertIsNone(logger.current_session_index)
                logger.start_run.assert_not_called()
                logger.start_session.assert_not_called()

    def test_future_orders_install_unchanged_policy_before_native_delegate(self):
        for order in (79, 330):
            with self.subTest(order=order):
                receipt = self.authorize(order)
                self.events.clear()
                self.retry.install_retry_policy.reset_mock()
                self.original.live_worker.reset_mock()
                def delegate(given_order, given_launch):
                    self.assertEqual(self.events, ["verify", "prefix", "install"])
                    self.assertEqual((given_order, given_launch), (order, self.launch_id))
                    self.events.append("delegate")
                    result = {"status": "completed", "run_id": self.schedule[order - 1]["run_id"]}
                    self.write_json(receipt, result)
                    return result
                self.original.live_worker.side_effect = delegate
                result = self.worker.run_worker(order, self.launch_id)
                self.assertEqual(result["status"], "completed")
                self.assertEqual(self.events, ["verify", "prefix", "install", "delegate"])
                self.retry.install_retry_policy.assert_called_once_with(self.runtime)
                self.original.live_worker.assert_called_once_with(order, self.launch_id)
                self.assert_policy(self.read_json(receipt))
        self.original.bootstrap_runtime.assert_not_called()

    def test_invalid_order_active_authorization_launch_or_stop_prevents_install(self):
        for case in ("below", "above", "none", "bool", "float", "active", "argument_launch", "stored_launch", "stop"):
            with self.subTest(case=case):
                self.authorize(79)
                order, launch = 79, self.launch_id
                if case == "below": order = 77
                elif case == "above": order = 331
                elif case == "none": order = None
                elif case == "bool": order = True
                elif case == "float": order = 78.0
                elif case == "active": self.write_json(self.runtime / "active-execution.json", {**self.schedule[77], "launch_id": launch})
                elif case == "argument_launch": launch = "foreign-launch"
                elif case == "stored_launch": self.write_json(self.runtime / "launch.json", {"launch_id": "foreign-launch"})
                elif case == "stop": (self.runtime / "STOP").write_text("operator stop", encoding="utf-8")
                with self.assertRaises(RuntimeError):
                    self.worker.run_worker(order, launch)
                self.retry.install_retry_policy.assert_not_called()
                self.original.live_worker.assert_not_called()
                self.original.bootstrap_runtime.assert_not_called()

    def test_order78_routes_to_finalization_recovery_after_policy_install(self):
        receipt = self.authorize(78)
        async def recovery(runtime, audit):
            self.assertEqual(self.events, ["verify", "prefix", "install"])
            self.assertEqual(runtime, self.runtime)
            self.assertEqual(audit, self.audit)
            self.events.append("recovery")
            result = {"status": "completed", "run_id": self.worker.RUN_ID}
            self.write_json(receipt, result)
            return result
        with patch.object(self.worker, "resume_finalization", side_effect=recovery) as recover:
            result = self.worker.run_worker(78, self.launch_id)
            recover.assert_called_once_with(self.runtime, self.audit)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(self.events, ["verify", "prefix", "install", "recovery"])
        self.retry.install_retry_policy.assert_called_once_with(self.runtime)
        self.original.live_worker.assert_not_called()
        self.original.bootstrap_runtime.assert_not_called()
        self.assert_policy(self.read_json(receipt))


if __name__ == "__main__":
    unittest.main()
