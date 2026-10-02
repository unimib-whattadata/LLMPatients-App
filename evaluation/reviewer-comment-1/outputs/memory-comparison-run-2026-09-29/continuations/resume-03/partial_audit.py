"""Read-only, stdlib reconciliation of the authorized 504 checkpoint.

No provider, graph, credential, process launch, replay, or archive mutation.
The earlier controller is loaded under a private alias with a read-only verifier
facade: only its frozen integrity and preserved-prefix functions are invoked.
"""
from __future__ import annotations

import argparse
import builtins
import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType, SimpleNamespace

RUN_ID = "juanita_delgado_001__r02__structured_common_profile"
MODEL = "google/gemini-2.5-pro"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"


class PartialAuditError(RuntimeError):
    """The archived partial session does not match the authorized checkpoint."""


def require(condition, message):
    if not condition:
        raise PartialAuditError(message)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise PartialAuditError(f"Missing or invalid JSON: {Path(path).name}") from exc


def read_jsonl(path):
    try:
        text = Path(path).read_text(encoding="utf-8")
        require(not text or text.endswith("\n"), f"Uncommitted JSONL tail: {Path(path).name}")
        records = [json.loads(line) for line in text.splitlines() if line.strip()]
        require(all(isinstance(row, dict) for row in records), "JSONL rows must be objects")
        return records
    except (OSError, ValueError) as exc:
        raise PartialAuditError(f"Missing or invalid JSONL: {Path(path).name}") from exc


def snapshot(root):
    files = {}
    for path in sorted(Path(root).rglob("*")):
        require(not path.is_symlink(), "Runtime/archive symlink is not auditable")
        if path.is_file():
            files[path.relative_to(root).as_posix()] = sha256(path)
    return files


def _relative(root, relative):
    name = Path(relative)
    require(not name.is_absolute() and name.parts and ".." not in name.parts, "Unsafe archived path")
    path = root / name
    require(path.resolve().is_relative_to(root.resolve()), "Archived path escapes its root")
    return path


def _load_source(path, alias, imports=None):
    """Load checked stdlib source without bytecode or global import aliases."""
    module = ModuleType(alias)
    module.__file__ = str(path)
    imports = imports or {}

    def local_import(name, globals=None, locals=None, fromlist=(), level=0):
        if level == 0 and name in imports:
            return imports[name]
        return builtins.__import__(name, globals, locals, fromlist, level)

    module.__dict__["__builtins__"] = {**vars(builtins), "__import__": local_import}
    prior_path = sys.path[:]
    try:
        exec(compile(path.read_bytes(), str(path), "exec"), module.__dict__)
    finally:
        sys.path[:] = prior_path
    return module


def _verify_original(original):
    manifest = read_json(original / "manifest.json")
    source = original / "prepare_execution.py"
    require(sha256(source) == manifest["files"].get("prepare_execution.py"), "Frozen original verifier changed")
    result = _load_source(source, "_partial_original_verifier").verify()
    require(result.get("status") == "verified", "Frozen original verification failed")
    return result


