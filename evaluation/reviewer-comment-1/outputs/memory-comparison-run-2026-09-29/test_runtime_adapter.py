"""Offline adapter tests. Stub model, no provider or credential access."""
from __future__ import annotations

import json
import multiprocessing
import os
import socket
import sys
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
SOURCE_OPTIONS = [Path(os.environ["MEMORY_COMPARISON_SOURCE"])] if "MEMORY_COMPARISON_SOURCE" in os.environ else [
    HERE / "source", HERE.parent / "memory-integration-fix-2026-09-28/integration/source"]
SOURCE = next(path for path in SOURCE_OPTIONS if (path / "agent/core/llm_provider_vertex.py").is_file())
sys.path.insert(0, str(SOURCE))
from vertexai.generative_models import GenerationResponse
import runtime_adapter as adapter


class Clock:
    def __init__(self):
        self.value = 1000.0
        self.lock = threading.Lock()

    def now(self):
        with self.lock:
            return self.value

    def sleep(self, seconds):
        with self.lock:
            self.value += seconds


class Response:
    def __init__(self, text="A complete answer.", finish="STOP", *, thought=None):
        parts = ([{"text": thought, "thought": True}] if thought else []) + ([{"text": text}] if text else [])
        self.sdk = GenerationResponse.from_dict({"candidates": [{
            "content": {"role": "model", "parts": parts}, "finish_reason": finish}],
            "usage_metadata": {"prompt_token_count": 31, "candidates_token_count": 9,
                               "thoughts_token_count": 20, "total_token_count": 60},
            "response_id": "native-offline-id", "model_version": "gemini-2.5-pro"})

    def __getattr__(self, name):
        return getattr(self.sdk, name)

    def to_dict(self):
        result = self.sdk.to_dict()
        result["_openrouter"] = {"archive_record_id": "offline-archive-id", "response": {
            "id": "native-offline-id", "model": "google/gemini-2.5-pro", "provider": "Offline backend",
            "usage": {"prompt_tokens": 31, "completion_tokens": 29, "total_tokens": 60,
                      "cost": .0012, "cost_details": {"upstream_inference_cost": .001}}}}
        return result


class ProviderFailure(RuntimeError):
    def __init__(self, status, upstream_code=None):
        self.status_code, self.upstream_code = status, upstream_code
        self.record_id = "offline-error-record"
        super().__init__("SECRET_SENTINEL_MUST_NOT_APPEAR_IN_LOGS")


class Model:
    def __init__(self, *responses, before_call=None):
        self.responses, self.calls, self.before_call = list(responses), [], before_call

    def generate_content(self, prompt, **kwargs):
        if self.before_call:
            self.before_call()
        self.calls.append({"prompt": prompt, **kwargs})
        response = self.responses.pop(0)
        if isinstance(response, BaseException):
            raise response
        return response


class InspectGate(adapter.SerialGate):
    def __init__(self, *args, stop_path, **kwargs):
        super().__init__(*args, **kwargs)
        self.stop_path, self.stop_before_unlock = stop_path, []

    @contextmanager
    def request(self, check):
        with super().request(check) as ticket:
            try:
                yield ticket
            finally:
                self.stop_before_unlock.append(self.stop_path.exists())


def process_gate_probe(path, clock, active, maximum, starts, counter_lock):
    def now():
        with clock.get_lock():
            return clock.value
    def sleep(seconds):
        with clock.get_lock():
            clock.value += seconds
    gate = adapter.SerialGate(path, clock=now, sleep=sleep)
    with gate.request(lambda: None):
        with counter_lock:
            active.value += 1
            maximum.value = max(maximum.value, active.value)
            starts.put(now())
        time.sleep(.02)
        with counter_lock:
            active.value -= 1


