"""Offline timeout/rate-limit policy tests: fake transport, clock, and archives.

No SDK, key file, provider, network or subprocess is used. Native-style request
and terminal records are produced by the stub; policy validation is real.
"""
from __future__ import annotations

import copy
from datetime import datetime, timezone
from email.utils import format_datetime
import json
import os
import socket
import subprocess
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import timeout_retries as policy


class Clock:
    def __init__(self):
        self.value = 1000.0
        self.sleeps = []
        self.on_sleep = None

    def monotonic(self):
        return self.value

    def time(self):
        return 1_800_000_000.0 + self.value - 1000.0

    def sleep(self, duration):
        self.sleeps.append(duration)
        self.value += duration
        if self.on_sleep:
            self.on_sleep()


class OpenRouterError(RuntimeError):
    def __init__(self, message, *, status_code=None, record_id=None, retry_after=None):
        super().__init__(message)
        self.status_code, self.record_id = status_code, record_id
        self.response = types.SimpleNamespace(status_code=status_code,
            headers={"Retry-After": retry_after} if retry_after is not None else {})


class OpenRouterHTTPError(OpenRouterError):
    pass


class OpenRouterProtocolError(OpenRouterError):
    pass


class OpenRouterInBandError(OpenRouterError):
    def __init__(self, code, *, record_id, retry_after=None):
        self.upstream_code = code
        super().__init__(f"OpenRouter upstream error code {code}: in-band generation failure.",
                         status_code=200, record_id=record_id, retry_after=retry_after)


class Response:
    def __init__(self, record_id, raw):
        self.record_id, self.raw = record_id, raw

    def to_dict(self):
        return {"_openrouter": {"archive_record_id": self.record_id, "response": copy.deepcopy(self.raw)}}


