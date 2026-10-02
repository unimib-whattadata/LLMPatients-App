"""Audited OpenRouter transport for the frozen Vertex provider interfaces.

This changes the transport, not the model: only google/gemini-2.5-pro is accepted.
OpenRouter cannot forward Vertex safety settings, and its listed endpoints do
not support top_k. Both deviations are explicit in each response's provenance.
No key is read at import/construction, no reasoning override or retry is added,
and HTTPSConnection never follows redirects.
"""
from __future__ import annotations

import copy
import fcntl
import http.client
import json
import math
import os
import socket
import ssl
import threading
import time
from collections.abc import Mapping
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

from vertexai.generative_models import GenerationResponse

MODEL_ID = "google/gemini-2.5-pro"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_KEY_FILE = Path("/Users/marco/Sites/LLMPatients-Agent/config/openrouter-api-key.txt")
DEFAULT_RECORDS_FILE = Path(__file__).resolve().parents[1] / "runtime/openrouter-api-records.jsonl"
_ARCHIVE_LOCK = threading.Lock()
_FINISH_REASONS = {"stop": "STOP", "length": "MAX_TOKENS", "content_filter": "SAFETY"}


class OpenRouterError(RuntimeError):
    """Sanitized exception compatible with the frozen provider's retry logic."""
    def __init__(self, message, *, status_code=None, retry_after=None, record_id=None):
        super().__init__(message)
        self.status_code = status_code
        self.record_id = record_id
        headers = {"Retry-After": retry_after} if retry_after is not None else {}
        self.response = SimpleNamespace(status_code=status_code, headers=headers)


class OpenRouterHTTPError(OpenRouterError):
    pass


class OpenRouterProtocolError(OpenRouterError):
    pass


def _redact(value, secret):
    """Keep native payloads, replacing any echoed credential before archiving."""
    if isinstance(value, str):
        return value.replace(secret, "[REDACTED]") if secret else value
    if isinstance(value, (list, tuple)):
        return [_redact(item, secret) for item in value]
    if isinstance(value, dict):
        return {
            _redact(key, secret): "[REDACTED]" if str(key).lower() in {"authorization", "api_key", "access_token"}
            else _redact(item, secret)
            for key, item in value.items()
        }
    return value


def _append_record(path, record):
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False, allow_nan=False) + "\n"
    with _ARCHIVE_LOCK, path.open("a", encoding="utf-8") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
        try:
            stream.write(line)
            stream.flush()
            os.fsync(stream.fileno())
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def _visible_text(content):
    if isinstance(content, str):
        return content
    if content is None:
        return ""
    if isinstance(content, list):
        # Native reasoning/reasoning_details fields and non-text content parts
        # are retained in provenance only, never in the patient response.
        return "".join(
            part["text"] for part in content
            if isinstance(part, dict) and part.get("type") == "text"
            and not part.get("thought") and isinstance(part.get("text"), str)
        )
    raise OpenRouterProtocolError("OpenRouter returned unsupported message content.")


def _normalized_response(raw):
    if not isinstance(raw, dict) or raw.get("model") != MODEL_ID:
        raise OpenRouterProtocolError("OpenRouter response did not attest the requested Gemini 2.5 Pro model.")
    if not isinstance(raw.get("id"), str) or not raw["id"]:
        raise OpenRouterProtocolError("OpenRouter response has no native response ID.")
    choices = raw.get("choices")
    if not isinstance(choices, list) or not choices:
        raise OpenRouterProtocolError("OpenRouter response has no completion choices.")
    candidates = []
    for choice in choices:
        message = choice.get("message") if isinstance(choice, dict) else None
        if not isinstance(message, dict):
            raise OpenRouterProtocolError("OpenRouter completion has no message.")
        text = _visible_text(message.get("content"))
        candidates.append({
            "content": {"role": "model", "parts": [{"text": text}] if text else []},
            "finish_reason": _FINISH_REASONS.get(choice.get("finish_reason"), "OTHER"),
        })
    result = {"candidates": candidates, "response_id": raw["id"], "model_version": "gemini-2.5-pro"}
    usage = raw.get("usage")
    if isinstance(usage, dict):
        details = usage.get("completion_tokens_details") or {}
        thoughts = details.get("reasoning_tokens", 0)
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        counts = (thoughts, prompt_tokens, completion_tokens, usage.get("total_tokens", prompt_tokens + completion_tokens))
        if any(not isinstance(n, int) or isinstance(n, bool) or n < 0 for n in counts) or thoughts > completion_tokens:
            raise OpenRouterProtocolError("OpenRouter returned inconsistent token usage.")
        result["usage_metadata"] = {
            "prompt_token_count": prompt_tokens,
            "candidates_token_count": completion_tokens - thoughts,
            "thoughts_token_count": thoughts,
            "total_token_count": counts[3],
        }
    return GenerationResponse.from_dict(result)


class OpenRouterGenerationResponse:
    """Real SDK candidates/enums and accessors, plus auditable native provenance."""
    def __init__(self, sdk_response, provenance):
        self._sdk_response = sdk_response
        self._provenance = provenance

    def __getattr__(self, name):
        return getattr(self._sdk_response, name)

    def to_dict(self):
        result = self._sdk_response.to_dict()
        result["_openrouter"] = copy.deepcopy(self._provenance)
        return result


