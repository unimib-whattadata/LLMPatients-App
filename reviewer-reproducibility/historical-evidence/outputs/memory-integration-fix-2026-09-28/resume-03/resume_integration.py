"""Single authorized continuation from the archived 40-turn checkpoint.

The original frozen implementation and stopped runtime are read-only inputs.
Only the remaining turns are generated. Every new failure stops this attempt.
"""
from __future__ import annotations

import argparse
import asyncio
import copy
import json
import importlib.util
import os
import shutil
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path
from uuid import uuid4

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parent / "integration"
PREVIOUS = HERE.parent / "resume-02"
ORIGIN_RUNTIME = PREVIOUS / "runtime"
START_SESSION = 9
PREFIX_TURNS = 0
COMMITTED_TURNS = 40
RUNTIME = HERE / "runtime"
AMENDMENT_ID = "memory-integration-fix-2026-09-28-resume-03"
sys.path.insert(0, str(ORIGINAL))
import run_integration as original
from runtime_adapter import append_jsonl, now, wait_for_episodes, write_json

PATIENT_ID, THERAPIST_ID = original.PATIENT_ID, original.THERAPIST_ID
SESSION_ID = f"memory_integration_s{START_SESSION:02d}"
LEDGER = Path("runs") / f"{THERAPIST_ID}.json"
MEMORY = Path("memory") / f"{THERAPIST_ID}__{PATIENT_ID}.jsonl"
SESSION = Path(f"sessions/session_{START_SESSION:02d}/session.json")
RETIRED_STOP = Path("previous-stop-resume-02.json")


def read_json(path):
    return json.loads(Path(path).read_text())


def files_under(root):
    return {str(p.relative_to(root)): original.digest(p)
            for p in sorted(root.rglob("*")) if p.is_file()}


def retire_prior_stop(runtime_dir):
    """Retain the old stop under a historical name in the authorized copy only."""
    runtime_dir = Path(runtime_dir).resolve()
    if runtime_dir == ORIGIN_RUNTIME.resolve():
        raise RuntimeError("Never alter the previous runtime")
    source, target = runtime_dir / "STOP", runtime_dir / RETIRED_STOP
    if target.exists() or source.read_bytes() != (ORIGIN_RUNTIME / "STOP").read_bytes():
        raise RuntimeError("Only the exact previously reviewed stop may be retired")
    source.rename(target)


