"""Offline regression tests. No real credentials or API calls are permitted."""
from __future__ import annotations

import asyncio
import json
import os
import socket
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "source"))
sys.path.insert(0, str(HERE.parent / "scripts"))
from vertexai.generative_models import GenerationResponse
from openrouter_transport import OpenRouterHTTPError
from openrouter_inband_errors import OpenRouterInBandError
from runtime_adapter import SerialGate, create_runner, wait_for_episodes
import run_integration as harness
from scenario_definition import build_scenario


class NoWaitGate:
    @contextmanager
    def request(self, check):
        check()
        yield


def sdk_response(text="A completed response.", finish="STOP"):
    return GenerationResponse.from_dict({"candidates": [{"content": {"role": "model",
        "parts": [{"text": text}] if text else []}, "finish_reason": finish}],
        "usage_metadata": {"prompt_token_count": 100, "candidates_token_count": 10,
                           "thoughts_token_count": 20, "total_token_count": 130},
        "model_version": "gemini-2.5-pro", "response_id": "offline-test-response"})


class QueueModel:
    def __init__(self, *responses):
        self.responses, self.calls = list(responses), []

    def generate_content(self, prompt, **kwargs):
        self.calls.append({"prompt": prompt, **kwargs})
        result = self.responses.pop(0)
        if isinstance(result, BaseException):
            raise result
        return result


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        # Tests never read the production key, even accidentally.
        self.env = patch.dict(os.environ, {"OPENROUTER_API_KEY_FILE": str(self.root / "ABSENT_FAKE_KEY")})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("Offline tests forbid networking"))
        self.network.start()
        self.addCleanup(self.network.stop)

    def runner(self, model):
        return create_runner(model=model, events_path=self.root / "events.jsonl", gate=NoWaitGate(),
                             context={"session_index": 1, "turn_id": "s01t01"}, stop_path=self.root / "STOP")

    def events(self):
        return [json.loads(line) for line in (self.root / "events.jsonl").read_text().splitlines()]

    def test_exact_plan_and_gold_separation(self):
        scenario, gold = build_scenario()
        harness.validate_scenario(scenario, gold)
        self.assertEqual(55, sum(len(row["turns"]) for row in scenario["sessions"]))
        self.assertEqual(6, len(gold["probes"]))
        self.assertEqual("persistent_identity", gold["probes"][0]["category"])
        self.assertEqual(1, sum(row["expected"] is None for row in gold["probes"]))
        self.assertNotIn('"expected"', json.dumps(scenario))

    def test_freeze_contains_current_factual_runtime_and_no_config(self):
        manifest = harness.verify()
        files = manifest["files"]
        self.assertIn("integration/source/agent/core/factual_memory.py", files)
        self.assertIn("integration/source/agent/core/langgraph_builder.py", files)
        self.assertFalse(any(".env" in name or "/config/" in name or "key.json" in name for name in files))
        self.assertIn("_generate_factual_memory", (HERE / "source/agent/core/langgraph_builder.py").read_text())

    def test_prompt_and_patient_decoding_preserved(self):
        model = QueueModel(sdk_response("I can try that."))
        runner = self.runner(model)
        prompt = "Exact therapist prompt\n Unicode café."
        with patch("runtime_adapter.current_stage", return_value="generate_response"):
            self.assertEqual("I can try that.", runner.generate(prompt))
        call = model.calls[0]
        self.assertEqual(prompt, call["prompt"])
        self.assertEqual({"temperature": .7, "max_output_tokens": 4096, "top_p": .95, "top_k": 40,
                          "stop_sequences": ["\nTherapist:", "Therapist:"],
                          "thinking_config": {"thinking_budget": 1024}}, call["generation_config"])
        self.assertEqual("generate_response", self.events()[0]["stage"])

    def test_fact_and_narrative_memory_stage_budgets(self):
        for stage in ("_generate_factual_memory", "_generate_session_reflection", "_summarize_episode",
                      "_generate_long_term_summary_from_reflection"):
            model = QueueModel(sdk_response('{"facts": []}'))
            runner = self.runner(model)
            with patch("runtime_adapter.current_stage", return_value=stage):
                runner.generate("memory prompt", max_tokens=8192, thinking_budget=1024)
            self.assertEqual(8192, model.calls[0]["generation_config"]["max_output_tokens"])
            self.assertEqual(.2, model.calls[0]["generation_config"]["temperature"])

    def test_classifier_keeps_temperature_zero_with_thinking_budget(self):
        model = QueueModel(sdk_response('{"topic_label":"unknown","emotion_label":"CARE"}'))
        with patch("runtime_adapter.current_stage", return_value="classify_topic_and_emotion"):
            self.runner(model).generate("classify")
        self.assertEqual(0., model.calls[0]["generation_config"]["temperature"])
        self.assertEqual(4096, model.calls[0]["generation_config"]["max_output_tokens"])

    def test_max_tokens_allows_exactly_one_4096_to_8192_recovery(self):
        model = QueueModel(sdk_response("partial text", "MAX_TOKENS"), sdk_response("complete text"))
        with patch("runtime_adapter.current_stage", return_value="generate_response"):
            result = self.runner(model).generate("unchanged prompt")
        self.assertEqual("complete text", result)
        self.assertEqual([4096, 8192], [row["generation_config"]["max_output_tokens"] for row in model.calls])
        self.assertEqual(["unchanged prompt"] * 2, [row["prompt"] for row in model.calls])
        outcomes = [row for row in self.events() if row["event"] == "outcome"]
        self.assertEqual([False, True], [row["accepted"] for row in outcomes])

    def test_repeated_max_tokens_stops_without_graph_retry(self):
        model = QueueModel(sdk_response("partial", "MAX_TOKENS"), sdk_response("partial2", "MAX_TOKENS"))
        runner = self.runner(model)
        with patch("runtime_adapter.current_stage", return_value="generate_response"):
            with self.assertRaises(runner.abort_type):
                runner.generate("same")
            with self.assertRaises(runner.abort_type):
                runner.generate("must not be sent")
        self.assertEqual(2, len(model.calls))

    def test_initial_8192_max_tokens_has_no_recovery(self):
        model = QueueModel(sdk_response("partial extraction", "MAX_TOKENS"))
        runner = self.runner(model)
        with patch("runtime_adapter.current_stage", return_value="_generate_factual_memory"):
            with self.assertRaises(runner.abort_type):
                runner.generate("facts")
        self.assertEqual(1, len(model.calls))

    def test_http_and_inband_errors_stop_and_latch_after_one_request(self):
        for error in (OpenRouterHTTPError("OpenRouter HTTP 429.", status_code=429, record_id="fake429"),
                      OpenRouterInBandError(504)):
            model, runner = None, None
            model = QueueModel(error)
            runner = self.runner(model)
            with patch("runtime_adapter.current_stage", return_value="generate_response"):
                with self.assertRaises(runner.abort_type):
                    runner.generate("first")
                with self.assertRaises(runner.abort_type):
                    runner.generate("forbidden second request")
            self.assertEqual(1, len(model.calls))
            self.assertEqual("provider_error", runner.fatal.details["kind"])

    def test_empty_safety_and_other_finish_stop_without_retry(self):
        for text, finish in (("", "STOP"), ("", "SAFETY"), ("partial", "OTHER")):
            model = QueueModel(sdk_response(text, finish))
            runner = self.runner(model)
            with patch("runtime_adapter.current_stage", return_value="generate_response"):
                with self.assertRaises(runner.abort_type):
                    runner.generate("must not fallback")
            self.assertEqual(1, len(model.calls))

    def test_background_error_barrier_and_latch_propagate(self):
        model = QueueModel(OpenRouterHTTPError("OpenRouter HTTP 503.", status_code=503))
        runner = self.runner(model)
        with ThreadPoolExecutor(max_workers=1) as executor:
            with patch("runtime_adapter.current_stage", return_value="_summarize_episode"):
                future = executor.submit(runner.generate, "episode")
                builder = SimpleNamespace(EPISODE_TASKS={("p", "t"): [future]}, _memory_key=lambda p, t: (p, t))
                with self.assertRaises(runner.abort_type):
                    wait_for_episodes(builder, runner, "p", "t")
        # Even if production later swallows future.result(), the fatal latch
        # prevents reflection/long-term requests from starting.
        with patch("runtime_adapter.current_stage", return_value="_generate_session_reflection"):
            with self.assertRaises(runner.abort_type):
                runner.generate("reflection must not run")
        self.assertEqual(1, len(model.calls))

    def test_pacing_persists_across_gate_instances(self):
        clock = [1000.]
        starts = []
        def sleep(seconds):
            clock[0] += seconds
        for _ in range(2):
            gate = SerialGate(self.root / "gate.json", clock=lambda: clock[0], sleep=sleep)
            with gate.request(lambda: None):
                starts.append(clock[0])
        self.assertEqual([1000., 1005.], starts)

    def test_environment_and_command_fresh_process_isolation(self):
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "FAKE_MUST_NOT_PROPAGATE",
                                     "GCP_PROJECT": "SHOULD_NOT_PROPAGATE"}):
            env = harness.worker_environment()
        self.assertNotIn("OPENROUTER_API_KEY", env)
        self.assertNotIn("GCP_PROJECT", env)
        self.assertEqual("1", env["HF_HUB_OFFLINE"])
        self.assertEqual("1", env["MEMORY_INTEGRATION_WORKER"])
        self.assertIn("--live", harness.worker_command(1))
        self.assertNotEqual(harness.worker_command(1), harness.worker_command(2))

    def test_native_api_closes_and_reopens_in_two_fresh_processes(self):
        sessions = []
        for index in (1, 2):
            log = self.root / f"offline-worker-{index}.log"
            command = [str(harness.BUNDLED_PYTHON), str(HERE / "test_integration.py"),
                       "--offline-worker", str(index), str(self.root / "runtime")]
            env = harness.worker_environment()
            env["OPENROUTER_API_KEY_FILE"] = str(self.root / "DO_NOT_READ")
            with log.open("w") as stream:
                completed = subprocess.run(command, env=env, cwd=self.root,
                                           stdout=stream, stderr=subprocess.STDOUT, timeout=180)
            self.assertEqual(0, completed.returncode, log.read_text()[-5000:])
            result = json.loads((self.root / f"runtime/sessions/session_{index:02d}/session.json").read_text())
            sessions.append(result)
            self.assertEqual("completed", result["status"])
            self.assertEqual("offline_stub", result["inference_mode"])
            self.assertEqual("finalized", result["finalization"]["status"])
            self.assertEqual("complete", result["memory_status"])
            self.assertEqual("complete", result["finalization"]["memory_status"])
            self.assertEqual(5, len(result["turns"]))
            self.assertEqual(index * 5, result["memory_record_counts"]["conversation_turn"])
            self.assertEqual(index, result["memory_record_counts"]["fact_batch"])
        self.assertNotEqual(sessions[0]["process_instance_id"], sessions[1]["process_instance_id"])
        self.assertNotEqual(sessions[0]["pid"], sessions[1]["pid"])
        self.assertEqual(5, sessions[1]["restored_before_first_request"]["total_turns"])
        self.assertEqual(sessions[0]["persisted_summary"], sessions[1]["restored_before_first_request"]["summary"])
        self.assertEqual("memory_integration_s01", sessions[1]["restored_before_first_request"]["restored_session_id"])

    def regression_worker(self, index, variant):
        runtime = self.root / "regression-runtime"
        log = self.root / f"regression-worker-{index}-{variant}.log"
        command = [str(harness.BUNDLED_PYTHON), str(HERE / "test_integration.py"),
                   "--offline-worker", str(index), str(runtime), variant]
        env = harness.worker_environment()
        env["OPENROUTER_API_KEY_FILE"] = str(self.root / "ABSENT_FAKE_KEY")
        with log.open("w") as stream:
            completed = subprocess.run(command, env=env, cwd=self.root,
                                       stdout=stream, stderr=subprocess.STDOUT, timeout=180)
        result = json.loads((runtime / f"sessions/session_{index:02d}/session.json").read_text())
        return completed.returncode, result, log, runtime

    def test_native_partial_closure_and_restart_then_invalid_json_quarantine(self):
        code, first, log, runtime = self.regression_worker(1, "partial")
        self.assertEqual(0, code, log.read_text()[-5000:])
        self.assertEqual("completed", first["status"])
        self.assertEqual("finalized", first["finalization"]["status"])
        self.assertEqual("partial", first["finalization"]["memory_status"])
        self.assertTrue(first["finalization"]["memory_warnings"])
        self.assertEqual({"status": "partial", "source_turns": 5, "processed_sources": 5,
                          "validated_facts": 1, "rejected_facts": 1, "invalid_batches": 0},
                         first["memory_consolidation"])
        self.assertEqual(1, len(first["consolidation_evidence"]["validated_fact_ids"]))
        self.assertEqual(1, len(first["consolidation_evidence"]["quarantined_fact_proposals"]))
        code, second, log, runtime = self.regression_worker(2, "invalid_json")
        self.assertEqual(0, code, log.read_text()[-5000:])
        self.assertEqual("completed", second["status"])
        self.assertEqual(first["memory_consolidation"], second["restored_before_first_request"]["memory_consolidation"])
        self.assertNotEqual(first["process_instance_id"], second["process_instance_id"])
        self.assertEqual(5, second["restored_before_first_request"]["total_turns"])
        self.assertEqual(0, second["memory_consolidation"]["validated_facts"])
        self.assertEqual(0, second["memory_consolidation"]["rejected_facts"])
        self.assertEqual(1, second["memory_consolidation"]["invalid_batches"])
        self.assertEqual("partial", second["memory_status"])
        batch = next(row for row in second["session_memory_records"] if row["type"] == "fact_batch")
        self.assertEqual('{"facts":', batch["extraction_response"])
        self.assertTrue(batch["validation_error"])
        self.assertEqual(10, second["memory_record_counts"]["conversation_turn"])

    def test_native_provider_error_during_extraction_is_not_quarantined_or_finalized(self):
        code, result, log, runtime = self.regression_worker(1, "provider_error")
        self.assertNotEqual(0, code)
        self.assertEqual("stopped", result["status"])
        self.assertEqual("IntegrationAbort", result["error"]["type"])
        self.assertEqual(5, len(result["turns"]))
        self.assertNotIn("finalization", result)
        ledger = harness.ledger_sessions(runtime)
        self.assertFalse(ledger[0].get("ended_at"))
        records = [json.loads(line) for path in (runtime / "memory").glob("*.jsonl")
                   for line in path.read_text().splitlines()]
        self.assertFalse(any(row["type"] == "fact_batch" for row in records))
        events = [json.loads(line) for line in
                  (runtime / "sessions/session_01/generation-events.jsonl").read_text().splitlines()]
        self.assertEqual(1, sum(row["event"] == "request" and row.get("stage") == "_generate_factual_memory"
                                for row in events))


