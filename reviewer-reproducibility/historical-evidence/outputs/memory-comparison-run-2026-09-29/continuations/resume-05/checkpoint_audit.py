"""Offline audit of all saved evidence before the authorized finalization resume.

No graph/provider imports, credentials, processes, writes, or semantic scoring.
Native HTTP attempts, logical generations, bounded timeout groups, accepted
turns, closed snapshots and the one open finalization are reconciled separately.
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

RUN_ID = "juanita_delgado_001__r01__structured_common_profile"
SESSION_INDEX = 3
FINAL_RECORD_ID = "9fa7bcca-324d-4064-b084-c6c7ea18c41e"
MODEL = "google/gemini-2.5-pro"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
MEMORY_STAGES = {"_generate_factual_memory", "_summarize_episode", "_generate_session_reflection",
                 "_generate_long_term_summary_from_reflection"}


class CheckpointAuditError(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise CheckpointAuditError(message)


def digest_bytes(value):
    return hashlib.sha256(value).hexdigest()


def sha256(path):
    return digest_bytes(Path(path).read_bytes())


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_jsonl(path):
    raw = Path(path).read_bytes()
    require(not raw or raw.endswith(b"\n"), f"Incomplete JSONL tail: {Path(path).name}")
    rows = [json.loads(line) for line in raw.splitlines()]
    require(all(isinstance(row, dict) for row in rows), "JSONL rows must be objects")
    return rows


def snapshot(root):
    result = {}
    for path in sorted(Path(root).rglob("*")):
        require(not path.is_symlink(), "Runtime/archive symlink is not auditable")
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
    require(sha256(source) == read_json(original / "manifest.json")["files"].get("prepare_execution.py"), "Frozen verifier changed")
    result = _load_source(source, "_finalization_original_verifier").verify()
    require(result.get("status") == "verified", "Original frozen package verification failed")
    return result


def _verify_chain(original):
    _verify_original(original)
    original_hash = sha256(original / "manifest.json")
    for name, report in (("resume-02", "prefix-audit.json"), ("resume-03", "partial-audit.json"),
                         ("resume-04", "checkpoint-audit.json")):
        root = original / "continuations" / name
        manifest = read_json(root / "manifest.json")
        require(manifest.get("original_execution_manifest_sha256") == original_hash, "Foreign continuation execution")
        require({"continue_run.py", "snapshot-manifest.json", report} <= manifest["files"].keys(), "Incomplete predecessor manifest")
        for path, expected in manifest["files"].items():
            require(sha256(_relative(root, path)) == expected, f"Frozen continuation changed: {name}/{path}")
        files = read_json(root / "snapshot-manifest.json")["files"]
        require(snapshot(root / "snapshot") == files == read_json(root / report)["runtime_file_sha256"], "Frozen snapshot inventory differs")
    previous = original / "continuations/resume-04"
    frozen = read_json(previous / "checkpoint-audit.json")
    require(all(frozen.get(k) == v for k, v in {"status": "passed", "completed_sessions": 9, "accepted_turns": 49,
            "requests": 96, "responses": 94, "provider_errors": 2, "next_execution_order": 10}.items()), "Wrong predecessor checkpoint")
    require(frozen.get("previous_manifest_sha256") == sha256(original / "continuations/resume-03/manifest.json"), "Previous manifest lineage differs")
    facade = SimpleNamespace(verify=lambda: _verify_original(original), read_json=read_json, digest=sha256)
    old_audit = _load_source(previous / "checkpoint_audit.py", "_finalization_previous_audit")
    controller = _load_source(previous / "continue_run.py", "_finalization_previous_controller",
        {"paired_runner": facade, "checkpoint_audit": old_audit,
         "worker": SimpleNamespace(RUN_ID="juanita_delgado_001__r02__flat_full_history")})
    controller.verify()
    controller.verify_preserved_prefix()
    require((previous / "resolved-stop.json").read_bytes() == (previous / "snapshot/STOP").read_bytes(), "Historical STOP was lost")
    resolution = read_json(previous / "resolution.json")
    require(resolution.get("previous_gate") == frozen["gate"] and resolution.get("terminal_failure") == frozen["archived_error"],
            "Previous error resolution is foreign")
    prefix = _load_source(original / "continuations/resume-02/prefix_audit.py", "_finalization_prefix_helpers")
    return previous, frozen, prefix, old_audit


def _canonical_hash(value):
    return digest_bytes(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode())


def _time(value):
    return datetime.fromisoformat(value).timestamp()


def _body(request):
    config = request["generation_config"]
    stage = request["stage"]
    expected = {"temperature": .2 if stage in MEMORY_STAGES else (0.0 if stage == "classify_topic_and_emotion" else .7),
                "max_output_tokens": 8192 if stage in MEMORY_STAGES else 4096, "top_p": .95, "top_k": 40,
                "stop_sequences": ["\nTherapist:", "Therapist:"], "thinking_config": {"thinking_budget": 1024}}
    require(stage in MEMORY_STAGES | {"classify_topic_and_emotion", "generate_response"}
            and config == expected and request.get("attempt") == 1, "Unexpected generation stage, attempt or frozen decoding")
    return {"model": MODEL, "messages": [{"role": "user", "content": request["prompt"]}],
            "provider": {"require_parameters": True, "allow_fallbacks": False}, "temperature": config["temperature"],
            "max_tokens": config["max_output_tokens"], "top_p": .95, "stop": config["stop_sequences"], "reasoning": {"max_tokens": 1024}}


def _wire_pairs(path, identities):
    raw = path.read_bytes()
    rows = read_jsonl(path)
    chunks = raw.splitlines(keepends=True)
    require(len(rows) % 2 == 0, "Unpaired native request")
    pairs = []
    offset = 0
    for i in range(0, len(rows), 2):
        sent, received = rows[i:i + 2]
        record_id = sent.get("record_id")
        require(sent.get("event") == "request" and received.get("event") in {"response", "error"}
                and isinstance(record_id, str) and record_id and record_id not in identities["wire_ids"]
                and received.get("record_id") == record_id, "Missing, reused or unpaired native record")
        identities["wire_ids"].add(record_id)
        for row in (sent, received):
            require(row.get("endpoint") == ENDPOINT and row.get("safety_settings_forwarded") is False
                    and row.get("omitted_legacy_generation_parameters") == ["top_k"]
                    and row.get("request") == sent.get("request"), "Native transport body/provenance mismatch")
        response = received.get("response", {})
        response_id = response.get("id")
        require(received.get("http_status") == 200 and response.get("model") == MODEL
                and isinstance(response_id, str) and response_id and response_id not in identities["wire_response_ids"],
                "Foreign model/status or reused response ID")
        identities["wire_response_ids"].add(response_id)
        pairs.append({"sent": sent, "received": received, "offset": offset, "prefix_hash": digest_bytes(raw[:offset])})
        offset += len(chunks[i]) + len(chunks[i + 1])
    return pairs


def _explicit_504(pair, prefix):
    received = pair["received"]
    choices = received.get("response", {}).get("choices")
    require(received.get("event") == "error" and received.get("error", {}).get("type") == "OpenRouterInBandError"
            and isinstance(choices, list) and len(choices) == 1 and choices[0].get("finish_reason") == "error"
            and choices[0].get("error", {}).get("code") == 504
            and not prefix._visible_content(choices[0].get("message", {}).get("content")).strip(), "Native error is ambiguous or not an empty 504")


def _retry_groups(path, requests, wire_by_id, prefix, identities):
    if not path.exists():
        return {}, 0
    rows = read_jsonl(path)
    groups, i, errors = {}, 0, 0
    while i < len(rows):
        start = rows[i]
        i += 1
        gate = start.get("gate_request_id")
        group_id = start.get("group_id")
        require(start.get("event") == "group_start" and gate in requests and gate not in groups
                and isinstance(group_id, str) and group_id and group_id not in identities["retry_groups"], "Foreign/repeated timeout group")
        identities["retry_groups"].add(group_id)
        request = requests[gate]
        body = _body(request)
        common = {"group_id": group_id, "gate_request_id": gate, "request_sha256": _canonical_hash(body),
                  "invocation_sha256": _canonical_hash({"prompt": request["prompt"], "generation_config": request["generation_config"], "safety_settings": {}}),
                  "prompt_sha256": digest_bytes(request["prompt"].encode()), "model": MODEL, "policy": "resume-04-v1"}
        require(all(start.get(k) == v for k, v in common.items()) and start.get("max_attempts") == 3
                and start.get("retry_delays_seconds") == [30, 60], "Retry policy/settings hash changed")
        used, previous_error_time, delay = [], None, 0
        for attempt in range(1, 4):
            require(i + 1 < len(rows), "Unfinished timeout attempt")
            began, outcome = rows[i:i + 2]
            i += 2
            require(began.get("event") == "attempt_start" and began.get("attempt") == outcome.get("attempt") == attempt
                    and all(row.get(k) == v for row in (began, outcome) for k, v in common.items()), "Retry attempt identity/order differs")
            record_id = outcome.get("native_record_id")
            require(record_id in wire_by_id and record_id not in used, "Retry attempt has no distinct native archive")
            pair = wire_by_id[record_id]
            require(pair["sent"]["request"] == body and began.get("native_archive_offset") == pair["offset"]
                    and began.get("native_archive_prefix_sha256") == pair["prefix_hash"], "Retry archive prefix/body was altered")
            if previous_error_time is not None:
                require(_time(began["timestamp"]) >= previous_error_time + delay - .01, "Retry occurred before its declared delay")
            used.append(record_id)
            received = pair["received"]
            if outcome.get("event") == "attempt_error":
                _explicit_504(pair, prefix)
                require(attempt < 3 and outcome.get("http_status") == 200 and outcome.get("upstream_code") == 504
                        and outcome.get("error_type") == "OpenRouterInBandError" and outcome.get("retry_eligible") is True
                        and outcome.get("retry_reason") == "explicit_native_504_without_visible_completion"
                        and outcome.get("will_retry") is True and outcome.get("delay_seconds") == [30, 60][attempt - 1],
                        "Retry was not an authorized bounded explicit timeout")
                previous_error_time, delay = _time(outcome["timestamp"]), outcome["delay_seconds"]
                errors += 1
                continue
            require(outcome.get("event") == "attempt_response" and received.get("event") == "response"
                    and outcome.get("response_id") == received["response"]["id"] and outcome.get("raw_model") == MODEL
                    and outcome.get("backend") == received["response"].get("provider") and outcome.get("http_status") == 200
                    and outcome.get("finish_reasons") == [c.get("finish_reason") for c in received["response"]["choices"]], "Retry returned response provenance differs")
            require(i < len(rows), "Missing retry-group completion")
            finished = rows[i]
            i += 1
            require(finished.get("event") == "group_finished" and finished.get("outcome") == "returned_response"
                    and finished.get("attempt") == attempt and finished.get("native_record_id") == record_id
                    and finished.get("response_id") == received["response"]["id"]
                    and finished.get("last_attempt_minimum_start_interval_seconds") == 5
                    and all(finished.get(k) == v for k, v in common.items())
                    and _time(finished["timestamp"]) >= _time(began["timestamp"]) + 4.99, "Retry group did not finish with its last response")
            groups[gate] = used
            break
        require(gate in groups, "Retry group exhausted without a returned response")
    return groups, errors


def _audit_calls(session_dir, receipt, item, prefix, old_audit, identities):
    rows = read_jsonl(session_dir / "generation-events.jsonl")
    pairs = _wire_pairs(session_dir / "openrouter-api-records.jsonl", identities)
    by_id = {p["sent"]["record_id"]: p for p in pairs}
    calls, i = [], 0
    while i < len(rows):
        require(i + 1 < len(rows), "Generation lacks an outcome")
        request, outcome = rows[i:i + 2]
        i += 2
        require(request.get("event") == "request" and outcome.get("event") in {"outcome", "error"}
                and request.get("arm") == item["arm"] and request.get("session_index") == item["session_index"]
                and request.get("turn_id") in {None, *item["turn_ids"]}
                and outcome.get("logical_id") == request.get("logical_id") and outcome.get("attempt") == request.get("attempt")
                and outcome.get("stage") == request.get("stage"), "Generation identity/order differs")
        require(isinstance(request.get("gate_request_id"), str) and request["gate_request_id"]
                and request["gate_request_id"] not in identities["all_gates"]
                and isinstance(request.get("logical_id"), str) and request["logical_id"]
                and request["logical_id"] not in identities["all_logicals"], "Repeated/missing logical generation or gate")
        identities["all_gates"].add(request["gate_request_id"])
        identities["all_logicals"].add(request["logical_id"])
        fatal = None
        if i < len(rows) and rows[i].get("event") == "fatal":
            fatal = rows[i]
            i += 1
        calls.append((request, outcome, fatal))
    groups, recovered_errors = _retry_groups(session_dir / "timeout-retries.jsonl",
        {r["gate_request_id"]: r for r, _, _ in calls}, by_id, prefix, identities)
    successful_events, successful_wire, used_wire, cached = [], [], [], []
    empty, historical = None, 0
    for request, outcome, fatal in calls:
        record_id = outcome.get("native_record_id")
        require(record_id in by_id, "Generation outcome lacks its native archive")
        pair = by_id[record_id]
        require(pair["sent"]["request"] == _body(request), "Generation and native request body differ")
        used = groups.get(request["gate_request_id"], [record_id])
        require(used[-1] == record_id, "Generation outcome is not the last retry response")
        used_wire.extend(used)
        is_new = item["execution_order"] > 10 or (item["execution_order"] == 10 and request["logical_id"] != calls[4][0]["logical_id"] and request is calls[-1][0])
        require((request["gate_request_id"] in groups) is is_new, "Timeout policy missing or applied before authorization")
        received = pair["received"]
        if outcome["event"] == "error":
            require(item["execution_order"] in {9, 10} and request["stage"] == "generate_response" and request["turn_id"] == "s01t05",
                    "Unexpected terminal provider error outside historical recoveries")
            _explicit_504(pair, prefix)
            fields = {"kind": "provider_error", "stage": "generate_response", "error_type": "OpenRouterInBandError",
                      "http_status": 200, "native_record_id": record_id, "upstream_code": 504}
            require(fatal is not None and all(outcome.get(k) == fatal.get(k) == v for k, v in fields.items()), "Historical error/fatal mismatch")
            historical += 1
        elif outcome.get("accepted") is True:
            require(fatal is None, "Successful generation has a fatal marker")
            successful_events.extend((request, outcome))
            successful_wire.extend((pair["sent"], received))
            if item["execution_order"] == 78 and request["stage"] in {"_generate_session_reflection", "_generate_long_term_summary_from_reflection"}:
                cached.append({"request": request, "outcome": outcome})
        else:
            require(item["execution_order"] == 78 and request["stage"] == "_generate_factual_memory" and calls[-1][0] is request
                    and record_id == FINAL_RECORD_ID and fatal is not None and outcome.get("accepted") is False
                    and outcome.get("finish_reasons") == ["STOP"] and outcome.get("max_tokens_recovery") is False
                    and outcome.get("text") == "", "Unexpected unaccepted generation")
            raw = received.get("response", {})
            choices = raw.get("choices", [])
            require(received.get("event") == "response" and len(choices) == 1 and choices[0].get("finish_reason") == "stop"
                    and choices[0].get("message", {}).get("content") is None and not choices[0].get("error") and not raw.get("error")
                    and outcome.get("raw_model") == MODEL and outcome.get("response_id") == raw.get("id")
                    and outcome.get("native_usage") == raw.get("usage") and outcome.get("backend") == raw.get("provider"),
                    "Terminal empty STOP outcome differs from native response")
            expected_fatal = {"kind": "incomplete_generation", "stage": "_generate_factual_memory", "finish_reasons": ["STOP"],
                              "max_output_tokens": 8192, "native_record_id": record_id}
            require(all(fatal.get(k) == v for k, v in expected_fatal.items()), "Wrong terminal empty-generation marker")
            size = len(request["prompt"].encode())
            require(all(row.get("prompt_utf8_bytes") == size and row.get("estimated_prompt_tokens") == (size + 2) // 3
                        and row.get("estimated_prompt_token_limit") == 64000 and row.get("prompt_token_estimate_method") == "utf8_bytes_div3_ceiling"
                        for row in (request, outcome)) and (size + 2) // 3 <= 64000, "Terminal prompt measurement differs")
            empty = {"request": request, "outcome": outcome, "fatal": fatal, "native": received}
    require(used_wire == [p["sent"]["record_id"] for p in pairs], "Unclaimed, reordered or later native attempt")
    old_audit._audit_success_view(prefix, session_dir, receipt, item, identities, successful_events, successful_wire)
    return {"native_requests": len(pairs), "responses": sum(p["received"]["event"] == "response" for p in pairs),
            "errors": recovered_errors + historical, "recovered_timeouts": recovered_errors, "logical_requests": len(calls),
            "cached": cached, "empty": empty, "calls": calls}


def _audit_receipt(original, item, manifest_hash, previous_hash):
    index, run_id = item["session_index"], item["run_id"]
    run_dir = original / "runtime" / run_id
    path = run_dir / "sessions" / f"session_{index:02d}" / "session.json"
    receipt = read_json(path)
    config = read_json(original / "generation/runs" / f"{run_id}.json")
    expected = {"run_id": run_id, "arm": item["arm"], "session_index": index, "session_id": f"comparison_s{index:02d}",
        "profile_id": config["profile_id"], "patient_id": config["native_api_id"], "archived_patient_id": config["archived_patient_id"],
        "therapist_id": f"comparison_{run_id}", "execution_manifest_sha256": manifest_hash,
        "status": "stopped" if item["execution_order"] == 78 else "completed", "inference_mode": "live_openrouter",
        "requested_model": MODEL, "provider_seed": None, "case_sha256": config["case_sha256"], "prior_finalized_sessions": index - 1}
    require(config["run_id"] == run_id and config["arm"] == item["arm"] and all(receipt.get(k) == v for k, v in expected.items())
            and receipt.get("finished_at") and not receipt.get("cleanup_errors"), "Receipt chronology, identity or model differs")
    require(isinstance(receipt.get("process_instance_id"), str) and receipt["process_instance_id"], "Missing process identity")
    scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][index - 1]
    turns = receipt.get("turns", [])
    require(len(turns) == 5 and scenario["session_index"] == index, "Session has missing/extra accepted turns")
    for position, (turn, planned) in enumerate(zip(turns, scenario["turns"]), 1):
        require(turn.get("run_id") == run_id and turn.get("status") == "accepted" and turn.get("session_index") == index
                and turn.get("turn_index") == (index - 1) * 5 + position
                and turn.get("turn_id") == planned["turn_id"] == item["turn_ids"][position - 1]
                and turn.get("therapist_text") == turn.get("safe_user_input") == planned["text"]
                and isinstance(turn.get("patient_text"), str) and turn["patient_text"].strip()
                and turn.get("application_guard_failure") is False and turn.get("safety_flags") == [], "Accepted turn differs from scenario/native guard")
    restore = receipt["restored_before_first_request"]
    require(restore.get("total_turns") == (index - 1) * 5
            and restore.get("history_turns") == ((index - 1) * 5 if item["arm"] == "flat_full_history" else min(5, (index - 1) * 5)),
            "Fresh-process restore count differs from earlier sessions")
    if item["execution_order"] >= 10:
        require(receipt.get("transport_amendment") == {"continuation": "resume-04", "policy": "bounded_timeout_retry_v1",
                "max_attempts": 3, "retry_delays_seconds": [30, 60], "continuation_manifest_sha256": previous_hash}, "Transport policy receipt differs")
    if item["execution_order"] < 78:
        require(not receipt.get("error") and receipt.get("finalization"), "Completed session has an error or no finalization")
    else:
        require("finalization" not in receipt and "state_files_at_close" not in receipt, "Stopped finalization was already committed")
    require(sha256(original / "generation" / config["case_path"]) == config["case_sha256"]
            and sha256(original / config["profile_path"]) == config["source_yaml_sha256"], "Clinical input changed")
    return receipt, config


def _audit_run(original, config, receipts, prefix, final_calls):
    run_dir = original / "runtime" / config["run_id"]
    ledger_path = run_dir / "accepted-turns.jsonl"
    ledger = read_jsonl(ledger_path)
    require(ledger == [turn for receipt in receipts for turn in receipt["turns"]], "Run ledger differs from all accepted receipts")
    ledger_lines = ledger_path.read_bytes().splitlines(keepends=True)
    closed = [r for r in receipts if r["status"] == "completed"]
    for receipt in closed:
        require(receipt["accepted_ledger_sha256"] == digest_bytes(b"".join(ledger_lines[:receipt["session_index"] * 5])), "Closed ledger prefix hash differs")
    if config["arm"] == "flat_full_history":
        prefix._audit_native(run_dir, config, closed, ledger)
        return []
    therapist, patient = receipts[-1]["therapist_id"], config["native_api_id"]
    native_path = run_dir / "runs" / f"{therapist}.json"
    memory_path = run_dir / "memory" / f"{therapist}__{patient}.jsonl"
    native, memory = read_json(native_path), read_jsonl(memory_path)
    require(native.get("therapist_id") == therapist and len(native.get("sessions", [])) == len(receipts), "Native run has missing/later sessions")
    require(all(isinstance(record.get("id"), str) and record["id"] for record in memory)
            and len({record["id"] for record in memory}) == len(memory), "Native memory contains missing/duplicate IDs")
    memory_lines = memory_path.read_bytes().splitlines(keepends=True)
    for receipt in closed:
        index = receipt["session_index"]
        state = {**native, "sessions": native["sessions"][:index]}
        count = sum(receipt["memory_record_counts"].values())
        expected_hashes = {native_path.relative_to(run_dir).as_posix(): digest_bytes(json.dumps(state, ensure_ascii=False, indent=2).encode()),
                           memory_path.relative_to(run_dir).as_posix(): digest_bytes(b"".join(memory_lines[:count]))}
        require(receipt["state_files_at_close"] == expected_hashes, "Closed native snapshot/prefix hash differs")
    is_partial = config["run_id"] == RUN_ID
    if not is_partial:
        require(sum(closed[-1]["memory_record_counts"].values()) == len(memory), "Memory contains records after latest closed state")
        prefix._audit_native(run_dir, config, closed, ledger)
    else:
        require(len(receipts) == 3 and len(closed) == 2, "Wrong partial native session boundary")
        count = sum(closed[-1]["memory_record_counts"].values())
        json_reader, lines_reader = prefix.read_json, prefix.read_jsonl
        prefix.read_json = lambda path: {**native, "sessions": native["sessions"][:2]} if Path(path) == native_path else json_reader(path)
        prefix.read_jsonl = lambda path: memory[:count] if Path(path) == memory_path else lines_reader(path)
        try:
            prefix._audit_native(run_dir, config, closed, ledger[:10])
        finally:
            prefix.read_json, prefix.read_jsonl = json_reader, lines_reader
        session = native["sessions"][-1]
        current = receipts[-1]
        state = session.get("final_state", {})
        sources = memory[count:]
        require(session.get("session_id") == "comparison_s03" and session.get("patient_id") == patient
                and session.get("source") == "api" and session.get("mode") == "live" and not session.get("ended_at")
                and state.get("therapist_id") == therapist and state.get("session_id") == "comparison_s03"
                and len(session.get("turns", [])) == 5 and state.get("total_turns") == state.get("last_episode_turn") == 15
                and len(state.get("history", [])) == 5 and len(state.get("messages", [])) == 10,
                "Partial native logger is closed or has wrong committed snapshot")
        previous_state = native["sessions"][1]["final_state"]
        require(all(state.get(k) == previous_state.get(k) for k in ("summary", "session_reflection", "memory_consolidation")),
                "Uncommitted finalization changed native summary/reflection/status")
        require(len(sources) == 6 and [r.get("type") for r in sources] == ["conversation_turn"] * 5 + ["episode_summary"],
                "Partial memory has missing sources or already-promoted finalization")
        for number, (turn, saved, history, source) in enumerate(zip(current["turns"], session["turns"], state["history"], sources), 1):
            require(saved.get("turn_index") == number and saved.get("total_turns") == number + 10
                    and saved.get("therapist_input_raw") == saved.get("therapist_input_safe") == turn["therapist_text"]
                    and saved.get("patient_response") == turn["patient_text"] and turn["api_response"]["message"] == turn["patient_text"]
                    and history == {"therapist": turn["therapist_text"], "patient": turn["patient_text"], "topic": saved["detected_topic"]}
                    and state["messages"][2 * number - 2:2 * number] == [{"type": "human", "content": turn["therapist_text"]},
                                                                           {"type": "ai", "content": turn["patient_text"]}], "Partial native accepted conversation mismatch")
            require(source.get("patient_id") == patient and source.get("therapist_id") == therapist and source.get("session_id") == "comparison_s03"
                    and source.get("turn_index") == number + 10 and source.get("session_order") == 2 and source.get("usable") is True
                    and source.get("therapist_text") == turn["therapist_text"] and source.get("patient_text") == turn["patient_text"], "Partial raw memory source mismatch")
        episode = sources[-1]
        summary_outcomes = [o for r, o, _ in final_calls["calls"] if r["stage"] == "_summarize_episode"]
        require(len(summary_outcomes) == 1 and episode.get("text") == summary_outcomes[0]["text"]
                and episode.get("session_id") == "comparison_s03" and episode.get("turn_range") == [11, 15]
                and episode.get("turn_count") == 5 and episode.get("patient_id") == patient and episode.get("therapist_id") == therapist,
                "Persisted partial episode differs from accepted generation")
    return [native_path.relative_to(original / "runtime").as_posix(), memory_path.relative_to(original / "runtime").as_posix()]


def _audit_checkpoint(original):
    runtime = original / "runtime"
    before = snapshot(runtime)
    previous, frozen, prefix, old_audit = _verify_chain(original)
    manifest_hash, previous_hash = sha256(original / "manifest.json"), sha256(previous / "manifest.json")
    schedule = read_json(original / "generation/schedule.json")["session_executions"]
    require(len(schedule) == 330 and [r["execution_order"] for r in schedule] == list(range(1, 331))
            and schedule[77]["run_id"] == RUN_ID and schedule[77]["session_index"] == 3, "Wrong frozen checkpoint schedule")
    launch = read_json(runtime / "launch.json")
    require(launch.get("execution_manifest_sha256") == manifest_hash and launch.get("mode") == "live_openrouter", "Foreign original launch")
    identities = {key: set() for key in ("logical_attempts", "gate_ids", "archive_ids", "response_ids", "process_ids",
                 "wire_ids", "wire_response_ids", "retry_groups", "all_gates", "all_logicals")}
    by_run, configs, receipts, totals = defaultdict(list), {}, [], Counter()
    allowed = {"launch.json", "STOP", "request-gate.json", "request-gate.lock", "active-execution.json", "progress.json", "processes.jsonl"}
    final_calls = None
    for item in schedule[:78]:
        receipt, config = _audit_receipt(original, item, manifest_hash, previous_hash)
        require(item["session_index"] == len(by_run[item["run_id"]]) + 1 and receipt["process_instance_id"] not in identities["process_ids"],
                "Sessions are reordered or process identity reused")
        identities["process_ids"].add(receipt["process_instance_id"])
        by_run[item["run_id"]].append(receipt)
        configs[item["run_id"]] = config
        receipts.append(receipt)
        relative = f"{item['run_id']}/sessions/session_{item['session_index']:02d}"
        calls = _audit_calls(runtime / relative, receipt, item, prefix, old_audit, identities)
        totals.update({k: calls[k] for k in ("native_requests", "responses", "errors", "recovered_timeouts", "logical_requests")})
        allowed.update(f"{relative}/{name}" for name in ("session.json", "generation-events.jsonl", "openrouter-api-records.jsonl", "worker.log"))
        if item["execution_order"] >= 10:
            allowed.add(f"{relative}/timeout-retries.jsonl")
        if item["execution_order"] == 9:
            allowed.update(f"{relative}/{name}" for name in ("recovery-resume03.jsonl", "worker-resume03.log"))
        if item["execution_order"] == 10:
            allowed.update(f"{relative}/{name}" for name in ("recovery-resume04.json", "worker-resume04.log"))
            recovery = read_json(runtime / relative / "recovery-resume04.json")
            require(recovery.get("mode") == "live" and recovery.get("prompt_identical_to_failed_request") is True
                    and recovery.get("prior_failed_logical_id") == frozen["failed_request"]["logical_id"]
                    and calls["calls"][-1][0]["prompt"] == frozen["failed_request"]["prompt"], "Flat recovery provenance changed")
        if item["execution_order"] == 78:
            final_calls = calls
    require(totals == {"native_requests": 749, "responses": 741, "errors": 8, "recovered_timeouts": 6, "logical_requests": 743},
            "Native/logical request or historical error totals differ")
    for run_id, saved in by_run.items():
        allowed.add(f"{run_id}/accepted-turns.jsonl")
        allowed.update(_audit_run(original, configs[run_id], saved, prefix, final_calls))
    require(sum(len(r["turns"]) for r in receipts) == 390 and len(identities["retry_groups"]) == 647, "Accepted turn or retry-group count differs")
    empty = final_calls["empty"]
    require(empty is not None and len(final_calls["calls"]) == 14
            and [entry["request"]["stage"] for entry in final_calls["cached"]] ==
            ["_generate_session_reflection", "_generate_long_term_summary_from_reflection"], "Required saved finalization calls are missing/repeated")
    stop, gate = read_json(runtime / "STOP"), read_json(runtime / "request-gate.json")
    require(stop == empty["fatal"] and receipts[-1].get("error", {}).get("type") == "IntegrationAbort"
            and receipts[-1]["error"].get("details") == {k: v for k, v in stop.items() if k not in {"event", "timestamp"}}, "STOP/receipt differs from failed finalization")
    flight = gate.get("in_flight")
    require(isinstance(flight, dict) and flight.get("gate_request_id") == empty["request"]["gate_request_id"]
            and flight.get("pid") == receipts[-1]["pid"] and flight.get("started_at") == gate.get("last_started")
            and type(gate.get("last_started")) in (int, float) and math.isfinite(gate["last_started"]), "Gate is not the terminal factual request")
    require(read_json(runtime / "active-execution.json") == {**schedule[77], "launch_id": launch["launch_id"]}, "Active execution differs from stopped session")
    progress = read_json(runtime / "progress.json")
    require(all(progress.get(k) == v for k, v in {"status": "stopped", "completed_sessions": 77, "accepted_turns": 390,
            "requests": 749, "responses": 741, "provider_errors": 8, "stop": stop}.items()), "Progress does not match audited evidence")
    _audit_processes(original, previous, schedule, receipts, launch)
    require(set(before) <= allowed, "Unknown or later runtime artifact")
    directories = {parent.as_posix() for name in allowed for parent in Path(name).parents}
    for item in schedule[:78]:
        base = f"{item['run_id']}/sessions/session_{item['session_index']:02d}/tests"
        directories.update({f"{item['run_id']}/memory", base, base + "/runs"})
    require(all(p.relative_to(runtime).as_posix() in directories for p in runtime.rglob("*") if p.is_dir()), "Later or foreign runtime directory")
    require(snapshot(runtime) == before, "Runtime changed during read-only reconciliation")
    wire_path = f"{RUN_ID}/sessions/session_03/openrouter-api-records.jsonl"
    native = empty["native"]
    return {"status": "passed", "audited_at": datetime.now(timezone.utc).isoformat(), "completed_sessions": 77,
        "accepted_turns": 390, "requests": 749, "responses": 741, "provider_errors": 8, "logical_requests": 743,
        "recovered_timeouts": 6, "retry_groups": 647, "next_execution_order": 78, "run_id": RUN_ID, "session_index": 3,
        "session_id": "comparison_s03", "patient_id": receipts[-1]["patient_id"], "therapist_id": receipts[-1]["therapist_id"],
        "partial_accepted_turns": 5, "run_accepted_turns": 15, "runtime_file_sha256": before, "runtime_hash_paths_relative_to": "runtime/",
        "stop": stop, "gate": gate, "failed_request": empty["request"], "failed_outcome": empty["outcome"],
        "cached_finalization_calls": final_calls["cached"], "execution_manifest_sha256": manifest_hash,
        "previous_manifest_sha256": previous_hash, "live_requests_by_audit": 0,
        "archived_error": {"kind": "incomplete_generation", "stage": "_generate_factual_memory", "record_id": FINAL_RECORD_ID,
            "response_id": native["response"]["id"], "http_status": 200, "finish_reasons": ["STOP"],
            "visible_content_present": False, "accepted": False, "wire_path": wire_path, "wire_sha256": sha256(runtime / wire_path)},
        "limitations": ["No semantic scoring is performed.", "An empty successful HTTP response is distinct from the eight preserved provider errors."]}


def _audit_processes(original, previous, schedule, receipts, launch):
    old = (previous / "snapshot/processes.jsonl").read_bytes()
    raw = (original / "runtime/processes.jsonl").read_bytes()
    require(raw.startswith(old) and raw.endswith(b"\n"), "Historical process prefix was rewritten")
    rows = [json.loads(line) for line in raw[len(old):].splitlines()]
    require(len(rows) == 139 and rows[0].get("event") == "continuation_authorized", "Missing/extra controller or worker execution")
    started = read_json(previous / "started.json")
    require(started.get("manifest_sha256") == sha256(previous / "manifest.json") and rows[0].get("controller_pid") == started.get("pid")
            and rows[0].get("next_execution_order") == 10 and rows[0].get("continuation") == "resume-04", "Foreign launch authorization")
    for offset, item in enumerate(schedule[9:78]):
        began, ended = rows[1 + offset * 2:3 + offset * 2]
        receipt = receipts[item["execution_order"] - 1]
        require(began.get("event") == "start" and ended.get("event") == "exit"
                and all(row.get(k) == v for row in (began, ended) for k, v in item.items())
                and began.get("pid") == ended.get("pid") == receipt["pid"]
                and began.get("continuation") == ended.get("continuation") == "resume-04"
                and ended.get("exit_code") == (1 if item["execution_order"] == 78 else 0)
                and began.get("command", [])[1:] == [str(previous / "worker.py"), "run", "--execution-order",
                      str(item["execution_order"]), "--launch-id", launch["launch_id"]], "Worker command/identity/exit differs from scheduled receipt")


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