def _verify_predecessor(original):
    previous = original / "continuations/resume-02"
    manifest = read_json(previous / "manifest.json")
    require(manifest.get("original_execution_manifest_sha256") == sha256(original / "manifest.json"),
            "Previous continuation belongs to a different frozen execution")
    for name, expected in manifest["files"].items():
        require(sha256(_relative(previous, name)) == expected, f"Previous frozen continuation changed: {name}")
    require({"continue_run.py", "prefix_audit.py", "prefix-audit.json", "snapshot-manifest.json"}
            <= manifest["files"].keys(), "Previous manifest omits checkpoint-verification materials")
    prefix = _load_source(previous / "prefix_audit.py", "_partial_previous_prefix_audit")
    facade = SimpleNamespace(verify=lambda: _verify_original(original), read_json=read_json, digest=sha256)
    controller = _load_source(previous / "continue_run.py", "_partial_previous_continue_run",
                              {"paired_runner": facade, "prefix_audit": prefix})
    controller.verify()
    controller.verify_preserved_prefix()
    frozen = read_json(previous / "prefix-audit.json")
    inventory = read_json(previous / "snapshot-manifest.json")["files"]
    require(snapshot(previous / "snapshot") == inventory == frozen["runtime_file_sha256"],
            "Previous snapshot inventory differs from its frozen prefix audit")
    require(frozen.get("status") == "passed" and frozen.get("completed_sessions") == 8
            and frozen.get("accepted_turns") == 40 and frozen.get("next_execution_order") == 9
            and frozen.get("requests") == frozen.get("responses") == 76,
            "Previous checkpoint is not the authorized forty-turn prefix")
    require(manifest.get("completed_sessions_preserved") == 8 and manifest.get("accepted_turns_preserved") == 40
            and manifest.get("next_execution_order") == 9 and manifest.get("requests_preserved") == 76
            and manifest.get("responses_preserved") == 76 and manifest.get("inference_code_changed") is False,
            "Previous continuation declaration differs from its checkpoint")
    # This partial session is a new run. Nothing in an earlier run may grow.
    mutable = {"active-execution.json", "progress.json", "request-gate.json", "request-gate.lock", "processes.jsonl"}
    for relative, expected in inventory.items():
        if relative not in mutable:
            require(sha256(original / "runtime" / relative) == expected,
                    f"Previously completed forty-turn evidence changed: {relative}")
    return previous, prefix, frozen