class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.clock = Clock()
        self.stop = self.root / "STOP"
        self.events = self.root / "events.jsonl"
        self.gate = InspectGate(self.root / "gate.json", clock=self.clock.now,
                                sleep=self.clock.sleep, stop_path=self.stop)
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("Offline: network forbidden"))
        self.network.start()
        self.addCleanup(self.network.stop)
        self.env = patch.dict(os.environ, {"OPENROUTER_API_KEY_FILE": str(self.root / "NONEXISTENT_FAKE_KEY")})
        self.env.start()
        self.addCleanup(self.env.stop)

    def runner(self, model, **kwargs):
        return adapter.create_runner(model=model, events_path=kwargs.get("events_path", self.events),
            gate=kwargs.get("gate", self.gate), stop_path=self.stop,
            context={"session_index": 1, "turn_id": "s01t01", "arm": "offline"})

    def rows(self):
        return [json.loads(line) for line in self.events.read_text().splitlines()]

    def generate(self, runner, prompt="Original prompt", stage="generate_response"):
        with patch.object(adapter, "current_stage", return_value=stage):
            return runner.generate(prompt)

    def test_estimator_is_utf8_div3_heuristic_with_boundary(self):
        self.assertEqual("utf8_bytes_div3_ceiling", adapter.PROMPT_TOKEN_ESTIMATE_METHOD)
        for text, expected in (("", 1), ("a", 1), ("abc", 1), ("abcd", 2), ("é", 1), ("😀", 2)):
            self.assertEqual(expected, adapter.estimated_prompt_tokens(text))
        self.assertEqual(64000, adapter.estimated_prompt_tokens("a" * 192000))
        self.assertEqual(64001, adapter.estimated_prompt_tokens("a" * 192001))

    def test_allowed_boundary_is_unchanged_prompt_and_journal_precedes_call(self):
        def check_journal():
            self.assertEqual("request", self.rows()[-1]["event"])
            self.assertTrue(json.loads(self.gate.path.read_text())["in_flight"])
        model = Model(Response(), before_call=check_journal)
        self.generate(self.runner(model), "a" * 192000)
        self.assertEqual("a" * 192000, model.calls[0]["prompt"])
        self.assertEqual(64000, self.rows()[0]["estimated_prompt_tokens"])
        self.assertEqual(192000, self.rows()[0]["prompt_utf8_bytes"])
        self.assertIsNone(json.loads(self.gate.path.read_text())["in_flight"])
        self.assertFalse(self.stop.exists())

    def test_overflow_blocks_all_stages_and_writes_global_stop(self):
        for stage in adapter.STAGES:
            with self.subTest(stage=stage):
                self.stop.unlink(missing_ok=True)
                model = Model()
                runner = self.runner(model)
                with self.assertRaises(runner.abort_type):
                    self.generate(runner, "a" * 192001, stage)
                self.assertEqual([], model.calls)
                fatal = json.loads(self.stop.read_text())
                self.assertEqual("prompt_ceiling", fatal["kind"])
                self.assertEqual(64001, fatal["estimated_prompt_tokens"])
                self.assertEqual(192001, fatal["prompt_utf8_bytes"])

    def test_stage_decoder_parameters_are_preserved(self):
        for stage in adapter.STAGES:
            model = Model(Response())
            self.generate(self.runner(model), "café\nUnchanged prompt", stage)
            config = model.calls[0]["generation_config"]
            memory = stage in adapter.MEMORY_STAGES
            self.assertEqual(.2 if memory else (0.0 if stage == "classify_topic_and_emotion" else .7), config["temperature"])
            self.assertEqual(8192 if memory else 4096, config["max_output_tokens"])
            self.assertEqual(.95, config["top_p"])
            self.assertEqual({"thinking_budget": 1024}, config["thinking_config"])
            self.assertEqual(["\nTherapist:", "Therapist:"], config["stop_sequences"])
            self.assertEqual("café\nUnchanged prompt", model.calls[0]["prompt"])

    def test_completed_metadata_and_visible_text_exclude_reasoning(self):
        model = Model(Response("Visible answer", thought="PRIVATE_REASONING_SENTINEL"))
        result = self.generate(self.runner(model))
        self.assertEqual("Visible answer", result)
        outcome = next(row for row in self.rows() if row["event"] == "outcome")
        self.assertEqual("native-offline-id", outcome["response_id"])
        self.assertEqual("offline-archive-id", outcome["native_record_id"])
        self.assertEqual("google/gemini-2.5-pro", outcome["raw_model"])
        self.assertEqual("Offline backend", outcome["backend"])
        self.assertEqual(.0012, outcome["cost"])
        self.assertEqual({"upstream_inference_cost": .001}, outcome["cost_details"])
        self.assertNotIn("PRIVATE_REASONING_SENTINEL", self.events.read_text())

    def test_exactly_one_length_recovery_with_same_prompt(self):
        model = Model(Response("partial", "MAX_TOKENS"), Response("Completed"))
        self.assertEqual("Completed", self.generate(self.runner(model), "Same prompt"))
        self.assertEqual([4096, 8192], [call["generation_config"]["max_output_tokens"] for call in model.calls])
        self.assertEqual(["Same prompt"] * 2, [call["prompt"] for call in model.calls])
        outcomes = [row for row in self.rows() if row["event"] == "outcome"]
        self.assertEqual([False, True], [row["accepted"] for row in outcomes])
        self.assertEqual([True, False], [row["max_tokens_recovery"] for row in outcomes])
        self.assertFalse(self.stop.exists())

    def test_second_length_failure_stops_before_unlock(self):
        model = Model(Response("partial", "MAX_TOKENS"), Response("still partial", "MAX_TOKENS"))
        runner = self.runner(model)
        with self.assertRaises(runner.abort_type):
            self.generate(runner)
        self.assertEqual(2, len(model.calls))
        self.assertEqual([False, True], self.gate.stop_before_unlock)
        self.assertTrue(json.loads(self.gate.path.read_text())["in_flight"])

    def test_memory_length_failure_has_no_8192_retry(self):
        model = Model(Response("", "MAX_TOKENS"))
        runner = self.runner(model)
        with self.assertRaises(runner.abort_type):
            self.generate(runner, stage="_generate_factual_memory")
        self.assertEqual(1, len(model.calls))
        self.assertEqual([True], self.gate.stop_before_unlock)

    def test_empty_stop_and_bad_finish_latch_before_unlock(self):
        for text, finish in (("", "STOP"), ("partial", "OTHER"), ("", "SAFETY"), ("", "FINISH_REASON_UNSPECIFIED")):
            with self.subTest(finish=finish):
                self.stop.unlink(missing_ok=True)
                self.gate.path.unlink(missing_ok=True)
                self.gate.stop_before_unlock.clear()
                model = Model(Response(text, finish))
                runner = self.runner(model)
                with self.assertRaises(runner.abort_type):
                    self.generate(runner)
                self.assertEqual(1, len(model.calls))
                self.assertEqual([True], self.gate.stop_before_unlock)

    def test_429_504_and_inband_errors_publish_stop_without_retry_or_secret(self):
        for status, upstream in ((429, None), (504, None), (200, 504)):
            with self.subTest(status=status, upstream=upstream):
                self.stop.unlink(missing_ok=True)
                self.gate.path.unlink(missing_ok=True)
                self.gate.stop_before_unlock.clear()
                model = Model(ProviderFailure(status, upstream))
                runner = self.runner(model)
                with self.assertRaises(runner.abort_type):
                    self.generate(runner)
                self.assertEqual(1, len(model.calls))
                self.assertEqual([True], self.gate.stop_before_unlock)
                self.assertEqual(status, json.loads(self.stop.read_text())["http_status"])
                self.assertNotIn("SECRET_SENTINEL", self.events.read_text() + self.stop.read_text())

    def test_unknown_stage_stops_before_call(self):
        model = Model()
        runner = self.runner(model)
        with self.assertRaises(runner.abort_type):
            self.generate(runner, stage="unexpected_function")
        self.assertEqual([], model.calls)
        self.assertEqual("unknown_stage", json.loads(self.stop.read_text())["kind"])

    def test_global_stop_blocks_a_different_runner_and_preserves_first_error(self):
        first = self.runner(Model(ProviderFailure(429)))
        with self.assertRaises(first.abort_type):
            self.generate(first)
        original = self.stop.read_bytes()
        second_model = Model(Response())
        second = self.runner(second_model, events_path=self.root / "second.jsonl")
        with self.assertRaises(second.abort_type):
            self.generate(second)
        self.assertEqual([], second_model.calls)
        self.assertEqual(original, self.stop.read_bytes())

    def test_stop_is_checked_again_after_precall_journal(self):
        model = Model(Response())
        runner = self.runner(model)
        original = adapter.append_jsonl
        def journal_then_stop(path, event):
            original(path, event)
            if event["event"] == "request":
                self.stop.write_text("manual STOP\n")
        with patch.object(adapter, "append_jsonl", side_effect=journal_then_stop):
            with self.assertRaises(runner.abort_type):
                self.generate(runner)
        self.assertEqual([], model.calls)
        self.assertEqual([True], self.gate.stop_before_unlock)

    def test_uncertain_request_marker_blocks_new_request(self):
        with self.assertRaisesRegex(RuntimeError, "simulated crash"):
            with self.gate.request(lambda: None):
                raise RuntimeError("simulated crash")
        self.assertTrue(json.loads(self.gate.path.read_text())["in_flight"])
        model = Model(Response())
        runner = self.runner(model)
        with self.assertRaises(runner.abort_type):
            self.generate(runner)
        self.assertEqual([], model.calls)
        self.assertEqual("uncertain_gate", json.loads(self.stop.read_text())["kind"])

    def test_response_parsing_error_stops_while_locked(self):
        response = Response()
        response.to_dict = lambda: (_ for _ in ()).throw(ValueError("DO_NOT_LOG_RESPONSE_PAYLOAD"))
        model = Model(response)
        runner = self.runner(model)
        with self.assertRaises(runner.abort_type):
            self.generate(runner)
        self.assertEqual([True], self.gate.stop_before_unlock)
        self.assertNotIn("DO_NOT_LOG_RESPONSE_PAYLOAD", self.events.read_text())

    def test_gate_serializes_threads_and_spaces_fake_clock_starts(self):
        active = 0
        maximum = 0
        starts = []
        monitor = threading.Lock()
        def work():
            nonlocal active, maximum
            gate = adapter.SerialGate(self.root / "shared.json", clock=self.clock.now, sleep=self.clock.sleep)
            with gate.request(lambda: None):
                with monitor:
                    active += 1
                    maximum = max(maximum, active)
                    starts.append(self.clock.now())
                time.sleep(.02)
                with monitor:
                    active -= 1
        with ThreadPoolExecutor(max_workers=4) as executor:
            list(executor.map(lambda _: work(), range(4)))
        self.assertEqual(1, maximum)
        self.assertEqual([1000., 1005., 1010., 1015.], sorted(starts))

    def test_gate_serializes_processes_with_persistent_spacing(self):
        context = multiprocessing.get_context("fork")
        clock, active, maximum = context.Value("d", 1000.), context.Value("i", 0), context.Value("i", 0)
        starts, counter_lock = context.Queue(), context.Lock()
        processes = [context.Process(target=process_gate_probe, args=(self.root / "process-gate.json",
                        clock, active, maximum, starts, counter_lock)) for _ in range(3)]
        for process in processes:
            process.start()
        for process in processes:
            process.join(timeout=10)
            self.assertFalse(process.is_alive())
            self.assertEqual(0, process.exitcode)
        self.assertEqual(1, maximum.value)
        self.assertEqual([1000., 1005., 1010.], sorted(starts.get(timeout=1) for _ in processes))
        starts.close()
        starts.join_thread()

    def test_gate_rejects_invalid_interval_and_corrupt_state(self):
        for interval in (0, 4.99, float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                adapter.SerialGate(self.root / "invalid.json", interval=interval)
        self.gate.path.write_text("not JSON")
        model = Model(Response())
        runner = self.runner(model)
        with self.assertRaises(runner.abort_type):
            self.generate(runner)
        self.assertEqual([], model.calls)


if __name__ == "__main__":
    unittest.main()
