"""Offline tests: mocked HTTP and fake credentials; no live API invocation."""
import copy
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from uuid import UUID

import openrouter_transport as transport
from openrouter_inband_errors import OpenRouterInBandError, install_inband_error_handling

FAKE_KEY = "sk-or-inband-test-fake-secret"


def raw_response(code=504, *, finish="error", content=None, error_present=True):
    choice = {"finish_reason": finish, "native_finish_reason": None,
              "message": {"role": "assistant", "content": content,
                          "reasoning": "PRIVATE NATIVE REASONING: must never become a patient reply."}}
    if error_present:
        choice["error"] = {"message": "Upstream idle timeout exceeded", "metadata": {"error_type": "timeout"}}
        if code is not None:
            choice["error"]["code"] = code
    return {"id": "gen-inband-native", "model": transport.MODEL_ID, "choices": [choice],
            "usage": {"prompt_tokens": 40, "completion_tokens": 21, "total_tokens": 61,
                      "completion_tokens_details": {"reasoning_tokens": 20}}}


def last_json_lines(path):
    """Read backwards, so the fixture test reads only the last error record."""
    with path.open("rb") as stream:
        stream.seek(0, 2)
        position = stream.tell()
        pending = b""
        while position:
            size = min(4096, position)
            position -= size
            stream.seek(position)
            pending = stream.read(size) + pending
            pieces = pending.split(b"\n")
            pending = pieces[0]
            for line in reversed(pieces[1:]):
                if line.strip():
                    yield line
        if pending.strip():
            yield pending