def validate_resume_prefix(runtime_dir):
    """Require the exact prior checkpoint, with an explicitly retired old stop."""
    runtime_dir = Path(runtime_dir)
    if (runtime_dir / "STOP").exists():
        raise RuntimeError("An active STOP prohibits inference")
    if (runtime_dir / RETIRED_STOP).read_bytes() != (ORIGIN_RUNTIME / "STOP").read_bytes():
        raise RuntimeError("The historical stop receipt was lost")
    for path in ORIGIN_RUNTIME.rglob("*"):
        if path.is_file() and path.relative_to(ORIGIN_RUNTIME) != Path("STOP"):
            copied = runtime_dir / path.relative_to(ORIGIN_RUNTIME)
            if copied.read_bytes() != path.read_bytes():
                raise RuntimeError("A checkpoint artifact differs from the prior attempt")
    saved = read_json(runtime_dir / SESSION)
    ledger = read_json(runtime_dir / LEDGER)
    if (saved.get("status") != "stopped" or saved.get("inference_mode") != "live_openrouter"
            or saved.get("session_index") != START_SESSION or len(saved["turns"]) != PREFIX_TURNS
            or ledger.get("therapist_id") != THERAPIST_ID or len(ledger["sessions"]) != START_SESSION):
        raise RuntimeError("Unexpected checkpoint origin or session count")
    session = ledger["sessions"][-1]
    if session["final_state"] != {}:
        raise RuntimeError("The previously interrupted empty session unexpectedly has a snapshot")
    state = ledger["sessions"][-2]["final_state"]
    if (session.get("ended_at") or session["session_id"] != SESSION_ID
            or session["patient_id"] != PATIENT_ID or len(session["turns"]) != PREFIX_TURNS
            or state.get("total_turns") != COMMITTED_TURNS or len(state.get("history", [])) != 5
            or len(state.get("messages", [])) != 10 or state.get("last_episode_turn") != 40
            or state.get("session_id") != "memory_integration_s08"):
        raise RuntimeError("The open native session is not the committed 40-turn state")
    all_records = [json.loads(line) for line in (runtime_dir / MEMORY).read_bytes().splitlines()]
    sources = [r for r in all_records if r["type"] == "conversation_turn"]
    if len(sources) != COMMITTED_TURNS or len({r["id"] for r in sources}) != COMMITTED_TURNS:
        raise RuntimeError("Missing or duplicate accepted conversation sources")
    current_records = [r for r in all_records if r.get("session_id") == SESSION_ID]
    if len(current_records) != PREFIX_TURNS or any(r["type"] != "conversation_turn" for r in current_records):
        raise RuntimeError("Unexpected pending memory at the checkpoint")
    scenario = read_json(ORIGINAL / "scenario.json")["sessions"]
    offset = 0
    for index, entry in enumerate(ledger["sessions"], 1):
        count = 5 if index < START_SESSION else PREFIX_TURNS
        result = read_json(runtime_dir / f"sessions/session_{index:02d}/session.json")
        if (entry["session_id"] != f"memory_integration_s{index:02d}" or entry["patient_id"] != PATIENT_ID
                or bool(entry.get("ended_at")) != (index < START_SESSION)
                or len(entry["turns"]) != count or len(result["turns"]) != count
                or (index < START_SESSION and result["status"] != "completed")):
            raise RuntimeError("Earlier completed sessions are inconsistent")
        for pos, (turn, logged) in enumerate(zip(result["turns"], entry["turns"]), 1):
            source, spec = sources[offset], scenario[index - 1]["turns"][pos - 1]
            offset += 1
            if not (turn["turn_id"] == spec["turn_id"]
                    and turn["therapist_text"] == logged["therapist_input_raw"] == source["therapist_text"] == spec["text"]
                    and turn["patient_text"] == logged["patient_response"] == source["patient_text"]
                    and turn["total_turns"] == logged["total_turns"] == source["turn_index"] == offset
                    and source["session_id"] == entry["session_id"]):
                raise RuntimeError("A committed answer disagrees across saved artifacts")
    return saved, session


def verify():
    original.verify()
    verify_predecessor()
    manifest = read_json(HERE / "manifest.json")
    if original.digest(ORIGINAL / "manifest.json") != manifest["original_manifest_sha256"]:
        raise RuntimeError("Original manifest changed")
    if original.digest(PREVIOUS / "manifest.json") != manifest["predecessor_manifest_sha256"]:
        raise RuntimeError("Previous continuation manifest changed")
    for name, expected in manifest["files"].items():
        path = HERE / name
        if path.is_symlink() or original.digest(path) != expected:
            raise RuntimeError(f"Resume amendment changed after freeze: {name}")
    if files_under(ORIGIN_RUNTIME) != manifest["original_runtime_files"]:
        raise RuntimeError("The original stopped runtime changed")
    return manifest


