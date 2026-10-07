"""Comparison adapter derived from the frozen 2026-09-28 integration adapter.

Both arms must share the same gate path and STOP path. No Vertex initialization,
availability retry, hidden model fallback, gold or native reasoning is used.
The local prompt estimate is ceil(UTF-8 bytes / 3), NOT a guaranteed upper bound
or the provider tokenizer. It applies equally to every generation in both arms.
"""
from __future__ import annotations

import fcntl
import inspect
import json
import math
import os
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

STAGES = (
    "_generate_factual_memory", "_summarize_episode", "_generate_session_reflection",
    "_generate_long_term_summary_from_reflection", "classify_topic_and_emotion",
    "generate_response",
)
MEMORY_STAGES = set(STAGES[:4])
MAX_ESTIMATED_PROMPT_TOKENS = 64_000
PROMPT_TOKEN_ESTIMATE_METHOD = "utf8_bytes_div3_ceiling"
_GATE_LOCKS = {}
_GATE_LOCKS_GUARD = threading.Lock()


def estimated_prompt_tokens(prompt):
    """Same local heuristic for all arms/stages; not exact provider token use."""
    if not isinstance(prompt, str):
        raise TypeError("Prompts must be strings")
    return max(1, (len(prompt.encode("utf-8")) + 2) // 3)


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp." + uuid4().hex)
    try:
        with temporary.open("x", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def append_jsonl(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
        try:
            stream.write(json.dumps(value, ensure_ascii=False, allow_nan=False) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def current_stage():
    names = {frame.function for frame in inspect.stack(context=0)}
    return next((stage for stage in STAGES if stage in names), "unknown")


def _visible_text(normalized):
    # Some SDK Part wrappers do not expose a .thought attribute even when the
    # underlying protobuf contains it. The normalized dict preserves that flag.
    return "\n".join(
        part["text"]
        for candidate in normalized.get("candidates", [])
        for part in candidate.get("content", {}).get("parts", [])
        if not part.get("thought") and isinstance(part.get("text"), str)
    ).strip()


class GateUncertaintyError(RuntimeError):
    """An unfinished request or invalid gate state must be reviewed, not retried."""


class SerialGate:
    """Global mutex, persistent pacing and durable in-flight marker.

    The lock remains held until the caller has parsed and journaled the response
    or published STOP. An exception/crash leaves in_flight set. A later caller
    must not send another request until that uncertainty is explicitly resolved.
    """
    def __init__(self, path, *, interval=5.0, clock=time.time, sleep=time.sleep):
        if not isinstance(interval, (int, float)) or not math.isfinite(interval) or interval < 5:
            raise ValueError("The prespecified request interval is finite and at least five seconds")
        self.path = Path(path).resolve()
        self.interval, self.clock, self.sleep = float(interval), clock, sleep
        with _GATE_LOCKS_GUARD:
            self.lock = _GATE_LOCKS.setdefault(str(self.path), threading.RLock())

    def _state(self):
        try:
            state = json.loads(self.path.read_text()) if self.path.exists() else {"last_started": 0}
            last = state["last_started"]
            if (not isinstance(state, dict) or not isinstance(last, (int, float))
                    or isinstance(last, bool) or not math.isfinite(last) or last < 0):
                raise ValueError("Invalid gate state")
            if state.get("in_flight"):
                raise GateUncertaintyError("A previous request has no durable resolution; review required")
            return state
        except GateUncertaintyError:
            raise
        except (OSError, ValueError, TypeError, KeyError):
            raise GateUncertaintyError("Gate state cannot be established; review required") from None

    @contextmanager
    def request(self, check):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.lock, self.path.with_suffix(".lock").open("a") as stream:
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
            try:
                check()
                state = self._state()
                while (remaining := state["last_started"] + self.interval - self.clock()) > 0:
                    self.sleep(min(remaining, 1.0))
                    check()
                check()
                started = self.clock()
                if not isinstance(started, (int, float)) or not math.isfinite(started):
                    raise GateUncertaintyError("Clock cannot establish request time")
                ticket = {"gate_request_id": str(uuid4()), "pid": os.getpid(), "started_at": started}
                write_json(self.path, {"last_started": started, "in_flight": ticket})
                # No finally clears the marker. Only a normally resolved body
                # (including a journaled MAX_TOKENS recovery) can clear it.
                yield ticket
                write_json(self.path, {"last_started": started, "in_flight": None})
            finally:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def _publish_stop(path, payload):
    """Durably publish the first fatal event; preserve an existing manual STOP."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("x", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=False, allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
    except FileExistsError:
        pass


def create_runner(*, model, events_path, gate, context, stop_path):
    """Preserved factory interface; import only after the frozen source is set."""
    from agent.core.llm_provider_vertex import VertexLLMRunner
    from agent.core.llm_provider_base import STOP_SEQUENCES
    from agent.core.vertex_rate_limit import VertexRateLimitError

    class IntegrationAbort(VertexRateLimitError):
        def __init__(self, reason, details):
            self.retry_after_seconds = 0.0
            self.consecutive_failures = 0
            self.details = details
            RuntimeError.__init__(self, f"Comparison stopped: {reason}; no availability retry.")

    class IntegrationRunner(VertexLLMRunner):
        def __init__(self):
            # Keep the graph's Gemini type/budget checks, without calling any
            # Vertex constructor, initializer, model or generation method.
            self.model_id = "gemini-2.5-pro"
            self.temperature, self.max_tokens = 0.7, 4096
            self.model = model
            self.fatal = None
            self.fatal_lock = threading.Lock()
            self.abort_type = IntegrationAbort
            self.call_lock = threading.RLock()

        def check(self):
            if self.fatal is not None:
                raise self.fatal
            if Path(stop_path).exists():
                self.abort("global STOP is present", {"kind": "global_stop"})

        def abort(self, reason, details, *, error_event=None):
            with self.fatal_lock:
                if self.fatal is None:
                    self.fatal = IntegrationAbort(reason, dict(details))
                    fatal_event = {"event": "fatal", "timestamp": now(), **details}
                    # STOP is published before any further journal I/O and,
                    # for provider/response failures, before releasing the gate.
                    try:
                        _publish_stop(stop_path, fatal_event)
                    except BaseException as exc:
                        self.fatal.details["stop_write_error_type"] = type(exc).__name__
                        # The durable in-flight marker remains set if a call
                        # was entered, preventing a different process retry.
                    try:
                        if error_event is not None:
                            append_jsonl(events_path, error_event)
                        append_jsonl(events_path, fatal_event)
                    except BaseException as exc:
                        self.fatal.details["journal_error_type"] = type(exc).__name__
            raise self.fatal from None

        def generate(self, prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
            with self.call_lock:
                self.check()
                stage = current_stage()
                if stage not in STAGES:
                    self.abort("unrecognized graph generation stage", {"kind": "unknown_stage", "stage": stage})
                try:
                    estimate = estimated_prompt_tokens(prompt)
                    utf8_bytes = len(prompt.encode("utf-8"))
                except (TypeError, UnicodeError) as exc:
                    self.abort("invalid prompt", {"kind": "invalid_prompt", "error_type": type(exc).__name__, "stage": stage})
                prompt_measurement = {"estimated_prompt_tokens": estimate, "prompt_utf8_bytes": utf8_bytes,
                    "prompt_token_estimate_method": PROMPT_TOKEN_ESTIMATE_METHOD,
                    "estimated_prompt_token_limit": MAX_ESTIMATED_PROMPT_TOKENS}
                if estimate > MAX_ESTIMATED_PROMPT_TOKENS:
                    self.abort("prompt exceeds the prespecified local ceiling", {
                        "kind": "prompt_ceiling", "stage": stage, **prompt_measurement})
                memory = stage in MEMORY_STAGES
                temp = 0.2 if memory else (0.0 if stage == "classify_topic_and_emotion" else 0.7)
                budget = 8192 if memory else 4096
                logical_id = str(uuid4())
                for attempt in (1, 2):
                    self.check()
                    config = {"temperature": temp, "max_output_tokens": budget, "top_p": 0.95,
                              "top_k": 40, "stop_sequences": list(STOP_SEQUENCES),
                              "thinking_config": {"thinking_budget": 1024}}
                    request = {"logical_id": logical_id, "attempt": attempt, "stage": stage,
                               "turn_id": context.get("turn_id"), "session_index": context["session_index"],
                               "prompt": prompt, "generation_config": config, **prompt_measurement,
                               "graph_requested_config": {"temperature": temperature, "max_tokens": max_tokens,
                                                          "thinking_budget": thinking_budget}}
                    request.update({name: context[name] for name in ("condition", "arm", "patient_id") if name in context})
                    recover = False
                    try:
                        with gate.request(self.check) as ticket:
                            try:
                                append_jsonl(events_path, {**request, "event": "request", "timestamp": now(),
                                    "gate_request_id": ticket.get("gate_request_id") if isinstance(ticket, dict) else None})
                                # Recheck immediately before the external call,
                                # including after fsync of the pre-call journal.
                                self.check()
                                started = time.monotonic()
                                try:
                                    response = self.model.generate_content(prompt, generation_config=config,
                                                                           safety_settings={})
                                except BaseException as exc:
                                    details = {"kind": "provider_error", "stage": stage,
                                               "error_type": type(exc).__name__,
                                               "http_status": getattr(exc, "status_code", None),
                                               "native_record_id": getattr(exc, "record_id", None),
                                               "upstream_code": getattr(exc, "upstream_code", None)}
                                    self.abort("provider availability or transport error", details,
                                        error_event={"event": "error", "timestamp": now(),
                                            "logical_id": logical_id, "attempt": attempt,
                                            "elapsed_seconds": time.monotonic() - started, **details})
                                # Parsing, outcome journaling and the fatal latch
                                # all happen while the global gate is still held.
                                reasons = self._candidate_finish_reasons(response)
                                normalized = response.to_dict()
                                provenance = normalized.get("_openrouter", {})
                                native = provenance.get("response", {})
                                usage = native.get("usage") or {}
                                visible = _visible_text(normalized)
                                recover = reasons == ["MAX_TOKENS"] and budget == 4096 and attempt == 1
                                accepted = bool(reasons == ["STOP"] and visible)
                                append_jsonl(events_path, {
                                    "event": "outcome", "logical_id": logical_id, "attempt": attempt,
                                    "timestamp": now(), "stage": stage, "turn_id": request["turn_id"],
                                    "session_index": context["session_index"], "finish_reasons": reasons,
                                    "usage": normalized.get("usage_metadata"), "native_usage": usage,
                                    "text": visible, "elapsed_seconds": time.monotonic() - started,
                                    "native_record_id": provenance.get("archive_record_id"),
                                    "response_id": native.get("id"), "raw_model": native.get("model"),
                                    "backend": native.get("provider"), "cost": usage.get("cost"),
                                    "cost_details": usage.get("cost_details"),
                                    "accepted": accepted, "max_tokens_recovery": recover, **prompt_measurement,
                                })
                                if not accepted and not recover:
                                    self.abort("generation did not complete", {"kind": "incomplete_generation",
                                        "stage": stage, "finish_reasons": reasons, "max_output_tokens": budget,
                                        "native_record_id": provenance.get("archive_record_id")})
                                self.check()
                            except IntegrationAbort:
                                raise
                            except BaseException as exc:
                                self.abort("response or journal outcome is uncertain", {
                                    "kind": "uncertain_outcome", "stage": stage, "error_type": type(exc).__name__,
                                    "logical_id": logical_id, "attempt": attempt})
                    except IntegrationAbort:
                        raise
                    except BaseException as exc:
                        self.abort("request gate outcome is uncertain", {
                            "kind": "uncertain_gate", "stage": stage, "error_type": type(exc).__name__,
                            "logical_id": logical_id, "attempt": attempt})
                    if recover:
                        budget = 8192
                        continue
                    return visible
                raise AssertionError("Unreachable recovery branch")

    return IntegrationRunner()


def wait_for_episodes(builder, runner, patient_id, therapist_id, timeout=180):
    """Preserved barrier interface; a background failure also publishes STOP."""
    futures = list(builder.EPISODE_TASKS.get(builder._memory_key(patient_id, therapist_id), []))
    deadline = time.monotonic() + timeout
    for future in futures:
        runner.check()
        try:
            future.result(timeout=max(0.001, deadline - time.monotonic()))
        except runner.abort_type:
            raise
        except BaseException as exc:
            runner.abort("background episode failed", {"kind": "background_failure",
                                                       "error_type": type(exc).__name__})
    runner.check()
