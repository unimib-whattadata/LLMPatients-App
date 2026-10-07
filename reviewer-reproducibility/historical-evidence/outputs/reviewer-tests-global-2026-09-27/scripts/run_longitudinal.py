"""Coordinate 5 matched patient pairs through all 11 sessions; resumable."""
import argparse
import hashlib
import json
import os
import random
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT / "longitudinal-source"
SCRIPT = Path(__file__).with_name("run_longitudinal_session.py")
PACED_SCRIPT = Path(__file__).with_name("run_rate_limited_session.py")
STOP = threading.Event()
from campaign_rate_limit import AMENDMENT_ID as RATE_AMENDMENT_ID, audit_rate_limit_amendment


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, value):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temp.replace(path)


def counts():
    result = {"completed_sessions": 0, "observed_turns": 0, "completed_by_condition": {"full": 0, "baseline": 0}}
    for path in (OUT / "longitudinal/results").glob("*/*/session_*/session.json"):
        session = json.loads(path.read_text())
        result["observed_turns"] += len(session["turns"])
        if session["status"] == "completed":
            result["completed_sessions"] += 1
            result["completed_by_condition"][session["condition"]] += 1
    return result


def run_session(patient, condition, index):
    if STOP.is_set() or (OUT / "runtime/rate-control/STOP.json").exists():
        return {"patient": patient, "condition": condition, "session": index, "status": "paused_capacity", "exit_code": 75}
    session_dir = OUT / "longitudinal/results" / patient / condition / f"session_{index:02d}"
    session_dir.mkdir(parents=True, exist_ok=True)
    path = session_dir / "session.json"
    if path.exists() and json.loads(path.read_text())["status"] == "completed":
        return {"patient": patient, "condition": condition, "session": index, "status": "already_completed"}
    command = [sys.executable, str(PACED_SCRIPT), "--patient", patient, "--condition", condition, "--session", str(index)]
    with (session_dir / "process.log").open("a") as stream:
        started = time.monotonic()
        process = subprocess.Popen(command, stdout=stream, stderr=subprocess.STDOUT)
        while True:
            try:
                process.wait(timeout=30)
                break
            except subprocess.TimeoutExpired:
                elapsed = time.monotonic() - started
                write_json(session_dir / "process-monitor.json", {
                    "pid": process.pid, "process_alive": process.poll() is None,
                    "observed_at": now(), "elapsed_seconds": elapsed,
                    "advisory_timeout_seconds": 1800, "timeout_warning": elapsed > 1800,
                    "automatic_termination": False,
                })
        write_json(session_dir / "process-monitor.json", {
            "pid": process.pid, "process_alive": False, "observed_at": now(),
            "elapsed_seconds": time.monotonic() - started, "exit_code": process.returncode,
            "automatic_termination": False,
        })
    if process.returncode == 75:
        STOP.set()
    return {"patient": patient, "condition": condition, "session": index, "exit_code": process.returncode}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.workers <= 2
    rate_audit = audit_rate_limit_amendment(OUT)
    assert rate_audit["integrity_valid"], rate_audit["validation_errors"]
    assert (ROOT / "agent/core/langgraph_builder.py").exists()
    runner_text = SCRIPT.read_text()
    assert 'GCP_LOCATION="global"' in runner_text, "Global endpoint must be explicit in the session runtime"
    assert '"region": "global"' in runner_text, "Session endpoint metadata must match the runtime"
    assert '"amendment_id": AMENDMENT_ID' in runner_text
    amendment_path = OUT / "endpoint-amendment.json"
    amendment = json.loads(amendment_path.read_text())
    assert amendment["continuation_region"] == "global" and amendment["inherited_region"] == "us-central1"
    assert amendment["model_id"] == "gemini-2.5-pro"
    plan_path = OUT / "longitudinal/scenarios.json"
    plan = json.loads(plan_path.read_text())
    assert len(plan["patients"]) == 5
    for patient in plan["patients"]:
        assert len(patient["sessions"]) == 11
        for session in patient["sessions"]:
            assert len(session["turns"]) == 5
        source = ROOT / "data/patients" / f"{patient['patient_id']}.yaml"
        assert hashlib.sha256(source.read_bytes()).hexdigest() == patient["profile_source"]["sha256"]
    patients = [patient["patient_id"] for patient in plan["patients"]]
    rng = random.Random(20260927)
    schedule = []
    for index in range(1, 12):
        jobs = [[patient, condition, index] for patient in patients for condition in ["full", "baseline"]]
        rng.shuffle(jobs)
        schedule.append(jobs)
    source_manifest = json.loads((OUT / "longitudinal-source-manifest.json").read_text())
    for relative_path, expected in source_manifest.items():
        assert hashlib.sha256((ROOT / relative_path).read_bytes()).hexdigest() == expected
    manifest = {"prepared_at": now(), "expected_sessions": 110, "expected_turns": 550,
                "patients": patients, "conditions": ["full", "baseline"], "concurrent_sessions": 2,
                "scheduling_seed": 20260927, "schedule": schedule,
                "scenarios_sha256": hashlib.sha256(plan_path.read_bytes()).hexdigest(),
                "session_runner_sha256": hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
                "protocol_sha256": hashlib.sha256((OUT / "longitudinal/protocol.md").read_bytes()).hexdigest(),
                "scenario_verifier_sha256": hashlib.sha256((OUT / "longitudinal/verify_scenarios.py").read_bytes()).hexdigest(),
                "source_manifest_sha256": hashlib.sha256((OUT / "longitudinal-source-manifest.json").read_bytes()).hexdigest(),
                "model_id": "gemini-2.5-pro", "region": "global", "temperature": 0.7,
                "endpoint_amendment_id": amendment["id"],
                "endpoint_amendment_sha256": hashlib.sha256(amendment_path.read_bytes()).hexdigest(),
                "inherited_file_manifest_sha256": amendment["inherited_file_manifest_sha256"],
                "inherited_region": amendment["inherited_region"],
                "continuation_policy": "Reuse all accepted regional results, runtime failures and persisted state; resume missing work globally; report endpoint strata",
                "patient_response_initial_max_tokens": 4096, "provider_seed": "not set",
                "maximum_provider_attempts": 8, "minimum_request_interval_seconds_per_process": 4,
                "rate_limit_cooldown_seconds": 20,
                "fresh_process_per_session": True,
                "profile_parity": "same complete canonical YAML available; baseline flattens all profile/clinical/therapy/chat leaves",
                "history_parity": "same scripted therapist turns; condition-specific patient replies; baseline receives complete transcript; full uses native persistent state",
                "limitations": ["Five matched patient trajectories, one stochastic run per condition",
                                "Technical factual continuity benchmark; not clinician validation or clinical effectiveness",
                                "Whole-system comparison, not isolation of representation from context length",
                                "API route functions invoked directly; HTTP transport tested separately"]}
    manifest_path = OUT / "longitudinal/manifest.json"
    if manifest_path.exists():
        existing = json.loads(manifest_path.read_text())
        for field in ["scenarios_sha256", "session_runner_sha256", "source_manifest_sha256", "protocol_sha256", "scenario_verifier_sha256", "schedule", "region", "endpoint_amendment_id", "endpoint_amendment_sha256", "inherited_file_manifest_sha256"]:
            assert existing[field] == manifest[field], f"Frozen experiment changed: {field}"
    from analyze_longitudinal import audit_endpoint_amendment, audit_process_resumption
    audit_findings = []
    audit_endpoint_amendment(OUT, manifest, lambda level, code, message, **context:
                             audit_findings.append({"level": level, "code": code, "message": message, **context}))
    resumption_audit = audit_process_resumption(OUT, manifest, lambda level, code, message, **context:
                                               audit_findings.append({"level": level, "code": code, "message": message, **context}))
    resumption = resumption_audit["resumption"]
    assert args.workers == resumption["actual_requested_workers"]["longitudinal"]
    assert args.workers <= manifest["concurrent_sessions"]
    errors = [row for row in audit_findings if row["level"] == "error"]
    assert not errors, json.dumps(errors)
    if not manifest_path.exists():
        write_json(manifest_path, manifest)
    if args.prepare_only:
        print(json.dumps({"preflight": "passed", "expected_sessions": 110, "expected_turns": 550,
                          "region": "global", "endpoint_amendment_id": amendment["id"],
                          "inherited_completed_sessions": amendment["inherited_counts"]["longitudinal_session_statuses"]["completed"],
                          "inherited_observed_turns": amendment["inherited_counts"]["longitudinal_observed_turns"],
                          "process_resumption_id": resumption["id"],
                          "pause_checkpoint_turns": resumption["saved_longitudinal_turns_retained"],
                          "actual_requested_workers": args.workers,
                          "original_worker_limit": manifest["concurrent_sessions"],
                          "patient_inference_started": False}))
        return 0
    assert not (OUT / "runtime/rate-control/STOP.json").exists(), "Campaign capacity stop requires user-authorized resumption"
    status_path = OUT / "longitudinal/status.json"
    prior_status = json.loads(status_path.read_text()) if status_path.exists() else {}
    executions = prior_status.get("controller_execution_history", [])
    if prior_status.get("controller_execution"):
        executions = executions + [prior_status["controller_execution"]]
    execution = {"started_at": now(), "pid": os.getpid(), "actual_workers": args.workers,
                 "original_worker_limit": manifest["concurrent_sessions"],
                 "process_resumption_id": resumption["id"],
                 "process_resumption_sha256": resumption_audit["process_resumption_sha256"],
                 "checkpoint_manifest_sha256": resumption["checkpoint_manifest_sha256"],
                 "controller_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    execution.update(rate_limit_amendment_id=RATE_AMENDMENT_ID,
                     rate_limit_amendment_sha256=rate_audit["amendment_sha256"])
    status = {"status": "running", "pid": os.getpid(), "started_at": now(), "results": [],
              "actual_workers": args.workers, "original_worker_limit": manifest["concurrent_sessions"],
              "controller_execution": execution, "controller_execution_history": executions, **counts()}
    write_json(status_path, status)
    for index, jobs in enumerate(schedule, 1):
        failures = []
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(run_session, *job) for job in jobs]
            for future in as_completed(futures):
                if future.cancelled():
                    continue
                result = future.result()
                status["results"].append(result)
                status.update(counts(), updated_at=now(), current_session_round=index)
                write_json(status_path, status)
                print("LONGITUDINAL_PROGRESS", json.dumps(result | counts()), flush=True)
                if result.get("exit_code", 0):
                    failures.append(result)
                if result.get("exit_code") == 75:
                    STOP.set()
                    for pending in futures:
                        pending.cancel()
        if failures:
            status.update(status="paused_capacity" if STOP.is_set() else "incomplete", failures=failures, stopped_at=now())
            write_json(status_path, status)
            return 75 if STOP.is_set() else 1
    status.update(counts(), status="completed", finished_at=now())
    assert status["completed_sessions"] == 110 and status["observed_turns"] == 550
    write_json(status_path, status)
    print("LONGITUDINAL_COMPLETE", json.dumps(counts()), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
