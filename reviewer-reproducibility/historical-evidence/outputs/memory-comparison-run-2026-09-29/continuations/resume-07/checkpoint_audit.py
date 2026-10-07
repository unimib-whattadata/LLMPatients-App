"""Read-only, stdlib checkpoint audit anchored to the frozen resume-06 prefix.

Reconciles the bounded delta and the final credit error. No provider imports,
credentials, process calls, archive writes, or semantic scoring are performed.
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

RUN_ID = "jason_smith_001__r01__flat_full_history"
RECOVERED_RUN = "alex_carter_001__r03__structured_common_profile"
SESSION_INDEX = 10
FINAL_ID = "7555992b-469b-4b6f-8f0f-bde4e9881659"
PREVIOUS_MANIFEST = "cd880237f3afa21942853dd559948b75540467aae0a1d714e045c09aa6f8d1f1"


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
    return _rows(Path(path).read_bytes())


def _rows(raw):
    require(not raw or raw.endswith(b"\n"), "Uncommitted JSONL tail")
    result = [json.loads(line) for line in raw.splitlines()]
    require(all(isinstance(row, dict) for row in result), "Invalid JSONL object")
    return result


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
    result = _load(source, "_credit_original_verifier").verify()
    require(result.get("status") == "verified", "Original frozen package verification failed")
    return result


def _verify_chain(original):
    previous = original / "continuations/resume-06"
    require(sha256(previous / "manifest.json") == PREVIOUS_MANIFEST, "Wrong authorized predecessor manifest")
    manifest = read_json(previous / "manifest.json")
    require(manifest["original_execution_manifest_sha256"] == sha256(original / "manifest.json"), "Foreign predecessor lineage")
    for name, expected in manifest["files"].items():
        part = Path(name)
        require(not part.is_absolute() and ".." not in part.parts and (previous / part).resolve().is_relative_to(previous.resolve()), "Unsafe predecessor path")
        require(sha256(previous / part) == expected, f"Frozen predecessor changed: {name}")
    frozen = read_json(previous / "checkpoint-audit.json")
    require(all(frozen.get(k) == v for k, v in {"status": "passed", "completed_sessions": 89, "accepted_turns": 449,
            "requests": 860, "responses": 850, "provider_errors": 10, "next_execution_order": 90}.items()), "Wrong 449-turn checkpoint")
    require(snapshot(previous / "snapshot") == read_json(previous / "snapshot-manifest.json")["files"] == frozen["runtime_file_sha256"], "Frozen snapshot inventory changed")
    predecessor = _load(previous / "checkpoint_audit.py", "_credit_frozen_audit06")
    predecessor._verify_original = _verify_original
    _, _, base, prefix, old_audit = predecessor._verify_chain(original)
    facade = SimpleNamespace(verify=lambda: _verify_original(original), read_json=read_json, digest=sha256)
    controller = _load(previous / "continue_run.py", "_credit_frozen_controller06",
        {"paired_runner": facade, "checkpoint_audit": predecessor, "worker": SimpleNamespace(RUN_ID=RECOVERED_RUN)})
    controller.verify()
    controller.verify_preserved_prefix()
    require((previous / "resolved-stop.json").read_bytes() == (previous / "snapshot/STOP").read_bytes(), "Historical rate-limit STOP was lost")
    resolution = read_json(previous / "resolution.json")
    require(resolution.get("previous_gate") == frozen["gate"] and resolution.get("terminal_failure") == frozen["archived_error"], "Historical resolution changed")
    policy = _load(previous / "timeout_retries.py", "_credit_frozen_policy06")
    contract = _load(original / "prompt_contract.py", "_credit_frozen_prompt_contract")
    return previous, frozen, predecessor, base, prefix, old_audit, policy, contract


def _receipt(original, item):
    run_id, index, order = item["run_id"], item["session_index"], item["execution_order"]
    config = read_json(original / "generation/runs" / f"{run_id}.json")
    receipt = read_json(original / "runtime" / run_id / "sessions" / f"session_{index:02d}" / "session.json")
    expected = {"run_id": run_id, "arm": config["arm"], "session_index": index, "session_id": f"comparison_s{index:02d}",
        "profile_id": config["profile_id"], "patient_id": config["native_api_id"], "archived_patient_id": config["archived_patient_id"],
        "therapist_id": f"comparison_{run_id}", "case_sha256": config["case_sha256"], "prior_finalized_sessions": index - 1,
        "execution_manifest_sha256": sha256(original / "manifest.json"), "status": "stopped" if order == 290 else "completed",
        "inference_mode": "live_openrouter", "requested_model": "google/gemini-2.5-pro", "provider_seed": None}
    require(config["run_id"] == run_id and config["arm"] == item["arm"] and all(receipt.get(k) == v for k, v in expected.items())
            and receipt.get("finished_at") and receipt.get("process_instance_id") and not receipt.get("cleanup_errors"), "Receipt identity or close differs")
    count = 4 if order == 290 else 5
    require(len(receipt.get("turns", [])) == count, "Wrong accepted turn count")
    scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][index - 1]
    for n, (turn, planned) in enumerate(zip(receipt["turns"], scenario["turns"]), 1):
        require(turn.get("run_id") == run_id and turn.get("status") == "accepted" and turn.get("session_index") == index
                and turn.get("turn_index") == 5 * (index - 1) + n and turn.get("turn_id") == planned["turn_id"] == item["turn_ids"][n - 1]
                and turn.get("therapist_text") == turn.get("safe_user_input") == planned["text"]
                and isinstance(turn.get("patient_text"), str) and turn["patient_text"].strip()
                and turn.get("application_guard_failure") is False and turn.get("safety_flags") == [], "Accepted turn differs from the frozen scenario")
    if order >= 90:
        require(receipt.get("transport_amendment") == {"continuation": "resume-06", "policy": "bounded_transient_retry_v2",
            "policy_source_continuation": "resume-06", "max_attempts": 3, "timeout_retry_delays_seconds": [30, 60],
            "rate_limit_retry_delays_seconds": [60, 120], "honor_retry_after": True, "maximum_retry_wait_seconds": 300,
            "continuation_manifest_sha256": PREVIOUS_MANIFEST}, "Transport policy provenance changed")
        restore = receipt["restored_before_first_request"]
        require(restore.get("total_turns") == (index - 1) * 5
                and restore.get("history_turns") == ((index - 1) * 5 if item["arm"] == "flat_full_history" else min(5, (index - 1) * 5)), "Fresh-process restore differs")
    require(sha256(original / "generation" / config["case_path"]) == config["case_sha256"]
            and sha256(original / config["profile_path"]) == config["source_yaml_sha256"], "Clinical source changed")
    if order < 290:
        require(not receipt.get("error") and receipt.get("finalization"), "Completed receipt contains an error")
    else:
        require("finalization" not in receipt and "state_files_at_close" not in receipt, "Stopped session already finalized")
    return receipt, config


def _suffix(path, prior=None):
    raw = path.read_bytes()
    old = prior.read_bytes() if prior is not None else b""
    require(raw.startswith(old), "Preserved archive bytes changed")
    return raw, old, _rows(raw[len(old):])


def _pairs(path, prior, ids, base):
    raw, old, rows = _suffix(path, prior)
    require(len(rows) % 2 == 0, "Native request lacks an outcome")
    chunks, offset, result = raw[len(old):].splitlines(keepends=True), len(old), []
    for i in range(0, len(rows), 2):
        sent, received = rows[i:i + 2]
        record_id = sent.get("record_id")
        require(sent.get("event") == "request" and received.get("event") in {"response", "error"}
                and isinstance(record_id, str) and record_id and record_id not in ids["wire_ids"]
                and received.get("record_id") == record_id, "Missing, reused or unpaired native record")
        ids["wire_ids"].add(record_id)
        for row in (sent, received):
            require(row.get("endpoint") == base.ENDPOINT and row.get("safety_settings_forwarded") is False
                    and row.get("omitted_legacy_generation_parameters") == ["top_k"]
                    and row.get("request") == sent.get("request"), "Native request/provenance changed")
        response = received.get("response", {})
        if record_id != FINAL_ID:
            response_id = response.get("id")
            require(received.get("http_status") == 200 and response.get("model") == base.MODEL
                    and isinstance(response_id, str) and response_id and response_id not in ids["wire_response_ids"], "Native response model/status/identity differs")
            ids["wire_response_ids"].add(response_id)
        result.append({"sent": sent, "received": received, "offset": offset, "prefix_hash": base.digest_bytes(raw[:offset])})
        offset += len(chunks[i]) + len(chunks[i + 1])
    return result


def _retry_groups(rows, requests, pairs, ids, base, policy):
    by_id = {p["sent"]["record_id"]: p for p in pairs}
    groups, counts, i = {}, Counter(), 0
    while i < len(rows):
        start = rows[i]
        i += 1
        gate, group_id = start.get("gate_request_id"), start.get("group_id")
        require(start.get("event") == "group_start" and gate in requests and gate not in groups
                and isinstance(group_id, str) and group_id and group_id not in ids["retry_groups"], "Foreign/repeated retry group")
        ids["retry_groups"].add(group_id)
        request, used, previous_error_time, delay = requests[gate], [], None, 0
        body = base._body(request)
        common = {"group_id": group_id, "gate_request_id": gate, "request_sha256": base._canonical_hash(body),
            "invocation_sha256": base._canonical_hash({"prompt": request["prompt"], "generation_config": request["generation_config"], "safety_settings": {}}),
            "prompt_sha256": base.digest_bytes(request["prompt"].encode()), "model": base.MODEL, "policy": "resume-06-v1"}
        require(all(start.get(k) == v for k, v in common.items()) and start.get("max_attempts") == 3
                and start.get("retry_delays_seconds") == [30, 60] and start.get("rate_limit_retry_delays_seconds") == [60, 120]
                and start.get("max_retry_wait_seconds") == 300, "Retry policy/configuration changed")
        for attempt in range(1, 4):
            require(i + 1 < len(rows), "Incomplete retry attempt")
            began, outcome = rows[i:i + 2]
            i += 2
            require(began.get("event") == "attempt_start" and began.get("attempt") == outcome.get("attempt") == attempt
                    and all(row.get(k) == v for row in (began, outcome) for k, v in common.items()), "Retry attempt order/identity differs")
            record_id = outcome.get("native_record_id")
            require(record_id in by_id and record_id not in used, "Retry has no distinct native archive")
            pair = by_id[record_id]
            require(pair["sent"]["request"] == body and began.get("native_archive_offset") == pair["offset"]
                    and began.get("native_archive_prefix_sha256") == pair["prefix_hash"], "Retry archive prefix/body changed")
            if previous_error_time is not None:
                require(base._time(began["timestamp"]) >= previous_error_time + delay - .01, "Retry started before the required wait")
            used.append(record_id)
            received = pair["received"]
            if outcome.get("event") == "attempt_error":
                raw = received.get("response")
                require(received.get("event") == "error" and policy._no_visible_completion(raw), "Retry error has an ambiguous or visible completion")
                if record_id == FINAL_ID:
                    require(received.get("http_status") == 402 and received.get("error", {}).get("type") == "OpenRouterHTTPError"
                            and raw.get("error", {}).get("code") == 402, "Terminal HTTP 402 claim differs")
                    reason, code = None, None
                else:
                    choices = raw.get("choices", [])
                    code = choices[0].get("error", {}).get("code") if choices else None
                    require(received.get("http_status") == 200 and received.get("error", {}).get("type") == "OpenRouterInBandError"
                            and code in {429, 504} and policy._all_choice_codes(raw, code), "Unexpected error outside the authorized transient policy")
                    reason = f"explicit_native_{code}_without_visible_completion"
                require(received.get("retry_after") in (None, "120"), "Unexpected Retry-After at the audited checkpoint")
                decision = policy._retry_decision(reason, received, attempt)
                require(outcome.get("http_status") == received.get("http_status") and outcome.get("error_type") == received["error"]["type"]
                        and outcome.get("upstream_code") == code and outcome.get("retry_reason") == reason
                        and outcome.get("retry_eligible") is (reason is not None)
                        and all(outcome.get(k) == v for k, v in decision.items()), "Retry decision differs from the frozen policy")
                counts["errors"] += 1
                if decision["will_retry"]:
                    require(record_id != FINAL_ID and attempt < 3, "Terminal error was retried")
                    counts["recovered_rate_limits" if code == 429 else "recovered_timeouts"] += 1
                    previous_error_time, delay = base._time(outcome["timestamp"]), decision["delay_seconds"]
                    continue
                require(record_id == FINAL_ID and attempt == 1 and decision["decision"] == "not_retryable", "Unexpected exhausted/terminal retry group")
                final_fields = {"outcome": "non_retryable_error", "error_type": "OpenRouterHTTPError"}
            else:
                raw = received.get("response", {})
                require(outcome.get("event") == "attempt_response" and received.get("event") == "response"
                        and outcome.get("response_id") == raw.get("id") and outcome.get("raw_model") == base.MODEL
                        and outcome.get("backend") == raw.get("provider") and outcome.get("http_status") == 200
                        and outcome.get("finish_reasons") == [c.get("finish_reason") for c in raw["choices"]], "Successful retry provenance differs")
                final_fields = {"outcome": "returned_response", "response_id": raw["id"], "last_attempt_minimum_start_interval_seconds": 5}
            require(i < len(rows), "Missing group completion")
            final = rows[i]
            i += 1
            require(final.get("event") == "group_finished" and final.get("attempt") == attempt and final.get("native_record_id") == record_id
                    and all(final.get(k) == v for k, v in {**common, **final_fields}.items()), "Retry group final outcome differs")
            if received["event"] == "response":
                require(base._time(final["timestamp"]) >= base._time(began["timestamp"]) + 4.99, "Minimum request-start interval violated")
            groups[gate] = used
            break
        require(gate in groups, "Retry group did not complete")
    require(set(groups) == set(requests), "Missing or foreign retry group")
    return groups, counts


def _audit_delta(directory, prior, receipt, item, ids, base, prefix, old_audit, policy):
    old_path = lambda name: prior / name if prior is not None else None
    _, _, events = _suffix(directory / "generation-events.jsonl", old_path("generation-events.jsonl"))
    pairs = _pairs(directory / "openrouter-api-records.jsonl", old_path("openrouter-api-records.jsonl"), ids, base)
    _, _, journal = _suffix(directory / "timeout-retries.jsonl", old_path("timeout-retries.jsonl"))
    calls, i = [], 0
    while i < len(events):
        require(i + 1 < len(events), "Generation lacks an outcome")
        request, outcome = events[i:i + 2]
        i += 2
        require(request.get("event") == "request" and outcome.get("event") in {"outcome", "error"}
                and request.get("arm") == item["arm"] and request.get("session_index") == item["session_index"]
                and request.get("turn_id") in {None, *item["turn_ids"]}
                and outcome.get("logical_id") == request.get("logical_id") and outcome.get("attempt") == request.get("attempt")
                and outcome.get("stage") == request.get("stage"), "Logical generation identity/order differs")
        for key, value in (("all_gates", request.get("gate_request_id")), ("all_logicals", request.get("logical_id"))):
            require(isinstance(value, str) and value and value not in ids[key], "Missing/repeated logical generation or gate")
            ids[key].add(value)
        fatal = None
        if i < len(events) and events[i].get("event") == "fatal":
            fatal = events[i]
            i += 1
        calls.append((request, outcome, fatal))
    groups, counts = _retry_groups(journal, {r["gate_request_id"]: r for r, _, _ in calls}, pairs, ids, base, policy)
    by_id = {p["sent"]["record_id"]: p for p in pairs}
    successful_events, successful_wire, used, terminal = [], [], [], None
    for request, outcome, fatal in calls:
        record_id = outcome.get("native_record_id")
        require(record_id in by_id and groups[request["gate_request_id"]][-1] == record_id, "Generation is not the last native group outcome")
        pair = by_id[record_id]
        require(pair["sent"]["request"] == base._body(request), "Generation/native request differs")
        used.extend(groups[request["gate_request_id"]])
        if outcome["event"] == "error":
            require(item["execution_order"] == 290 and calls[-1][0] is request and record_id == FINAL_ID, "Unexpected terminal generation")
            fields = {"kind": "provider_error", "stage": "generate_response", "error_type": "OpenRouterHTTPError",
                "http_status": 402, "native_record_id": FINAL_ID, "upstream_code": None}
            require(fatal is not None and all(outcome.get(k) == fatal.get(k) == v for k, v in fields.items())
                    and outcome.get("accepted") is not True and not outcome.get("text")
                    and request.get("turn_id") == "s10t05" and request.get("graph_requested_config") == {"temperature": None, "max_tokens": None, "thinking_budget": None},
                    "Terminal generation error/fatal differs")
            native = pair["received"]
            raw = native.get("response", {})
            error = raw.get("error", {})
            require(native.get("event") == "error" and native.get("retry_after") == "120"
                    and native.get("error") == {"type": "OpenRouterHTTPError", "message": "OpenRouter HTTP 402."}
                    and raw.get("choices") is None and error.get("code") == 402
                    and error.get("message") == "This request would exceed your available credits given your current in-flight requests. Retry after in-flight requests settle, or add credits."
                    and error.get("metadata", {}).get("reason") == "in_flight_budget_exhausted"
                    and error.get("metadata", {}).get("limit_source") == "openrouter_in_flight_budget"
                    and error.get("metadata", {}).get("headers") == {"Retry-After": "120"}, "Final archived credit failure changed or has a completion")
            size = len(request["prompt"].encode())
            require(request.get("prompt_utf8_bytes") == size and request.get("estimated_prompt_tokens") == (size + 2) // 3
                    and request.get("estimated_prompt_token_limit") == 64000 and (size + 2) // 3 <= 64000
                    and request.get("prompt_token_estimate_method") == "utf8_bytes_div3_ceiling", "Terminal prompt measurement differs")
            terminal = {"request": request, "outcome": outcome, "fatal": fatal, "native": native}
        else:
            require(outcome.get("accepted") is True and fatal is None and pair["received"]["event"] == "response", "Unaccepted/uncertain generation in the bounded delta")
            successful_events.extend((request, outcome))
            successful_wire.extend((pair["sent"], pair["received"]))
    require(used == [p["sent"]["record_id"] for p in pairs], "Unclaimed, reordered or later native call")
    if prior is not None:
        # Four accepted pairs precede the archived failed classifier in S3.
        successful_events = read_jsonl(prior / "generation-events.jsonl")[:16] + successful_events
        successful_wire = read_jsonl(prior / "openrouter-api-records.jsonl")[:16] + successful_wire
    visible_item = {**item, "turn_ids": item["turn_ids"][:len(receipt["turns"])]}
    old_audit._audit_success_view(prefix, directory, receipt, visible_item, ids, successful_events, successful_wire)
    counts.update(native_requests=len(pairs), responses=sum(p["received"]["event"] == "response" for p in pairs), logical_requests=len(calls))
    return counts, terminal, calls


def _recovery(previous, frozen, receipt, calls):
    path = previous / "snapshot" / RECOVERED_RUN / "sessions/session_03/session.json"
    old = read_json(path)
    require(receipt.get("recovery") == {"continuation": "resume-06", "preserved_turns": 4, "classifier_reused": False,
        "affect_update_recomputed": False, "process_rng_reinitialized": True, "preserved_run_turns": 14,
        "original_stopped_receipt_sha256": sha256(path), "original_error": old["error"], "original_finished_at": old["finished_at"]}, "Classifier recovery provenance changed")
    saved, current = frozen["failed_request"], calls[0][0]
    require(current["stage"] == "classify_topic_and_emotion" and current["turn_id"] == "s03t05"
            and all(current.get(k) == saved.get(k) for k in ("prompt", "generation_config", "graph_requested_config", "arm", "session_index", "turn_id")), "Recovered classifier differs from the saved failed request")
    proof = read_jsonl(previous.parents[1] / "runtime" / RECOVERED_RUN / "sessions/session_03/recovery-resume06.jsonl")
    require(len(proof) == 1 and all(proof[0].get(k) == v for k, v in {"event": "resume_classifier_verified", "mode": "live",
        "prompt_identical_to_failed_request": True, "prompt_sha256": hashlib.sha256(saved["prompt"].encode()).hexdigest(),
        "prior_logical_id": saved["logical_id"], "prior_native_record_id": frozen["failed_outcome"]["native_record_id"],
        "graph_requested_config": saved["graph_requested_config"]}.items()), "Classifier recovery proof differs")


def _flat_prompts(original, config, receipts, contract, terminal):
    run = original / "runtime" / config["run_id"]
    ledger = read_jsonl(run / "accepted-turns.jsonl")
    case = (original / "generation" / config["case_path"]).read_text(encoding="utf-8")
    for receipt in receipts:
        for turn in receipt["turns"]:
            n = turn["turn_index"] - 1
            prompt = contract.render_prompt(case_block=case,
                arm_context=contract.render_flat_history(ledger[:n], run_id=config["run_id"], expected_prior_turns=n),
                latest_question=turn["therapist_text"])
            require(turn.get("history_turns_in_prompt") == n and turn["prompt"] == prompt, "Flat prompt does not contain the exact complete own history")
    if config["run_id"] == RUN_ID:
        scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][9]
        require(len(ledger) == 49 and len(receipts) == 10, "Wrong partial flat ledger")
        expected = contract.render_prompt(case_block=case,
            arm_context=contract.render_flat_history(ledger, run_id=RUN_ID, expected_prior_turns=49),
            latest_question=scenario["turns"][4]["text"])
        require(terminal["request"]["prompt"] == expected, "Failed patient prompt differs from the frozen case and all 49 accepted turns")


def _processes(original, previous, schedule, receipts, launch):
    _, _, rows = _suffix(original / "runtime/processes.jsonl", previous / "snapshot/processes.jsonl")
    started = read_json(previous / "started.json")
    require(len(rows) == 403 and rows[0].get("event") == "continuation_authorized" and rows[0].get("next_execution_order") == 90
            and rows[0].get("continuation") == "resume-06" and rows[0].get("controller_pid") == started.get("pid")
            and started.get("manifest_sha256") == PREVIOUS_MANIFEST, "Foreign/additional authorized controller")
    for n, item in enumerate(schedule[89:290]):
        begin, end = rows[1 + n * 2:3 + n * 2]
        receipt = receipts[item["execution_order"] - 1]
        require(begin.get("event") == "start" and end.get("event") == "exit"
                and all(row.get(k) == v for row in (begin, end) for k, v in item.items())
                and begin.get("pid") == end.get("pid") == receipt["pid"]
                and begin.get("continuation") == end.get("continuation") == "resume-06"
                and end.get("exit_code") == (1 if item["execution_order"] == 290 else 0)
                and begin.get("command", [])[1:] == [str(previous / "worker.py"), "run", "--execution-order", str(item["execution_order"]), "--launch-id", launch["launch_id"]], "Worker chronology, command or exit differs")


def _audit_checkpoint(original):
    runtime = original / "runtime"
    before = snapshot(runtime)
    previous, frozen, predecessor, base, prefix, old_audit, policy, contract = _verify_chain(original)
    schedule = read_json(original / "generation/schedule.json")["session_executions"]
    require(len(schedule) == 330 and [r["execution_order"] for r in schedule] == list(range(1, 331))
            and schedule[289]["run_id"] == RUN_ID and schedule[289]["session_index"] == 10, "Wrong scheduled checkpoint")
    ids = predecessor._identities(previous)
    receipts, configs, by_run, totals = [], {}, defaultdict(list), Counter()
    allowed, terminal = set(frozen["runtime_file_sha256"]), None
    for item in schedule[:290]:
        receipt, config = _receipt(original, item)
        run_id, index, order = item["run_id"], item["session_index"], item["execution_order"]
        require(index == len(by_run[run_id]) + 1 and receipt["process_instance_id"] not in ids["process_ids"], "Missing/reordered session or reused process")
        ids["process_ids"].add(receipt["process_instance_id"])
        receipts.append(receipt)
        configs[run_id] = config
        by_run[run_id].append(receipt)
        if order < 90:
            continue
        relative = f"{run_id}/sessions/session_{index:02d}"
        prior = previous / "snapshot" / relative if order == 90 else None
        delta, failed, calls = _audit_delta(runtime / relative, prior, receipt, item, ids, base, prefix, old_audit, policy)
        totals.update(delta)
        if order == 90:
            _recovery(previous, frozen, receipt, calls)
            allowed.update(f"{relative}/{name}" for name in ("recovery-resume06.jsonl", "worker-resume06.log"))
        else:
            allowed.update(f"{relative}/{name}" for name in ("session.json", "generation-events.jsonl", "openrouter-api-records.jsonl", "timeout-retries.jsonl", "worker.log"))
        if failed is not None:
            require(terminal is None, "Multiple terminal failures")
            terminal = failed
    require(totals == {"native_requests": 1928, "responses": 1905, "errors": 23,
        "recovered_timeouts": 20, "recovered_rate_limits": 2, "logical_requests": 1906}, "Delta request/outcome counts differ")
    base.RUN_ID = "__no_partial_native_run__"
    for run_id, saved in by_run.items():
        allowed.add(f"{run_id}/accepted-turns.jsonl")
        allowed.update(base._audit_run(original, configs[run_id], saved, prefix, None))
        if configs[run_id]["arm"] == "flat_full_history":
            _flat_prompts(original, configs[run_id], saved, contract, terminal)
    accepted = sum(len(r["turns"]) for r in receipts)
    probes = sum(t["turn_id"] in {"s10t01", "s11t01", "s11t02", "s11t03", "s11t04", "s11t05"} for r in receipts for t in r["turns"])
    require(accepted == 1449 and accepted - frozen["accepted_turns"] == 1000 and probes == 20, "Accepted/probe counts do not reconcile with preserved prefix")
    stop, gate = read_json(runtime / "STOP"), read_json(runtime / "request-gate.json")
    require(terminal is not None and stop == terminal["fatal"] and receipts[-1].get("error", {}).get("type") == "IntegrationAbort"
            and receipts[-1]["error"].get("details") == {k: v for k, v in stop.items() if k not in {"event", "timestamp"}}, "STOP/receipt differs from terminal patient failure")
    flight = gate.get("in_flight")
    require(isinstance(flight, dict) and flight.get("gate_request_id") == terminal["request"]["gate_request_id"]
            and flight.get("pid") == receipts[-1]["pid"] and flight.get("started_at") == gate.get("last_started")
            and type(gate.get("last_started")) in (int, float) and math.isfinite(gate["last_started"]), "Foreign terminal gate")
    manifest_hash = sha256(original / "manifest.json")
    launch = read_json(runtime / "launch.json")
    require(launch.get("execution_manifest_sha256") == manifest_hash and launch.get("mode") == "live_openrouter"
            and read_json(runtime / "active-execution.json") == {**schedule[289], "launch_id": launch["launch_id"]}, "Foreign current execution")
    progress = read_json(runtime / "progress.json")
    require(all(progress.get(k) == v for k, v in {"status": "stopped", "completed_sessions": 289, "accepted_turns": 1449,
            "requests": 2788, "responses": 2755, "provider_errors": 33, "observed_probes": 20,
            "application_guard_failures": 0, "stop": stop}.items()), "Progress contradicts reconciled evidence")
    _processes(original, previous, schedule, receipts, launch)
    require(set(before) <= allowed, "Unknown or later runtime artifact")
    directories = {parent.as_posix() for name in allowed for parent in Path(name).parents}
    for item in schedule[:290]:
        testdir = f"{item['run_id']}/sessions/session_{item['session_index']:02d}/tests"
        directories.update({f"{item['run_id']}/memory", testdir, testdir + "/runs"})
    require(all(p.relative_to(runtime).as_posix() in directories for p in runtime.rglob("*") if p.is_dir()), "Later runtime directory exists")
    require(snapshot(runtime) == before, "Runtime changed during the offline audit")
    wire_path = f"{RUN_ID}/sessions/session_10/openrouter-api-records.jsonl"
    native = terminal["native"]
    return {"status": "passed", "audited_at": datetime.now(timezone.utc).isoformat(), "completed_sessions": 289,
        "accepted_turns": 1449, "requests": 2788, "responses": 2755, "provider_errors": 33, "observed_probes": 20,
        "next_execution_order": 290, "run_id": RUN_ID, "session_index": 10, "session_id": "comparison_s10",
        "patient_id": receipts[-1]["patient_id"], "therapist_id": receipts[-1]["therapist_id"], "partial_accepted_turns": 4,
        "run_accepted_turns": 49, "next_turn_id": "s10t05", "runtime_file_sha256": before, "runtime_hash_paths_relative_to": "runtime/",
        "stop": stop, "gate": gate, "failed_request": terminal["request"], "failed_outcome": terminal["outcome"],
        "execution_manifest_sha256": manifest_hash, "previous_manifest_sha256": PREVIOUS_MANIFEST,
        "live_requests_by_audit": 0, "preserved_prefix_turns": 449, "new_accepted_turns": 1000,
        "delta_requests": 1928, "delta_responses": 1905, "delta_provider_errors": 23,
        "recovered_timeouts_in_delta": 20, "recovered_rate_limits_in_delta": 2,
        "archived_error": {"kind": "provider_error", "stage": "generate_response", "record_id": FINAL_ID,
            "response_id": None, "http_status": 402, "upstream_code": None, "error_type": "OpenRouterHTTPError",
            "provider_error_code": 402, "provider_error_reason": "in_flight_budget_exhausted",
            "message": native["response"]["error"]["message"], "retry_after": "120", "visible_content_present": False,
            "wire_path": wire_path, "wire_sha256": sha256(runtime / wire_path)},
        "limitations": ["The frozen predecessor establishes prior evidence; this audit reconciles the bounded delta.",
                        "Credit availability and semantic performance are not evaluated by this offline audit."]}


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
