"""Resume-06: at most three total attempts for proven timeouts/rate limits.

The frozen transport still owns every HTTP call, native archive and response
normalization. This wrapper never reads credentials, changes the request, resets
STOP/the gate, adds a model fallback, or retries an uncertain archived outcome.
The caller's original SerialGate must remain held throughout this wrapper.
An excessive Retry-After raises immediately; the caller publishes global STOP.
"""
from __future__ import annotations

import copy
from collections.abc import Mapping
from email.utils import parsedate_to_datetime
import fcntl
import hashlib
import importlib
import json
import math
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

MODEL = "google/gemini-2.5-pro"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
MAX_ATTEMPTS = 3
RETRY_DELAYS = (30.0, 60.0)
RATE_LIMIT_RETRY_DELAYS = (60.0, 120.0)
MAX_RETRY_WAIT = 300.0
MIN_START_INTERVAL = 5.0
POLICY_VERSION = "resume-06-v1"


class RetryPolicyError(RuntimeError):
    def __init__(self, message, *, record_id=None):
        super().__init__(message)
        self.record_id = record_id


class RetryInterrupted(RetryPolicyError):
    pass


class RetryWaitLimitExceeded(RetryPolicyError):
    pass


def _require(condition, message, *, record_id=None):
    if not condition:
        raise RetryPolicyError(message, record_id=record_id)


def _json_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _hash(value):
    return hashlib.sha256(_json_bytes(value)).hexdigest()


