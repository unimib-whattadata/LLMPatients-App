"""Offline integration tests against each unchanged research snapshot."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import Mock

OUT = Path(__file__).resolve().parents[1]
MODE = os.environ.get("CAMPAIGN_TEST_SOURCE", "phq")
assert MODE in {"phq", "longitudinal"}
sys.path.insert(0, str(OUT / f"{MODE}-source"))
from agent.core.llm_provider_vertex import VertexLLMRunner
from vertexai.generative_models import GenerationResponse
from campaign_openrouter import OpenRouterCoordinator as CampaignCoordinator, CampaignCapacityPause
from campaign_rate_limit import install_rate_limit_overlay, _load_limiter

observer_name = "complete_phq9_openrouter" if MODE == "phq" else "run_longitudinal_session_openrouter"
spec = importlib.util.spec_from_file_location("_test_raw_observer", OUT / "scripts" / f"{observer_name}.py")
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)
LIMITER = _load_limiter(OUT)


def response(text, reason="STOP"):
    return GenerationResponse.from_dict({
        "candidates": [{"finish_reason": reason, "content": {"role": "model", "parts": [{"text": text}]}}],
        "response_id": f"test-response-{text}",
    })


class Clock:
    def __init__(self):
        self.now = 1000.0
    def time(self):
        return self.now
    def sleep(self, seconds):
        self.now += seconds


class TestFrozenTransportOverlay(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.base = Path(self.directory.name)
        self.clock = Clock()
        self.coordinator = CampaignCoordinator(self.base, {}, LIMITER)
        self.limiter = LIMITER.VertexRateLimiter(
            self.base / "limits.sqlite3", "test", clock=self.clock.time,
            monotonic=self.clock.time, sleep=self.clock.sleep, jitter=lambda delay: 0,
        )

    def runner(self, effects, attempts=5):
        class FrozenRunner(VertexLLMRunner):
            pass
        llm = FrozenRunner.__new__(FrozenRunner)
        llm.model_id, llm.temperature, llm.max_tokens = "gemini-2.5-pro", .7, 4096
        llm.max_attempts, llm.max_recovery_tokens = attempts, 8192
        llm.safety_settings = {"unchanged": "safety"}
        llm.rate_limit_cooldown_seconds = 15
        llm._retry_delay_seconds = lambda attempt: 0
        self.sdk = Mock()
        self.sdk.generate_content.side_effect = effects
        self.raw_path = self.base / "api_records.jsonl"
        llm.model = observer.ObservedModel(self.sdk, self.raw_path) if MODE == "phq" else observer.ObservedModel(self.sdk, self.raw_path, {})
        self.observed = llm.model
        llm._campaign_rate_guard = (threading.RLock(), self.limiter)
        install_rate_limit_overlay(FrozenRunner, self.base, coordinator=self.coordinator)
        return llm

    def outcomes(self):
        rows = [json.loads(line) for line in self.raw_path.read_text().splitlines()]
        return rows if MODE == "phq" else [r for r in rows if r["event"] == "outcome"]

    def test_completed_response_and_all_generation_arguments_are_unchanged(self):
        llm = self.runner([response("2")])
        self.assertEqual(llm.generate("exact original prompt", temperature=.1, max_tokens=220), "2")
        call = self.sdk.generate_content.call_args
        self.assertEqual(call.args, ("exact original prompt",))
        self.assertEqual(call.kwargs, {
            "generation_config": {"temperature": .1, "max_output_tokens": 220,
                "stop_sequences": ["\nTherapist:", "Therapist:"], "top_p": .95, "top_k": 40},
            "safety_settings": {"unchanged": "safety"},
        })
        self.assertIs(llm.model, self.observed)
        events = [json.loads(line) for line in (self.coordinator.directory / "events.jsonl").read_text().splitlines()]
        returned = [e for e in events if e["kind"] == "response_returned"]
        self.assertEqual(returned[0]["response_id"], self.outcomes()[0]["response"]["response_id"])
        self.assertEqual(returned[0]["provider"], "openrouter")
        self.assertEqual(self.outcomes()[0]["region"], "openrouter")
        self.assertEqual(self.outcomes()[0]["amendment_id"], "openrouter-gemini-2.5-pro-continuation-2026-09-27")

    def test_original_max_tokens_acceptance_is_preserved_for_this_snapshot(self):
        llm = self.runner([response("2", "MAX_TOKENS"), response("Complete")])
        result = llm.generate("prompt", max_tokens=220)
        self.assertEqual(result, "2" if MODE == "phq" else "Complete")
        budgets = [c.kwargs["generation_config"]["max_output_tokens"] for c in self.sdk.generate_content.call_args_list]
        self.assertEqual(budgets, [220] if MODE == "phq" else [220, 1024])

    def test_three_429_outcomes_are_archived_before_controlled_stop(self):
        llm = self.runner([RuntimeError("429 Resource exhausted")] * 5)
        with self.assertRaises(CampaignCapacityPause):
            llm.generate("prompt")
        self.assertEqual(self.sdk.generate_content.call_count, 3)
        self.assertEqual(len(self.outcomes()), 3)
        self.assertTrue(all(r["error_type"] == "RuntimeError" for r in self.outcomes()))
        self.assertTrue(self.coordinator.stop_path.exists())
        self.assertIs(llm.model, self.observed)
        with self.assertRaises(CampaignCapacityPause):
            llm.generate("next prompt")
        self.assertEqual(self.sdk.generate_content.call_count, 3)

    def test_shared_stop_bypasses_legacy_exception_fallback(self):
        llm = self.runner([response("must not be called")])
        self.coordinator.persist_stop({"reason": "peer process reached capacity stop"})
        def legacy_handler():
            try:
                return llm.generate("prompt")
            except Exception:
                return "fabricated fallback"
        with self.assertRaises(CampaignCapacityPause):
            legacy_handler()
        self.sdk.generate_content.assert_not_called()
        self.assertFalse(self.raw_path.exists())

    def test_wait_budget_stop_does_not_create_a_fake_api_attempt(self):
        llm = self.runner([response("must not be called")])
        self.limiter.defer(900)
        with self.assertRaises(CampaignCapacityPause):
            llm.generate("prompt")
        self.sdk.generate_content.assert_not_called()
        self.assertFalse(self.raw_path.exists())

    def test_single_attempt_budget_stops_without_outer_validation_retries(self):
        llm = self.runner([RuntimeError("429 Resource exhausted")], attempts=1)
        with self.assertRaises(CampaignCapacityPause):
            llm.generate("prompt")
        self.assertEqual(len(self.outcomes()), 1)
        self.assertTrue(self.coordinator.stop_path.exists())

    def test_in_flight_success_is_retained_when_another_process_stops(self):
        def finish(*args, **kwargs):
            self.coordinator.persist_stop({"reason": "another process stopped"})
            return response("accepted")
        llm = self.runner(finish)
        self.assertEqual(llm.generate("prompt"), "accepted")
        with self.assertRaises(CampaignCapacityPause):
            llm.generate("next")
        self.assertEqual(self.sdk.generate_content.call_count, 1)

    def test_permanent_provider_error_stops_after_archiving_it(self):
        llm = self.runner([RuntimeError("400 Invalid argument")])
        with self.assertRaises(CampaignCapacityPause):
            llm.generate("prompt")
        self.assertEqual(self.sdk.generate_content.call_count, 1)
        self.assertEqual(len(self.outcomes()), 1)

    def test_native_error_id_survives_the_per_run_observer(self):
        error = RuntimeError("OpenRouter HTTP 401")
        error.record_id = "offline-native-error-record"
        llm = self.runner([error])
        with self.assertRaises(CampaignCapacityPause):
            llm.generate("prompt")
        self.assertEqual(self.outcomes()[0]["openrouter_archive_record_id"], error.record_id)

    def test_success_clears_backoff_without_altering_the_answer(self):
        llm = self.runner([RuntimeError("429 Resource exhausted"), response("2")])
        self.assertEqual(llm.generate("prompt", temperature=.1), "2")
        self.assertEqual(self.sdk.generate_content.call_count, 2)
        self.assertEqual(self.limiter.snapshot()["failures"], 0)
        self.assertFalse(self.coordinator.stop_path.exists())
        self.assertEqual(self.clock.now, 1015)


if __name__ == "__main__":
    unittest.main()
