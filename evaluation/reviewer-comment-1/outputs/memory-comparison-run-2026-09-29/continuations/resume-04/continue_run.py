"""Explicitly authorized continuation of an intact completed schedule prefix.

Operational controller only. Calls the original frozen worker unchanged, with
the original global gate, STOP path, schedule, prompts and provider settings.
A bounded transport policy permits three attempts for verified timeouts only.
No provider probe, model fallback, or process restart after final failure.
"""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import plistlib
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]
sys.path.insert(0, str(ORIGINAL))
import paired_runner as original
from checkpoint_audit import audit_checkpoint
from worker import RUN_ID

LABEL = "local.llmpatient.memory-comparison-20260929-resume04"
PLIST = HERE / "launchd.plist"
PARTIAL = f"{RUN_ID}/sessions/session_01/"


def exclusive_json(path, value):
    with Path(path).open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())


def no_other_workers():
    """PID numbers alone may be reused; match the exact experiment command."""
    result = subprocess.run(["/bin/ps", "-A", "-o", "pid=,ppid=,args="], capture_output=True, text=True, check=True)
    matches = []
    for line in result.stdout.splitlines():
        fields = line.strip().split(maxsplit=2)
        if len(fields) != 3 or not fields[0].isdigit() or not fields[1].isdigit():
            continue
        pid, parent_pid, args = int(fields[0]), int(fields[1]), fields[2]
        if pid == os.getpid():
            continue
        if (pid == os.getppid() or parent_pid == os.getpid()) and args.split()[0] == "/usr/bin/caffeinate":
            # macOS execs the utility and keeps an assertion child whose argv
            # still contains our invocation. Allow only our direct companion.
            continue
        if str(ORIGINAL / "paired_runner.py") in args and (" _worker " in args or args.endswith(" live")):
            matches.append(pid)
        if str(HERE / "continue_run.py") + " run" in args:
            matches.append(pid)
        if str(HERE / "worker.py") + " run" in args:
            matches.append(pid)
        for name in ("resume-01", "resume-02", "resume-03"):
            if str(HERE.parent / name / "continue_run.py") + " run" in args:
                matches.append(pid)
    if matches:
        raise RuntimeError(f"Another experiment controller or worker is active: {sorted(set(matches))}")


def source_paths():
    return [HERE / name for name in (
        "continue_run.py", "test_continuation.py", "checkpoint_audit.py", "test_checkpoint_audit.py",
        "worker.py", "test_worker.py", "native-preflight.json",
        "timeout_retries.py", "test_timeout_retries.py", "native_retry_check.py", "native-retry-results.json",
        "AMENDMENT.md", "launchd.plist", "offline-results.json", "checkpoint-audit.json", "snapshot-manifest.json")]


def make_plist():
    return {
        "Label": LABEL,
        "ProgramArguments": ["/usr/bin/caffeinate", "-i", str(original.BUNDLED_PYTHON),
                             str(HERE / "continue_run.py"), "run"],
        "WorkingDirectory": str(HERE),
        "EnvironmentVariables": original.worker_environment(),
        "RunAtLoad": True,
        "KeepAlive": False,
        "ProcessType": "Background",
        "StandardOutPath": str(HERE / "controller.stdout.log"),
        "StandardErrorPath": str(HERE / "controller.stderr.log"),
        "ExitTimeOut": 20,
    }


