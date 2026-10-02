"""Resume the explicitly authorized, failed fifth turn of execution nine.

Native graph and model adapter stay frozen. The four committed answers and the
successful classifier outcome are reused. The uncommitted stochastic affect
update is recomputed and disclosed, never reconstructed from rounded text.
"""
from __future__ import annotations

import argparse
import ast
import asyncio
import difflib
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import socket
import sys
import tempfile
import time
from collections import Counter
from uuid import uuid4

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]
sys.path.insert(0, str(ORIGINAL))
import paired_runner as original
from runtime_adapter import current_stage

RUN_ID = "juanita_delgado_001__r02__structured_common_profile"
SESSION_ID = "comparison_s01"


def sha_text(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def mask_uncommitted_affect(prompt):
    """Mask only the affect metrics in the graph's dedicated metadata block."""
    marker = "\nDynamic state metadata (not additional patient-profile facts)\n"
    if prompt.count(marker) != 1:
        raise RuntimeError("Missing or ambiguous dynamic metadata")
    before, tail = prompt.split(marker)
    metadata, after = tail.split("</ARM_CONTEXT>", 1)
    constants = {}
    source = ORIGINAL / "source/agent/core/emotion_model.py"
    for node in ast.parse(source.read_text()).body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id in {"EMOTION_LABELS", "EMOTION_SYSTEM_HINTS"}:
            constants[node.targets[0].id] = ast.literal_eval(node.value)
    hints = {label: constants["EMOTION_SYSTEM_HINTS"][key] for key, label in constants["EMOTION_LABELS"].items()}
    lines, intensity, bands, in_bands = [], 0, 0, False
    seen_bands = set()
    for line in metadata.splitlines():
        if line.startswith("Affect intensity: "):
            metric = re.fullmatch(r"Affect intensity: ([01]\.\d{2}) \((high tension, emotions close to the surface|muted and contained affect|steady but noticeable emotional pull)\)", line)
            if not metric or not 0 <= float(metric[1]) <= 1:
                raise RuntimeError("Unexpected affect intensity text")
            intensity += 1
        elif line.startswith("Dominant affect systems:"):
            if line not in {"Dominant affect systems:", "Dominant affect systems: Seeking (baseline)"}:
                raise RuntimeError("Unexpected affect band header")
            bands += 1
            in_bands = True
        elif in_bands and line.startswith("- "):
            metric = re.fullmatch(r"- ([A-Za-z/]+) \(([01]\.\d{2})\): (.+)", line)
            if (not metric or metric[1] not in hints or metric[3] != hints[metric[1]]
                    or not 0 <= float(metric[2]) <= 1 or metric[1] in seen_bands):
                raise RuntimeError("Non-native content in affect metrics")
            seen_bands.add(metric[1])
            if len(seen_bands) > 3:
                raise RuntimeError("Too many affect bands")
            continue
        else:
            if line:
                in_bands = False
            lines.append(line)
    if intensity != 1 or bands != 1:
        raise RuntimeError("Unexpected dynamic affect metadata shape")
    return before + marker + "\n".join(lines) + "</ARM_CONTEXT>" + after


def compare_prompt(previous, current):
    if mask_uncommitted_affect(previous) != mask_uncommitted_affect(current):
        raise RuntimeError("Recovered prompt changed outside uncommitted affect metrics")
    return {"previous_prompt_sha256": sha_text(previous), "resumed_prompt_sha256": sha_text(current),
            "identical": previous == current, "non_affect_content_identical": True,
            "affect_rng_checkpoint_available": False,
            "difference": "\n".join(difflib.unified_diff(previous.splitlines(), current.splitlines(),
                fromfile="failed_request", tofile="resumed_request", n=1))}


class PreflightComplete(BaseException):
    pass


class NoLiveModel:
    def generate_content(self, *args, **kwargs):
        raise AssertionError("Offline preflight cannot call a provider")


def install_recovery_gate(runner, audit, evidence_path, *, preflight=False):
    """Reuse one archived classifier result; use the original runner thereafter."""
    saved = audit["saved_classifier_request"]
    outcome = audit["saved_classifier_outcome"]
    failed = audit["failed_request"]
    ordinary_generate = runner.generate
    progress = {"classifier_reused": False, "patient_request_checked": False}

    def generate(prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
        runner.check()
        stage = current_stage()
        kwargs = {"temperature": temperature, "max_tokens": max_tokens, "thinking_budget": thinking_budget}
        if not progress["classifier_reused"]:
            if (stage != "classify_topic_and_emotion" or prompt != saved["prompt"]
                    or kwargs != saved["graph_requested_config"]):
                runner.abort("Recovery classifier differs from its archived request", {"kind": "recovery_mismatch"})
            try:
                original.append_jsonl(evidence_path, {"event": "reuse_successful_classifier", "timestamp": original.now(),
                    "native_record_id": outcome["native_record_id"], "logical_id": outcome["logical_id"],
                    "prompt_sha256": sha_text(prompt), "external_call": False})
            except BaseException as exc:
                runner.abort("Classifier reuse provenance could not be saved", {"kind": "recovery_journal_failure", "error_type": type(exc).__name__})
            progress["classifier_reused"] = True
            return outcome["text"]
        if not progress["patient_request_checked"]:
            if stage != "generate_response" or kwargs != failed["graph_requested_config"]:
                runner.abort("Unexpected recovery generation stage/settings", {"kind": "recovery_mismatch"})
            try:
                comparison = compare_prompt(failed["prompt"], prompt)
            except Exception:
                runner.abort("Recovery changed clinical/history prompt content", {"kind": "recovery_prompt_mismatch"})
            try:
                original.append_jsonl(evidence_path, {"event": "resumed_prompt_verified", "timestamp": original.now(),
                    "mode": "offline_preflight" if preflight else "live", **comparison})
            except BaseException as exc:
                runner.abort("Recovery prompt verification could not be saved", {"kind": "recovery_journal_failure", "error_type": type(exc).__name__})
            progress["patient_request_checked"] = True
            if preflight:
                raise PreflightComplete()
        return ordinary_generate(prompt, temperature, max_tokens, thinking_budget=thinking_budget)

    runner.generate = generate
    return progress


def attach_open_session(api, run_logger, config, run_dir):
    therapist, patient = f"comparison_{RUN_ID}", config["native_api_id"]
    logger = run_logger.RunLogger(therapist)
    sessions = logger.data["sessions"]
    if (len(sessions) != 1 or sessions[0].get("ended_at") or len(sessions[0]["turns"]) != 4
            or sessions[0]["session_id"] != SESSION_ID or sessions[0]["patient_id"] != patient):
        raise RuntimeError("Recovery requires the inspected, open four-turn session")
    restored = logger.restore_state(patient)
    if restored.get("total_turns") != 4 or len(restored.get("history", [])) != 4 or len(restored.get("messages", [])) != 8:
        raise RuntimeError("Incomplete four-turn state snapshot")
    expected_history = [{"therapist": t["therapist_input_raw"], "patient": t["patient_response"]} for t in sessions[0]["turns"]]
    expected_messages = [value for t in sessions[0]["turns"] for value in (t["therapist_input_safe"], t["patient_response"])]
    if ([{k:t[k] for k in ("therapist", "patient")} for t in restored["history"]] != expected_history
            or [m.content for m in restored["messages"]] != expected_messages):
        raise RuntimeError("Restored history/messages differ from preserved native turns")
    # Attach the existing native session; do not create a second session record.
    logger.current_session_index = 0
    key = (therapist, patient, SESSION_ID)
    api.session_loggers[key] = {"logger": logger, "base_state": restored}
    return key


async def resume(runtime, audit, *, preflight=False):
    config = original.load_run(RUN_ID)
    runtime = Path(runtime).resolve()
    run_dir = runtime / RUN_ID
    session_dir = run_dir / "sessions/session_01"
    result_path = session_dir / "session.json"
    result = original.read_json(result_path)
    accepted = original.read_jsonl(run_dir / "accepted-turns.jsonl")
    if result["status"] != "stopped" or len(accepted) != 4 or result["turns"] != accepted:
        raise RuntimeError("Partial receipt changed before recovery")
    case = (ORIGINAL / "generation" / config["case_path"]).read_text()
    turn = original.read_json(ORIGINAL / "generation" / config["scenario_path"])["sessions"][0]["turns"][4]
    evidence_path = session_dir / "recovery-resume03.jsonl"
    if evidence_path.exists():
        raise RuntimeError("Recovery already attempted; no automatic replay")
    result.update(status="resuming", resumed_at=original.now(), pid=os.getpid(), process_instance_id=str(uuid4()),
        recovery={"continuation": "resume-03", "preserved_turns": 4,
            "classifier_reused": True, "affect_update_recomputed": True,
            "original_stopped_receipt_sha256": original.digest(result_path),
            "original_error": result.get("error"), "original_finished_at": result.get("finished_at")})
    result.pop("error", None)
    result.pop("finished_at", None)
    original.write_json(result_path, result)
    builder = runner = None
    cwd = Path.cwd()
    started = time.monotonic()
    context = {"run_id": RUN_ID, "arm": config["arm"], "session_index": 1, "turn_id": turn["turn_id"]}
    try:
        os.chdir(session_dir)
        api, builder, run_logger, runner = original.bootstrap_runtime(config, case, session_dir, run_dir, runtime,
            context, offline_model=NoLiveModel() if preflight else None)
        key = attach_open_session(api, run_logger, config, run_dir)
        recovery = install_recovery_gate(runner, audit, evidence_path, preflight=preflight)
        response = await api.send_message(api.MessageRequest(external_patient_id=config["native_api_id"],
            therapist_id=key[0], session_id=SESSION_ID, step_id=1, user_message=turn["text"]))
        state = api.session_loggers[key]["latest_state"]
        if state.get("total_turns") != 5 or not all(recovery.values()):
            raise RuntimeError("Recovery turn count/stages are inconsistent")
        patient_text = response.message
        if not isinstance(patient_text, str) or not patient_text.strip():
            runner.abort("No visible recovered reply", {"kind": "empty_patient_response"})
        if state["prompt"].count("<CASE>\n" + case + "</CASE>") != 1:
            raise RuntimeError("Common clinical case mismatch")
        application_failure = bool(state.get("safety_flags") or state.get("safe_user_input") != turn["text"]
                                   or patient_text in original.FALLBACKS)
        record = {"run_id": RUN_ID, "status": "accepted", "turn_index": 5, "session_index": 1,
            "turn_id": turn["turn_id"], "therapist_text": turn["text"], "patient_text": patient_text,
            "safe_user_input": state.get("safe_user_input"), "safety_flags": state.get("safety_flags", []),
            "application_guard_failure": application_failure, "prompt": state["prompt"], "timestamp": original.now(),
            "elapsed_seconds": time.monotonic() - started, "api_response": response.model_dump(mode="json"),
            "summary_in_state": state.get("summary"), "reflection_in_state": state.get("session_reflection"),
            "retrieved_episodes": state.get("episodic_context"), "retrieved_evidence": state.get("evidence_context")}
        original.append_jsonl(run_dir / "accepted-turns.jsonl", record)
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
        sessions = original.native_ledger(run_dir, therapist)
        original.compare_native_prefix(sessions, accepted, config)
        current = sessions[-1]
        if current["final_state"]["total_turns"] != 5:
            raise RuntimeError("Recovered session did not close at turn five")
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
        runner.check()
    except PreflightComplete:
        result.update(status="offline_preflight_passed", live_requests=0)
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


def offline_preflight():
    from partial_audit import audit_partial
    def deny(*args, **kwargs):
        raise AssertionError("Offline preflight blocks network")
    socket.socket.connect = socket.socket.connect_ex = socket.create_connection = deny
    audit = audit_partial(ORIGINAL)
    with tempfile.TemporaryDirectory(prefix="memory-resume03-preflight-") as temporary:
        runtime = Path(temporary)
        shutil.copytree(ORIGINAL / "runtime" / RUN_ID, runtime / RUN_ID)
        result = asyncio.run(resume(runtime, audit, preflight=True))
        records = original.read_jsonl(runtime / RUN_ID / "sessions/session_01/recovery-resume03.jsonl")
        if result["status"] != "offline_preflight_passed" or len(records) != 2:
            raise RuntimeError("Offline native recovery did not reach the expected request")
        output = {"status": "passed", "live_requests": 0, "timestamp": original.now(), "recovery_records": records,
            "source_sha256": original.digest(HERE / "resume_session.py"),
            "original_runtime_unchanged": audit["runtime_file_sha256"] == audit_partial(ORIGINAL)["runtime_file_sha256"]}
        original.write_json(HERE / "native-preflight.json", output)
        print(json.dumps({k:v for k,v in output.items() if k != "recovery_records"}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("preflight", "run"))
    args = parser.parse_args()
    if args.mode == "preflight":
        offline_preflight()
    else:
        import continue_run
        continue_run.verify()
        continue_run.verify_preserved_prefix()
        active = original.read_json(ORIGINAL / "runtime/active-execution.json")
        if active["execution_order"] != 9 or active["run_id"] != RUN_ID or (ORIGINAL / "runtime/STOP").exists():
            raise RuntimeError("Recovery worker lacks its active authorization")
        result = asyncio.run(resume(ORIGINAL / "runtime", original.read_json(HERE / "partial-audit.json")))
        print(json.dumps({"status": result["status"], "run_id": RUN_ID}))