def verify_predecessor():
    spec = importlib.util.spec_from_file_location("previous_resume_integrity", PREVIOUS / "resume_integration.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.verify()
    return module


def prepare():
    original.verify()
    verify_predecessor()
    if RUNTIME.exists() or (HERE / "manifest.json").exists():
        raise RuntimeError("This amendment cannot be initialized or frozen twice")
    shutil.copytree(ORIGIN_RUNTIME, RUNTIME)
    retire_prior_stop(RUNTIME)
    validate_resume_prefix(RUNTIME)
    lineage = {"amendment_id": AMENDMENT_ID, "created_at": now(),
               "authorization": "User said Procedi after being informed of the upstream429 at session9 turn1",
               "source_runtime": str(ORIGIN_RUNTIME), "runtime": str(RUNTIME),
               "accepted_turn_count": COMMITTED_TURNS, "closed_sessions": 8, "next_turn_id": "s09t01",
               "failed_native_record_id": "31abeada-0bb5-4670-bf5c-805208ebc506",
               "retired_stop_receipt": str(RETIRED_STOP),
               "subcall_policy": "Repeat the failed first classification at s09t01; restore the completed session8 snapshot into the existing empty session9; retain the error and all40 accepted replies",
               "production_source_policy": "Unchanged original corrected source, profile, scenario, gold, transport and decoding settings"}
    write_json(HERE / "lineage.json", lineage)
    included = ("resume_integration.py", "test_resume.py", "PROTOCOL.md", "lineage.json")
    manifest = {"schema_version": 1, "frozen_at": now(), "new_live_requests_at_freeze": 0,
                "original_manifest_sha256": original.digest(ORIGINAL / "manifest.json"),
                "predecessor_manifest_sha256": original.digest(PREVIOUS / "manifest.json"),
                "original_runtime_files": files_under(ORIGIN_RUNTIME),
                "files": {name: original.digest(HERE / name) for name in included}}
    write_json(HERE / "manifest.json", manifest)
    verify()
    return {"status": "frozen", "files": len(included), "accepted_turns_preserved": COMMITTED_TURNS}


def verify_preserved_prefix(runtime_dir):
    """Retain eight closed sessions, the empty open-session identity, and all journals."""
    runtime_dir = Path(runtime_dir)
    prior = read_json(ORIGIN_RUNTIME / LEDGER)["sessions"]
    current = read_json(runtime_dir / LEDGER)["sessions"]
    if current[:START_SESSION - 1] != prior[:START_SESSION - 1]:
        raise RuntimeError("An earlier finalized native session was modified")
    for index in range(1, START_SESSION):
        for path in (ORIGIN_RUNTIME / f"sessions/session_{index:02d}").rglob("*"):
            if path.is_file() and (runtime_dir / path.relative_to(ORIGIN_RUNTIME)).read_bytes() != path.read_bytes():
                raise RuntimeError("An earlier finalized session artifact was modified")
    old = read_json(ORIGIN_RUNTIME / SESSION)
    saved = read_json(runtime_dir / SESSION)
    if saved["turns"][:PREFIX_TURNS] != old["turns"]:
        raise RuntimeError("An accepted patient answer was changed")
    before, after = prior[-1], current[START_SESSION - 1]
    if after["turns"][:PREFIX_TURNS] != before["turns"]:
        raise RuntimeError("Accepted native turns were changed")
    for key in ("run_id", "session_id", "patient_id", "started_at", "metadata"):
        if after.get(key) != before.get(key):
            raise RuntimeError("Open session identity was replaced")
    for relative in (MEMORY, SESSION.parent / "generation-events.jsonl",
                     SESSION.parent / "openrouter-api-records.jsonl", Path("processes.jsonl")):
        if not (runtime_dir / relative).read_bytes().startswith((ORIGIN_RUNTIME / relative).read_bytes()):
            raise RuntimeError("An original journal was overwritten")
    if (runtime_dir / RETIRED_STOP).read_bytes() != (ORIGIN_RUNTIME / "STOP").read_bytes():
        raise RuntimeError("The previous stop evidence changed")


def latch_failure(runner, exc):
    """Block background inference even if the filesystem cannot save a stop."""
    if runner is not None:
        with runner.fatal_lock:
            if runner.fatal is None:
                runner.fatal = runner.abort_type("controller failure", {
                    "kind": "controller_failure", "error_type": type(exc).__name__})


def terminate_child(child):
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=10)