def prepare():
    no_other_workers()
    original.verify()
    if (HERE / "manifest.json").exists() or (HERE / "started.json").exists():
        raise RuntimeError("This continuation is already frozen or launched")
    checks = original.read_json(HERE / "offline-results.json")
    if checks.get("status") != "passed" or checks.get("live_requests") != 0:
        raise RuntimeError("Continuation offline checks did not pass")
    expected_code = checks["source_sha256"]
    if any(original.digest(HERE / name) != value for name, value in expected_code.items()):
        raise RuntimeError("Continuation code changed since its offline checks")
    integration = original.read_json(HERE / "native-retry-results.json")
    if (integration.get("status") != "passed" or integration.get("live_requests") != 0
            or any(original.digest(HERE / name) != value
                   for name, value in integration["source_sha256"].items())):
        raise RuntimeError("Native transport retry integration has not passed on this code")
    preflight = original.read_json(HERE / "native-preflight.json")
    if (preflight.get("status") != "passed" or preflight.get("live_requests") != 0
            or not preflight.get("original_runtime_unchanged")
            or preflight["source_sha256"] != original.digest(HERE / "worker.py")):
        raise RuntimeError("Native recovery preflight has not passed on this worker")
    audit = audit_checkpoint(ORIGINAL)
    if audit["completed_sessions"] != 9 or audit["accepted_turns"] != 49 or audit["next_execution_order"] != 10:
        raise RuntimeError("The authorized checkpoint differs from the inspected partial tenth session")
    original.write_json(HERE / "checkpoint-audit.json", audit)
    snapshot = HERE / "snapshot"
    snapshot.mkdir(exist_ok=False)
    files = audit["runtime_file_sha256"]
    for relative, expected in files.items():
        source = ORIGINAL / "runtime" / relative
        if original.digest(source) != expected:
            raise RuntimeError("Runtime changed during checkpoint snapshot")
        target = snapshot / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        if original.digest(target) != expected:
            raise RuntimeError("Checkpoint snapshot differs from its source")
    exclusive_json(HERE / "snapshot-manifest.json", {"created_at": original.now(), "files": files,
        "source": str(ORIGINAL / "runtime"), "scope": "Nine closed sessions plus four accepted turns, both historical504errors, STOP and unresolved gate before authorized recovery"})
    with PLIST.open("xb") as stream:
        plistlib.dump(make_plist(), stream, sort_keys=True)
    # Recheck everything after snapshot, before freezing or launching.
    if audit_checkpoint(ORIGINAL)["runtime_file_sha256"] != files:
        raise RuntimeError("Runtime changed before continuation freeze")
    manifest = {"schema_version": 1, "frozen_at": original.now(), "authorization": "User instruction: Ok procedi, authorizing bounded timeout retries and continuation",
        "original_execution_manifest_sha256": original.digest(ORIGINAL / "manifest.json"),
        "next_execution_order": 10, "completed_sessions_preserved": 9, "accepted_turns_preserved": 49,
        "requests_preserved": audit["requests"], "responses_preserved": audit["responses"],
        "native_inference_code_changed": False, "recovery_worker_added": True, "live_calls_at_freeze": 0,
        "transport_policy": {"version": "bounded_timeout_retry_v1", "max_attempts": 3, "retry_delays_seconds": [30, 60], "minimum_interval_seconds": 5, "model_fallback": False},
        "recovery_deviation": "Flat turn5 resumes with byte-identical prompt; all future calls use bounded timeout policy with unchanged graph/model/settings",
        "files": {str(p.relative_to(HERE)): original.digest(p) for p in source_paths()},
        "supervisor": {"kind": "one_shot_user_launchd_job", "label": LABEL,
                       "automatic_restart": False, "idle_sleep_assertion": "Only while this one-shot job is running"}}
    exclusive_json(HERE / "manifest.json", manifest)
    return {"status": "prepared", "next_execution_order": 10, "snapshot_files": len(files)}


def verify():
    original.verify()
    manifest = original.read_json(HERE / "manifest.json")
    if original.digest(ORIGINAL / "manifest.json") != manifest["original_execution_manifest_sha256"]:
        raise RuntimeError("The original frozen inference package changed")
    for relative, expected in manifest["files"].items():
        if original.digest(HERE / relative) != expected:
            raise RuntimeError(f"Continuation source or evidence changed: {relative}")
    snapshot = original.read_json(HERE / "snapshot-manifest.json")
    for relative, expected in snapshot["files"].items():
        if original.digest(HERE / "snapshot" / relative) != expected:
            raise RuntimeError("Original checkpoint snapshot changed")
    return manifest


def verify_preserved_prefix():
    """Old replies remain byte prefixes; closed native sessions stay identical."""
    snapshot = original.read_json(HERE / "snapshot-manifest.json")
    mutable_control = {"active-execution.json", "progress.json", "request-gate.json", "request-gate.lock"}
    for relative in snapshot["files"]:
        previous = (HERE / "snapshot" / relative).read_bytes()
        if relative == "STOP":
            current_stop = ORIGINAL / "runtime/STOP"
            if current_stop.exists() and current_stop.read_bytes() == previous:
                continue
            if (HERE / "resolved-stop.json").read_bytes() != previous:
                raise RuntimeError("Historical STOP was not preserved before clearing")
            continue
        current = (ORIGINAL / "runtime" / relative).read_bytes()
        path = Path(relative)
        if relative in mutable_control:
            continue
        if (path.name in {"accepted-turns.jsonl", "processes.jsonl"}
                or ("memory" in path.parts and path.suffix == ".jsonl")
                or (relative.startswith(PARTIAL) and path.name in {"generation-events.jsonl", "openrouter-api-records.jsonl"})):
            if not current.startswith(previous):
                raise RuntimeError("Previously saved append-only evidence changed")
        elif "runs" in path.parts and path.suffix == ".json":
            before, after = json.loads(previous), json.loads(current)
            if relative.startswith(RUN_ID + "/"):
                first, later = before["sessions"][0], after["sessions"][0]
                stable = {k:v for k,v in first.items() if k not in {"turns", "final_state", "last_updated_at"}}
                if (before["therapist_id"] != after["therapist_id"] or later["turns"][:4] != first["turns"]
                        or any(later.get(k) != v for k,v in stable.items())):
                    raise RuntimeError("Previously accepted native turns changed")
                continue
            if before["therapist_id"] != after["therapist_id"] or after["sessions"][:len(before["sessions"])] != before["sessions"]:
                raise RuntimeError("Previously closed native session changed")
        elif relative == PARTIAL + "session.json":
            before, after = json.loads(previous), json.loads(current)
            if after["turns"][:4] != before["turns"] or any(after.get(k) != before.get(k) for k in ("run_id", "session_id", "arm", "case_sha256", "execution_manifest_sha256")):
                raise RuntimeError("Previously accepted partial receipt changed")
        elif current != previous:
            raise RuntimeError(f"Previously completed evidence changed: {relative}")


