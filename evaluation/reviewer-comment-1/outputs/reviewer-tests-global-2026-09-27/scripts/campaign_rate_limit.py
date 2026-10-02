"""Declared transport overlay for the frozen research providers.

The original generate() remains responsible for prompts, settings and response
acceptance. The proxy sits OUTSIDE ObservedModel so real outcomes are archived
before an outage stops a job. A control-flow exception bypasses legacy fallback
handlers; it never represents a patient answer or a failed clinical assertion.
"""
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import threading

AMENDMENT_ID = "vertex-shared-rate-limit-2026-09-27"
CHECKPOINT_SHA256 = "606246a0bc0e5478d462fa362ce069c25a5d436315ab122ebcc4d55373a73660"
_INSTALL_LOCK = threading.Lock()


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def audit_rate_limit_amendment(base):
    base = Path(base)
    errors = []
    amendment = json.loads((base / "rate-limit-amendment.json").read_text())
    if amendment["id"] != AMENDMENT_ID:
        errors.append("Unexpected rate-limit amendment id")
    if amendment.get("scientific_inputs_changed") is not False or amendment.get("original_response_acceptance_changed") is not False:
        errors.append("Rate-limit amendment must preserve scientific inputs and acceptance")
    manifest_path = base / amendment["checkpoint_manifest"]
    if digest(manifest_path) != CHECKPOINT_SHA256 or amendment["checkpoint_manifest_sha256"] != CHECKPOINT_SHA256:
        errors.append("Rate-limit checkpoint manifest hash changed")
    checkpoint = json.loads(manifest_path.read_text())
    if len(checkpoint) != amendment["checkpoint_files"] or len(checkpoint) != 375:
        errors.append("Rate-limit checkpoint must contain 375 files")
    archive = base / amendment["checkpoint_archive"]
    checked = 0
    for relative, expected in checkpoint.items():
        path = archive / relative
        if not path.is_file() or digest(path) != expected:
            errors.append(f"Rate-limit checkpoint archive changed: {relative}")
        else:
            checked += 1
    runtime_checked = 0
    for relative, expected in amendment["runtime_files_sha256"].items():
        path = base / relative
        if not path.is_file() or digest(path) != expected:
            errors.append(f"Rate-limit runtime changed: {relative}")
        else:
            runtime_checked += 1
    required = {"scripts/campaign_rate_limit.py", "runtime/rate-limit-source/vertex_rate_limit.py"}
    if not required.issubset(amendment["runtime_files_sha256"]):
        errors.append("Rate-limit runtime hashes are incomplete")
    return {"integrity_valid": not errors, "validation_errors": errors,
            "verified_checkpoint_files": checked, "runtime_files_verified": runtime_checked,
            "amendment": amendment, "amendment_sha256": digest(base / "rate-limit-amendment.json")}


class CampaignCapacityPause(BaseException):
    """Cooperative job stop; deliberately bypasses old except Exception fallbacks."""
    def __init__(self, reason, retry_after_seconds=0):
        self.reason, self.retry_after_seconds = reason, retry_after_seconds
        super().__init__(reason)


def _load_limiter(base):
    name = "_campaign_shared_vertex_rate_limit"
    if name not in sys.modules:
        path = Path(base) / "runtime/rate-limit-source/vertex_rate_limit.py"
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
    return sys.modules[name]


