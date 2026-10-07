"""Reproducible offline gate; never constructs a live provider.

Each suite runs in its own process with sockets blocked and a nonexistent key.
Fresh-session integration workers replace HTTPSConnection with fixture responses.
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path

from prepare_execution import HERE, PRIOR, digest, execution_files, read_json, verify_originals
from runtime_adapter import now, write_json

SUITES = ("test_prompt_adapter", "test_runtime_adapter", "test_export_review", "test_cleanup",
          "test_controller", "test_paired_runner")


def blocked(*args, **kwargs):
    raise AssertionError("Offline checks prohibit network access")


def run_suite(module, result_path):
    socket.socket.connect = blocked
    socket.socket.connect_ex = blocked
    socket.create_connection = blocked
    os.environ["OPENROUTER_API_KEY_FILE"] = str(HERE / "offline-checks/NONEXISTENT_OFFLINE_KEY")
    started = time.monotonic()
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromName(module))
    payload = {"suite": module, "status": "passed" if result.wasSuccessful() else "failed",
               "tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors),
               "skipped": len(result.skipped), "elapsed_seconds": round(time.monotonic() - started, 3),
               "network": "socket.connect/connect_ex/create_connection blocked; HTTP responses are explicit fixtures",
               "live_requests": 0}
    write_json(result_path, payload)
    return 0 if result.wasSuccessful() else 1


def run_all():
    from paired_runner import BUNDLED_PYTHON, worker_environment
    verify_originals()
    if (HERE / "manifest.json").exists() or (HERE / "runtime/launch.json").exists():
        raise RuntimeError("Frozen or launched package: preserve its verification; use a separate audit directory")
    root = HERE / "offline-checks"
    root.mkdir(exist_ok=True)
    attempt = root / ("attempt-" + str(time.time_ns()))
    attempt.mkdir()
    before = {str(p.relative_to(HERE)): digest(p) for p in execution_files()}
    results = []
    for module in SUITES:
        target = attempt / f"{module}.json"
        logfile = attempt / f"{module}.log"
        command = [str(BUNDLED_PYTHON), str(HERE / "offline_checks.py"), "_suite", "--module", module,
                   "--result", str(target)]
        with logfile.open("x", encoding="utf-8") as stream:
            child = subprocess.run(command, env=worker_environment(), cwd=HERE,
                                   stdout=stream, stderr=subprocess.STDOUT, timeout=600)
        result = read_json(target) if target.exists() else {"suite": module, "status": "failed", "tests": 0}
        result.update(exit_code=child.returncode, log=str(logfile.relative_to(HERE)), log_sha256=digest(logfile))
        results.append(result)
        print(f"{module}: {result['status']} ({result['tests']} tests)", flush=True)
        if child.returncode:
            print(logfile.read_text()[-5000:], flush=True)
            break
    after = {str(p.relative_to(HERE)): digest(p) for p in execution_files()}
    # Prior response scores and snapshots must remain byte-for-byte unchanged.
    snapshot = PRIOR / "safety-recall-fix/snapshots/completed-20260928T203601Z"
    historical = read_json(snapshot / "snapshot-manifest.json")["copied_files"]
    for relative, expected in historical.items():
        if digest(snapshot / relative) != expected or digest(PRIOR / "safety-recall-fix" / relative) != expected:
            raise RuntimeError("An earlier completed evidence artifact changed")
    verify_originals()
    passed = (len(results) == len(SUITES) and all(r["status"] == "passed" for r in results) and before == after)
    report = {"schema_version": 1, "timestamp": now(), "status": "passed" if passed else "failed",
              "suites": results, "tests": sum(r["tests"] for r in results), "live_requests": 0,
              "code_unchanged_during_checks": before == after, "historical_snapshot_files_verified": len(historical),
              "execution_files": after, "scope": "Implementation gate only; no empirical model accuracy claim"}
    write_json(root / "results.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("all", "_suite"), nargs="?", default="all")
    parser.add_argument("--module", choices=SUITES)
    parser.add_argument("--result", type=Path)
    args = parser.parse_args()
    if args.command == "_suite":
        raise SystemExit(run_suite(args.module, args.result))
    result = run_all()
    print(json.dumps({k: result[k] for k in ("status", "tests", "live_requests", "historical_snapshot_files_verified")}, indent=2))
    raise SystemExit(0 if result["status"] == "passed" else 1)
