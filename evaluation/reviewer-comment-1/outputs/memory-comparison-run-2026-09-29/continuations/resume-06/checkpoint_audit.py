"""Read-only delta audit after the frozen 390-turn checkpoint.

The prior manifest, complete snapshot and preserved prefix establish the old
evidence. Only the authorized recovery and subsequent 59 accepted turns are
new. No graph/provider imports, credential reads, process calls or writes.
"""
from __future__ import annotations

import argparse
import builtins
import hashlib
import json
import math
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType, SimpleNamespace

RUN_ID = "alex_carter_001__r03__structured_common_profile"
RECOVERED_RUN = "juanita_delgado_001__r01__structured_common_profile"
FINAL_ID = "5a4d3d7a-7304-44f0-a23e-810344ffe04c"
PREVIOUS_MANIFEST = "22aed2b605bc55bcbf76f548c571363ab03599a2ba4038da6bca8eabc2bc18b3"


class CheckpointAuditError(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise CheckpointAuditError(message)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_jsonl(path):
    raw = Path(path).read_bytes()
    require(not raw or raw.endswith(b"\n"), "Uncommitted JSONL tail")
    rows = [json.loads(line) for line in raw.splitlines()]
    require(all(isinstance(row, dict) for row in rows), "Invalid JSONL object")
    return rows


def snapshot(root):
    result = {}
    for path in sorted(Path(root).rglob("*")):
        require(not path.is_symlink(), "Runtime/archive symlink is not auditable")
        if path.is_file():
            result[path.relative_to(root).as_posix()] = sha256(path)
    return result


def _load(path, alias, imports=None):
    module = ModuleType(alias)
    module.__file__ = str(path)
    imports = imports or {}

    def local_import(name, globals=None, locals=None, fromlist=(), level=0):
        return imports[name] if level == 0 and name in imports else builtins.__import__(name, globals, locals, fromlist, level)

    module.__dict__["__builtins__"] = {**vars(builtins), "__import__": local_import}
    old = sys.path[:]
    try:
        exec(compile(path.read_bytes(), str(path), "exec"), module.__dict__)
    finally:
        sys.path[:] = old
    return module


def _verify_original(original):
    source = original / "prepare_execution.py"
    require(sha256(source) == read_json(original / "manifest.json")["files"]["prepare_execution.py"], "Frozen verifier changed")
    result = _load(source, "_rate_checkpoint_original_verifier").verify()
    require(result.get("status") == "verified", "Original verification did not pass")
    return result


def _verify_chain(original):
    _verify_original(original)
    original_hash = sha256(original / "manifest.json")
    for name, report in (("resume-02", "prefix-audit.json"), ("resume-03", "partial-audit.json"),
                         ("resume-04", "checkpoint-audit.json"), ("resume-05", "checkpoint-audit.json")):
        root = original / "continuations" / name
        manifest = read_json(root / "manifest.json")
        require(manifest.get("original_execution_manifest_sha256") == original_hash, "Foreign continuation lineage")
        require({"continue_run.py", "snapshot-manifest.json", report} <= manifest["files"].keys(), "Incomplete frozen predecessor")
        for relative, expected in manifest["files"].items():
            path = Path(relative)
            require(not path.is_absolute() and ".." not in path.parts and (root / path).resolve().is_relative_to(root.resolve()), "Unsafe frozen path")
            require(sha256(root / path) == expected, f"Frozen source/evidence changed: {name}/{relative}")
        files = read_json(root / "snapshot-manifest.json")["files"]
        require(snapshot(root / "snapshot") == files == read_json(root / report)["runtime_file_sha256"], "Frozen snapshot inventory changed")
    previous = original / "continuations/resume-05"
    require(sha256(previous / "manifest.json") == PREVIOUS_MANIFEST, "Wrong authorized predecessor manifest")
    frozen = read_json(previous / "checkpoint-audit.json")
    require(all(frozen.get(k) == v for k, v in {"status": "passed", "completed_sessions": 77, "accepted_turns": 390,
            "requests": 749, "responses": 741, "provider_errors": 8, "next_execution_order": 78}.items()), "Wrong 390-turn checkpoint")
    facade = SimpleNamespace(verify=lambda: _verify_original(original), read_json=read_json, digest=sha256)
    base = _load(previous / "checkpoint_audit.py", "_rate_checkpoint_frozen_audit05")
    controller = _load(previous / "continue_run.py", "_rate_checkpoint_frozen_controller05",
                      {"paired_runner": facade, "checkpoint_audit": base, "worker": SimpleNamespace(RUN_ID=RECOVERED_RUN, SESSION_INDEX=3)})
    controller.verify()
    controller.verify_preserved_prefix()
    require((previous / "resolved-stop.json").read_bytes() == (previous / "snapshot/STOP").read_bytes(), "Previous empty STOP was lost")
    resolution = read_json(previous / "resolution.json")
    require(resolution.get("previous_gate") == frozen["gate"] and resolution.get("terminal_failure") == frozen["archived_error"], "Previous resolution changed")
    prefix = _load(original / "continuations/resume-02/prefix_audit.py", "_rate_checkpoint_prefix_helpers")
    old_audit = _load(original / "continuations/resume-04/checkpoint_audit.py", "_rate_checkpoint_success_view")
    return previous, frozen, base, prefix, old_audit


def _identities(previous):
    ids = {key: set() for key in ("logical_attempts", "gate_ids", "archive_ids", "response_ids", "process_ids",
           "wire_ids", "wire_response_ids", "retry_groups", "all_gates", "all_logicals")}
    for path in (previous / "snapshot").glob("*/sessions/*/generation-events.jsonl"):
        for row in read_jsonl(path):
            if row["event"] == "request":
                ids["all_gates"].add(row["gate_request_id"])
                ids["all_logicals"].add(row["logical_id"])
    for path in (previous / "snapshot").glob("*/sessions/*/openrouter-api-records.jsonl"):
        for row in read_jsonl(path):
            if row["event"] == "request":
                ids["wire_ids"].add(row["record_id"])
            else:
                ids["wire_response_ids"].add(row["response"]["id"])
    for path in (previous / "snapshot").glob("*/sessions/*/timeout-retries.jsonl"):
        ids["retry_groups"].update(row["group_id"] for row in read_jsonl(path))
    return ids


def _receipt(original, item, manifest_hash, previous_hash):
    run_id, index, order = item["run_id"], item["session_index"], item["execution_order"]
    config = read_json(original / "generation/runs" / f"{run_id}.json")
    receipt = read_json(original / "runtime" / run_id / "sessions" / f"session_{index:02d}" / "session.json")
    expected = {"run_id": run_id, "arm": config["arm"], "session_index": index, "session_id": f"comparison_s{index:02d}",
                "profile_id": config["profile_id"], "patient_id": config["native_api_id"], "archived_patient_id": config["archived_patient_id"],
                "therapist_id": f"comparison_{run_id}", "case_sha256": config["case_sha256"],
                "execution_manifest_sha256": manifest_hash, "status": "stopped" if order == 90 else "completed",
                "inference_mode": "live_openrouter", "requested_model": "google/gemini-2.5-pro", "provider_seed": None,
                "prior_finalized_sessions": index - 1}
    require(config["run_id"] == run_id and config["arm"] == item["arm"] and all(receipt.get(k) == v for k, v in expected.items())
            and receipt.get("finished_at") and receipt.get("process_instance_id") and not receipt.get("cleanup_errors"), "Receipt identity/close differs")
    count = 4 if order == 90 else 5
    require(len(receipt.get("turns", [])) == count, "Wrong accepted turn count")
    scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][index - 1]
    for n, (turn, planned) in enumerate(zip(receipt["turns"], scenario["turns"]), 1):
        require(turn.get("run_id") == run_id and turn.get("status") == "accepted" and turn.get("session_index") == index
                and turn.get("turn_index") == 5 * (index - 1) + n and turn.get("turn_id") == planned["turn_id"] == item["turn_ids"][n - 1]
                and turn.get("therapist_text") == turn.get("safe_user_input") == planned["text"]
                and isinstance(turn.get("patient_text"), str) and turn["patient_text"].strip()
                and turn.get("application_guard_failure") is False and turn.get("safety_flags") == [], "Accepted conversation differs from scenario")
    if order >= 78:
        require(receipt.get("transport_amendment") == {"continuation": "resume-05", "policy": "bounded_timeout_retry_v1",
                "policy_source_continuation": "resume-04", "max_attempts": 3, "retry_delays_seconds": [30, 60],
                "continuation_manifest_sha256": previous_hash}, "Transport provenance changed")
    require(sha256(original / "generation" / config["case_path"]) == config["case_sha256"]
            and sha256(original / config["profile_path"]) == config["source_yaml_sha256"], "Clinical source changed")
    if order < 90:
        require(not receipt.get("error") and receipt.get("finalization"), "Completed receipt contains an error")
    else:
        require("finalization" not in receipt and "state_files_at_close" not in receipt, "Stopped session already finalized")
    return receipt, config