class TestOpenRouterInBandErrors(unittest.TestCase):
    def setUp(self):
        self.original = transport._normalized_response
        self.addCleanup(setattr, transport, "_normalized_response", self.original)
        install_inband_error_handling()
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        key_file = self.root / "fake-key.txt"
        key_file.write_text(FAKE_KEY)
        env = patch.dict(os.environ, {"OPENROUTER_API_KEY_FILE": str(key_file)})
        env.start()
        self.addCleanup(env.stop)
        self.records_path = self.root / "records.jsonl"
        self.model = transport.OpenRouterModel("gemini-2.5-pro", records_path=self.records_path)
        https = patch("openrouter_transport.http.client.HTTPSConnection")
        self.factory = https.start()
        self.addCleanup(https.stop)
        self.connection = self.factory.return_value
        self.http_response = self.connection.getresponse.return_value
        self.http_response.status = 200
        self.http_response.getheader.return_value = "11"

    def call_http(self, raw):
        self.http_response.read.return_value = json.dumps(raw).encode()
        return self.model.generate_content(
            '  Unchanged è prompt\n"Q"  ',
            {"temperature": 0.7, "max_output_tokens": 4096, "top_p": 0.95,
             "top_k": 40, "stop_sequences": ["Therapist:"]},
            {"legacy": "safety"},
        )

    def records(self):
        return [json.loads(line) for line in self.records_path.read_text().splitlines()]

    def test_direct_wrapper_does_not_fabricate_http_status_or_response_id(self):
        with self.assertRaises(OpenRouterInBandError) as caught:
            transport._normalized_response(raw_response())
        error = caught.exception
        self.assertEqual(error.upstream_code, 504)
        self.assertIsNone(error.status_code)
        self.assertIsNone(error.response.status_code)
        self.assertIsNone(error.record_id)
        self.assertIsInstance(error, transport.OpenRouterError)
        self.assertNotIn("REASONING", str(error))

    def test_http_200_upstream_codes_are_archived_as_errors_without_internal_retry(self):
        for code in (504, 429, 401):
            with self.subTest(code=code):
                before = self.connection.request.call_count
                raw = raw_response(code)
                with self.assertRaises(OpenRouterInBandError) as caught:
                    self.call_http(raw)
                error = caught.exception
                self.assertEqual(error.upstream_code, code)
                self.assertIn(str(code), str(error))
                self.assertEqual(error.status_code, 200)
                self.assertEqual(error.response.status_code, 200)
                self.assertEqual(error.response.headers["Retry-After"], "11")
                self.assertEqual(self.connection.request.call_count, before + 1)
                records = self.records()[-2:]
                self.assertEqual([r["event"] for r in records], ["request", "error"])
                self.assertEqual(records[1]["http_status"], 200)
                self.assertEqual(records[1]["response"], raw)
                self.assertEqual(records[1]["error"]["type"], "OpenRouterInBandError")
                UUID(error.record_id)
                self.assertEqual(records[0]["record_id"], error.record_id)
                self.assertEqual(records[1]["record_id"], error.record_id)
                if code == 401:
                    self.assertNotIn("service unavailable", str(error))

    def test_missing_code_reports_service_unavailable_without_inventing_numeric_code(self):
        for raw in (raw_response(None), raw_response(None, error_present=False)):
            with self.subTest(error_present="error" in raw["choices"][0]):
                with self.assertRaises(OpenRouterInBandError) as caught:
                    self.call_http(raw)
                self.assertIsNone(caught.exception.upstream_code)
                self.assertIn("service unavailable", str(caught.exception))
                for invented in ("429", "500", "503", "504"):
                    self.assertNotIn(invented, str(caught.exception))
                self.assertEqual(caught.exception.status_code, 200)

    def test_error_with_partial_content_or_stop_cannot_become_patient_text(self):
        for finish in ("error", "stop", "length"):
            with self.subTest(finish=finish):
                with self.assertRaises(OpenRouterInBandError) as caught:
                    self.call_http(raw_response(504, finish=finish, content="PARTIAL PATIENT TEXT"))
                self.assertNotIn("PARTIAL PATIENT TEXT", str(caught.exception))
                self.assertNotIn("PRIVATE NATIVE REASONING", str(caught.exception))

    def test_all_choices_are_checked_before_original_normalization(self):
        delegate = Mock()
        with patch.object(transport, "_normalized_response", delegate):
            install_inband_error_handling()
            raw = raw_response(content="Complete first choice", finish="stop", error_present=False)
            raw["choices"].append(raw_response()["choices"][0])
            with self.assertRaises(OpenRouterInBandError):
                transport._normalized_response(raw)
            delegate.assert_not_called()

    def test_stop_length_safety_and_normalized_payloads_are_unchanged(self):
        for finish in ("stop", "length", "content_filter"):
            with self.subTest(finish=finish):
                raw = raw_response(content="Original visible text.", finish=finish, error_present=False)
                raw["choices"][0]["error"] = None
                expected = self.original(copy.deepcopy(raw)).to_dict()
                actual = transport._normalized_response(copy.deepcopy(raw)).to_dict()
                self.assertEqual(actual, expected)

    def test_request_mapping_is_identical_to_v1(self):
        with self.assertRaises(OpenRouterInBandError):
            self.call_http(raw_response())
        body = json.loads(self.connection.request.call_args.kwargs["body"])
        self.assertEqual(body, {
            "model": transport.MODEL_ID, "messages": [{"role": "user", "content": '  Unchanged è prompt\n"Q"  '}],
            "provider": {"require_parameters": True, "allow_fallbacks": True},
            "temperature": 0.7, "max_tokens": 4096, "top_p": 0.95, "stop": ["Therapist:"],
        })
        self.assertEqual(self.records()[0]["request"], body)

    def test_native_error_provenance_is_redacted_by_existing_handler(self):
        raw = raw_response()
        raw["choices"][0]["error"]["message"] += " " + FAKE_KEY
        raw["choices"][0]["message"]["reasoning"] += " " + FAKE_KEY
        with self.assertRaises(OpenRouterInBandError) as caught:
            self.call_http(raw)
        text = self.records_path.read_text()
        self.assertNotIn(FAKE_KEY, text + str(caught.exception))
        event = self.records()[-1]
        self.assertIn("[REDACTED]", event["response"]["choices"][0]["error"]["message"])
        self.assertEqual(event["response"]["id"], raw["id"])
        self.assertEqual(event["retry_after"], "11")

    def test_installation_is_idempotent_and_changes_only_normalizer(self):
        transport._normalized_response = self.original
        before = dict(vars(transport))
        first = install_inband_error_handling()
        second = install_inband_error_handling()
        self.assertIs(first, second)
        self.assertIs(first.__wrapped__, self.original)
        changed = {key for key in before if before[key] is not vars(transport)[key]}
        self.assertEqual(changed, {"_normalized_response"})
        self.assertEqual(set(before), set(vars(transport)))

    def test_code_values_do_not_leak_native_messages(self):
        for code, expected in (("429", 429), (True, None), ("unknown", None)):
            with self.subTest(code=code):
                with self.assertRaises(OpenRouterInBandError) as caught:
                    transport._normalized_response(raw_response(code))
                self.assertEqual(caught.exception.upstream_code, expected)
                self.assertNotIn("Upstream idle timeout exceeded", str(caught.exception))

    def test_latest_real_juanita_s4_error_fixture_is_rejected(self):
        fixture = Path(__file__).resolve().parents[1] / "longitudinal/results/juanita_delgado_001/full/session_04/api_records.jsonl"
        if not fixture.exists():
            self.skipTest("Archived Juanita S4 fixture is unavailable outside this audit workspace")
        native = None
        for line in last_json_lines(fixture):
            record = json.loads(line)
            response = record.get("response") or {}
            candidate = response.get("_openrouter", {}).get("response")
            if isinstance(candidate, dict) and any(
                isinstance(choice, dict) and (choice.get("error") is not None or choice.get("finish_reason") == "error")
                for choice in candidate.get("choices", [])
            ):
                native = candidate
                break
        self.assertIsNotNone(native, "No archived native in-band error was found")
        with self.assertRaises(OpenRouterInBandError) as caught:
            transport._normalized_response(native)
        self.assertEqual(caught.exception.upstream_code, 504)
        self.assertIsNone(caught.exception.status_code)
        # Never print or include the fixture's reasoning in assertion messages.
        self.assertEqual(str(caught.exception), "OpenRouter upstream error code 504: in-band generation failure.")
        self.connection.request.assert_not_called()


if __name__ == "__main__":
    unittest.main()
