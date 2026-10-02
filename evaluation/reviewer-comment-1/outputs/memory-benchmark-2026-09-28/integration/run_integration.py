"""Freeze/verify offline, then explicitly run real API sessions in new processes.

No API or credential access occurs in prepare, verify or review. `run --live`
is the sole live entry point; the internal worker also requires an orchestrator
environment marker. An interrupted/failed session is never replayed automatically.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path
from uuid import uuid4

from runtime_adapter import SerialGate, append_jsonl, create_runner, now, wait_for_episodes, write_json

HERE = Path(__file__).resolve().parent
BENCHMARK = HERE.parent
AGENT_ROOT = Path("/Users/marco/Sites/LLMPatients-Agent")
BUNDLED_PYTHON = Path("/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3")
DEFAULT_SITE = AGENT_ROOT / ".venv/lib/python3.12/site-packages"
DEFAULT_OVERLAY = Path("/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116")
PATIENT_ID = "alex_carter_001"
THERAPIST_ID = "memory_benchmark_integration_alex_20260928"
FALLBACK = "I'm trying to stay with what I'm feeling right now. Could we keep talking about that?"
TRANSPORT_FILES = ("openrouter_transport.py", "openrouter_inband_errors.py")


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def validate_scenario(scenario, gold):
    if scenario["patient_id"] != PATIENT_ID or len(scenario["sessions"]) != 11:
        raise ValueError("Expected exactly eleven sessions for canonical Alex Carter")
    turns = {}
    for index, session in enumerate(scenario["sessions"], 1):
        if session["session_index"] != index or len(session["turns"]) != 5:
            raise ValueError("Expected five turns in each chronologically ordered session")
        for turn_index, turn in enumerate(session["turns"], 1):
            if set(turn) != {"turn_id", "text"} or turn["turn_id"] != f"s{index:02d}t{turn_index:02d}":
                raise ValueError("The inference plan may only contain therapist text and turn identifiers")
            turns[turn["turn_id"]] = turn["text"]
    if sum(probe["expected"] is None for probe in gold["probes"]) != 1:
        raise ValueError("Exactly one absent-information probe is prespecified")
    for probe in gold["probes"]:
        if probe["turn_id"] not in turns:
            raise ValueError("Gold refers to a missing turn")
        for source in probe["source_turns"]:
            if source >= probe["turn_id"]:
                raise ValueError("Gold source must precede its recall probe")
    final = " ".join(turns[p["turn_id"]] for p in gold["probes"])
    if any(target.casefold() in final.casefold() for target in gold["novel_named_targets"]):
        raise ValueError("A recall question leaks a named target")


def source_files(agent_root):
    files = [Path("agent/__init__.py"), Path("data/topics_tree.json"),
             Path("data/patients/alex_carter_001.yaml")]
    for directory in ("agent/core", "agent/api", "agent/utils"):
        files.extend(path.relative_to(agent_root) for path in sorted((agent_root / directory).glob("*.py")))
    return sorted(set(files))


def prepare(agent_root=AGENT_ROOT):
    from scenario_definition import build_scenario
    # A freeze cannot be updated after any live session begins. Offline tests
    # use separate temporary storage and do not place sessions under runtime/.
    if (HERE / "runtime/sessions").exists():
        raise RuntimeError("Live session directory exists; an amendment is required, refusing to refreeze")
    scenario, gold = build_scenario()
    validate_scenario(scenario, gold)
    targets = gold["novel_named_targets"]
    corpus_files = sorted((BENCHMARK / "corpus").glob("*.json"))
    prior_files = sorted((BENCHMARK.parent / "reviewer-tests-openrouter-2026-09-27/longitudinal").glob("*scenario*.json"))
    comparisons = []
    for path in corpus_files + prior_files:
        text = path.read_text(encoding="utf-8").casefold()
        if any(target.casefold() in text for target in targets):
            raise ValueError("An integration target overlaps a previous scenario; revise before inference")
        comparisons.append({"path": str(path.relative_to(BENCHMARK.parent)), "sha256": digest(path)})
    if any(word in json.dumps(scenario).casefold() for word in ("harbour", "dawn", "copper")):
        raise ValueError("A forbidden earlier target was reused")
    write_json(HERE / "scenario.json", scenario)
    write_json(HERE / "gold.json", gold)
    write_json(HERE / "novelty-check.json", {"status": "passed", "targets": targets,
                                           "comparison_files": comparisons, "timestamp": now()})
    source = HERE / "source"
    source.mkdir(parents=True, exist_ok=True)
    copied = []
    for relative in source_files(Path(agent_root)):
        origin, destination = Path(agent_root) / relative, source / relative
        if not origin.is_file() or origin.is_symlink():
            raise RuntimeError(f"Source file unavailable or symlinked: {relative}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origin, destination)
        copied.append({"path": str(relative), "sha256": digest(origin)})
    included = [*sorted(HERE.glob("*.py")), HERE / "PROTOCOL.md", HERE / "scenario.json",
                HERE / "gold.json", HERE / "novelty-check.json"]
    included.extend(source / row["path"] for row in copied)
    included.extend(BENCHMARK / "scripts" / filename for filename in TRANSPORT_FILES)
    manifest = {"schema_version": 1, "frozen_at": now(), "source_origin": str(agent_root),
                "source_snapshot": "integration/source", "live_calls_at_freeze": 0,
                "runtime_origin": "current working tree; includes current factual memory, not old reviewer freeze",
                "files": {str(path.relative_to(BENCHMARK)): digest(path) for path in included}}
    write_json(HERE / "manifest.json", manifest)
    verify()
    return {"status": "frozen_without_inference", "file_count": len(manifest["files"]),
            "manifest_sha256": digest(HERE / "manifest.json"), "session_count": 11, "turn_count": 55}


def verify():
    manifest = json.loads((HERE / "manifest.json").read_text())
    for relative, expected in manifest["files"].items():
        path = BENCHMARK / relative
        if not path.is_file() or path.is_symlink() or digest(path) != expected:
            raise RuntimeError(f"Frozen artifact mismatch: {relative}")
    source = HERE / "source"
    for path in source.rglob("*"):
        if path.is_file() and path.suffix != ".pyc":
            relative = str(path.relative_to(BENCHMARK))
            if relative not in manifest["files"]:
                raise RuntimeError("Unexpected file inside frozen source")
    return manifest


def worker_environment():
    # Only non-secret OS/cache/runtime settings are inherited. The transport
    # resolves the key-file path during a live generate_content call.
    permitted = {"PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR", "HF_HOME",
                 "HUGGINGFACE_HUB_CACHE", "TRANSFORMERS_CACHE", "OPENROUTER_API_KEY_FILE"}
    env = {key: value for key, value in os.environ.items() if key in permitted}
    overlay = Path(os.environ.get("MEMORY_INTEGRATION_SCIPY_OVERLAY", str(DEFAULT_OVERLAY)))
    site = Path(os.environ.get("MEMORY_INTEGRATION_SITE_PACKAGES", str(DEFAULT_SITE)))
    if not overlay.is_dir() or not site.is_dir():
        raise RuntimeError("Configured SciPy overlay or Agent site-packages is missing")
    env.update(PYTHONPATH=os.pathsep.join(map(str, (overlay, HERE / "source", site))),
               PYTHONDONTWRITEBYTECODE="1", PYTHONUNBUFFERED="1",
               HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", TOKENIZERS_PARALLELISM="false",
               LANGCHAIN_TRACING_V2="false", LANGSMITH_TRACING="false",
               GOOGLE_APPLICATION_CREDENTIALS=str(HERE / "source/NO_VERTEX_CREDENTIALS"),
               model_provider="vertex_ai", model_id="gemini-2.5-pro", temperature="0.7", max_tokens="4096",
               MEMORY_INTEGRATION_WORKER="1")
    return env


def worker_command(index, python=None):
    return [str(python or BUNDLED_PYTHON), str(HERE / "run_integration.py"),
            "_worker", "--session", str(index), "--live"]


def bootstrap_runtime(session_dir, runtime_dir, context, *, offline_model=None, offline_gate=None):
    sys.path.insert(0, str(HERE / "source"))
    sys.path.insert(0, str(BENCHMARK / "scripts"))
    # No source .env files exist. Importing the factory does not initialize a
    # model; replace it before importing the graph, which calls that factory.
    import agent.core.llm_runner as factory
    import agent.core.llm_provider_vertex as vertex_provider
    def forbidden_vertex(*args, **kwargs):
        raise AssertionError("Vertex calls are prohibited by the integration protocol")
    vertex_provider.vertexai.init = forbidden_vertex
    vertex_provider.GenerativeModel = forbidden_vertex
    if offline_model is None:
        from openrouter_inband_errors import install_inband_error_handling
        from openrouter_transport import OpenRouterModel
        install_inband_error_handling()
        model = OpenRouterModel("gemini-2.5-pro", timeout_seconds=120,
                                records_path=session_dir / "openrouter-api-records.jsonl")
    else:
        model = offline_model
    gate = offline_gate or SerialGate(runtime_dir / "request-gate.json")
    runner = create_runner(model=model, events_path=session_dir / "generation-events.jsonl",
                           gate=gate, context=context, stop_path=runtime_dir / "STOP")
    factory.create_llm_runner = lambda *args, **kwargs: runner
    import agent.core.langgraph_builder as builder
    import agent.utils.run_logger as run_logger
    from agent.core.memory_store import JsonlMemoryStore
    builder.MEMORY_DIR = runtime_dir / "memory"
    builder.MEMORY_STORE = JsonlMemoryStore(builder.MEMORY_DIR)
    run_logger.RUNS_BASE_DIR = runtime_dir / "runs"
    import agent.api.app as api
    api.RUNS_DIR, api.MEMORY_DIR = run_logger.RUNS_BASE_DIR, builder.MEMORY_DIR
    return api, builder, run_logger, runner


def ledger_sessions(runtime_dir):
    path = runtime_dir / "runs" / f"{THERAPIST_ID}.json"
    return json.loads(path.read_text())["sessions"] if path.exists() else []


async def execute_session(index, runtime_dir, *, offline_model=None, offline_gate=None):
    """Use native API functions, persist all accepted replies, then close once."""
    scenario = json.loads((HERE / "scenario.json").read_text())
    spec = scenario["sessions"][index - 1]
    session_id = f"memory_integration_s{index:02d}"
    session_dir = runtime_dir / "sessions" / f"session_{index:02d}"
    result_path = session_dir / "session.json"
    if result_path.exists():
        raise RuntimeError("An existing session must not be replayed automatically")
    previous = ledger_sessions(runtime_dir)
    if len(previous) != index - 1 or any(not row.get("ended_at") for row in previous):
        raise RuntimeError("Persistent ledger is not a completed chronological prefix")
    for expected, row in enumerate(previous, 1):
        if row["session_id"] != f"memory_integration_s{expected:02d}" or len(row["turns"]) != 5:
            raise RuntimeError("Persistent ledger contains an unexpected session or turn count")
    session_dir.mkdir(parents=True, exist_ok=True)
    os.chdir(session_dir)
    context = {"session_index": index, "turn_id": None}
    result = {"schema_version": 1, "patient_id": PATIENT_ID, "therapist_id": THERAPIST_ID,
              "session_index": index, "session_id": session_id, "status": "running", "turns": [],
              "pid": os.getpid(), "process_instance_id": str(uuid4()), "started_at": now(),
              "inference_mode": "offline_stub" if offline_model is not None else "live_openrouter",
              "manifest_sha256": digest(HERE / "manifest.json"), "provider_seed": None,
              "model_id": "google/gemini-2.5-pro", "prior_finalized_sessions": len(previous)}
    write_json(result_path, result)
    builder = runner = None
    try:
        api, builder, run_logger, runner = bootstrap_runtime(session_dir, runtime_dir, context,
                                             offline_model=offline_model, offline_gate=offline_gate)
        restored = run_logger.RunLogger(THERAPIST_ID).restore_state(PATIENT_ID)
        result["restored_before_first_request"] = {
            "total_turns": restored.get("total_turns", 0), "history_turns": len(restored.get("history", [])),
            "summary": restored.get("summary", ""), "reflection": restored.get("session_reflection", ""),
            "restored_session_id": restored.get("session_id")}
        if result["restored_before_first_request"]["total_turns"] != (index - 1) * 5:
            raise RuntimeError("Native restore_state lost the prior cumulative turn count")
        key = (THERAPIST_ID, PATIENT_ID, session_id)
        for position, turn in enumerate(spec["turns"], 1):
            runner.check()
            context["turn_id"] = turn["turn_id"]
            started = time.monotonic()
            response = await api.send_message(api.MessageRequest(
                external_patient_id=PATIENT_ID, therapist_id=THERAPIST_ID, session_id=session_id,
                step_id=index, user_message=turn["text"]))
            state = api.session_loggers[key]["latest_state"]
            record = {"turn_id": turn["turn_id"], "therapist_text": turn["text"],
                      "patient_text": response.message, "api_response": response.model_dump(mode="json"),
                      "prompt": state.get("prompt"), "summary_in_state": state.get("summary"),
                      "reflection_in_state": state.get("session_reflection"),
                      "retrieved_episodes": state.get("episodic_context"),
                      "retrieved_evidence": state.get("evidence_context"),
                      "total_turns": state.get("total_turns"), "safe_user_input": state.get("safe_user_input"),
                      "safety_flags": state.get("safety_flags"), "timestamp": now(),
                      "elapsed_seconds": time.monotonic() - started}
            result["turns"].append(record)
            write_json(result_path, result)
            if not response.message.strip() or response.message in {FALLBACK, "[no reply]", "[ERROR]", "[NO RESPONSE]"}:
                raise RuntimeError("A graph fallback or empty response cannot count as live patient content")
            if state.get("total_turns") != (index - 1) * 5 + position:
                raise RuntimeError("Cumulative graph turn count is inconsistent")
            if state.get("safe_user_input") != turn["text"] or state.get("safety_flags"):
                raise RuntimeError("Therapist scenario was sanitized; record the discrepancy and stop")
            runner.check()
            print(f"TURN_DONE session={index} turn={position}", flush=True)
        context["turn_id"] = None
        wait_for_episodes(builder, runner, PATIENT_ID, THERAPIST_ID)
        runner.check()
        finalization = await api.end_session(api.SessionEndRequest(
            external_patient_id=PATIENT_ID, therapist_id=THERAPIST_ID, session_id=session_id))
        runner.check()
        if finalization.status != "finalized" or key in api.session_loggers:
            raise RuntimeError("Native API did not close the active session")
        records = list(builder.MEMORY_STORE.iter_records(PATIENT_ID, THERAPIST_ID))
        new_records = [row for row in records if row.get("session_id") == session_id]
        result.update(finalization=finalization.model_dump(mode="json"),
                      persisted_summary=builder.load_long_term_summary(PATIENT_ID, THERAPIST_ID),
                      persisted_reflection=builder.load_latest_session_reflection(PATIENT_ID, THERAPIST_ID),
                      memory_record_counts=dict(Counter(row["type"] for row in records)),
                      session_memory_records=new_records)
        if not result["persisted_summary"] or not result["persisted_reflection"]:
            raise RuntimeError("Finalized session has empty narrative memory")
        current_ledger = ledger_sessions(runtime_dir)[-1]
        if not current_ledger.get("ended_at") or current_ledger["final_state"]["total_turns"] != index * 5:
            raise RuntimeError("Native closed ledger is incomplete")
        if sum(row["type"] == "conversation_turn" for row in new_records) != 5:
            raise RuntimeError("The five native conversation sources were not persisted")
        result.update(status="completed", finished_at=now())
    except BaseException as exc:
        result.update(status="stopped", finished_at=now(), error={
            "type": type(exc).__name__, "details": getattr(exc, "details", None),
            "message": "Session stopped; accepted turns and native error records retained. No automatic retry."})
        write_json(result_path, result)
        raise
    finally:
        write_json(result_path, result)
        if builder is not None:
            # Drain no new work here. With HTTP timeout120 and the episode
            # barrier, a stopped process has at most one bounded request.
            builder.SUMMARY_EXECUTOR.shutdown(wait=True, cancel_futures=True)
    return result


def run_live(max_sessions):
    verify()
    runtime = HERE / "runtime"
    if (runtime / "STOP").exists():
        raise RuntimeError("Cooperative STOP exists; no model requests may start")
    for index in range(1, max_sessions + 1):
        verify()
        result_path = runtime / "sessions" / f"session_{index:02d}/session.json"
        if result_path.exists():
            saved = json.loads(result_path.read_text())
            if saved.get("status") != "completed" or saved.get("inference_mode") != "live_openrouter":
                raise RuntimeError("Stopped or offline session requires an explicit reviewed amendment; refusing replay")
            continue
        session_dir = result_path.parent
        session_dir.mkdir(parents=True, exist_ok=True)
        command = worker_command(index)
        with (session_dir / "worker.log").open("x", encoding="utf-8") as stream:
            child = subprocess.Popen(command, env=worker_environment(), cwd=session_dir,
                                     stdout=stream, stderr=subprocess.STDOUT)
            append_jsonl(runtime / "processes.jsonl", {"event": "start", "timestamp": now(),
                         "session_index": index, "pid": child.pid, "command": command})
            try:
                code = child.wait(timeout=1200)
            except subprocess.TimeoutExpired:
                child.terminate()
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait(timeout=10)
                append_jsonl(runtime / "processes.jsonl", {"event": "timeout", "timestamp": now(),
                                                          "session_index": index, "pid": child.pid})
                raise RuntimeError("Session exceeded1200s; preserved outputs, no automatic retry") from None
        append_jsonl(runtime / "processes.jsonl", {"event": "exit", "timestamp": now(),
                                                  "session_index": index, "pid": child.pid, "exit_code": code})
        if code != 0:
            raise RuntimeError(f"Session {index} stopped (worker exit {code}); campaign halted")
        saved = json.loads(result_path.read_text())
        if saved.get("status") != "completed":
            raise RuntimeError("Worker exited without a completed native finalization")
        print(f"SESSION_DONE {index}/11", flush=True)
    return {"status": "completed" if max_sessions == 11 else "completed_prefix", "sessions": max_sessions}


def export_review():
    """Export all probe evidence for semantic review; no automatic correctness claim."""
    verify()
    gold = json.loads((HERE / "gold.json").read_text())
    turns = {}
    for path in sorted((HERE / "runtime/sessions").glob("session_*/session.json")):
        saved = json.loads(path.read_text())
        for turn in saved["turns"]:
            turns[turn["turn_id"]] = turn
    rows = []
    for probe in gold["probes"]:
        answer = turns.get(probe["turn_id"])
        rows.append({**probe, "response": answer["patient_text"] if answer else None,
                     "sources": [{"turn_id": turn_id, "therapist_text": turns[turn_id]["therapist_text"],
                                  "patient_text": turns[turn_id]["patient_text"]}
                                 for turn_id in probe["source_turns"] if turn_id in turns],
                     "status": "requires_semantic_review" if answer else "not_observed"})
    write_json(HERE / "runtime/probe-review.json", {"probes": rows, "timestamp": now(),
               "scope": "single-profile integration control; no comparative or clinical efficacy inference"})
    return {"status": "review_exported", "observed_probes": sum(r["response"] is not None for r in rows)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "verify", "run", "review", "_worker"))
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--session", type=int, choices=range(1, 12))
    parser.add_argument("--max-sessions", type=int, default=11, choices=range(1, 12))
    args = parser.parse_args()
    if args.command in {"run", "_worker"} and not args.live:
        parser.error("Live inference requires explicit --live; prepare and verify make no API calls")
    if args.command == "prepare":
        result = prepare()
    elif args.command == "verify":
        result = {"status": "verified", "frozen_files": len(verify()["files"])}
    elif args.command == "run":
        result = run_live(args.max_sessions)
    elif args.command == "review":
        result = export_review()
    else:
        if not args.session or os.environ.get("MEMORY_INTEGRATION_WORKER") != "1":
            parser.error("The worker must be launched by the orchestrator")
        verify()
        result = asyncio.run(execute_session(args.session, HERE / "runtime"))
        result = {"status": result["status"], "session_index": args.session}
    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # No traceback/native error text can expose reasoning or credentials.
        print(json.dumps({"status": "stopped", "error_type": type(exc).__name__,
                          "message": "See retained structured records; no automatic retry."}), flush=True)
        raise SystemExit(2) from None