def update_state(status, **fields):
    original.write_json(HERE / "state.json", {"status": status, "timestamp": original.now(),
        "controller_pid": os.getpid(), "continuation": "resume-04", **fields})


def require_completed_receipt(saved, item, launch):
    expected = {"status": "completed", "inference_mode": "live_openrouter", "run_id": item["run_id"],
        "session_index": item["session_index"], "arm": item["arm"],
        "execution_manifest_sha256": launch["execution_manifest_sha256"]}
    if any(saved.get(k) != v for k, v in expected.items()) or len(saved.get("turns", [])) != 5:
        raise RuntimeError("Worker receipt does not attest the scheduled completed session")


def run_schedule(schedule, launch):
    runtime = ORIGINAL / "runtime"
    active = None
    try:
        for item in schedule:
            verify()
            verify_preserved_prefix()
            if (runtime / "STOP").exists():
                raise RuntimeError("Global STOP exists; remaining schedule cannot run")
            run_id, index = item["run_id"], item["session_index"]
            session_dir = runtime / run_id / "sessions" / f"session_{index:02d}"
            recovering = item["execution_order"] == 10
            if session_dir.exists() and not recovering:
                raise RuntimeError("Next session already has artifacts; no automatic replay")
            if recovering:
                if original.read_json(session_dir / "session.json")["status"] != "stopped":
                    raise RuntimeError("Recovery session has already been attempted")
            else:
                session_dir.mkdir(parents=True, exist_ok=False)
            original.write_json(runtime / "active-execution.json", {**item, "launch_id": launch["launch_id"]})
            command = [str(original.BUNDLED_PYTHON), str(HERE / "worker.py"), "run",
                       "--execution-order", str(item["execution_order"]), "--launch-id", launch["launch_id"]]
            log_name = "worker-resume04.log" if recovering else "worker.log"
            with (session_dir / log_name).open("x", encoding="utf-8") as stream:
                active = subprocess.Popen(command, env=original.worker_environment(), cwd=session_dir,
                    stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
                original.append_jsonl(runtime / "processes.jsonl", {"event": "start", "timestamp": original.now(),
                    **item, "pid": active.pid, "command": command, "continuation": "resume-04"})
                started = last_heartbeat = time.monotonic()
                update_state("running", execution_order=item["execution_order"], worker_pid=active.pid, run_id=run_id)
                while active.poll() is None:
                    elapsed = time.monotonic() - started
                    if elapsed > 1200:
                        original.terminate_worker(active, runtime, run_id=run_id, session_index=index)
                        raise RuntimeError("Session exceeded1200seconds; no automatic replay")
                    if time.monotonic() - last_heartbeat >= 30:
                        update_state("running", execution_order=item["execution_order"], worker_pid=active.pid,
                                     run_id=run_id, session_elapsed_seconds=round(elapsed, 1))
                        last_heartbeat = time.monotonic()
                    time.sleep(.5)
                code = active.returncode
                original.append_jsonl(runtime / "processes.jsonl", {"event": "exit", "timestamp": original.now(),
                    **item, "pid": active.pid, "exit_code": code, "continuation": "resume-04"})
                active = None
            if code != 0:
                raise RuntimeError(f"Worker exited {code}; entire schedule halted")
            require_completed_receipt(original.read_json(session_dir / "session.json"), item, launch)
            verify_preserved_prefix()
            progress = original.summarize(runtime)
            original.write_json(runtime / "progress.json", progress)
            print(f"SESSION_DONE {item['execution_order']}/330 run={run_id} session={index}", flush=True)
        verify()
        verify_preserved_prefix()
        progress = original.summarize(runtime)
        original.write_json(runtime / "progress.json", progress)
        update_state("completed", progress=progress)
        return progress
    except BaseException as exc:
        try:
            original.stop_campaign(runtime, "continuation_controller_failure", error_type=type(exc).__name__)
        except BaseException as extra:
            exc.add_note(f"STOP persistence also failed: {type(extra).__name__}")
        finally:
            try:
                if active is not None:
                    original.terminate_worker(active, runtime)
            except BaseException as extra:
                exc.add_note(f"Worker cleanup also failed: {type(extra).__name__}")
            finally:
                try:
                    progress = original.summarize(runtime)
                    original.write_json(runtime / "progress.json", progress)
                    update_state("stopped", error_type=type(exc).__name__, progress=progress)
                except BaseException as extra:
                    exc.add_note(f"Progress persistence also failed: {type(extra).__name__}")
        raise


def run():
    # Lock plus exclusive launch receipt: loading the job twice cannot send calls.
    with (HERE / "controller.lock").open("a") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        manifest = verify()
        no_other_workers()
        audit = audit_checkpoint(ORIGINAL)
        frozen = original.read_json(HERE / "checkpoint-audit.json")
        if audit["runtime_file_sha256"] != frozen["runtime_file_sha256"]:
            raise RuntimeError("Runtime changed since the explicit continuation was prepared")
        exclusive_json(HERE / "started.json", {"timestamp": original.now(), "pid": os.getpid(),
            "manifest_sha256": original.digest(HERE / "manifest.json"), "supervisor_label": LABEL,
            "resumes_after_execution_order": manifest["next_execution_order"] - 1})
        try:
            resolve_known_error(frozen)
            launch = original.read_json(ORIGINAL / "runtime/launch.json")
            original.append_jsonl(ORIGINAL / "runtime/processes.jsonl", {
                "event": "continuation_authorized", "timestamp": original.now(), "continuation": "resume-04",
                "next_execution_order": manifest["next_execution_order"], "controller_pid": os.getpid(),
                "historical_exit_not_inferred": True,
                "reconciliation": "Nine complete sessions plus four committed flat turns and the terminal504 were reconciled; all historical requests and errors retained."})
            original.write_json(ORIGINAL / "runtime/progress.json", original.summarize(ORIGINAL / "runtime"))
            schedule = original.read_json(ORIGINAL / "generation/schedule.json")["session_executions"]
            remaining = [r for r in schedule if r["execution_order"] >= manifest["next_execution_order"]]
            return run_schedule(remaining, launch)
        except BaseException as exc:
            original.stop_campaign(ORIGINAL / "runtime", "continuation_start_or_run_failure", error_type=type(exc).__name__)
            update_state("stopped", error_type=type(exc).__name__, progress=original.summarize(ORIGINAL / "runtime"))
            raise


def resolve_known_error(audit):
    """Manual recovery of the explicitly archived error, never a blind retry."""
    runtime = ORIGINAL / "runtime"
    with (runtime / "request-gate.lock").open("a") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        for name in ("STOP", "request-gate.json"):
            if original.digest(runtime / name) != audit["runtime_file_sha256"][name]:
                raise RuntimeError("Failure/gate changed since its explicit reconciliation")
        with (HERE / "resolved-stop.json").open("xb") as saved:
            saved.write((runtime / "STOP").read_bytes())
            saved.flush()
            os.fsync(saved.fileno())
        gate = original.read_json(runtime / "request-gate.json")
        exclusive_json(HERE / "resolution.json", {"timestamp": original.now(), "authorization": "Procedi",
            "previous_gate": gate, "terminal_failure": audit["archived_error"],
            "action": "Clear the identified terminal error gate and STOP once; retain every historical record"})
        original.write_json(runtime / "request-gate.json", {"last_started": gate["last_started"], "in_flight": None})
        (runtime / "STOP").unlink()


def launch():
    verify()
    no_other_workers()
    if (HERE / "started.json").exists() or (HERE / "launch-attempt.json").exists():
        raise RuntimeError("Continuation launch was already attempted; inspect outcome, never silently retry")
    domain = f"gui/{os.getuid()}"
    exclusive_json(HERE / "launch-attempt.json", {"timestamp": original.now(), "domain": domain, "label": LABEL})
    result = subprocess.run(["/bin/launchctl", "bootstrap", domain, str(PLIST)], capture_output=True, text=True)
    original.write_json(HERE / "launch-result.json", {"timestamp": original.now(), "returncode": result.returncode,
        "stdout": result.stdout, "stderr": result.stderr, "label": LABEL, "domain": domain})
    if result.returncode:
        raise RuntimeError("One-shot launchd bootstrap failed; no automatic launch retry")
    return {"status": "dispatched_to_launchd", "label": LABEL, "automatic_restart": False}


def interrupted(signum, frame):
    raise InterruptedError(f"Controller received signal {signum}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "verify", "launch", "run"))
    args = parser.parse_args()
    if args.command == "run":
        signal.signal(signal.SIGTERM, interrupted)
        signal.signal(signal.SIGINT, interrupted)
    result = {"prepare": prepare, "verify": verify, "launch": launch, "run": run}[args.command]()
    print(json.dumps(result, indent=2))
