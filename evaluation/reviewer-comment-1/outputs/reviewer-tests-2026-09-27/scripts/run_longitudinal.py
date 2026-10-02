"""Coordinate 5 matched patient pairs through all 11 sessions; resumable."""
import argparse
import hashlib
import json
import os
import random
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT / "longitudinal-source"
SCRIPT = Path(__file__).with_name("run_longitudinal_session.py")


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
    session_dir = OUT / "longitudinal/results" / patient / condition / f"session_{index:02d}"
    session_dir.mkdir(parents=True, exist_ok=True)
    path = session_dir / "session.json"
    if path.exists() and json.loads(path.read_text())["status"] == "completed":
        return {"patient": patient, "condition": condition, "session": index, "status": "already_completed"}
    command = [sys.executable, str(SCRIPT), "--patient", patient, "--condition", condition, "--session", str(index)]
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
    return {"patient": patient, "condition": condition, "session": index, "exit_code": process.returncode}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.workers <= 2
    assert (ROOT / "agent/core/langgraph_builder.py").exists()
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
                "patients": patients, "conditions": ["full", "baseline"], "concurrent_sessions": args.workers,
                "scheduling_seed": 20260927, "schedule": schedule,
                "scenarios_sha256": hashlib.sha256(plan_path.read_bytes()).hexdigest(),
                "session_runner_sha256": hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
                "protocol_sha256": hashlib.sha256((OUT / "longitudinal/protocol.md").read_bytes()).hexdigest(),
                "scenario_verifier_sha256": hashlib.sha256((OUT / "longitudinal/verify_scenarios.py").read_bytes()).hexdigest(),
                "source_manifest_sha256": hashlib.sha256((OUT / "longitudinal-source-manifest.json").read_bytes()).hexdigest(),
                "model_id": "gemini-2.5-pro", "region": "us-central1", "temperature": 0.7,
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
        for field in ["scenarios_sha256", "session_runner_sha256", "source_manifest_sha256", "protocol_sha256", "scenario_verifier_sha256", "schedule"]:
            assert existing[field] == manifest[field], f"Frozen experiment changed: {field}"
    else:
        write_json(manifest_path, manifest)
    if args.prepare_only:
        print(json.dumps({"preflight": "passed", "expected_sessions": 110, "expected_turns": 550}))
        return 0
    status_path = OUT / "longitudinal/status.json"
    status = {"status": "running", "pid": os.getpid(), "started_at": now(), "results": [], **counts()}
    write_json(status_path, status)
    for index, jobs in enumerate(schedule, 1):
        failures = []
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(run_session, *job) for job in jobs]
            for future in as_completed(futures):
                result = future.result()
                status["results"].append(result)
                status.update(counts(), updated_at=now(), current_session_round=index)
                write_json(status_path, status)
                print("LONGITUDINAL_PROGRESS", json.dumps(result | counts()), flush=True)
                if result.get("exit_code", 0):
                    failures.append(result)
        if failures:
            status.update(status="incomplete", failures=failures, stopped_at=now())
            write_json(status_path, status)
            return 1
    status.update(counts(), status="completed", finished_at=now())
    assert status["completed_sessions"] == 110 and status["observed_turns"] == 550
    write_json(status_path, status)
    print("LONGITUDINAL_COMPLETE", json.dumps(counts()), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
