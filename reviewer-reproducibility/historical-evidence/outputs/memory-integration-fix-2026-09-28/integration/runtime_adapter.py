"""OpenRouter-only test adapter; no cloud initialization, hidden retries or gold.

The factory returns a VertexLLMRunner subclass only to preserve the graph's
Gemini budget/type checks. Neither VertexLLMRunner.__init__ nor .generate runs.
"""
from __future__ import annotations

import fcntl
import inspect
import json
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


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


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


class SerialGate:
    """Hold the interprocess lock during HTTP; never overlap requests."""
    def __init__(self, path, *, interval=5.0, clock=time.time, sleep=time.sleep):
        if interval < 5:
            raise ValueError("The prespecified request interval is at least five seconds")
        self.path, self.interval, self.clock, self.sleep = Path(path), interval, clock, sleep
        self.lock = threading.Lock()

    @contextmanager
    def request(self, check):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.lock, self.path.with_suffix(".lock").open("a") as stream:
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
            try:
                check()
                last = json.loads(self.path.read_text()).get("last_started", 0) if self.path.exists() else 0
                while (remaining := last + self.interval - self.clock()) > 0:
                    self.sleep(min(remaining, 1.0))
                    check()
                check()
                write_json(self.path, {"last_started": self.clock()})
                yield
            finally:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def create_runner(*, model, events_path, gate, context, stop_path):
    """Inject only after the frozen source is first on sys.path."""
    from agent.core.llm_provider_vertex import VertexLLMRunner
    from agent.core.llm_provider_base import STOP_SEQUENCES
    from agent.core.vertex_rate_limit import VertexRateLimitError

    class IntegrationAbort(VertexRateLimitError):
        # Graph catches this existing control exception separately from
        # Exception. Avoid claiming an actual Vertex call or HTTP 429.
        def __init__(self, reason, details):
            self.retry_after_seconds = 0.0
            self.consecutive_failures = 0
            self.details = details
            RuntimeError.__init__(self, f"Integration stopped: {reason}; no availability retry.")

    class IntegrationRunner(VertexLLMRunner):
        def __init__(self):
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
                self.abort("cooperative stop requested", {"kind": "cooperative_stop"})

        def abort(self, reason, details):
            with self.fatal_lock:
                if self.fatal is None:
                    self.fatal = IntegrationAbort(reason, details)
                    append_jsonl(events_path, {"event": "fatal", "timestamp": now(), **details})
            raise self.fatal from None

        def generate(self, prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
            with self.call_lock:
                self.check()
                stage = current_stage()
                if stage not in STAGES:
                    self.abort("unrecognized graph generation stage", {"kind": "unknown_stage"})
                memory = stage in MEMORY_STAGES
                temp = 0.2 if memory else (0.0 if stage == "classify_topic_and_emotion" else 0.7)
                budget = 8192 if memory else 4096
                logical_id = str(uuid4())
                for attempt in (1, 2):
                    self.check()
                    config = {"temperature": temp, "max_output_tokens": budget,
                              "top_p": 0.95, "top_k": 40, "stop_sequences": list(STOP_SEQUENCES),
                              "thinking_config": {"thinking_budget": 1024}}
                    request = {"logical_id": logical_id, "attempt": attempt, "stage": stage,
                               "turn_id": context.get("turn_id"), "session_index": context["session_index"],
                               "prompt": prompt, "generation_config": config,
                               "graph_requested_config": {"temperature": temperature, "max_tokens": max_tokens,
                                                          "thinking_budget": thinking_budget}}
                    with gate.request(self.check):
                        append_jsonl(events_path, {**request, "event": "request", "timestamp": now()})
                        started = time.monotonic()
                        try:
                            response = self.model.generate_content(prompt, generation_config=config,
                                                                   safety_settings={})
                        except Exception as exc:
                            details = {"kind": "provider_error", "stage": stage,
                                       "error_type": type(exc).__name__,
                                       "http_status": getattr(exc, "status_code", None),
                                       "native_record_id": getattr(exc, "record_id", None),
                                       "upstream_code": getattr(exc, "upstream_code", None)}
                            append_jsonl(events_path, {"event": "error", "timestamp": now(),
                                                      "logical_id": logical_id, "attempt": attempt,
                                                      "elapsed_seconds": time.monotonic() - started, **details})
                            self.abort("provider availability or transport error", details)
                    reasons = self._candidate_finish_reasons(response)
                    normalized = response.to_dict()
                    provenance = normalized.get("_openrouter", {})
                    native = provenance.get("response", {})
                    visible = self._extract_text_from_candidates(response)
                    append_jsonl(events_path, {
                        "event": "outcome", "logical_id": logical_id, "attempt": attempt,
                        "timestamp": now(), "stage": stage, "turn_id": request["turn_id"],
                        "session_index": context["session_index"], "finish_reasons": reasons,
                        "usage": normalized.get("usage_metadata"), "text": visible,
                        "elapsed_seconds": time.monotonic() - started,
                        "native_record_id": provenance.get("archive_record_id"),
                        "response_id": native.get("id"), "raw_model": native.get("model"),
                        "accepted": bool(reasons == ["STOP"] and visible),
                    })
                    if reasons == ["MAX_TOKENS"] and budget == 4096 and attempt == 1:
                        budget = 8192
                        continue
                    if reasons != ["STOP"] or not visible:
                        self.abort("generation did not complete", {"kind": "incomplete_generation",
                            "stage": stage, "finish_reasons": reasons, "max_output_tokens": budget,
                            "native_record_id": provenance.get("archive_record_id")})
                    return visible
                raise AssertionError("Unreachable recovery branch")

    return IntegrationRunner()


def wait_for_episodes(builder, runner, patient_id, therapist_id, timeout=180):
    """Barrier before native end_session, without changing episode generation."""
    futures = list(builder.EPISODE_TASKS.get(builder._memory_key(patient_id, therapist_id), []))
    deadline = time.monotonic() + timeout
    for future in futures:
        runner.check()
        try:
            future.result(timeout=max(0.001, deadline - time.monotonic()))
        except runner.abort_type:
            raise
        except Exception as exc:
            runner.abort("background episode failed", {"kind": "background_failure",
                                                       "error_type": type(exc).__name__})
    runner.check()
