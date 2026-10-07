#!/usr/bin/env python3
"""Audit and score the frozen longitudinal experiment without any model calls.

Default mode requires all 110 sessions and 550 responses. --allow-partial writes
an explicitly incomplete snapshot; it never treats pending responses as observed
memory failures. All files written by this program use analysis/longitudinal-*.
"""

from __future__ import annotations

import argparse
import ast
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import statistics
import sys

sys.dont_write_bytecode = True
OUT = Path(__file__).resolve().parents[1]
CONDITIONS = ("full", "baseline")
GRAPH_FALLBACK = "I'm trying to stay with what I'm feeling right now. Could we keep talking about that?"
ABSTENTION_RE = re.compile(
    r"\b(?:i (?:do not|don't|cannot|can't|couldn't) (?:remember|recall|know)|"
    r"i(?:'m| am) (?:not sure|unsure)|i (?:have )?forgot(?:ten)?|"
    r"i have no (?:idea|memory)|i cannot be sure)\b", re.I)
REFUSAL_RE = re.compile(
    r"\b(?:i (?:do not|don't) want to (?:answer|say|tell|discuss)|"
    r"i(?:'d| would) rather not|i refuse|i(?:'m| am) not going to (?:answer|tell))\b", re.I)
KEY_MARKERS = ('"expected_values"', '"assertion_id"', '"is_primary"',
               '"forbidden_patterns"', '"facts_changed"', '"source_turn_id"')


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text())


def elapsed(start, end):
    if not start or not end:
        return None
    try:
        return (datetime.fromisoformat(end.replace("Z", "+00:00")) -
                datetime.fromisoformat(start.replace("Z", "+00:00"))).total_seconds()
    except (TypeError, ValueError):
        return None


def distribution(values) -> dict:
    values = sorted(float(x) for x in values if isinstance(x, (float, int)) and math.isfinite(x))
    if not values:
        return {"n": 0, "sum": 0, "mean": None, "median": None, "p95_nearest_rank": None, "max": None}
    return {"n": len(values), "sum": sum(values), "mean": statistics.mean(values),
            "median": statistics.median(values),
            "p95_nearest_rank": values[math.ceil(.95 * len(values)) - 1], "max": values[-1]}


def runtime_validity(response, normalize) -> tuple[bool, str | None]:
    if not isinstance(response, str) or not response.strip():
        return False, "empty_visible_response"
    clean = normalize(response)
    if re.match(r"^\[(?:error|no response|no reply)\]", clean, re.I):
        return False, "provider_or_graph_sentinel"
    if clean == normalize(GRAPH_FALLBACK):
        return False, "literal_graph_generation_fallback"
    return True, None


def metric_summary(rows: list[dict]) -> dict:
    planned = len(rows)
    observed = [r for r in rows if r["observation_status"] == "observed"]
    eligible = [r for r in observed if r["eligible_epoch"]]
    valid = [r for r in eligible if r["runtime_valid"]]
    statuses = Counter(r["score_status"] for r in eligible)
    correct = statuses["correct"]
    complete = len(eligible) == planned
    return {
        "planned_assertions": planned, "observed_assertions": len(observed),
        "eligible_observed_assertions": len(eligible), "not_observed": planned - len(observed),
        "excluded_epoch_assertions": len(observed) - len(eligible),
        "runtime_valid_assertions": len(valid), "runtime_invalid_assertions": len(eligible) - len(valid),
        "correct": correct, "ambiguous": statuses["ambiguous"], "not_matched": statuses["not_matched"],
        "explicit_abstention_mentions": sum(bool(r["abstention_evidence"]) for r in eligible),
        "explicit_refusal_mentions": sum(bool(r["refusal_evidence"]) for r in eligible),
        "competing_value_mentions": sum(bool(r["competing_value_evidence"]) for r in eligible),
        "superseded_value_mentions_on_current_probes": sum(r["expected_state"] == "current" and bool(r["competing_value_evidence"]) for r in eligible),
        "latest_value_mentions_on_historical_probes": sum(r["expected_state"] == "initial" and bool(r["competing_value_evidence"]) for r in eligible),
        "complete": complete,
        "end_to_end_accuracy": correct / planned if complete and planned else None,
        "observed_end_to_end_accuracy": correct / len(eligible) if eligible else None,
        "valid_only_accuracy": correct / len(valid) if valid else None,
        "status": "complete" if complete else "incomplete",
    }


def load_score_module(path: Path):
    spec = importlib.util.spec_from_file_location("frozen_longitudinal_scorer", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def load_frozen_response_formatter(path: Path):
    """Load only the pure nested formatter, without importing the graph/runtime."""
    source = path.read_text()
    tree = ast.parse(source, filename=str(path))
    generate = next(node for node in tree.body if isinstance(node, ast.FunctionDef)
                    and node.name == "generate_response")
    formatter = next(node for node in generate.body if isinstance(node, ast.FunctionDef)
                     and node.name == "_enforce_response_format")
    namespace = {"re": re}
    module = ast.fix_missing_locations(ast.Module(body=[formatter], type_ignores=[]))
    exec(compile(module, str(path), "exec"), namespace)
    evidence = {"source_file": str(path), "source_line": formatter.lineno,
                "ast_sha256": hashlib.sha256(ast.dump(formatter, include_attributes=False).encode()).hexdigest(),
                "source_text": ast.get_source_segment(source, formatter)}
    return namespace["_enforce_response_format"], evidence


def flatten_profile(raw) -> dict:
    result = {}

    def visit(value, keys):
        if isinstance(value, dict):
            for key, child in value.items():
                visit(child, keys + [str(key)])
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, keys + [str(index + 1)])
        else:
            result[".".join(keys)] = value

    for key in ("profile", "clinical", "therapy", "chat"):
        if key in raw:
            value = raw[key]
            if key == "profile":
                value = {k: v for k, v in value.items() if k != "avatarUrl"}
            visit(value, [key])
    return result