def _recovered_finalization(original, previous, frozen, receipt, item, base, prefix, old_audit, ids):
    relative = f"{RECOVERED_RUN}/sessions/session_03"
    directory = original / "runtime" / relative
    old_receipt_path = previous / "snapshot" / relative / "session.json"
    old = read_json(old_receipt_path)
    require(receipt.get("recovery") == {"continuation": "resume-05", "preserved_run_turns": 15,
            "preserved_session_turns": 5, "cached_narrative_generations": 2, "affect_update_recomputed": False,
            "original_stopped_receipt_sha256": sha256(old_receipt_path), "original_error": old["error"],
            "original_finished_at": old["finished_at"]}, "Finalization recovery provenance changed")
    events, wire = read_jsonl(directory / "generation-events.jsonl"), read_jsonl(directory / "openrouter-api-records.jsonl")
    require(len(events) == 31 and len(wire) == 30, "Finalization recovery made additional/missing requests")
    request, outcome = events[-2:]
    saved = frozen["failed_request"]
    require(request["event"] == "request" and outcome.get("accepted") is True and request["stage"] == "_generate_factual_memory"
            and all(request.get(k) == saved.get(k) for k in ("prompt", "generation_config", "graph_requested_config", "arm", "session_index", "turn_id")),
            "Recovered factual request differs from the failed call")
    proof = read_jsonl(directory / "recovery-resume05.jsonl")
    require(len(proof) == 3, "Wrong count of cached/factual recovery evidence")
    for row, cached in zip(proof[:2], frozen["cached_finalization_calls"]):
        r, o = cached["request"], cached["outcome"]
        require(row.get("event") == "reuse_successful_finalization" and row.get("stage") == r["stage"]
                and row.get("logical_id") == r["logical_id"] and row.get("native_record_id") == o["native_record_id"]
                and row.get("prompt_sha256") == base.digest_bytes(r["prompt"].encode())
                and row.get("response_sha256") == base.digest_bytes(o["text"].encode()) and row.get("external_call") is False,
                "Cached narrative provenance differs")
    last = proof[-1]
    require(last.get("event") == "resume_factual_generation" and last.get("mode") == "live"
            and last.get("prompt_identical_to_failed_request") is True and last.get("prompt_sha256") == base.digest_bytes(saved["prompt"].encode())
            and last.get("prior_logical_id") == saved["logical_id"] and last.get("prior_native_record_id") == frozen["failed_outcome"]["native_record_id"]
            and last.get("graph_requested_config") == saved["graph_requested_config"], "Factual recovery proof differs")
    local = {key: set() for key in ids}
    pairs = base._wire_pairs(directory / "openrouter-api-records.jsonl", local)
    groups, errors = base._retry_groups(directory / "timeout-retries.jsonl", {r["gate_request_id"]: r for r in events if r["event"] == "request"},
                                       {p["sent"]["record_id"]: p for p in pairs}, prefix, local)
    require(errors == 0 and len(groups) == 15 and groups[request["gate_request_id"]] == [outcome["native_record_id"]], "Unexpected recovery transport attempts")
    for key, value in (("wire_ids", outcome["native_record_id"]), ("wire_response_ids", outcome["response_id"]),
                       ("all_gates", request["gate_request_id"]), ("all_logicals", request["logical_id"])):
        require(value not in ids[key], "Recovered call reuses an archived identity")
        ids[key].add(value)
    old_audit._audit_success_view(prefix, directory, receipt, item, ids, events[:26] + events[29:], wire[:26] + wire[28:])
    return {"native_requests": 1, "responses": 1, "errors": 0, "recovered_timeouts": 0, "logical_requests": 1}


