"""Frozen native execution with the authorized bounded timeout policy.

Only the stopped flat session needs a recovery path: restore its four accepted
pairs and send its exact fifth prompt. Later sessions use paired_runner intact.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path
import shutil
import socket
import sys
import tempfile
import time
from uuid import uuid4

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]
sys.path.insert(0, str(ORIGINAL))
import paired_runner as original
from prompt_contract import flat_context_from_ledger, render_prompt

RUN_ID = "juanita_delgado_001__r02__flat_full_history"


class NoLiveModel:
    def generate_content(self, *args, **kwargs):
        raise AssertionError("Offline preflight cannot call a provider")


def attach_policy(result):
    result["transport_amendment"] = {
        "continuation": "resume-04", "policy": "bounded_timeout_retry_v1",
        "max_attempts": 3, "retry_delays_seconds": [30, 60],
        "continuation_manifest_sha256": original.digest(HERE / "manifest.json") if (HERE / "manifest.json").exists() else None,
    }


async def resume_flat(runtime, audit, *, preflight=False):
    config = original.load_run(RUN_ID)
    runtime = Path(runtime).resolve()
    if (runtime / "STOP").exists():
        raise RuntimeError("Global STOP prevents recovery")
    run_dir = runtime / RUN_ID
    session_dir = run_dir / "sessions/session_01"
    result_path = session_dir / "session.json"
    result = original.read_json(result_path)
    accepted = original.read_jsonl(run_dir / "accepted-turns.jsonl")
    if result["status"] != "stopped" or len(accepted) != 4 or result["turns"] != accepted:
        raise RuntimeError("The four-turn flat checkpoint changed")
    ledger_before = (run_dir / "accepted-turns.jsonl").read_bytes()
    recovery_path = session_dir / "recovery-resume04.json"
    if recovery_path.exists():
        raise RuntimeError("This recovery was already attempted")
    case = (ORIGINAL / "generation" / config["case_path"]).read_text()
    turn = original.read_json(ORIGINAL / "generation" / config["scenario_path"])["sessions"][0]["turns"][4]
    result.update(status="resuming", resumed_at=original.now(), pid=os.getpid(), process_instance_id=str(uuid4()),
        recovery={"continuation": "resume-04", "preserved_turns": 4,
            "original_stopped_receipt_sha256": original.digest(result_path),
            "original_error": result.get("error"), "original_finished_at": result.get("finished_at")})
    result.pop("error", None)
    result.pop("finished_at", None)
    attach_policy(result)
    original.write_json(result_path, result)
    builder = runner = None
    cwd = Path.cwd()
    context = {"run_id": RUN_ID, "arm": config["arm"], "session_index": 1, "turn_id": turn["turn_id"]}
    try:
        os.chdir(session_dir)
        api, builder, run_logger, runner = original.bootstrap_runtime(config, case, session_dir, run_dir, runtime,
            context, offline_model=NoLiveModel() if preflight else None)
        if api is not None:
            raise RuntimeError("Flat recovery must not instantiate the structured API")
        state = builder.State(user_input=turn["text"])
        builder.sanitize_user_input(state)
        history = flat_context_from_ledger(run_dir / "accepted-turns.jsonl", run_id=RUN_ID, expected_prior_turns=4)
        prompt = render_prompt(case_block=case, arm_context=history, latest_question=state.safe_user_input)
        if prompt != audit["failed_request"]["prompt"]:
            raise RuntimeError("Recovered flat prompt differs from the failed request")
        if audit["failed_request"]["graph_requested_config"] != {"temperature": None, "max_tokens": None, "thinking_budget": None}:
            raise RuntimeError("Unexpected failed generation settings")
        original.write_json(recovery_path, {"timestamp": original.now(), "continuation": "resume-04",
            "preserved_turns": 4, "prompt_identical_to_failed_request": True,
            "prior_failed_logical_id": audit["failed_request"]["logical_id"],
            "mode": "offline_preflight" if preflight else "live"})
        state.prompt = prompt
        if preflight:
            def fixture_generate(prompt, **kwargs):
                if prompt != audit["failed_request"]["prompt"] or kwargs:
                    raise AssertionError("Offline native call differs from the frozen pending request")
                return "Offline fixture response; this is not model evidence."
            runner.generate = fixture_generate
        started = time.monotonic()
        patient_text = builder.generate_response(state)["response"]
        if not isinstance(patient_text, str) or not patient_text.strip():
            runner.abort("No visible recovered reply", {"kind": "empty_patient_response"})
        runner.check()
        failure = bool(state.safety_flags or state.safe_user_input != turn["text"] or patient_text in original.FALLBACKS)
        record = {"run_id": RUN_ID, "status": "accepted", "turn_index": 5, "session_index": 1,
            "turn_id": turn["turn_id"], "therapist_text": turn["text"], "patient_text": patient_text,
            "safe_user_input": state.safe_user_input, "safety_flags": state.safety_flags,
            "application_guard_failure": failure, "prompt": prompt, "timestamp": original.now(),
            "elapsed_seconds": time.monotonic() - started, "history_turns_in_prompt": 4}
        original.append_jsonl(run_dir / "accepted-turns.jsonl", record)
        accepted.append(record)
        result["turns"].append(record)
        if not (run_dir / "accepted-turns.jsonl").read_bytes().startswith(ledger_before):
            raise RuntimeError("Original flat replies were changed")
        if failure:
            original.write_json(run_dir / "probe-outcomes.json", {"outcomes": [
                {"turn_id": r["turn_id"], "status": "application_failure"} for r in accepted if r["application_guard_failure"]]})
        if list((run_dir / "memory").glob("*.jsonl")) or list((run_dir / "runs").glob("*.json")):
            raise RuntimeError("Flat recovery wrote structured memory")
        result.update(status="completed", finished_at=original.now(),
            finalization={"status": "baseline_closed", "total_turns": 5, "history_turns_retained": 5, "structured_memory_calls": 0},
            memory_status="not_applicable", accepted_ledger_sha256=original.digest(run_dir / "accepted-turns.jsonl"),
            state_files_at_close={})
        if preflight:
            result.update(status="offline_preflight_passed", inference_mode="offline_stub", live_requests=0)
        runner.check()
    except BaseException as exc:
        result.update(status="stopped", finished_at=original.now(), error={"type": type(exc).__name__,
            "details": getattr(exc, "details", None), "message": "Recovery halted; original replies retained."})
        original.stop_campaign(runtime, "flat_recovery_failure", runner=runner, error_type=type(exc).__name__)
        raise
    finally:
        try:
            original.write_json(result_path, result)
        finally:
            try:
                if builder is not None:
                    builder.SUMMARY_EXECUTOR.shutdown(wait=True, cancel_futures=True)
            finally:
                os.chdir(cwd)
    return result


def preflight():
    from checkpoint_audit import audit_checkpoint
    def deny(*args, **kwargs):
        raise AssertionError("Offline preflight blocks the network")
    socket.socket.connect = socket.socket.connect_ex = socket.create_connection = deny
    audit = audit_checkpoint(ORIGINAL)
    with tempfile.TemporaryDirectory(prefix="memory-resume04-preflight-") as temporary:
        runtime = Path(temporary)
        shutil.copytree(ORIGINAL / "runtime" / RUN_ID, runtime / RUN_ID)
        result = asyncio.run(resume_flat(runtime, audit, preflight=True))
        if result["status"] != "offline_preflight_passed" or len(result["turns"]) != 5:
            raise RuntimeError("The offline native flat recovery did not complete")
        output = {"status": "passed", "live_requests": 0, "timestamp": original.now(),
            "source_sha256": original.digest(HERE / "worker.py"),
            "prompt_identical_to_failed_request": True, "prior_turns_preserved": 4,
            "original_runtime_unchanged": audit["runtime_file_sha256"] == audit_checkpoint(ORIGINAL)["runtime_file_sha256"]}
        original.write_json(HERE / "native-preflight.json", output)
        print(json.dumps(output, indent=2))


def run_worker(order, launch_id):
    import continue_run
    from timeout_retries import install_retry_policy
    if type(order) is not int or not 10 <= order <= 330:
        raise RuntimeError("Worker execution order is outside its authorization")
    continue_run.verify()
    continue_run.verify_preserved_prefix()
    runtime = ORIGINAL / "runtime"
    active = original.read_json(runtime / "active-execution.json")
    launch = original.read_json(runtime / "launch.json")
    expected = original.read_json(ORIGINAL / "generation/schedule.json")["session_executions"][order - 1]
    if (active != {**expected, "launch_id": launch_id}
            or launch["launch_id"] != launch_id or (runtime / "STOP").exists()):
        raise RuntimeError("Worker lacks its active scheduled authorization")
    install_retry_policy(runtime)
    result_path = runtime / expected["run_id"] / "sessions" / f"session_{expected['session_index']:02d}/session.json"
    try:
        if order == 10:
            return asyncio.run(resume_flat(runtime, original.read_json(HERE / "checkpoint-audit.json")))
        return original.live_worker(order, launch_id)
    finally:
        if result_path.exists():
            result = original.read_json(result_path)
            attach_policy(result)
            original.write_json(result_path, result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("preflight", "run"))
    parser.add_argument("--execution-order", type=int)
    parser.add_argument("--launch-id")
    args = parser.parse_args()
    if args.mode == "preflight":
        preflight()
    else:
        result = run_worker(args.execution_order, args.launch_id)
        print(json.dumps({"status": result["status"], "run_id": result["run_id"]}))
