"""Resume native finalization only, reusing its two successful generations.

All accepted conversations and prior memory remain immutable evidence. The
failed factual-memory call must have exactly the same prompt and parameters.
Later executions use the original worker and the unchanged resume-04 transport.
"""
from __future__ import annotations

import argparse
import asyncio
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import sys
import tempfile
from uuid import uuid4

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]
sys.path.insert(0, str(ORIGINAL))
import paired_runner as original
from runtime_adapter import current_stage

RUN_ID = "juanita_delgado_001__r01__structured_common_profile"
SESSION_INDEX = 3
SESSION_ID = "comparison_s03"


class NoLiveModel:
    def generate_content(self, *args, **kwargs):
        raise AssertionError("Offline preflight cannot call a provider")


def sha_text(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def attach_policy(result):
    result["transport_amendment"] = {
        "continuation": "resume-05", "policy": "bounded_timeout_retry_v1",
        "policy_source_continuation": "resume-04",
        "max_attempts": 3, "retry_delays_seconds": [30, 60],
        "continuation_manifest_sha256": original.digest(HERE / "manifest.json") if (HERE / "manifest.json").exists() else None,
    }


def attach_open_session(api, run_logger, config):
    """Attach the saved session without creating a session or invoking a turn."""
    therapist, patient = f"comparison_{RUN_ID}", config["native_api_id"]
    logger = run_logger.RunLogger(therapist)
    sessions = logger.data["sessions"]
    if (len(sessions) != 3 or any(not s.get("ended_at") for s in sessions[:2])
            or sessions[2].get("ended_at") or len(sessions[2]["turns"]) != 5
            or sessions[2]["session_id"] != SESSION_ID or sessions[2]["patient_id"] != patient):
        raise RuntimeError("Recovery requires the inspected open third session with five saved turns")
    restored = logger.restore_state(patient)
    if restored.get("total_turns") != 15 or restored.get("session_id") != SESSION_ID:
        raise RuntimeError("Native post-turn15 snapshot is not available")
    key = (therapist, patient, SESSION_ID)
    if key in api.session_loggers:
        raise RuntimeError("Recovery cannot replace an existing active session")
    logger.current_session_index = 2
    api.session_loggers[key] = {"logger": logger, "latest_state": restored}
    return key


def install_finalization_replay(runner, audit, evidence_path, *, preflight=False):
    cached = audit["cached_finalization_calls"]
    failed = audit["failed_request"]
    stages = ["_generate_session_reflection", "_generate_long_term_summary_from_reflection"]
    if [entry["request"]["stage"] for entry in cached] != stages or failed["stage"] != "_generate_factual_memory":
        raise RuntimeError("Unexpected recovery generation sequence")
    ordinary_generate = runner.generate
    progress = {"reused_generations": 0, "factual_calls": 0}

    def generate(prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
        runner.check()
        stage = current_stage()
        options = {"temperature": temperature, "max_tokens": max_tokens, "thinking_budget": thinking_budget}
        position = progress["reused_generations"]
        if position < 2:
            cached_call = cached[position]
            request, outcome = cached_call["request"], cached_call["outcome"]
            if (stage != stages[position] or prompt != request["prompt"]
                    or options != request["graph_requested_config"] or outcome.get("accepted") is not True
                    or outcome.get("finish_reasons") != ["STOP"] or not outcome.get("text", "").strip()):
                runner.abort("Cached finalization differs from original prompt/settings", {"kind": "recovery_mismatch", "stage": stage})
            original.append_jsonl(evidence_path, {"event": "reuse_successful_finalization", "timestamp": original.now(),
                "stage": stage, "logical_id": request["logical_id"], "native_record_id": outcome["native_record_id"],
                "prompt_sha256": sha_text(prompt), "response_sha256": sha_text(outcome["text"]), "external_call": False})
            progress["reused_generations"] += 1
            return outcome["text"]
        if (progress["factual_calls"] or stage != failed["stage"] or prompt != failed["prompt"]
                or options != failed["graph_requested_config"]):
            runner.abort("Pending factual generation differs from the stopped request", {"kind": "recovery_mismatch", "stage": stage})
        original.append_jsonl(evidence_path, {"event": "resume_factual_generation", "timestamp": original.now(),
            "prompt_identical_to_failed_request": True, "prompt_sha256": sha_text(prompt),
            "prior_logical_id": failed["logical_id"], "prior_native_record_id": audit["failed_outcome"]["native_record_id"],
            "mode": "offline_preflight" if preflight else "live", "graph_requested_config": options})
        progress["factual_calls"] += 1
        if preflight:
            return '{"facts":[]}'  # Fixture only: native write/close behavior, never model evidence.
        return ordinary_generate(prompt, temperature, max_tokens, thinking_budget=thinking_budget)

    runner.generate = generate
    return progress


async def resume_finalization(runtime, audit, *, preflight=False):
    runtime = Path(runtime).resolve()
    if (runtime / "STOP").exists():
        raise RuntimeError("Global STOP prevents recovery")
    config = original.load_run(RUN_ID)
    run_dir = runtime / RUN_ID
    session_dir = run_dir / "sessions/session_03"
    result_path = session_dir / "session.json"
    result = original.read_json(result_path)
    accepted = original.read_jsonl(run_dir / "accepted-turns.jsonl")
    if result["status"] != "stopped" or len(accepted) != 15 or result["turns"] != accepted[10:15]:
        raise RuntimeError("The completed-dialogue checkpoint changed")
    ledger_before = (run_dir / "accepted-turns.jsonl").read_bytes()
    evidence_path = session_dir / "recovery-resume05.jsonl"
    with evidence_path.open("x", encoding="utf-8") as stream:
        stream.flush()
        os.fsync(stream.fileno())
    result.update(status="resuming", resumed_at=original.now(), pid=os.getpid(), process_instance_id=str(uuid4()),
        recovery={"continuation": "resume-05", "preserved_run_turns": 15, "preserved_session_turns": 5,
            "cached_narrative_generations": 2, "affect_update_recomputed": False,
            "original_stopped_receipt_sha256": original.digest(result_path),
            "original_error": result.get("error"), "original_finished_at": result.get("finished_at")})
    result.pop("error", None)
    result.pop("finished_at", None)
    attach_policy(result)
    original.write_json(result_path, result)
    builder = runner = None
    cwd = Path.cwd()
    patient, therapist = config["native_api_id"], f"comparison_{RUN_ID}"
    context = {"run_id": RUN_ID, "arm": config["arm"], "session_index": SESSION_INDEX, "turn_id": None}
    try:
        os.chdir(session_dir)
        case = (ORIGINAL / "generation" / config["case_path"]).read_text(encoding="utf-8")
        api, builder, run_logger, runner = original.bootstrap_runtime(config, case, session_dir, run_dir, runtime,
            context, offline_model=NoLiveModel() if preflight else None)
        if api is None:
            raise RuntimeError("Native finalization requires the structured API")
        key = attach_open_session(api, run_logger, config)
        progress = install_finalization_replay(runner, audit, evidence_path, preflight=preflight)
        original.wait_for_episodes(builder, runner, patient, therapist)
        finalization = await api.end_session(api.SessionEndRequest(external_patient_id=patient,
            therapist_id=therapist, session_id=SESSION_ID))
        runner.check()
        if finalization.status != "finalized" or key in api.session_loggers or progress != {"reused_generations": 2, "factual_calls": 1}:
            raise RuntimeError("Native recovery did not close exactly the pending finalization")
        if (run_dir / "accepted-turns.jsonl").read_bytes() != ledger_before:
            raise RuntimeError("Recovery modified accepted conversation turns")
        sessions = original.native_ledger(run_dir, therapist)
        original.compare_native_prefix(sessions, accepted, config)
        current = sessions[-1]
        if current["final_state"]["total_turns"] != 15:
            raise RuntimeError("Native close lost the cumulative turn count")
        records = list(builder.MEMORY_STORE.iter_records(patient, therapist))
        new_records = [r for r in records if r.get("session_id") == SESSION_ID]
        if sum(r["type"] == "conversation_turn" for r in new_records) != 5:
            raise RuntimeError("Recovery duplicated or lost a conversation source")
        result.update(finalization=finalization.model_dump(mode="json"), session_memory_records=new_records,
            persisted_summary=builder.load_long_term_summary(patient, therapist),
            persisted_reflection=builder.load_latest_session_reflection(patient, therapist),
            memory_record_counts=dict(Counter(r["type"] for r in records)))
        result.update(original.consolidation_evidence(finalization, current, new_records))
        paths = [run_dir / "runs" / f"{therapist}.json", builder.MEMORY_STORE.file_path(patient, therapist)]
        result.update(status="completed", finished_at=original.now(),
            accepted_ledger_sha256=original.digest(run_dir / "accepted-turns.jsonl"),
            state_files_at_close={str(p.relative_to(run_dir)): original.digest(p) for p in paths})
        if preflight:
            result.update(status="offline_preflight_passed", inference_mode="offline_stub", live_requests=0)
        runner.check()
    except BaseException as exc:
        result.update(status="stopped", finished_at=original.now(), error={"type": type(exc).__name__,
            "details": getattr(exc, "details", None), "message": "Finalization recovery halted; all conversations retained."})
        original.stop_campaign(runtime, "finalization_recovery_failure", runner=runner, error_type=type(exc).__name__)
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
        raise AssertionError("Offline native preflight blocks the network")
    socket.socket.connect = socket.socket.connect_ex = socket.create_connection = deny
    audit = audit_checkpoint(ORIGINAL)
    with tempfile.TemporaryDirectory(prefix="memory-resume05-preflight-") as temporary:
        runtime = Path(temporary)
        shutil.copytree(ORIGINAL / "runtime" / RUN_ID, runtime / RUN_ID)
        result = asyncio.run(resume_finalization(runtime, audit, preflight=True))
        proof = original.read_jsonl(runtime / RUN_ID / "sessions/session_03/recovery-resume05.jsonl")
        if (result["status"] != "offline_preflight_passed" or len(proof) != 3
                or [r["event"] for r in proof] != ["reuse_successful_finalization"] * 2 + ["resume_factual_generation"]):
            raise RuntimeError("Native preflight did not reuse two calls and close the session")
        output = {"status": "passed", "live_requests": 0, "timestamp": original.now(),
            "source_sha256": original.digest(HERE / "worker.py"), "reused_generations": 2,
            "factual_prompt_identical": True, "preserved_run_turns": 15, "native_session_closed": True,
            "original_runtime_unchanged": audit["runtime_file_sha256"] == audit_checkpoint(ORIGINAL)["runtime_file_sha256"]}
        original.write_json(HERE / "native-preflight.json", output)
        print(json.dumps(output, indent=2))


def run_worker(order, launch_id):
    import continue_run
    from timeout_retries import install_retry_policy
    if type(order) is not int or not 78 <= order <= 330:
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
        if order == 78:
            return asyncio.run(resume_finalization(runtime, original.read_json(HERE / "checkpoint-audit.json")))
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
