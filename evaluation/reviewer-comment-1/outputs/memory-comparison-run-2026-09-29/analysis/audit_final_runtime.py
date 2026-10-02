"""Offline final runtime audit and operational metrics, without reading ratings.

The frozen resume-07 checkpoint proves the first 1,449 accepted turns. Its
preserved-prefix verifier and the unchanged resume-06 retry validator establish
the remaining delta. All current receipts, native state and HTTP/logical call
identities are reconciled again for the metrics. No provider/credential access.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from types import ModuleType, SimpleNamespace

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parent
PREVIOUS_MANIFEST = "cf593f819b37d201bee1aca15e921786bda26229dd4e843aea6acb2362e61bee"
RECOVERED_RUN = "jason_smith_001__r01__flat_full_history"
PROBES = {"s10t01", "s11t01", "s11t02", "s11t03", "s11t04", "s11t05"}


class AuditError(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise AuditError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_jsonl(path):
    raw = Path(path).read_bytes()
    require(not raw or raw.endswith(b"\n"), f"Incomplete JSONL tail: {path}")
    rows = [json.loads(line) for line in raw.splitlines()]
    require(all(isinstance(row, dict) for row in rows), f"Non-object JSONL record: {path}")
    return rows


def inventory(root):
    values = {}
    for path in sorted(Path(root).rglob("*")):
        require(not path.is_symlink(), "Symlink encountered in audited evidence")
        if path.is_file():
            values[path.relative_to(root).as_posix()] = digest(path)
    return values


def load_source(path, name):
    module = ModuleType(name)
    module.__file__ = str(path)
    exec(compile(path.read_bytes(), str(path), "exec"), module.__dict__)
    return module


def verify_chain(original):
    previous = original / "continuations/resume-07"
    require(digest(previous / "manifest.json") == PREVIOUS_MANIFEST, "Wrong final continuation manifest")
    source_hashes = {"manifest.json": digest(original / "manifest.json")}
    original_manifest = read_json(original / "manifest.json")
    for name, expected in original_manifest["files"].items():
        require(digest(original / name) == expected, f"Original frozen input changed: {name}")
        source_hashes[name] = expected
    lineage = []
    for index in range(1, 8):
        root = original / "continuations" / f"resume-{index:02d}"
        manifest = read_json(root / "manifest.json")
        require(manifest["original_execution_manifest_sha256"] == source_hashes["manifest.json"], "Foreign continuation lineage")
        source_hashes[(root / "manifest.json").relative_to(original).as_posix()] = digest(root / "manifest.json")
        for name, expected in manifest["files"].items():
            path = root / name
            require(not Path(name).is_absolute() and ".." not in Path(name).parts
                    and path.resolve().is_relative_to(root.resolve()) and digest(path) == expected, f"Frozen continuation input changed: {path}")
            source_hashes[path.relative_to(original).as_posix()] = expected
        sealed = read_json(root / "snapshot-manifest.json")["files"]
        require(inventory(root / "snapshot") == sealed, "Frozen checkpoint snapshot differs")
        for name, expected in sealed.items():
            source_hashes[(root / "snapshot" / name).relative_to(original).as_posix()] = expected
        if "previous_continuation_manifest_sha256" in manifest:
            require(manifest["previous_continuation_manifest_sha256"] == digest(root.parent / f"resume-{index - 1:02d}/manifest.json"), "Predecessor manifest chain differs")
        lineage.append({"continuation": root.name, "manifest_sha256": digest(root / "manifest.json"),
            "snapshot_files": len(sealed), "accepted_turns_preserved": manifest["accepted_turns_preserved"],
            "next_execution_order": manifest["next_execution_order"]})
    credit = load_source(previous / "checkpoint_audit.py", "_final_credit_audit")
    # These functions verify all earlier code/manifests and their preserved
    # prefixes using read-only facades, without importing graph/provider code.
    _, _, predecessor, base, prefix, old_audit, policy, contract = credit._verify_chain(original)
    facade = SimpleNamespace(verify=lambda: credit._verify_original(original), read_json=read_json, digest=digest)
    controller = credit._load(previous / "continue_run.py", "_final_controller07", {
        "paired_runner": facade, "worker": SimpleNamespace(RUN_ID=RECOVERED_RUN)})
    controller.verify()
    controller.verify_preserved_prefix()
    frozen = read_json(previous / "checkpoint-audit.json")
    require(frozen["runtime_file_sha256"] == read_json(previous / "snapshot-manifest.json")["files"], "Checkpoint report differs from sealed inventory")
    require((previous / "resolved-stop.json").read_bytes() == (previous / "snapshot/STOP").read_bytes(), "Credit STOP was not retained")
    resolution = read_json(previous / "resolution.json")
    require(resolution["previous_gate"] == frozen["gate"] and resolution["terminal_failure"] == frozen["archived_error"], "Credit-stop resolution differs")
    require(digest(previous / "timeout_retries.py") == digest(original / "continuations/resume-06/timeout_retries.py"), "Final transport policy changed")
    for root in (original / "continuations").iterdir():
        if root.name in {f"resume-{i:02d}" for i in range(1, 8)}:
            for name in ("resolved-stop.json", "resolution.json", "started.json", "state.json"):
                path = root / name
                if path.is_file():
                    source_hashes[path.relative_to(original).as_posix()] = digest(path)
    source_hashes[Path(__file__).resolve().relative_to(original).as_posix()] = digest(__file__)
    return previous, frozen, credit, predecessor, base, prefix, old_audit, policy, contract, lineage, source_hashes


def receipt_and_config(original, item):
    run_id, index = item["run_id"], item["session_index"]
    config = read_json(original / "generation/runs" / f"{run_id}.json")
    path = original / "runtime" / run_id / "sessions" / f"session_{index:02d}/session.json"
    receipt = read_json(path)
    expected = {"run_id": run_id, "arm": item["arm"], "profile_id": config["profile_id"], "patient_id": config["native_api_id"],
        "archived_patient_id": config["archived_patient_id"], "therapist_id": f"comparison_{run_id}", "session_index": index,
        "session_id": f"comparison_s{index:02d}", "status": "completed", "inference_mode": "live_openrouter",
        "requested_model": "google/gemini-2.5-pro", "provider_seed": None, "case_sha256": config["case_sha256"],
        "prior_finalized_sessions": index - 1, "execution_manifest_sha256": digest(original / "manifest.json")}
    require(config["run_id"] == run_id and config["arm"] == item["arm"]
            and all(receipt.get(k) == v for k, v in expected.items()) and receipt.get("finished_at")
            and receipt.get("process_instance_id") and not receipt.get("cleanup_errors") and not receipt.get("error")
            and receipt.get("finalization") and len(receipt.get("turns", [])) == len(item["turn_ids"]) == 5, "Incomplete or foreign scheduled receipt")
    scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][index - 1]
    for n, (turn, planned) in enumerate(zip(receipt["turns"], scenario["turns"]), 1):
        require(turn.get("run_id") == run_id and turn.get("status") == "accepted" and turn.get("session_index") == index
                and turn.get("turn_index") == (index - 1) * 5 + n and turn.get("turn_id") == planned["turn_id"] == item["turn_ids"][n - 1]
                and turn.get("therapist_text") == turn.get("safe_user_input") == planned["text"]
                and isinstance(turn.get("patient_text"), str) and turn["patient_text"].strip()
                and turn.get("application_guard_failure") is False and turn.get("safety_flags") == [], "Missing, altered or guarded accepted turn")
    if item["execution_order"] >= 290:
        require(receipt.get("transport_amendment") == {"continuation": "resume-07", "policy": "bounded_transient_retry_v2",
            "policy_source_continuation": "resume-06", "max_attempts": 3, "timeout_retry_delays_seconds": [30, 60],
            "rate_limit_retry_delays_seconds": [60, 120], "honor_retry_after": True, "maximum_retry_wait_seconds": 300,
            "continuation_manifest_sha256": PREVIOUS_MANIFEST}, "Final continuation policy provenance differs")
    restore = receipt["restored_before_first_request"]
    require(restore.get("total_turns") == (index - 1) * 5 and restore.get("history_turns") == (
        (index - 1) * 5 if item["arm"] == "flat_full_history" else min(5, (index - 1) * 5)), "Fresh-process restored history differs")
    require(digest(original / "generation" / config["case_path"]) == config["case_sha256"]
            and digest(original / config["profile_path"]) == config["source_yaml_sha256"], "Frozen clinical source changed")
    return receipt, config


def _seed_identities(previous):
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
                # A native HTTP 402 has an error payload, without a response ID.
                response_id = (row.get("response") or {}).get("id")
                if response_id is not None:
                    ids["wire_response_ids"].add(response_id)
    for path in (previous / "snapshot").glob("*/sessions/*/timeout-retries.jsonl"):
        ids["retry_groups"].update(row["group_id"] for row in read_jsonl(path))
    return ids


def audit_delta(original, previous, frozen, schedule, receipts, credit, predecessor, base, prefix, old_audit, policy):
    ids, totals = _seed_identities(previous), Counter()
    for item in schedule[frozen["next_execution_order"] - 1:]:
        relative = f"{item['run_id']}/sessions/session_{item['session_index']:02d}"
        directory = original / "runtime" / relative
        receipt = receipts[item["execution_order"] - 1]
        if item["execution_order"] == frozen["next_execution_order"]:
            # Use only the added patient call; retain physical offsets and all
            # prior bytes in the frozen helper's archive-prefix checks.
            suffix = credit._suffix
            targets = {directory / name: previous / "snapshot" / relative / name
                       for name in ("generation-events.jsonl", "openrouter-api-records.jsonl", "timeout-retries.jsonl")}
            credit._suffix = lambda path, prior=None: suffix(path, targets.get(Path(path), prior))
            try:
                counts, terminal, calls = credit._audit_delta(directory, None, {**receipt, "turns": receipt["turns"][-1:]},
                    {**item, "turn_ids": item["turn_ids"][-1:]}, ids, base, prefix, old_audit, policy)
            finally:
                credit._suffix = suffix
            old_path = previous / "snapshot" / relative / "session.json"
            old = read_json(old_path)
            require(receipt.get("recovery") == {"continuation": "resume-07", "preserved_turns": 4, "preserved_run_turns": 49,
                "original_stopped_receipt_sha256": digest(old_path), "original_error": old["error"], "original_finished_at": old["finished_at"]}, "Credit recovery receipt differs")
            saved = frozen["failed_request"]
            require(len(calls) == 1 and all(calls[0][0].get(k) == saved.get(k) for k in (
                "prompt", "generation_config", "graph_requested_config", "stage", "arm", "session_index", "turn_id")), "Recovered patient call differs from the failed request")
            proof = read_json(directory / "recovery-resume07.json")
            require(all(proof.get(k) == v for k, v in {"continuation": "resume-07", "preserved_turns": 4, "preserved_run_turns": 49,
                "prompt_identical_to_failed_request": True, "prompt_sha256": hashlib.sha256(saved["prompt"].encode()).hexdigest(),
                "prior_failed_logical_id": saved["logical_id"], "prior_failed_native_record_id": frozen["failed_outcome"]["native_record_id"],
                "graph_requested_config": saved["graph_requested_config"], "mode": "live"}.items()), "Credit recovery proof differs")
        else:
            counts, terminal, _ = credit._audit_delta(directory, None, receipt, item, ids, base, prefix, old_audit, policy)
        require(terminal is None, "Final delta contains a terminal stop")
        totals.update(counts)
    return dict(totals)


def distribution(values):
    values = sorted(values)
    if not values:
        return {"n": 0}
    return {"n": len(values), "sum": round(sum(values), 9), "mean": round(statistics.fmean(values), 6),
        "median": round(statistics.median(values), 6), "p95_nearest_rank": round(values[math.ceil(.95 * len(values)) - 1], 6),
        "min": round(values[0], 6), "max": round(values[-1], 6)}


def metric_bucket():
    return {"counts": Counter(), "cost": defaultdict(Decimal), "cost_coverage": Counter(),
        "usage_sum": defaultdict(Counter), "usage_coverage": defaultdict(Counter),
        "native_seconds": defaultdict(list), "logical_seconds": [], "backends": Counter(), "models": Counter()}


def add_http(bucket, received):
    event = received["event"]
    bucket["counts"]["requests"] += 1
    bucket["counts"]["responses" if event == "response" else "errors"] += 1
    raw = received.get("response") or {}
    usage = raw.get("usage") or {}
    if isinstance(usage.get("cost"), (int, float)):
        bucket["cost"][event] += Decimal(str(usage["cost"]))
        bucket["cost_coverage"][event] += 1
    fields = {"prompt_tokens": usage.get("prompt_tokens"), "completion_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"), "reasoning_tokens": usage.get("completion_tokens_details", {}).get("reasoning_tokens"),
        "cached_prompt_tokens": usage.get("prompt_tokens_details", {}).get("cached_tokens")}
    for name, value in fields.items():
        if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
            bucket["usage_sum"][event][name] += value
            bucket["usage_coverage"][event][name] += 1
    elapsed = received.get("elapsed_seconds")
    if isinstance(elapsed, (int, float)) and math.isfinite(elapsed) and elapsed >= 0:
        bucket["native_seconds"][event].append(elapsed)
    bucket["backends"][str(raw.get("provider"))] += 1
    bucket["models"][str(raw.get("model"))] += 1


def finish_bucket(bucket):
    counts = {name: bucket["counts"][name] for name in ("requests", "responses", "errors", "logical_requests")}
    return {**counts,
        "reported_response_cost_usd": float(bucket["cost"]["response"]), "responses_with_reported_cost": bucket["cost_coverage"]["response"],
        "reported_error_cost_usd": float(bucket["cost"]["error"]), "errors_with_reported_cost": bucket["cost_coverage"]["error"],
        "response_usage": {"sums": dict(bucket["usage_sum"]["response"]), "coverage": dict(bucket["usage_coverage"]["response"])},
        "error_usage": {"sums": dict(bucket["usage_sum"]["error"]), "coverage": dict(bucket["usage_coverage"]["error"])},
        "native_http_elapsed_seconds": {event: distribution(bucket["native_seconds"][event]) for event in ("response", "error")},
        "logical_generation_elapsed_seconds": distribution(bucket["logical_seconds"]),
        "archived_backend_counts": dict(bucket["backends"]), "archived_model_counts": dict(bucket["models"])}


def collect_metrics(original, schedule, receipts, configs, base, prefix, contract):
    runtime = original / "runtime"
    overall = metric_bucket()
    by_arm, by_stage, by_arm_stage = defaultdict(metric_bucket), defaultdict(metric_bucket), defaultdict(metric_bucket)
    patient = defaultdict(lambda: defaultdict(list))
    arm_counts, errors, manual_empty, global_wire_ids, global_logical_ids = defaultdict(Counter), [], [], set(), set()
    auto_ids, manual_ids, used_logical_ids = set(), set(), set()
    request_parameter_counts = Counter()
    case_hashes = defaultdict(set)
    patient_logical_case_checks = 0
    case_cache, ledger_cache = {}, {}
    for config in configs.values():
        case_cache[config["run_id"]] = (original / "generation" / config["case_path"]).read_text(encoding="utf-8")
        ledger_cache[config["run_id"]] = read_jsonl(runtime / config["run_id"] / "accepted-turns.jsonl")
        case_hashes[config["profile_id"]].add(config["case_sha256"])
    require(all(len(values) == 1 for values in case_hashes.values()), "Arms/repeats do not share byte-identical clinical cases")
    for item, receipt in zip(schedule, receipts):
        run_id, arm = item["run_id"], item["arm"]
        directory = runtime / run_id / "sessions" / f"session_{item['session_index']:02d}"
        events = read_jsonl(directory / "generation-events.jsonl")
        wire = read_jsonl(directory / "openrouter-api-records.jsonl")
        require(len(wire) % 2 == 0, "Unpaired HTTP archive")
        requests, outcomes, natives, accepted_patient, fatal_rows = {}, {}, {}, {}, []
        current = None
        for row in events:
            if row["event"] == "request":
                require(current is None and row["logical_id"] not in global_logical_ids, "Duplicate/unresolved logical call")
                require(row["arm"] == arm and row["session_index"] == item["session_index"], "Foreign logical request")
                base._body(row)
                global_logical_ids.add(row["logical_id"])
                requests[row["gate_request_id"]] = row
                current = row
                stage = row["stage"]
                for bucket in (overall, by_arm[arm], by_stage[stage], by_arm_stage[(arm, stage)]):
                    bucket["counts"]["logical_requests"] += 1
                request_parameter_counts[json.dumps({"stage": stage, "generation_config": row["generation_config"]}, sort_keys=True)] += 1
                if stage == "generate_response":
                    case = case_cache[run_id]
                    require(row["prompt"].count("<CASE>\n" + case + "</CASE>") == 1, "Patient request lacks the exact common clinical case")
                    patient_logical_case_checks += 1
                    if arm == "flat_full_history":
                        n = (item["session_index"] - 1) * 5 + int(row["turn_id"][-2:]) - 1
                        turn = ledger_cache[run_id][n]
                        expected = contract.render_prompt(case_block=case,
                            arm_context=contract.render_flat_history(ledger_cache[run_id][:n], run_id=run_id, expected_prior_turns=n),
                            latest_question=turn["therapist_text"])
                        require(row["prompt"] == expected, "Flat archived request omits/changes its complete own history")
            elif row["event"] in {"outcome", "error"}:
                require(current is not None and row.get("logical_id") == current["logical_id"] and row.get("stage") == current["stage"], "Logical outcome pairing differs")
                request = current
                current = None
                require(row["native_record_id"] not in outcomes, "One native outcome claimed twice")
                outcomes[row["native_record_id"]] = (request, row)
                elapsed = row.get("elapsed_seconds")
                if isinstance(elapsed, (int, float)) and math.isfinite(elapsed) and elapsed >= 0:
                    for bucket in (overall, by_arm[arm], by_stage[request["stage"]], by_arm_stage[(arm, request["stage"])]):
                        bucket["logical_seconds"].append(elapsed)
                if row["event"] == "error":
                    manual_ids.add(row["native_record_id"])
                elif row.get("accepted") is False:
                    manual_empty.append({"run_id": run_id, "session_index": item["session_index"], "stage": request["stage"],
                        "native_record_id": row["native_record_id"], "finish_reasons": row.get("finish_reasons"), "visible_characters": len(row.get("text", ""))})
                elif request["stage"] == "generate_response":
                    require(request["turn_id"] not in accepted_patient, "Duplicate accepted patient generation")
                    accepted_patient[request["turn_id"]] = (request, row)
            elif row["event"] == "fatal":
                fatal_rows.append(row)
            else:
                raise AuditError("Unrecognized logical event")
        require(current is None, "Unfinished logical request")
        retry_path = directory / "timeout-retries.jsonl"
        journal = read_jsonl(retry_path) if retry_path.exists() else []
        native_to_request = {native_id: pair[0] for native_id, pair in outcomes.items()}
        for row in journal:
            if row["event"] in {"attempt_error", "attempt_response"}:
                request = requests.get(row["gate_request_id"])
                require(request is not None, "Retry group refers to an absent logical request")
                native_id = row["native_record_id"]
                require(native_id not in native_to_request or native_to_request[native_id] == request, "Retry/native provenance conflict")
                native_to_request[native_id] = request
                if row["event"] == "attempt_error" and row.get("will_retry") is True:
                    auto_ids.add(native_id)
        for i in range(0, len(wire), 2):
            sent, received = wire[i:i + 2]
            native_id = sent.get("record_id")
            require(sent.get("event") == "request" and received.get("event") in {"response", "error"}
                    and native_id == received.get("record_id") and native_id not in global_wire_ids
                    and native_id in native_to_request, "Unpaired, duplicate or unclaimed native HTTP call")
            global_wire_ids.add(native_id)
            request = native_to_request[native_id]
            used_logical_ids.add(request["logical_id"])
            for row in (sent, received):
                require(row.get("endpoint") == base.ENDPOINT and row.get("request") == base._body(request)
                        and row.get("safety_settings_forwarded") is False and row.get("omitted_legacy_generation_parameters") == ["top_k"], "Native body/model/parameters differ from logical request")
            raw = received.get("response") or {}
            if received["event"] == "response":
                require(received.get("http_status") == 200 and raw.get("model") == base.MODEL, "Response provider/model changed")
                require(native_id in outcomes, "Successful native response is not its logical outcome")
                logical = outcomes[native_id][1]
                require(logical.get("response_id") == raw.get("id") and logical.get("native_usage") == raw.get("usage"), "Native outcome metadata differs")
                require(logical.get("text") == prefix._visible_content(raw["choices"][0].get("message", {}).get("content")).strip(), "Visible response differs from logical archive")
            else:
                require((native_id in auto_ids) != (native_id in manual_ids), "Provider error has ambiguous retry/manual classification")
                choices = raw.get("choices") or []
                code = raw.get("error", {}).get("code") if isinstance(raw.get("error"), dict) else (choices[0].get("error", {}).get("code") if choices else None)
                errors.append({"run_id": run_id, "session_index": item["session_index"], "execution_order": item["execution_order"],
                    "arm": arm, "stage": request["stage"], "native_record_id": native_id, "http_status": received.get("http_status"),
                    "upstream_or_payload_code": code, "error_type": received.get("error", {}).get("type"),
                    "retry_after": received.get("retry_after"), "classification": "automatic_recovery" if native_id in auto_ids else "manual_resume_stop"})
            stage = request["stage"]
            for bucket in (overall, by_arm[arm], by_stage[stage], by_arm_stage[(arm, stage)]):
                add_http(bucket, received)
            natives[native_id] = received
        require(set(native_to_request) == set(natives), "Generation/retry references an absent HTTP record")
        require(set(accepted_patient) == set(item["turn_ids"]), "Accepted patient generations differ from the scheduled turn set")
        for turn in receipt["turns"]:
            request, outcome = accepted_patient[turn["turn_id"]]
            require(turn["prompt"] == request["prompt"] and turn["patient_text"] == prefix._patient_format(outcome["text"]), "Accepted patient ledger differs from native response")
            raw = natives[outcome["native_record_id"]]["response"]
            patient[arm]["prompt_characters"].append(len(request["prompt"]))
            patient[arm]["prompt_utf8_bytes"].append(len(request["prompt"].encode()))
            patient[arm]["estimated_prompt_tokens_utf8_div3"].append(request["estimated_prompt_tokens"])
            for field in ("prompt_tokens", "completion_tokens", "total_tokens"):
                value = raw.get("usage", {}).get(field)
                if isinstance(value, int):
                    patient[arm][f"native_{field}"].append(value)
            patient[arm]["patient_turn_elapsed_seconds"].append(turn["elapsed_seconds"])
            arm_counts[arm]["accepted_turns"] += 1
            arm_counts[arm]["probes"] += turn["turn_id"] in PROBES
        arm_counts[arm]["completed_sessions"] += 1
    require(used_logical_ids == global_logical_ids, "Unclaimed logical request")
    error_counts = Counter((e["classification"], e["upstream_or_payload_code"]) for e in errors)
    return {"overall": finish_bucket(overall), "by_arm": {arm: {**finish_bucket(value), **dict(arm_counts[arm])} for arm, value in by_arm.items()},
        "by_stage": {stage: finish_bucket(value) for stage, value in by_stage.items()},
        "by_arm_and_stage": {arm: {stage: finish_bucket(value) for (a, stage), value in by_arm_stage.items() if a == arm} for arm in by_arm},
        "accepted_patient_prompt_and_latency": {arm: {field: distribution(values) for field, values in rows.items()} for arm, rows in patient.items()},
        "error_classification": [{"classification": kind, "upstream_or_payload_code": code, "count": count} for (kind, code), count in sorted(error_counts.items())],
        "historical_provider_errors": errors, "historical_incomplete_generations": manual_empty,
        "clinical_parity": {"profile_case_sha256": {key: next(iter(value)) for key, value in case_hashes.items()},
            "patient_logical_requests_with_exactly_one_common_case": patient_logical_case_checks,
            "same_case_per_profile_across_arms_and_repeats": True, "all_flat_patient_requests_use_complete_own_prior_ledger": True},
        "requested_generation_parameters": [{**json.loads(key), "logical_requests": value} for key, value in request_parameter_counts.items()]}


def memory_metrics(original, configs, by_run):
    statuses, totals, types = Counter(), Counter(), Counter()
    per_run = {}
    for run_id, config in configs.items():
        if config["arm"] != "structured_common_profile":
            continue
        therapist = by_run[run_id][-1]["therapist_id"]
        path = original / "runtime" / run_id / "memory" / f"{therapist}__{config['native_api_id']}.jsonl"
        records = read_jsonl(path)
        types.update(row["type"] for row in records)
        sources = [row for row in records if row["type"] == "conversation_turn"]
        local_status, local = Counter(), Counter()
        for receipt in by_run[run_id]:
            health = receipt["memory_consolidation"]
            local_status[health["status"]] += 1
            for field in ("source_turns", "processed_sources", "validated_facts", "rejected_facts", "invalid_batches"):
                local[field] += health[field]
        require(local["source_turns"] == local["processed_sources"] == len(sources) == 55
                and all(row.get("usable") is True for row in sources), "Incomplete native source processing")
        statuses.update(local_status)
        totals.update(local)
        per_run[run_id] = {"session_statuses": dict(local_status), **dict(local), "usable_raw_sources": len(sources)}
    return {"closed_structured_sessions": sum(statuses.values()), "session_statuses": dict(statuses), **dict(totals),
        "record_types": dict(types), "source_coverage": {"raw_sources": types["conversation_turn"], "usable_sources": totals["source_turns"],
            "processed_sources": totals["processed_sources"], "fraction_processed": totals["processed_sources"] / totals["source_turns"]},
        "per_run": per_run,
        "interpretation": "Partial denotes rejected facts or invalid extraction batches retained in quarantine, not missing raw turns. Fact counts are validated extraction records, not unique facts or accuracy scores."}


def storage_metrics(original, configs):
    by_arm = defaultdict(Counter)
    by_run = {}
    for run_id, config in configs.items():
        counts = Counter()
        root = original / "runtime" / run_id
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            relative, name = path.relative_to(root), path.name
            if name == "accepted-turns.jsonl": category = "accepted_ledgers"
            elif relative.parts[0] == "runs": category = "native_run_snapshots"
            elif relative.parts[0] == "memory": category = "native_memory_jsonl"
            elif name == "openrouter-api-records.jsonl": category = "native_http_archives"
            elif name == "generation-events.jsonl": category = "logical_generation_journals"
            elif name == "timeout-retries.jsonl": category = "transport_retry_journals"
            elif name == "session.json": category = "session_receipts"
            elif name.endswith(".log"): category = "worker_logs"
            elif name.startswith("recovery-"): category = "recovery_evidence"
            else: category = "other"
            counts[category] += path.stat().st_size
        by_run[run_id] = {"total_bytes": sum(counts.values()), "components_bytes": dict(counts)}
        by_arm[config["arm"]].update(counts)
    return {"scope": "All files under runtime/<run_id>/, including duplicated request prompts, receipts and operational logs. Excludes frozen inputs, continuation snapshots, shared control files, evaluation packets and analysis outputs.",
        "by_arm": {arm: {"total_bytes": sum(values.values()), "components_bytes": dict(values),
            "accepted_ledger_plus_native_state_and_memory_bytes": sum(values[k] for k in ("accepted_ledgers", "native_run_snapshots", "native_memory_jsonl"))}
            for arm, values in by_arm.items()}, "by_run": by_run}


def audit_final(original: Path):
    original = original.resolve()
    runtime = original / "runtime"
    before = inventory(runtime)
    previous, frozen, credit, predecessor, base, prefix, old_audit, policy, contract, lineage, hashes = verify_chain(original)
    schedule = read_json(original / "generation/schedule.json")["session_executions"]
    require([row["execution_order"] for row in schedule] == list(range(1, len(schedule) + 1)), "Schedule chronology differs")
    receipts, configs, by_run, process_ids = [], {}, defaultdict(list), set()
    for item in schedule:
        receipt, config = receipt_and_config(original, item)
        require(item["session_index"] == len(by_run[item["run_id"]]) + 1 and receipt["process_instance_id"] not in process_ids, "Missing session or duplicate worker identity")
        process_ids.add(receipt["process_instance_id"])
        receipts.append(receipt)
        configs[item["run_id"]] = config
        by_run[item["run_id"]].append(receipt)
    require(len(configs) == 30 and all(len(rows) == 11 for rows in by_run.values()), "Not all trajectories reached eleven sessions")
    delta = audit_delta(original, previous, frozen, schedule, receipts, credit, predecessor, base, prefix, old_audit, policy)
    base.RUN_ID = "__no_partial_native_run__"
    allowed = set(frozen["runtime_file_sha256"]) - {"STOP"}
    for run_id, saved in by_run.items():
        allowed.add(f"{run_id}/accepted-turns.jsonl")
        allowed.update(base._audit_run(original, configs[run_id], saved, prefix, None))
        ledger = read_jsonl(runtime / run_id / "accepted-turns.jsonl")
        require(len(ledger) == 55 and {turn["turn_id"] for turn in ledger if turn["turn_id"] in PROBES} == PROBES, "Missing or duplicated final probe")
    for item in schedule[frozen["next_execution_order"] - 1:]:
        relative = f"{item['run_id']}/sessions/session_{item['session_index']:02d}"
        allowed.update(f"{relative}/{name}" for name in ("session.json", "generation-events.jsonl", "openrouter-api-records.jsonl", "timeout-retries.jsonl", "worker.log"))
    allowed.update(f"{RECOVERED_RUN}/sessions/session_10/{name}" for name in ("recovery-resume07.json", "worker-resume07.log"))
    require(set(before) <= allowed, "Unknown/unclaimed final runtime artifact")
    directories = {parent.as_posix() for name in allowed for parent in Path(name).parents}
    for item in schedule:
        testdir = f"{item['run_id']}/sessions/session_{item['session_index']:02d}/tests"
        directories.update({f"{item['run_id']}/memory", testdir, testdir + "/runs"})
    require(all(path.relative_to(runtime).as_posix() in directories for path in runtime.rglob("*") if path.is_dir()), "Unknown final runtime directory")
    launch, gate = read_json(runtime / "launch.json"), read_json(runtime / "request-gate.json")
    require(not (runtime / "STOP").exists() and gate.get("in_flight") is None, "STOP or unfinished HTTP gate remains")
    require(read_json(runtime / "active-execution.json") == {**schedule[-1], "launch_id": launch["launch_id"]}, "Final active execution differs")
    old_processes = (previous / "snapshot/processes.jsonl").read_bytes()
    current_processes = (runtime / "processes.jsonl").read_bytes()
    require(current_processes.startswith(old_processes), "Historical process journal changed")
    rows = [json.loads(line) for line in current_processes[len(old_processes):].splitlines()]
    tail = schedule[frozen["next_execution_order"] - 1:]
    started = read_json(previous / "started.json")
    require(len(rows) == 1 + 2 * len(tail) and rows[0].get("event") == "continuation_authorized"
            and rows[0].get("continuation") == "resume-07" and rows[0].get("next_execution_order") == frozen["next_execution_order"]
            and rows[0].get("controller_pid") == started.get("pid") and started.get("manifest_sha256") == PREVIOUS_MANIFEST, "Unclaimed final controller activity")
    for index, item in enumerate(tail):
        begin, end = rows[1 + 2 * index:3 + 2 * index]
        require(begin.get("event") == "start" and end.get("event") == "exit" and end.get("exit_code") == 0
                and all(row.get(k) == v for row in (begin, end) for k, v in item.items())
                and begin.get("pid") == end.get("pid") == receipts[item["execution_order"] - 1]["pid"]
                and begin.get("continuation") == end.get("continuation") == "resume-07"
                and begin.get("command", [])[1:] == [str(previous / "worker.py"), "run", "--execution-order", str(item["execution_order"]), "--launch-id", launch["launch_id"]], "Final worker chronology/exit differs")
    metrics = collect_metrics(original, schedule, receipts, configs, base, prefix, contract)
    completed_sessions = len(receipts)
    accepted = sum(len(row["turns"]) for row in receipts)
    probes = sum(turn["turn_id"] in PROBES for row in receipts for turn in row["turns"])
    totals = metrics["overall"]
    require(totals["requests"] == frozen["requests"] + delta["native_requests"]
            and totals["responses"] == frozen["responses"] + delta["responses"]
            and totals["errors"] == frozen["provider_errors"] + delta["errors"], "Full archive totals do not reconcile with the verified delta")
    progress = read_json(runtime / "progress.json")
    derived = {"completed_sessions": completed_sessions, "accepted_turns": accepted, "completed_trajectories": len(configs),
        "observed_probes": probes, "requests": totals["requests"], "responses": totals["responses"], "provider_errors": totals["errors"],
        "responses_with_reported_cost": totals["responses_with_reported_cost"], "reported_cost_usd": totals["reported_response_cost_usd"]}
    require(progress.get("status") == "completed" and progress.get("stop") is None and all(progress.get(k) == v for k, v in derived.items()), "Completed progress differs from reconciled archives")
    controller_state = read_json(previous / "state.json")
    require(controller_state.get("status") == "completed" and controller_state.get("progress") == progress, "Final controller state differs")
    expected = {"completed_sessions": 330, "accepted_turns": 1650, "completed_trajectories": 30, "observed_probes": 180,
        "requests": 3172, "responses": 3136, "provider_errors": 36, "reported_cost_usd": 48.142587}
    crosschecks = {key: {"expected": value, "observed": derived[key], "matches": derived[key] == value} for key, value in expected.items()}
    require(all(row["matches"] for row in crosschecks.values()), "Reported final checkpoint differs from the actual archives")
    memory = memory_metrics(original, configs, by_run)
    storage = storage_metrics(original, configs)
    require(inventory(runtime) == before, "Runtime changed during the offline final audit")
    return {"status": "passed", "audited_at": datetime.now(timezone.utc).isoformat(), "completed_at": controller_state["timestamp"],
        "audit_scope": "Frozen inference sources, operational continuations, current runtime and recorded native outcomes only; no evaluator packets or ratings read.",
        "live_requests_by_audit": 0, "runtime_unchanged": True, "stop_absent": True, "gate_in_flight": None,
        "counts": derived, "independent_expected_count_crosschecks": crosschecks,
        "application_guard_failures": sum(bool(t.get("application_guard_failure") or t.get("safety_flags")) for r in receipts for t in r["turns"]),
        "preserved_checkpoint": {"continuation": "resume-07", "manifest_sha256": PREVIOUS_MANIFEST,
            "accepted_turns": frozen["accepted_turns"], "new_accepted_turns": accepted - frozen["accepted_turns"]},
        "verified_delta": delta, "frozen_lineage": lineage, "operational_metrics": metrics,
        "structured_memory": memory, "storage": storage,
        "latency_definitions": {
            "native_http_elapsed_seconds": "Matched openrouter-api-records terminal elapsed_seconds for each HTTP attempt; errors and responses separate. Includes native client/request handling, excludes the retry sleep between attempts.",
            "logical_generation_elapsed_seconds": "generation-events elapsed_seconds; includes transport retries, backoff and the retry wrapper's minimum-interval waits. Excludes waiting to acquire the outer request gate.",
            "patient_turn_elapsed_seconds": "Accepted turn elapsed_seconds from the native graph/baseline call. Structured values include classifier and graph operations; not pure generation latency.",
            "percentiles": "p95 uses nearest rank; sums do not include operator pauses, controller restart delays or unmeasured finalization overhead."},
        "usage_definitions": {"response_usage": "Native usage from event=response, including the retained empty finalization response; per-field coverage denominators are the response counts.",
            "error_usage": "Native usage attached to provider errors, including recovered attempts; per-field denominators are error counts. Missing values are not imputed.",
            "completion_tokens": "OpenRouter native completion_tokens includes reasoning where provided; reasoning_tokens is also reported separately.",
            "cost": "Native usage.cost reported by OpenRouter, separated for responses/errors; not an independently reconciled invoice.",
            "patient_prompt_metrics": "One final accepted patient response per scheduled turn (825 per arm); historical failures and retried attempts excluded from these distributions."},
        "limitations": ["Operational checks establish archival integrity and protocol execution, not clinical or semantic memory accuracy.",
            "Prior generation changes and manual recoveries remain in their frozen lineage; the session3 partial recovery after an old504 reinitialized native affect RNG as previously documented.",
            "Raw storage totals include redundant archival prompts and logs and are not a pure memory-footprint benchmark."],
        "source_hash_paths_relative_to": "execution root/", "source_file_sha256": hashes,
        "runtime_hash_paths_relative_to": "runtime/", "runtime_file_sha256": before}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original", type=Path, default=ORIGINAL)
    parser.add_argument("--output", type=Path, default=HERE / "runtime-audit.json")
    args = parser.parse_args()
    require(args.output.resolve().parent == HERE and args.output.name == "runtime-audit.json", "Audit may write only its assigned output")
    try:
        report = audit_final(args.original)
    except Exception as exc:
        report = {"status": "failed", "audited_at": datetime.now(timezone.utc).isoformat(),
            "error_type": type(exc).__name__, "error": str(exc), "live_requests_by_audit": 0}
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "counts": report["counts"], "runtime_files": len(report["runtime_file_sha256"]),
        "structured_memory": {k: report["structured_memory"][k] for k in ("session_statuses", "validated_facts", "rejected_facts", "invalid_batches")}}, indent=2))


if __name__ == "__main__":
    main()
