"""Single authorized continuation from the archived two-turn checkpoint.

The original frozen implementation and stopped runtime are read-only inputs.
Only the remaining turns are generated. Every new failure stops this attempt.
"""
from __future__ import annotations

import argparse
import asyncio
import copy
import json
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
ORIGIN_RUNTIME = ORIGINAL / "runtime"
RUNTIME = HERE / "runtime"
AMENDMENT_ID = "memory-integration-fix-2026-09-28-resume-01"
sys.path.insert(0, str(ORIGINAL))
import run_integration as original
from runtime_adapter import append_jsonl, now, wait_for_episodes, write_json

PATIENT_ID, THERAPIST_ID = original.PATIENT_ID, original.THERAPIST_ID
SESSION_ID = "memory_integration_s01"
LEDGER = Path("runs") / f"{THERAPIST_ID}.json"
MEMORY = Path("memory") / f"{THERAPIST_ID}__{PATIENT_ID}.jsonl"
SESSION = Path("sessions/session_01/session.json")


def read_json(path):
    return json.loads(Path(path).read_text())


def files_under(root):
    return {str(p.relative_to(root)): original.digest(p)
            for p in sorted(root.rglob("*")) if p.is_file()}


def validate_resume_prefix(runtime_dir):
    """Fail before inference unless result, native ledger and raw data agree."""
    runtime_dir = Path(runtime_dir)
    saved = read_json(runtime_dir / SESSION)
    archived = read_json(ORIGIN_RUNTIME / SESSION)
    if saved != archived or saved.get("status") != "stopped" or len(saved["turns"]) != 2:
        raise RuntimeError("Only the exact archived two-turn checkpoint may be resumed")
    if saved.get("inference_mode") != "live_openrouter" or saved.get("session_index") != 1:
        raise RuntimeError("Unexpected checkpoint origin")
    ledger = read_json(runtime_dir / LEDGER)
    if ledger != read_json(ORIGIN_RUNTIME / LEDGER):
        raise RuntimeError("Checkpoint ledger differs from the archived open session")
    if ledger.get("therapist_id") != THERAPIST_ID or len(ledger["sessions"]) != 1:
        raise RuntimeError("Expected exactly one native session")
    session = ledger["sessions"][0]
    state = session["final_state"]
    if (session.get("ended_at") or session["session_id"] != SESSION_ID
            or session["patient_id"] != PATIENT_ID or len(session["turns"]) != 2
            or state.get("total_turns") != 2 or len(state.get("history", [])) != 2
            or len(state.get("messages", [])) != 4 or state.get("last_episode_turn") != 0):
        raise RuntimeError("Open-session state is not the expected committed prefix")
    raw = (runtime_dir / MEMORY).read_bytes()
    if raw != (ORIGIN_RUNTIME / MEMORY).read_bytes():
        raise RuntimeError("Memory checkpoint changed or contains uncommitted source material")
    sources = [json.loads(line) for line in raw.splitlines()]
    if len(sources) != 2 or any(s["type"] != "conversation_turn" for s in sources):
        raise RuntimeError("Unexpected background memory work at this checkpoint")
    scenario = read_json(ORIGINAL / "scenario.json")["sessions"][0]["turns"]
    for pos, (turn, logged, source) in enumerate(zip(saved["turns"], session["turns"], sources), 1):
        if not (turn["turn_id"] == scenario[pos - 1]["turn_id"]
                and turn["therapist_text"] == logged["therapist_input_raw"] == source["therapist_text"] == scenario[pos - 1]["text"]
                and turn["patient_text"] == logged["patient_response"] == source["patient_text"]
                and turn["total_turns"] == logged["total_turns"] == source["turn_index"] == pos
                and source["session_id"] == SESSION_ID):
            raise RuntimeError("Accepted response disagrees across the native records")
    for name in ("generation-events.jsonl", "openrouter-api-records.jsonl"):
        relative = SESSION.parent / name
        if (runtime_dir / relative).read_bytes() != (ORIGIN_RUNTIME / relative).read_bytes():
            raise RuntimeError("Provider journal is not the intact original attempt")
    if (runtime_dir / "STOP").exists():
        raise RuntimeError("An active STOP prohibits resumption")
    return saved, session