async def execute_resumed_session(runtime_dir, *, offline_model=None, offline_gate=None):
    runtime_dir = Path(runtime_dir).resolve()
    saved, native_session = validate_resume_prefix(runtime_dir)
    spec = read_json(ORIGINAL / "scenario.json")["sessions"][START_SESSION - 1]
    session_dir, result_path = runtime_dir / SESSION.parent, runtime_dir / SESSION
    os.chdir(session_dir)
    context = {"session_index": START_SESSION, "turn_id": None}
    result = copy.deepcopy(saved)
    prior_attempt = {key: saved.get(key) for key in
                     ("pid", "process_instance_id", "started_at", "finished_at", "status", "error")}
    result.pop("error", None)
    result.pop("finished_at", None)
    result.update(status="running", pid=os.getpid(), process_instance_id=str(uuid4()),
                  inference_mode="offline_stub" if offline_model is not None else "live_openrouter",
                  resume_amendment_id=AMENDMENT_ID, resumed_at=now(), previous_attempts=[*saved.get("previous_attempts", []), prior_attempt])
    write_json(result_path, result)
    builder = runner = None
    try:
        api, builder, run_logger, runner = original.bootstrap_runtime(
            session_dir, runtime_dir, context, offline_model=offline_model, offline_gate=offline_gate)
        logger = run_logger.RunLogger(THERAPIST_ID)
        restored = logger.restore_state(PATIENT_ID)
        if restored.get("total_turns") != COMMITTED_TURNS or restored.get("session_id") != "memory_integration_s08":
            raise RuntimeError("Native restoration did not recover the committed checkpoint")
        # This explicit experimental recovery attachment is the only amendment
        # to native session orchestration. No graph/memory/response is patched.
        logger.current_session_index = START_SESSION - 1
        key = (THERAPIST_ID, PATIENT_ID, SESSION_ID)
        if api.session_loggers:
            raise RuntimeError("Recovery requires an empty process-local session registry")
        api.session_loggers[key] = {"logger": logger, "base_state": restored}
        result["restored_before_resume"] = {
            "total_turns": restored["total_turns"], "history_turns": len(restored["history"]),
            "message_count": len(restored["messages"]), "session_id": restored["session_id"],
            "run_id": native_session["run_id"], "native_open_session_reused": True}
        write_json(result_path, result)
        for position, turn in enumerate(spec["turns"][PREFIX_TURNS:], PREFIX_TURNS + 1):
            runner.check()
            context["turn_id"] = turn["turn_id"]
            started = time.monotonic()
            response = await api.send_message(api.MessageRequest(
                external_patient_id=PATIENT_ID, therapist_id=THERAPIST_ID, session_id=SESSION_ID,
                step_id=START_SESSION, user_message=turn["text"]))
            state = api.session_loggers[key]["latest_state"]
            result["turns"].append({
                "turn_id": turn["turn_id"], "therapist_text": turn["text"],
                "patient_text": response.message, "api_response": response.model_dump(mode="json"),
                "prompt": state.get("prompt"), "summary_in_state": state.get("summary"),
                "reflection_in_state": state.get("session_reflection"),
                "retrieved_episodes": state.get("episodic_context"),
                "retrieved_evidence": state.get("evidence_context"),
                "total_turns": state.get("total_turns"), "safe_user_input": state.get("safe_user_input"),
                "safety_flags": state.get("safety_flags"), "timestamp": now(),
                "elapsed_seconds": time.monotonic() - started})
            write_json(result_path, result)
            if not response.message.strip() or response.message in {
                    original.FALLBACK, "[no reply]", "[ERROR]", "[NO RESPONSE]"}:
                raise RuntimeError("Empty response or graph fallback cannot be accepted")
            if state.get("total_turns") != (START_SESSION - 1) * 5 + position:
                raise RuntimeError("Cumulative graph turn count is inconsistent")
            if state.get("safe_user_input") != turn["text"] or state.get("safety_flags"):
                raise RuntimeError("Scenario changed by sanitization")
            runner.check()
            print(f"TURN_DONE session={START_SESSION} turn={position}", flush=True)
        context["turn_id"] = None
        wait_for_episodes(builder, runner, PATIENT_ID, THERAPIST_ID)
        runner.check()
        finalization = await api.end_session(api.SessionEndRequest(
            external_patient_id=PATIENT_ID, therapist_id=THERAPIST_ID, session_id=SESSION_ID))
        runner.check()
        if finalization.status != "finalized" or key in api.session_loggers:
            raise RuntimeError("Native API did not close the recovered session")
        records = list(builder.MEMORY_STORE.iter_records(PATIENT_ID, THERAPIST_ID))
        new_records = [row for row in records if row.get("session_id") == SESSION_ID]
        result.update(finalization=finalization.model_dump(mode="json"),
                      persisted_summary=builder.load_long_term_summary(PATIENT_ID, THERAPIST_ID),
                      persisted_reflection=builder.load_latest_session_reflection(PATIENT_ID, THERAPIST_ID),
                      memory_record_counts=dict(Counter(row["type"] for row in records)),
                      session_memory_records=new_records)
        ledger = original.ledger_sessions(runtime_dir)
        if (len(ledger) != START_SESSION or len(ledger[-1]["turns"]) != 5 or not ledger[-1].get("ended_at")
                or ledger[-1]["final_state"]["total_turns"] != START_SESSION * 5
                or sum(row["type"] == "conversation_turn" for row in new_records) != 5
                or len({row["id"] for row in new_records if row["type"] == "conversation_turn"}) != 5
                or not result["persisted_summary"] or not result["persisted_reflection"]):
            raise RuntimeError("Native closure failed its integrity checks")
        result.update(original.collect_consolidation_evidence(finalization, ledger[-1], new_records))
        result.update(status="completed", finished_at=now())
    except BaseException as exc:
        latch_failure(runner, exc)
        result.update(status="stopped", finished_at=now(), error={
            "type": type(exc).__name__, "details": getattr(exc, "details", None),
            "message": "New attempt stopped; all prior accepted turns and errors preserved. No automatic retry."})
        write_json(runtime_dir / "STOP", {"timestamp": now(), "error": result["error"]})
        write_json(result_path, result)
        raise
    finally:
        try:
            write_json(result_path, result)
        except BaseException as exc:
            latch_failure(runner, exc)
            raise
        finally:
            if builder is not None:
                builder.SUMMARY_EXECUTOR.shutdown(wait=True, cancel_futures=True)
    verify_preserved_prefix(runtime_dir)
    return result