def append(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(value, ensure_ascii=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())


def transport_stub(clock):
    module = types.ModuleType("openrouter_transport")
    module.OpenRouterError = OpenRouterError
    module.OpenRouterHTTPError = OpenRouterHTTPError
    module.OpenRouterProtocolError = OpenRouterProtocolError

    class OpenRouterModel:
        def __init__(self, model_id, *, timeout_seconds=120.0, records_path=None):
            self.model_id = "google/gemini-2.5-pro"
            self.timeout_seconds, self.records_path = timeout_seconds, Path(records_path)
            self.actions, self.calls, self.returned = [], [], []

        def generate_content(self, prompt, generation_config=None, safety_settings=None):
            action = self.actions.pop(0)
            self.calls.append({"started": clock.value, "prompt": prompt,
                "generation_config": copy.deepcopy(generation_config), "safety_settings": copy.deepcopy(safety_settings)})
            record_id = f"offline-record-{len(self.calls)}"
            config = generation_config
            body = {"model": "google/gemini-2.5-pro", "messages": [{"role": "user", "content": prompt}],
                    "provider": {"require_parameters": True, "allow_fallbacks": False},
                    "temperature": config["temperature"], "max_tokens": config["max_output_tokens"],
                    "top_p": config["top_p"], "stop": copy.deepcopy(config["stop_sequences"]),
                    "reasoning": {"max_tokens": config["thinking_config"]["thinking_budget"]}}
            if action.get("wrong_body"):
                body["max_tokens"] += 1
            base = {"record_id": record_id, "endpoint": "https://openrouter.ai/api/v1/chat/completions", "request": body,
                    "omitted_legacy_generation_parameters": ["top_k"], "safety_settings_forwarded": False}
            append(self.records_path, {**base, "event": "request"})
            clock.value += action.get("duration", 0.0)
            if action.get("mutate_arguments"):
                generation_config["stop_sequences"].append("UNWANTED MUTATION")
                generation_config["thinking_config"]["thinking_budget"] = 99
                safety_settings["nested"]["value"] = "MUTATED"
            kind = action["kind"]
            retry_after = action.get("retry_after")
            success_raw = {"id": f"offline-response-{len(self.calls)}", "model": "google/gemini-2.5-pro",
                "provider": "OFFLINE_STUB", "choices": [{"finish_reason": "stop", "message": {"content": "An unchanged native answer."}}],
                "usage": {"prompt_tokens": 20, "completion_tokens": 12, "total_tokens": 32}}
            if kind == "success":
                append(self.records_path, {**base, "event": "response", "http_status": 200, "response": success_raw})
                response = Response(record_id, success_raw)
                if action.get("wrong_returned_id"):
                    response.record_id = "foreign-response-record"
                self.returned.append(response)
                return response
            if kind.startswith("http_"):
                status = int(kind.split("_")[1])
                error = OpenRouterHTTPError(f"OpenRouter HTTP {status}.", status_code=status, record_id=record_id, retry_after=retry_after)
                raw = {"error": {"code": status, "message": "Offline HTTP error"}}
            elif kind.startswith("inband_"):
                code = int(kind.split("_")[1])
                error = OpenRouterInBandError(code, record_id=record_id, retry_after=retry_after)
                raw = {"model": "google/gemini-2.5-pro", "choices": [{"finish_reason": "error",
                    "error": {"code": code}, "message": {"content": action.get("visible"),
                    "reasoning": "OFFLINE_REASONING_NEVER_LOGGED_BY_RETRY_POLICY"}}]}
            elif kind == "client_timeout":
                error = OpenRouterError("OpenRouter request timed out.", status_code=action.get("status"), record_id=record_id)
                raw = None
            elif kind == "protocol":
                error = OpenRouterProtocolError("OpenRouter protocol error.", status_code=200, record_id=record_id, retry_after=retry_after)
                raw = {"error": {"code": 504}}
            elif kind == "api_429":
                error = OpenRouterProtocolError("OpenRouter returned an API error code 429 (HTTP 200).",
                    status_code=200, record_id=record_id, retry_after=retry_after)
                raw = {"error": {"code": 429, "message": "Offline rate limit"}}
            elif kind == "success_io_error":
                error = OpenRouterError("OpenRouter transport or response failure (OSError).", status_code=200, record_id=record_id)
                raw = success_raw
            elif kind == "unwrapped_timeout":
                raise TimeoutError("Not the frozen archived timeout")
            else:
                raise AssertionError(f"Unknown offline action {kind}")
            if "raw_override" in action:
                raw = action["raw_override"]
            if "error_headers" in action:
                error.response.headers = action["error_headers"]
            if action.get("wrong_error_id"):
                error.record_id = "foreign-error-id"
            terminal = {**base, "event": "error", "http_status": error.status_code, "response": raw,
                        "retry_after": action.get("archive_retry_after", retry_after),
                        "error": {"type": type(error).__name__, "message": str(error)}}
            if action.get("extra_success_record"):
                append(self.records_path, {**base, "event": "response", "http_status": 200, "response": success_raw})
            if action.get("malformed_error"):
                with self.records_path.open("ab") as stream:
                    stream.write(b'{"event":"error"')
            elif not action.get("missing_error"):
                append(self.records_path, terminal)
            raise error

    module.OpenRouterModel = OpenRouterModel
    return module


class TimeoutRetryTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="llmpatient-timeout-policy-offline-")
        self.addCleanup(temporary.cleanup)
        self.runtime = Path(temporary.name).resolve()
        self.clock = Clock()
        self.transport = transport_stub(self.clock)
        self.patch_context(patch.dict(sys.modules, {"openrouter_transport": self.transport}))
        self.patch_context(patch.object(policy.time, "monotonic", self.clock.monotonic))
        self.patch_context(patch.object(policy.time, "time", self.clock.time))
        self.patch_context(patch.object(policy.time, "sleep", self.clock.sleep))
        for target, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"),
                             (socket, "create_connection"), (subprocess, "Popen"), (os, "system")):
            self.patch_context(patch.object(target, name, side_effect=AssertionError("No external execution in offline timeout tests")))
        self.gate = {"last_started": 1000.0, "in_flight": {"gate_request_id": "offline-gate",
                     "pid": os.getpid(), "started_at": 1000.0}}
        (self.runtime / "request-gate.json").write_text(json.dumps(self.gate))
        self.initial_gate = (self.runtime / "request-gate.json").read_bytes()
        self.cls = policy.install_retry_policy(self.runtime)
        self.config = {"temperature": .7, "max_output_tokens": 4096, "top_p": .95, "top_k": 40,
                       "stop_sequences": ["\nTherapist:", "Therapist:"], "thinking_config": {"thinking_budget": 1024}}
        self.safety = {"nested": {"value": "original"}}
        self.prompt = "Exact original prompt: è unchanged.\n"

    def patch_context(self, context):
        result = context.start()
        self.addCleanup(context.stop)
        return result

    def model(self, *actions, name="session_01"):
        model = self.cls("gemini-2.5-pro", timeout_seconds=120,
                         records_path=self.runtime / name / "openrouter-api-records.jsonl")
        model.actions = [dict(action) if isinstance(action, dict) else {"kind": action} for action in actions]
        return model

    def invoke(self, model):
        return model.generate_content(self.prompt, generation_config=self.config, safety_settings=self.safety)

    def journal(self, model):
        path = model.records_path.parent / "timeout-retries.jsonl"
        return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []

    def wire(self, model):
        return [json.loads(line) for line in model.records_path.read_text().splitlines()]

    def assert_gate_unchanged(self):
        self.assertEqual(self.initial_gate, (self.runtime / "request-gate.json").read_bytes())

    def test_single_success_returns_original_response_after_minimum_interval(self):
        model = self.model({"kind": "success", "duration": .4})
        response = self.invoke(model)
        self.assertIs(response, model.returned[0])
        self.assertEqual(1, len(model.calls))
        self.assertAlmostEqual(5.0, self.clock.value - model.calls[-1]["started"])
        self.assertEqual("returned_response", self.journal(model)[-1]["outcome"])
        self.assert_gate_unchanged()

    def test_one_timeout_then_success_keeps_identical_bodies_and_native_ids(self):
        model = self.model({"kind": "inband_504", "duration": 2.0}, {"kind": "success", "duration": 1.0})
        response = self.invoke(model)
        self.assertIs(response, model.returned[0])
        self.assertEqual([1000.0, 1032.0], [call["started"] for call in model.calls])
        self.assertAlmostEqual(1037.0, self.clock.value)
        self.assertTrue(all(0 < value <= 1 for value in self.clock.sleeps))
        requests = [record["request"] for record in self.wire(model) if record["event"] == "request"]
        self.assertEqual(2, len(requests))
        self.assertEqual(requests[0], requests[1])
        self.assertEqual([{"role": "user", "content": self.prompt}], requests[0]["messages"])
        self.assertEqual({"require_parameters": True, "allow_fallbacks": False}, requests[0]["provider"])
        events = self.journal(model)
        self.assertEqual(1, len({record["group_id"] for record in events}))
        self.assertEqual(1, len({record["request_sha256"] for record in events}))
        self.assertEqual({"offline-gate"}, {record["gate_request_id"] for record in events})
        error = next(record for record in events if record["event"] == "attempt_error")
        self.assertEqual("offline-record-1", error["native_record_id"])
        self.assertEqual((True, 30.0), (error["will_retry"], error["delay_seconds"]))
        self.assertEqual("offline-record-2", events[-1]["native_record_id"])
        self.assertNotIn("OFFLINE_REASONING", json.dumps(events))
        self.assertFalse((self.runtime / "STOP").exists())
        self.assert_gate_unchanged()

    def test_http_504_and_native_client_timeout_are_retryable(self):
        cases = ("http_504", "client_timeout")
        for number, kind in enumerate(cases):
            with self.subTest(kind=kind):
                model = self.model(kind, "success", name=f"case_{number}")
                self.invoke(model)
                self.assertEqual(2, len(model.calls))
                self.assertTrue(next(record for record in self.journal(model) if record["event"] == "attempt_error")["retry_eligible"])

    def test_client_read_timeout_after_http200_without_body_is_retryable(self):
        model = self.model({"kind": "client_timeout", "status": 200}, "success")
        self.invoke(model)
        self.assertEqual(2, len(model.calls))

    def test_three_timeouts_exhaust_exactly_thirty_and_sixty_second_backoff(self):
        model = self.model("inband_504", "inband_504", "inband_504", "success")
        with self.assertRaises(OpenRouterInBandError) as caught:
            self.invoke(model)
        self.assertEqual(3, len(model.calls))
        self.assertEqual([1000.0, 1030.0, 1090.0], [call["started"] for call in model.calls])
        self.assertEqual("offline-record-3", caught.exception.record_id)
        records = self.journal(model)
        self.assertEqual([30.0, 60.0, None], [record["delay_seconds"] for record in records if record["event"] == "attempt_error"])
        self.assertEqual("retry_attempts_exhausted", records[-1]["outcome"])
        self.assertFalse((self.runtime / "STOP").exists())
        self.assert_gate_unchanged()

    def test_502_503_protocol_and_other_upstream_errors_never_retry(self):
        for number, kind in enumerate(("http_401", "http_502", "http_503", "inband_401", "inband_503", "protocol")):
            with self.subTest(kind=kind):
                model = self.model(kind, "success", name=f"nonretry_{number}")
                with self.assertRaises(OpenRouterError):
                    self.invoke(model)
                self.assertEqual(1, len(model.calls))
                self.assertEqual("non_retryable_error", self.journal(model)[-1]["outcome"])
        self.assertEqual([], self.clock.sleeps)

    def test_visible_partial_completion_prevents_504_retry(self):
        model = self.model({"kind": "inband_504", "visible": "A partial patient answer."}, "success")
        with self.assertRaises(OpenRouterInBandError):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))
        self.assertFalse(next(record for record in self.journal(model) if record["event"] == "attempt_error")["retry_eligible"])

    def test_success_with_archive_io_error_is_not_retried(self):
        model = self.model("success_io_error", "success")
        with self.assertRaises(OpenRouterError):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))
        self.assertEqual("non_retryable_error", self.journal(model)[-1]["outcome"])

    def test_native_missing_truncated_or_extra_outcome_never_retries(self):
        corruptions = ({"missing_error": True}, {"malformed_error": True}, {"extra_success_record": True})
        for number, corruption in enumerate(corruptions):
            with self.subTest(corruption=corruption):
                for kind in ("inband_504", "http_429"):
                    model = self.model({"kind": kind, **corruption}, "success", name=f"uncertain_{number}_{kind}")
                    with self.assertRaises(policy.RetryPolicyError):
                        self.invoke(model)
                    self.assertEqual(1, len(model.calls))
                    self.assertEqual("uncertain_or_mismatched_archive", self.journal(model)[-1]["outcome"])

    def test_unarchived_raw_timeout_is_not_a_native_timeout_retry(self):
        model = self.model("unwrapped_timeout", "success")
        with self.assertRaises(policy.RetryPolicyError):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))

    def test_request_or_error_id_mismatch_stops_before_retry(self):
        for number, corruption in enumerate(({"wrong_body": True}, {"wrong_error_id": True})):
            with self.subTest(corruption=corruption):
                for kind in ("inband_504", "http_429"):
                    model = self.model({"kind": kind, **corruption}, "success", name=f"mismatch_{number}_{kind}")
                    with self.assertRaises(policy.RetryPolicyError):
                        self.invoke(model)
                    self.assertEqual(1, len(model.calls))

    def test_returned_response_must_match_its_native_archive(self):
        model = self.model({"kind": "success", "wrong_returned_id": True}, "success")
        with self.assertRaises(policy.RetryPolicyError):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))

    def test_deep_copies_protect_config_safety_and_every_attempt(self):
        config, safety = copy.deepcopy(self.config), copy.deepcopy(self.safety)
        model = self.model({"kind": "http_504", "mutate_arguments": True}, "success")
        self.invoke(model)
        self.assertEqual(config, self.config)
        self.assertEqual(safety, self.safety)
        for call in model.calls:
            self.assertEqual(config, call["generation_config"])
            self.assertEqual(safety, call["safety_settings"])

    def test_stop_interrupts_backoff_within_one_second_without_resetting_gate(self):
        model = self.model("inband_504", "success")
        self.clock.on_sleep = lambda: (self.runtime / "STOP").write_text('{"kind":"offline_manual_stop"}\n')
        with self.assertRaises(policy.RetryInterrupted):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))
        self.assertEqual([1.0], self.clock.sleeps)
        self.assertEqual("interrupted_by_stop", self.journal(model)[-1]["outcome"])
        self.assertTrue((self.runtime / "STOP").exists())
        self.assert_gate_unchanged()

    def test_stop_interrupts_success_pacing_and_prevents_return(self):
        model = self.model("success")
        self.clock.on_sleep = lambda: (self.runtime / "STOP").write_text("stop\n")
        with self.assertRaises(policy.RetryInterrupted):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))
        self.assertEqual("attempt_response", self.journal(model)[-2]["event"])
        self.assertEqual("interrupted_by_stop", self.journal(model)[-1]["outcome"])

    def test_existing_stop_or_absent_active_gate_blocks_first_attempt(self):
        model = self.model("success")
        (self.runtime / "STOP").write_text("stop\n")
        with self.assertRaises(policy.RetryInterrupted):
            self.invoke(model)
        self.assertEqual([], model.calls)
        (self.runtime / "STOP").unlink()
        (self.runtime / "request-gate.json").write_text(json.dumps({"last_started": 1000, "in_flight": None}))
        with self.assertRaises(policy.RetryPolicyError):
            self.invoke(model)
        self.assertEqual([], model.calls)

    def test_gate_change_during_backoff_prevents_another_attempt(self):
        model = self.model("http_504", "success")
        self.clock.on_sleep = lambda: (self.runtime / "request-gate.json").write_text(json.dumps({"last_started": 1001, "in_flight": None}))
        with self.assertRaises(policy.RetryPolicyError):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))

    def test_journal_io_failure_never_starts_or_repeats_external_attempt(self):
        ordinary_journal = policy._journal
        cases = (("attempt_start", "success", 0), ("attempt_error", "http_504", 1),
                 ("attempt_error", "http_429", 1), ("attempt_response", "success", 1))
        for number, (event, kind, calls) in enumerate(cases):
            with self.subTest(event=event):
                model = self.model(kind, "success", name=f"io_{number}")

                def fail_event(path, record):
                    if record["event"] == event:
                        raise OSError("Offline simulated journal I/O failure")
                    return ordinary_journal(path, record)

                with patch.object(policy, "_journal", fail_event), self.assertRaises(OSError):
                    self.invoke(model)
                self.assertEqual(calls, len(model.calls))
                self.assertEqual("io_failure_no_retry", self.journal(model)[-1]["outcome"])

    def test_all_journal_writes_failing_prevents_provider(self):
        model = self.model("success")
        with patch.object(policy, "_journal", side_effect=OSError("Offline unavailable disk")), self.assertRaises(policy.RetryPolicyError):
            self.invoke(model)
        self.assertEqual([], model.calls)

    def test_install_is_idempotent_and_refuses_other_runtime(self):
        self.assertIs(self.cls, policy.install_retry_policy(self.runtime))
        with self.assertRaises(policy.RetryPolicyError):
            policy.install_retry_policy(self.runtime / "different")
        with patch.object(self.cls, "_timeout_retry_policy_version", "resume-04-v1"), self.assertRaises(policy.RetryPolicyError):
            policy.install_retry_policy(self.runtime)

    def test_preexisting_native_error_archive_bytes_are_preserved(self):
        model = self.model("http_504", "success")
        append(model.records_path, {"record_id": "preserved-prior-error", "event": "request"})
        append(model.records_path, {"record_id": "preserved-prior-error", "event": "error"})
        prior = model.records_path.read_bytes()
        self.invoke(model)
        self.assertTrue(model.records_path.read_bytes().startswith(prior))
        self.assertEqual(2, len(model.calls))

    def test_unparsed_504_body_is_uncertain_and_not_retryable(self):
        model = self.model({"kind": "http_504", "raw_override": {"unparsed_body": "uninterpretable"}}, "success")
        with self.assertRaises(OpenRouterHTTPError):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))

    def test_http_inband_and_top_level_api_429_without_header_retry(self):
        for number, kind in enumerate(("http_429", "inband_429", "api_429")):
            with self.subTest(kind=kind):
                model = self.model(kind, "success", name=f"rate_{number}")
                self.invoke(model)
                self.assertEqual(2, len(model.calls))
                self.assertEqual(60.0, model.calls[1]["started"] - model.calls[0]["started"])
                self.assertEqual(5.0, self.clock.value - model.calls[-1]["started"])
                rows = self.journal(model)
                error = next(row for row in rows if row["event"] == "attempt_error")
                self.assertEqual("resume-06-v1", error["policy"])
                self.assertEqual("absent", error["retry_after_status"])
                self.assertEqual((60.0, None, 60.0), (error["base_delay_seconds"], error["retry_after_delay_seconds"], error["effective_delay_seconds"]))
                self.assertEqual("retry", error["decision"])
                self.assertEqual("offline-record-1", error["native_record_id"])
                self.assertEqual(429 if kind == "http_429" else 200, error["http_status"])
                self.assertEqual([60.0, 120.0], rows[0]["rate_limit_retry_delays_seconds"])
                requests = [row["request"] for row in self.wire(model) if row["event"] == "request"]
                self.assertEqual(requests[0], requests[1])
                self.assertEqual({"model": policy.MODEL, "messages": [{"role": "user", "content": self.prompt}],
                    "provider": {"require_parameters": True, "allow_fallbacks": False}, "temperature": .7,
                    "max_tokens": 4096, "top_p": .95, "stop": self.config["stop_sequences"],
                    "reasoning": {"max_tokens": 1024}}, requests[0])
                self.assertFalse((self.runtime / "STOP").exists())
                self.assert_gate_unchanged()

    def test_numeric_retry_after_uses_the_greater_of_header_and_base(self):
        for number, (header, expected) in enumerate((("0", 60.0), ("59", 60.0), ("90.5", 90.5), ("300", 300.0))):
            with self.subTest(header=header):
                model = self.model({"kind": "http_429", "retry_after": header}, "success", name=f"numeric_{number}")
                self.invoke(model)
                self.assertEqual(expected, model.calls[1]["started"] - model.calls[0]["started"])
                row = next(row for row in self.journal(model) if row["event"] == "attempt_error")
                self.assertEqual(header, row["retry_after_value"])
                self.assertEqual("numeric_seconds", row["retry_after_status"])
                self.assertEqual(float(header), row["retry_after_delay_seconds"])
                self.assertEqual(expected, row["effective_delay_seconds"])
                self.assertTrue(all(0 < value <= 1 for value in self.clock.sleeps))

    def test_http_date_retry_after_is_measured_at_the_received_error(self):
        for number, (offset, expected) in enumerate(((90.0, 90.0), (-10.0, 60.0))):
            with self.subTest(offset=offset):
                header = format_datetime(datetime.fromtimestamp(self.clock.time() + 2.0 + offset, timezone.utc), usegmt=True)
                model = self.model({"kind": "inband_429", "retry_after": header, "duration": 2.0}, "success", name=f"date_{number}")
                self.invoke(model)
                self.assertEqual(2.0 + expected, model.calls[1]["started"] - model.calls[0]["started"])
                row = next(row for row in self.journal(model) if row["event"] == "attempt_error")
                self.assertEqual("http_date", row["retry_after_status"])
                self.assertEqual(max(0.0, offset), row["retry_after_delay_seconds"])
                self.assertEqual(expected, row["delay_seconds"])

    def test_invalid_retry_after_is_recorded_and_uses_base_without_busy_loop(self):
        for number, header in enumerate(("", "-1", "NaN", "Infinity", "1e3", "not a date", "Wed, 21 Oct 2015 07:28:00")):
            with self.subTest(header=header):
                model = self.model({"kind": "api_429", "retry_after": header}, "success", name=f"bad_header_{number}")
                self.invoke(model)
                self.assertEqual(60.0, model.calls[1]["started"] - model.calls[0]["started"])
                row = next(row for row in self.journal(model) if row["event"] == "attempt_error")
                self.assertEqual("invalid", row["retry_after_status"])
                self.assertEqual(header, row["retry_after_value"])
                self.assertIsNone(row["retry_after_delay_seconds"])
                self.assertEqual("retry", row["decision"])

    def test_retry_after_above_300_refuses_retry_instead_of_waiting_too_little(self):
        long_date = format_datetime(datetime.fromtimestamp(self.clock.time() + 360.0, timezone.utc), usegmt=True)
        for number, header in enumerate(("301", long_date, "9" * 400)):
            with self.subTest(header=header[:35]):
                model = self.model({"kind": "http_429", "retry_after": header}, "success", name=f"long_{number}")
                with self.assertRaises(policy.RetryWaitLimitExceeded) as caught:
                    self.invoke(model)
                self.assertEqual(1, len(model.calls))
                self.assertEqual("offline-record-1", caught.exception.record_id)
                rows = self.journal(model)
                self.assertEqual("retry_after_exceeds_maximum", rows[-1]["outcome"])
                error = next(row for row in rows if row["event"] == "attempt_error")
                self.assertFalse(error["will_retry"])
                self.assertIsNone(error["delay_seconds"])
                self.assertEqual("retry_after_exceeds_maximum", error["decision"])
                self.assertFalse((self.runtime / "STOP").exists())  # Outer runner owns the STOP latch.
                self.assert_gate_unchanged()
        self.assertEqual([], self.clock.sleeps)

    def test_header_archive_mismatch_or_duplicate_headers_refuse_retry(self):
        corruptions = ({"retry_after": "90", "archive_retry_after": "60"},
                       {"retry_after": "90", "error_headers": {}},
                       {"error_headers": {"Retry-After": "90"}},
                       {"retry_after": "90", "error_headers": {"Retry-After": "90", "retry-after": "90"}})
        for number, corruption in enumerate(corruptions):
            with self.subTest(corruption=corruption):
                model = self.model({"kind": "http_429", **corruption}, "success", name=f"header_mismatch_{number}")
                with self.assertRaisesRegex(policy.RetryPolicyError, "Retry-After"):
                    self.invoke(model)
                self.assertEqual(1, len(model.calls))
                self.assertEqual("uncertain_or_mismatched_archive", self.journal(model)[-1]["outcome"])
        self.assertEqual([], self.clock.sleeps)

    def test_header_lookup_is_case_insensitive_and_top_level_string_code_is_explicit(self):
        model = self.model({"kind": "api_429", "retry_after": "90", "error_headers": {"retry-after": "90"},
                           "raw_override": {"error": {"code": "429"}}}, "success")
        self.invoke(model)
        self.assertEqual(90.0, model.calls[1]["started"] - model.calls[0]["started"])

    def test_mixed_rate_limits_and_timeouts_share_attempt_count(self):
        cases = (("http_429", "inband_504", [1000.0, 1060.0, 1120.0]),
                 ("http_504", "api_429", [1000.0, 1030.0, 1150.0]))
        for number, (first, second, starts) in enumerate(cases):
            with self.subTest(first=first, second=second):
                self.clock.value = 1000.0
                model = self.model(first, second, "success", name=f"mixed_{number}")
                self.invoke(model)
                self.assertEqual(starts, [call["started"] for call in model.calls])
                self.assertEqual(3, len(model.calls))
                self.assertEqual(5.0, self.clock.value - starts[-1])
                self.assertEqual([1, 2, 3], [row["attempt"] for row in self.journal(model) if row["event"] == "attempt_start"])
                self.assertEqual(1, len({row["group_id"] for row in self.journal(model)}))
                self.assert_gate_unchanged()

    def test_rate_limit_and_mixed_exhaustion_never_get_a_fourth_attempt(self):
        for number, actions in enumerate((("http_429", "inband_429", "api_429"), ("http_429", "inband_504", "api_429"))):
            with self.subTest(actions=actions):
                model = self.model(*actions, "success", name=f"rate_exhausted_{number}")
                with self.assertRaises(OpenRouterProtocolError) as caught:
                    self.invoke(model)
                self.assertEqual(3, len(model.calls))
                self.assertEqual("offline-record-3", caught.exception.record_id)
                rows = self.journal(model)
                expected = [60.0, 120.0, None] if number == 0 else [60.0, 60.0, None]
                self.assertEqual(expected, [row["delay_seconds"] for row in rows if row["event"] == "attempt_error"])
                self.assertEqual("attempts_exhausted", rows[-2]["decision"])
                self.assertEqual("retry_attempts_exhausted", rows[-1]["outcome"])
                self.assertEqual(6, len(self.wire(model)))
                self.assertFalse((self.runtime / "STOP").exists())

    def test_visible_unparsed_or_conflicting_429_outcomes_are_never_retried(self):
        partial = {"error": {"code": 429}, "choices": [{"finish_reason": "error", "error": {"code": 429},
                   "message": {"content": "A partial patient answer."}}]}
        missing_choice_code = {"choices": [{"finish_reason": "error", "error": {"code": 429}},
                                         {"finish_reason": "error", "error": {}}]}
        cases = ({"kind": "inband_429", "visible": "A partial answer."},
                 {"kind": "http_429", "raw_override": partial}, {"kind": "api_429", "raw_override": partial},
                 {"kind": "http_429", "raw_override": {"unparsed_body": "unknown"}},
                 {"kind": "http_429", "raw_override": None},
                 {"kind": "http_429", "raw_override": {"error": {"code": 401}}},
                 {"kind": "api_429", "raw_override": {"error": {"code": None}}},
                 {"kind": "inband_429", "raw_override": missing_choice_code})
        for number, action in enumerate(cases):
            with self.subTest(action=action):
                model = self.model(action, "success", name=f"unsafe_429_{number}")
                with self.assertRaises(OpenRouterError):
                    self.invoke(model)
                self.assertEqual(1, len(model.calls))
                self.assertFalse(next(row for row in self.journal(model) if row["event"] == "attempt_error")["retry_eligible"])
        self.assertEqual([], self.clock.sleeps)

    def test_stop_interrupts_429_wait_within_one_second_without_another_call(self):
        model = self.model({"kind": "inband_429", "retry_after": "90"}, "success")
        self.clock.on_sleep = lambda: (self.runtime / "STOP").write_text("operator stop\n")
        with self.assertRaises(policy.RetryInterrupted):
            self.invoke(model)
        self.assertEqual(1, len(model.calls))
        self.assertEqual([1.0], self.clock.sleeps)
        self.assertEqual("interrupted_by_stop", self.journal(model)[-1]["outcome"])
        self.assert_gate_unchanged()


if __name__ == "__main__":
    unittest.main()