class OpenRouterModel:
    def __init__(self, model_id, *, timeout_seconds=120.0, records_path=None):
        if model_id not in {"gemini-2.5-pro", MODEL_ID}:
            raise ValueError("This transport supports only Google Gemini 2.5 Pro.")
        if not isinstance(timeout_seconds, (int, float)) or not math.isfinite(timeout_seconds) or timeout_seconds <= 0:
            raise ValueError("OpenRouter timeout must be finite and positive.")
        self.model_id = MODEL_ID
        self.timeout_seconds = float(timeout_seconds)
        self.records_path = Path(records_path) if records_path is not None else Path(
            os.environ.get("OPENROUTER_API_RECORDS_PATH", str(DEFAULT_RECORDS_FILE))
        )

    def generate_content(self, prompt, generation_config=None, safety_settings=None):
        if not isinstance(prompt, str):
            raise TypeError("The frozen questionnaire and graph transports require a string prompt.")
        if generation_config is not None and not isinstance(generation_config, Mapping):
            raise TypeError("generation_config must be a mapping.")
        config = dict(generation_config or {})
        allowed = {"temperature", "max_output_tokens", "top_p", "stop_sequences", "top_k"}
        if set(config) - allowed:
            raise ValueError("Unsupported legacy generation parameters; no implicit mapping is permitted.")
        body = {"model": MODEL_ID, "messages": [{"role": "user", "content": prompt}],
                "provider": {"require_parameters": True, "allow_fallbacks": True}}
        for legacy, native in (("temperature", "temperature"), ("max_output_tokens", "max_tokens"),
                               ("top_p", "top_p"), ("stop_sequences", "stop")):
            if legacy in config and config[legacy] is not None:
                body[native] = config[legacy]
        encoded_body = json.dumps(body, ensure_ascii=False, allow_nan=False).encode("utf-8")

        # Deliberately deferred until invocation; never retain the key on self.
        try:
            key_path = Path(os.environ.get("OPENROUTER_API_KEY_FILE", str(DEFAULT_KEY_FILE)))
            key = key_path.read_text(encoding="utf-8").strip()
            if not key or any(char.isspace() for char in key):
                raise ValueError("Invalid key file")
        except (OSError, ValueError):
            raise OpenRouterError("OpenRouter credential file is unavailable or invalid.") from None

        record_id = str(uuid4())
        started = time.monotonic()
        base = {"record_id": record_id, "endpoint": ENDPOINT, "request": _redact(body, key),
                "omitted_legacy_generation_parameters": ["top_k"], "safety_settings_forwarded": False}
        _append_record(self.records_path, {**base, "event": "request", "timestamp": datetime.now(timezone.utc).isoformat()})
        connection = None
        status_code = None
        retry_after = None
        raw = None
        try:
            connection = http.client.HTTPSConnection("openrouter.ai", timeout=self.timeout_seconds, context=ssl.create_default_context())
            connection.request("POST", "/api/v1/chat/completions", body=encoded_body,
                               headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
            http_response = connection.getresponse()
            status_code = http_response.status
            retry_after = _redact(http_response.getheader("Retry-After"), key)
            raw_text = http_response.read().decode("utf-8", errors="replace")
            try:
                raw = json.loads(raw_text)
            except ValueError:
                raw = {"unparsed_body": raw_text}
            raw = _redact(raw, key)
            if not 200 <= status_code < 300:
                raise OpenRouterHTTPError(f"OpenRouter HTTP {status_code}.", status_code=status_code,
                                          retry_after=retry_after, record_id=record_id)
            if isinstance(raw, dict) and raw.get("error"):
                code = raw["error"].get("code") if isinstance(raw["error"], dict) else None
                numeric_code = f" code {code}" if isinstance(code, int) else ""
                raise OpenRouterProtocolError(f"OpenRouter returned an API error{numeric_code} (HTTP {status_code}).")
            sdk_response = _normalized_response(raw)
            provenance = {**base, "response": raw, "archive_record_id": record_id,
                          "archive_path": str(self.records_path)}
            _append_record(self.records_path, {**base, "event": "response", "response": raw,
                                               "http_status": status_code, "elapsed_seconds": time.monotonic() - started,
                                               "timestamp": datetime.now(timezone.utc).isoformat()})
            return OpenRouterGenerationResponse(sdk_response, provenance)
        except Exception as exc:
            if isinstance(exc, OpenRouterError):
                error = exc
                error.record_id = record_id
                if error.status_code is None:
                    error.status_code = status_code
                    error.response.status_code = status_code
                    error.response.headers = {"Retry-After": retry_after} if retry_after is not None else {}
            else:
                if isinstance(exc, (TimeoutError, socket.timeout)):
                    message = "OpenRouter request timed out."
                elif isinstance(exc, (ConnectionResetError, BrokenPipeError, http.client.RemoteDisconnected)):
                    message = "OpenRouter connection reset."
                else:
                    message = f"OpenRouter transport or response failure ({type(exc).__name__})."
                error = OpenRouterError(message, status_code=status_code, retry_after=retry_after, record_id=record_id)
            _append_record(self.records_path, {**base, "event": "error", "response": raw,
                                               "http_status": status_code, "retry_after": retry_after,
                                               "error": {"type": type(error).__name__, "message": str(error)},
                                               "elapsed_seconds": time.monotonic() - started,
                                               "timestamp": datetime.now(timezone.utc).isoformat()})
            raise error from None
        finally:
            if connection is not None:
                try:
                    connection.close()
                except Exception:
                    pass