def _partial_calls(directory, receipt, item, base, prefix, old_audit, ids):
    events, wire = read_jsonl(directory / "generation-events.jsonl"), read_jsonl(directory / "openrouter-api-records.jsonl")
    journal = read_jsonl(directory / "timeout-retries.jsonl")
    require(len(events) == 19 and len(wire) == 18 and len(journal) == 36, "Wrong partial/classifier call sequence")
    reader = base.read_jsonl
    views = {directory / "generation-events.jsonl": events[:16], directory / "openrouter-api-records.jsonl": wire[:16],
             directory / "timeout-retries.jsonl": journal[:-4]}
    base.read_jsonl = lambda path: views[Path(path)] if Path(path) in views else reader(path)
    try:
        counts = base._audit_calls(directory, receipt, {**item, "turn_ids": item["turn_ids"][:4]}, prefix, old_audit, ids)
    finally:
        base.read_jsonl = reader
    request, error, fatal = events[-3:]
    sent, received = wire[-2:]
    require(request.get("event") == "request" and request.get("stage") == "classify_topic_and_emotion"
            and request.get("turn_id") == "s03t05" and request.get("session_index") == 3 and request.get("arm") == item["arm"]
            and request.get("graph_requested_config") == {"temperature": 0.0, "max_tokens": 4096, "thinking_budget": None}, "Terminal request is not the uncompleted fifth classifier")
    body = base._body(request)
    for row in (sent, received):
        require(row.get("request") == body and row.get("record_id") == FINAL_ID and row.get("endpoint") == base.ENDPOINT
                and row.get("safety_settings_forwarded") is False and row.get("omitted_legacy_generation_parameters") == ["top_k"], "Terminal wire body/provenance mismatch")
    raw = received.get("response", {})
    choices = raw.get("choices", [])
    require(sent.get("event") == "request" and received.get("event") == "error" and received.get("http_status") == 200
            and received.get("retry_after") is None and received.get("error", {}).get("type") == "OpenRouterInBandError"
            and raw.get("model") == base.MODEL and len(choices) == 1 and choices[0].get("finish_reason") == "error"
            and choices[0].get("error", {}).get("code") == 429
            and choices[0].get("error", {}).get("metadata", {}).get("error_type") == "rate_limit_exceeded"
            and not prefix._visible_content(choices[0].get("message", {}).get("content")).strip(), "Terminal 429 is ambiguous or has a visible completion")
    fields = {"kind": "provider_error", "stage": "classify_topic_and_emotion", "error_type": "OpenRouterInBandError",
              "http_status": 200, "native_record_id": FINAL_ID, "upstream_code": 429}
    require(error.get("event") == "error" and fatal.get("event") == "fatal"
            and all(error.get(k) == fatal.get(k) == v for k, v in fields.items())
            and error.get("logical_id") == request["logical_id"] and error.get("attempt") == 1
            and error.get("accepted") is not True and not error.get("text"), "Terminal generation error/fatal differs")
    for key, value in (("wire_ids", FINAL_ID), ("wire_response_ids", raw.get("id")),
                       ("all_gates", request.get("gate_request_id")), ("all_logicals", request.get("logical_id"))):
        require(isinstance(value, str) and value and value not in ids[key], "Terminal identity is missing or reused")
        ids[key].add(value)
    size = len(request["prompt"].encode())
    require(request.get("prompt_utf8_bytes") == size and request.get("estimated_prompt_tokens") == (size + 2) // 3
            and request.get("estimated_prompt_token_limit") == 64000 and (size + 2) // 3 <= 64000
            and request.get("prompt_token_estimate_method") == "utf8_bytes_div3_ceiling", "Terminal prompt measurement changed")
    group = journal[-4:]
    common = {"group_id": group[0].get("group_id"), "gate_request_id": request["gate_request_id"], "request_sha256": base._canonical_hash(body),
              "invocation_sha256": base._canonical_hash({"prompt": request["prompt"], "generation_config": request["generation_config"], "safety_settings": {}}),
              "prompt_sha256": base.digest_bytes(request["prompt"].encode()), "model": base.MODEL, "policy": "resume-04-v1"}
    require(isinstance(common["group_id"], str) and common["group_id"] and common["group_id"] not in ids["retry_groups"]
            and [r.get("event") for r in group] == ["group_start", "attempt_start", "attempt_error", "group_finished"]
            and all(r.get(k) == v for r in group for k, v in common.items())
            and group[0].get("max_attempts") == 3 and group[0].get("retry_delays_seconds") == [30, 60], "Terminal retry group/provenance changed")
    raw_bytes = (directory / "openrouter-api-records.jsonl").read_bytes()
    prefix_bytes = b"".join(raw_bytes.splitlines(keepends=True)[:16])
    require(group[1].get("attempt") == 1 and group[1].get("native_archive_offset") == len(prefix_bytes)
            and group[1].get("native_archive_prefix_sha256") == base.digest_bytes(prefix_bytes)
            and group[2].get("attempt") == group[3].get("attempt") == 1
            and group[2].get("native_record_id") == group[3].get("native_record_id") == FINAL_ID
            and group[2].get("upstream_code") == 429 and group[2].get("http_status") == 200
            and group[2].get("retry_eligible") is False and group[2].get("will_retry") is False
            and group[2].get("retry_reason") is None and group[2].get("delay_seconds") is None
            and group[3].get("outcome") == "non_retryable_error" and group[3].get("error_type") == "OpenRouterInBandError", "Terminal 429 was not stopped after one attempt")
    counts.update(native_requests=9, responses=8, errors=1, logical_requests=9)
    return counts, {"request": request, "outcome": error, "fatal": fatal, "native": received}


