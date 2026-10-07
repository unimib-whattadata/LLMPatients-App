"""Read-only reconciliation of a completed comparison prefix before resuming.

Standard library only: no graph, provider, credential, subprocess, or network.
An absent final process-exit record is reported as absent, never synthesized.
Partial factual consolidation is checked and retained as partial evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType

MODEL = "google/gemini-2.5-pro"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
ARMS = {"structured_common_profile", "flat_full_history"}
MEMORY_STAGES = {"_generate_factual_memory", "_summarize_episode", "_generate_session_reflection",
                 "_generate_long_term_summary_from_reflection"}
STAGES = MEMORY_STAGES | {"generate_response", "classify_topic_and_emotion"}


class PrefixAuditError(RuntimeError):
    """The archived prefix cannot safely be continued without review."""


def require(condition, message):
    if not condition:
        raise PrefixAuditError(message)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise PrefixAuditError(f"Missing or invalid JSON: {Path(path).name}") from exc


def read_jsonl(path):
    try:
        text = Path(path).read_text(encoding="utf-8")
        require(not text or text.endswith("\n"), f"Uncommitted JSONL tail: {Path(path).name}")
        records = [json.loads(line) for line in text.splitlines() if line.strip()]
        require(all(isinstance(row, dict) for row in records), "JSONL records must be objects")
        return records
    except (OSError, ValueError) as exc:
        raise PrefixAuditError(f"Missing or invalid JSONL: {Path(path).name}") from exc


def _safe_relative(root, relative):
    path = Path(relative)
    require(not path.is_absolute() and path.parts and ".." not in path.parts, "Unsafe archive path")
    candidate = root / path
    require(not any(part.is_symlink() for part in (candidate, *candidate.parents) if part != root.parent),
            "Symlinks are not accepted in the archived prefix")
    require(candidate.resolve().is_relative_to(root.resolve()), "Archive path escapes its root")
    return candidate


def _verify_execution(original):
    """Run the frozen stdlib verifier, without creating a bytecode cache."""
    manifest = read_json(original / "manifest.json")
    source = original / "prepare_execution.py"
    require(sha256(source) == manifest["files"].get("prepare_execution.py"), "Frozen verifier changed")
    module = ModuleType("_original_prefix_integrity_verifier")
    module.__file__ = str(source)
    exec(compile(source.read_bytes(), str(source), "exec"), module.__dict__)
    try:
        result = module.verify()
    except Exception as exc:
        raise PrefixAuditError("Frozen execution or original input integrity verification failed") from exc
    require(result.get("status") == "verified", "Original integrity verifier did not pass")
    return result


def _snapshot(runtime):
    result = {}
    for path in sorted(runtime.rglob("*")):
        require(not path.is_symlink(), "Runtime symlink is not auditable")
        if path.is_file():
            result[path.relative_to(runtime).as_posix()] = sha256(path)
    return result


def _visible_content(content):
    if isinstance(content, str):
        return content
    if content is None:
        return ""
    require(isinstance(content, list), "Unsupported native content type")
    return "".join(part["text"] for part in content if isinstance(part, dict)
                   and part.get("type") == "text" and not part.get("thought")
                   and isinstance(part.get("text"), str))


def _patient_format(text):
    """Frozen deterministic output formatting, reproduced without graph import."""
    formatted = []
    for line in (line.strip() for line in text.splitlines() if line.strip()):
        line = re.sub(r"\*([^*]+)\*", r"(\1)", line)
        if re.match(r"^\*.*\*$", line):
            line = f"({line.strip('*').strip()})"
        elif not re.match(r"^\(.*\)$", line):
            match = re.match(r"^(thoughts?|thinking|internal|inner|description|narration|scene|action|setting)\s*:\s*(.+)",
                             line, re.IGNORECASE)
            if match:
                line = f"({match.group(2).strip()})"
        formatted.append(line)
    return " ".join(formatted).strip()


def _audit_calls(session_dir, receipt, item, identities):
    events = read_jsonl(session_dir / "generation-events.jsonl")
    wire = read_jsonl(session_dir / "openrouter-api-records.jsonl")
    require(events and len(events) % 2 == 0 and len(wire) == len(events),
            "Generation/wire request and outcome counts do not match")
    patient_calls = {}
    attempts = defaultdict(list)
    stages = Counter()
    for offset in range(0, len(events), 2):
        request, outcome = events[offset:offset + 2]
        sent, received = wire[offset:offset + 2]
        require([request.get("event"), outcome.get("event")] == ["request", "outcome"],
                "Missing outcome or generation error/fatal event")
        require([sent.get("event"), received.get("event")] == ["request", "response"],
                "Missing wire outcome or native error event")
        stage = request.get("stage")
        require(stage in STAGES, "Unknown generation stage")
        require(receipt["arm"] != "flat_full_history" or stage == "generate_response",
                "Flat arm contains a structured-memory call")
        for key in ("logical_id", "attempt", "stage", "turn_id", "session_index"):
            require(request.get(key) == outcome.get(key), "Request/outcome identity mismatch")
        require(request.get("arm") == item["arm"] and request.get("session_index") == item["session_index"],
                "Generation belongs to a foreign arm/session")
        require(request.get("turn_id") in {None, *item["turn_ids"]}, "Generation has foreign turn ID")
        logical_id = request.get("logical_id")
        require(isinstance(logical_id, str) and logical_id, "Missing logical request ID")
        key = (logical_id, request.get("attempt"))
        require(key not in identities["logical_attempts"], "Repeated logical request attempt")
        identities["logical_attempts"].add(key)
        gate_id = request.get("gate_request_id")
        require(isinstance(gate_id, str) and gate_id and gate_id not in identities["gate_ids"], "Duplicate/missing gate request ID")
        identities["gate_ids"].add(gate_id)
        archive_id = sent.get("record_id")
        require(isinstance(archive_id, str) and archive_id and archive_id not in identities["archive_ids"],
                "Duplicate/missing native archive ID")
        identities["archive_ids"].add(archive_id)
        require(received.get("record_id") == archive_id == outcome.get("native_record_id"),
                "Foreign native record ID")
        for record in (sent, received):
            require(record.get("endpoint") == ENDPOINT and record.get("safety_settings_forwarded") is False
                    and record.get("omitted_legacy_generation_parameters") == ["top_k"],
                    "Native endpoint/provenance mismatch")
        config = request["generation_config"]
        prompt = request["prompt"]
        require(isinstance(prompt, str), "Prompt is not text")
        size = len(prompt.encode("utf-8"))
        estimate = max(1, (size + 2) // 3)
        for record in (request, outcome):
            require(record.get("prompt_utf8_bytes") == size and record.get("estimated_prompt_tokens") == estimate
                    and record.get("prompt_token_estimate_method") == "utf8_bytes_div3_ceiling"
                    and record.get("estimated_prompt_token_limit") == 64000 and estimate <= 64000,
                    "Prompt measurement/ceiling mismatch")
        expected_body = {"model": MODEL, "messages": [{"role": "user", "content": prompt}],
                         "provider": {"require_parameters": True, "allow_fallbacks": False},
                         "temperature": config["temperature"], "max_tokens": config["max_output_tokens"],
                         "top_p": config["top_p"], "stop": config["stop_sequences"],
                         "reasoning": {"max_tokens": config["thinking_config"]["thinking_budget"]}}
        require(sent.get("request") == received.get("request") == expected_body, "Wire request differs from recorded generation")
        temperature = .2 if stage in MEMORY_STAGES else (0.0 if stage == "classify_topic_and_emotion" else .7)
        base_budget = 8192 if stage in MEMORY_STAGES else 4096
        attempt = request["attempt"]
        require(attempt in (1, 2) and config["temperature"] == temperature and config["top_p"] == .95
                and config["top_k"] == 40 and config["thinking_config"] == {"thinking_budget": 1024}
                and config["max_output_tokens"] == (base_budget if attempt == 1 else 8192),
                "Generation configuration/recovery budget mismatch")
        raw = received.get("response", {})
        require(received.get("http_status") == 200 and not raw.get("error"), "Native API error or unsuccessful status")
        require(raw.get("model") == outcome.get("raw_model") == MODEL, "Foreign native model")
        response_id = raw.get("id")
        require(isinstance(response_id, str) and response_id and response_id == outcome.get("response_id")
                and response_id not in identities["response_ids"], "Foreign/duplicate native response ID")
        identities["response_ids"].add(response_id)
        choices = raw.get("choices")
        require(isinstance(choices, list) and len(choices) == 1 and not choices[0].get("error"),
                "Invalid or errored native completion")
        native_finish = choices[0].get("finish_reason")
        require(native_finish in {"stop", "length"}, "Native completion did not stop successfully")
        visible = _visible_content(choices[0].get("message", {}).get("content")).strip()
        reason = "STOP" if native_finish == "stop" else "MAX_TOKENS"
        recover = reason == "MAX_TOKENS" and attempt == 1 and base_budget == 4096
        accepted = reason == "STOP" and bool(visible)
        require(outcome.get("finish_reasons") == [reason] and outcome.get("accepted") is accepted
                and outcome.get("max_tokens_recovery") is recover and (accepted or recover),
                "Incomplete/uncertain generation outcome")
        require(outcome.get("text") == visible, "Native visible text and generation outcome differ")
        require(outcome.get("native_usage") == raw.get("usage", {})
                and outcome.get("backend") == raw.get("provider")
                and outcome.get("cost") == raw.get("usage", {}).get("cost")
                and outcome.get("cost_details") == raw.get("usage", {}).get("cost_details"),
                "Native provenance/usage mismatch")
        attempts[logical_id].append((request, outcome))
        stages[stage] += 1
        if stage == "generate_response" and accepted:
            turn_id = request["turn_id"]
            require(turn_id not in patient_calls, "Repeated accepted patient generation")
            patient_calls[turn_id] = (prompt, _patient_format(visible))
    for values in attempts.values():
        require([request["attempt"] for request, _ in values] in ([1], [1, 2]), "Retry sequence is not permitted")
        require(values[-1][1]["accepted"] is True, "Logical generation has no accepted final outcome")
        if len(values) == 2:
            first, second = values
            require(first[1]["max_tokens_recovery"] is True and second[1]["accepted"] is True
                    and first[0]["prompt"] == second[0]["prompt"] and first[0]["stage"] == second[0]["stage"],
                    "Recovery is not the single declared MAX_TOKENS recovery")
    require(set(patient_calls) == set(item["turn_ids"]), "Patient call set differs from the five scheduled turns")
    for turn in receipt["turns"]:
        require(patient_calls[turn["turn_id"]] == (turn["prompt"], turn["patient_text"]),
                "Accepted patient text/prompt differs from native generation")
    return len(events) // 2, dict(stages)


def _audit_native(run_dir, config, receipts, ledger):
    latest = receipts[-1]
    state_paths = latest["state_files_at_close"]
    if config["arm"] == "flat_full_history":
        require(not state_paths, "Flat arm contains native persisted state")
        for receipt in receipts:
            close = receipt["finalization"]
            require(receipt["memory_status"] == "not_applicable" and close.get("status") == "baseline_closed"
                    and close.get("total_turns") == close.get("history_turns_retained") == receipt["session_index"] * 5
                    and close.get("structured_memory_calls") == 0, "Invalid flat session close")
        return {"native_sessions": 0, "source_turns": 0, "partial_sessions": 0}
    therapist = latest["therapist_id"]
    run_path = f"runs/{therapist}.json"
    memory_path = f"memory/{therapist}__{config['native_api_id']}.jsonl"
    require(set(state_paths) == {run_path, memory_path}, "Native state file set differs from its run identity")
    native = read_json(run_dir / run_path)
    require(native.get("therapist_id") == therapist, "Foreign native therapist")
    sessions = native.get("sessions", [])
    require(len(sessions) == len(receipts), "Native closed-session count differs from receipts")
    memory = read_jsonl(run_dir / memory_path)
    require(len({record["id"] for record in memory}) == len(memory), "Duplicate native memory record ID")
    valid_sessions = {receipt["session_id"] for receipt in receipts}
    for record in memory:
        require(record.get("patient_id") == config["native_api_id"] and record.get("therapist_id") == therapist,
                "Foreign native memory identity")
        require(record.get("session_id") in valid_sessions or
                (record.get("type") == "long_term_summary" and "session_id" not in record),
                "Native memory contains a source after/outside the completed prefix")
    require(dict(Counter(record["type"] for record in memory)) == latest["memory_record_counts"],
            "Native memory counts disagree with latest receipt")
    sources = [record for record in memory if record["type"] == "conversation_turn"]
    require(len(sources) == len(ledger), "Native source count differs from accepted turns")
    partial = 0
    for receipt, session in zip(receipts, sessions):
        index = receipt["session_index"]
        require(session.get("ended_at") and session.get("session_id") == receipt["session_id"]
                and session.get("patient_id") == config["native_api_id"] and len(session.get("turns", [])) == 5
                and session.get("source") == "api" and session.get("mode") == "live", "Native API session is not a closed prefix")
        require(session["final_state"].get("total_turns") == index * 5, "Native final cumulative turn count differs")
        for position, (native_turn, turn) in enumerate(zip(session["turns"], receipt["turns"]), 1):
            require(native_turn.get("therapist_input_raw") == turn["therapist_text"]
                    and native_turn.get("patient_response") == turn["patient_text"]
                    and native_turn.get("turn_index") == position
                    and native_turn.get("total_turns") == turn["turn_index"], "Native conversation and accepted ledger differ")
            require(turn.get("api_response", {}).get("message") == turn["patient_text"], "API response and accepted text differ")
        records = [record for record in memory if record.get("session_id") == receipt["session_id"]]
        require(records == receipt["session_memory_records"], "Native session records differ from receipt")
        current_sources = [record for record in records if record["type"] == "conversation_turn"]
        require(len(current_sources) == 5, "Native session does not retain five original sources")
        for record, turn in zip(current_sources, receipt["turns"]):
            require(record["therapist_text"] == turn["therapist_text"] and record["patient_text"] == turn["patient_text"]
                    and record["turn_index"] == turn["turn_index"] and record["session_order"] == index - 1,
                    "Native original source text/ordinal mismatch")
        eligible = {record["id"] for record in current_sources if record["usable"]}
        batches = [record for record in records if record["type"] == "fact_batch"]
        processed = {source for batch in batches for source in batch["source_ids"]}
        require(processed <= eligible, "Foreign fact-batch source ID")
        counts = {"source_turns": len(eligible), "processed_sources": len(processed),
                  "validated_facts": sum(len(batch["facts"]) for batch in batches),
                  "rejected_facts": sum(len(batch.get("rejected_facts", [])) for batch in batches),
                  "invalid_batches": sum(bool(batch.get("validation_error")) for batch in batches)}
        status = "partial" if counts["rejected_facts"] or counts["invalid_batches"] or eligible - processed else "complete"
        health = {"status": status, **counts}
        require(session["final_state"].get("memory_consolidation") == receipt.get("memory_consolidation") == health,
                "Consolidation counts/status differ from original source records")
        require(receipt.get("raw_sources") == 5 and receipt.get("memory_status") == status
                and receipt["finalization"].get("status") == "finalized"
                and receipt["finalization"].get("memory_status") == status
                and receipt.get("memory_warnings") == receipt["finalization"].get("memory_warnings")
                and (status != "partial" or receipt.get("memory_warnings")), "Native finalization status/warnings mismatch")
        require(receipt.get("eligible_source_ids") == sorted(eligible)
                and receipt.get("excluded_source_ids") == [r["id"] for r in current_sources if not r["usable"]]
                and receipt.get("validated_fact_ids") == [f["id"] for b in batches for f in b["facts"]]
                and receipt.get("quarantined_facts") == [{"batch_id": b["id"], "facts": b["rejected_facts"]}
                    for b in batches if b.get("rejected_facts")], "Receipt conflates accepted and quarantined facts")
        partial += status == "partial"
    return {"native_sessions": len(sessions), "source_turns": len(sources), "partial_sessions": partial}


def _process_reconciliation(original, runtime, prefix, receipts, launch):
    records = read_jsonl(runtime / "processes.jsonl")
    position = 0
    missing = []
    for item, receipt in zip(prefix, receipts):
        require(position < len(records), "Missing worker start record")
        start = records[position]
        position += 1
        require(start.get("event") == "start" and all(start.get(k) == v for k, v in item.items())
                and start.get("pid") == receipt["pid"], "Worker start identity differs from scheduled receipt")
        command = start.get("command", [])
        require(len(command) == 7 and command[1:] == [str(original / "paired_runner.py"), "_worker",
                "--execution-order", str(item["execution_order"]), "--launch-id", launch["launch_id"]],
                "Worker start command does not match original controller")
        if position < len(records) and records[position].get("event") == "exit":
            ended = records[position]
            position += 1
            require(all(ended.get(k) == v for k, v in item.items()) and ended.get("pid") == receipt["pid"]
                    and ended.get("exit_code") == 0, "Failed or foreign worker exit record")
        else:
            require(item == prefix[-1], "Missing worker exit is only reconcilable at the completed prefix tail")
            missing.append({"execution_order": item["execution_order"], "run_id": item["run_id"],
                "session_index": item["session_index"], "pid": receipt["pid"], "exit_code": None,
                "process_exit_observed": False,
                "resolution": "Completed live receipt, closed state, accepted ledger and all native outcomes reconciled; no exit event invented."})
    require(position == len(records), "Process journal contains execution beyond the completed prefix")
    active = read_json(runtime / "active-execution.json")
    require(active == {**prefix[-1], "launch_id": launch["launch_id"]}, "Active execution differs from completed prefix tail")
    progress = read_json(runtime / "progress.json")
    require(progress.get("status") in {"incomplete", "completed"} and progress.get("stop") is None
            and progress.get("provider_errors") == 0 and 0 <= progress.get("completed_sessions", -1) <= len(prefix),
            "Controller progress indicates STOP/error or extends beyond prefix")
    return {"worker_starts": len(prefix), "recorded_successful_exits": len(prefix) - len(missing),
            "missing_exit_records": missing, "active_execution_order": active["execution_order"],
            "archived_progress_completed_sessions": progress["completed_sessions"],
            "archived_progress_is_stale": progress["completed_sessions"] != len(prefix),
            "os_process_liveness": "Not checked by this offline artifact audit; supervisor must establish exclusive process ownership.",
            "journal_modified": False}


def audit_prefix(original: Path) -> dict:
    original = Path(original).resolve()
    verified = _verify_execution(original)
    manifest_hash = sha256(original / "manifest.json")
    runtime = original / "runtime"
    require(runtime.is_dir() and not (runtime / "STOP").exists(), "Runtime missing or global STOP exists")
    before = _snapshot(runtime)
    launch = read_json(runtime / "launch.json")
    require(launch.get("execution_manifest_sha256") == manifest_hash and launch.get("mode") == "live_openrouter"
            and isinstance(launch.get("launch_id"), str) and launch["launch_id"], "Launch receipt does not match frozen live execution")
    gate = read_json(runtime / "request-gate.json")
    require("in_flight" in gate and gate["in_flight"] is None, "Global gate has an unresolved in-flight request")
    require(isinstance(gate.get("last_started"), (int, float)) and not isinstance(gate["last_started"], bool)
            and math.isfinite(gate["last_started"]) and gate["last_started"] >= 0, "Global gate timestamp is invalid")
    schedule = read_json(original / "generation/schedule.json")["session_executions"]
    require(len(schedule) == 330 and [item["execution_order"] for item in schedule] == list(range(1, 331)),
            "Frozen schedule does not contain 330 ordered entries")
    require(len({(item["run_id"], item["session_index"]) for item in schedule}) == 330, "Duplicate scheduled session")
    prefix, receipts, by_run, configs = [], [], defaultdict(list), {}
    allowed_files = {"launch.json", "active-execution.json", "request-gate.json", "request-gate.lock",
                     "progress.json", "processes.jsonl"}
    identities = {key: set() for key in ("logical_attempts", "gate_ids", "archive_ids", "response_ids", "process_ids")}
    requests, stage_counts, gap = 0, Counter(), False
    for item in schedule:
        run_id, index = item["run_id"], item["session_index"]
        require(isinstance(run_id, str) and Path(run_id).name == run_id and item["arm"] in ARMS,
                "Invalid scheduled run identity")
        session_dir = runtime / run_id / "sessions" / f"session_{index:02d}"
        path = session_dir / "session.json"
        if not path.exists():
            gap = True
            continue
        require(not gap, "Session receipts are not a contiguous scheduled prefix")
        receipt = read_json(path)
        require(receipt.get("status") == "completed" and receipt.get("inference_mode") == "live_openrouter"
                and receipt.get("run_id") == run_id and receipt.get("session_index") == index
                and receipt.get("arm") == item["arm"] and receipt.get("execution_manifest_sha256") == manifest_hash,
                "Stopped, incomplete or foreign session receipt")
        require(not receipt.get("error") and not receipt.get("cleanup_errors") and receipt.get("finished_at"),
                "Receipt has a worker/cleanup error or lacks a close timestamp")
        process_id = receipt.get("process_instance_id")
        require(isinstance(process_id, str) and process_id and process_id not in identities["process_ids"],
                "Missing/reused process instance identity")
        identities["process_ids"].add(process_id)
        config = configs.setdefault(run_id, read_json(original / "generation/runs" / f"{run_id}.json"))
        require(config["run_id"] == run_id and config["arm"] == item["arm"]
                and receipt["patient_id"] == config["native_api_id"]
                and receipt["therapist_id"] == f"comparison_{run_id}"
                and receipt["session_id"] == f"comparison_s{index:02d}"
                and receipt["case_sha256"] == config["case_sha256"]
                and receipt["requested_model"] == MODEL and receipt.get("provider_seed") is None,
                "Receipt/config identity or model mismatch")
        require(index == len(by_run[run_id]) + 1 and receipt["prior_finalized_sessions"] == index - 1,
                "Run's sessions are not a chronological prefix")
        scenario = read_json(original / "generation" / config["scenario_path"])["sessions"][index - 1]
        turns = receipt.get("turns", [])
        require(len(turns) == 5 and len(scenario["turns"]) == 5 and scenario["session_index"] == index,
                "Session does not contain five scheduled turns")
        for position, (turn, planned) in enumerate(zip(turns, scenario["turns"]), 1):
            require(turn.get("run_id") == run_id and turn.get("status") == "accepted"
                    and turn.get("session_index") == index and turn.get("turn_index") == (index - 1) * 5 + position
                    and turn.get("turn_id") == planned["turn_id"] == item["turn_ids"][position - 1]
                    and turn.get("therapist_text") == planned["text"]
                    and isinstance(turn.get("patient_text"), str) and turn["patient_text"].strip(),
                    "Accepted turn text/ordinal/identity differs from frozen scenario")
        count, stages = _audit_calls(session_dir, receipt, item, identities)
        requests += count
        stage_counts.update(stages)
        prefix.append(item)
        receipts.append(receipt)
        by_run[run_id].append(receipt)
        allowed_files.update(f"{run_id}/sessions/session_{index:02d}/{name}" for name in
                             ("session.json", "generation-events.jsonl", "openrouter-api-records.jsonl", "worker.log"))
    require(prefix, "No completed prefix is available to resume")
    total_turns, native_sessions, native_sources, partial_sessions = 0, 0, 0, 0
    for run_id, saved in by_run.items():
        run_dir = runtime / run_id
        ledger_path = run_dir / "accepted-turns.jsonl"
        ledger = read_jsonl(ledger_path)
        require(ledger == [turn for receipt in saved for turn in receipt["turns"]],
                "Accepted ledger differs from completed receipt texts/ordinals or contains later turns")
        require(sha256(ledger_path) == saved[-1]["accepted_ledger_sha256"], "Latest closed accepted-ledger hash differs")
        allowed_files.add(f"{run_id}/accepted-turns.jsonl")
        for relative, expected in saved[-1]["state_files_at_close"].items():
            state_path = _safe_relative(run_dir, relative)
            require(state_path.is_file() and sha256(state_path) == expected, "Latest closed native-state hash differs")
            allowed_files.add(f"{run_id}/{relative}")
        if any(turn.get("application_guard_failure") for turn in ledger):
            outcomes_path = run_dir / "probe-outcomes.json"
            require(read_json(outcomes_path) == {"outcomes": [{"turn_id": turn["turn_id"], "status": "application_failure"}
                    for turn in ledger if turn.get("application_guard_failure")]}, "Guard bookkeeping mismatch")
            allowed_files.add(f"{run_id}/probe-outcomes.json")
        native = _audit_native(run_dir, configs[run_id], saved, ledger)
        total_turns += len(ledger)
        native_sessions += native["native_sessions"]
        native_sources += native["source_turns"]
        partial_sessions += native["partial_sessions"]
    require(set(before) <= allowed_files, "Runtime has unknown files or artifacts after the completed prefix")
    allowed_directories = {Path(name).parent.as_posix() for name in allowed_files}
    allowed_directories |= {parent.as_posix() for name in allowed_files for parent in Path(name).parents}
    # Native module construction creates empty defaults before the harness sets
    # its isolated directories. These may exist only inside completed runs and
    # sessions; the file allowlist still refuses any payload written there.
    allowed_directories |= {f"{run_id}/memory" for run_id in by_run}
    for item in prefix:
        default = f"{item['run_id']}/sessions/session_{item['session_index']:02d}/tests"
        allowed_directories.update({default, default + "/runs"})
    require(all(path.relative_to(runtime).as_posix() in allowed_directories for path in runtime.rglob("*") if path.is_dir()),
            "Runtime has directories after/outside the completed prefix")
    reconciliation = _process_reconciliation(original, runtime, prefix, receipts, launch)
    require(_snapshot(runtime) == before and sha256(original / "manifest.json") == manifest_hash,
            "Runtime or manifest changed during offline reconciliation")
    return {"status": "passed", "audited_at": datetime.now(timezone.utc).isoformat(),
            "completed_sessions": len(prefix), "next_execution_order": len(prefix) + 1,
            "accepted_turns": total_turns, "requests": requests, "responses": requests,
            "execution_manifest_sha256": manifest_hash, "runtime_file_sha256": before,
            "runtime_hash_paths_relative_to": "runtime/", "original_verification": verified,
            "native_sessions": native_sessions, "native_source_turns": native_sources,
            "partial_memory_sessions_preserved": partial_sessions, "generation_stage_counts": dict(stage_counts),
            "process_reconciliation": reconciliation, "live_requests_by_audit": 0,
            "limitations": ["Artifact consistency is not semantic scoring or evidence of memory accuracy.",
                            "A missing exit event remains unobserved; the supervisor must check process liveness and exclusive ownership."]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("original", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit_prefix(args.original), indent=2))
