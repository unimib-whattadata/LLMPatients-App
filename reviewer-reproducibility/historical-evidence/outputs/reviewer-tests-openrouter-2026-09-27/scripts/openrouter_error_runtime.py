"""Declared bootstrap for handling in-band OpenRouter service errors.

The six original OpenRouter runtime files stay byte-identical. This extension
rejects native choice errors before SDK normalization and records its identity
on every subsequent pacing event. It does not change clinical prompts/settings.
"""
import importlib.util
import json
import os
from pathlib import Path
import runpy
import sys
from datetime import datetime, timezone

from campaign_openrouter import OpenRouterCoordinator, audit_openrouter_amendment
from campaign_rate_limit import digest

OUT = Path(__file__).resolve().parents[1]
AMENDMENT_ID = "openrouter-inband-error-handling-2026-09-27"
CHECKPOINT_SHA256 = "a11e7aaf5eed996ccf4064e09eff15cc5733f7cc1fe2aaf9946a65503df64286"
TARGETS = {"complete_phq9_openrouter.py", "run_longitudinal_openrouter.py", "run_openrouter_session.py"}


def audit_error_handling_amendment(base):
    base = Path(base)
    prior = audit_openrouter_amendment(base)
    errors = list(prior["validation_errors"])
    path = base / "openrouter-error-handling-amendment.json"
    amendment = json.loads(path.read_text())
    if amendment["id"] != AMENDMENT_ID or amendment.get("frozen_before_resumption") is not True:
        errors.append("Unexpected or unfrozen OpenRouter error-handling amendment")
    if amendment.get("clinical_prompts_changed") is not False or amendment.get("decoding_parameters_changed") is not False:
        errors.append("Error handling must preserve clinical prompts and decoding parameters")
    manifest_path = base / amendment["checkpoint_manifest"]
    if digest(manifest_path) != CHECKPOINT_SHA256 or amendment["checkpoint_manifest_sha256"] != CHECKPOINT_SHA256:
        errors.append("Error-handling checkpoint manifest changed")
    manifest = json.loads(manifest_path.read_text())
    checked = 0
    for relative, expected in manifest.items():
        archived = base / amendment["checkpoint_archive"] / relative
        if not archived.is_file() or digest(archived) != expected:
            errors.append(f"Error-handling checkpoint archive changed: {relative}")
        else:
            checked += 1
    if checked != 427 or len(manifest) != 427:
        errors.append("Error-handling checkpoint must preserve 427 files")
    verified = 0
    for relative, expected in amendment["runtime_files_sha256"].items():
        runtime = base / relative
        if not runtime.is_file() or digest(runtime) != expected:
            errors.append(f"Error-handling runtime changed: {relative}")
        else:
            verified += 1
    required = {"scripts/openrouter_error_runtime.py", "scripts/openrouter_inband_errors.py",
                "scripts/run_openrouter_session_v2.py"}
    if set(amendment["runtime_files_sha256"]) != required:
        errors.append("Error-handling runtime hash set is incomplete")
    return {"integrity_valid": not errors, "validation_errors": errors,
            "verified_checkpoint_files": checked, "runtime_files_verified": verified,
            "amendment": amendment, "amendment_sha256": digest(path)}


def install_runtime_extension(base, target):
    audit = audit_error_handling_amendment(base)
    if not audit["integrity_valid"]:
        raise RuntimeError(json.dumps(audit["validation_errors"]))
    from openrouter_inband_errors import install_inband_error_handling
    install_inband_error_handling()
    if not getattr(OpenRouterCoordinator, "_inband_error_event_patch", False):
        original_event = OpenRouterCoordinator.event

        def event(self, kind, **fields):
            return original_event(self, kind, transport_error_amendment_id=AMENDMENT_ID, **fields)

        OpenRouterCoordinator.event = event
        OpenRouterCoordinator._inband_error_event_patch = True
    row = {"at": datetime.now(timezone.utc).isoformat(), "pid": os.getpid(),
           "target": target, "amendment_id": AMENDMENT_ID,
           "amendment_sha256": audit["amendment_sha256"]}
    fd = os.open(Path(base) / "runtime/openrouter-error-handling-executions.jsonl",
                 os.O_CREAT | os.O_APPEND | os.O_WRONLY, 0o600)
    try:
        os.write(fd, (json.dumps(row) + "\n").encode())
        os.fsync(fd)
    finally:
        os.close(fd)


def dispatch(target, arguments):
    if target not in TARGETS:
        raise ValueError("Unsupported campaign target")
    install_runtime_extension(OUT, target)
    script = OUT / "scripts" / target
    sys.argv = [str(script), *arguments]
    if target == "run_longitudinal_openrouter.py":
        spec = importlib.util.spec_from_file_location("_openrouter_longitudinal_controller_v2", script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        # Each child is a fresh process; install the same extension there before
        # the unchanged session launcher creates a provider.
        module.PACED_SCRIPT = OUT / "scripts/run_openrouter_session_v2.py"
        return module.main()
    runpy.run_path(str(script), run_name="__main__")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Specify a campaign script")
    raise SystemExit(dispatch(sys.argv[1], sys.argv[2:]))