def verify():
    original.verify()
    manifest = read_json(HERE / "manifest.json")
    if original.digest(ORIGINAL / "manifest.json") != manifest["original_manifest_sha256"]:
        raise RuntimeError("Original manifest changed")
    for name, expected in manifest["files"].items():
        path = HERE / name
        if path.is_symlink() or original.digest(path) != expected:
            raise RuntimeError(f"Resume amendment changed after freeze: {name}")
    if files_under(ORIGIN_RUNTIME) != manifest["original_runtime_files"]:
        raise RuntimeError("The original stopped runtime changed")
    return manifest


def prepare():
    original.verify()
    if RUNTIME.exists() or (HERE / "manifest.json").exists():
        raise RuntimeError("This amendment cannot be initialized or frozen twice")
    # All artifacts, including the unsuccessful request, are copied unchanged.
    shutil.copytree(ORIGIN_RUNTIME, RUNTIME)
    validate_resume_prefix(RUNTIME)
    lineage = {"amendment_id": AMENDMENT_ID, "created_at": now(),
               "authorization": "User said Procedi after being informed of the new 429 and two saved replies",
               "source_runtime": str(ORIGIN_RUNTIME), "runtime": str(RUNTIME),
               "accepted_turn_ids": ["s01t01", "s01t02"], "next_turn_id": "s01t03",
               "failed_native_record_id": "86442d42-2b90-4a83-b816-5b70186bed09",
               "subcall_policy": "The uncommitted turn-3 classification is retained and rerun from the turn-2 snapshot; no completed patient response is regenerated",
               "production_source_policy": "Use the unchanged original corrected source snapshot"}
    write_json(HERE / "lineage.json", lineage)
    included = ("resume_integration.py", "test_resume.py", "PROTOCOL.md", "lineage.json")
    manifest = {"schema_version": 1, "frozen_at": now(), "new_live_requests_at_freeze": 0,
                "original_manifest_sha256": original.digest(ORIGINAL / "manifest.json"),
                "original_runtime_files": files_under(ORIGIN_RUNTIME),
                "files": {name: original.digest(HERE / name) for name in included}}
    write_json(HERE / "manifest.json", manifest)
    verify()
    return {"status": "frozen", "files": len(included), "accepted_turns_preserved": 2}