def _native_partial(original, config, receipts, base, prefix):
    run = original / "runtime" / RUN_ID
    therapist, patient = receipts[-1]["therapist_id"], config["native_api_id"]
    ledger_path = run / "accepted-turns.jsonl"
    native_path = run / "runs" / f"{therapist}.json"
    memory_path = run / "memory" / f"{therapist}__{patient}.jsonl"
    ledger, native, memory = read_jsonl(ledger_path), read_json(native_path), read_jsonl(memory_path)
    require(len(ledger) == 14 and ledger == [t for r in receipts for t in r["turns"]]
            and len(native.get("sessions", [])) == 3 and native.get("therapist_id") == therapist,
            "Pending run accepted/native count differs")
    count = sum(receipts[1]["memory_record_counts"].values())
    require(len(memory) == count + 4 and len({r.get("id") for r in memory}) == len(memory), "Pending run has missing/duplicate/extra memory")
    json_views = {native_path: {**native, "sessions": native["sessions"][:2]}}
    line_views = {memory_path: memory[:count], ledger_path: ledger[:10]}
    readers = []
    for module in (base, prefix):
        jr, lr = module.read_json, module.read_jsonl
        readers.append((module, jr, lr))
        module.read_json = lambda path, reader=jr: json_views[Path(path)] if Path(path) in json_views else reader(path)
        module.read_jsonl = lambda path, reader=lr: line_views[Path(path)] if Path(path) in line_views else reader(path)
    try:
        base._audit_run(original, config, receipts[:2], prefix, None)
    finally:
        for module, jr, lr in readers:
            module.read_json, module.read_jsonl = jr, lr
    session = native["sessions"][2]
    state = session.get("final_state", {})
    require(not session.get("ended_at") and session.get("session_id") == "comparison_s03" and session.get("patient_id") == patient
            and session.get("source") == "api" and session.get("mode") == "live" and len(session.get("turns", [])) == 4
            and state.get("total_turns") == 14 and state.get("last_episode_turn") == 10
            and state.get("session_id") == "comparison_s03" and state.get("therapist_id") == therapist
            and len(state.get("history", [])) == 5 and len(state.get("messages", [])) == 10, "Pending post-turn14 snapshot differs")
    require(all(state.get(k) == native["sessions"][1]["final_state"].get(k) for k in ("summary", "session_reflection", "memory_consolidation")), "Uncommitted finalization changed persisted memory")
    for n, (turn, saved, source) in enumerate(zip(receipts[-1]["turns"], session["turns"], memory[count:]), 1):
        require(saved.get("turn_index") == n and saved.get("total_turns") == n + 10
                and saved.get("therapist_input_raw") == saved.get("therapist_input_safe") == turn["therapist_text"]
                and saved.get("patient_response") == turn["patient_text"] and turn["api_response"]["message"] == turn["patient_text"], "Pending native turn differs from accepted ledger")
        require(source.get("type") == "conversation_turn" and source.get("patient_id") == patient
                and source.get("therapist_id") == therapist and source.get("session_id") == "comparison_s03"
                and source.get("turn_index") == n + 10 and source.get("session_order") == 2 and source.get("usable") is True
                and source.get("therapist_text") == turn["therapist_text"] and source.get("patient_text") == turn["patient_text"], "Pending source differs from accepted turn")
    expected_window = [native["sessions"][1]["turns"][-1], *session["turns"]]
    require(state["history"] == [{"therapist": t["therapist_input_raw"], "patient": t["patient_response"], "topic": t["detected_topic"]} for t in expected_window]
            and state["messages"] == [m for t in expected_window for m in ({"type": "human", "content": t["therapist_input_raw"]},
                                                                             {"type": "ai", "content": t["patient_response"]})]
            and state.get("last_topic") == session["turns"][-1]["detected_topic"]
            and state.get("emotion_intensity") == session["turns"][-1]["emotion_intensity"], "Pending history/affect is not the saved last-five-turn window")
    return [p.relative_to(original / "runtime").as_posix() for p in (native_path, memory_path)]