class CampaignCoordinator:
    def __init__(self, base, policy, limiter_module):
        self.base, self.policy, self.module = Path(base), policy, limiter_module
        self.directory = self.base / "runtime/rate-control"
        self.directory.mkdir(parents=True, exist_ok=True)
        self.stop_path = self.directory / "STOP.json"
        self._guards_lock = threading.Lock()

    def event(self, kind, **fields):
        row = {"at": datetime.now(timezone.utc).isoformat(), "kind": kind,
               "pid": os.getpid(), "amendment_id": AMENDMENT_ID, **fields}
        fd = os.open(self.directory / "events.jsonl", os.O_CREAT | os.O_APPEND | os.O_WRONLY, 0o600)
        try:
            os.write(fd, (json.dumps(row, ensure_ascii=False) + "\n").encode())
            os.fsync(fd)
        finally:
            os.close(fd)
        return row

    def ensure_running(self):
        if self.stop_path.exists():
            raise CampaignCapacityPause("Shared campaign stop is set; preserve progress and await user resumption")

    def persist_stop(self, row):
        try:
            fd = os.open(self.stop_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            pass
        else:
            try:
                os.write(fd, (json.dumps(row, indent=2) + "\n").encode())
                os.fsync(fd)
            finally:
                os.close(fd)

    def pause(self, reason, retry_after_seconds=0):
        row = self.event("capacity_pause", reason=reason, retry_after_seconds=retry_after_seconds)
        self.persist_stop(row)
        raise CampaignCapacityPause(reason, retry_after_seconds)

    def guard(self, runner):
        with self._guards_lock:
            if not hasattr(runner, "_campaign_rate_guard"):
                project, location = os.environ.get("GCP_PROJECT"), os.environ.get("GCP_LOCATION")
                if not project or location != "global" or runner.model_id != "gemini-2.5-pro":
                    raise RuntimeError("Campaign transport must retain the configured project, global and gemini-2.5-pro")
                key = hashlib.sha256(json.dumps([project, location, runner.model_id]).encode()).hexdigest()
                policy = self.policy
                limiter = self.module.VertexRateLimiter(
                    self.directory / "state.sqlite3", key,
                    interval_seconds=max(60 / policy["requests_per_minute"], policy["minimum_interval_seconds"]),
                    cooldown_seconds=policy["initial_cooldown_seconds"],
                    max_backoff_seconds=policy["maximum_backoff_seconds"],
                    failure_threshold=policy["failure_threshold"], circuit_seconds=policy["circuit_seconds"],
                    max_wait_seconds=policy["maximum_wait_seconds"], probe_seconds=policy["probe_seconds"],
                )
                runner._campaign_rate_guard = (threading.RLock(), limiter)
            return runner._campaign_rate_guard


class PacedObservedModel:
    def __init__(self, inner, runner, limiter, coordinator):
        self.inner, self.runner, self.limiter, self.coordinator = inner, runner, limiter, coordinator
        self.last_transient_error = None
        path = getattr(inner, "path", None)
        self.api_path = str(Path(path).relative_to(coordinator.base)) if path is not None else None

    def __getattr__(self, name):
        return getattr(self.inner, name)

    def generate_content(self, *args, **kwargs):
        coordinator = self.coordinator
        coordinator.ensure_running()
        try:
            generation = self.limiter.acquire()
        except coordinator.module.VertexRateLimitError as exc:
            coordinator.pause(str(exc), exc.retry_after_seconds)
        coordinator.ensure_running()
        coordinator.event("request_started", api_records_path=self.api_path)
        try:
            response = self.inner.generate_content(*args, **kwargs)
        except Exception as exc:
            if self.runner._is_rate_limited_error(exc):
                self.last_transient_error = exc
                try:
                    backoff = self.limiter.record_rate_limit(coordinator.module.retry_after_seconds(exc))
                except coordinator.module.VertexRateLimitError as state_error:
                    coordinator.pause(str(state_error), state_error.retry_after_seconds)
                coordinator.event("rate_limit_error", api_records_path=self.api_path,
                                  error_type=type(exc).__name__, failures=backoff.failures,
                                  wait_seconds=backoff.delay_seconds, circuit_open=backoff.circuit_open)
                if backoff.circuit_open:
                    coordinator.pause("Repeated Vertex 429 responses opened the shared capacity circuit", backoff.delay_seconds)
            elif self.runner._is_retryable_error(exc):
                self.last_transient_error = exc
                coordinator.event("transient_error", api_records_path=self.api_path, error_type=type(exc).__name__)
            else:
                self.last_transient_error = None
                coordinator.event("provider_error", api_records_path=self.api_path, error_type=type(exc).__name__)
                coordinator.pause(f"Non-retryable provider error: {type(exc).__name__}")
            raise
        self.last_transient_error = None
        try:
            self.limiter.record_success(generation)
        except coordinator.module.VertexRateLimitError as exc:
            # The response already exists and is archived; retain it, then make
            # the next call stop instead of discarding accepted patient output.
            row = coordinator.event("state_error_after_response", reason=str(exc), api_records_path=self.api_path)
            coordinator.persist_stop(row)
        payload = response.to_dict()
        coordinator.event("response_returned", api_records_path=self.api_path,
                          response_id=payload.get("response_id") or payload.get("responseId"))
        return response


def install_rate_limit_overlay(provider_class, base, *, coordinator=None):
    """Install once per process; frozen provider/graph source files stay intact."""
    with _INSTALL_LOCK:
        if getattr(provider_class, "_campaign_rate_limit_installed", False):
            return provider_class._campaign_rate_coordinator
        if coordinator is None:
            audit = audit_rate_limit_amendment(base)
            if not audit["integrity_valid"]:
                raise RuntimeError(json.dumps(audit["validation_errors"]))
            coordinator = CampaignCoordinator(base, audit["amendment"]["policy"], _load_limiter(base))
        original_generate = provider_class.generate

        def generate(self, *args, **kwargs):
            coordinator.ensure_running()
            lock, limiter = coordinator.guard(self)
            with lock:
                original_model = self.model
                proxy = PacedObservedModel(original_model, self, limiter, coordinator)
                self.model = proxy
                try:
                    result = original_generate(self, *args, **kwargs)
                    if not result and proxy.last_transient_error is not None:
                        state = limiter.snapshot()
                        coordinator.pause("Provider retry budget exhausted during a transient service error",
                                          max(0, state["cooldown_until"] - limiter.clock()))
                    return result
                except coordinator.module.VertexRateLimitError as exc:
                    coordinator.pause(str(exc), exc.retry_after_seconds)
                finally:
                    self.model = original_model

        def cooldown(self, delay):
            coordinator.guard(self)[1].defer(delay)

        # Pacing takes place immediately outside the archived API observer.
        # Keep the old provider's response parser and its token recovery intact.
        provider_class._wait_for_request_slot = lambda self: None
        provider_class._apply_shared_cooldown = cooldown
        provider_class.generate = generate
        provider_class._campaign_rate_limit_installed = True
        provider_class._campaign_rate_coordinator = coordinator
        coordinator.event("overlay_installed")
        return coordinator
