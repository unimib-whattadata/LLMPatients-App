"""Offline resume-07 contracts; pure prompt code only, no native runtime or API."""
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
RUN_ID = "jason_smith_001__r01__flat_full_history"


class RecoveryAbort(RuntimeError):
    pass


class CreditError(RuntimeError):
    status_code = 402
    retry_after = 120


class StubRunner:
    def __init__(self):
        self.fatal = None
        self.ordinary = Mock(return_value="Recovered visible fiftieth reply.")
        self.generate = self.ordinary

    def check(self):
        if self.fatal is not None:
            raise self.fatal

    def abort(self, message, details):
        self.fatal = RecoveryAbort(message)
        self.fatal.details = details
        raise self.fatal


def finish_coroutine(coroutine):
    """The flat recovery has no awaits; no event loop or socket is created."""
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    finally:
        coroutine.close()
    raise AssertionError("Unexpected asynchronous work in the mocked flat recovery")


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class WorkerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="resume07-worker-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.here = self.root / "continuations/resume-07"
        self.runtime = self.root / "runtime"
        self.run_dir = self.runtime / RUN_ID
        self.session_dir = self.run_dir / "sessions/session_10"
        self.receipt = self.session_dir / "session.json"
        self.ledger = self.run_dir / "accepted-turns.jsonl"
        self.recovery_path = self.session_dir / "recovery-resume07.json"
        self.events = []
        self.launch_id = "unchanged-authorized-launch"
        self.case = "Synthetic common case: caffè, un ricordo.\n"
        self.config = {"arm": "flat_full_history", "case_path": "case.txt", "scenario_path": "scenario.json"}
        self.turns = [{"turn_id": f"s10t{i:02d}", "text": f"Session ten fixture question {i}?"} for i in range(1, 6)]
        self.accepted = [{"run_id": RUN_ID, "status": "accepted", "turn_index": i,
                          "session_index": (i - 1) // 5 + 1,
                          "turn_id": f"s{(i - 1) // 5 + 1:02d}t{(i - 1) % 5 + 1:02d}",
                          "therapist_text": f"Old question {i}: caffè?",
                          "patient_text": f"Frozen accepted reply {i}.\nSecond line {i}.",
                          "application_guard_failure": False} for i in range(1, 50)]
        self.accepted[45]["therapist_text"] = "Please state your full name and your age in years, in your own words."
        self.write_checkpoint()
        self.original_ledger = self.ledger.read_bytes()
        self.original_receipt_hash = self.digest(self.receipt)
        self.write_json(self.here / "manifest.json", {"fixture": "offline only"})
        (self.root / "generation").mkdir()
        (self.root / "generation/case.txt").write_text(self.case, encoding="utf-8")
        self.write_json(self.root / "generation/scenario.json", {"sessions": [{}] * 9 + [{"turns": self.turns}]})
        self.schedule = [{"execution_order": order, "run_id": f"future_{order:03d}", "session_index": 11}
                         for order in range(1, 331)]
        self.schedule[289] = {"execution_order": 290, "run_id": RUN_ID, "session_index": 10}
        self.write_json(self.root / "generation/schedule.json", {"session_executions": self.schedule})

        self.original = types.ModuleType("paired_runner")
        self.original.read_json = self.read_json
        self.original.read_jsonl = self.read_jsonl
        self.original.write_json = Mock(side_effect=self.write_json)
        self.original.append_jsonl = Mock(side_effect=self.append_jsonl)
        self.original.digest = self.digest
        self.original.now = Mock(return_value="offline-timestamp")
        self.original.load_run = Mock(return_value=self.config)
        self.original.live_worker = Mock()
        self.original.stop_campaign = Mock()
        self.original.FALLBACKS = {"Known native fallback fixture"}
        self.runner = StubRunner()
        self.builder = types.SimpleNamespace(
            State=lambda **kw: types.SimpleNamespace(**kw, safe_user_input=None, safety_flags=[]),
            sanitize_user_input=Mock(side_effect=lambda state: setattr(state, "safe_user_input", state.user_input)),
            generate_response=Mock(side_effect=lambda state: {"response": self.runner.generate(prompt=state.prompt)}),
            SUMMARY_EXECUTOR=types.SimpleNamespace(shutdown=Mock()),
            _summarize_episode=Mock(side_effect=AssertionError("Flat recovery has no memory calls")),
            _generate_session_reflection=Mock(side_effect=AssertionError("Flat recovery has no memory calls")),
            _generate_factual_memory=Mock(side_effect=AssertionError("Flat recovery has no memory calls")),
        )
        self.original.bootstrap_runtime = Mock(side_effect=self.bootstrap)
        self.run_logger = Mock()
        # This is the frozen, stdlib-only prompt constructor, not a native/model import.
        self.contract = load_module("resume07_pure_prompt_contract", WORKER_PATH.parents[2] / "prompt_contract.py")
        self.continuation = types.ModuleType("continue_run")
        self.continuation.verify = Mock(side_effect=lambda: self.events.append("verify"))
        self.continuation.verify_preserved_prefix = Mock(side_effect=lambda: self.events.append("prefix"))
        self.retry = types.ModuleType("timeout_retries")
        self.retry.install_retry_policy = Mock(side_effect=lambda runtime: self.events.append("install"))
        self.start_patch(patch.dict(sys.modules, {
            "paired_runner": self.original, "prompt_contract": self.contract,
            "continue_run": self.continuation, "timeout_retries": self.retry,
        }))
        for target in ("socket.socket", "socket.create_connection", "subprocess.Popen", "os.system"):
            self.start_patch(patch(target, side_effect=AssertionError("Offline test forbids sockets and processes")))
        with patch.object(sys, "path", list(sys.path)):
            self.worker = load_module("resume07_worker_under_test", WORKER_PATH)
        self.worker.HERE, self.worker.ORIGINAL = self.here, self.root
        self.start_patch(patch.object(self.worker.asyncio, "run", side_effect=finish_coroutine))
        self.failed_prompt = self.contract.render_prompt(case_block=self.case,
            arm_context=self.contract.flat_context_from_ledger(self.ledger, run_id=RUN_ID, expected_prior_turns=49),
            latest_question=self.turns[4]["text"])
        self.audit = {"failed_request": {
            "stage": "generate_response", "turn_id": "s10t05", "session_index": 10,
            "prompt": self.failed_prompt, "logical_id": "original-failed-logical",
            "graph_requested_config": {"temperature": None, "max_tokens": None, "thinking_budget": None}},
            "failed_outcome": {"native_record_id": "original-402-native", "http_status": 402}}
        self.write_json(self.here / "checkpoint-audit.json", self.audit)

    def start_patch(self, patcher):
        value = patcher.start()
        self.addCleanup(patcher.stop)
        return value

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

    def write_checkpoint(self):
        self.write_json(self.receipt, {"run_id": RUN_ID, "arm": "flat_full_history", "status": "stopped",
            "session_index": 10, "session_id": "comparison_s10", "prior_finalized_sessions": 9,
            "turns": deepcopy(self.accepted[45:49]), "finished_at": "original-stop",
            "error": {"type": "IntegrationAbort", "details": {"http_status": 402}}})
        self.ledger.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n"
                                       for row in self.accepted), encoding="utf-8")
        self.recovery_path.unlink(missing_ok=True)

    def bootstrap(self, *args, **kwargs):
        self.events.append("bootstrap")
        self.assertEqual(args[5], {"run_id": RUN_ID, "arm": "flat_full_history", "session_index": 10, "turn_id": "s10t05"})
        return None, self.builder, self.run_logger, self.runner

    def authorize(self, order):
        item = self.schedule[order - 1]
        self.write_json(self.runtime / "active-execution.json", {**item, "launch_id": self.launch_id})
        self.write_json(self.runtime / "launch.json", {"launch_id": self.launch_id})
        (self.runtime / "STOP").unlink(missing_ok=True)
        return self.runtime / item["run_id"] / "sessions" / f"session_{item['session_index']:02d}/session.json"

    def assert_policy(self, result):
        self.assertEqual(result["transport_amendment"], {
            "continuation": "resume-07", "policy": "bounded_transient_retry_v2",
            "policy_source_continuation": "resume-06", "max_attempts": 3,
            "timeout_retry_delays_seconds": [30, 60], "rate_limit_retry_delays_seconds": [60, 120],
            "honor_retry_after": True, "maximum_retry_wait_seconds": 300,
            "continuation_manifest_sha256": self.digest(self.here / "manifest.json"),
        })

    def test_full49_history_is_exact_and_only_fiftieth_reply_is_appended_once(self):
        result = finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.assertEqual(result["status"], "completed")
        self.runner.ordinary.assert_called_once_with(prompt=self.failed_prompt, temperature=None, max_tokens=None, thinking_budget=None)
        self.assertTrue(self.ledger.read_bytes().startswith(self.original_ledger))
        saved = self.read_jsonl(self.ledger)
        self.assertEqual(saved[:49], self.accepted)
        self.assertEqual(len(saved), 50)
        self.assertEqual((saved[-1]["turn_index"], saved[-1]["turn_id"], saved[-1]["session_index"]), (50, "s10t05", 10))
        self.assertEqual(saved[-1]["history_turns_in_prompt"], 49)
        self.assertEqual(result["turns"], saved[45:50])
        history = self.failed_prompt.split("<ARM_CONTEXT>\n", 1)[1].split("</ARM_CONTEXT>", 1)[0]
        prior = [json.loads(line) for line in history.splitlines()[1:]]
        self.assertEqual(len(prior), 49)
        self.assertEqual([row["patient"] for row in prior], [row["patient_text"] for row in self.accepted])
        self.assertEqual(result["finalization"], {"status": "baseline_closed", "total_turns": 50,
                          "history_turns_retained": 50, "structured_memory_calls": 0})
        self.assertEqual(result["state_files_at_close"], {})
        self.assertEqual(result["recovery"]["original_stopped_receipt_sha256"], self.original_receipt_hash)
        proof = self.read_json(self.recovery_path)
        self.assertEqual((proof["preserved_run_turns"], proof["preserved_turns"]), (49, 4))
        self.assertEqual(proof["prior_failed_native_record_id"], "original-402-native")
        self.assertEqual(proof["prompt_sha256"], hashlib.sha256(self.failed_prompt.encode()).hexdigest())
        self.assert_policy(result)
        self.original.append_jsonl.assert_called_once()
        for method in (self.builder._summarize_episode, self.builder._generate_session_reflection, self.builder._generate_factual_memory):
            method.assert_not_called()
        self.assertFalse((self.run_dir / "probe-outcomes.json").exists())
        self.builder.SUMMARY_EXECUTOR.shutdown.assert_called_once_with(wait=True, cancel_futures=True)
        with self.assertRaisesRegex(RuntimeError, "flat checkpoint changed"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.assertEqual(self.read_jsonl(self.ledger), saved)
        self.runner.ordinary.assert_called_once()

    def test_changed_prompt_or_truncated_history_cannot_generate(self):
        for change in ("space", "missing_old_pair"):
            with self.subTest(change=change):
                self.write_checkpoint()
                self.runner = StubRunner()
                if change == "space":
                    manager = patch.object(self.worker, "render_prompt", return_value=self.failed_prompt + " ")
                else:
                    truncated = self.contract.render_flat_history(self.accepted[:48], run_id=RUN_ID, expected_prior_turns=48)
                    manager = patch.object(self.worker, "flat_context_from_ledger", return_value=truncated)
                with manager, self.assertRaisesRegex(RuntimeError, "prompt differs"):
                    finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
                self.runner.ordinary.assert_not_called()
                self.assertEqual(self.ledger.read_bytes(), self.original_ledger)
                self.assertFalse(self.recovery_path.exists())
                self.assertEqual(self.read_json(self.receipt)["turns"], self.accepted[45:49])
        self.builder.generate_response.assert_not_called()
        self.original.append_jsonl.assert_not_called()

    def test_checkpoint_and_pending_request_identity_or_settings_fail_closed(self):
        for change in ("receipt", "count", "session", "prior_sessions", "stage", "turn", "request_session", "settings"):
            with self.subTest(change=change):
                self.write_checkpoint()
                audit = deepcopy(self.audit)
                receipt = self.read_json(self.receipt)
                if change == "receipt": receipt["turns"][0]["patient_text"] += " changed"
                elif change == "count": self.ledger.write_text("\n".join(self.ledger.read_text().splitlines()[:-1]) + "\n")
                elif change == "session": receipt["session_id"] = "comparison_s09"
                elif change == "prior_sessions": receipt["prior_finalized_sessions"] = 8
                elif change == "stage": audit["failed_request"]["stage"] = "classify_topic_and_emotion"
                elif change == "turn": audit["failed_request"]["turn_id"] = "s10t04"
                elif change == "request_session": audit["failed_request"]["session_index"] = 9
                elif change == "settings": audit["failed_request"]["graph_requested_config"]["temperature"] = 0.7
                self.write_json(self.receipt, receipt)
                with self.assertRaises(RuntimeError):
                    finish_coroutine(self.worker.resume_flat(self.runtime, audit))
                self.original.bootstrap_runtime.assert_not_called()
                self.runner.ordinary.assert_not_called()
                self.original.append_jsonl.assert_not_called()

    def test_structured_api_and_preexisting_memory_are_rejected(self):
        api = types.SimpleNamespace(send_message=Mock(), end_session=Mock())
        self.original.bootstrap_runtime.side_effect = None
        self.original.bootstrap_runtime.return_value = (api, self.builder, self.run_logger, self.runner)
        with self.assertRaisesRegex(RuntimeError, "structured API"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        api.send_message.assert_not_called()
        api.end_session.assert_not_called()
        self.runner.ordinary.assert_not_called()
        self.assertEqual(self.ledger.read_bytes(), self.original_ledger)
        self.write_checkpoint()
        self.original.bootstrap_runtime.reset_mock()
        memory = self.run_dir / "memory/forbidden.jsonl"
        memory.parent.mkdir()
        memory.write_text('{}\n')
        with self.assertRaisesRegex(RuntimeError, "found structured memory"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.original.bootstrap_runtime.assert_not_called()

    def test_actual_invocation_gate_and_offline_fixture_never_escape_contract(self):
        for changed in ({"prompt": self.failed_prompt + " "}, {"temperature": 0.7}, {"max_tokens": 4096}, {"thinking_budget": 1024}):
            with self.subTest(changed=changed):
                runner = StubRunner()
                progress = self.worker.install_pending_generation(runner, self.audit["failed_request"])
                options = {"prompt": self.failed_prompt, **changed}
                with self.assertRaises(RecoveryAbort): runner.generate(**options)
                runner.ordinary.assert_not_called()
                self.assertEqual(progress, {"logical_generations": 0})
        runner = StubRunner()
        progress = self.worker.install_pending_generation(runner, self.audit["failed_request"])
        runner.generate(prompt=self.failed_prompt)
        with self.assertRaises(RecoveryAbort): runner.generate(prompt=self.failed_prompt)
        runner.ordinary.assert_called_once()
        self.assertEqual(progress, {"logical_generations": 1})
        result = finish_coroutine(self.worker.resume_flat(self.runtime, self.audit, preflight=True))
        self.assertEqual((result["status"], result["inference_mode"], result["live_requests"]),
                         ("offline_preflight_passed", "offline_stub", 0))
        self.assertIsInstance(self.original.bootstrap_runtime.call_args.kwargs["offline_model"], self.worker.NoLiveModel)
        self.assertIn("not model evidence", result["turns"][-1]["patient_text"])
        self.runner.ordinary.assert_not_called()
        with self.assertRaises(AssertionError): self.worker.NoLiveModel().generate_content("must not call provider")

    def test_credit402_propagates_once_without_acceptance_or_automatic_replay(self):
        error = CreditError("Offline explicit credit error")
        self.runner.ordinary.side_effect = error
        with self.assertRaises(CreditError) as caught:
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.assertIs(caught.exception, error)
        self.runner.ordinary.assert_called_once()
        self.assertEqual(self.ledger.read_bytes(), self.original_ledger)
        self.original.append_jsonl.assert_not_called()
        receipt = self.read_json(self.receipt)
        self.assertEqual(receipt["status"], "stopped")
        self.assertEqual(receipt["turns"], self.accepted[45:49])
        self.assertEqual(receipt["recovery"]["original_error"]["details"]["http_status"], 402)
        self.assert_policy(receipt)
        self.original.stop_campaign.assert_called_once()
        with self.assertRaisesRegex(RuntimeError, "already attempted"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.runner.ordinary.assert_called_once()

    def test_application_failure_preserves_identity_reply_and_probe_conventions(self):
        self.accepted[45]["application_guard_failure"] = True
        self.write_checkpoint()
        before = self.ledger.read_bytes()
        self.write_json(self.run_dir / "probe-outcomes.json", {"outcomes": [{"turn_id": "s10t01", "status": "application_failure"}]})
        self.runner.ordinary.return_value = next(iter(self.original.FALLBACKS))
        result = finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.assertTrue(self.ledger.read_bytes().startswith(before))
        self.assertEqual(result["turns"][0], self.accepted[45])
        self.assertTrue(result["turns"][-1]["application_guard_failure"])
        self.assertEqual(result["turns"][-1]["patient_text"], self.runner.ordinary.return_value)
        self.assertEqual(self.read_json(self.run_dir / "probe-outcomes.json"), {"outcomes": [
            {"turn_id": "s10t01", "status": "application_failure"}, {"turn_id": "s10t05", "status": "application_failure"}]})

    def test_future_orders_install_unchanged_policy_before_delegate_even_on_error(self):
        for order, fail in ((291, False), (330, False), (291, True)):
            with self.subTest(order=order, fail=fail):
                receipt = self.authorize(order)
                self.events.clear()
                self.retry.install_retry_policy.reset_mock()
                self.original.live_worker.reset_mock()
                failure = CreditError("Offline future credit failure")
                def delegate(given_order, given_launch):
                    self.assertEqual(self.events, ["verify", "prefix", "install"])
                    self.assertEqual((given_order, given_launch), (order, self.launch_id))
                    self.events.append("delegate")
                    result = {"status": "stopped" if fail else "completed", "run_id": self.schedule[order - 1]["run_id"]}
                    self.write_json(receipt, result)
                    if fail: raise failure
                    return result
                self.original.live_worker.side_effect = delegate
                if fail:
                    with self.assertRaises(CreditError) as caught: self.worker.run_worker(order, self.launch_id)
                    self.assertIs(caught.exception, failure)
                else: self.assertEqual(self.worker.run_worker(order, self.launch_id)["status"], "completed")
                self.assertEqual(self.events, ["verify", "prefix", "install", "delegate"])
                self.retry.install_retry_policy.assert_called_once_with(self.runtime)
                self.original.live_worker.assert_called_once_with(order, self.launch_id)
                self.assert_policy(self.read_json(receipt))
        self.original.bootstrap_runtime.assert_not_called()

    def test_invalid_order_active_launch_and_stop_prevent_installation(self):
        for change in ("below", "above", "none", "bool", "float", "active", "extra_active", "argument_launch", "stored_launch", "stop"):
            with self.subTest(change=change):
                self.authorize(291)
                order, launch = 291, self.launch_id
                if change == "below": order = 289
                elif change == "above": order = 331
                elif change == "none": order = None
                elif change == "bool": order = True
                elif change == "float": order = 290.0
                elif change == "active": self.write_json(self.runtime / "active-execution.json", {**self.schedule[289], "launch_id": launch})
                elif change == "extra_active": self.write_json(self.runtime / "active-execution.json", {**self.schedule[290], "launch_id": launch, "extra": True})
                elif change == "argument_launch": launch = "different-launch"
                elif change == "stored_launch": self.write_json(self.runtime / "launch.json", {"launch_id": "different-launch"})
                elif change == "stop": (self.runtime / "STOP").write_text("operator stop")
                with self.assertRaises(RuntimeError): self.worker.run_worker(order, launch)
                self.retry.install_retry_policy.assert_not_called()
                self.original.live_worker.assert_not_called()
                self.original.bootstrap_runtime.assert_not_called()

    def test_order290_routes_to_only_pending_reply_after_policy_install(self):
        self.authorize(290)
        result = self.worker.run_worker(290, self.launch_id)
        self.assertEqual(self.events, ["verify", "prefix", "install", "bootstrap"])
        self.assertEqual(result["status"], "completed")
        self.assertEqual(len(self.read_jsonl(self.ledger)), 50)
        self.assertTrue(self.ledger.read_bytes().startswith(self.original_ledger))
        self.retry.install_retry_policy.assert_called_once_with(self.runtime)
        self.original.live_worker.assert_not_called()
        self.runner.ordinary.assert_called_once()
        self.assert_policy(self.read_json(self.receipt))


if __name__ == "__main__":
    unittest.main()
