"""Read-only reconciliation of the 49-turn checkpoint before authorized retry.

Standard library only. Frozen verifiers are loaded with private aliases and
read-only import facades. The two archived provider errors remain intact;
temporary success-only views are used solely with the earlier success checker.
No provider, credential, subprocess, replay or filesystem mutation occurs.
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

RUN_ID = "juanita_delgado_001__r02__flat_full_history"
STRUCTURED_RUN = "juanita_delgado_001__r02__structured_common_profile"
MODEL = "google/gemini-2.5-pro"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"


class CheckpointAuditError(RuntimeError):
    """The retained evidence does not match the authorized checkpoint."""


def require(condition, message):
    if not condition:
        raise CheckpointAuditError(message)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_jsonl(path):
    text = Path(path).read_text(encoding="utf-8")
    require(not text or text.endswith("\n"), f"Uncommitted JSONL tail: {Path(path).name}")
    rows = [json.loads(line) for line in text.splitlines() if line.strip()]
    require(all(isinstance(row, dict) for row in rows), "JSONL rows must be objects")
    return rows


def snapshot(root):
    result = {}
    for path in sorted(Path(root).rglob("*")):
        require(not path.is_symlink(), "Archive/runtime symlinks are not accepted")
        if path.is_file():
            result[path.relative_to(root).as_posix()] = sha256(path)
    return result


def _relative(root, name):
    part = Path(name)
    require(not part.is_absolute() and part.parts and ".." not in part.parts, "Unsafe archive path")
    result = root / part
    require(result.resolve().is_relative_to(root.resolve()), "Archive path escapes its root")
    return result


def _load_source(path, alias, imports=None):
    module = ModuleType(alias)
    module.__file__ = str(path)
    imports = imports or {}

    def local_import(name, globals=None, locals=None, fromlist=(), level=0):
        if level == 0 and name in imports:
            return imports[name]
        return builtins.__import__(name, globals, locals, fromlist, level)

    module.__dict__["__builtins__"] = {**vars(builtins), "__import__": local_import}
    old_path = sys.path[:]
    try:
        exec(compile(path.read_bytes(), str(path), "exec"), module.__dict__)
    finally:
        sys.path[:] = old_path
    return module


def _verify_original(original):
    source = original / "prepare_execution.py"
    require(sha256(source) == read_json(original / "manifest.json")["files"].get("prepare_execution.py"),
            "Frozen original verifier changed")
    result = _load_source(source, "_checkpoint_original_verifier").verify()
    require(result.get("status") == "verified", "Frozen original verification failed")
    return result


def _verify_chain(original):
    previous = original / "continuations/resume-03"
    manifest = read_json(previous / "manifest.json")
    require(manifest.get("original_execution_manifest_sha256") == sha256(original / "manifest.json"),
            "Previous continuation belongs to a foreign original execution")
    required = {"continue_run.py", "partial_audit.py", "resume_session.py", "partial-audit.json", "snapshot-manifest.json"}
    require(required <= manifest["files"].keys(), "Previous manifest omits recovery/checkpoint verification")
    for name, expected in manifest["files"].items():
        require(sha256(_relative(previous, name)) == expected, f"Previous frozen continuation changed: {name}")
    partial = _load_source(previous / "partial_audit.py", "_checkpoint_previous_partial_audit")
    partial._verify_original = _verify_original
    _, prefix, _ = partial._verify_predecessor(original)
    facade = SimpleNamespace(verify=lambda: _verify_original(original), read_json=read_json, digest=sha256)
    controller = _load_source(previous / "continue_run.py", "_checkpoint_previous_continue_run",
        {"paired_runner": facade, "partial_audit": partial, "resume_session": SimpleNamespace(RUN_ID=STRUCTURED_RUN)})
    controller.verify()
    controller.verify_preserved_prefix()
    frozen = read_json(previous / "partial-audit.json")
    inventory = read_json(previous / "snapshot-manifest.json")["files"]
    require(snapshot(previous / "snapshot") == inventory == frozen["runtime_file_sha256"],
            "Previous snapshot differs from its frozen 44-turn audit")
    require(all(frozen.get(k) == v for k, v in {"status": "passed", "completed_sessions": 8,
            "accepted_turns": 44, "next_execution_order": 9, "requests": 86, "responses": 85, "provider_errors": 1}.items()),
            "Previous audit does not attest the authorized 44-turn checkpoint")
    require(all(manifest.get(k) == v for k, v in {"completed_sessions_preserved": 8,
            "accepted_turns_preserved": 44, "next_execution_order": 9, "requests_preserved": 86,
            "responses_preserved": 85, "native_inference_code_changed": False}.items()), "Previous manifest checkpoint mismatch")
    worker = _load_source(previous / "resume_session.py", "_checkpoint_previous_resume_session",
                         {"paired_runner": facade, "runtime_adapter": SimpleNamespace(current_stage=None)})
    return previous, partial, prefix, worker, frozen


def _audit_success_view(prefix, session_dir, receipt, item, identities, events, wire):
    """Read-only in-memory view; archived errors are separately reconciled."""
    original_reader = prefix.read_jsonl

    def reader(path):
        if Path(path) == session_dir / "generation-events.jsonl":
            return events
        if Path(path) == session_dir / "openrouter-api-records.jsonl":
            return wire
        return original_reader(path)

    prefix.read_jsonl = reader
    try:
        return prefix._audit_calls(session_dir, receipt, item, identities)
    finally:
        prefix.read_jsonl = original_reader


def _audit_terminal_error(partial, prefix, request, error, fatal, sent, received, item, identities):
    require(request.get("event") == sent.get("event") == "request" and request.get("stage") == "generate_response"
            and request.get("arm") == item["arm"] and request.get("turn_id") == "s01t05"
            and request.get("session_index") == 1 and request.get("attempt") == 1,
            "Terminal request has foreign/repeated identity or chronology")
    config = {"temperature": .7, "max_output_tokens": 4096, "top_p": .95, "top_k": 40,
              "stop_sequences": ["\nTherapist:", "Therapist:"], "thinking_config": {"thinking_budget": 1024}}
    require(request.get("generation_config") == config and request.get("graph_requested_config") ==
            {"temperature": None, "max_tokens": None, "thinking_budget": None}, "Terminal decoding/model budget differs")
    partial._measure(request)
    expected = {"model": MODEL, "messages": [{"role": "user", "content": request["prompt"]}],
                "provider": {"require_parameters": True, "allow_fallbacks": False}, "temperature": .7,
                "max_tokens": 4096, "top_p": .95, "stop": config["stop_sequences"], "reasoning": {"max_tokens": 1024}}
    require(sent.get("request") == received.get("request") == expected, "Terminal wire body/config differs from request")
    for row in (sent, received):
        require(row.get("endpoint") == ENDPOINT and row.get("safety_settings_forwarded") is False
                and row.get("omitted_legacy_generation_parameters") == ["top_k"], "Foreign terminal transport provenance")
    raw = received.get("response", {})
    require(received.get("event") == "error" and received.get("http_status") == 200
            and received.get("error", {}).get("type") == "OpenRouterInBandError" and raw.get("model") == MODEL,
            "Terminal wire outcome is not the archived in-band error")
    choices = raw.get("choices")
    require(isinstance(choices, list) and len(choices) == 1 and choices[0].get("finish_reason") == "error"
            and choices[0].get("error", {}).get("code") == 504
            and not prefix._visible_content(choices[0].get("message", {}).get("content")).strip(),
            "Terminal completion is ambiguous or is not an empty explicit 504")
    fields = {"kind": "provider_error", "stage": "generate_response", "error_type": "OpenRouterInBandError",
              "http_status": 200, "native_record_id": sent.get("record_id"), "upstream_code": 504}
    require(error.get("event") == "error" and fatal.get("event") == "fatal"
            and all(error.get(k) == fatal.get(k) == v for k, v in fields.items())
            and error.get("logical_id") == request.get("logical_id") and error.get("attempt") == 1
            and error.get("accepted") is not True and not error.get("text")
            and received.get("record_id") == sent.get("record_id"), "Terminal error/fatal identity differs")
    for key, identity in (("logical_attempts", (request.get("logical_id"), 1)), ("gate_ids", request.get("gate_request_id")),
                          ("archive_ids", sent.get("record_id")), ("response_ids", raw.get("id"))):
        value = identity[0] if isinstance(identity, tuple) else identity
        require(isinstance(value, str) and value and identity not in identities[key], "Missing/reused terminal request identity")
        identities[key].add(identity)
    return {"record_id": sent["record_id"], "response_id": raw["id"], "http_status": 200, "upstream_code": 504,
            "stage": "generate_response", "error_type": "OpenRouterInBandError", "visible_content_present": False}


def _receipt(original, item, manifest_hash, count, completed):
    run_dir = original / "runtime" / item["run_id"]
    config = read_json(original / "generation/runs" / f"{item['run_id']}.json")
    saved = read_json(run_dir / "sessions/session_01/session.json")
    expected = {"status": "completed" if completed else "stopped", "run_id": item["run_id"], "arm": item["arm"],
                "profile_id": config["profile_id"], "patient_id": config["native_api_id"],
                "archived_patient_id": config["archived_patient_id"], "therapist_id": f"comparison_{item['run_id']}",
                "session_index": 1, "session_id": "comparison_s01", "execution_manifest_sha256": manifest_hash,
                "inference_mode": "live_openrouter", "requested_model": MODEL, "provider_seed": None,
                "case_sha256": config["case_sha256"], "prior_finalized_sessions": 0}
    require(config["run_id"] == item["run_id"] and config["arm"] == item["arm"] and item["session_index"] == 1
            and all(saved.get(k) == v for k, v in expected.items()) and saved.get("finished_at")
            and saved.get("process_instance_id") and not saved.get("cleanup_errors"), "Foreign/incomplete session receipt or config")
    turns = read_jsonl(run_dir / "accepted-turns.jsonl")
    require(len(turns) == count and saved.get("turns") == turns, "Accepted ledger differs from scheduled receipt")
    scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][0]
    require(scenario["session_index"] == 1 and len(scenario["turns"]) == 5, "Frozen scenario chronology differs")
    for position, (turn, planned) in enumerate(zip(turns, scenario["turns"]), 1):
        require(turn.get("run_id") == item["run_id"] and turn.get("status") == "accepted" and turn.get("session_index") == 1
                and turn.get("turn_index") == position and turn.get("turn_id") == planned["turn_id"] == item["turn_ids"][position - 1]
                and turn.get("therapist_text") == turn.get("safe_user_input") == planned["text"]
                and isinstance(turn.get("patient_text"), str) and turn["patient_text"].strip()
                and turn.get("application_guard_failure") is False and turn.get("safety_flags") == [],
                "Accepted text, identity, safety or chronology differs from frozen scenario")
        if item["arm"] == "flat_full_history":
            require(turn.get("history_turns_in_prompt") == position - 1, "Flat history count is truncated or foreign")
    case = original / "generation" / config["case_path"]
    require(sha256(case) == config["case_sha256"]
            and sha256(original / config["profile_path"]) == config["source_yaml_sha256"], "Frozen clinical case/profile changed")
    if completed:
        require(not saved.get("error") and saved.get("accepted_ledger_sha256") == sha256(run_dir / "accepted-turns.jsonl"),
                "Completed receipt has an error or changed latest ledger")
        for name, expected_hash in saved["state_files_at_close"].items():
            require(sha256(_relative(run_dir, name)) == expected_hash, "Latest closed native state hash differs")
    else:
        require("finalization" not in saved and "state_files_at_close" not in saved,
                "Partial flat session contains an uncommitted finalization")
    return saved, config, turns, scenario["turns"], case.read_text(encoding="utf-8")


def _recovery_evidence(previous, worker, frozen, session_dir, receipt, events):
    prior_path = previous / "snapshot" / STRUCTURED_RUN / "sessions/session_01/session.json"
    old_receipt = read_json(prior_path)
    recovery = receipt.get("recovery", {})
    require(recovery == {"continuation": "resume-03", "preserved_turns": 4, "classifier_reused": True,
            "affect_update_recomputed": True, "original_stopped_receipt_sha256": sha256(prior_path),
            "original_error": old_receipt["error"], "original_finished_at": old_receipt["finished_at"]},
            "Recovered ninth receipt lost or changed its historical error/deviation")
    proof = read_jsonl(session_dir / "recovery-resume03.jsonl")
    require(len(proof) == 2 and proof[0].get("event") == "reuse_successful_classifier"
            and proof[0].get("native_record_id") == frozen["saved_classifier_outcome"]["native_record_id"]
            and proof[0].get("logical_id") == frozen["saved_classifier_request"]["logical_id"]
            and proof[0].get("prompt_sha256") == worker.sha_text(frozen["saved_classifier_request"]["prompt"])
            and proof[0].get("external_call") is False, "Cached classifier provenance differs")
    comparison = worker.compare_prompt(frozen["failed_request"]["prompt"], events[21]["prompt"])
    require(proof[1].get("event") == "resumed_prompt_verified" and proof[1].get("mode") == "live"
            and all(proof[1].get(k) == v for k, v in comparison.items()), "Recovered prompt verification differs from archived prompts")
    require((previous / "resolved-stop.json").read_bytes() == (previous / "snapshot/STOP").read_bytes(),
            "First historical STOP was not retained")
    resolution = read_json(previous / "resolution.json")
    require(resolution.get("authorization") == "Procedi" and resolution.get("previous_gate") == frozen["gate"]
            and resolution.get("terminal_failure") == frozen["archived_error"], "Foreign historical error resolution")


def _audit_checkpoint(original):
    runtime = original / "runtime"
    before = snapshot(runtime)
    previous, partial, prefix, worker, frozen = _verify_chain(original)
    manifest_hash = sha256(original / "manifest.json")
    launch = read_json(runtime / "launch.json")
    require(launch.get("execution_manifest_sha256") == manifest_hash and launch.get("mode") == "live_openrouter", "Foreign original launch")
    schedule = read_json(original / "generation/schedule.json")["session_executions"]
    require(len(schedule) == 330 and [r["execution_order"] for r in schedule] == list(range(1, 331))
            and schedule[8]["run_id"] == STRUCTURED_RUN and schedule[9]["run_id"] == RUN_ID,
            "Authorized checkpoint does not match frozen schedule")
    identities = {key: set() for key in ("logical_attempts", "gate_ids", "archive_ids", "response_ids", "process_ids")}
    requests = responses = 0
    receipts = []
    historical_errors = []
    allowed_files = set(frozen["runtime_file_sha256"])
    for item in schedule[:9]:
        receipt, config, turns, _, _ = _receipt(original, item, manifest_hash, 5, True)
        require(receipt["process_instance_id"] not in identities["process_ids"], "Reused session process identity")
        identities["process_ids"].add(receipt["process_instance_id"])
        run_dir = runtime / item["run_id"]
        session_dir = run_dir / "sessions/session_01"
        events = read_jsonl(session_dir / "generation-events.jsonl")
        wire = read_jsonl(session_dir / "openrouter-api-records.jsonl")
        if item["execution_order"] == 9:
            require(len(events) == 31 and len(wire) == 30, "Recovered session has additional/missing requests")
            historical = _audit_terminal_error(partial, prefix, *events[18:21], *wire[18:20], item, identities)
            historical_errors.append(historical)
            _recovery_evidence(previous, worker, frozen, session_dir, receipt, events)
            count, _ = _audit_success_view(prefix, session_dir, receipt, item, identities,
                                           events[:18] + events[21:], wire[:18] + wire[20:])
            require(count == 14 and [r["stage"] for r in events[21::2]] == ["generate_response", "_summarize_episode",
                    "_generate_session_reflection", "_generate_long_term_summary_from_reflection", "_generate_factual_memory"],
                    "Recovered session contains an unexpected extra/repeated stage")
            requests += 1
            allowed_files.update(f"{STRUCTURED_RUN}/sessions/session_01/{name}" for name in
                                 ("recovery-resume03.jsonl", "worker-resume03.log"))
        else:
            count, _ = prefix._audit_calls(session_dir, receipt, item, identities)
        requests += count
        responses += count
        prefix._audit_native(run_dir, config, [receipt], turns)
        receipts.append(receipt)
    item = schedule[9]
    receipt, config, turns, scenario, case = _receipt(original, item, manifest_hash, 4, False)
    require(receipt["process_instance_id"] not in identities["process_ids"], "Partial worker process identity reused")
    session_dir = runtime / RUN_ID / "sessions/session_01"
    events = read_jsonl(session_dir / "generation-events.jsonl")
    wire = read_jsonl(session_dir / "openrouter-api-records.jsonl")
    require(len(events) == 11 and len(wire) == 10, "Flat partial session must contain exactly five requests and one error")
    count, _ = _audit_success_view(prefix, session_dir, receipt, {**item, "turn_ids": item["turn_ids"][:4]}, identities,
                                   events[:8], wire[:8])
    require(count == 4, "Flat partial session does not have four successful patient replies")
    archived = _audit_terminal_error(partial, prefix, *events[8:11], *wire[8:10], item, identities)
    historical_errors.append(archived)
    contract = _load_source(original / "prompt_contract.py", "_checkpoint_frozen_prompt_contract")
    for number, request in enumerate(events[:9:2]):
        expected_prompt = contract.render_prompt(case_block=case, latest_question=scenario[number]["text"],
            arm_context=contract.render_flat_history(turns[:number], run_id=RUN_ID, expected_prior_turns=number))
        require(request.get("prompt") == expected_prompt, "Flat request does not contain the exact complete own history/case")
        require(request.get("generation_config") == events[8]["generation_config"], "Flat request decoding settings changed")
    requests += 5
    responses += 4
    require((requests, responses, len(historical_errors)) == (96, 94, 2), "Campaign request/response/error totals differ")
    failed, error, fatal = events[-3:]
    stop = read_json(runtime / "STOP")
    require(stop == fatal and receipt.get("error", {}).get("type") == "IntegrationAbort"
            and receipt["error"].get("details") == {k: v for k, v in fatal.items() if k not in {"event", "timestamp"}},
            "Current STOP/receipt error differs from final request")
    gate = read_json(runtime / "request-gate.json")
    flight = gate.get("in_flight")
    require(isinstance(flight, dict) and flight.get("gate_request_id") == failed["gate_request_id"]
            and flight.get("pid") == receipt["pid"] and flight.get("started_at") == gate.get("last_started")
            and type(gate.get("last_started")) in (int, float) and math.isfinite(gate["last_started"])
            and gate["last_started"] > 0, "Current gate is foreign or not tied to terminal request")
    require(read_json(runtime / "active-execution.json") == {**item, "launch_id": launch["launch_id"]}, "Foreign/later active execution")
    progress = read_json(runtime / "progress.json")
    require(all(progress.get(k) == v for k, v in {"status": "stopped", "completed_sessions": 9, "accepted_turns": 49,
            "requests": 96, "responses": 94, "provider_errors": 2, "stop": stop}.items()), "Progress differs from reconciled evidence")
    _audit_processes(original, previous, schedule, receipts[-1], receipt, launch)
    allowed_files.add(f"{RUN_ID}/accepted-turns.jsonl")
    allowed_files.update(f"{RUN_ID}/sessions/session_01/{name}" for name in
                         ("session.json", "generation-events.jsonl", "openrouter-api-records.jsonl", "worker.log"))
    require(set(before) <= allowed_files, "Unknown or later runtime artifacts exist")
    allowed_dirs = {p.relative_to(previous / "snapshot").as_posix() for p in (previous / "snapshot").rglob("*") if p.is_dir()}
    allowed_dirs.update(parent.as_posix() for name in allowed_files for parent in Path(name).parents)
    for planned in schedule[:10]:
        base = f"{planned['run_id']}/sessions/session_01/tests"
        allowed_dirs.update({f"{planned['run_id']}/memory", base, base + "/runs"})
    require(all(p.relative_to(runtime).as_posix() in allowed_dirs for p in runtime.rglob("*") if p.is_dir()), "Unknown/later runtime directories exist")
    require(snapshot(runtime) == before, "Runtime changed during checkpoint audit")
    archived.update(wire_path=(session_dir / "openrouter-api-records.jsonl").relative_to(runtime).as_posix(),
                    wire_sha256=sha256(session_dir / "openrouter-api-records.jsonl"))
    return {"status": "passed", "audited_at": datetime.now(timezone.utc).isoformat(),
            "runtime_file_sha256": before, "runtime_hash_paths_relative_to": "runtime/",
            "completed_sessions": 9, "accepted_turns": 49, "requests": 96, "responses": 94, "provider_errors": 2,
            "next_execution_order": 10, "run_id": RUN_ID, "session_index": 1, "session_id": "comparison_s01",
            "patient_id": config["native_api_id"], "therapist_id": receipt["therapist_id"],
            "partial_accepted_turns": 4, "partial_requests": 5, "partial_responses": 4, "next_turn_id": "s01t05",
            "failed_request": failed, "archived_error": archived, "historical_errors": historical_errors,
            "stop": stop, "gate": gate, "execution_manifest_sha256": manifest_hash,
            "previous_manifest_sha256": sha256(previous / "manifest.json"), "live_requests_by_audit": 0,
            "limitations": ["Artifact consistency does not establish semantic accuracy.",
                "The two explicit historical provider errors remain archived; this audit does not clear the gate or retry requests."]}


def _audit_processes(original, previous, schedule, completed, partial, launch):
    old = (previous / "snapshot/processes.jsonl").read_bytes()
    current = (original / "runtime/processes.jsonl").read_bytes()
    require(current.startswith(old), "Historical process journal was rewritten")
    rows = [json.loads(line) for line in current[len(old):].splitlines() if line.strip()]
    require(len(rows) == 5 and [r.get("event") for r in rows] == ["continuation_authorized", "start", "exit", "start", "exit"],
            "Additional/missing/later worker execution appears after the checkpoint")
    started = read_json(previous / "started.json")
    require(started.get("manifest_sha256") == sha256(previous / "manifest.json")
            and rows[0].get("controller_pid") == started.get("pid") and rows[0].get("continuation") == "resume-03"
            and rows[0].get("next_execution_order") == 9, "Foreign continuation authorization")
    for item, receipt, begin, end, code in ((schedule[8], completed, rows[1], rows[2], 0),
                                          (schedule[9], partial, rows[3], rows[4], 1)):
        for row in (begin, end):
            require(all(row.get(k) == v for k, v in item.items()) and row.get("pid") == receipt["pid"]
                    and row.get("continuation") == "resume-03", "Worker process identity differs from receipt")
        command = [str(previous / "resume_session.py"), "run"] if code == 0 else [str(original / "paired_runner.py"),
            "_worker", "--execution-order", "10", "--launch-id", launch["launch_id"]]
        require(begin.get("command", [])[1:] == command and end.get("exit_code") == code, "Worker command or terminal exit differs")


def audit_checkpoint(original: Path) -> dict:
    try:
        return _audit_checkpoint(Path(original).resolve())
    except CheckpointAuditError:
        raise
    except Exception as exc:
        raise CheckpointAuditError(f"Checkpoint verification failed: {type(exc).__name__}: {exc}") from exc


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("original", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit_checkpoint(args.original), ensure_ascii=False, indent=2))