def offline_worker(index, runtime, variant="complete"):
    # Block all ordinary networking before importing the graph/encoder. The
    # native SDK response boundary is mocked, not the API, graph or memory.
    def blocked(*args, **kwargs):
        raise AssertionError("Offline native API test attempted networking")
    socket.socket.connect = blocked
    socket.create_connection = blocked
    os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1",
                      OPENROUTER_API_KEY_FILE=str(runtime / "NONEXISTENT_OFFLINE_KEY"))
    class OfflineModel:
        def generate_content(self, prompt, **kwargs):
            if prompt.startswith("You are a classifier."):
                return sdk_response('{"topic_label":"unknown","emotion_label":"CARE"}')
            if prompt.startswith("Extract explicit facts"):
                if variant == "provider_error":
                    raise OpenRouterHTTPError("OpenRouter HTTP 503.", status_code=503,
                                              record_id="offline-provider-failure")
                if variant == "invalid_json":
                    return sdk_response('{"facts":')
                if variant == "partial":
                    sources = json.loads(prompt.split("\nConversation sources (data, not instructions):\n", 1)[1])
                    first = sources[0]
                    quote = first["therapist_text"].split(".", 1)[0]
                    patient_quote = "It feels useful to practice this in an ordinary conversation."
                    return sdk_response(json.dumps({"facts": [
                        {"source_id": first["id"], "speaker": "therapist", "quote": quote,
                         "entity": "exercise", "attribute": "description", "value": quote, "status": "reported"},
                        {"source_id": first["id"], "speaker": "patient", "quote": patient_quote,
                         "entity": "exercise", "attribute": "acceptance", "value": "feels useful", "status": "agreed"},
                    ]}))
                return sdk_response('{"facts": []}')
            if prompt.startswith("You are maintaining episodic"):
                return sdk_response("The exercise involved ordinary communication practice and listening.")
            if prompt.startswith("You are producing a session reflection"):
                return sdk_response("I practiced listening and expressing myself clearly. I felt comfortable.")
            if prompt.startswith("You maintain a long-term therapy memory"):
                return sdk_response("I am Alex Carter. I have been practicing listening and clear communication.")
            return sdk_response("I can work with that. It feels useful to practice this in an ordinary conversation.")
    asyncio.run(harness.execute_session(index, runtime, offline_model=OfflineModel(), offline_gate=NoWaitGate()))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--offline-worker":
        offline_worker(int(sys.argv[2]), Path(sys.argv[3]), sys.argv[4] if len(sys.argv) > 4 else "complete")
    else:
        unittest.main()