def run_live():
    verify()
    validate_resume_prefix(RUNTIME)
    # A process crash/error cannot cause an unattended restart of this attempt.
    with (HERE / "launch.json").open("x") as stream:
        json.dump({"started_at": now(), "amendment_id": AMENDMENT_ID}, stream)
    for index in range(START_SESSION, 12):
        verify()
        if (RUNTIME / "STOP").exists():
            raise RuntimeError("Stop receipt exists; no further requests may start")
        session_dir = RUNTIME / "sessions" / f"session_{index:02d}"
        session_dir.mkdir(parents=True, exist_ok=True)
        command = [str(original.BUNDLED_PYTHON), str(HERE / "resume_integration.py"),
                   "_worker", "--session", str(index), "--live"]
        with (session_dir / "worker-resume-03.log").open("x") as stream:
            child = subprocess.Popen(command, env=original.worker_environment(), cwd=session_dir,
                                     stdout=stream, stderr=subprocess.STDOUT)
            try:
                append_jsonl(RUNTIME / "processes-resume-03.jsonl", {"event": "start", "timestamp": now(),
                             "amendment_id": AMENDMENT_ID, "session_index": index,
                             "pid": child.pid, "command": command})
                code = child.wait(timeout=1200)
            except BaseException as exc:
                terminate_child(child)
                if not (RUNTIME / "STOP").exists():
                    write_json(RUNTIME / "STOP", {"timestamp": now(), "kind": "worker_control_failure",
                              "error_type": type(exc).__name__, "session_index": index})
                raise
        append_jsonl(RUNTIME / "processes-resume-03.jsonl", {"event": "exit", "timestamp": now(),
                     "amendment_id": AMENDMENT_ID, "session_index": index, "pid": child.pid, "exit_code": code})
        if code != 0:
            if not (RUNTIME / "STOP").exists():
                write_json(RUNTIME / "STOP", {"timestamp": now(), "kind": "worker_failure", "session_index": index,
                                              "exit_code": code})
            raise RuntimeError("Worker stopped; campaign halted")
        saved = read_json(session_dir / "session.json")
        if saved.get("status") != "completed" or saved.get("inference_mode") != "live_openrouter":
            raise RuntimeError("Worker failed native finalization")
        verify_preserved_prefix(RUNTIME)
        print(f"SESSION_DONE {index}/11 memory={saved['memory_status']}", flush=True)
    return {"status": "completed", "sessions": 11, "amendment_id": AMENDMENT_ID}