def _audit_checkpoint(original):
    runtime = original / "runtime"
    before = snapshot(runtime)
    previous, frozen, base, prefix, old_audit = _verify_chain(original)
    manifest_hash = sha256(original / "manifest.json")
    schedule = read_json(original / "generation/schedule.json")["session_executions"]
    require(len(schedule) == 330 and [r["execution_order"] for r in schedule] == list(range(1, 331))
            and schedule[89]["run_id"] == RUN_ID and schedule[89]["session_index"] == 3, "Wrong scheduled checkpoint")
    ids = _identities(previous)
    receipts, configs, by_run, totals = [], {}, defaultdict(list), Counter()
    allowed = set(frozen["runtime_file_sha256"])
    terminal = None
    for item in schedule[:90]:
        receipt, config = _receipt(original, item, manifest_hash, PREVIOUS_MANIFEST)
        require(item["session_index"] == len(by_run[item["run_id"]]) + 1 and receipt["process_instance_id"] not in ids["process_ids"], "Missing/reordered session or reused process")
        ids["process_ids"].add(receipt["process_instance_id"])
        receipts.append(receipt)
        configs[item["run_id"]] = config
        by_run[item["run_id"]].append(receipt)
        order = item["execution_order"]
        relative = f"{item['run_id']}/sessions/session_{item['session_index']:02d}"
        if order == 78:
            delta = _recovered_finalization(original, previous, frozen, receipt, item, base, prefix, old_audit, ids)
            allowed.update(f"{relative}/{name}" for name in ("recovery-resume05.jsonl", "worker-resume05.log"))
        elif order > 78:
            allowed.update(f"{relative}/{name}" for name in ("session.json", "generation-events.jsonl", "openrouter-api-records.jsonl", "timeout-retries.jsonl", "worker.log"))
            if order == 90:
                delta, terminal = _partial_calls(runtime / relative, receipt, item, base, prefix, old_audit, ids)
            else:
                delta = base._audit_calls(runtime / relative, receipt, item, prefix, old_audit, ids)
        else:
            continue
        totals.update({k: delta[k] for k in ("native_requests", "responses", "errors", "recovered_timeouts", "logical_requests")})
    require(totals == {"native_requests": 111, "responses": 109, "errors": 2, "recovered_timeouts": 1, "logical_requests": 110}, "Delta request/outcome totals differ")
    # The frozen helper's special partial case belonged to Juanita; all closed
    # runs now use its general closed-state verifier, including recovered S3.
    base.RUN_ID = "__no_partial_run__"
    for run_id, saved in by_run.items():
        allowed.add(f"{run_id}/accepted-turns.jsonl")
        if run_id == RUN_ID:
            allowed.update(_native_partial(original, configs[run_id], saved, base, prefix))
        else:
            allowed.update(base._audit_run(original, configs[run_id], saved, prefix, None))
    require(sum(len(r["turns"]) for r in receipts) == 449 and sum(len(r["turns"]) for r in receipts[78:]) == 59,
            "New accepted conversation does not reconcile with the 390-turn prefix")
    stop, gate = read_json(runtime / "STOP"), read_json(runtime / "request-gate.json")
    require(stop == terminal["fatal"] and receipts[-1].get("error", {}).get("type") == "IntegrationAbort"
            and receipts[-1]["error"].get("details") == {k: v for k, v in stop.items() if k not in {"event", "timestamp"}}, "Current STOP/receipt differs from terminal classifier")
    flight = gate.get("in_flight")
    require(isinstance(flight, dict) and flight.get("gate_request_id") == terminal["request"]["gate_request_id"]
            and flight.get("pid") == receipts[-1]["pid"] and flight.get("started_at") == gate.get("last_started")
            and type(gate.get("last_started")) in (int, float) and math.isfinite(gate["last_started"]), "Foreign terminal gate")
    launch = read_json(runtime / "launch.json")
    require(launch.get("execution_manifest_sha256") == manifest_hash and launch.get("mode") == "live_openrouter"
            and read_json(runtime / "active-execution.json") == {**schedule[89], "launch_id": launch["launch_id"]}, "Foreign current execution")
    progress = read_json(runtime / "progress.json")
    require(all(progress.get(k) == v for k, v in {"status": "stopped", "completed_sessions": 89, "accepted_turns": 449,
            "requests": 860, "responses": 850, "provider_errors": 10, "stop": stop}.items()), "Progress contradicts reconciled archives")
    _processes(original, previous, schedule, receipts, launch)
    require(set(before) <= allowed, "Unknown or later runtime artifact")
    directories = {parent.as_posix() for name in allowed for parent in Path(name).parents}
    for item in schedule[:90]:
        root = f"{item['run_id']}/sessions/session_{item['session_index']:02d}/tests"
        directories.update({f"{item['run_id']}/memory", root, root + "/runs"})
    require(all(p.relative_to(runtime).as_posix() in directories for p in runtime.rglob("*") if p.is_dir()), "Later runtime directory exists")
    require(snapshot(runtime) == before, "Runtime changed during offline audit")
    native = terminal["native"]
    wire_path = f"{RUN_ID}/sessions/session_03/openrouter-api-records.jsonl"
    return {"status": "passed", "audited_at": datetime.now(timezone.utc).isoformat(), "completed_sessions": 89,
        "accepted_turns": 449, "requests": 860, "responses": 850, "provider_errors": 10,
        "next_execution_order": 90, "run_id": RUN_ID, "session_index": 3, "session_id": "comparison_s03",
        "patient_id": receipts[-1]["patient_id"], "therapist_id": receipts[-1]["therapist_id"], "partial_accepted_turns": 4,
        "run_accepted_turns": 14, "next_turn_id": "s03t05", "runtime_file_sha256": before, "runtime_hash_paths_relative_to": "runtime/",
        "stop": stop, "gate": gate, "failed_request": terminal["request"], "failed_outcome": terminal["outcome"],
        "execution_manifest_sha256": manifest_hash, "previous_manifest_sha256": PREVIOUS_MANIFEST,
        "live_requests_by_audit": 0, "preserved_prefix_turns": 390, "new_accepted_turns": 59,
        "delta_requests": 111, "delta_responses": 109, "delta_provider_errors": 2,
        "archived_error": {"kind": "provider_error", "stage": "classify_topic_and_emotion", "record_id": FINAL_ID,
            "response_id": native["response"]["id"], "http_status": 200, "upstream_code": 429,
            "error_type": "OpenRouterInBandError", "provider_error_type": "rate_limit_exceeded", "retry_after": None,
            "visible_content_present": False, "wire_path": wire_path, "wire_sha256": sha256(runtime / wire_path)},
        "limitations": ["The sealed predecessor snapshot establishes old evidence; this audit reconciles the bounded delta.",
                        "No semantic scoring, provider call or gate clearing is performed."]}


