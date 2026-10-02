"""Resume the failed classifier and the fifth turn of native session three.

All accepted conversations and prior memory remain immutable evidence. The
failed classifier call must have exactly the same prompt and parameters.
Later executions use the original worker and the authorized timeout/rate-limit transport policy.
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
import time
from uuid import uuid4

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]
sys.path.insert(0, str(ORIGINAL))
import paired_runner as original
from runtime_adapter import current_stage

RUN_ID = "alex_carter_001__r03__structured_common_profile"
SESSION_INDEX = 3
SESSION_ID = "comparison_s03"


class NoLiveModel:
    def generate_content(self, *args, **kwargs):
        raise AssertionError("Offline preflight cannot call a provider")


def sha_text(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def attach_policy(result):
    result["transport_amendment"] = {
        "continuation": "resume-06", "policy": "bounded_transient_retry_v2",
        "policy_source_continuation": "resume-06",
        "max_attempts": 3, "timeout_retry_delays_seconds": [30, 60],
        "rate_limit_retry_delays_seconds": [60, 120], "honor_retry_after": True, "maximum_retry_wait_seconds": 300,
        "continuation_manifest_sha256": original.digest(HERE / "manifest.json") if (HERE / "manifest.json").exists() else None,
    }


def attach_open_session(api, run_logger, config):
    therapist, patient = f"comparison_{RUN_ID}", config["native_api_id"]
    logger = run_logger.RunLogger(therapist)
    sessions = logger.data["sessions"]
    if (len(sessions) != 3 or any(not item.get("ended_at") for item in sessions[:2])
            or sessions[2].get("ended_at") or len(sessions[2]["turns"]) != 4
            or sessions[2]["session_id"] != SESSION_ID or sessions[2]["patient_id"] != patient):
        raise RuntimeError("Recovery requires the inspected third session with four saved turns")
    restored = logger.restore_state(patient)
    if (restored.get("total_turns") != 14 or restored.get("last_episode_turn") != 10
            or restored.get("session_id") != SESSION_ID or restored.get("therapist_id") != therapist):
        raise RuntimeError("The post-turn14 native state differs from the inspected checkpoint")
    last_five = [turn for item in sessions for turn in item["turns"]][-5:]
    expected_history = [{"therapist": t["therapist_input_raw"], "patient": t["patient_response"]} for t in last_five]
    expected_messages = [value for t in last_five for value in (t["therapist_input_safe"], t["patient_response"])]
    if ([{k:t[k] for k in ("therapist", "patient")} for t in restored.get("history", [])] != expected_history
            or [m.content for m in restored.get("messages", [])] != expected_messages):
        raise RuntimeError("Native restored rolling history differs from saved conversations")
    key = (therapist, patient, SESSION_ID)
    if key in api.session_loggers:
        raise RuntimeError("An active native session already exists")
    logger.current_session_index = 2
    api.session_loggers[key] = {"logger": logger, "base_state": restored}
    return key


def install_recovery_gate(runner, audit, evidence_path, *, preflight=False):
    failed = audit["failed_request"]
    if failed["stage"] != "classify_topic_and_emotion":
        raise RuntimeError("Recovery must begin with the failed classifier")
    ordinary_generate = runner.generate
    progress = {"classifier_checked": False}

    def generate(prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
        runner.check()
        stage = current_stage()
        options = {"temperature": temperature, "max_tokens": max_tokens, "thinking_budget": thinking_budget}
        if not progress["classifier_checked"]:
            if stage != failed["stage"] or prompt != failed["prompt"] or options != failed["graph_requested_config"]:
                runner.abort("Recovered classifier prompt or settings differ", {"kind": "recovery_mismatch", "stage": stage})
            original.append_jsonl(evidence_path, {"event": "resume_classifier_verified", "timestamp": original.now(),
                "prompt_identical_to_failed_request": True, "prompt_sha256": sha_text(prompt),
                "prior_logical_id": failed["logical_id"], "prior_native_record_id": audit["failed_outcome"]["native_record_id"],
                "mode": "offline_preflight" if preflight else "live", "graph_requested_config": options})
            progress["classifier_checked"] = True
        elif stage == "classify_topic_and_emotion":
            runner.abort("Recovery cannot rerun a completed classifier", {"kind": "recovery_duplicate_classifier"})
        if preflight:
            fixtures = {"classify_topic_and_emotion": '{"topic_label":"unknown","emotion_label":"SEEKING"}',
                "generate_response": "Offline fixture response; this is not model evidence.",
                "_summarize_episode": "Offline fixture episode; this is not model evidence.",
                "_generate_session_reflection": "Offline fixture reflection; this is not model evidence.",
                "_generate_long_term_summary_from_reflection": "Offline fixture summary; this is not model evidence.",
                "_generate_factual_memory": '{"facts":[]}'}
            if stage not in fixtures:
                raise AssertionError("Unexpected offline native generation")
            return fixtures[stage]
        return ordinary_generate(prompt, temperature, max_tokens, thinking_budget=thinking_budget)

    runner.generate = generate
    return progress


async def resume_turn(runtime, audit, *, preflight=False):
    config = original.load_run(RUN_ID)
    runtime = Path(runtime).resolve()
    if (runtime / "STOP").exists():
        raise RuntimeError("Global STOP prevents recovery")
    run_dir = runtime / RUN_ID
    session_dir = run_dir / "sessions/session_03"
    result_path = session_dir / "session.json"
    result = original.read_json(result_path)
    accepted = original.read_jsonl(run_dir / "accepted-turns.jsonl")
    if result["status"] != "stopped" or len(accepted) != 14 or result["turns"] != accepted[10:]:
        raise RuntimeError("Partial receipt changed before recovery")
    ledger_before = (run_dir / "accepted-turns.jsonl").read_bytes()
    case = (ORIGINAL / "generation" / config["case_path"]).read_text()
    turn = original.read_json(ORIGINAL / "generation" / config["scenario_path"])["sessions"][2]["turns"][4]
    evidence_path = session_dir / "recovery-resume06.jsonl"
    if evidence_path.exists():
        raise RuntimeError("Recovery already attempted; no automatic replay")
    with evidence_path.open("x", encoding="utf-8") as stream:
        stream.flush()
        os.fsync(stream.fileno())
    result.update(status="resuming", resumed_at=original.now(), pid=os.getpid(), process_instance_id=str(uuid4()),
        recovery={"continuation": "resume-06", "preserved_turns": 4,
            "classifier_reused": False, "affect_update_recomputed": False, "process_rng_reinitialized": True,
            "preserved_run_turns": 14,
            "original_stopped_receipt_sha256": original.digest(result_path),
            "original_error": result.get("error"), "original_finished_at": result.get("finished_at")})
    result.pop("error", None)
    result.pop("finished_at", None)
    attach_policy(result)
    original.write_json(result_path, result)
    builder = runner = None
    cwd = Path.cwd()
    started = time.monotonic()
    context = {"run_id": RUN_ID, "arm": config["arm"], "session_index": 3, "turn_id": turn["turn_id"]}
    try:
        os.chdir(session_dir)
        api, builder, run_logger, runner = original.bootstrap_runtime(config, case, session_dir, run_dir, runtime,
            context, offline_model=NoLiveModel() if preflight else None)
        key = attach_open_session(api, run_logger, config)
        recovery = install_recovery_gate(runner, audit, evidence_path, preflight=preflight)
        response = await api.send_message(api.MessageRequest(external_patient_id=config["native_api_id"],
            therapist_id=key[0], session_id=SESSION_ID, step_id=3, user_message=turn["text"]))
        state = api.session_loggers[key]["latest_state"]
        if state.get("total_turns") != 15 or not all(recovery.values()):
            raise RuntimeError("Recovery turn count/stages are inconsistent")
        patient_text = response.message
        if not isinstance(patient_text, str) or not patient_text.strip():
            runner.abort("No visible recovered reply", {"kind": "empty_patient_response"})
        if state["prompt"].count("<CASE>\n" + case + "</CASE>") != 1:
            raise RuntimeError("Common clinical case mismatch")
        application_failure = bool(state.get("safety_flags") or state.get("safe_user_input") != turn["text"]
                                   or patient_text in original.FALLBACKS)
        record = {"run_id": RUN_ID, "status": "accepted", "turn_index": 15, "session_index": 3,
            "turn_id": turn["turn_id"], "therapist_text": turn["text"], "patient_text": patient_text,
            "safe_user_input": state.get("safe_user_input"), "safety_flags": state.get("safety_flags", []),
            "application_guard_failure": application_failure, "prompt": state["prompt"], "timestamp": original.now(),
            "elapsed_seconds": time.monotonic() - started, "api_response": response.model_dump(mode="json"),
            "summary_in_state": state.get("summary"), "reflection_in_state": state.get("session_reflection"),
            "retrieved_episodes": state.get("episodic_context"), "retrieved_evidence": state.get("evidence_context")}
        original.append_jsonl(run_dir / "accepted-turns.jsonl", record)
        if not (run_dir / "accepted-turns.jsonl").read_bytes().startswith(ledger_before):
            raise RuntimeError("Earlier accepted turns changed during recovery")
        accepted.append(record)
        result["turns"].append(record)
        original.write_json(result_path, result)
        if application_failure:
            original.write_json(run_dir / "probe-outcomes.json", {"outcomes": [
                {"turn_id": r["turn_id"], "status": "application_failure"} for r in accepted if r["application_guard_failure"]]})
        runner.check()
        context["turn_id"] = None
        patient, therapist = config["native_api_id"], key[0]
        original.wait_for_episodes(builder, runner, patient, therapist)
        finalization = await api.end_session(api.SessionEndRequest(external_patient_id=patient,
            therapist_id=therapist, session_id=SESSION_ID))
        runner.check()
        if finalization.status != "finalized" or key in api.session_loggers:
            raise RuntimeError("Native API did not close the recovered session")
        sessions = original.native_ledger(run_dir, therapist)
        original.compare_native_prefix(sessions, accepted, config)
        current = sessions[-1]
        if current["final_state"]["total_turns"] != 15:
            raise RuntimeError("Recovered session did not close at cumulative turn fifteen")
        records = list(builder.MEMORY_STORE.iter_records(patient, therapist))
        new_records = [r for r in records if r.get("session_id") == SESSION_ID]
        if sum(r["type"] == "conversation_turn" for r in new_records) != 5:
            raise RuntimeError("Recovered session has missing or duplicate conversation sources")
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
            "details": getattr(exc, "details", None), "message": "Recovery stopped; all accepted replies retained."})
        original.stop_campaign(runtime, "recovery_worker_failure", runner=runner, error_type=type(exc).__name__)
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
    def deny(*args, **kwargs):raise AssertionError("Native preflight forbids network")
    socket.socket.connect = socket.socket.connect_ex = socket.create_connection = deny
    audit = audit_checkpoint(ORIGINAL)
    with tempfile.TemporaryDirectory(prefix="memory-resume06-preflight-") as temporary:
        runtime = Path(temporary)
        shutil.copytree(ORIGINAL / "runtime" / RUN_ID, runtime / RUN_ID)
        result = asyncio.run(resume_turn(runtime, audit, preflight=True))
        proof = original.read_jsonl(runtime / RUN_ID / "sessions/session_03/recovery-resume06.jsonl")
        if result["status"] != "offline_preflight_passed" or len(proof) != 1 or not proof[0]["prompt_identical_to_failed_request"]:
            raise RuntimeError("Native recovery preflight did not complete the single pending turn")
        output = {"status": "passed", "live_requests": 0, "timestamp": original.now(),
            "source_sha256": original.digest(HERE / "worker.py"), "classifier_prompt_identical": True,
            "preserved_run_turns": 14, "native_total_after_fixture": 15, "native_session_closed": True,
            "original_runtime_unchanged": audit["runtime_file_sha256"] == audit_checkpoint(ORIGINAL)["runtime_file_sha256"]}
        original.write_json(HERE / "native-preflight.json", output)
        print(json.dumps(output, indent=2))


def run_worker(order, launch_id):
    import continue_run
    from timeout_retries import install_retry_policy
    if type(order) is not int or not 90 <= order <= 330:
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
        if order == 90:
            return asyncio.run(resume_turn(runtime, original.read_json(HERE / "checkpoint-audit.json")))
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