def export_review():
    verify()
    gold = read_json(ORIGINAL / "gold.json")
    turns, consolidation = {}, []
    for path in sorted((RUNTIME / "sessions").glob("session_*/session.json")):
        saved = read_json(path)
        consolidation.append({"session_index": saved["session_index"], "session_status": saved["status"],
            "memory_status": saved.get("memory_status"), "memory_consolidation": saved.get("memory_consolidation"),
            "memory_warnings": saved.get("memory_warnings", [])})
        turns.update({turn["turn_id"]: turn for turn in saved["turns"]})
    rows = []
    for probe in gold["probes"]:
        answer = turns.get(probe["turn_id"])
        rows.append({**probe, "response": answer["patient_text"] if answer else None,
                     "sources": [{"turn_id": tid, "therapist_text": turns[tid]["therapist_text"],
                                  "patient_text": turns[tid]["patient_text"]}
                                 for tid in probe["source_turns"] if tid in turns],
                     "status": "requires_semantic_review" if answer else "not_observed"})
    write_json(RUNTIME / "probe-review.json", {"probes": rows, "timestamp": now(),
        "memory_finalization": consolidation, "amendment_id": AMENDMENT_ID,
        "scope": "Single known-profile regression with an explicit interrupted-session recovery; not independent, blind or a baseline comparison"})
    return {"status": "review_exported", "observed_probes": sum(r["response"] is not None for r in rows)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "verify", "run", "review", "_worker"))
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--session", type=int, choices=range(1, 12))
    args = parser.parse_args()
    if args.command in {"run", "_worker"} and not args.live:
        parser.error("Inference requires explicit --live")
    if args.command == "prepare":
        result = prepare()
    elif args.command == "verify":
        result = {"status": "verified", "files": len(verify()["files"])}
    elif args.command == "review":
        result = export_review()
    elif args.command == "run":
        result = run_live()
    else:
        if not args.session or args.session < START_SESSION or os.environ.get("MEMORY_INTEGRATION_WORKER") != "1":
            parser.error("Only the orchestrator may start a live worker")
        verify()
        if (RUNTIME / "STOP").exists() or not (HERE / "launch.json").exists():
            raise RuntimeError("No active authorized launch")
        try:
            result = asyncio.run(execute_resumed_session(RUNTIME) if args.session == START_SESSION else
                                 original.execute_session(args.session, RUNTIME))
        except BaseException:
            if not (RUNTIME / "STOP").exists():
                write_json(RUNTIME / "STOP", {"timestamp": now(), "kind": "worker_exception", "session_index": args.session})
            raise
        result = {"status": result["status"], "session_index": args.session,
                  "memory_status": result["memory_status"]}
    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"status": "stopped", "error_type": type(exc).__name__,
                          "message": "See retained records; no automatic retry."}), flush=True)
        raise SystemExit(2) from None