def _processes(original, previous, schedule, receipts, launch):
    old = (previous / "snapshot/processes.jsonl").read_bytes()
    current = (original / "runtime/processes.jsonl").read_bytes()
    require(current.startswith(old) and current.endswith(b"\n"), "Historical worker journal changed")
    rows = [json.loads(line) for line in current[len(old):].splitlines()]
    started = read_json(previous / "started.json")
    require(len(rows) == 27 and rows[0].get("event") == "continuation_authorized"
            and rows[0].get("next_execution_order") == 78 and rows[0].get("continuation") == "resume-05"
            and rows[0].get("controller_pid") == started.get("pid") and started.get("manifest_sha256") == PREVIOUS_MANIFEST,
            "Foreign/additional authorized controller")
    for n, item in enumerate(schedule[77:90]):
        begin, end = rows[1 + n * 2:3 + n * 2]
        receipt = receipts[item["execution_order"] - 1]
        require(begin.get("event") == "start" and end.get("event") == "exit"
                and all(r.get(k) == v for r in (begin, end) for k, v in item.items())
                and begin.get("pid") == end.get("pid") == receipt["pid"]
                and begin.get("continuation") == end.get("continuation") == "resume-05"
                and end.get("exit_code") == (1 if item["execution_order"] == 90 else 0)
                and begin.get("command", [])[1:] == [str(previous / "worker.py"), "run", "--execution-order",
                    str(item["execution_order"]), "--launch-id", launch["launch_id"]], "Worker chronology, command or exit mismatch")


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