def verify_preserved_prefix(runtime_dir):
    """The continuation must append to, never replace, previous evidence."""
    runtime_dir = Path(runtime_dir)
    old = read_json(ORIGIN_RUNTIME / SESSION)
    saved = read_json(runtime_dir / SESSION)
    if saved["turns"][:2] != old["turns"]:
        raise RuntimeError("An accepted patient answer was changed")
    prior = read_json(ORIGIN_RUNTIME / LEDGER)["sessions"][0]
    current = read_json(runtime_dir / LEDGER)["sessions"][0]
    if current["turns"][:2] != prior["turns"]:
        raise RuntimeError("Native turn history was changed")
    for key in ("run_id", "session_id", "patient_id", "started_at", "metadata"):
        if current.get(key) != prior.get(key):
            raise RuntimeError("Native session identity was replaced")
    for relative in (MEMORY, SESSION.parent / "generation-events.jsonl",
                     SESSION.parent / "openrouter-api-records.jsonl", Path("processes.jsonl")):
        if not (runtime_dir / relative).read_bytes().startswith((ORIGIN_RUNTIME / relative).read_bytes()):
            raise RuntimeError("An original evidence journal was overwritten")


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
    spec = read_json(ORIGINAL / "scenario.json")["sessions"][0]
    session_dir, result_path = runtime_dir / SESSION.parent, runtime_dir / SESSION
    os.chdir(session_dir)
    context = {"session_index": 1, "turn_id": None}
    result = copy.deepcopy(saved)
    prior_attempt = {key: saved.get(key) for key in
                     ("pid", "process_instance_id", "started_at", "finished_at", "status", "error")}
    result.pop("error", None)
    result.pop("finished_at", None)
    result.update(status="running", pid=os.getpid(), process_instance_id=str(uuid4()),
                  inference_mode="offline_stub" if offline_model is not None else "live_openrouter",
                  resume_amendment_id=AMENDMENT_ID, resumed_at=now(), previous_attempts=[prior_attempt])
    write_json(result_path, result)
    builder = runner = None
    try:
        api, builder, run_logger, runner = original.bootstrap_runtime(
            session_dir, runtime_dir, context, offline_model=offline_model, offline_gate=offline_gate)
        logger = run_logger.RunLogger(THERAPIST_ID)
        restored = logger.restore_state(PATIENT_ID)
        if restored.get("total_turns") != 2 or restored.get("session_id") != SESSION_ID:
            raise RuntimeError("Native restoration did not recover the two-turn checkpoint")
        # This explicit experimental recovery attachment is the only amendment
        # to native session orchestration. No graph/memory/response is patched.
        logger.current_session_index = 0
        key = (THERAPIST_ID, PATIENT_ID, SESSION_ID)
        if api.session_loggers:
            raise RuntimeError("Recovery requires an empty process-local session registry")
        api.session_loggers[key] = {"logger": logger, "base_state": restored}
        result["restored_before_resume"] = {
            "total_turns": restored["total_turns"], "history_turns": len(restored["history"]),
            "message_count": len(restored["messages"]), "session_id": restored["session_id"],
            "run_id": native_session["run_id"], "native_open_session_reused": True}
        write_json(result_path, result)
        for position, turn in enumerate(spec["turns"][2:], 3):
            runner.check()
            context["turn_id"] = turn["turn_id"]
            started = time.monotonic()
            response = await api.send_message(api.MessageRequest(
                external_patient_id=PATIENT_ID, therapist_id=THERAPIST_ID, session_id=SESSION_ID,
                step_id=1, user_message=turn["text"]))
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
            if state.get("total_turns") != position:
                raise RuntimeError("Cumulative graph turn count is inconsistent")
            if state.get("safe_user_input") != turn["text"] or state.get("safety_flags"):
                raise RuntimeError("Scenario changed by sanitization")
            runner.check()
            print(f"TURN_DONE session=1 turn={position}", flush=True)
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
        if (len(ledger) != 1 or len(ledger[0]["turns"]) != 5 or not ledger[0].get("ended_at")
                or ledger[0]["final_state"]["total_turns"] != 5
                or sum(row["type"] == "conversation_turn" for row in new_records) != 5
                or len({row["id"] for row in new_records if row["type"] == "conversation_turn"}) != 5
                or not result["persisted_summary"] or not result["persisted_reflection"]):
            raise RuntimeError("Native closure failed its integrity checks")
        result.update(original.collect_consolidation_evidence(finalization, ledger[0], new_records))
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
    for index in range(1, 12):
        verify()
        if (RUNTIME / "STOP").exists():
            raise RuntimeError("Stop receipt exists; no further requests may start")
        session_dir = RUNTIME / "sessions" / f"session_{index:02d}"
        session_dir.mkdir(parents=True, exist_ok=True)
        command = [str(original.BUNDLED_PYTHON), str(HERE / "resume_integration.py"),
                   "_worker", "--session", str(index), "--live"]
        with (session_dir / "worker-resume-01.log").open("x") as stream:
            child = subprocess.Popen(command, env=original.worker_environment(), cwd=session_dir,
                                     stdout=stream, stderr=subprocess.STDOUT)
            try:
                append_jsonl(RUNTIME / "processes.jsonl", {"event": "start", "timestamp": now(),
                             "amendment_id": AMENDMENT_ID, "session_index": index,
                             "pid": child.pid, "command": command})
                code = child.wait(timeout=1200)
            except BaseException as exc:
                terminate_child(child)
                if not (RUNTIME / "STOP").exists():
                    write_json(RUNTIME / "STOP", {"timestamp": now(), "kind": "worker_control_failure",
                              "error_type": type(exc).__name__, "session_index": index})
                raise
        append_jsonl(RUNTIME / "processes.jsonl", {"event": "exit", "timestamp": now(),
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
        if not args.session or os.environ.get("MEMORY_INTEGRATION_WORKER") != "1":
            parser.error("Only the orchestrator may start a live worker")
        verify()
        if (RUNTIME / "STOP").exists() or not (HERE / "launch.json").exists():
            raise RuntimeError("No active authorized launch")
        try:
            result = asyncio.run(execute_resumed_session(RUNTIME) if args.session == 1 else
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
