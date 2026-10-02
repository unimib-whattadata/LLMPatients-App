"""Offline recovery contracts; native modules, providers and processes are stubbed."""
from __future__ import annotations

from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import types
import unicodedata
import unittest
from unittest.mock import Mock, patch


WORKER_PATH = Path(__file__).with_name("worker.py")
CLASSIFIER = "classify_topic_and_emotion"
OTHER_STAGES = ("generate_response", "_summarize_episode", "_generate_session_reflection",
                "_generate_long_term_summary_from_reflection", "_generate_factual_memory")


class RecoveryAbort(RuntimeError):
    pass


class StubRunner:
    def __init__(self):
        self.fatal = None
        self.ordinary = Mock(return_value="Visible mocked provider output")
        self.generate = self.ordinary

    def check(self):
        if self.fatal is not None:
            raise self.fatal

    def abort(self, message, details):
        self.fatal = RecoveryAbort(message)
        self.fatal.details = details
        raise self.fatal


def finish_coroutine(coroutine):
    """Drive only synchronous async stubs; never create an event loop or socket."""
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    finally:
        coroutine.close()
    raise AssertionError("Unexpected asynchronous work in an offline test")


class WorkerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="resume06-worker-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.here = self.root / "continuations/resume-06"
        self.runtime = self.root / "runtime"
        self.events = []
        self.stage = None
        self.launch_id = "offline-authorized-launch"
        self.write_json(self.here / "manifest.json", {"fixture": "offline only"})

        self.original = types.ModuleType("paired_runner")
        self.original.read_json = self.read_json
        self.original.read_jsonl = self.read_jsonl
        self.original.write_json = Mock(side_effect=self.write_json)
        self.original.append_jsonl = Mock(side_effect=self.append_jsonl)
        self.original.digest = self.digest
        self.original.now = Mock(return_value="offline-timestamp")
        self.original.live_worker = Mock()
        self.original.bootstrap_runtime = Mock(side_effect=AssertionError("Native imports are forbidden"))
        self.original.FALLBACKS = {"Forbidden fallback fixture"}
        self.original.stop_campaign = Mock()
        adapter = types.ModuleType("runtime_adapter")
        adapter.current_stage = lambda: self.stage
        self.continuation = types.ModuleType("continue_run")
        self.continuation.verify = Mock(side_effect=lambda: self.events.append("verify"))
        self.continuation.verify_preserved_prefix = Mock(side_effect=lambda: self.events.append("prefix"))
        self.retry = types.ModuleType("timeout_retries")
        self.retry.install_retry_policy = Mock(side_effect=lambda runtime: self.events.append("install"))
        self.start_patch(patch.dict(sys.modules, {
            "paired_runner": self.original, "runtime_adapter": adapter,
            "continue_run": self.continuation, "timeout_retries": self.retry,
        }))
        for target in ("socket.socket", "socket.create_connection", "subprocess.Popen", "os.system"):
            self.start_patch(patch(target, side_effect=AssertionError("Offline test forbids sockets and processes")))
        with patch.object(sys, "path", list(sys.path)):
            spec = importlib.util.spec_from_file_location("resume06_worker_under_test", WORKER_PATH)
            self.worker = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.worker)
        self.worker.HERE, self.worker.ORIGINAL = self.here, self.root
        self.start_patch(patch.object(self.worker.asyncio, "run", side_effect=finish_coroutine))
        self.schedule = [{"execution_order": order, "run_id": f"future_{order:03d}",
                          "session_index": 2, "arm": "flat_full_history"} for order in range(1, 331)]
        self.schedule[89] = {"execution_order": 90, "run_id": self.worker.RUN_ID,
                             "session_index": 3, "arm": "structured_common_profile"}
        self.write_json(self.root / "generation/schedule.json", {"session_executions": self.schedule})
        self.audit = {
            "failed_request": {"stage": CLASSIFIER, "prompt": "Classify: caffè, una pausa.\n",
                               "logical_id": "failed-classifier-logical",
                               "graph_requested_config": {"temperature": 0.0, "max_tokens": 4096,
                                                          "thinking_budget": None}},
            "failed_outcome": {"native_record_id": "failed-classifier-native"},
        }
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

    def install(self, *, preflight=False, audit=None):
        runner = StubRunner()
        evidence = self.root / f"recovery-{len(list(self.root.glob('recovery-*')))}.jsonl"
        evidence.touch()
        progress = self.worker.install_recovery_gate(runner, audit or self.audit, evidence, preflight=preflight)
        return runner, progress, evidence

    def invoke_classifier(self, runner, **overrides):
        request = self.audit["failed_request"]
        self.stage = overrides.pop("stage", CLASSIFIER)
        prompt = overrides.pop("prompt", request["prompt"])
        return runner.generate(prompt, **{**request["graph_requested_config"], **overrides})

    def logger_fixture(self):
        patient = "offline-native-patient"
        therapist = f"comparison_{self.worker.RUN_ID}"
        turns = [{"therapist_input_raw": f"Question {i}: caffè?", "therapist_input_safe": f"Question {i}: caffè?",
                  "patient_response": f"Accepted reply {i}", "total_turns": i} for i in range(1, 15)]
        sessions = [{"ended_at": "prior-close", "session_id": f"comparison_s{i:02d}",
                     "patient_id": patient, "turns": deepcopy(turns[(i - 1) * 5:i * 5])} for i in (1, 2)]
        sessions.append({"session_id": self.worker.SESSION_ID, "patient_id": patient,
                         "turns": deepcopy(turns[10:]), "final_state": {"total_turns": 14}})
        restored = {
            "total_turns": 14, "last_episode_turn": 10, "session_id": self.worker.SESSION_ID,
            "therapist_id": therapist,
            "history": [{"therapist": t["therapist_input_raw"], "patient": t["patient_response"],
                         "topic": {"top": "fixture"}} for t in turns[-5:]],
            "messages": [types.SimpleNamespace(content=value) for t in turns[-5:]
                         for value in (t["therapist_input_safe"], t["patient_response"])],
            "emotion_state": {"SEEKING": 0.6589}, "emotion_intensity": 0.6589,
            "low_salience_streak": 13, "summary": "Prior summary", "session_reflection": "Prior reflection",
        }
        logger = types.SimpleNamespace(data={"sessions": sessions}, current_session_index=None,
                                       restore_state=Mock(return_value=restored), start_run=Mock())
        return (types.SimpleNamespace(session_loggers={}),
                types.SimpleNamespace(RunLogger=Mock(return_value=logger)), logger,
                {"native_api_id": patient, "arm": "structured_common_profile",
                 "case_path": "case.txt", "scenario_path": "scenario.json"})

    def authorize(self, order):
        item = self.schedule[order - 1]
        self.write_json(self.runtime / "active-execution.json", {**item, "launch_id": self.launch_id})
        self.write_json(self.runtime / "launch.json", {"launch_id": self.launch_id})
        (self.runtime / "STOP").unlink(missing_ok=True)
        return self.runtime / item["run_id"] / "sessions" / f"session_{item['session_index']:02d}/session.json"

    def assert_policy(self, result):
        self.assertEqual(result["transport_amendment"], {
            "continuation": "resume-06", "policy": "bounded_transient_retry_v2",
            "policy_source_continuation": "resume-06", "max_attempts": 3,
            "timeout_retry_delays_seconds": [30, 60], "rate_limit_retry_delays_seconds": [60, 120],
            "honor_retry_after": True, "maximum_retry_wait_seconds": 300,
            "continuation_manifest_sha256": self.digest(self.here / "manifest.json"),
        })

    def test_attach_reuses_index_two_and_consumable_post14_state(self):
        api, run_logger, logger, config = self.logger_fixture()
        before = deepcopy(logger.data)
        key = self.worker.attach_open_session(api, run_logger, config)
        self.assertEqual(key, (f"comparison_{self.worker.RUN_ID}", config["native_api_id"], "comparison_s03"))
        self.assertEqual(logger.current_session_index, 2)
        self.assertEqual(set(api.session_loggers[key]), {"logger", "base_state"})
        self.assertIs(api.session_loggers[key]["base_state"], logger.restore_state.return_value)
        state = api.session_loggers[key]["base_state"]
        self.assertEqual((state["total_turns"], state["last_episode_turn"], state["low_salience_streak"]), (14, 10, 13))
        self.assertEqual((len(state["history"]), len(state["messages"])), (5, 10))
        self.assertEqual(logger.data, before)
        run_logger.RunLogger.assert_called_once_with(key[0])
        logger.restore_state.assert_called_once_with(config["native_api_id"])
        logger.start_run.assert_not_called()

    def test_attach_rejects_corrupt_sessions_history_messages_and_existing_entry(self):
        cases = ("missing_session", "prior_open", "current_closed", "turn_count", "patient", "session",
                 "total", "episode", "state_session", "state_therapist", "history", "messages", "registered")
        for case in cases:
            with self.subTest(case=case):
                api, run_logger, logger, config = self.logger_fixture()
                sessions, state = logger.data["sessions"], logger.restore_state.return_value
                if case == "missing_session": sessions.pop()
                elif case == "prior_open": sessions[0].pop("ended_at")
                elif case == "current_closed": sessions[2]["ended_at"] = "already closed"
                elif case == "turn_count": sessions[2]["turns"].pop()
                elif case == "patient": sessions[2]["patient_id"] = "foreign"
                elif case == "session": sessions[2]["session_id"] = "comparison_s02"
                elif case == "total": state["total_turns"] = 13
                elif case == "episode": state["last_episode_turn"] = 14
                elif case == "state_session": state["session_id"] = "comparison_s02"
                elif case == "state_therapist": state["therapist_id"] = "foreign"
                elif case == "history": state["history"][-1]["patient"] += " changed"
                elif case == "messages": state["messages"][0].content += " changed"
                elif case == "registered": api.session_loggers[(state["therapist_id"], config["native_api_id"], self.worker.SESSION_ID)] = {"existing": True}
                before = deepcopy(api.session_loggers)
                with self.assertRaises(RuntimeError):
                    self.worker.attach_open_session(api, run_logger, config)
                self.assertEqual(api.session_loggers, before)
                self.assertIsNone(logger.current_session_index)
                logger.start_run.assert_not_called()

    def test_exact_classifier_records_failed_provenance_and_delegates_unchanged(self):
        before = deepcopy(self.audit)
        runner, progress, evidence = self.install()
        self.assertEqual(self.invoke_classifier(runner), runner.ordinary.return_value)
        runner.ordinary.assert_called_once_with(self.audit["failed_request"]["prompt"], 0.0, 4096, thinking_budget=None)
        self.assertEqual(progress, {"classifier_checked": True})
        rows = self.read_jsonl(evidence)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["event"], "resume_classifier_verified")
        self.assertEqual(rows[0]["prior_logical_id"], "failed-classifier-logical")
        self.assertEqual(rows[0]["prior_native_record_id"], "failed-classifier-native")
        self.assertEqual(rows[0]["prompt_sha256"], self.worker.sha_text(self.audit["failed_request"]["prompt"]))
        self.assertEqual(rows[0]["graph_requested_config"], self.audit["failed_request"]["graph_requested_config"])
        self.assertIs(rows[0]["prompt_identical_to_failed_request"], True)
        self.assertEqual(rows[0]["mode"], "live")
        self.stage = "generate_response"
        runner.generate("New patient prompt", 0.7, 4096, thinking_budget=1024)
        runner.ordinary.assert_called_with("New patient prompt", 0.7, 4096, thinking_budget=1024)
        self.assertEqual(self.read_jsonl(evidence), rows)
        self.assertEqual(self.audit, before)

    def test_initial_prompt_bytes_options_and_stage_mismatches_abort_before_call(self):
        original_prompt = self.audit["failed_request"]["prompt"]
        changes = ({"prompt": original_prompt + " "}, {"prompt": unicodedata.normalize("NFD", original_prompt)},
                   {"temperature": 0.1}, {"max_tokens": 8192}, {"thinking_budget": 1024},
                   {"stage": "generate_response"}, {"stage": "unknown"})
        for changed in changes:
            with self.subTest(changed=changed):
                runner, progress, evidence = self.install()
                with self.assertRaises(RecoveryAbort):
                    self.invoke_classifier(runner, **changed)
                runner.ordinary.assert_not_called()
                self.assertEqual(progress, {"classifier_checked": False})
                self.assertEqual(self.read_jsonl(evidence), [])
                with self.assertRaises(RecoveryAbort):
                    self.invoke_classifier(runner)
                runner.ordinary.assert_not_called()

    def test_repeated_classifier_and_wrong_checkpoint_stage_are_rejected(self):
        runner, progress, evidence = self.install()
        self.invoke_classifier(runner)
        with self.assertRaises(RecoveryAbort):
            self.invoke_classifier(runner)
        self.assertEqual(runner.fatal.details["kind"], "recovery_duplicate_classifier")
        runner.ordinary.assert_called_once()
        self.assertEqual(len(self.read_jsonl(evidence)), 1)
        wrong = deepcopy(self.audit)
        wrong["failed_request"]["stage"] = "generate_response"
        unused = StubRunner()
        with self.assertRaisesRegex(RuntimeError, "failed classifier"):
            self.worker.install_recovery_gate(unused, wrong, self.root / "unused.jsonl")
        unused.ordinary.assert_not_called()
        self.assertFalse((self.root / "unused.jsonl").exists())

    def test_all_offline_generation_fixtures_never_call_underlying_runner(self):
        runner, progress, evidence = self.install(preflight=True)
        self.assertEqual(json.loads(self.invoke_classifier(runner))["emotion_label"], "SEEKING")
        for stage in OTHER_STAGES:
            self.stage = stage
            value = runner.generate("Offline stage fixture")
            if stage == "_generate_factual_memory": self.assertEqual(json.loads(value), {"facts": []})
            else: self.assertIn("not model evidence", value)
        self.stage = "unexpected_stage"
        with self.assertRaisesRegex(AssertionError, "Unexpected offline"):
            runner.generate("must not leave offline boundary")
        with self.assertRaises(AssertionError):
            self.worker.NoLiveModel().generate_content("forbidden")
        runner.ordinary.assert_not_called()
        self.original.bootstrap_runtime.assert_not_called()
        self.assertEqual(progress, {"classifier_checked": True})
        self.assertEqual(self.read_jsonl(evidence)[0]["mode"], "offline_preflight")

    def test_future_orders_install_policy_before_delegate_and_annotate_errors(self):
        for order, fail in ((91, False), (330, False), (91, True)):
            with self.subTest(order=order, fail=fail):
                receipt = self.authorize(order)
                self.events.clear()
                self.retry.install_retry_policy.reset_mock()
                self.original.live_worker.reset_mock()
                failure = RuntimeError("offline delegated failure")
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
                    with self.assertRaises(RuntimeError) as caught:
                        self.worker.run_worker(order, self.launch_id)
                    self.assertIs(caught.exception, failure)
                else:
                    self.assertEqual(self.worker.run_worker(order, self.launch_id)["status"], "completed")
                self.assertEqual(self.events, ["verify", "prefix", "install", "delegate"])
                self.retry.install_retry_policy.assert_called_once_with(self.runtime)
                self.original.live_worker.assert_called_once_with(order, self.launch_id)
                self.assert_policy(self.read_json(receipt))
        self.original.bootstrap_runtime.assert_not_called()

    def test_invalid_orders_active_launch_and_stop_prevent_policy_install(self):
        cases = ("below", "above", "none", "bool", "float", "active", "extra_active", "argument_launch", "stored_launch", "stop")
        for case in cases:
            with self.subTest(case=case):
                self.authorize(91)
                order, launch = 91, self.launch_id
                if case == "below": order = 89
                elif case == "above": order = 331
                elif case == "none": order = None
                elif case == "bool": order = True
                elif case == "float": order = 90.0
                elif case == "active": self.write_json(self.runtime / "active-execution.json", {**self.schedule[89], "launch_id": launch})
                elif case == "extra_active": self.write_json(self.runtime / "active-execution.json", {**self.schedule[90], "launch_id": launch, "unapproved": True})
                elif case == "argument_launch": launch = "foreign-launch"
                elif case == "stored_launch": self.write_json(self.runtime / "launch.json", {"launch_id": "foreign-launch"})
                elif case == "stop": (self.runtime / "STOP").write_text("operator stop", encoding="utf-8")
                with self.assertRaises(RuntimeError):
                    self.worker.run_worker(order, launch)
                self.retry.install_retry_policy.assert_not_called()
                self.original.live_worker.assert_not_called()
                self.original.bootstrap_runtime.assert_not_called()

    def test_order90_routes_to_pending_turn_after_policy_install(self):
        receipt = self.authorize(90)
        async def recovery(runtime, audit):
            self.assertEqual(self.events, ["verify", "prefix", "install"])
            self.assertEqual((runtime, audit), (self.runtime, self.audit))
            self.events.append("recovery")
            result = {"status": "completed", "run_id": self.worker.RUN_ID}
            self.write_json(receipt, result)
            return result
        with patch.object(self.worker, "resume_turn", side_effect=recovery) as recover:
            result = self.worker.run_worker(90, self.launch_id)
            recover.assert_called_once_with(self.runtime, self.audit)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(self.events, ["verify", "prefix", "install", "recovery"])
        self.retry.install_retry_policy.assert_called_once_with(self.runtime)
        self.original.live_worker.assert_not_called()
        self.original.bootstrap_runtime.assert_not_called()
        self.assert_policy(self.read_json(receipt))

    def test_mocked_recovery_preserves14_turn_bytes_and_appends_only_fifth_once(self):
        api, run_logger, logger, config = self.logger_fixture()
        runner = StubRunner()
        run_dir = self.runtime / self.worker.RUN_ID
        session_dir = run_dir / "sessions/session_03"
        receipt, ledger = session_dir / "session.json", run_dir / "accepted-turns.jsonl"
        native_turns = [t for session in logger.data["sessions"] for t in session["turns"]]
        accepted = [{"run_id": self.worker.RUN_ID, "status": "accepted", "turn_index": i,
                     "session_index": (i - 1) // 5 + 1, "turn_id": f"s{(i - 1) // 5 + 1:02d}t{(i - 1) % 5 + 1:02d}",
                     "therapist_text": t["therapist_input_raw"], "patient_text": t["patient_response"],
                     "application_guard_failure": False} for i, t in enumerate(native_turns, 1)]
        self.write_json(receipt, {"run_id": self.worker.RUN_ID, "status": "stopped", "turns": accepted[10:],
                                  "error": {"type": "OriginalInBandError"}, "finished_at": "original-stop"})
        ledger.write_text("".join(json.dumps(t, ensure_ascii=False, separators=(",", ":")) + "\n" for t in accepted), encoding="utf-8")
        before = ledger.read_bytes()
        case = "Synthetic fixture: caffè.\n"
        (self.root / "generation/case.txt").write_text(case, encoding="utf-8")
        turns = [{"turn_id": f"s03t{i:02d}", "text": f"New fixture question {i}?"} for i in range(1, 6)]
        self.write_json(self.root / "generation/scenario.json", {"sessions": [{}, {}, {"turns": turns}]})
        self.original.load_run = Mock(return_value=config)
        patient, therapist = config["native_api_id"], f"comparison_{self.worker.RUN_ID}"
        native_path = run_dir / "runs" / f"{therapist}.json"
        self.write_json(native_path, logger.data)
        memory_path = run_dir / "memory/fixture.jsonl"
        memory_path.parent.mkdir()
        memory_path.touch()
        memory = [{"type": "conversation_turn", "session_id": self.worker.SESSION_ID, "turn_index": i} for i in range(11, 15)]
        builder = types.SimpleNamespace(
            MEMORY_STORE=types.SimpleNamespace(iter_records=lambda *_: deepcopy(memory), file_path=lambda *_: memory_path),
            SUMMARY_EXECUTOR=types.SimpleNamespace(shutdown=Mock()),
            load_long_term_summary=Mock(return_value="fixture summary"),
            load_latest_session_reflection=Mock(return_value="fixture reflection"),
        )
        api.MessageRequest = api.SessionEndRequest = lambda **kw: types.SimpleNamespace(**kw)
        context = None
        def bootstrap(*args, **kwargs):
            nonlocal context
            context = args[5]
            self.assertIsInstance(kwargs["offline_model"], self.worker.NoLiveModel)
            return api, builder, run_logger, runner
        self.original.bootstrap_runtime.side_effect = bootstrap
        async def send_message(request):
            self.assertEqual((request.external_patient_id, request.therapist_id, request.session_id, request.step_id),
                             (patient, therapist, self.worker.SESSION_ID, 3))
            self.assertEqual(request.user_message, turns[4]["text"])
            self.assertEqual(context["turn_id"], "s03t05")
            key = (therapist, patient, self.worker.SESSION_ID)
            entry = api.session_loggers[key]
            self.assertIs(entry["base_state"], logger.restore_state.return_value)
            self.assertEqual(entry["base_state"]["total_turns"], 14)
            entry["base_state"] = None
            self.invoke_classifier(runner)
            self.stage = "generate_response"
            reply = runner.generate("<CASE>\n" + case + "</CASE>")
            entry["latest_state"] = {"total_turns": 15, "prompt": "<CASE>\n" + case + "</CASE>",
                                     "safe_user_input": request.user_message, "safety_flags": []}
            logger.data["sessions"][2]["turns"].append({"therapist_input_raw": request.user_message, "patient_response": reply})
            memory.append({"type": "conversation_turn", "session_id": self.worker.SESSION_ID, "turn_index": 15})
            return types.SimpleNamespace(message=reply, model_dump=lambda **_: {"message": reply})
        api.send_message = Mock(side_effect=send_message)
        def episodes(*args):
            self.assertIsNone(context["turn_id"])
            self.stage = "_summarize_episode"
            runner.generate("Offline episode")
        self.original.wait_for_episodes = Mock(side_effect=episodes)
        async def end_session(request):
            self.assertIsNone(context["turn_id"])
            self.assertEqual((request.external_patient_id, request.therapist_id, request.session_id),
                             (patient, therapist, self.worker.SESSION_ID))
            for stage in OTHER_STAGES[2:]:
                self.stage = stage
                runner.generate("Offline finalization")
            api.session_loggers.pop((therapist, patient, self.worker.SESSION_ID))
            logger.data["sessions"][2].update(ended_at="offline-close", final_state={"total_turns": 15})
            return types.SimpleNamespace(status="finalized", model_dump=lambda **_: {"status": "finalized"})
        api.end_session = Mock(side_effect=end_session)
        self.original.native_ledger = Mock(side_effect=lambda *_: logger.data["sessions"])
        self.original.compare_native_prefix = Mock()
        self.original.consolidation_evidence = Mock(return_value={"memory_status": "complete"})

        result = finish_coroutine(self.worker.resume_turn(self.runtime, self.audit, preflight=True))
        self.assertEqual(result["status"], "offline_preflight_passed")
        self.assertEqual(result["live_requests"], 0)
        self.assertTrue(ledger.read_bytes().startswith(before))
        saved = self.read_jsonl(ledger)
        self.assertEqual(saved[:14], accepted)
        self.assertEqual(len(saved), 15)
        self.assertEqual((saved[-1]["turn_id"], saved[-1]["turn_index"]), ("s03t05", 15))
        self.assertEqual(result["turns"], saved[10:])
        self.assertEqual(len([c for c in self.original.append_jsonl.call_args_list if Path(c.args[0]) == ledger]), 1)
        api.send_message.assert_called_once()
        api.end_session.assert_called_once()
        runner.ordinary.assert_not_called()
        logger.start_run.assert_not_called()
        builder.SUMMARY_EXECUTOR.shutdown.assert_called_once_with(wait=True, cancel_futures=True)
        self.assertIs(result["recovery"]["process_rng_reinitialized"], True)
        self.assertIs(result["recovery"]["affect_update_recomputed"], False)
        self.assert_policy(result)
        self.original.stop_campaign.assert_not_called()
        with self.assertRaisesRegex(RuntimeError, "Partial receipt changed"):
            finish_coroutine(self.worker.resume_turn(self.runtime, self.audit, preflight=True))
        self.assertEqual(self.read_jsonl(ledger), saved)
        api.send_message.assert_called_once()
        api.end_session.assert_called_once()


if __name__ == "__main__":
    unittest.main()