def analyze(base: Path, allow_partial: bool) -> tuple[dict, int]:
    import yaml

    snapshot_at = now()
    experiment = base / "longitudinal"
    source_root = base / "longitudinal-source"
    plan_path = experiment / "scenarios.json"
    manifest_path = experiment / "manifest.json"
    verifier_path = experiment / "verify_scenarios.py"
    manifest = read_json(manifest_path)
    plan = read_json(plan_path)
    scorer = load_score_module(verifier_path)
    normalize = scorer.normalize_response
    format_full, formatter_evidence = load_frozen_response_formatter(
        source_root / "agent/core/langgraph_builder.py")
    findings = []

    def finding(level, code, message, **context):
        findings.append({"level": level, "code": code, "message": message, **context})

    # A source epoch is verified before pooling observations from its sessions.
    integrity = []
    frozen_paths = {
        "scenarios_sha256": plan_path,
        "protocol_sha256": experiment / "protocol.md",
        "scenario_verifier_sha256": verifier_path,
        "session_runner_sha256": base / "scripts/run_longitudinal_session.py",
        "source_manifest_sha256": base / "longitudinal-source-manifest.json",
    }
    for key, path in frozen_paths.items():
        actual = digest(path)
        expected = manifest.get(key)
        integrity.append({"file": str(path.relative_to(base)), "expected_sha256": expected, "observed_sha256": actual, "matches": actual == expected})
        if actual != expected:
            finding("error", "frozen_file_mismatch", "A frozen experiment file differs from the execution manifest.", path=str(path), key=key)
    source_manifest = read_json(base / "longitudinal-source-manifest.json")
    for relative, expected in source_manifest.items():
        path = source_root / relative
        actual = digest(path) if path.exists() else None
        integrity.append({"file": str(path.relative_to(base)), "expected_sha256": expected, "observed_sha256": actual, "matches": actual == expected})
        if actual != expected:
            finding("error", "source_epoch_mismatch", "Runtime/profile bytes differ from the frozen source manifest.", path=str(path))
    source_ok = all(row["matches"] for row in integrity)
    preflight = scorer.validate_scenarios(plan, agent_root=source_root)
    if not preflight["valid"]:
        finding("error", "scenario_preflight_failed", "Frozen scenario verification failed.", details=preflight["errors"])
    runner_text = frozen_paths["session_runner_sha256"].read_text()
    runner_ast = ast.parse(runner_text)
    hidden_key_refs = sorted({n.value for n in ast.walk(runner_ast) if isinstance(n, ast.Constant)
                              and isinstance(n.value, str) and n.value in
                              {"assertions", "expected_values", "facts_changed", "forbidden_patterns", "is_primary"}})
    if hidden_key_refs:
        finding("error", "runner_answer_key_reference", "The inference runner references answer-key fields; inspect before interpreting performance.", fields=hidden_key_refs)
    expected_epoch = {
        "source_manifest_sha256": manifest["source_manifest_sha256"],
        "session_runner_sha256": manifest["session_runner_sha256"],
        "scenarios_sha256": manifest["scenarios_sha256"],
        "model_id": manifest["model_id"], "region": manifest["region"],
        "temperature": manifest["temperature"],
        "max_tokens_initial": manifest["patient_response_initial_max_tokens"],
        "provider_seed": manifest["provider_seed"],
    }
    expected_epoch_hash = canonical_digest(expected_epoch)

    session_specs = {}
    turn_specs = {}
    patient_lookup = {p["patient_id"]: p for p in plan["patients"]}
    for patient in plan["patients"]:
        for session in patient["sessions"]:
            session_specs[(patient["patient_id"], session["session_index"])] = session
            for pos, turn in enumerate(session["turns"], 1):
                turn_specs[turn["turn_id"]] = {"turn": turn, "session_index": session["session_index"],
                                              "global_index": (session["session_index"] - 1) * 5 + pos}

    sessions = {}
    session_audits = []
    epoch_counts = Counter()
    coverage = {}
    for patient in plan["patients"]:
        pid = patient["patient_id"]
        profile_path = source_root / patient["profile_source"]["relative_path"]
        profile_hash = digest(profile_path)
        if profile_hash != patient["profile_source"]["sha256"]:
            finding("error", "profile_hash_mismatch", "Canonical profile differs from the scenario's source profile.", patient_id=pid)
        coverage_path = experiment / "results" / pid / "baseline/profile_coverage.json"
        if coverage_path.exists():
            item = read_json(coverage_path)
            expected_leaves = flatten_profile(yaml.safe_load(profile_path.read_text()))
            observed_leaves = {row["path"]: row["value"] for row in item.get("included_leaves", [])}
            missing = sorted(set(expected_leaves) - set(observed_leaves))
            extra = sorted(set(observed_leaves) - set(expected_leaves))
            changed = sorted(k for k in expected_leaves.keys() & observed_leaves.keys() if expected_leaves[k] != observed_leaves[k])
            sentence_missing = [row["path"] for row in item.get("included_leaves", []) if row.get("sentence", "") not in item.get("narrative", "")]
            coverage[pid] = {"status": "verified" if not (missing or extra or changed or sentence_missing) and item.get("profile_sha256") == profile_hash else "mismatch",
                             "expected_leaves": len(expected_leaves), "included_leaves": len(observed_leaves),
                             "missing": missing, "extra": extra, "changed": changed, "sentences_missing_from_narrative": sentence_missing,
                             "profile_sha256": profile_hash, "narrative_sha256": hashlib.sha256(item.get("narrative", "").encode()).hexdigest(),
                             "null_leaves_retained": sum(v is None for v in observed_leaves.values()),
                             "omitted_nonclinical_top_level_keys": item.get("omitted_nonclinical_top_level_keys"),
                             "narrative": item.get("narrative", "")}
            if coverage[pid]["status"] != "verified":
                finding("error", "baseline_profile_coverage_mismatch", "Narrative coverage does not preserve all included clinical/profile/therapy/chat leaves.", patient_id=pid, details=coverage[pid])
        else:
            coverage[pid] = {"status": "not_yet_available"}

        for condition in CONDITIONS:
            for index in range(1, 12):
                path = experiment / "results" / pid / condition / f"session_{index:02d}/session.json"
                spec = session_specs[(pid, index)]
                item = read_json(path) if path.exists() else None
                key = (pid, condition, index)
                sessions[key] = item
                row = {"patient_id": pid, "condition": condition, "session_index": index,
                       "path": str(path.relative_to(base)), "status": item.get("status") if item else "not_started",
                       "observed_turns": len(item.get("turns", [])) if item else 0, "expected_turns": 5,
                       "eligible_epoch": False, "epoch_fingerprint": None}
                if item:
                    record_epoch = {**expected_epoch, **{k: item.get(k) for k in
                                    ("scenarios_sha256", "model_id", "region", "temperature", "max_tokens_initial", "provider_seed")}}
                    row["epoch_fingerprint"] = canonical_digest(record_epoch)
                    row["eligible_epoch"] = source_ok and row["epoch_fingerprint"] == expected_epoch_hash
                    epoch_counts[row["epoch_fingerprint"]] += 1
                    row["elapsed_seconds"] = elapsed(item.get("started_at"), item.get("finished_at"))
                    row["resumed_count"] = len(item.get("resumed_at", []))
                    row["session_error"] = {k: item[k] for k in ("error_type", "error", "failed_at") if k in item}
                    row["finalization_present"] = "finalization" in item
                    row["finalization_status"] = (item.get("finalization") or {}).get("status")
                    row["memory_record_types"] = dict(Counter(r.get("type") for r in item.get("memory_records", [])))
                    if not row["eligible_epoch"]:
                        finding("error", "session_epoch_mismatch", "Session is excluded from pooling because its declared epoch/settings or source verification differ.", patient_id=pid, condition=condition, session_index=index, actual=record_epoch)
                    if item.get("patient_id") != pid or item.get("condition") != condition or item.get("session_index") != index:
                        finding("error", "session_identity_mismatch", "Session metadata does not match its directory.", path=str(path))
                    observed_ids = [t.get("turn_id") for t in item.get("turns", [])]
                    expected_ids = [t["turn_id"] for t in spec["turns"]]
                    if observed_ids != expected_ids[:len(observed_ids)]:
                        finding("error", "turn_sequence_mismatch", "Observed turns are not an ordered prefix of the frozen script.", path=str(path), observed=observed_ids)
                    if item.get("status") == "completed" and observed_ids != expected_ids:
                        finding("error", "completed_session_missing_turns", "Completed session is missing or duplicates scripted turns.", path=str(path))
                    if condition == "full" and item.get("status") == "completed" and "finalization" not in item:
                        finding("error", "missing_finalization", "A completed full-system session has no persisted finalization record.", path=str(path))
                    if condition == "full" and item.get("status") == "completed":
                        if row["finalization_status"] != "finalized":
                            finding("error", "session_not_finalized", "A completed full-system session must have finalization.status == finalized.", path=str(path), actual_status=row["finalization_status"])
                        for memory_key in ("persisted_summary", "persisted_reflection"):
                            memory_valid, reason = runtime_validity(item.get(memory_key), normalize)
                            row[memory_key + "_valid"] = memory_valid
                            row[memory_key + "_quote"] = item.get(memory_key)
                            if not memory_valid:
                                finding("error", "invalid_persisted_memory", "Completed session has no usable persisted summary/reflection.", path=str(path), memory_key=memory_key, reason=reason)
                        for memory_type in ("session_reflection", "long_term_summary"):
                            if row["memory_record_types"].get(memory_type, 0) < index:
                                finding("warning", "fewer_memory_records_than_sessions", "Inspect persisted memory: fewer records of this type than completed sessions in the trajectory.", path=str(path), memory_type=memory_type, count=row["memory_record_types"].get(memory_type, 0), session_index=index)
                    if condition == "baseline" and item.get("turns") and coverage[pid]["status"] == "not_yet_available":
                        finding("error", "missing_profile_coverage", "Baseline responses exist without their profile coverage record.", patient_id=pid)
                session_audits.append(row)

    expected_paths = {str(experiment / "results" / p / c / f"session_{i:02d}/session.json")
                      for p in patient_lookup for c in CONDITIONS for i in range(1, 12)}
    for path in (experiment / "results").glob("*/*/session_*/session.json"):
        if str(path) not in expected_paths:
            finding("error", "unplanned_session", "An extra session is present and must not be silently pooled.", path=str(path))
    session_audit_lookup = {(r["patient_id"], r["condition"], r["session_index"]): r for r in session_audits}

    # API records are read independently from session.json; pending outcomes in a
    # live partial snapshot remain pending, not provider failures.
    api_calls = []
    process_warnings = []
    request_lookup = defaultdict(list)
    response_lookup = defaultdict(list)
    all_attempt_ids = set()
    response_id_attempts = defaultdict(list)
    for key, item in sessions.items():
        pid, condition, index = key
        directory = experiment / "results" / pid / condition / f"session_{index:02d}"
        log_path = directory / "api_records.jsonl"
        requests, outcomes = {}, {}
        if log_path.exists():
            lines = log_path.read_text().splitlines()
            for line_no, line in enumerate(lines, 1):
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    live_tail = allow_partial and line_no == len(lines) and (not item or item.get("status") != "completed")
                    finding("warning" if live_tail else "error", "incomplete_api_log_line", "An API record could not be parsed.", path=str(log_path), line=line_no)
                    continue
                event["_api_log_line"] = line_no
                target = requests if event.get("event") == "request" else outcomes
                attempt_id = event.get("attempt_id")
                if attempt_id in target:
                    finding("error", "duplicate_api_event", "Duplicate attempt/event record.", path=str(log_path), attempt_id=attempt_id)
                target[attempt_id] = event
            for attempt_id in set(outcomes) - set(requests):
                finding("error", "outcome_without_request", "Provider outcome has no recorded request.", path=str(log_path), attempt_id=attempt_id)
            for attempt_id, req in requests.items():
                if attempt_id in all_attempt_ids:
                    finding("error", "reused_attempt_id", "Attempt ID appears in more than one session.", attempt_id=attempt_id)
                all_attempt_ids.add(attempt_id)
                outcome = outcomes.get(attempt_id)
                response = (outcome or {}).get("response", {})
                candidates = response.get("candidates", [])
                finish = [c.get("finish_reason", c.get("finishReason", "UNKNOWN")) for c in candidates]
                visible_text = "\n".join(part["text"] for c in candidates
                                         for part in c.get("content", {}).get("parts", [])
                                         if not part.get("thought") and part.get("text")).strip()
                response_id = response.get("response_id", response.get("responseId"))
                prompt = req.get("prompt")
                stage = req.get("stage", "unknown")
                row = {"patient_id": pid, "condition": condition, "session_index": index,
                       "attempt_id": attempt_id, "turn_id": req.get("turn_id"), "stage": stage,
                       "response_id": response_id,
                       "request_timestamp": req.get("timestamp"), "outcome_timestamp": (outcome or {}).get("timestamp"),
                       "request_log_line": req.get("_api_log_line"), "outcome_log_line": (outcome or {}).get("_api_log_line"),
                       "api_log": str(log_path.relative_to(base)), "status": "pending" if not outcome else "error" if "error" in outcome else "returned",
                       "error_type": (outcome or {}).get("error_type"), "error": (outcome or {}).get("error"),
                       "elapsed_seconds": (outcome or {}).get("elapsed_seconds"),
                       "model_version": response.get("model_version", response.get("modelVersion")),
                       "generation_config": req.get("generation_config", {}), "safety_settings": req.get("safety_settings", {}),
                       "finish_reasons": finish, "has_visible_text": bool(visible_text),
                       "visible_response_text": visible_text,
                       "completed_visible_response": bool(finish) and all(reason == "STOP" for reason in finish) and bool(visible_text),
                       "usage": response.get("usage_metadata", response.get("usageMetadata", {})),
                       "prompt_sha256": hashlib.sha256(str(prompt).encode()).hexdigest()}
                api_calls.append(row)
                request_lookup[(pid, condition, req.get("turn_id"), stage)].append(req)
                response_lookup[(pid, condition, req.get("turn_id"), stage)].append(row)
                if response_id:
                    response_id_attempts[response_id].append(attempt_id)
                    if len(response_id_attempts[response_id]) > 1:
                        finding("error", "reused_api_response_id", "The same provider response ID appears in multiple API attempts.", response_id=response_id, attempt_ids=response_id_attempts[response_id][:])
                if not outcome and item and item.get("status") == "completed":
                    finding("error", "completed_session_pending_call", "Completed session still has a request without an outcome.", attempt_id=attempt_id, path=str(log_path))
                if isinstance(prompt, str):
                    found_keys = [marker for marker in KEY_MARKERS if marker in prompt]
                    if found_keys:
                        finding("error", "answer_key_marker_in_prompt", "A request contains structural answer-key markers.", attempt_id=attempt_id, fields=found_keys)
                    if stage == "patient_response" and req.get("turn_id") in turn_specs:
                        current_index = turn_specs[req["turn_id"]]["global_index"]
                        for other_pid, other_patient in patient_lookup.items():
                            for fact_id in ("journal_label", "exercise_label"):
                                for version in other_patient["facts"][fact_id]["versions"]:
                                    source_index = turn_specs[version["source_turn_id"]]["global_index"]
                                    unexpected = other_pid != pid or source_index > current_index
                                    if unexpected and normalize(version["value"]) in normalize(prompt):
                                        finding("warning", "unexpected_scenario_value_in_prompt", "An unintroduced or other-case label occurs in a prompt; inspect provenance before treating this as answer-key leakage.", attempt_id=attempt_id, value=version["value"], patient_id=pid, other_patient_id=other_pid)
        process_log = directory / "process.log"
        if process_log.exists():
            for line_no, line in enumerate(process_log.read_text(errors="replace").splitlines(), 1):
                if any(term in line for term in ("Episode future still running", "SessionMemoryError", "Traceback (", "[ERROR]", "Empty response on attempt")):
                    process_warnings.append({"patient_id": pid, "condition": condition, "session_index": index,
                                             "path": str(process_log.relative_to(base)), "line": line_no, "text": line})

    assertions = []
    turns = []
    history_checks = Counter()
    response_provenance_checks = Counter()
    initial_config_signatures = {c: Counter() for c in CONDITIONS}
    initial_safety_signatures = {c: Counter() for c in CONDITIONS}
    withheld_exposures = []
    for patient in plan["patients"]:
        pid = patient["patient_id"]
        for condition in CONDITIONS:
            prior_turns = []
            for index in range(1, 12):
                key = (pid, condition, index)
                item = sessions[key]
                audit = session_audit_lookup[key]
                observed_by_id = {t["turn_id"]: t for t in item.get("turns", [])} if item else {}
                for local_t, spec_turn in enumerate(session_specs[(pid, index)]["turns"], 1):
                    tid = spec_turn["turn_id"]
                    record = observed_by_id.get(tid)
                    response = record.get("patient_text") if record else None
                    valid, invalid_reason = runtime_validity(response, normalize) if record else (False, "not_observed")
                    global_index = (index - 1) * 5 + local_t
                    row = {"patient_id": pid, "condition": condition, "session_index": index, "turn_id": tid,
                           "global_index": global_index, "kind": spec_turn["kind"],
                           "observation_status": "observed" if record else "not_observed",
                           "runtime_valid": valid, "runtime_invalid_reason": invalid_reason,
                           "eligible_epoch": audit["eligible_epoch"], "epoch_fingerprint": audit["epoch_fingerprint"],
                           "therapist_text": spec_turn["text"], "patient_text": response,
                           "elapsed_seconds": record.get("elapsed_seconds") if record else None,
                           "session_path": audit["path"],
                           "api_response_provenance": "not_observed" if not record else "runtime_invalid_exempt",
                           "patient_api_attempt_id": None, "patient_response_id": None,
                           "patient_api_log": None, "patient_api_outcome_line": None,
                           "api_formatted_text": None}
                    if record:
                        if record.get("therapist_text") != spec_turn["text"]:
                            finding("error", "therapist_script_changed", "Recorded therapist input differs from the frozen script.", patient_id=pid, condition=condition, turn_id=tid)
                        requests = request_lookup[(pid, condition, tid, "patient_response")]
                        row["patient_api_attempts"] = len(requests)
                        stops = [call for call in response_lookup[(pid, condition, tid, "patient_response")]
                                 if call["completed_visible_response"]]
                        last_stop = max(stops, key=lambda call: call["outcome_log_line"]) if stops else None
                        if last_stop:
                            raw_text = last_stop["visible_response_text"]
                            formatted = format_full(raw_text.strip()) if condition == "full" else re.sub(
                                r"^\s*Patient\s*:\s*", "", raw_text or "", flags=re.I).strip()
                            row.update(patient_api_attempt_id=last_stop["attempt_id"],
                                       patient_response_id=last_stop["response_id"],
                                       patient_api_log=last_stop["api_log"],
                                       patient_api_outcome_line=last_stop["outcome_log_line"],
                                       api_formatted_text=formatted)
                        if valid:
                            response_provenance_checks["valid_patient_responses_checked"] += 1
                            if not last_stop:
                                row["api_response_provenance"] = "missing_visible_STOP_response"
                                finding("error", "patient_response_without_visible_stop", "A valid recorded patient response has no completed visible STOP API response for this turn.", patient_id=pid, condition=condition, turn_id=tid)
                            elif row["api_formatted_text"] != response:
                                row["api_response_provenance"] = "formatted_API_response_mismatch"
                                finding("error", "patient_response_api_text_mismatch", "Recorded patient text differs from the last visible STOP response after the frozen branch formatter.", patient_id=pid, condition=condition, turn_id=tid, response_id=last_stop["response_id"], attempt_id=last_stop["attempt_id"], recorded_quote=response, formatted_api_quote=row["api_formatted_text"])
                            elif not last_stop["response_id"]:
                                row["api_response_provenance"] = "matched_text_missing_response_id"
                                finding("error", "patient_api_response_id_missing", "Matched patient response lacks the provider response ID needed for complete provenance.", patient_id=pid, condition=condition, turn_id=tid, attempt_id=last_stop["attempt_id"])
                            else:
                                row["api_response_provenance"] = "verified_last_visible_STOP"
                                response_provenance_checks["valid_patient_responses_verified"] += 1
                        if not requests:
                            finding("error", "missing_patient_request", "Observed response has no patient-generation API request record.", patient_id=pid, condition=condition, turn_id=tid)
                        else:
                            cfg = requests[0].get("generation_config", {})
                            initial_config_signatures[condition][json.dumps(cfg, sort_keys=True)] += 1
                            initial_safety_signatures[condition][json.dumps(requests[0].get("safety_settings", {}), sort_keys=True)] += 1
                            if cfg.get("temperature") != manifest["temperature"] or cfg.get("max_output_tokens") != manifest["patient_response_initial_max_tokens"]:
                                finding("error", "initial_generation_parameter_mismatch", "Patient-generation initial request differs from the frozen temperature/output budget.", turn_id=tid, condition=condition, config=cfg)
                        prompt = record.get("prompt")
                        if not isinstance(prompt, str):
                            finding("error", "missing_exact_prompt", "Observed turn has no exact patient prompt.", turn_id=tid, condition=condition)
                            prompt = ""
                        if any(req.get("prompt") != prompt for req in requests):
                            finding("error", "recorded_prompt_differs_from_request", "Stored patient prompt differs from at least one actual patient-generation request for the turn.", turn_id=tid, condition=condition)
                        if condition == "baseline":
                            count_ok = record.get("prior_turn_count") == global_index - 1
                            session_count_ok = record.get("prior_session_count") == index - 1
                            history_checks["baseline_count_checked"] += 1
                            history_checks["baseline_count_passed"] += count_ok and session_count_ok
                            if not (count_ok and session_count_ok):
                                finding("error", "baseline_history_counter_mismatch", "Baseline must retain all previous exchanges, with prior-turn counts 0..54.", turn_id=tid, prior_turn_count=record.get("prior_turn_count"), expected=global_index - 1)
                            cursor = 0
                            missing_fragments = []
                            for previous in prior_turns:
                                fragment = f"Therapist: {previous['therapist_text']}\nPatient: {previous['patient_text']}"
                                found = prompt.find(fragment, cursor)
                                if found < 0:
                                    missing_fragments.append(previous["turn_id"])
                                else:
                                    cursor = found + len(fragment)
                            history_checks["baseline_full_history_checked"] += 1
                            history_checks["baseline_full_history_passed"] += not missing_fragments and len(prior_turns) == global_index - 1
                            if missing_fragments or len(prior_turns) != global_index - 1:
                                finding("error", "baseline_history_content_missing", "Prior observed exchanges are absent, out of order, or unavailable in the baseline prompt.", turn_id=tid, missing_turn_ids=missing_fragments)
                            narrative = coverage[pid].get("narrative")
                            if not narrative or narrative not in prompt:
                                finding("error", "baseline_narrative_not_in_prompt", "The complete archived baseline narrative is not present in this prompt.", turn_id=tid)
                        else:
                            count_ok = record.get("total_turns") == global_index
                            history_checks["full_counter_checked"] += 1
                            history_checks["full_counter_passed"] += count_ok
                            if not count_ok:
                                finding("error", "full_cumulative_counter_mismatch", "Full-system total_turns must be 1..55 across restored sessions.", turn_id=tid, actual=record.get("total_turns"), expected=global_index)
                            if record.get("safe_user_input") != spec_turn["text"] or record.get("safety_flags"):
                                finding("error", "full_input_modified_or_flagged", "A scripted input was altered or flagged despite the frozen safety preflight.", turn_id=tid, safe_input=record.get("safe_user_input"), flags=record.get("safety_flags"))
                        title = patient["facts"]["exercise_label"]["versions"][0]["value"]
                        if normalize(title) in normalize(response or ""):
                            withheld_exposures.append({"patient_id": pid, "condition": condition, "turn_id": tid,
                                                       "session_index": index, "source": "patient_response", "quote": response})
                        if index > 2 and index < 11 and normalize(title) in normalize(prompt):
                            withheld_exposures.append({"patient_id": pid, "condition": condition, "turn_id": tid,
                                                       "session_index": index, "source": "patient_prompt_history_or_memory",
                                                       "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest()})
                        prior_turns.append(record)
                    turns.append(row)
                    scored = scorer.score_turn(spec_turn, response, runtime_valid=valid)
                    for spec_assertion, score in zip(spec_turn.get("assertions", []), scored):
                        source_tid = spec_assertion.get("source_turn_id")
                        abstention = ABSTENTION_RE.search(response or "")
                        refusal = REFUSAL_RE.search(response or "")
                        assertions.append({
                            **{k: row[k] for k in ("patient_id", "condition", "session_index", "turn_id", "global_index",
                                                   "observation_status", "runtime_valid", "runtime_invalid_reason", "eligible_epoch",
                                                   "epoch_fingerprint", "therapist_text", "patient_text", "session_path",
                                                   "api_response_provenance", "patient_api_attempt_id", "patient_response_id",
                                                   "patient_api_log", "patient_api_outcome_line")},
                            **{k: spec_assertion[k] for k in ("assertion_id", "metric", "fact_id", "expected_state", "expected_values", "is_primary", "lag_turns")},
                            "score_status": score["status"] if record else "not_observed",
                            "correct": score["correct"] if record else None,
                            "expected_match_evidence": score["expected_match_evidence"],
                            "competing_value_evidence": score["competing_value_evidence"],
                            "abstention_evidence": abstention.group(0) if abstention else None,
                            "refusal_evidence": refusal.group(0) if refusal else None,
                            "source_turn_id": source_tid,
                            "source_therapist_text": turn_specs[source_tid]["turn"]["text"] if source_tid else None,
                            "source_profile_field": spec_assertion.get("source_profile_field"),
                            "source_profile": patient["profile_source"], "locked_match_rule": spec_assertion["match"],
                        })

    # Equal initial generation and safety signatures are required for interpreting
    # the matched comparison. Retry budgets are reported separately in raw stats.
    for signatures, code in ((initial_config_signatures, "condition_generation_config_difference"),
                             (initial_safety_signatures, "condition_safety_config_difference")):
        available = [set(signatures[c]) for c in CONDITIONS if signatures[c]]
        if len(available) == 2 and available[0] != available[1]:
            finding("error", code, "Initial patient-generation request settings differ between conditions.", signatures={c: dict(signatures[c]) for c in CONDITIONS})
    versions_by_condition = {c: sorted({r["model_version"] for r in api_calls if r["condition"] == c and r["stage"] == "patient_response" and r["model_version"]}) for c in CONDITIONS}
    nonempty_versions = [set(v) for v in versions_by_condition.values() if v]
    if any(len(v) > 1 for v in nonempty_versions) or len(nonempty_versions) == 2 and nonempty_versions[0] != nonempty_versions[1]:
        finding("error", "returned_model_version_difference", "Patient responses span different provider-reported model versions; do not pool as a single comparison.", versions=versions_by_condition)

    completed = sum(r["status"] == "completed" for r in session_audits)
    observed_turns = [r for r in turns if r["observation_status"] == "observed"]
    observed_count = len(observed_turns)
    raw_observed_count = sum(r["observed_turns"] for r in session_audits)
    structurally_complete = completed == 110 and observed_count == 550 and raw_observed_count == 550
    audit_ok = not any(r["level"] == "error" for r in findings)
    status = "invalid_integrity" if not audit_ok else "complete" if structurally_complete else "incomplete"
    by_condition = {}
    by_case = []
    by_metric = []
    by_session = []
    for condition in CONDITIONS:
        selected = [r for r in assertions if r["condition"] == condition]
        by_condition[condition] = {
            "primary": metric_summary([r for r in selected if r["is_primary"]]),
            "secondary": metric_summary([r for r in selected if not r["is_primary"]]),
            "completed_sessions": sum(r["condition"] == condition and r["status"] == "completed" for r in session_audits),
            "observed_responses": sum(r["condition"] == condition for r in observed_turns),
            "runtime_invalid_responses": sum(r["condition"] == condition and not r["runtime_valid"] for r in observed_turns),
        }
        for patient_id in patient_lookup:
            rows = [r for r in selected if r["patient_id"] == patient_id]
            primary = [r for r in rows if r["is_primary"]]
            checkin = [r for r in primary if r["fact_id"] in {"checkin_day", "checkin_time"}]
            by_case.append({"patient_id": patient_id, "condition": condition,
                            "primary": metric_summary(primary), "secondary": metric_summary([r for r in rows if not r["is_primary"]]),
                            "final_checkin_complete_fact_correct": all(r["correct"] is True and r["eligible_epoch"] for r in checkin)
                            if all(r["observation_status"] == "observed" and r["eligible_epoch"] for r in checkin) else None,
                            "final_atomic_outcomes": [{"fact_id": r["fact_id"], "score_status": r["score_status"], "correct": r["correct"]} for r in primary],
                            "completed_sessions": sum(r["patient_id"] == patient_id and r["condition"] == condition and r["status"] == "completed" for r in session_audits)})
        for metric in sorted({r["metric"] for r in selected}):
            for primary in (True, False):
                rows = [r for r in selected if r["metric"] == metric and r["is_primary"] == primary]
                if rows:
                    by_metric.append({"condition": condition, "metric": metric, "is_primary": primary, **metric_summary(rows)})
        for index in range(1, 12):
            by_session.append({"condition": condition, "session_index": index,
                               **metric_summary([r for r in selected if r["session_index"] == index])})
    paired = []
    for pid in patient_lookup:
        full = next(r for r in by_case if r["patient_id"] == pid and r["condition"] == "full")["primary"]
        baseline = next(r for r in by_case if r["patient_id"] == pid and r["condition"] == "baseline")["primary"]
        full_score, baseline_score = full["end_to_end_accuracy"], baseline["end_to_end_accuracy"]
        paired.append({"patient_id": pid, "full_primary_correct": full["correct"], "baseline_primary_correct": baseline["correct"],
                       "planned_per_condition": 6, "full_primary_score": full_score, "baseline_primary_score": baseline_score,
                       "full_minus_baseline": full_score - baseline_score if full_score is not None and baseline_score is not None and audit_ok else None})

    api_stats = {}
    for condition in CONDITIONS:
        calls = [r for r in api_calls if r["condition"] == condition]
        stages = {}
        for stage in sorted({r["stage"] for r in calls}):
            rows = [r for r in calls if r["stage"] == stage]
            usage = Counter()
            for row in rows:
                for key, value in row["usage"].items():
                    if isinstance(value, (float, int)):
                        usage[key] += value
            stages[stage] = {"requests": len(rows), "outcomes": dict(Counter(r["status"] for r in rows)),
                             "finish_reasons": dict(Counter(v for r in rows for v in r["finish_reasons"])),
                             "errors": dict(Counter(r["error_type"] for r in rows if r["error_type"])),
                             "responses_without_visible_text": sum(r["status"] == "returned" and not r["has_visible_text"] for r in rows),
                             "usage_totals": dict(usage), "latency_seconds": distribution(r["elapsed_seconds"] for r in rows),
                             "max_output_token_requests": dict(Counter(str(r["generation_config"].get("max_output_tokens")) for r in rows))}
        responses = [r for r in observed_turns if r["condition"] == condition]
        session_times = [r.get("elapsed_seconds") for r in session_audits if r["condition"] == condition and r["status"] == "completed"]
        api_stats[condition] = {"requests": len(calls), "requests_per_observed_response": len(calls) / len(responses) if responses else None,
                                "by_stage": stages, "patient_generation_initial_config_signatures": dict(initial_config_signatures[condition]),
                                "initial_safety_signatures": dict(initial_safety_signatures[condition]), "returned_patient_model_versions": versions_by_condition[condition],
                                "turn_latency_seconds": distribution(r["elapsed_seconds"] for r in responses),
                                "completed_session_latency_seconds": distribution(session_times)}
    starts = [item["started_at"] for item in sessions.values() if item and item.get("started_at")]
    finishes = [item["finished_at"] for item in sessions.values() if item and item.get("finished_at")]
    terminal_time = max(finishes) if structurally_complete and finishes else snapshot_at
    response_id_audit = {
        "returned_api_responses": sum(call["status"] == "returned" for call in api_calls),
        "api_responses_with_id": sum(bool(call["response_id"]) for call in api_calls),
        "returned_api_responses_without_id": sum(call["status"] == "returned" and not call["response_id"] for call in api_calls),
        "unique_response_ids": len(response_id_attempts),
        "duplicate_response_ids": {rid: ids for rid, ids in response_id_attempts.items() if len(ids) > 1},
        "all_present_ids_globally_unique": all(len(ids) == 1 for ids in response_id_attempts.values()),
    }
    summary = {
        "analysis_version": "1.1", "snapshot_at": snapshot_at, "status": status,
        "analysis_mode": "allow_partial" if allow_partial else "strict", "complete": structurally_complete,
        "integrity_valid": audit_ok, "expected_sessions": 110, "completed_sessions": completed,
        "expected_responses": 550, "observed_responses": observed_count,
        "raw_observed_response_records": raw_observed_count,
        "valid_responses": sum(r["runtime_valid"] for r in observed_turns),
        "runtime_invalid_responses": sum(not r["runtime_valid"] for r in observed_turns),
        "runtime_invalid_reasons": dict(Counter(r["runtime_invalid_reason"] for r in observed_turns if not r["runtime_valid"])),
        "planned_assertions_total": len(assertions), "observed_assertions_total": sum(r["observation_status"] == "observed" for r in assertions),
        "by_condition": by_condition, "by_case": by_case, "by_metric": by_metric, "by_session": by_session,
        "paired_primary": paired,
        "mean_paired_primary_delta": statistics.mean(r["full_minus_baseline"] for r in paired)
            if audit_ok and all(r["full_minus_baseline"] is not None for r in paired) else None,
        "declared_epoch_fingerprints": dict(epoch_counts), "expected_epoch_fingerprint": expected_epoch_hash,
        "pooling_permitted": audit_ok and len(epoch_counts) <= 1,
        "elapsed_wall_seconds": elapsed(min(starts), terminal_time) if starts else None,
        "elapsed_wall_is_partial": not structurally_complete,
        "api_statistics": api_stats, "findings_by_level": dict(Counter(r["level"] for r in findings)),
        "history_checks": dict(history_checks), "withheld_label_exposure_records": len(withheld_exposures),
        "response_provenance_checks": dict(response_provenance_checks), "api_response_id_audit": response_id_audit,
        "limitations": [
            "Five paired profile trajectories, one stochastic run per condition; no inferential tests or confidence intervals.",
            "Whole-configuration comparison: baseline retains full history; full system selects/compresses profile and memory.",
            "Only the separate reflection-card title has no earlier therapist probe; other facts were rehearsed by intermediate probes.",
            "Regex non-match is not a contradiction. Competing-value mentions may be temporally correct explanations and are conservatively ambiguous.",
            "Provider model_version can be an alias rather than an immutable backend snapshot.",
            "Frozen file hashes are checked against the pre-execution manifest; per-session metadata does not independently attest source bytes at every call.",
        ],
    }
    audit_report = {"snapshot_at": snapshot_at, "integrity": integrity, "scenario_preflight": preflight,
                    "expected_epoch": expected_epoch, "findings": findings, "sessions": session_audits,
                    "baseline_profile_coverage": {p: {k: v for k, v in c.items() if k != "narrative"} for p, c in coverage.items()},
                    "process_warnings": process_warnings, "withheld_fact_exposures": withheld_exposures,
                    "runner_answer_key_field_references": hidden_key_refs,
                    "full_response_formatter": formatter_evidence,
                    "baseline_response_formatter": {"source_file": str(frozen_paths["session_runner_sha256"]),
                                                    "operation": "re.sub(r'^\\s*Patient\\s*:\\s*', '', raw or '', flags=re.I).strip()"},
                    "api_response_id_audit": response_id_audit,
                    "observed_controller_sha256": digest(base / "scripts/run_longitudinal.py"),
                    "analyzer_sha256": digest(Path(__file__))}
    write_outputs(base, summary, audit_report, assertions, turns, api_calls)
    code = 2 if not audit_ok else 0 if structurally_complete or allow_partial else 1
    return summary, code


def write_outputs(base, summary, audit, assertions, turns, api_calls):
    output = base / "analysis"
    output.mkdir(parents=True, exist_ok=True)

    def write_json(name, value):
        path = output / ("longitudinal-" + name)
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
        temporary.replace(path)

    def write_jsonl(name, values):
        path = output / ("longitudinal-" + name)
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text("".join(json.dumps(v, ensure_ascii=False) + "\n" for v in values))
        temporary.replace(path)

    write_json("summary.json", summary)
    write_json("audit.json", audit)
    write_jsonl("assertions.jsonl", assertions)
    write_jsonl("turns.jsonl", turns)
    write_jsonl("api-calls.jsonl", api_calls)
    csv_path = output / "longitudinal-assertions.csv"
    columns = ["patient_id", "condition", "session_index", "turn_id", "assertion_id", "is_primary", "metric", "fact_id",
               "expected_state", "expected_values", "observation_status", "score_status", "correct", "runtime_valid", "runtime_invalid_reason",
               "eligible_epoch", "expected_match_evidence", "competing_value_evidence", "abstention_evidence", "refusal_evidence",
               "api_response_provenance", "patient_api_attempt_id", "patient_response_id", "patient_api_log", "patient_api_outcome_line",
               "therapist_text", "patient_text", "source_turn_id", "source_therapist_text", "source_profile_field", "lag_turns"]
    with csv_path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for row in assertions:
            writer.writerow({k: json.dumps(row.get(k), ensure_ascii=False) if isinstance(row.get(k), (dict, list)) else row.get(k) for k in columns})

    def score_text(item):
        if item["complete"]:
            return f"{item['correct']}/{item['planned_assertions']}"
        return f"pending ({item['eligible_observed_assertions']}/{item['planned_assertions']} observed; {item['correct']} correct)"

    lines = ["# Longitudinal continuity analysis", "", f"**Status: {summary['status'].upper()}** — snapshot {summary['snapshot_at']}.", "",
             f"Completed sessions: {summary['completed_sessions']}/110. Observed patient responses: {summary['observed_responses']}/550. "
             f"Runtime-invalid observed responses: {summary['runtime_invalid_responses']}.", ""]
    if not summary["complete"]:
        lines += ["This is an incomplete monitoring snapshot, not the completed experiment. Pending probes are not observed recall failures. Final end-to-end accuracy remains unset until all planned assertions in the group are observed.", ""]
    if not summary["integrity_valid"]:
        lines += ["Integrity/comparability checks found errors. Do not pool these outputs as a valid matched comparison until those errors are resolved or explicitly separated into distinct epochs.", ""]
    lines += ["## Locked primary endpoint", "", "| Patient | Full system | Flat/full history | Full − flat |", "|---|---:|---:|---:|"]
    for pair in summary["paired_primary"]:
        full = next(x["primary"] for x in summary["by_case"] if x["patient_id"] == pair["patient_id"] and x["condition"] == "full")
        baseline = next(x["primary"] for x in summary["by_case"] if x["patient_id"] == pair["patient_id"] and x["condition"] == "baseline")
        delta = "pending" if pair["full_minus_baseline"] is None else f"{pair['full_minus_baseline']:+.4f}"
        lines.append(f"| {pair['patient_id']} | {score_text(full)} | {score_text(baseline)} | {delta} |")
    lines += ["", "| Condition | Primary | Secondary | Ambiguous primary | Valid-only primary |", "|---|---:|---:|---:|---:|"]
    for condition, row in summary["by_condition"].items():
        primary = row["primary"]
        valid = "pending" if primary["valid_only_accuracy"] is None else f"{primary['valid_only_accuracy']:.4f} ({primary['runtime_valid_assertions']} valid assertions)"
        lines.append(f"| {condition} | {score_text(primary)} | {score_text(row['secondary'])} | {primary['ambiguous']} | {valid} |")
    lines += ["", "Primary assertions are final name, age, current journal label, current check-in day/time, and the withheld reflection-card label. The latter has 45 scripted exchanges between introduction and its first therapist probe. Intermediate probes can rehearse other facts; patient responses and stored memory can also re-expose labels.", "",
              "A non-match does not establish a contradiction. The CSV/JSONL files retain every query, response, expected value, matched span and source. Both-value answers are conservatively ambiguous; abstention/refusal flags identify explicit phrases only.", "",
              "## Runtime and provenance", "", "| Condition | Provider requests | Returned patient model versions | Mean turn latency (s) |", "|---|---:|---|---:|"]
    for condition, stats in summary["api_statistics"].items():
        mean = stats["turn_latency_seconds"]["mean"]
        lines.append(f"| {condition} | {stats['requests']} | {', '.join(stats['returned_patient_model_versions']) or 'pending'} | {f'{mean:.2f}' if mean is not None else 'pending'} |")
    lines += ["", f"History/counter checks: `{json.dumps(summary['history_checks'], sort_keys=True)}`.", "",
              f"Patient text/API provenance checks: `{json.dumps(summary['response_provenance_checks'], sort_keys=True)}`. "
              f"Unique provider response IDs: {summary['api_response_id_audit']['unique_response_ids']}; "
              f"duplicated IDs: {len(summary['api_response_id_audit']['duplicate_response_ids'])}.", "",
              f"Frozen integrity: {'passed' if summary['integrity_valid'] else 'errors'}. Epochs observed: {len(summary['declared_epoch_fingerprints'])}. "
              f"Process warnings requiring inspection: {len(audit['process_warnings'])}.", "",
              "The audit JSON lists all frozen hashes, profile coverage, generation/safety signatures, provider attempts, finish reasons, usage and pending/error records. Retry tokens and auxiliary full-system calls are included; no monetary cost is inferred without a pricing source.", "",
              "Each valid patient response is matched to the last visible STOP completion for its turn after the frozen full-system formatter or baseline cleanup. Response IDs and raw visible text are retained in the API ledger. Completed full-system sessions require finalized status and nonempty usable persisted summary/reflection.", "",
              "## Interpretation limits", ""]
    lines += ["- " + text for text in summary["limitations"]]
    if audit["findings"]:
        lines += ["", "## Audit findings", ""]
        lines += [f"- **{r['level']} / {r['code']}**: {r['message']}" for r in audit["findings"][:40]]
        if len(audit["findings"]) > 40:
            lines.append(f"- Additional findings are in longitudinal-audit.json ({len(audit['findings'])} total).")
    (output / "longitudinal-report.md").write_text("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=OUT)
    parser.add_argument("--allow-partial", action="store_true")
    args = parser.parse_args()
    try:
        summary, code = analyze(args.base.resolve(), args.allow_partial)
    except Exception as exc:
        print(json.dumps({"status": "analysis_failed", "error_type": type(exc).__name__, "error": str(exc)}))
        return 2
    print(json.dumps({k: summary[k] for k in ("status", "snapshot_at", "completed_sessions", "observed_responses",
                                             "runtime_invalid_responses", "integrity_valid", "findings_by_level")}))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
