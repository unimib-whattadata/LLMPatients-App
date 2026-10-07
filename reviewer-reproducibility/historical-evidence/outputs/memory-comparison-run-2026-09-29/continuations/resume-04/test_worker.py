"""Offline contract tests for resume-04; no native runtime or provider imports."""
from __future__ import annotations

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
RUN_ID = "juanita_delgado_001__r02__flat_full_history"


def finish_coroutine(coroutine):
    """The recovery coroutine contains no awaits; run it without an event loop."""
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    finally:
        coroutine.close()
    raise AssertionError("Unexpected asynchronous work in the mocked recovery")


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="resume04-worker-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.here = self.root / "continuations/resume-04"
        self.runtime = self.root / "runtime"
        self.run_dir = self.runtime / RUN_ID
        self.session_dir = self.run_dir / "sessions/session_01"
        self.receipt = self.session_dir / "session.json"
        self.ledger = self.run_dir / "accepted-turns.jsonl"
        self.events = []
        self.launch_id = "offline-authorized-launch"
        self.config = {"arm": "flat_full_history", "case_path": "case.txt", "scenario_path": "scenario.json"}
        self.case = "Synthetic fixture: caffè e una pausa.\n"
        self.turns = [{"turn_id": f"juanita:S01:T{i:02d}", "text": f"Fixture question {i}?"} for i in range(1, 6)]
        self.accepted = [
            {"run_id": RUN_ID, "status": "accepted", "turn_index": i, "session_index": 1,
             "turn_id": self.turns[i - 1]["turn_id"], "therapist_text": self.turns[i - 1]["text"],
             "patient_text": f"Previously accepted reply {i}.", "application_guard_failure": False,
             "prompt": f"Earlier frozen prompt {i}", "timestamp": f"offline-{i}"}
            for i in range(1, 5)
        ]
        self.write_json(self.receipt, {"run_id": RUN_ID, "status": "stopped", "turns": self.accepted,
                                      "finished_at": "original-stop", "error": {"type": "TimeoutError"}})
        self.ledger.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in self.accepted))
        self.original_ledger = self.ledger.read_bytes()
        self.original_receipt_digest = self.digest(self.receipt)
        self.write_json(self.here / "manifest.json", {"fixture": "offline only"})
        (self.root / "generation").mkdir()
        (self.root / "generation/case.txt").write_text(self.case)
        self.write_json(self.root / "generation/scenario.json", {"sessions": [{"turns": self.turns}]})
        self.schedule = [{"execution_order": order, "run_id": f"future_{order:03d}", "session_index": 2}
                         for order in range(1, 331)]
        self.schedule[9] = {"execution_order": 10, "run_id": RUN_ID, "session_index": 1}
        self.write_json(self.root / "generation/schedule.json", {"session_executions": self.schedule})

        self.original = types.ModuleType("paired_runner")
        self.original.load_run = Mock(return_value=self.config)
        self.original.read_json = self.read_json
        self.original.read_jsonl = self.read_jsonl
        self.original.write_json = Mock(side_effect=self.write_json)
        self.original.append_jsonl = Mock(side_effect=self.append_jsonl)
        self.original.digest = self.digest
        self.original.now = Mock(return_value="2026-09-29T12:00:00+00:00")
        self.original.FALLBACKS = {"Forbidden fallback fixture"}
        self.original.stop_campaign = Mock()
        self.original.live_worker = Mock()
        self.runner = types.SimpleNamespace(generate=Mock(return_value="Recovered fifth reply."), check=Mock(), abort=Mock())
        self.builder = types.SimpleNamespace(
            State=lambda **kwargs: types.SimpleNamespace(**kwargs, safe_user_input=None, safety_flags=[]),
            sanitize_user_input=Mock(side_effect=lambda state: setattr(state, "safe_user_input", state.user_input)),
            generate_response=Mock(side_effect=lambda state: {"response": self.runner.generate(state.prompt)}),
            SUMMARY_EXECUTOR=types.SimpleNamespace(shutdown=Mock()),
            _summarize_episode=Mock(side_effect=AssertionError("No baseline memory calls")),
            _generate_session_reflection=Mock(side_effect=AssertionError("No baseline memory calls")),
            _generate_long_term_summary_from_reflection=Mock(side_effect=AssertionError("No baseline memory calls")),
        )
        self.run_logger = Mock()
        self.original.bootstrap_runtime = Mock(side_effect=self.bootstrap)
        self.contract = types.ModuleType("prompt_contract")
        self.contract.flat_context_from_ledger = Mock(side_effect=self.flat_context)
        self.contract.render_prompt = Mock(side_effect=self.render_prompt)
        self.continuation = types.ModuleType("continue_run")
        self.continuation.verify = Mock(side_effect=lambda: self.events.append("verify"))
        self.continuation.verify_preserved_prefix = Mock(side_effect=lambda: self.events.append("prefix"))
        self.retry = types.ModuleType("timeout_retries")
        self.retry.install_retry_policy = Mock(side_effect=lambda runtime: self.events.append("install"))
        modules = {"paired_runner": self.original, "prompt_contract": self.contract,
                   "continue_run": self.continuation, "timeout_retries": self.retry}
        self.addCleanup(patch.stopall)
        patch.dict(sys.modules, modules).start()
        for target in ("socket.socket", "socket.create_connection", "subprocess.Popen", "os.system"):
            patch(target, side_effect=AssertionError("Offline test cannot create a socket or process")).start()
        with patch.object(sys, "path", list(sys.path)):
            spec = importlib.util.spec_from_file_location("resume04_worker_under_test", WORKER_PATH)
            self.worker = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.worker)
        self.worker.HERE, self.worker.ORIGINAL = self.here, self.root
        patch.object(self.worker.asyncio, "run", side_effect=finish_coroutine).start()
        self.failed_prompt = self.render_prompt(case_block=self.case,
            arm_context=self.flat_context(self.ledger, run_id=RUN_ID, expected_prior_turns=4),
            latest_question=self.turns[4]["text"])
        self.audit = {"failed_request": {"prompt": self.failed_prompt, "logical_id": "prior-failed-request",
                                        "graph_requested_config": {"temperature": None, "max_tokens": None, "thinking_budget": None}}}
        self.write_json(self.here / "checkpoint-audit.json", self.audit)

    @staticmethod
    def read_json(path):
        return json.loads(Path(path).read_text())

    @staticmethod
    def read_jsonl(path):
        return [json.loads(line) for line in Path(path).read_text().splitlines() if line]

    @staticmethod
    def write_json(path, value):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False) + "\n")

    @staticmethod
    def append_jsonl(path, value):
        with Path(path).open("a") as handle:
            handle.write(json.dumps(value, ensure_ascii=False) + "\n")

    @staticmethod
    def digest(path):
        return hashlib.sha256(Path(path).read_bytes()).hexdigest()

    def flat_context(self, path, *, run_id, expected_prior_turns):
        rows = self.read_jsonl(path)
        self.assertEqual(run_id, RUN_ID)
        self.assertEqual(len(rows), expected_prior_turns)
        return "\n".join(f"Therapist: {row['therapist_text']}\nPatient: {row['patient_text']}" for row in rows)

    @staticmethod
    def render_prompt(*, case_block, arm_context, latest_question):
        return f"Case:\n{case_block}\nHistory:\n{arm_context}\nTherapist: {latest_question}\nPatient:"

    def bootstrap(self, *args, **kwargs):
        self.events.append("bootstrap")
        self.assertIsNone(kwargs["offline_model"])
        return None, self.builder, self.run_logger, self.runner

    def authorize(self, order):
        self.write_json(self.runtime / "active-execution.json", {**self.schedule[order - 1], "launch_id": self.launch_id})
        self.write_json(self.runtime / "launch.json", {"launch_id": self.launch_id})
        (self.runtime / "STOP").unlink(missing_ok=True)
        expected = self.schedule[order - 1]
        return self.runtime / expected["run_id"] / "sessions" / f"session_{expected['session_index']:02d}/session.json"

    def assert_policy(self, receipt):
        policy = receipt["transport_amendment"]
        self.assertEqual(policy["continuation"], "resume-04")
        self.assertEqual(policy["policy"], "bounded_timeout_retry_v1")
        self.assertEqual(policy["max_attempts"], 3)
        self.assertEqual(policy["retry_delays_seconds"], [30, 60])
        self.assertEqual(policy["continuation_manifest_sha256"], self.digest(self.here / "manifest.json"))

    def test_recovery_preserves_four_exact_prompt_and_writes_fifth_once(self):
        result = finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        saved = self.read_jsonl(self.ledger)
        self.assertTrue(self.ledger.read_bytes().startswith(self.original_ledger))
        self.assertEqual(saved[:4], self.accepted)
        self.assertEqual(len(saved), 5)
        self.assertEqual(result["turns"], saved)
        self.assertEqual(result["status"], "completed")
        self.runner.generate.assert_called_once_with(self.failed_prompt)
        self.assertEqual(saved[4]["prompt"].encode("utf-8"), self.failed_prompt.encode("utf-8"))
        self.assertEqual(saved[4]["history_turns_in_prompt"], 4)
        self.original.append_jsonl.assert_called_once()
        self.assertEqual(result["recovery"]["original_stopped_receipt_sha256"], self.original_receipt_digest)
        self.assertEqual(result["recovery"]["original_error"], {"type": "TimeoutError"})
        self.assert_policy(result)
        self.assertEqual(result["finalization"]["structured_memory_calls"], 0)
        self.assertEqual(result["memory_status"], "not_applicable")
        self.run_logger.assert_not_called()
        for name in ("_summarize_episode", "_generate_session_reflection", "_generate_long_term_summary_from_reflection"):
            getattr(self.builder, name).assert_not_called()
        self.assertFalse(list(self.run_dir.glob("memory/*.jsonl")))
        self.assertFalse(list(self.run_dir.glob("runs/*.json")))
        self.builder.SUMMARY_EXECUTOR.shutdown.assert_called_once_with(wait=True, cancel_futures=True)
        with self.assertRaisesRegex(RuntimeError, "four-turn flat checkpoint"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.assertEqual(self.read_jsonl(self.ledger), saved)
        self.runner.generate.assert_called_once()

    def test_changed_prompt_is_rejected_before_generation(self):
        self.contract.render_prompt.side_effect = lambda **kwargs: self.failed_prompt + " "
        with self.assertRaisesRegex(RuntimeError, "prompt differs"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.assertEqual(self.ledger.read_bytes(), self.original_ledger)
        self.builder.generate_response.assert_not_called()
        self.runner.generate.assert_not_called()
        self.original.append_jsonl.assert_not_called()
        self.assertFalse((self.session_dir / "recovery-resume04.json").exists())
        receipt = self.read_json(self.receipt)
        self.assertEqual(receipt["status"], "stopped")
        self.assertEqual(receipt["turns"], self.accepted)
        self.assert_policy(receipt)
        self.original.stop_campaign.assert_called_once()

    def test_modified_checkpoint_or_generation_settings_cannot_generate(self):
        receipt = self.read_json(self.receipt)
        receipt["turns"][0]["patient_text"] = "Changed accepted content"
        self.write_json(self.receipt, receipt)
        with self.assertRaisesRegex(RuntimeError, "four-turn flat checkpoint"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.original.bootstrap_runtime.assert_not_called()
        receipt["turns"] = self.accepted
        self.write_json(self.receipt, receipt)
        self.audit["failed_request"]["graph_requested_config"]["temperature"] = 0.7
        with self.assertRaisesRegex(RuntimeError, "generation settings"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        self.runner.generate.assert_not_called()
        self.assertEqual(self.ledger.read_bytes(), self.original_ledger)

    def test_flat_recovery_rejects_a_structured_api(self):
        api = types.SimpleNamespace(send_message=Mock(), end_session=Mock())
        self.original.bootstrap_runtime.side_effect = None
        self.original.bootstrap_runtime.return_value = (api, self.builder, self.run_logger, self.runner)
        with self.assertRaisesRegex(RuntimeError, "structured API"):
            finish_coroutine(self.worker.resume_flat(self.runtime, self.audit))
        api.send_message.assert_not_called()
        api.end_session.assert_not_called()
        self.runner.generate.assert_not_called()
        self.assertEqual(self.ledger.read_bytes(), self.original_ledger)

    def test_future_orders_delegate_only_after_retry_installation(self):
        for order in (11, 330):
            with self.subTest(order=order):
                path = self.authorize(order)
                self.events.clear()
                self.retry.install_retry_policy.reset_mock()
                def delegate(given_order, given_launch):
                    self.assertEqual(self.events, ["verify", "prefix", "install"])
                    self.assertEqual((given_order, given_launch), (order, self.launch_id))
                    self.events.append("delegate")
                    result = {"run_id": self.schedule[order - 1]["run_id"], "status": "completed"}
                    self.write_json(path, result)
                    return result
                self.original.live_worker.side_effect = delegate
                result = self.worker.run_worker(order, self.launch_id)
                self.assertEqual(result["status"], "completed")
                self.assertEqual(self.events, ["verify", "prefix", "install", "delegate"])
                self.retry.install_retry_policy.assert_called_once_with(self.runtime)
                self.assert_policy(self.read_json(path))
        self.original.bootstrap_runtime.assert_not_called()

    def test_invalid_order_active_record_launch_and_stop_reject_before_install(self):
        cases = ("below", "above", "none", "bool", "active", "argument_launch", "stored_launch", "stop")
        for case in cases:
            with self.subTest(case=case):
                self.authorize(11)
                order, launch = 11, self.launch_id
                if case == "below": order = 9
                elif case == "above": order = 331
                elif case == "none": order = None
                elif case == "bool": order = True
                elif case == "active": self.write_json(self.runtime / "active-execution.json", {**self.schedule[9], "launch_id": launch})
                elif case == "argument_launch": launch = "unrecognized-launch"
                elif case == "stored_launch": self.write_json(self.runtime / "launch.json", {"launch_id": "unrecognized-launch"})
                elif case == "stop": (self.runtime / "STOP").write_text("operator stop")
                with self.assertRaises(RuntimeError):
                    self.worker.run_worker(order, launch)
                self.retry.install_retry_policy.assert_not_called()
                self.original.live_worker.assert_not_called()
                self.original.bootstrap_runtime.assert_not_called()

    def test_future_error_receipt_is_annotated_and_error_propagates(self):
        path = self.authorize(12)
        def fail(order, launch):
            self.assertEqual(self.events, ["verify", "prefix", "install"])
            self.write_json(path, {"status": "stopped", "error": {"type": "TimeoutError", "details": "offline fixture"}})
            raise TimeoutError("offline fixture")
        self.original.live_worker.side_effect = fail
        with self.assertRaisesRegex(TimeoutError, "offline fixture"):
            self.worker.run_worker(12, self.launch_id)
        receipt = self.read_json(path)
        self.assertEqual(receipt["status"], "stopped")
        self.assertEqual(receipt["error"], {"type": "TimeoutError", "details": "offline fixture"})
        self.assert_policy(receipt)
        self.retry.install_retry_policy.assert_called_once_with(self.runtime)

    def test_order_ten_uses_recovery_after_install_without_future_delegate(self):
        self.authorize(10)
        result = self.worker.run_worker(10, self.launch_id)
        self.assertEqual(self.events, ["verify", "prefix", "install", "bootstrap"])
        self.assertEqual(result["status"], "completed")
        self.assertEqual(len(self.read_jsonl(self.ledger)), 5)
        self.original.live_worker.assert_not_called()
        self.retry.install_retry_policy.assert_called_once_with(self.runtime)
        self.assert_policy(self.read_json(self.receipt))


if __name__ == "__main__":
    unittest.main()