def _journal(path, record):
    """Append and fsync before another attempt or a successful return."""
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps({"timestamp": datetime.now(timezone.utc).isoformat(), **record},
                         ensure_ascii=False, allow_nan=False) + "\n"
    with path.open("a", encoding="utf-8") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
        try:
            stream.write(encoded)
            stream.flush()
            os.fsync(stream.fileno())
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def _check(runtime, expected_gate=None):
    if (runtime / "STOP").exists():
        raise RetryInterrupted("Global STOP interrupted the timeout retry policy")
    try:
        state = json.loads((runtime / "request-gate.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RetryPolicyError("Cannot establish the original global request gate") from exc
    ticket = state.get("in_flight")
    _require(isinstance(ticket, dict) and isinstance(ticket.get("gate_request_id"), str)
             and ticket["gate_request_id"] and ticket.get("pid") == os.getpid(),
             "Timeout policy requires the caller's active original SerialGate")
    for value in (state.get("last_started"), ticket.get("started_at")):
        _require(isinstance(value, (int, float)) and not isinstance(value, bool)
                 and math.isfinite(value) and value >= 0, "Invalid original gate timestamp")
    _require(state["last_started"] == ticket["started_at"], "Original gate timestamps disagree")
    if expected_gate is not None:
        _require(state == expected_gate, "Original gate changed during timeout retry")
    return state


def _wait_until(deadline, runtime, gate):
    _require(math.isfinite(deadline), "Invalid retry wait deadline")
    previous = time.monotonic()
    while True:
        _check(runtime, gate)
        current = time.monotonic()
        _require(math.isfinite(current) and current >= previous, "Monotonic clock cannot establish retry pacing")
        previous = current
        remaining = deadline - current
        if remaining <= 0:
            return
        time.sleep(min(1.0, remaining))


def _wire_body(prompt, config):
    """The declared frozen mapping, used only to verify its archived requests."""
    _require(isinstance(prompt, str), "Prompt must remain a string")
    allowed = {"temperature", "max_output_tokens", "top_p", "stop_sequences", "top_k", "thinking_config"}
    _require(set(config) <= allowed, "Unexpected generation parameter")
    body = {"model": MODEL, "messages": [{"role": "user", "content": prompt}],
            "provider": {"require_parameters": True, "allow_fallbacks": False},
            "plugins": [{"id": "context-compression"}]}
    for old, new in (("temperature", "temperature"), ("max_output_tokens", "max_tokens"),
                     ("top_p", "top_p"), ("stop_sequences", "stop")):
        if old in config and config[old] is not None:
            body[new] = copy.deepcopy(config[old])
    if "thinking_config" in config:
        thinking = config["thinking_config"]
        _require(isinstance(thinking, dict) and set(thinking) == {"thinking_budget"}, "Unexpected thinking configuration")
        body["reasoning"] = {"max_tokens": thinking["thinking_budget"]}
    return body


def _archive_cursor(path):
    _require(not path.is_symlink(), "Native archive cannot be a symlink")
    data = path.read_bytes() if path.exists() else b""
    _require(not data or data.endswith(b"\n"), "Native archive has an incomplete preexisting record")
    try:
        records = [json.loads(line) for line in data.splitlines() if line.strip()]
        ids = {record["record_id"] for record in records}
    except (ValueError, KeyError, TypeError) as exc:
        raise RetryPolicyError("Native archive has an invalid preexisting record") from exc
    return len(data), hashlib.sha256(data).hexdigest(), ids


def _archive_outcome(path, cursor, body, expected_event, error=None):
    """Prove one request has one complete, matching native terminal record."""
    size, prefix_hash, previous_ids = cursor
    data = path.read_bytes() if path.exists() else b""
    _require(len(data) >= size and hashlib.sha256(data[:size]).hexdigest() == prefix_hash,
             "Earlier native archive bytes changed during an attempt")
    tail = data[size:]
    _require(tail and tail.endswith(b"\n"), "Native attempt has no complete archived outcome")
    try:
        records = [json.loads(line) for line in tail.splitlines() if line.strip()]
    except ValueError as exc:
        raise RetryPolicyError("Native attempt archive is not complete JSONL") from exc
    _require(len(records) == 2 and all(isinstance(row, dict) for row in records),
             "Native attempt has missing, duplicate or uncertain outcomes")
    request, outcome = records
    record_id = request.get("record_id")
    _require(isinstance(record_id, str) and record_id and record_id not in previous_ids
             and outcome.get("record_id") == record_id, "Native attempt record ID mismatch")
    _require(request.get("event") == "request" and outcome.get("event") == expected_event,
             "Native attempt terminal event mismatch", record_id=record_id)
    for record in records:
        _require(record.get("endpoint") == ENDPOINT and record.get("request") == body
                 and record.get("omitted_legacy_generation_parameters") == ["top_k"]
                 and record.get("safety_settings_forwarded") is False,
                 "Native request body/provenance changed", record_id=record_id)
    if error is not None:
        _require(getattr(error, "record_id", None) == record_id
                 and outcome.get("http_status") == getattr(error, "status_code", None)
                 and outcome.get("error", {}).get("type") == type(error).__name__
                 and outcome.get("error", {}).get("message") == str(error),
                 "Native error identity or archival outcome mismatch", record_id=record_id)
        headers = getattr(getattr(error, "response", None), "headers", None)
        _require(isinstance(headers, Mapping), "Native error has no inspectable response headers", record_id=record_id)
        retry_headers = [value for key, value in headers.items()
                         if isinstance(key, str) and key.lower() == "retry-after"]
        _require(len(retry_headers) <= 1
                 and (retry_headers[0] if retry_headers else None) == outcome.get("retry_after"),
                 "Native Retry-After header differs from its archived value", record_id=record_id)
    return outcome


def _numeric_code(value):
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, str) and value.isascii() and value.isdecimal():
        return int(value)
    return None


def _no_visible_completion(raw):
    """Reasoning alone is not patient text; malformed/unparsed payloads are uncertain."""
    if raw is None:
        return True
    if not isinstance(raw, dict) or "unparsed_body" in raw:
        return False
    choices = raw.get("choices")
    if choices is None:
        return isinstance(raw.get("error"), dict)
    if not isinstance(choices, list) or not choices:
        return False
    for choice in choices:
        if not isinstance(choice, dict) or choice.get("finish_reason") not in {None, "error"}:
            return False
        if choice.get("error") is None and choice.get("finish_reason") != "error":
            return False
        message = choice.get("message")
        if message is None:
            continue
        if not isinstance(message, dict):
            return False
        content = message.get("content")
        if isinstance(content, str):
            if content.strip():
                return False
        elif isinstance(content, list):
            for part in content:
                if not isinstance(part, dict) or part.get("type") != "text" or not isinstance(part.get("text"), str):
                    return False
                if not part.get("thought") and part["text"].strip():
                    return False
        elif content is not None:
            return False
    return True


def _retry_reason(error, archived, transport):
    if not isinstance(error, transport.OpenRouterError):
        return None
    raw = archived.get("response")
    if not _no_visible_completion(raw):
        return None
    kind = type(error).__name__
    status = archived.get("http_status")
    if kind == "OpenRouterHTTPError" and status == 504:
        return "explicit_http_504_without_visible_completion"
    if kind == "OpenRouterHTTPError" and status == 429 and _rate_limit_payload(raw, require_top_code=False):
        return "explicit_http_429_without_visible_completion"
    if (kind == "OpenRouterInBandError" and status == 200
            and getattr(error, "upstream_code", None) == 429 and _all_choice_codes(raw, 429)):
        return "explicit_native_429_without_visible_completion"
    if kind == "OpenRouterProtocolError" and status == 200 and _rate_limit_payload(raw, require_top_code=True):
        return "explicit_api_429_without_visible_completion"
    if kind == "OpenRouterInBandError" and status == 200 and getattr(error, "upstream_code", None) == 504:
        codes = [_numeric_code(choice.get("error", {}).get("code"))
                 for choice in (raw or {}).get("choices", []) if isinstance(choice.get("error"), dict)]
        if codes and all(code == 504 for code in codes):
            return "explicit_native_504_without_visible_completion"
    if (kind == "OpenRouterError" and str(error) == "OpenRouter request timed out."
            and raw is None and status in (None, 200)):
        return "archived_frozen_client_timeout_without_response"
    return None


def _all_choice_codes(raw, code):
    choices = raw.get("choices") if isinstance(raw, dict) else None
    return bool(isinstance(choices, list) and choices and all(
        isinstance(choice, dict) and isinstance(choice.get("error"), dict)
        and _numeric_code(choice["error"].get("code")) == code for choice in choices))


def _rate_limit_payload(raw, *, require_top_code):
    """A parsed native error must not contradict the explicit rate-limit code."""
    if not isinstance(raw, dict):
        return False
    top = raw.get("error")
    if isinstance(top, dict):
        if (require_top_code or "code" in top) and _numeric_code(top.get("code")) != 429:
            return False
        return raw.get("choices") is None or _all_choice_codes(raw, 429)
    return not require_top_code and _all_choice_codes(raw, 429)


def _retry_after(value):
    """Decode native Retry-After; malformed values use the documented base wait."""
    result = {"retry_after_value": value, "retry_after_status": "absent",
              "retry_after_delay_seconds": None}
    if value is None:
        return result
    result["retry_after_status"] = "invalid"
    if not isinstance(value, str):
        return result
    value = value.strip()
    if re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", value, flags=re.ASCII):
        delay = float(value)
        # A numeric value too large for float is still explicitly above the cap.
        if not math.isfinite(delay):
            result["retry_after_status"] = "numeric_exceeds_limit"
            result["retry_after_exceeds_maximum"] = True
            return result
        result.update(retry_after_status="numeric_seconds", retry_after_delay_seconds=delay)
        return result
    try:
        date = parsedate_to_datetime(value)
        if date is None or date.tzinfo is None:
            return result
        current = time.time()
        _require(math.isfinite(current), "Cannot establish Retry-After HTTP-date pacing")
        delay = max(0.0, date.timestamp() - current)
        if not math.isfinite(delay):
            return result
    except (ValueError, TypeError, OverflowError):
        return result
    result.update(retry_after_status="http_date", retry_after_delay_seconds=delay)
    return result


def _retry_decision(reason, archived, attempt):
    header = _retry_after(archived.get("retry_after"))
    rate_limit = reason is not None and "429" in reason
    delay_table = RATE_LIMIT_RETRY_DELAYS if rate_limit else RETRY_DELAYS
    base = delay_table[attempt - 1] if reason and attempt < MAX_ATTEMPTS else None
    effective = max(base, header["retry_after_delay_seconds"] or 0.0) if base is not None and rate_limit else base
    if rate_limit and header.get("retry_after_exceeds_maximum") is True:
        effective = None  # Its explicit numeric value cannot be represented finitely.
    exceeds = rate_limit and (header.get("retry_after_exceeds_maximum") is True
                             or (header["retry_after_delay_seconds"] or 0.0) > MAX_RETRY_WAIT)
    decision = ("not_retryable" if reason is None else "attempts_exhausted" if attempt >= MAX_ATTEMPTS
                else "retry_after_exceeds_maximum" if exceeds else "retry")
    return {**header, "base_delay_seconds": base, "effective_delay_seconds": effective,
            "max_retry_wait_seconds": MAX_RETRY_WAIT, "decision": decision,
            "will_retry": decision == "retry", "delay_seconds": effective if decision == "retry" else None}


def install_retry_policy(runtime: Path):
    """Patch only OpenRouterModel; return the installed class (idempotent per runtime)."""
    runtime = Path(runtime).resolve()
    transport = importlib.import_module("openrouter_transport")
    base_model = transport.OpenRouterModel
    installed = getattr(base_model, "_timeout_retry_runtime", None)
    if installed is not None:
        _require(installed == str(runtime), "A timeout policy is already installed for a different runtime")
        _require(getattr(base_model, "_timeout_retry_policy_version", None) == POLICY_VERSION,
                 "A different retry policy is already installed; a fresh worker is required")
        return base_model

    class TimeoutRetryOpenRouterModel(base_model):
        _timeout_retry_runtime = str(runtime)
        _timeout_retry_policy_version = POLICY_VERSION

        def generate_content(self, prompt, generation_config=None, safety_settings=None):
            gate = _check(runtime)
            _require(self.model_id == MODEL, "Timeout retry policy cannot substitute the model")
            path = Path(self.records_path).resolve()
            _require(path.is_relative_to(runtime) and path.name == "openrouter-api-records.jsonl",
                     "Native archive is outside the active runtime/session")
            config = copy.deepcopy(dict(generation_config or {}))
            safety = copy.deepcopy(safety_settings)
            body = _wire_body(prompt, config)
            common = {"group_id": str(uuid4()), "gate_request_id": gate["in_flight"]["gate_request_id"],
                      "request_sha256": _hash(body), "invocation_sha256": _hash({"prompt": prompt,
                          "generation_config": config, "safety_settings": safety}),
                      "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                      "model": MODEL, "policy": POLICY_VERSION}
            journal = path.parent / "timeout-retries.jsonl"
            attempt, last_record, final = 0, None, "policy_error"
            try:
                _journal(journal, {**common, "event": "group_start", "max_attempts": MAX_ATTEMPTS,
                                   "retry_delays_seconds": list(RETRY_DELAYS),
                                   "rate_limit_retry_delays_seconds": list(RATE_LIMIT_RETRY_DELAYS),
                                   "max_retry_wait_seconds": MAX_RETRY_WAIT})
                for attempt in range(1, MAX_ATTEMPTS + 1):
                    _check(runtime, gate)
                    cursor = _archive_cursor(path)
                    _journal(journal, {**common, "event": "attempt_start", "attempt": attempt,
                                       "native_archive_offset": cursor[0], "native_archive_prefix_sha256": cursor[1]})
                    _check(runtime, gate)
                    last_started = time.monotonic()
                    _require(math.isfinite(last_started), "Cannot establish attempt start time")
                    try:
                        response = super().generate_content(prompt, generation_config=copy.deepcopy(config),
                                                            safety_settings=copy.deepcopy(safety))
                    except Exception as error:
                        last_record = getattr(error, "record_id", None)
                        archived = _archive_outcome(path, cursor, body, "error", error)
                        reason = _retry_reason(error, archived, transport)
                        decision = _retry_decision(reason, archived, attempt)
                        _journal(journal, {**common, "event": "attempt_error", "attempt": attempt,
                            "native_record_id": last_record, "http_status": archived.get("http_status"),
                            "upstream_code": getattr(error, "upstream_code", None), "error_type": type(error).__name__,
                            "retry_eligible": reason is not None, "retry_reason": reason,
                            **decision})
                        if decision["decision"] == "retry_after_exceeds_maximum":
                            raise RetryWaitLimitExceeded("Retry-After requires waiting longer than the 300-second retry policy limit",
                                                         record_id=last_record) from None
                        if not decision["will_retry"]:
                            final = "retry_attempts_exhausted" if reason else "non_retryable_error"
                            raise
                        _wait_until(time.monotonic() + decision["delay_seconds"], runtime, gate)
                        continue
                    archived = _archive_outcome(path, cursor, body, "response")
                    last_record = archived["record_id"]
                    native = archived.get("response", {})
                    provenance = response.to_dict().get("_openrouter", {})
                    _require(provenance.get("archive_record_id") == last_record and provenance.get("response") == native
                             and native.get("model") == MODEL and isinstance(native.get("id"), str) and native["id"],
                             "Returned response differs from its complete native archive", record_id=last_record)
                    _journal(journal, {**common, "event": "attempt_response", "attempt": attempt,
                        "native_record_id": last_record, "response_id": native["id"], "raw_model": native["model"],
                        "backend": native.get("provider"), "http_status": archived.get("http_status"),
                        "finish_reasons": [choice.get("finish_reason") for choice in native.get("choices", [])]})
                    # The outer frozen gate records the first attempt's start.
                    # Holding it until five seconds after the LAST start makes
                    # the next caller safe even after a very short retry success.
                    _wait_until(last_started + MIN_START_INTERVAL, runtime, gate)
                    _journal(journal, {**common, "event": "group_finished", "attempt": attempt,
                        "outcome": "returned_response", "native_record_id": last_record,
                        "response_id": native["id"], "last_attempt_minimum_start_interval_seconds": MIN_START_INTERVAL})
                    _check(runtime, gate)
                    return response
                raise AssertionError("Unreachable timeout retry branch")
            except BaseException as error:
                if isinstance(error, RetryInterrupted):
                    final = "interrupted_by_stop"
                elif isinstance(error, RetryWaitLimitExceeded):
                    final = "retry_after_exceeds_maximum"
                elif isinstance(error, RetryPolicyError):
                    final = "uncertain_or_mismatched_archive"
                elif isinstance(error, OSError):
                    final = "io_failure_no_retry"
                try:
                    _journal(journal, {**common, "event": "group_finished", "attempt": attempt,
                        "outcome": final, "native_record_id": last_record, "error_type": type(error).__name__})
                except BaseException:
                    raise RetryPolicyError("Timeout retry journal could not be durably completed", record_id=last_record) from None
                raise

    transport.OpenRouterModel = TimeoutRetryOpenRouterModel
    return TimeoutRetryOpenRouterModel