def _measure(request, outcome=None):
    prompt = request.get("prompt")
    require(isinstance(prompt, str) and prompt.strip(), "Missing archived generation prompt")
    size = len(prompt.encode("utf-8"))
    estimate = max(1, (size + 2) // 3)
    for row in (request,) if outcome is None else (request, outcome):
        require(row.get("prompt_utf8_bytes") == size and row.get("estimated_prompt_tokens") == estimate
                and row.get("estimated_prompt_token_limit") == 64000 and estimate <= 64000
                and row.get("prompt_token_estimate_method") == "utf8_bytes_div3_ceiling",
                "Prompt size, estimate or budget differs from the frozen contract")


def _audit_calls(original, session_dir, item, turns, prefix, previous, case, scenario):
    events = read_jsonl(session_dir / "generation-events.jsonl")
    wire = read_jsonl(session_dir / "openrouter-api-records.jsonl")
    require(len(events) == 21 and len(wire) == 20, "Expected precisely ten requests, nine successes and one fatal error")
    require(events[-1].get("event") == "fatal", "Missing terminal fatal event")
    seen = {key: set() for key in ("logical", "gate", "native", "response")}
    for path in (previous / "snapshot").rglob("generation-events.jsonl"):
        for row in read_jsonl(path):
            if row.get("event") == "request":
                seen["logical"].add(row["logical_id"])
                seen["gate"].add(row["gate_request_id"])
            elif row.get("event") == "outcome":
                seen["native"].add(row["native_record_id"])
                seen["response"].add(row["response_id"])
    error_fields = {"kind": "provider_error", "stage": "generate_response", "error_type": "OpenRouterInBandError",
                    "http_status": 200, "upstream_code": 504}
    for number in range(10):
        request, outcome = events[number * 2:number * 2 + 2]
        sent, received = wire[number * 2:number * 2 + 2]
        stage = "classify_topic_and_emotion" if number % 2 == 0 else "generate_response"
        turn_id = f"s01t{number // 2 + 1:02d}"
        require(request.get("event") == sent.get("event") == "request"
                and request.get("stage") == stage and request.get("turn_id") == turn_id
                and request.get("arm") == item["arm"] and request.get("session_index") == 1
                and request.get("attempt") == 1, "Foreign, repeated or reordered generation request")
        for key, value in (("logical", request.get("logical_id")), ("gate", request.get("gate_request_id")),
                           ("native", sent.get("record_id"))):
            require(isinstance(value, str) and value and value not in seen[key], "Duplicate or missing request identity")
            seen[key].add(value)
        require(outcome.get("logical_id") == request["logical_id"] and outcome.get("attempt") == 1
                and outcome.get("stage") == stage and outcome.get("native_record_id") == sent["record_id"]
                and received.get("record_id") == sent["record_id"], "Generation/wire identity mismatch")
        config = {"temperature": 0.0 if number % 2 == 0 else .7, "max_output_tokens": 4096,
                  "top_p": .95, "top_k": 40, "stop_sequences": ["\nTherapist:", "Therapist:"],
                  "thinking_config": {"thinking_budget": 1024}}
        require(request.get("generation_config") == config, "Frozen model temperature/decoding/budget changed")
        expected_requested = {"temperature": 0.0 if number % 2 == 0 else None,
                              "max_tokens": 4096 if number % 2 == 0 else None, "thinking_budget": None}
        require(request.get("graph_requested_config") == expected_requested, "Unexpected native generation override")
        expected_body = {"model": MODEL, "messages": [{"role": "user", "content": request["prompt"]}],
                         "provider": {"require_parameters": True, "allow_fallbacks": False},
                         "temperature": config["temperature"], "max_tokens": 4096, "top_p": .95,
                         "stop": config["stop_sequences"], "reasoning": {"max_tokens": 1024}}
        require(sent.get("request") == received.get("request") == expected_body, "Wire model/prompt/settings mismatch")
        for row in (sent, received):
            require(row.get("endpoint") == ENDPOINT and row.get("safety_settings_forwarded") is False
                    and row.get("omitted_legacy_generation_parameters") == ["top_k"], "Foreign native transport provenance")
        _measure(request, outcome if number < 9 else None)
        if stage == "generate_response":
            require(request["prompt"].count("<CASE>\n" + case + "</CASE>") == 1
                    and request["prompt"].count("<LATEST_THERAPIST_QUESTION>\n" + scenario[number // 2]["text"]
                                                + "\n</LATEST_THERAPIST_QUESTION>") == 1,
                    "Patient generation differs from the frozen clinical case or question")
        raw = received.get("response", {})
        require(received.get("http_status") == 200 and raw.get("model") == MODEL, "Unexpected HTTP status or response model")
        response_id = raw.get("id")
        require(isinstance(response_id, str) and response_id and response_id not in seen["response"],
                "Missing or reused native response identity")
        seen["response"].add(response_id)
        choices = raw.get("choices")
        require(isinstance(choices, list) and len(choices) == 1, "Ambiguous or missing native completion")
        choice = choices[0]
        visible = prefix._visible_content(choice.get("message", {}).get("content")).strip()
        if number < 9:
            require(outcome.get("event") == "outcome" and received.get("event") == "response"
                    and not raw.get("error") and not choice.get("error") and not received.get("error")
                    and choice.get("finish_reason") == "stop" and bool(visible)
                    and outcome.get("accepted") is True and outcome.get("max_tokens_recovery") is False
                    and outcome.get("finish_reasons") == ["STOP"] and outcome.get("text") == visible,
                    "Saved generation is not an unambiguous accepted success")
            require(outcome.get("turn_id") == turn_id and outcome.get("session_index") == 1
                    and outcome.get("raw_model") == MODEL and outcome.get("response_id") == response_id
                    and outcome.get("native_usage") == raw.get("usage", {})
                    and outcome.get("backend") == raw.get("provider")
                    and outcome.get("cost") == raw.get("usage", {}).get("cost")
                    and outcome.get("cost_details") == raw.get("usage", {}).get("cost_details"),
                    "Successful outcome identity/provenance mismatch")
            if stage == "generate_response":
                accepted = turns[number // 2]
                require((accepted["prompt"], accepted["patient_text"]) ==
                        (request["prompt"], prefix._patient_format(visible)), "Accepted turn differs from native response")
        else:
            require(outcome.get("event") == received.get("event") == "error"
                    and all(outcome.get(k) == v for k, v in error_fields.items())
                    and outcome.get("accepted") is not True and not outcome.get("text")
                    and choice.get("finish_reason") == "error" and choice.get("error", {}).get("code") == 504
                    and not visible and received.get("error", {}).get("type") == "OpenRouterInBandError",
                    "Last request is ambiguous or lacks an explicit empty 504 error")
            require(all(events[-1].get(k) == v for k, v in error_fields.items())
                    and events[-1].get("native_record_id") == sent["record_id"], "Fatal event differs from archived error")
    return events, wire


def _audit_native(run_dir, receipt, turns, config):
    therapist, patient, session_id = receipt["therapist_id"], config["native_api_id"], receipt["session_id"]
    native_path = run_dir / "runs" / f"{therapist}.json"
    memory_path = run_dir / "memory" / f"{therapist}__{patient}.jsonl"
    native = read_json(native_path)
    require(native.get("therapist_id") == therapist and len(native.get("sessions", [])) == 1,
            "Partial native ledger has foreign identity or additional sessions")
    session = native["sessions"][0]
    require(session.get("session_id") == session_id and session.get("patient_id") == patient
            and session.get("source") == "api" and session.get("mode") == "live"
            and not session.get("ended_at") and len(session.get("turns", [])) == 4,
            "Expected one open native session with four committed turns")
    state = session.get("final_state", {})
    require(state.get("therapist_id") == therapist and state.get("session_id") == session_id
            and state.get("total_turns") == 4 and state.get("last_episode_turn") == 0
            and len(state.get("history", [])) == 4 and len(state.get("messages", [])) == 8
            and state.get("memory_consolidation") == {} and state.get("summary") == ""
            and state.get("session_reflection") == "" and state.get("long_term_context") == []
            and state.get("episodic_context") == [], "Partial native snapshot contains an uncommitted/finalized turn")
    sources = read_jsonl(memory_path)
    require(len(sources) == 4 and len({row.get("id") for row in sources}) == 4,
            "Partial source archive must contain exactly four distinct raw turns")
    for position, (turn, saved, history, source) in enumerate(zip(turns, session["turns"], state["history"], sources), 1):
        require(saved.get("turn_index") == saved.get("total_turns") == saved.get("history_length") == position
                and saved.get("therapist_input_raw") == saved.get("therapist_input_safe") == turn["therapist_text"]
                and saved.get("patient_response") == turn["patient_text"] and saved.get("safety_flags") == [],
                "Native logger and accepted turn differ")
        require(history == {"therapist": turn["therapist_text"], "patient": turn["patient_text"], "topic": saved["detected_topic"]}
                and state["messages"][2 * position - 2:2 * position] ==
                [{"type": "human", "content": turn["therapist_text"]}, {"type": "ai", "content": turn["patient_text"]}],
                "Native history/messages differ from accepted conversation")
        require(source.get("type") == "conversation_turn" and source.get("patient_id") == patient
                and source.get("therapist_id") == therapist and source.get("session_id") == session_id
                and source.get("turn_index") == position and source.get("session_order") == 0
                and source.get("therapist_text") == turn["therapist_text"] and source.get("patient_text") == turn["patient_text"]
                and source.get("usable") is True and source.get("topic") == saved["detected_topic"],
                "Raw conversation source differs from accepted conversation")
    require(state.get("last_topic") == session["turns"][-1]["detected_topic"], "Last saved topic differs from turn four")
    return native_path, memory_path


def _audit_partial(original):
    runtime = original / "runtime"
    require(runtime.is_dir(), "Missing original runtime")
    before = snapshot(runtime)
    previous, prefix, frozen = _verify_predecessor(original)
    manifest_hash = sha256(original / "manifest.json")
    launch = read_json(runtime / "launch.json")
    require(launch.get("execution_manifest_sha256") == manifest_hash and launch.get("mode") == "live_openrouter",
            "Foreign original launch")
    schedule = read_json(original / "generation/schedule.json")["session_executions"]
    item = schedule[8]
    require(len(schedule) == 330 and item.get("execution_order") == 9 and item.get("session_index") == 1
            and item.get("run_id") == RUN_ID and item.get("arm") == "structured_common_profile"
            and item.get("turn_ids") == [f"s01t{i:02d}" for i in range(1, 6)], "Unauthorized scheduled partial session")
    run_dir = runtime / RUN_ID
    session_dir = run_dir / "sessions/session_01"
    receipt = read_json(session_dir / "session.json")
    config = read_json(original / "generation/runs" / f"{RUN_ID}.json")
    expected = {"status": "stopped", "run_id": RUN_ID, "arm": "structured_common_profile",
                "session_index": 1, "session_id": "comparison_s01", "patient_id": config["native_api_id"],
                "profile_id": config["profile_id"], "archived_patient_id": config["archived_patient_id"],
                "therapist_id": f"comparison_{RUN_ID}", "execution_manifest_sha256": manifest_hash,
                "inference_mode": "live_openrouter", "provider_seed": None, "requested_model": MODEL,
                "case_sha256": config["case_sha256"], "prior_finalized_sessions": 0}
    require(all(receipt.get(k) == v for k, v in expected.items()) and receipt.get("finished_at")
            and receipt.get("process_instance_id") and not receipt.get("cleanup_errors")
            and "finalization" not in receipt and "state_files_at_close" not in receipt,
            "Partial receipt is closed, foreign or does not attest the stopped session")
    turns = read_jsonl(run_dir / "accepted-turns.jsonl")
    require(len(turns) == 4 and receipt.get("turns") == turns, "Accepted ledger/receipt mismatch or fifth accepted turn")
    scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][0]["turns"]
    for position, (turn, planned) in enumerate(zip(turns, scenario), 1):
        require(turn.get("run_id") == RUN_ID and turn.get("status") == "accepted" and turn.get("session_index") == 1
                and turn.get("turn_index") == position and turn.get("turn_id") == planned["turn_id"]
                and turn.get("therapist_text") == turn.get("safe_user_input") == planned["text"]
                and isinstance(turn.get("patient_text"), str) and turn["patient_text"].strip()
                and turn.get("api_response", {}).get("message") == turn["patient_text"]
                and turn.get("application_guard_failure") is False and turn.get("safety_flags") == [],
                "Accepted turn differs from frozen scenario, identity, safety or native API")
    native_path, memory_path = _audit_native(run_dir, receipt, turns, config)
    case_path = original / "generation" / config["case_path"]
    require(sha256(case_path) == config["case_sha256"], "Frozen clinical case changed")
    events, wire = _audit_calls(original, session_dir, item, turns, prefix, previous,
                               case_path.read_text(encoding="utf-8"), scenario)
    failed, failure, fatal = events[-3:]
    stop = read_json(runtime / "STOP")
    require(stop == fatal and receipt.get("error", {}).get("type") == "IntegrationAbort"
            and receipt["error"].get("details") == {k: v for k, v in fatal.items() if k not in {"event", "timestamp"}},
            "STOP/receipt error differs from the archived final provider error")
    gate = read_json(runtime / "request-gate.json")
    flight = gate.get("in_flight")
    require(isinstance(flight, dict) and flight.get("gate_request_id") == failed["gate_request_id"]
            and flight.get("pid") == receipt["pid"] and flight.get("started_at") == gate.get("last_started")
            and type(gate.get("last_started")) in (int, float) and math.isfinite(gate["last_started"])
            and gate["last_started"] > 0, "Foreign or unresolved gate marker not tied to the failed request")
    require(read_json(runtime / "active-execution.json") == {**item, "launch_id": launch["launch_id"]},
            "Active execution points beyond/outside the stopped session")
    progress = read_json(runtime / "progress.json")
    require(all(progress.get(k) == v for k, v in {"status": "stopped", "completed_sessions": 8, "accepted_turns": 44,
            "requests": 86, "responses": 85, "provider_errors": 1, "stop": stop}.items()),
            "Campaign progress contradicts reconciled requests/accepted turns")
    old_processes = (previous / "snapshot/processes.jsonl").read_bytes()
    current_processes = (runtime / "processes.jsonl").read_bytes()
    require(current_processes.startswith(old_processes), "Old process journal was rewritten")
    appended = [json.loads(line) for line in current_processes[len(old_processes):].splitlines() if line.strip()]
    require(len(appended) == 3 and [r.get("event") for r in appended] == ["continuation_authorized", "start", "exit"],
            "Additional, missing or later worker execution in the process journal")
    authorized, start, exit_record = appended
    started = read_json(previous / "started.json")
    require(started.get("manifest_sha256") == sha256(previous / "manifest.json")
            and authorized.get("controller_pid") == started.get("pid")
            and authorized.get("next_execution_order") == 9 and authorized.get("continuation") == "resume-02",
            "Foreign continuation authorization marker")
    for row in (start, exit_record):
        require(all(row.get(k) == v for k, v in item.items()) and row.get("pid") == receipt["pid"]
                and row.get("continuation") == "resume-02", "Foreign process start/exit marker")
    require(start.get("command", [])[1:] == [str(original / "paired_runner.py"), "_worker", "--execution-order", "9",
            "--launch-id", launch["launch_id"]] and exit_record.get("exit_code") == 1,
            "Partial worker did not end with the archived failed execution")
    allowed_files = set(frozen["runtime_file_sha256"]) | {"STOP", f"{RUN_ID}/accepted-turns.jsonl",
        native_path.relative_to(runtime).as_posix(), memory_path.relative_to(runtime).as_posix()}
    allowed_files.update(f"{RUN_ID}/sessions/session_01/{name}" for name in
                         ("session.json", "generation-events.jsonl", "openrouter-api-records.jsonl", "worker.log"))
    require(set(before) <= allowed_files, "Unknown or later runtime artifact exists")
    allowed_dirs = {path.relative_to(previous / "snapshot").as_posix()
                    for path in (previous / "snapshot").rglob("*") if path.is_dir()}
    allowed_dirs.update(parent.as_posix() for name in allowed_files for parent in Path(name).parents)
    # Native construction makes these empty defaults; no payload is permitted.
    for old_item in schedule[:9]:
        base = f"{old_item['run_id']}/sessions/session_01/tests"
        allowed_dirs.update({f"{old_item['run_id']}/memory", base, base + "/runs"})
    require(all(path.relative_to(runtime).as_posix() in allowed_dirs for path in runtime.rglob("*") if path.is_dir()),
            "Unknown or later session directory exists")
    require(snapshot(runtime) == before, "Runtime changed during read-only partial audit")
    archived = wire[-1]
    return {"status": "passed", "audited_at": datetime.now(timezone.utc).isoformat(),
            "completed_sessions": 8, "accepted_turns": 44, "next_execution_order": 9,
            "run_id": RUN_ID, "session_index": 1, "session_id": receipt["session_id"],
            "patient_id": receipt["patient_id"], "therapist_id": receipt["therapist_id"],
            "partial_accepted_turns": 4, "next_turn_id": "s01t05", "native_source_turns": 4,
            "requests": 86, "responses": 85, "provider_errors": 1,
            "partial_requests": 10, "partial_responses": 9, "live_requests_by_audit": 0,
            "execution_manifest_sha256": manifest_hash, "previous_manifest_sha256": sha256(previous / "manifest.json"),
            "runtime_file_sha256": before, "runtime_hash_paths_relative_to": "runtime/",
            "saved_classifier_request": events[16], "saved_classifier_outcome": events[17],
            "failed_request": failed, "stop": stop, "gate": gate,
            "archived_error": {"record_id": archived["record_id"], "response_id": archived["response"]["id"],
                "http_status": archived["http_status"], "upstream_code": 504, "stage": failure["stage"],
                "error_type": failure["error_type"], "visible_content_present": False,
                "wire_path": (session_dir / "openrouter-api-records.jsonl").relative_to(runtime).as_posix(),
                "wire_sha256": sha256(session_dir / "openrouter-api-records.jsonl")},
            "limitations": ["Artifact reconciliation does not score semantic memory accuracy.",
                "Emotion RNG state was not persisted. Any authorized restart must record its recalculation and constrain prompt differences separately.",
                "This audit does not clear STOP or the gate, launch processes, or replay any request."]}


def audit_partial(original: Path) -> dict:
    try:
        return _audit_partial(Path(original).resolve())
    except PartialAuditError:
        raise
    except Exception as exc:
        raise PartialAuditError(f"Partial checkpoint verification failed: {type(exc).__name__}: {exc}") from exc


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("original", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit_partial(args.original), ensure_ascii=False, indent=2))
