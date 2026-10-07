"""Paired eleven-session runner. Fresh process per session, no automatic replay.

Generation workers receive only one run config and its own durable state.
Use `status` without credentials/network; `live` is an explicit, exclusive launch.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import signal
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path
from uuid import uuid4

from prepare_execution import HERE, digest, read_json, verify
from prompt_contract import flat_context_from_ledger, render_flat_history, render_prompt
from runtime_adapter import SerialGate, append_jsonl, create_runner, now, wait_for_episodes, write_json

BUNDLED_PYTHON = Path("/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3")
DEFAULT_SITE = Path("/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages")
DEFAULT_OVERLAY = Path("/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116")
FALLBACKS = {"I'm trying to stay with what I'm feeling right now. Could we keep talking about that?",
             "[no reply]", "[ERROR]", "[NO RESPONSE]"}
ARMS = {"structured_common_profile", "flat_full_history"}
RUN_FIELDS = {"run_id", "pair_id", "profile_id", "repetition", "arm", "case_path", "case_sha256",
              "scenario_path", "sessions", "therapist_turns", "native_api_id", "archived_patient_id",
              "profile_path", "source_yaml_sha256"}


def read_jsonl(path):
    path = Path(path)
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []


def stop_campaign(runtime, kind, *, runner=None, **details):
    """Latch before I/O; persist the first cause without replacing earlier STOP."""
    if runner is not None:
        with runner.fatal_lock:
            if runner.fatal is None:
                runner.fatal = runner.abort_type(kind, {"kind": kind, **details})
    path = Path(runtime) / "STOP"
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("x", encoding="utf-8") as stream:
            json.dump({"timestamp": now(), "kind": kind, **details}, stream, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
    except FileExistsError:
        pass


def load_run(run_id):
    if Path(run_id).name != run_id or not run_id:
        raise ValueError("Invalid run ID")
    config = read_json(HERE / "generation/runs" / f"{run_id}.json")
    if set(config) != RUN_FIELDS or config["run_id"] != run_id or config["arm"] not in ARMS:
        raise ValueError("Unexpected generation config fields or run identity")
    case_path = HERE / "generation" / config["case_path"]
    if digest(case_path) != config["case_sha256"]:
        raise RuntimeError("Clinical case hash changed")
    if digest(HERE / config["profile_path"]) != config["source_yaml_sha256"]:
        raise RuntimeError("Native profile bytes changed")
    return config


def worker_environment():
    allowed = {"PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR", "HF_HOME",
               "HUGGINGFACE_HUB_CACHE", "TRANSFORMERS_CACHE", "OPENROUTER_API_KEY_FILE"}
    env = {key: value for key, value in os.environ.items() if key in allowed}
    if not DEFAULT_SITE.is_dir() or not DEFAULT_OVERLAY.is_dir():
        raise RuntimeError("Configured native dependencies are unavailable")
    env.update(PYTHONPATH=os.pathsep.join(map(str, (DEFAULT_OVERLAY, HERE, HERE / "source", DEFAULT_SITE))),
               PYTHONDONTWRITEBYTECODE="1", PYTHONUNBUFFERED="1",
               HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", TOKENIZERS_PARALLELISM="false",
               LANGCHAIN_TRACING_V2="false", LANGSMITH_TRACING="false",
               GOOGLE_APPLICATION_CREDENTIALS=str(HERE / "source/NO_VERTEX_CREDENTIALS"),
               model_provider="vertex_ai", model_id="gemini-2.5-pro", temperature="0.7", max_tokens="4096")
    return env


def bootstrap_runtime(config, case, session_dir, run_dir, runtime, context, *, offline_model=None, offline_gate=None):
    """Replace provider and prompt node before graph import/compilation."""
    sys.path.insert(0, str(HERE / "source"))
    import agent.core.llm_runner as factory
    import agent.core.llm_provider_vertex as vertex_provider

    def forbidden_vertex(*args, **kwargs):
        raise AssertionError("Vertex calls are prohibited in this comparison")

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
    gate = offline_gate or SerialGate(runtime / "request-gate.json")
    runner = create_runner(model=model, events_path=session_dir / "generation-events.jsonl", gate=gate,
                           context=context, stop_path=runtime / "STOP")
    factory.create_llm_runner = lambda *args, **kwargs: runner
    import agent.core.langgraph_builder as builder
    import agent.utils.run_logger as run_logger
    from agent.core.memory_store import JsonlMemoryStore
    builder.MEMORY_DIR = run_dir / "memory"
    builder.MEMORY_STORE = JsonlMemoryStore(builder.MEMORY_DIR)
    run_logger.RUNS_BASE_DIR = run_dir / "runs"
    # The full baseline uses the exact deterministic native input/output
    # functions, but never invokes its classifier, retrieval or memory graph.
    api = None
    if config["arm"] == "structured_common_profile":
        from prompt_adapter import make_structured_prompt
        builder.build_prompt = make_structured_prompt(case)
        import agent.api.app as api
        api.RUNS_DIR, api.MEMORY_DIR = run_logger.RUNS_BASE_DIR, builder.MEMORY_DIR
    return api, builder, run_logger, runner


def validate_prefix(run_dir, config, index):
    ledger_path = run_dir / "accepted-turns.jsonl"
    records = read_jsonl(ledger_path)
    render_flat_history(records, run_id=config["run_id"], expected_prior_turns=(index - 1) * 5)
    prior = []
    for number in range(1, index):
        saved = read_json(run_dir / "sessions" / f"session_{number:02d}/session.json")
        if saved["status"] != "completed" or saved["session_index"] != number or saved["run_id"] != config["run_id"]:
            raise RuntimeError("Only a completed chronological prefix may be opened")
        if saved["turns"] != records[(number - 1) * 5:number * 5]:
            raise RuntimeError("Durable accepted ledger differs from previous session receipt")
        prior.append(saved)
    if prior:
        if digest(ledger_path) != prior[-1]["accepted_ledger_sha256"]:
            raise RuntimeError("Previous committed ledger changed")
        for relative, expected in prior[-1]["state_files_at_close"].items():
            if digest(run_dir / relative) != expected:
                raise RuntimeError("Persisted native state changed since previous close")
    return records, prior


def native_ledger(run_dir, therapist):
    path = run_dir / "runs" / f"{therapist}.json"
    return read_json(path)["sessions"] if path.exists() else []


def compare_native_prefix(sessions, accepted, config):
    flattened = []
    for index, session in enumerate(sessions, 1):
        if (not session.get("ended_at") or session["session_id"] != f"comparison_s{index:02d}"
                or session["patient_id"] != config["native_api_id"] or len(session["turns"]) != 5):
            raise RuntimeError("Native ledger is not a closed run-specific prefix")
        flattened += session["turns"]
    if len(flattened) != len(accepted):
        raise RuntimeError("Native and accepted ledger lengths differ")
    for native, durable in zip(flattened, accepted):
        if (native["therapist_input_raw"] != durable["therapist_text"]
                or native["patient_response"] != durable["patient_text"]):
            raise RuntimeError("Native and accepted conversation texts differ")


def consolidation_evidence(finalization, session, records):
    saved = session["final_state"].get("memory_consolidation")
    if not isinstance(saved, dict):
        raise RuntimeError("Missing persisted consolidation status")
    sources = [r for r in records if r["type"] == "conversation_turn"]
    eligible = {r["id"] for r in sources if r["usable"]}
    batches = [r for r in records if r["type"] == "fact_batch"]
    processed = {source for batch in batches for source in batch["source_ids"]}
    if not processed <= eligible:
        raise RuntimeError("Batch source belongs outside this session's eligible evidence")
    actual = {"source_turns": len(eligible), "processed_sources": len(processed),
              "validated_facts": sum(len(b["facts"]) for b in batches),
              "rejected_facts": sum(len(b.get("rejected_facts", [])) for b in batches),
              "invalid_batches": sum(bool(b.get("validation_error")) for b in batches)}
    expected = "partial" if (actual["rejected_facts"] or actual["invalid_batches"] or eligible - processed) else "complete"
    if any(saved.get(k) != v for k, v in actual.items()) or saved.get("status") != expected:
        raise RuntimeError("Persisted consolidation counts/status disagree with original memory records")
    if finalization.memory_status != expected or (expected == "partial" and not finalization.memory_warnings):
        raise RuntimeError("API consolidation status differs from persistent evidence")
    return {"memory_status": expected, "memory_consolidation": saved,
            "memory_warnings": finalization.memory_warnings,
            "raw_sources": len(sources), "eligible_source_ids": sorted(eligible),
            "excluded_source_ids": [r["id"] for r in sources if not r["usable"]],
            "validated_fact_ids": [f["id"] for b in batches for f in b["facts"]],
            "quarantined_facts": [{"batch_id": b["id"], "facts": b["rejected_facts"]}
                                  for b in batches if b.get("rejected_facts")]}


async def execute_session(config, index, runtime, *, offline_model=None, offline_gate=None):
    runtime = Path(runtime).resolve()
    if (runtime / "STOP").exists():
        raise RuntimeError("Global STOP exists; no request may start")
    if not 1 <= index <= 11:
        raise ValueError("Session must be in 1..11")
    run_id, patient = config["run_id"], config["native_api_id"]
    therapist = f"comparison_{run_id}"
    run_dir = runtime / run_id
    session_id = f"comparison_s{index:02d}"
    session_dir = run_dir / "sessions" / f"session_{index:02d}"
    result_path = session_dir / "session.json"
    accepted, previous = validate_prefix(run_dir, config, index)
    session_dir.mkdir(parents=True, exist_ok=True)
    # Exclusive receipt precedes imports or provider construction. Even an
    # empty receipt after interruption prevents blind re-execution.
    with result_path.open("x", encoding="utf-8") as stream:
        stream.write('{"status":"initializing"}\n')
        stream.flush()
        os.fsync(stream.fileno())
    result = {"schema_version": 1, "run_id": run_id, "arm": config["arm"],
              "profile_id": config["profile_id"], "patient_id": patient,
              "archived_patient_id": config["archived_patient_id"], "therapist_id": therapist,
              "session_index": index, "session_id": session_id, "status": "running", "turns": [],
              "pid": os.getpid(), "process_instance_id": str(uuid4()), "started_at": now(),
              "inference_mode": "offline_stub" if offline_model is not None else "live_openrouter",
              "provider_seed": None, "requested_model": "google/gemini-2.5-pro",
              "case_sha256": config["case_sha256"], "prior_finalized_sessions": len(previous)}
    if (HERE / "manifest.json").exists():
        result["execution_manifest_sha256"] = digest(HERE / "manifest.json")
    write_json(result_path, result)
    builder = runner = None
    cwd = Path.cwd()
    try:
        os.chdir(session_dir)
        case = (HERE / "generation" / config["case_path"]).read_text(encoding="utf-8")
        spec = read_json(HERE / "generation" / config["scenario_path"])["sessions"][index - 1]
        if spec["session_index"] != index or len(spec["turns"]) != 5:
            raise RuntimeError("Invalid generation-only scenario")
        context = {"run_id": run_id, "arm": config["arm"], "session_index": index, "turn_id": None}
        api, builder, run_logger, runner = bootstrap_runtime(config, case, session_dir, run_dir, runtime,
                                             context, offline_model=offline_model, offline_gate=offline_gate)
        if config["arm"] == "structured_common_profile":
            prior_native = native_ledger(run_dir, therapist)
            compare_native_prefix(prior_native, accepted, config)
            restored = run_logger.RunLogger(therapist).restore_state(patient)
            total = restored.get("total_turns", 0)
            if total != len(accepted):
                raise RuntimeError("Native restore_state lost prior cumulative turn count")
            result["restored_before_first_request"] = {
                "total_turns": total, "history_turns": len(restored.get("history", [])),
                "summary": restored.get("summary", ""), "reflection": restored.get("session_reflection", ""),
                "memory_consolidation": restored.get("memory_consolidation")}
            if previous and (not restored.get("summary") or not restored.get("session_reflection")):
                raise RuntimeError("Narrative memory was not restored across processes")
            native_sources = [r for r in builder.MEMORY_STORE.iter_records(patient, therapist)
                              if r["type"] == "conversation_turn"]
            if len(native_sources) != len(accepted):
                raise RuntimeError("Native original-source memory is incomplete")
        else:
            result["restored_before_first_request"] = {"total_turns": len(accepted),
                "history_turns": len(accepted), "restored_from": "complete_own_accepted_ledger"}
        write_json(result_path, result)
        for position, turn in enumerate(spec["turns"], 1):
            runner.check()
            context["turn_id"] = turn["turn_id"]
            expected_index = (index - 1) * 5 + position
            started = time.monotonic()
            if api is not None:
                response = await api.send_message(api.MessageRequest(external_patient_id=patient,
                    therapist_id=therapist, session_id=session_id, step_id=index, user_message=turn["text"]))
                state = api.session_loggers[(therapist, patient, session_id)]["latest_state"]
                patient_text = response.message
                if state.get("total_turns") != expected_index:
                    raise RuntimeError("Cumulative graph turn count is inconsistent")
                extra = {"api_response": response.model_dump(mode="json"),
                         "summary_in_state": state.get("summary"), "reflection_in_state": state.get("session_reflection"),
                         "retrieved_episodes": state.get("episodic_context"),
                         "retrieved_evidence": state.get("evidence_context")}
            else:
                state_obj = builder.State(user_input=turn["text"])
                builder.sanitize_user_input(state_obj)
                context_text = flat_context_from_ledger(run_dir / "accepted-turns.jsonl", run_id=run_id,
                                                        expected_prior_turns=expected_index - 1)
                prompt = render_prompt(case_block=case, arm_context=context_text,
                                       latest_question=state_obj.safe_user_input)
                state_obj.prompt = prompt
                # Exact native deterministic output normalization; no memory
                # graph or classifier is run for the flat condition.
                patient_text = builder.generate_response(state_obj)["response"]
                state = {"prompt": prompt, "safe_user_input": state_obj.safe_user_input,
                         "safety_flags": state_obj.safety_flags}
                extra = {"history_turns_in_prompt": expected_index - 1}
            if not isinstance(patient_text, str) or not patient_text.strip():
                runner.abort("No visible patient response", {"kind": "empty_patient_response"})
            prompt = state["prompt"]
            if prompt.count("<CASE>\n" + case + "</CASE>") != 1:
                raise RuntimeError("Common clinical case not present exactly once")
            application_failure = bool(state.get("safety_flags") or state.get("safe_user_input") != turn["text"]
                                       or patient_text in FALLBACKS)
            record = {"run_id": run_id, "status": "accepted", "turn_index": expected_index,
                      "session_index": index, "turn_id": turn["turn_id"], "therapist_text": turn["text"],
                      "patient_text": patient_text, "safe_user_input": state.get("safe_user_input"),
                      "safety_flags": state.get("safety_flags", []), "application_guard_failure": application_failure,
                      "prompt": prompt, "timestamp": now(), "elapsed_seconds": time.monotonic() - started, **extra}
            # 'accepted' means a committed visible reply, never a correctness
            # decision. Preserve wrong, partial and guard-altered answers.
            append_jsonl(run_dir / "accepted-turns.jsonl", record)
            accepted.append(record)
            result["turns"].append(record)
            write_json(result_path, result)
            if application_failure:
                outcomes = {"outcomes": [{"turn_id": r["turn_id"], "status": "application_failure"}
                                          for r in accepted if r["application_guard_failure"]]}
                write_json(run_dir / "probe-outcomes.json", outcomes)
            runner.check()
            print(f"TURN_DONE run={run_id} session={index} turn={position}", flush=True)
        context["turn_id"] = None
        if api is not None:
            wait_for_episodes(builder, runner, patient, therapist)
            finalization = await api.end_session(api.SessionEndRequest(external_patient_id=patient,
                                                        therapist_id=therapist, session_id=session_id))
            runner.check()
            if finalization.status != "finalized" or (therapist, patient, session_id) in api.session_loggers:
                raise RuntimeError("Native API did not close the active session")
            sessions = native_ledger(run_dir, therapist)
            compare_native_prefix(sessions, accepted, config)
            current = sessions[-1]
            if current["final_state"]["total_turns"] != index * 5:
                raise RuntimeError("Closed native cumulative count is wrong")
            records = list(builder.MEMORY_STORE.iter_records(patient, therapist))
            new_records = [r for r in records if r.get("session_id") == session_id]
            if sum(r["type"] == "conversation_turn" for r in new_records) != 5:
                raise RuntimeError("Missing native conversation source")
            result.update(finalization=finalization.model_dump(mode="json"), session_memory_records=new_records,
                persisted_summary=builder.load_long_term_summary(patient, therapist),
                persisted_reflection=builder.load_latest_session_reflection(patient, therapist),
                memory_record_counts=dict(Counter(r["type"] for r in records)))
            result.update(consolidation_evidence(finalization, current, new_records))
            paths = [run_dir / "runs" / f"{therapist}.json", builder.MEMORY_STORE.file_path(patient, therapist)]
        else:
            # Bookkeeping close only. Never fabricate a structured memory result.
            result.update(finalization={"status": "baseline_closed", "total_turns": len(accepted),
                "history_turns_retained": len(accepted), "structured_memory_calls": 0}, memory_status="not_applicable")
            if list((run_dir / "memory").glob("*.jsonl")) or list((run_dir / "runs").glob("*.json")):
                raise RuntimeError("Flat condition wrote native memory or a native run ledger")
            paths = []
        runner.check()
        result.update(status="completed", finished_at=now(),
                      accepted_ledger_sha256=digest(run_dir / "accepted-turns.jsonl"),
                      state_files_at_close={str(p.relative_to(run_dir)): digest(p) for p in paths})
    except BaseException as exc:
        result.update(status="stopped", finished_at=now(), error={"type": type(exc).__name__,
            "details": getattr(exc, "details", None),
            "message": "Original outputs retained; no automatic replay or availability retry."})
        # The in-memory latch precedes all STOP I/O. A full/unavailable disk
        # cannot permit queued inference, or replace the original exception.
        try:
            stop_campaign(runtime, "worker_failure", runner=runner, run_id=run_id, session_index=index,
                          error_type=type(exc).__name__, details=getattr(exc, "details", None))
        except BaseException as stop_error:
            exc.add_note(f"Additionally failed to persist global STOP: {type(stop_error).__name__}")
            result.setdefault("cleanup_errors", []).append({"stage": "stop_write", "type": type(stop_error).__name__})
        raise
    finally:
        original_error = sys.exc_info()[1]
        cleanup_errors = []

        def record_cleanup_failure(stage, error):
            cleanup_errors.append((stage, error))
            result.setdefault("cleanup_errors", []).append({"stage": stage, "type": type(error).__name__})
            # Also latch a failure first observed while closing an otherwise
            # successful session, before cancelling/waiting for its executor.
            try:
                stop_campaign(runtime, "worker_cleanup_failure", runner=runner, run_id=run_id,
                              session_index=index, stage=stage, error_type=type(error).__name__)
            except BaseException as stop_error:
                cleanup_errors.append(("stop_write", stop_error))

        try:
            try:
                write_json(result_path, result)
            except BaseException as write_error:
                record_cleanup_failure("result_write", write_error)
        finally:
            try:
                if builder is not None:
                    builder.SUMMARY_EXECUTOR.shutdown(wait=True, cancel_futures=True)
            except BaseException as shutdown_error:
                record_cleanup_failure("executor_shutdown", shutdown_error)
            finally:
                try:
                    os.chdir(cwd)
                except BaseException as cwd_error:
                    record_cleanup_failure("cwd_restore", cwd_error)
        if cleanup_errors:
            primary = original_error if original_error is not None else cleanup_errors[0][1]
            for stage, error in cleanup_errors:
                if error is not primary:
                    primary.add_note(f"Additional cleanup failure in {stage}: {type(error).__name__}")
            if original_error is None:
                raise primary
    return result


def summarize(runtime):
    """Availability and provenance only. Semantic scoring stays pending."""
    runtime = Path(runtime)
    sessions, records = [], []
    for path in sorted(runtime.glob("*/sessions/session_*/session.json")):
        try:
            sessions.append(read_json(path))
        except (OSError, ValueError):
            sessions.append({"status": "unreadable"})
    for path in sorted(runtime.glob("*/accepted-turns.jsonl")):
        records += read_jsonl(path)
    calls = [row for path in sorted(runtime.glob("*/sessions/session_*/openrouter-api-records.jsonl"))
             for row in read_jsonl(path)]
    completed = Counter(s.get("run_id") for s in sessions if s.get("status") == "completed")
    responses = [r for r in calls if r["event"] == "response"]
    costs = [r.get("response", {}).get("usage", {}).get("cost") for r in responses]
    cost_known = [v for v in costs if isinstance(v, (int, float)) and not isinstance(v, bool)]
    probes = {"s10t01", "s11t01", "s11t02", "s11t03", "s11t04", "s11t05"}
    return {"status": "stopped" if (runtime / "STOP").exists() else (
            "completed" if len(completed) == 30 and all(v == 11 for v in completed.values()) else "incomplete"),
        "updated_at": now(), "planned_trajectories": 30, "completed_trajectories": sum(v == 11 for v in completed.values()),
        "planned_session_executions": 330, "completed_sessions": sum(completed.values()),
        "accepted_turns": len(records), "planned_turns": 1650,
        "observed_probes": sum(r["turn_id"] in probes for r in records), "planned_probes": 180,
        "application_guard_failures": sum(bool(r.get("application_guard_failure")) for r in records),
        "requests": sum(r["event"] == "request" for r in calls), "responses": len(responses),
        "provider_errors": sum(r["event"] == "error" for r in calls),
        "reported_cost_usd": sum(cost_known), "responses_with_reported_cost": len(cost_known),
        "semantic_review": "pending", "stop": read_json(runtime / "STOP") if (runtime / "STOP").exists() else None}


def terminate_worker(child, runtime, **details):
    stop_error = None
    try:
        stop_campaign(runtime, "worker_interrupted_or_timeout", **details)
    except BaseException as exc:
        stop_error = exc
    # Terminate even when STOP cannot be written. A process that exits between
    # poll and signal has already stopped; still reap it with wait().
    try:
        if child.poll() is None:
            try:
                os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                child.wait(timeout=10)
    except BaseException as termination_error:
        if stop_error is not None:
            termination_error.add_note(f"Additionally failed to persist global STOP: {type(stop_error).__name__}")
        raise
    if stop_error is not None:
        raise stop_error


def run_live():
    verify()
    runtime = HERE / "runtime"
    if runtime.exists() and any(runtime.iterdir()):
        raise RuntimeError("Live output already exists; interrupted work needs an explicit reviewed continuation")
    runtime.mkdir(parents=True, exist_ok=True)
    launch_id = str(uuid4())
    launch = {"launch_id": launch_id, "started_at": now(), "pid": os.getpid(),
              "execution_manifest_sha256": digest(HERE / "manifest.json"), "mode": "live_openrouter"}
    # Two launchers cannot both acquire this receipt.
    with (runtime / "launch.json").open("x", encoding="utf-8") as stream:
        json.dump(launch, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    schedule = read_json(HERE / "generation/schedule.json")["session_executions"]
    active = None
    try:
        for item in schedule:
            verify()
            if (runtime / "STOP").exists():
                raise RuntimeError("Global STOP: remaining matrix not executed")
            run_id, index = item["run_id"], item["session_index"]
            session_dir = runtime / run_id / "sessions" / f"session_{index:02d}"
            session_dir.mkdir(parents=True, exist_ok=True)
            write_json(runtime / "active-execution.json", {**item, "launch_id": launch_id})
            command = [str(BUNDLED_PYTHON), str(HERE / "paired_runner.py"), "_worker",
                       "--execution-order", str(item["execution_order"]), "--launch-id", launch_id]
            with (session_dir / "worker.log").open("x", encoding="utf-8") as stream:
                active = subprocess.Popen(command, env=worker_environment(), cwd=session_dir,
                    stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
                append_jsonl(runtime / "processes.jsonl", {"event": "start", "timestamp": now(),
                    **item, "pid": active.pid, "command": command})
                started = time.monotonic()
                while active.poll() is None:
                    if time.monotonic() - started > 1200:
                        terminate_worker(active, runtime, run_id=run_id, session_index=index)
                        raise RuntimeError("Session timeout; no replay")
                    # Controller remains responsive and lets the worker archive
                    # an in-flight outcome after global STOP. No future worker starts.
                    time.sleep(0.5)
                code = active.returncode
                append_jsonl(runtime / "processes.jsonl", {"event": "exit", "timestamp": now(),
                    **item, "pid": active.pid, "exit_code": code})
                active = None
            if code != 0:
                raise RuntimeError(f"Worker exit {code}; campaign stopped")
            saved = read_json(session_dir / "session.json")
            if (saved.get("status") != "completed" or saved.get("inference_mode") != "live_openrouter"
                    or saved.get("run_id") != run_id or saved.get("session_index") != index
                    or saved.get("arm") != item["arm"]
                    or saved.get("execution_manifest_sha256") != launch["execution_manifest_sha256"]):
                raise RuntimeError("Worker did not persist the scheduled completed live session")
            write_json(runtime / "progress.json", summarize(runtime))
            print(f"SESSION_DONE {item['execution_order']}/330 run={run_id} session={index}", flush=True)
        verify()
        write_json(runtime / "progress.json", summarize(runtime))
    except BaseException as exc:
        # Each cleanup action must run even if an earlier filesystem operation
        # failed. Keep the triggering controller/worker error as the primary one.
        try:
            stop_campaign(runtime, "controller_failure", error_type=type(exc).__name__)
        except BaseException as stop_error:
            exc.add_note(f"Additionally failed to persist global STOP: {type(stop_error).__name__}")
        finally:
            try:
                if active is not None:
                    terminate_worker(active, runtime)
            except BaseException as termination_error:
                exc.add_note(f"Additional worker cleanup failure: {type(termination_error).__name__}")
                for note in getattr(termination_error, "__notes__", ()):
                    exc.add_note(note)
            finally:
                try:
                    write_json(runtime / "progress.json", summarize(runtime))
                except BaseException as progress_error:
                    exc.add_note(f"Additionally failed to persist progress: {type(progress_error).__name__}")
        raise
    return summarize(runtime)


def live_worker(order, launch_id):
    verify(worker=True)
    runtime = HERE / "runtime"
    launch = read_json(runtime / "launch.json")
    active = read_json(runtime / "active-execution.json")
    if launch["launch_id"] != launch_id or active["launch_id"] != launch_id or active["execution_order"] != order:
        raise RuntimeError("Worker is not the controller's current scheduled execution")
    expected = read_json(HERE / "generation/schedule.json")["session_executions"][order - 1]
    if any(active[k] != v for k, v in expected.items()):
        raise RuntimeError("Active execution differs from frozen schedule")
    return asyncio.run(execute_session(load_run(active["run_id"]), active["session_index"], runtime))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("verify", "status", "live", "_worker"))
    parser.add_argument("--execution-order", type=int)
    parser.add_argument("--launch-id")
    args = parser.parse_args()
    if args.command == "verify":
        result = verify()
    elif args.command == "status":
        result = summarize(HERE / "runtime")
    elif args.command == "live":
        result = run_live()
    else:
        result = live_worker(args.execution_order, args.launch_id)
        result = {"status": result["status"], "run_id": result["run_id"], "session_index": result["session_index"]}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
