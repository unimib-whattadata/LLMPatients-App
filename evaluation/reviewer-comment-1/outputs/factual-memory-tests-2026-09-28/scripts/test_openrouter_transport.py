"""Offline transport regressions: HTTP is always mocked; only SDK objects are real."""
import contextlib
import io
import json
import logging
import os
import tempfile
import traceback
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
from uuid import UUID

from vertexai.generative_models import GenerationResponse

from openrouter_transport import (
    ENDPOINT, MODEL_ID, OpenRouterError, OpenRouterHTTPError,
    OpenRouterModel, OpenRouterProtocolError,
)

FAKE_KEY = "sk-or-unit-test-secret-not-a-real-credential"


def native_response(*, content="1", finish="stop", model=MODEL_ID):
    return {"id": "gen-native-123", "model": model,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content,
                                                   "reasoning": "Native private reasoning.",
                                                   "reasoning_details": [{"text": "More reasoning."}]},
                         "finish_reason": finish}],
            "usage": {"prompt_tokens": 40, "completion_tokens": 21, "total_tokens": 61,
                      "completion_tokens_details": {"reasoning_tokens": 20}}}


class TestOpenRouterTransport(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.key_file = self.root / "fake-key.txt"
        self.key_file.write_text(FAKE_KEY + "\n")
        self.records_file = self.root / "records.jsonl"
        env = patch.dict(os.environ, {"OPENROUTER_API_KEY_FILE": str(self.key_file)})
        env.start()
        self.addCleanup(env.stop)
        self.https = patch("openrouter_transport.http.client.HTTPSConnection")
        self.factory = self.https.start()
        self.addCleanup(self.https.stop)
        self.connection = self.factory.return_value
        self.http_response = self.connection.getresponse.return_value
        self.http_response.status = 200
        self.http_response.getheader.return_value = None
        self.http_response.read.return_value = json.dumps(native_response()).encode()
        self.model = OpenRouterModel("gemini-2.5-pro", records_path=self.records_file)

    def records(self):
        return [json.loads(line) for line in self.records_file.read_text().splitlines()]

    def sent_body(self):
        return json.loads(self.connection.request.call_args.kwargs["body"])

    def test_prompt_and_supported_parameters_are_exact(self):
        prompt = '  Accento è; newline\n"quotation"\tEND  '
        config = {"temperature": 0.1, "max_output_tokens": 220, "top_p": 0.95,
                  "top_k": 40, "stop_sequences": ["\nTherapist:", "Therapist:"]}
        result = self.model.generate_content(prompt, config, {"vertex_safety": "unchanged"})
        body = self.sent_body()
        self.assertEqual(body, {"model": MODEL_ID, "messages": [{"role": "user", "content": prompt}],
                                "temperature": 0.1, "max_tokens": 220, "top_p": 0.95,
                                "stop": config["stop_sequences"],
                                "provider": {"require_parameters": True, "allow_fallbacks": True}})
        self.assertEqual(body["messages"][0]["content"].encode(), prompt.encode())
        self.assertEqual(result.text, "1")
        provenance = result.to_dict()["_openrouter"]
        self.assertEqual(provenance["omitted_legacy_generation_parameters"], ["top_k"])
        self.assertFalse(provenance["safety_settings_forwarded"])
        self.assertEqual(provenance["request"], body)
        self.assertEqual(provenance["endpoint"], ENDPOINT)

    def test_thinking_budget_is_forwarded_and_archived(self):
        self.model.generate_content("Extract facts", {
            "max_output_tokens": 8192, "thinking_config": {"thinking_budget": 1024},
        })
        self.assertEqual(self.sent_body()["reasoning"], {"max_tokens": 1024})
        self.assertEqual(self.records()[0]["request"]["reasoning"], {"max_tokens": 1024})

    def test_invalid_thinking_budget_fails_before_network(self):
        for budget in [True, "1024", 0, 8192]:
            with self.subTest(budget=budget), self.assertRaises(ValueError):
                self.model.generate_content("Extract facts", {
                    "max_output_tokens": 8192, "thinking_config": {"thinking_budget": budget},
                })
        self.connection.request.assert_not_called()

    def test_real_sdk_candidates_usage_and_native_provenance(self):
        raw = native_response()
        result = self.model.generate_content("P")
        normalized = result.to_dict()
        self.assertIsInstance(result._sdk_response, GenerationResponse)
        self.assertEqual(result.candidates[0].finish_reason.name, "STOP")
        self.assertEqual(result.usage_metadata.prompt_token_count, 40)
        self.assertEqual(result.usage_metadata.candidates_token_count, 1)
        self.assertEqual(result.usage_metadata.thoughts_token_count, 20)
        self.assertEqual(normalized["response_id"], raw["id"])
        self.assertEqual(normalized["model_version"], "gemini-2.5-pro")
        self.assertEqual(normalized["_openrouter"]["response"], raw)
        records = self.records()
        self.assertEqual([r["event"] for r in records], ["request", "response"])
        UUID(records[0]["record_id"])
        self.assertEqual(records[0]["record_id"], records[1]["record_id"])
        self.assertEqual(normalized["_openrouter"]["archive_record_id"], records[1]["record_id"])
        self.assertEqual(records[1]["response"], raw)
        self.assertNotIn(FAKE_KEY, self.records_file.read_text())

    def test_finish_flags_preserve_truncation_and_safety(self):
        for native, normalized in (("stop", "STOP"), ("length", "MAX_TOKENS"),
                                   ("content_filter", "SAFETY"), ("tool_calls", "OTHER"), (None, "OTHER")):
            with self.subTest(native=native):
                self.http_response.read.return_value = json.dumps(native_response(finish=native)).encode()
                result = self.model.generate_content("P")
                self.assertEqual(result.candidates[0].finish_reason.name, normalized)
                self.assertEqual(result.to_dict()["candidates"][0]["finish_reason"], normalized)

    def test_reasoning_fields_and_parts_are_never_patient_text(self):
        content = [{"type": "reasoning", "text": "Do not show reasoning."},
                   {"type": "text", "thought": True, "text": "Thought part."},
                   {"type": "text", "text": "The visible answer."}]
        self.http_response.read.return_value = json.dumps(native_response(content=content)).encode()
        result = self.model.generate_content("P")
        self.assertEqual(result.text, "The visible answer.")
        self.assertEqual(result.candidates[0].content.parts[0].text, "The visible answer.")
        self.assertEqual(result.to_dict()["_openrouter"]["response"]["choices"][0]["message"]["content"], content)

    def test_reasoning_only_completion_has_no_visible_parts(self):
        self.http_response.read.return_value = json.dumps(native_response(content=None, finish="length")).encode()
        result = self.model.generate_content("P")
        self.assertEqual(result.candidates[0].finish_reason.name, "MAX_TOKENS")
        self.assertEqual(result.candidates[0].content.parts, [])
        with self.assertRaises(ValueError):
            _ = result.text

    def test_http_429_retry_after_is_exposed_without_retry_or_secret_leak(self):
        self.http_response.status = 429
        self.http_response.getheader.return_value = "17"
        self.http_response.read.return_value = json.dumps({"error": {"code": 429, "message": f"Rejected {FAKE_KEY}"}}).encode()
        output = io.StringIO()
        handler = logging.StreamHandler(output)
        logging.getLogger().addHandler(handler)
        try:
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                try:
                    self.model.generate_content("P")
                    self.fail("Expected a 429 error")
                except OpenRouterHTTPError as error:
                    self.assertEqual(error.status_code, 429)
                    self.assertEqual(error.response.headers["Retry-After"], "17")
                    self.assertIn("429", str(error))
                    traceback.print_exception(error)
        finally:
            logging.getLogger().removeHandler(handler)
        self.assertEqual(self.connection.request.call_count, 1)
        self.assertNotIn(FAKE_KEY, output.getvalue() + self.records_file.read_text())
        record = self.records()[-1]
        self.assertEqual(record["event"], "error")
        self.assertEqual(record["http_status"], 429)
        self.assertEqual(record["response"]["error"]["code"], 429)
        self.assertIn("[REDACTED]", record["response"]["error"]["message"])

    def test_redirect_never_sends_credentials_to_another_endpoint(self):
        self.http_response.status = 302
        self.http_response.read.return_value = b"redirect"
        with self.assertRaises(OpenRouterHTTPError):
            self.model.generate_content("P")
        self.assertEqual(self.factory.call_count, 1)
        self.assertEqual(self.factory.call_args.args[0], "openrouter.ai")
        self.assertEqual(self.connection.request.call_count, 1)
        self.assertEqual(self.connection.request.call_args.args[:2], ("POST", "/api/v1/chat/completions"))
        self.assertEqual(self.factory.call_args.kwargs["timeout"], 120.0)

    def test_wrong_or_missing_model_is_rejected_and_archived(self):
        for model in ("google/gemini-2.5-flash", None, "google/gemini-2.5-pro:other"):
            with self.subTest(model=model):
                raw = native_response(model=model)
                self.http_response.read.return_value = json.dumps(raw).encode()
                with self.assertRaises(OpenRouterProtocolError):
                    self.model.generate_content("P")
                self.assertEqual(self.records()[-1]["response"], raw)
                self.assertEqual(self.records()[-1]["event"], "error")

    def test_key_is_loaded_only_on_invocation_and_not_retained(self):
        with patch.object(Path, "read_text", side_effect=AssertionError("No key read allowed")):
            model = OpenRouterModel(MODEL_ID, records_path=self.records_file)
        self.assertNotIn(FAKE_KEY, repr(model.__dict__))
        self.key_file.unlink()
        with self.assertRaises(OpenRouterError) as raised:
            model.generate_content("P")
        self.assertNotIn(FAKE_KEY, str(raised.exception))
        self.connection.request.assert_not_called()

    def test_model_changes_reasoning_overrides_and_nonfinite_timeout_are_rejected(self):
        with self.assertRaises(ValueError):
            OpenRouterModel("google/gemini-2.5-flash")
        for timeout in (float("inf"), float("nan"), 0, -1):
            with self.assertRaises(ValueError):
                OpenRouterModel(MODEL_ID, timeout_seconds=timeout)
        with self.assertRaises(ValueError):
            self.model.generate_content("P", {"reasoning": {"effort": "none"}})
        self.connection.request.assert_not_called()

    def test_request_and_result_are_flushed_and_synced(self):
        with patch("openrouter_transport.os.fsync", wraps=os.fsync) as fsync:
            self.model.generate_content("P")
        self.assertEqual(fsync.call_count, 2)

    def test_archive_environment_path_is_honored_and_explicit_path_wins(self):
        destination = self.root / "env-selected.jsonl"
        with patch.dict(os.environ, {"OPENROUTER_API_RECORDS_PATH": str(destination)}):
            from_environment = OpenRouterModel(MODEL_ID)
            self.assertEqual(from_environment.records_path, destination)
            from_environment.generate_content("P")
            explicit = OpenRouterModel(MODEL_ID, records_path=self.records_file)
            self.assertEqual(explicit.records_path, self.records_file)
        self.assertEqual(len(destination.read_text().splitlines()), 2)

    def test_concurrent_archives_remain_complete_and_correlated(self):
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda n: self.model.generate_content(f"Prompt {n}"), range(8)))
        records = self.records()
        self.assertEqual(len(records), 16)
        ids = {record["record_id"] for record in records}
        self.assertEqual(len(ids), 8)
        for record_id in ids:
            pair = [r for r in records if r["record_id"] == record_id]
            self.assertEqual([r["event"] for r in pair], ["request", "response"])
            self.assertEqual(pair[0]["request"], pair[1]["request"])

    def test_timeout_exception_is_sanitized_and_not_retried(self):
        self.connection.request.side_effect = TimeoutError(f"timeout with header Bearer {FAKE_KEY}")
        with self.assertRaises(OpenRouterError) as caught:
            self.model.generate_content("P")
        self.assertIn("timed out", str(caught.exception))
        self.assertNotIn(FAKE_KEY, str(caught.exception) + self.records_file.read_text())
        self.assertEqual(self.connection.request.call_count, 1)


if __name__ == "__main__":
    unittest.main()
