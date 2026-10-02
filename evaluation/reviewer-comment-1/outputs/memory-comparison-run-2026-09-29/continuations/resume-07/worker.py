"""Resume only the pending flat-history reply after the observed credit stop.

The 49 accepted pairs remain the complete history. The native response formatter
and frozen generation settings are retained. HTTP 402 remains a terminal error;
later scheduled sessions use paired_runner and the unchanged resume-06 policy.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
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

RUN_ID = "jason_smith_001__r01__flat_full_history"
SESSION_INDEX = 10
SESSION_ID = "comparison_s10"
TURN_ID = "s10t05"
PRIOR_TURNS = 49
EXECUTION_ORDER = 290
GRAPH_OPTIONS = {"temperature": None, "max_tokens": None, "thinking_budget": None}


class NoLiveModel:
    def generate_content(self, *args, **kwargs):
        raise AssertionError("Offline preflight cannot call a provider")


def attach_policy(result):
    result["transport_amendment"] = {
        "continuation": "resume-07", "policy": "bounded_transient_retry_v2",
        "policy_source_continuation": "resume-06", "max_attempts": 3,
        "timeout_retry_delays_seconds": [30, 60], "rate_limit_retry_delays_seconds": [60, 120],
        "honor_retry_after": True, "maximum_retry_wait_seconds": 300,
        "continuation_manifest_sha256": original.digest(HERE / "manifest.json") if (HERE / "manifest.json").exists() else None,
    }


def install_pending_generation(runner, failed, *, preflight=False):
    """Check the actual native invocation without replacing the runner's type."""
    ordinary_generate = runner.generate
    progress = {"logical_generations": 0}

    def generate(prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
        runner.check()
        options = {"temperature": temperature, "max_tokens": max_tokens, "thinking_budget": thinking_budget}
        if progress["logical_generations"] or prompt.encode("utf-8") != failed["prompt"].encode("utf-8") or options != GRAPH_OPTIONS:
            runner.abort("Recovered native call differs from the pending flat request",
                         {"kind": "recovery_mismatch", "stage": "generate_response"})
        progress["logical_generations"] += 1
        if preflight:
            return "Offline fixture response; this is not model evidence."
        return ordinary_generate(prompt=prompt, temperature=temperature, max_tokens=max_tokens,
                                 thinking_budget=thinking_budget)

    runner.generate = generate
    return progress


async def resume_flat(runtime, audit, *, preflight=False):
    config = original.load_run(RUN_ID)
    runtime = Path(runtime).resolve()
    if (runtime / "STOP").exists():
        raise RuntimeError("Global STOP prevents recovery")
    run_dir = runtime / RUN_ID
    session_dir = run_dir / f"sessions/session_{SESSION_INDEX:02d}"
    result_path = session_dir / "session.json"
    ledger_path = run_dir / "accepted-turns.jsonl"
    result = original.read_json(result_path)
    accepted = original.read_jsonl(ledger_path)
    if (config["arm"] != "flat_full_history" or result.get("run_id") != RUN_ID
            or result.get("arm") != "flat_full_history" or result.get("session_index") != SESSION_INDEX
            or result.get("session_id") != SESSION_ID or result.get("prior_finalized_sessions") != 9
            or result["status"] != "stopped" or len(accepted) != PRIOR_TURNS
            or len(result["turns"]) != 4 or result["turns"] != accepted[45:49]):
        raise RuntimeError("The 49-turn/four-turn flat checkpoint changed")
    ledger_before = ledger_path.read_bytes()
    recovery_path = session_dir / "recovery-resume07.json"
    if recovery_path.exists():
        raise RuntimeError("This recovery was already attempted")
    if list((run_dir / "memory").glob("*.jsonl")) or list((run_dir / "runs").glob("*.json")):
        raise RuntimeError("Flat recovery found structured memory")
    case = (ORIGINAL / "generation" / config["case_path"]).read_text(encoding="utf-8")
    turn = original.read_json(ORIGINAL / "generation" / config["scenario_path"])["sessions"][9]["turns"][4]
    failed = audit["failed_request"]
    if (turn["turn_id"] != TURN_ID or failed.get("stage") != "generate_response"
            or failed.get("turn_id") != TURN_ID or failed.get("session_index") != SESSION_INDEX
            or failed["graph_requested_config"] != GRAPH_OPTIONS):
        raise RuntimeError("Unexpected pending generation identity or settings")
    result.update(status="resuming", resumed_at=original.now(), pid=os.getpid(), process_instance_id=str(uuid4()),
        recovery={"continuation": "resume-07", "preserved_turns": 4, "preserved_run_turns": PRIOR_TURNS,
            "original_stopped_receipt_sha256": original.digest(result_path),
            "original_error": result.get("error"), "original_finished_at": result.get("finished_at")})
    result.pop("error", None)
    result.pop("finished_at", None)
    attach_policy(result)
    original.write_json(result_path, result)
    builder = runner = None
    cwd = Path.cwd()
    context = {"run_id": RUN_ID, "arm": config["arm"], "session_index": SESSION_INDEX, "turn_id": TURN_ID}
    try:
        os.chdir(session_dir)
        api, builder, run_logger, runner = original.bootstrap_runtime(config, case, session_dir, run_dir, runtime,
            context, offline_model=NoLiveModel() if preflight else None)
        if api is not None:
            raise RuntimeError("Flat recovery must not instantiate the structured API")
        state = builder.State(user_input=turn["text"])
        builder.sanitize_user_input(state)
        history = flat_context_from_ledger(ledger_path, run_id=RUN_ID, expected_prior_turns=PRIOR_TURNS)
        prompt = render_prompt(case_block=case, arm_context=history, latest_question=state.safe_user_input)
        if prompt.encode("utf-8") != failed["prompt"].encode("utf-8"):
            raise RuntimeError("Recovered flat prompt differs from the failed request")
        if prompt.count("<CASE>\n" + case + "</CASE>") != 1:
            raise RuntimeError("Common clinical case not present exactly once")
        proof = {"timestamp": original.now(), "continuation": "resume-07", "preserved_turns": 4,
            "preserved_run_turns": PRIOR_TURNS, "prompt_identical_to_failed_request": True,
            "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
            "prior_failed_logical_id": failed["logical_id"],
            "prior_failed_native_record_id": audit["failed_outcome"]["native_record_id"],
            "graph_requested_config": GRAPH_OPTIONS, "mode": "offline_preflight" if preflight else "live"}
        with recovery_path.open("x", encoding="utf-8") as stream:
            json.dump(proof, stream, ensure_ascii=False, allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        state.prompt = prompt
        progress = install_pending_generation(runner, failed, preflight=preflight)
        started = time.monotonic()
        patient_text = builder.generate_response(state)["response"]
        if not isinstance(patient_text, str) or not patient_text.strip():
            runner.abort("No visible recovered reply", {"kind": "empty_patient_response"})
        runner.check()
        if progress != {"logical_generations": 1}:
            raise RuntimeError("Recovery did not execute exactly the pending logical generation")
        failure = bool(state.safety_flags or state.safe_user_input != turn["text"] or patient_text in original.FALLBACKS)
        record = {"run_id": RUN_ID, "status": "accepted", "turn_index": 50, "session_index": SESSION_INDEX,
            "turn_id": TURN_ID, "therapist_text": turn["text"], "patient_text": patient_text,
            "safe_user_input": state.safe_user_input, "safety_flags": state.safety_flags,
            "application_guard_failure": failure, "prompt": prompt, "timestamp": original.now(),
            "elapsed_seconds": time.monotonic() - started, "history_turns_in_prompt": PRIOR_TURNS}
        original.append_jsonl(ledger_path, record)
        accepted.append(record)
        result["turns"].append(record)
        original.write_json(result_path, result)
        if not ledger_path.read_bytes().startswith(ledger_before):
            raise RuntimeError("Original flat replies were changed")
        if failure:
            original.write_json(run_dir / "probe-outcomes.json", {"outcomes": [
                {"turn_id": r["turn_id"], "status": "application_failure"} for r in accepted if r["application_guard_failure"]]})
        runner.check()
        context["turn_id"] = None
        if list((run_dir / "memory").glob("*.jsonl")) or list((run_dir / "runs").glob("*.json")):
            raise RuntimeError("Flat recovery wrote structured memory")
        result.update(status="completed", finished_at=original.now(),
            finalization={"status": "baseline_closed", "total_turns": 50, "history_turns_retained": 50, "structured_memory_calls": 0},
            memory_status="not_applicable", accepted_ledger_sha256=original.digest(ledger_path), state_files_at_close={})
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
    with tempfile.TemporaryDirectory(prefix="memory-resume07-preflight-") as temporary:
        runtime = Path(temporary).resolve()
        shutil.copytree(ORIGINAL / "runtime" / RUN_ID, runtime / RUN_ID)
        ledger = runtime / RUN_ID / "accepted-turns.jsonl"
        before = ledger.read_bytes()
        result = asyncio.run(resume_flat(runtime, audit, preflight=True))
        after = original.read_jsonl(ledger)
        if (result["status"] != "offline_preflight_passed" or len(result["turns"]) != 5
                or len(after) != 50 or not ledger.read_bytes().startswith(before)
                or after[-1]["turn_id"] != TURN_ID or after[-1]["history_turns_in_prompt"] != PRIOR_TURNS):
            raise RuntimeError("The offline native flat recovery did not complete exactly the pending turn")
        unchanged = audit["runtime_file_sha256"] == audit_checkpoint(ORIGINAL)["runtime_file_sha256"]
        if not unchanged:
            raise RuntimeError("Offline preflight changed the original runtime")
        output = {"status": "passed", "live_requests": 0, "timestamp": original.now(),
            "source_sha256": original.digest(HERE / "worker.py"), "prompt_identical_to_failed_request": True,
            "prior_turns_preserved": PRIOR_TURNS, "prior_session_turns_preserved": 4,
            "accepted_after_fixture": 50, "session_turns_after_fixture": 5,
            "baseline_closed": True, "structured_memory_calls": 0, "original_runtime_unchanged": unchanged}
        original.write_json(HERE / "native-preflight.json", output)
        print(json.dumps(output, indent=2))


def run_worker(order, launch_id):
    import continue_run
    from timeout_retries import install_retry_policy
    if type(order) is not int or not EXECUTION_ORDER <= order <= 330:
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
        if order == EXECUTION_ORDER:
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
