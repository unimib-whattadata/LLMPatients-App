"""Audited OpenRouter continuation of the frozen Gemini experiment.

The frozen providers retain their parsing and retry/token-recovery logic. Only
the model transport and shared pacing coordinator are replaced. Native HTTP
payloads are retained separately from the normalized SDK-compatible response.
"""
import ast
import hashlib
import json
import os
from pathlib import Path
import sys
import threading

from campaign_rate_limit import (
    CampaignCapacityPause, CampaignCoordinator, _load_limiter,
    audit_rate_limit_amendment, digest, install_rate_limit_overlay,
)

AMENDMENT_ID = "openrouter-gemini-2.5-pro-continuation-2026-09-27"
CHECKPOINT_SHA256 = "a0578489d430388289fcf86c1a23d3310ab808c81410df89000d192c0e892678"
MODEL_ID = "google/gemini-2.5-pro"


def audit_openrouter_amendment(base):
    base = Path(base)
    previous = audit_rate_limit_amendment(base)
    errors = list(previous["validation_errors"])
    amendment = json.loads((base / "openrouter-provider-amendment.json").read_text())
    if amendment["id"] != AMENDMENT_ID or amendment["model_id"] != MODEL_ID:
        errors.append("Unexpected OpenRouter amendment or model")
    if amendment.get("frozen_before_scientific_inference") is not True:
        errors.append("OpenRouter amendment is not frozen for inference")
    path = base / amendment["checkpoint_manifest"]
    if digest(path) != CHECKPOINT_SHA256 or amendment["checkpoint_manifest_sha256"] != CHECKPOINT_SHA256:
        errors.append("OpenRouter checkpoint manifest changed")
    checkpoint = json.loads(path.read_text())
    checked = 0
    for relative, expected in checkpoint.items():
        path = base / amendment["checkpoint_archive"] / relative
        if not path.is_file() or digest(path) != expected:
            errors.append(f"OpenRouter inherited archive changed: {relative}")
        else:
            checked += 1
    if len(checkpoint) != 375 or checked != 375:
        errors.append("OpenRouter checkpoint must preserve all 375 files")
    verified = 0
    for relative, expected in amendment["runtime_files_sha256"].items():
        path = base / relative
        if not path.is_file() or digest(path) != expected:
            errors.append(f"OpenRouter runtime changed: {relative}")
        else:
            verified += 1
    required = {"scripts/campaign_openrouter.py", "scripts/openrouter_transport.py",
                "scripts/complete_phq9_openrouter.py", "scripts/run_longitudinal_openrouter.py",
                "scripts/run_openrouter_session.py", "scripts/run_longitudinal_session_openrouter.py"}
    if not required.issubset(amendment["runtime_files_sha256"]):
        errors.append("OpenRouter runtime hashes are incomplete")
    for relative, expected in amendment["invariant_hashes"].items():
        if digest(base / relative) != expected:
            errors.append(f"OpenRouter scientific invariant changed: {relative}")
    for prefix in ("phq", "longitudinal"):
        manifest = json.loads((base / f"{prefix}-source-manifest.json").read_text())
        for relative, expected in manifest.items():
            if digest(base / f"{prefix}-source" / relative) != expected:
                errors.append(f"Frozen {prefix} source changed: {relative}")
    functions = amendment["preserved_scientific_functions_sha256"]
    for filename in ("run_longitudinal_session.py", "run_longitudinal_session_openrouter.py"):
        source = (base / "scripts" / filename).read_text()
        observed = {node.name: hashlib.sha256(ast.get_source_segment(source, node).encode()).hexdigest()
                    for node in ast.parse(source).body
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in functions}
        if observed != functions:
            errors.append(f"Scientific prompt/session functions changed: {filename}")
    return {"integrity_valid": not errors, "validation_errors": errors,
            "verified_checkpoint_files": checked, "runtime_files_verified": verified,
            "amendment": amendment,
            "amendment_sha256": digest(base / "openrouter-provider-amendment.json")}


class OpenRouterCoordinator(CampaignCoordinator):
    def __init__(self, base, policy, limiter_module):
        self.base, self.policy, self.module = Path(base), policy, limiter_module
        self.directory = self.base / "runtime/openrouter-rate-control"
        self.directory.mkdir(parents=True, exist_ok=True)
        self.stop_path = self.directory / "STOP.json"
        self._guards_lock = threading.Lock()

    def event(self, kind, **fields):
        return super().event(kind, amendment_id=AMENDMENT_ID, provider="openrouter", **fields)

    def pause(self, reason, retry_after_seconds=0):
        return super().pause(reason.replace("Vertex", "OpenRouter"), retry_after_seconds)

    def guard(self, runner):
        with self._guards_lock:
            if not hasattr(runner, "_campaign_rate_guard"):
                if runner.model_id != "gemini-2.5-pro":
                    raise RuntimeError("OpenRouter continuation cannot change the Gemini model")
                key = hashlib.sha256(json.dumps(["openrouter", MODEL_ID]).encode()).hexdigest()
                p = self.policy
                limiter = self.module.VertexRateLimiter(
                    self.directory / "state.sqlite3", key,
                    interval_seconds=max(60 / p["requests_per_minute"], p["minimum_interval_seconds"]),
                    cooldown_seconds=p["initial_cooldown_seconds"],
                    max_backoff_seconds=p["maximum_backoff_seconds"],
                    failure_threshold=p["failure_threshold"], circuit_seconds=p["circuit_seconds"],
                    max_wait_seconds=p["maximum_wait_seconds"], probe_seconds=p["probe_seconds"],
                )
                runner._campaign_rate_guard = (threading.RLock(), limiter)
            return runner._campaign_rate_guard


def install_openrouter_overlay(provider_class, base):
    audit = audit_openrouter_amendment(base)
    if not audit["integrity_valid"]:
        raise RuntimeError(json.dumps(audit["validation_errors"]))
    from openrouter_transport import OpenRouterModel
    module = sys.modules[provider_class.__module__]
    module.GenerativeModel = OpenRouterModel
    os.environ["OPENROUTER_API_RECORDS_PATH"] = str(Path(base) / "runtime/openrouter-api-records.jsonl")
    coordinator = OpenRouterCoordinator(base, audit["amendment"]["policy"], _load_limiter(base))
    return install_rate_limit_overlay(provider_class, base, coordinator=coordinator)
