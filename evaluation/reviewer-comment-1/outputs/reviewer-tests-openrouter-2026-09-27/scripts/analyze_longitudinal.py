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
OPENROUTER_AMENDMENT_ID = "openrouter-gemini-2.5-pro-continuation-2026-09-27"
OPENROUTER_AMENDMENT_SHA256 = "8f3bc5bf34d6a360cfedb3982a7e3775e7c070327ffe449cba22e6030fcf6733"
OPENROUTER_CHECKPOINT_SHA256 = "a0578489d430388289fcf86c1a23d3310ab808c81410df89000d192c0e892678"
OPENROUTER_MODEL_ID = "google/gemini-2.5-pro"
ERROR_HANDLING_AMENDMENT_ID = "openrouter-inband-error-handling-2026-09-27"
ERROR_HANDLING_AMENDMENT_SHA256 = "2b65d9b1249b4521c27a9e7ed387a8bd1a96032e70ab246242d8844cf5e84e5b"
ERROR_HANDLING_CHECKPOINT_SHA256 = "a11e7aaf5eed996ccf4064e09eff15cc5733f7cc1fe2aaf9946a65503df64286"
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


def audit_endpoint_amendment(base: Path, manifest: dict, finding) -> dict:
    """Verify the immutable archive and narrowly permit its declared continuation."""
    amendment_path = base / "endpoint-amendment.json"
    amendment = read_json(amendment_path)
    archive = Path(amendment["source_directory"])
    inherited_manifest_path = base / amendment["inherited_file_manifest"]
    inherited = read_json(inherited_manifest_path)
    files, inherited_sessions, api_snapshot_lines = [], {}, {}

    def require(ok, code, message, **context):
        if not ok:
            finding("error", code, message, **context)
        return bool(ok)

    require(amendment["id"] == manifest.get("endpoint_amendment_id")
            and digest(amendment_path) == manifest.get("endpoint_amendment_sha256"),
            "endpoint_amendment_changed", "The endpoint amendment differs from the continuation manifest.")
    require(digest(inherited_manifest_path) == amendment["inherited_file_manifest_sha256"]
            == manifest.get("inherited_file_manifest_sha256"),
            "inherited_manifest_changed", "The archived-input hash manifest has changed.")
    require(amendment["inherited_region"] == "us-central1" and amendment["continuation_region"] == "global"
            and manifest["region"] == "global" and amendment["model_id"] == manifest["model_id"],
            "unsupported_endpoint_amendment", "Only the declared us-central1 to global transition with the same model is permitted.")
    require(amendment.get("substantive_research_input_changes") == [],
            "substantive_amendment_not_allowed", "This continuation cannot authorize substantive research-input changes.")
    current_invariants = {"longitudinal-source-manifest.json", "longitudinal/scenarios.json", "longitudinal/verify_scenarios.py"}
    for relative, expected in amendment["invariant_hashes"].items():
        original = archive / relative
        require(original.exists() and digest(original) == expected, "archived_invariant_changed",
                "An original pre-amendment input changed.", path=str(original))
        if relative in current_invariants:
            require((base / relative).exists() and digest(base / relative) == expected,
                    "continued_research_input_changed", "A source/scenario/scorer invariant changed in the continuation.", path=relative)
    original_manifest = read_json(archive / "longitudinal/manifest.json")
    permitted_manifest_changes = {"prepared_at", "region", "session_runner_sha256", "protocol_sha256"}
    for key, value in original_manifest.items():
        if key not in permitted_manifest_changes:
            require(manifest.get(key) == value, "substantive_manifest_change",
                    "A predeclared setting, schedule or source hash changed beyond the endpoint amendment.", field=key)
    for relative, expected in inherited.items():
        source = archive / relative
        source_valid = source.exists() and digest(source) == expected
        require(source_valid, "inherited_archive_hash_mismatch", "Archived inherited bytes no longer match their captured hash.", path=str(source))
        if source_valid and relative.startswith("longitudinal/results/") and relative.endswith("/session.json"):
            inherited_sessions[relative] = read_json(source)
    for relative, expected in inherited.items():
        if not relative.startswith("longitudinal/results/"):
            continue
        source, current = archive / relative, base / relative
        source_valid = source.exists() and digest(source) == expected
        row = {"path": relative, "archived_sha256": expected, "archive_verified": source_valid,
               "retention_rule": None, "retained": False}
        if not source_valid or not current.exists():
            require(current.exists(), "inherited_file_missing", "An inherited longitudinal file is missing.", path=relative)
            files.append(row)
            continue
        original_bytes, current_bytes = source.read_bytes(), current.read_bytes()
        parent_session = inherited_sessions.get(str(Path(relative).parent / "session.json"))
        if parent_session and parent_session["status"] == "completed":
            row["retention_rule"] = "completed_session_file_byte_identical"
            row["retained"] = current_bytes == original_bytes
        elif relative.endswith("/session.json"):
            before, after = json.loads(original_bytes), json.loads(current_bytes)
            old_turns = before.get("turns", [])
            row["retention_rule"] = "partial_session_accepted_turn_prefix_and_original_metadata"
            row["retained"] = after.get("turns", [])[:len(old_turns)] == old_turns and all(
                after.get(key) == value for key, value in before.items() if key not in {"turns", "status"})
        elif relative.endswith("/process-monitor.json"):
            row["retention_rule"] = "mutable_process_monitor_original_archived"
            row["retained"] = True
        elif "/runs/" in relative and relative.endswith(".json"):
            before, after = json.loads(original_bytes), json.loads(current_bytes)
            old_sessions, new_sessions = before.get("sessions", []), after.get("sessions", [])
            retained = len(new_sessions) >= len(old_sessions)
            for old, new in zip(old_sessions, new_sessions):
                if old.get("ended_at"):
                    retained = retained and old == new
                else:
                    retained = retained and new.get("turns", [])[:len(old.get("turns", []))] == old.get("turns", [])
                    retained = retained and all(new.get(k) == v for k, v in old.items()
                                                 if k not in {"turns", "final_state", "last_updated_at"})
            row["retention_rule"] = "ledger_completed_entries_identical_and_partial_turn_prefix"
            row["retained"] = retained
        elif relative.endswith((".jsonl", "/process.log")):
            row["retention_rule"] = "append_only_original_byte_prefix"
            row["retained"] = current_bytes.startswith(original_bytes)
        else:
            row["retention_rule"] = "byte_identical"
            row["retained"] = current_bytes == original_bytes
        require(row["retained"], "inherited_content_changed", "Previously accepted data, API attempts or completed session artifacts changed.", **row)
        if relative.endswith("/api_records.jsonl") and source_valid and row["retained"]:
            api_snapshot_lines[relative] = len(original_bytes.splitlines())
            row["inherited_bytes"] = len(original_bytes)
            row["inherited_lines"] = api_snapshot_lines[relative]
        files.append(row)
    # Prompt construction itself is invariant; this does not load any runtime module.
    original_ast = ast.parse((archive / "scripts/run_longitudinal_session.py").read_text())
    current_ast = ast.parse((base / "scripts/run_longitudinal_session.py").read_text())
    prompt_function_hashes = {}
    for name in ("baseline_prompt", "narrative_from_profile"):
        old = next(n for n in original_ast.body if isinstance(n, ast.FunctionDef) and n.name == name)
        new = next(n for n in current_ast.body if isinstance(n, ast.FunctionDef) and n.name == name)
        matches = ast.dump(old, include_attributes=False) == ast.dump(new, include_attributes=False)
        require(matches, "patient_prompt_function_changed", "A baseline prompt/profile serialization function changed.", function=name)
        prompt_function_hashes[name] = hashlib.sha256(ast.dump(new, include_attributes=False).encode()).hexdigest()
    return {"amendment": amendment, "archived_input_files_checked": len(inherited),
            "longitudinal_retention_checks": files, "inherited_sessions": inherited_sessions,
            "api_snapshot_lines": api_snapshot_lines, "prompt_function_ast_hashes": prompt_function_hashes}


def audit_process_resumption(base: Path, manifest: dict, finding) -> dict:
    """Protect the later user-pause checkpoint without changing scientific inputs."""
    record_path = base / "process-resumption.json"
    resumption = read_json(record_path)
    checkpoint_path = base / resumption["checkpoint_manifest"]
    checkpoints = read_json(checkpoint_path)
    archive = base / resumption["checkpoint_archive"]
    files, sessions, api_lines, uncommitted_stops = [], {}, {}, []

    def require(ok, code, message, **context):
        if not ok:
            finding("error", code, message, **context)
        return bool(ok)

    require(digest(checkpoint_path) == resumption["checkpoint_manifest_sha256"]
            and len(checkpoints) == resumption["checkpoint_files"],
            "pause_checkpoint_manifest_changed", "User-pause checkpoint manifest/hash/count differs from the declared resumption.")
    require(resumption["region"] == manifest["region"] == "global"
            and resumption["model_id"] == manifest["model_id"]
            and resumption["endpoint_amendment_id"] == manifest["endpoint_amendment_id"]
            and all(resumption.get(k) is False for k in ("scientific_generation_inputs_changed", "source_snapshots_changed", "scenarios_or_scoring_changed"))
            and resumption["original_worker_limit_per_campaign"] == manifest["concurrent_sessions"] == 2
            and resumption["actual_requested_workers"]["longitudinal"] == 1,
            "unsupported_process_resumption", "The user-pause resumption must retain global/model/scientific inputs and use one worker under the original limit of two.")
    for relative, expected in checkpoints.items():
        path = archive / relative
        verified = require(path.exists() and digest(path) == expected,
                           "pause_checkpoint_archive_changed", "Archived user-pause bytes differ from their captured hash.", path=relative)
        if verified and relative.startswith("longitudinal/results/") and relative.endswith("/session.json"):
            sessions[relative] = read_json(path)
    require(sum(s["status"] == "completed" for s in sessions.values()) == resumption["completed_longitudinal_sessions_retained"]
            and sum(len(s["turns"]) for s in sessions.values()) == resumption["saved_longitudinal_turns_retained"],
            "pause_checkpoint_count_mismatch", "Checkpoint session/accepted-turn counts differ from the resumption declaration.")
    declared_partial = {(r["patient_id"], r["condition"], r["session_index"], r["saved_turns"]) for r in resumption["partial_sessions"]}
    observed_partial = {(r["patient_id"], r["condition"], r["session_index"], len(r["turns"])) for r in sessions.values() if r["status"] != "completed"}
    require(declared_partial == observed_partial, "pause_partial_sessions_changed", "The declared partial sessions differ from the checkpoint.")
    for relative, expected in checkpoints.items():
        if not relative.startswith("longitudinal/results/"):
            continue
        source, current = archive / relative, base / relative
        source_valid = source.exists() and digest(source) == expected
        row = {"path": relative, "checkpoint_sha256": expected, "archive_verified": source_valid,
               "retention_rule": None, "retained": False}
        if not source_valid or not current.exists():
            require(current.exists(), "pause_checkpoint_file_missing", "A checkpointed longitudinal file is missing.", path=relative)
            files.append(row)
            continue
        old_bytes, new_bytes = source.read_bytes(), current.read_bytes()
        session = sessions.get(str(Path(relative).parent / "session.json"))
        if session and session["status"] == "completed":
            row["retention_rule"] = "completed_session_file_byte_identical"
            row["retained"] = old_bytes == new_bytes
        elif relative.endswith("/session.json"):
            old, new = json.loads(old_bytes), json.loads(new_bytes)
            row["retention_rule"] = "accepted_turn_and_execution_history_prefixes_original_metadata_retained"
            row["retained"] = all(new.get(k, [])[:len(old.get(k, []))] == old.get(k, []) for k in ("turns", "execution_history", "resumed_at")) and all(
                new.get(k) == v for k, v in old.items() if k not in {"turns", "status", "execution_history", "resumed_at"})
        elif relative.endswith("/process-monitor.json"):
            row["retention_rule"], row["retained"] = "mutable_process_monitor_original_archived", True
        elif "/runs/" in relative and relative.endswith(".json"):
            old, new = json.loads(old_bytes), json.loads(new_bytes)
            old_sessions, new_sessions = old.get("sessions", []), new.get("sessions", [])
            retained = len(new_sessions) >= len(old_sessions)
            for previous, continued in zip(old_sessions, new_sessions):
                if previous.get("ended_at"):
                    retained = retained and previous == continued
                else:
                    retained = retained and continued.get("turns", [])[:len(previous.get("turns", []))] == previous.get("turns", [])
                    retained = retained and all(continued.get(k) == v for k, v in previous.items() if k not in {"turns", "final_state", "last_updated_at"})
            row["retention_rule"], row["retained"] = "completed_ledger_entries_and_partial_turn_prefix", retained
        elif relative.endswith((".jsonl", "/process.log")):
            row["retention_rule"], row["retained"] = "original_byte_prefix", new_bytes.startswith(old_bytes)
        else:
            row["retention_rule"], row["retained"] = "byte_identical", old_bytes == new_bytes
        require(row["retained"], "pause_checkpoint_content_changed", "Accepted data, recorded failures or API prefixes changed after the user pause.", **row)
        if relative.endswith("/api_records.jsonl") and row["retained"]:
            api_lines[relative] = len(old_bytes.splitlines())
            row["checkpoint_bytes"], row["checkpoint_lines"] = len(old_bytes), api_lines[relative]
            accepted_ids = {turn["turn_id"] for turn in session["turns"]} if session else set()
            for line in old_bytes.splitlines():
                event = json.loads(line)
                visible_stop = any(c.get("finish_reason") == "STOP" and any(part.get("text") and not part.get("thought") for part in c.get("content", {}).get("parts", [])) for c in event.get("response", {}).get("candidates", []))
                if event.get("stage") == "patient_response" and event.get("turn_id") not in accepted_ids and visible_stop:
                    uncommitted_stops.append({"path": relative, "turn_id": event.get("turn_id"), "attempt_id": event.get("attempt_id")})
        files.append(row)
    require(not uncommitted_stops, "pause_uncommitted_stop_requires_reconciliation",
            "A checkpointed uncommitted patient turn has a visible STOP answer; do not generate its replacement.", outcomes=uncommitted_stops)
    status_path = base / "longitudinal/status.json"
    status = read_json(status_path) if status_path.exists() else {}
    execution = status.get("controller_execution", {})
    if execution.get("process_resumption_id") == resumption["id"]:
        require(execution.get("process_resumption_sha256") == digest(record_path)
                and execution.get("actual_workers") == resumption["actual_requested_workers"]["longitudinal"]
                and execution.get("original_worker_limit") == manifest["concurrent_sessions"],
                "controller_resumption_metadata_mismatch", "Controller execution metadata does not match the recorded resumption and actual reduced worker count.")
    return {"resumption": resumption, "process_resumption_sha256": digest(record_path),
            "archived_input_files_checked": len(checkpoints), "longitudinal_retention_checks": files,
            "checkpoint_sessions": sessions, "api_snapshot_lines": api_lines,
            "uncommitted_visible_stop_outcomes": uncommitted_stops,
            "controller_execution": execution, "new_controller_execution_recorded": execution.get("process_resumption_id") == resumption["id"]}


def audit_rate_limit_support(base: Path, manifest: dict, finding, process_audit=None):
    """Add transport/checkpoint provenance while retaining the earlier audits."""
    amendment_path = base / "rate-limit-amendment.json"
    if not amendment_path.exists():
        return None
    amendment = read_json(amendment_path)

    def require(ok, code, message, **context):
        if not ok:
            finding("error", code, message, **context)
        return bool(ok)

    require(amendment.get("id") == "vertex-shared-rate-limit-2026-09-27"
            and amendment.get("scientific_inputs_changed") is False
            and amendment.get("original_response_acceptance_changed") is False,
            "unsupported_rate_limit_amendment", "Only the declared transport amendment with unchanged scientific inputs and original response acceptance is permitted.")
    module_path = base / "scripts/campaign_rate_limit.py"
    spec = importlib.util.spec_from_file_location("campaign_rate_limit_audit_support", module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    overlay_audit = module.audit_rate_limit_amendment(base)
    for error in overlay_audit.get("validation_errors", []):
        finding("error", "rate_limit_runtime_integrity", "Transport amendment validation failed.", detail=error)
    require(overlay_audit.get("integrity_valid") is True and not overlay_audit.get("validation_errors"),
            "rate_limit_runtime_not_verified", "The transport overlay/runtime hashes are not verified.")
    checkpoint_path = base / amendment["checkpoint_manifest"]
    checkpoints = read_json(checkpoint_path)
    archive = base / amendment["checkpoint_archive"]
    require(digest(checkpoint_path) == amendment["checkpoint_manifest_sha256"]
            == "606246a0bc0e5478d462fa362ce069c25a5d436315ab122ebcc4d55373a73660"
            and len(checkpoints) == amendment["checkpoint_files"] == 375
            and overlay_audit.get("verified_checkpoint_files") == 375,
            "rate_limit_checkpoint_changed", "The post-resumption stop checkpoint must retain its exact 375-file manifest and hash.")
    expected_counts = {"phq_complete": 68, "phq_saved_partial_items": 12,
                       "longitudinal_complete": 32, "longitudinal_saved_turns": 165}
    require(amendment.get("accepted_counts") == expected_counts,
            "rate_limit_accepted_counts_changed", "Transport amendment accepted counts differ from the archived checkpoint.")
    # All longitudinal bytes are identical to the already verified user-pause
    # checkpoint. No new prompt exception is introduced by this amendment.
    if process_audit is None:
        process_audit = audit_process_resumption(base, manifest, finding)
    prior_manifest = read_json(base / process_audit["resumption"]["checkpoint_manifest"])
    longitudinal_files = {p: h for p, h in checkpoints.items() if p.startswith("longitudinal/")}
    previous_longitudinal_files = {p: h for p, h in prior_manifest.items() if p.startswith("longitudinal/")}
    identical_longitudinal_checkpoint = require(longitudinal_files == previous_longitudinal_files and len(longitudinal_files) == 151,
        "rate_limit_longitudinal_checkpoint_differs", "The latest longitudinal checkpoint must equal the earlier user-pause checkpoint; no broader prompt exception is authorized.")
    require(all(row["retained"] for row in process_audit["longitudinal_retention_checks"])
            and not process_audit["uncommitted_visible_stop_outcomes"],
            "rate_limit_longitudinal_retention_failed", "Longitudinal completed files/accepted prefixes and uncommitted STOP checks must still pass.")
    phq_files = {p: h for p, h in checkpoints.items() if p.startswith("phq/")}
    phq_audit = {"verified_archived_files": 0, "completed_runs_retained": 0,
                 "identical_completed_files": 0, "api_byte_prefixes_retained": 0,
                 "partial_answers_retained": 0, "metadata_history_prefixes_retained": 0}
    verified, record_counts = {}, {}
    for relative, expected in phq_files.items():
        source = archive / relative
        if require(source.is_file() and digest(source) == expected,
                   "rate_limit_phq_archive_changed", "A PHQ checkpoint file changed or is missing.", path=relative):
            verified[relative] = source.read_bytes()
            phq_audit["verified_archived_files"] += 1
    for run in sorted({str(Path(p).parent) for p in phq_files}):
        run_files = {p: raw for p, raw in verified.items() if str(Path(p).parent) == run}
        complete = f"{run}/phq9.json" in run_files
        if complete:
            phq_audit["completed_runs_retained"] += 1
        for relative, raw in run_files.items():
            current = base / relative
            name = Path(relative).name
            if name in {"api_records.json", "api_records.jsonl"}:
                record_counts[run] = len(json.loads(raw)) if name.endswith(".json") else len([line for line in raw.splitlines() if line.strip()])
            if complete:
                if require(current.is_file() and current.read_bytes() == raw,
                           "rate_limit_complete_phq_changed", "A completed PHQ checkpoint file was modified.", path=relative):
                    phq_audit["identical_completed_files"] += 1
            elif name in {"api_records.json", "api_records.jsonl"}:
                retained = current.is_file() and current.read_bytes().startswith(raw)
                if name.endswith(".json"):
                    retained = retained and current.read_bytes() == raw
                if require(retained, "rate_limit_phq_api_prefix_changed", "PHQ raw API bytes preceding the rate amendment were modified.", path=relative):
                    phq_audit["api_byte_prefixes_retained"] += 1
            elif name == "phq9.partial.json":
                saved = json.loads(raw)["answers"]
                target = base / f"{run}/phq9.json" if (base / f"{run}/phq9.json").is_file() else current
                answers = read_json(target).get("answers", {}) if target.is_file() else {}
                for item, value in saved.items():
                    if require(answers.get(item) == value, "rate_limit_saved_phq_answer_changed", "An accepted PHQ answer from the latest checkpoint was lost or changed.", run=run, item=item):
                        phq_audit["partial_answers_retained"] += 1
            elif name == "metadata.json":
                old, new = json.loads(raw), read_json(current) if current.is_file() else {}
                for field in ("execution_segments", "resumed_at"):
                    previous = old.get(field, [])
                    if require(new.get(field, [])[:len(previous)] == previous, "rate_limit_phq_execution_history_changed", "PHQ execution metadata history was changed.", run=run, field=field):
                        phq_audit["metadata_history_prefixes_retained"] += 1
    require(phq_audit["verified_archived_files"] == 224 and phq_audit["completed_runs_retained"] == 68
            and phq_audit["identical_completed_files"] == 204 and phq_audit["partial_answers_retained"] == 12,
            "rate_limit_phq_retention_count_mismatch", "Latest PHQ checkpoint retention must prove 68 complete runs, their 204 files, and all 12 saved partial items.")
    return {"id": amendment["id"], "amendment_sha256": digest(amendment_path),
            "checkpoint_manifest": amendment["checkpoint_manifest"], "checkpoint_manifest_sha256": amendment["checkpoint_manifest_sha256"],
            "overlay_validation": overlay_audit, "accepted_counts": amendment["accepted_counts"],
            "phq_checkpoint_validation": phq_audit, "phq_checkpoint_record_counts": record_counts,
            "longitudinal_checkpoint_files": len(longitudinal_files),
            "longitudinal_checkpoint_identical_to_user_pause": identical_longitudinal_checkpoint,
            "longitudinal_retention_verified": all(r["retained"] for r in process_audit["longitudinal_retention_checks"]),
            "new_longitudinal_prompt_exception": False}


def audit_rate_limit_sidecar(base: Path, rate_audit: dict, response_pairs: list, finding):
    """Link accepted post-amendment outputs to the external transport observer."""
    amendment = rate_audit["overlay_validation"]["amendment"]
    path = base / amendment["events_file"]
    events = [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []
    counts = Counter()
    for event in events:
        if event.get("amendment_id") != rate_audit["id"]:
            finding("error", "rate_limit_sidecar_amendment_mismatch", "Transport sidecar event has an unexpected amendment ID.", path=str(path))
        if event.get("kind") == "response_returned":
            counts[(event.get("api_records_path"), event.get("response_id"))] += 1
    verified = 0
    for api_path, response_id in response_pairs:
        count = counts[(api_path, response_id)]
        if count != 1:
            finding("error", "rate_limit_patient_response_sidecar_mismatch", "An accepted post-amendment response must have exactly one matching transport sidecar event.", api_records_path=api_path, response_id=response_id, matching_events=count)
        else:
            verified += 1
    return {"path": str(path.relative_to(base)), "events": len(events),
            "events_by_kind": dict(Counter(event.get("kind") for event in events)),
            "required_accepted_responses": len(response_pairs), "verified_accepted_responses": verified}


def audit_openrouter_support(base: Path, manifest: dict, finding, process_audit=None, allow_partial=False):
    """Audit a provider continuation separately from the earlier Vertex epochs."""
    path = base / "openrouter-provider-amendment.json"
    if not path.exists():
        return None
    amendment = read_json(path)

    def require(ok, code, message, **context):
        if not ok:
            finding("error", code, message, **context)
        return bool(ok)

    module_path = base / "scripts/campaign_openrouter.py"
    spec = importlib.util.spec_from_file_location("campaign_openrouter_audit_support", module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    runtime_audit = module.audit_openrouter_amendment(base)
    for error in runtime_audit.get("validation_errors", []):
        finding("error", "openrouter_runtime_integrity", "OpenRouter runtime/amendment verification failed.", detail=error)
    require(runtime_audit.get("integrity_valid") is True and not runtime_audit.get("validation_errors"),
            "openrouter_runtime_not_verified", "The new transport and wrapper must be frozen and verified before analysis.")
    require(amendment.get("id") == OPENROUTER_AMENDMENT_ID and amendment.get("model_id") == OPENROUTER_MODEL_ID,
            "unsupported_openrouter_model", "Only the declared Gemini 2.5 Pro provider continuation is permitted.")
    preflight = read_json(base / "runtime/openrouter-preflight.json")
    require(digest(path) == preflight.get("amendment_sha256") == OPENROUTER_AMENDMENT_SHA256
            and preflight.get("amendment_id") == OPENROUTER_AMENDMENT_ID
            and preflight.get("integration_tests_passed") == 20 and preflight.get("transport_tests_passed") == 14
            and preflight.get("total_tests_passed") == 34 and preflight.get("scientific_functions_preserved") is True
            and preflight.get("all_inherited_files_verified") == 375 and preflight.get("runtime_files_verified") == 6
            and preflight.get("scientific_inference_started") is False,
            "openrouter_preflight_mismatch", "The exact revision-two amendment and its 34-test pre-inference evidence must remain frozen.")
    require(amendment.get("frozen_before_scientific_inference") is True
            and amendment.get("legacy_model_id") == manifest["model_id"] == "gemini-2.5-pro"
            and amendment.get("continuation_provider") == amendment.get("continuation_region") == "openrouter"
            and amendment.get("model_fallbacks_allowed") is False
            and amendment.get("transport_parameter_mapping_changed") is True
            and all(amendment.get(key) is False for key in (
                "original_source_snapshots_changed", "original_response_acceptance_changed",
                "clinical_prompts_changed", "scenarios_and_scoring_changed")),
            "unsupported_openrouter_scientific_change", "The frozen provider amendment must declare the mapping difference and preserve source, prompts, scoring and response acceptance.")
    require(amendment.get("parameter_mapping", {}).get("top_k", {}).get("forwarded") is False
            and amendment.get("parameter_mapping", {}).get("safety_settings", {}).get("forwarded") is False,
            "openrouter_omissions_not_declared", "The unavailable top_k and Vertex safety controls must be explicitly declared as not forwarded.")
    checkpoint_path = base / amendment["checkpoint_manifest"]
    checkpoints = read_json(checkpoint_path)
    archive = base / amendment["checkpoint_archive"]
    require(amendment["checkpoint_manifest"] == "openrouter-input-manifest.json"
            and digest(checkpoint_path) == amendment["checkpoint_manifest_sha256"] == OPENROUTER_CHECKPOINT_SHA256
            and len(checkpoints) == 375 and runtime_audit.get("verified_checkpoint_files") == 375,
            "openrouter_checkpoint_changed", "The OpenRouter continuation must preserve its exact 375-file checkpoint.")
    expected_counts = {"phq_complete": 68, "phq_saved_partial_items": 12,
                       "longitudinal_complete": 32, "longitudinal_saved_turns": 165}
    require(amendment.get("inherited_counts") == {
                "phq_complete_administrations": 68, "phq_saved_partial_items": 12,
                "longitudinal_completed_sessions": 32, "longitudinal_observed_turns": 165},
            "openrouter_accepted_counts_changed", "The new provider cannot replace previously accepted outputs.")
    for relative, expected in amendment.get("invariant_hashes", {}).items():
        current = base / relative
        require(current.is_file() and digest(current) == expected,
                "openrouter_research_invariant_changed", "A declared scientific input or historical gate changed.", path=relative)
    if process_audit is None:
        process_audit = audit_process_resumption(base, manifest, finding)
    previous = read_json(base / process_audit["resumption"]["checkpoint_manifest"])
    longitudinal_files = {p: h for p, h in checkpoints.items() if p.startswith("longitudinal/")}
    previous_longitudinal = {p: h for p, h in previous.items() if p.startswith("longitudinal/")}
    same_longitudinal = require(longitudinal_files == previous_longitudinal and len(longitudinal_files) == 151,
        "openrouter_longitudinal_checkpoint_differs", "No new longitudinal prompt exception is allowed; all 151 checkpoint hashes must equal the already audited user-pause checkpoint.")
    retention_verified = all(r["retained"] for r in process_audit["longitudinal_retention_checks"])
    require(retention_verified and not process_audit["uncommitted_visible_stop_outcomes"],
        "openrouter_longitudinal_retention_failed", "Accepted turns, completed files and API byte prefixes must remain preserved, with no uncommitted STOP response replay.")

    phq_audit = {"verified_archived_files": 0, "completed_runs_retained": 0,
                 "identical_completed_files": 0, "api_byte_prefixes_retained": 0,
                 "partial_answers_retained": 0, "metadata_history_prefixes_retained": 0}
    verified, record_counts, metadata = {}, {}, {}
    for relative, expected in checkpoints.items():
        if not relative.startswith("phq/"):
            continue
        source = archive / relative
        if require(source.is_file() and digest(source) == expected,
                   "openrouter_phq_archive_changed", "An archived PHQ checkpoint file changed or is missing.", path=relative):
            verified[relative] = source.read_bytes()
            phq_audit["verified_archived_files"] += 1
    for run in sorted({str(Path(p).parent) for p in verified}):
        run_files = {p: raw for p, raw in verified.items() if str(Path(p).parent) == run}
        complete = f"{run}/phq9.json" in run_files
        if complete:
            phq_audit["completed_runs_retained"] += 1
        for relative, raw in run_files.items():
            current = base / relative
            name = Path(relative).name
            if name in {"api_records.json", "api_records.jsonl"}:
                record_counts[run] = len(json.loads(raw)) if name.endswith(".json") else len([line for line in raw.splitlines() if line.strip()])
            if name == "metadata.json":
                metadata[run] = json.loads(raw)
            if complete:
                if require(current.is_file() and current.read_bytes() == raw,
                           "openrouter_complete_phq_changed", "A completed PHQ checkpoint file changed.", path=relative):
                    phq_audit["identical_completed_files"] += 1
            elif name in {"api_records.json", "api_records.jsonl"}:
                retained = current.is_file() and current.read_bytes().startswith(raw)
                if name.endswith(".json"):
                    retained = retained and current.read_bytes() == raw
                if require(retained, "openrouter_phq_api_prefix_changed", "PHQ API bytes preceding the provider amendment changed.", path=relative):
                    phq_audit["api_byte_prefixes_retained"] += 1
            elif name == "phq9.partial.json":
                saved = json.loads(raw)["answers"]
                target = base / f"{run}/phq9.json" if (base / f"{run}/phq9.json").is_file() else current
                answers = read_json(target).get("answers", {}) if target.is_file() else {}
                for item, value in saved.items():
                    if require(answers.get(item) == value, "openrouter_saved_phq_answer_changed", "An accepted PHQ answer was lost or replaced.", run=run, item=item):
                        phq_audit["partial_answers_retained"] += 1
            elif name == "metadata.json":
                old, new = json.loads(raw), read_json(current) if current.is_file() else {}
                for field in ("execution_segments", "resumed_at"):
                    previous_values = old.get(field, [])
                    if require(new.get(field, [])[:len(previous_values)] == previous_values,
                               "openrouter_phq_execution_history_changed", "An inherited execution segment was rewritten.", run=run, field=field):
                        phq_audit["metadata_history_prefixes_retained"] += 1
                for field in ("patient_id", "run", "started_at", "region", "provider", "model_id"):
                    require(new.get(field) == old.get(field), "openrouter_phq_origin_metadata_changed",
                            "Inherited PHQ origin metadata must be retained; append the new execution instead.", run=run, field=field)
    require(phq_audit["verified_archived_files"] == 224 and phq_audit["completed_runs_retained"] == 68
            and phq_audit["identical_completed_files"] == 204 and phq_audit["partial_answers_retained"] == 12,
            "openrouter_phq_retention_count_mismatch", "PHQ retention must prove 68 completed runs, all 204 completed files and all 12 accepted partial items.")
    old_source = (base / "scripts/run_longitudinal_session.py").read_text()
    new_source = (base / "scripts/run_longitudinal_session_openrouter.py").read_text()
    old_tree, new_tree = ast.parse(old_source), ast.parse(new_source)
    prompt_function_hashes = {}
    function_source_hashes = {}
    for name in ("baseline_prompt", "narrative_from_profile", "run_full", "run_baseline"):
        old = next(n for n in old_tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == name)
        new = next(n for n in new_tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == name)
        equal = ast.dump(old, include_attributes=False) == ast.dump(new, include_attributes=False)
        require(equal, "openrouter_prompt_function_changed", "Provider continuation must preserve prompt construction and complete profile serialization.", function=name)
        prompt_function_hashes[name] = hashlib.sha256(ast.dump(new, include_attributes=False).encode()).hexdigest()
        function_source_hashes[name] = hashlib.sha256(ast.get_source_segment(new_source, new).encode()).hexdigest()
        require(function_source_hashes[name] == amendment.get("preserved_scientific_functions_sha256", {}).get(name)
                and ast.get_source_segment(old_source, old) == ast.get_source_segment(new_source, new),
                "openrouter_scientific_function_hash_mismatch", "An execution/prompt function differs from its pre-frozen source hash.", function=name)
    return {"id": amendment["id"], "amendment_sha256": digest(path), "amendment": amendment,
            "runtime_validation": runtime_audit, "checkpoint_manifest_sha256": digest(checkpoint_path),
            "preflight_validation": preflight,
            "accepted_counts": expected_counts, "phq_checkpoint_validation": phq_audit,
            "phq_checkpoint_record_counts": record_counts, "phq_checkpoint_metadata": metadata,
            "longitudinal_checkpoint_files": len(longitudinal_files),
            "longitudinal_checkpoint_identical_to_user_pause": same_longitudinal,
            "longitudinal_retention_verified": retention_verified,
            "new_longitudinal_prompt_exception": False, "prompt_function_ast_hashes": prompt_function_hashes,
            "scientific_function_source_hashes": function_source_hashes,
            "analysis_allows_partial": allow_partial,
            "api_snapshot_lines": process_audit["api_snapshot_lines"],
            "checkpoint_sessions": process_audit["checkpoint_sessions"]}


def audit_openrouter_sidecar(base: Path, provider_audit: dict, response_pairs: list, finding):
    """Use the same one-to-one provenance requirement for the new transport."""
    adapted = {"id": provider_audit["id"], "overlay_validation": {"amendment": {
        "events_file": provider_audit["amendment"]["events_file"]}}}
    return audit_rate_limit_sidecar(base, adapted, response_pairs, finding)


def load_openrouter_native_records(base, provider_audit, record_id, finding):
    records = provider_audit.get("native_records")
    if records is not None and len(records.get(record_id, [])) == 2:
        return records
    archive_path = base / provider_audit["amendment"]["native_api_records_file"]
    records = defaultdict(list)
    if archive_path.is_file():
        lines = archive_path.read_text().splitlines()
        for line_no, line in enumerate(lines, 1):
            try:
                event = json.loads(line)
                records[event.get("record_id")].append((line_no, event))
            except json.JSONDecodeError:
                live_tail = provider_audit.get("analysis_allows_partial") and line_no == len(lines)
                finding("warning" if live_tail else "error", "openrouter_native_archive_invalid_json",
                        "A native HTTP archive line is incomplete or invalid; required returned-response UUID pairs must still be complete.",
                        path=str(archive_path), line=line_no)
    provider_audit["native_records"] = records
    return records


def audit_openrouter_response(base: Path, provider_audit: dict, request: dict, response: dict, finding, label):
    """Verify native request/response evidence without importing the transport."""
    checks = []

    def require(ok, code, message, **context):
        checks.append(bool(ok))
        if not ok:
            finding("error", code, message, label=label, **context)
        return bool(ok)

    native = response.get("_openrouter", {})
    cfg = request.get("generation_config", {})
    expected_request = {"model": OPENROUTER_MODEL_ID,
                        "messages": [{"role": "user", "content": request.get("prompt")}],
                        "provider": {"require_parameters": True, "allow_fallbacks": True}}
    for legacy, forwarded in (("temperature", "temperature"), ("max_output_tokens", "max_tokens"),
                              ("top_p", "top_p"), ("stop_sequences", "stop")):
        if legacy in cfg and cfg[legacy] is not None:
            expected_request[forwarded] = cfg[legacy]
    require(native.get("request") == expected_request,
            "openrouter_effective_request_mismatch", "Native HTTP request differs from the exact original prompt and declared parameter mapping; no extra system prompt, seed, reasoning override or model fallback is permitted.")
    require(native.get("endpoint") == provider_audit["amendment"]["endpoint"] == "https://openrouter.ai/api/v1/chat/completions"
            and native.get("omitted_legacy_generation_parameters") == ["top_k"]
            and native.get("safety_settings_forwarded") is False,
            "openrouter_mapping_provenance_mismatch", "The effective endpoint and unsupported legacy parameters must be declared on each response.")
    raw = native.get("response", {})
    require(isinstance(raw, dict) and raw.get("model") == OPENROUTER_MODEL_ID
            and response.get("model_version") == "gemini-2.5-pro"
            and isinstance(raw.get("id"), str) and bool(raw.get("id"))
            and response.get("response_id") == raw.get("id"),
            "openrouter_native_model_or_id_mismatch", "Normalized model/response ID must agree with the native Gemini 2.5 Pro response.")
    choices, candidates = raw.get("choices", []), response.get("candidates", [])
    require(isinstance(choices, list) and bool(choices) and len(choices) == len(candidates),
            "openrouter_candidate_count_mismatch", "Every native choice must map to exactly one normalized candidate.")
    for choice, candidate in zip(choices, candidates):
        content = choice.get("message", {}).get("content")
        if isinstance(content, str):
            visible = content
        elif content is None:
            visible = ""
        elif isinstance(content, list):
            visible = "".join(part["text"] for part in content if isinstance(part, dict)
                              and part.get("type") == "text" and not part.get("thought")
                              and isinstance(part.get("text"), str))
        else:
            visible = None
        normalized_parts = candidate.get("content", {}).get("parts", [])
        normalized_text = "".join(part.get("text", "") for part in normalized_parts)
        finish = {"stop": "STOP", "length": "MAX_TOKENS", "content_filter": "SAFETY"}.get(choice.get("finish_reason"), "OTHER")
        require(visible is not None and normalized_text == visible
                and not any(part.get("thought") for part in normalized_parts)
                and candidate.get("finish_reason") == finish,
                "openrouter_visible_response_mapping_mismatch", "Candidate text must contain only native visible content, with the exact finish-reason mapping; hidden reasoning is not patient text.")
    usage = raw.get("usage")
    expected_usage = {}
    if isinstance(usage, dict):
        reasoning = (usage.get("completion_tokens_details") or {}).get("reasoning_tokens", 0)
        completion = usage.get("completion_tokens", 0)
        prompt = usage.get("prompt_tokens", 0)
        expected_usage = {"prompt_token_count": prompt, "candidates_token_count": completion - reasoning,
                          "thoughts_token_count": reasoning, "total_token_count": usage.get("total_tokens", prompt + completion)}
    normalized_usage = response.get("usage_metadata", {})
    require(all(normalized_usage.get(key, 0) == value for key, value in expected_usage.items()),
            "openrouter_usage_mapping_mismatch", "Native token counts must map without double counting reasoning tokens.")
    record_id = native.get("archive_record_id")
    error_audit = provider_audit.get("error_handling_audit")
    normalization_epoch = "openrouter-v1"
    if error_audit and record_id not in error_audit["native_record_ids_at_checkpoint"]:
        normalization_epoch = error_audit["id"]
        require(not any(choice.get("error") is not None or choice.get("finish_reason") == "error" for choice in choices),
                "transport_error_normalized_as_response", "After the extension, a native in-band error must be archived as a failed attempt, never as a normalized patient or memory response.")
    archive_path = base / provider_audit["amendment"]["native_api_records_file"]
    supplied_path = Path(native.get("archive_path", ""))
    if not supplied_path.is_absolute():
        supplied_path = base / supplied_path
    require(isinstance(record_id, str) and bool(record_id) and native.get("record_id") == record_id
            and supplied_path.resolve() == archive_path.resolve(),
            "openrouter_native_archive_reference_mismatch", "Normalized response must name the declared native HTTP archive and its request UUID.")
    events = load_openrouter_native_records(base, provider_audit, record_id, finding).get(record_id, [])
    requests = [(line, event) for line, event in events if event.get("event") == "request"]
    outcomes = [(line, event) for line, event in events if event.get("event") == "response"]
    require(len(events) == 2 and len(requests) == len(outcomes) == 1,
            "openrouter_native_archive_pair_mismatch", "Each normalized response requires exactly one native request and one native response with its UUID.", archive_record_id=record_id)
    if len(requests) == len(outcomes) == 1:
        before, after = requests[0][1], outcomes[0][1]
        require(requests[0][0] < outcomes[0][0]
                and before.get("request") == after.get("request") == native.get("request")
                and after.get("response") == raw
                and before.get("endpoint") == after.get("endpoint") == native.get("endpoint")
                and before.get("omitted_legacy_generation_parameters") == after.get("omitted_legacy_generation_parameters") == ["top_k"]
                and before.get("safety_settings_forwarded") is after.get("safety_settings_forwarded") is False
                and isinstance(after.get("http_status"), int) and 200 <= after["http_status"] < 300,
                "openrouter_native_archive_content_mismatch", "Archived HTTP payloads, endpoint, omissions and successful status must exactly support the normalized response.", archive_record_id=record_id)
    return {"label": label, "verified": bool(checks) and all(checks), "archive_record_id": record_id,
            "archive_path": str(archive_path.relative_to(base)),
            "native_archive_lines": [line for line, _ in events],
            "response_id": response.get("response_id"), "native_model": raw.get("model"),
            "upstream_provider_reported": raw.get("provider"),
            "upstream_geographic_region": "not attested",
            "normalization_epoch": normalization_epoch,
            "effective_generation_parameters": {key: value for key, value in expected_request.items() if key not in {"model", "messages", "provider"}},
            "routing": expected_request["provider"],
            "omitted_legacy_generation_parameters": ["top_k"], "safety_settings_forwarded": False,
            "native_finish_reasons": [choice.get("finish_reason") for choice in choices],
            "native_response_sha256": canonical_digest(raw), "native_request_sha256": canonical_digest(native.get("request"))}


def public_openrouter_audit(audit):
    if audit is None:
        return None
    return {key: value for key, value in audit.items()
            if key not in {"phq_checkpoint_metadata", "checkpoint_sessions", "native_records", "error_handling_audit"}}


def audit_error_handling_support(base, finding, allow_partial=False):
    """Retain the observed v1 failure and audit the separately frozen extension."""
    declaration_path = base / "openrouter-error-handling-amendment.json"
    if not declaration_path.exists():
        return None
    declaration = read_json(declaration_path)

    def require(ok, code, message, **context):
        if not ok:
            finding("error", code, message, **context)
        return bool(ok)

    spec = importlib.util.spec_from_file_location("openrouter_error_handling_audit_support", base / "scripts/openrouter_error_runtime.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    runtime_audit = module.audit_error_handling_amendment(base)
    for error in runtime_audit.get("validation_errors", []):
        finding("error", "transport_error_runtime_integrity", "Error-handling extension verification failed.", detail=error)
    require(runtime_audit.get("integrity_valid") is True and not runtime_audit.get("validation_errors")
            and runtime_audit.get("runtime_files_verified") == 3,
            "transport_error_runtime_not_verified", "Only the separately frozen three-file transport extension is permitted.")
    checkpoint_path = base / declaration["checkpoint_manifest"]
    archive = base / declaration["checkpoint_archive"]
    checkpoints = read_json(checkpoint_path)
    require(declaration.get("id") == ERROR_HANDLING_AMENDMENT_ID
            and declaration.get("frozen_before_resumption") is True
            and digest(checkpoint_path) == declaration.get("checkpoint_manifest_sha256") == ERROR_HANDLING_CHECKPOINT_SHA256
            and len(checkpoints) == runtime_audit.get("verified_checkpoint_files") == 427,
            "transport_error_checkpoint_changed", "The error-handling continuation must preserve its exact 427-file checkpoint.")
    prior = read_json(base / "openrouter-provider-amendment.json")
    require(digest(declaration_path) == ERROR_HANDLING_AMENDMENT_SHA256
            and declaration.get("previous_amendment_sha256") == OPENROUTER_AMENDMENT_SHA256
            and declaration.get("original_runtime_files_sha256") == prior["runtime_files_sha256"]
            and declaration.get("policy") == prior["policy"]
            and declaration.get("model_id") == OPENROUTER_MODEL_ID
            and all(declaration.get(key) is False for key in ("clinical_prompts_changed", "decoding_parameters_changed",
                "scenarios_and_scoring_changed", "original_source_snapshots_changed", "original_six_openrouter_runtime_files_changed")),
            "transport_error_amendment_changed", "The extension may only change in-band error recognition; original runtime, settings, model and scientific inputs remain frozen.")
    preflight = read_json(base / declaration["preflight_file"])
    require(preflight.get("validation_passed") is True and not preflight.get("validation_errors")
            and preflight.get("amendment_sha256") == ERROR_HANDLING_AMENDMENT_SHA256
            and preflight.get("checkpoint_manifest_sha256") == ERROR_HANDLING_CHECKPOINT_SHA256
            and preflight.get("checkpoint_files_verified") == preflight.get("current_checkpoint_files_unchanged") == 427
            and preflight.get("runtime_files_verified") == 3 and preflight.get("original_runtime_files_verified") == 6
            and preflight.get("frozen_scientific_source_files_verified") == 59 and preflight.get("offline_tests") == 25
            and len(preflight.get("frozen_error_classifier_checks", [])) == 8
            and all(row.get("passed") is True for row in preflight.get("frozen_error_classifier_checks", []))
            and preflight.get("prepare_only", {}).get("exit_code") == 0
            and preflight.get("scientific_inference_started") is False
            and preflight.get("real_api_calls") == preflight.get("real_credential_reads") == 0
            and preflight.get("new_prompt_difference_exception") is False,
            "transport_error_preflight_mismatch", "The pre-inference evidence must prove the 25 offline tests, eight frozen-classifier checks and exact source/checkpoint/runtime freeze.")
    require(digest(base / declaration["offline_tests"]["log"]) == declaration["offline_tests"]["log_sha256"]
            and declaration["offline_tests"]["count"] == 25,
            "transport_error_test_evidence_changed", "The recorded offline test evidence changed.")
    originals = {}
    for relative, expected in checkpoints.items():
        archived = archive / relative
        if require(archived.is_file() and digest(archived) == expected,
                   "transport_error_archive_changed", "An archived checkpoint file changed.", path=relative):
            originals[relative] = archived.read_bytes()
    sessions = {p: json.loads(raw) for p, raw in originals.items()
                if p.startswith("longitudinal/results/") and p.endswith("/session.json")}
    complete_phq_runs = {str(Path(p).parent) for p in originals if p.startswith("phq/") and p.endswith("/phq9.json")}
    partial_phq_answers = {str(Path(p).parent): json.loads(raw)["answers"] for p, raw in originals.items()
                           if p.startswith("phq/") and p.endswith("/phq9.partial.json")
                           and str(Path(p).parent) not in complete_phq_runs}
    counts = {"phq_complete": len(complete_phq_runs),
              "phq_saved_partial_items": sum(len(v) for v in partial_phq_answers.values()),
              "longitudinal_complete": sum(s["status"] == "completed" for s in sessions.values()),
              "longitudinal_saved_turns": sum(len(s["turns"]) for s in sessions.values())}
    require(counts == {"phq_complete": 85, "phq_saved_partial_items": 6,
                       "longitudinal_complete": 35, "longitudinal_saved_turns": 184},
            "transport_error_checkpoint_count_mismatch", "The checkpoint must retain 85 completed PHQs, six partial items, 35 sessions and 184 turns.")
    phq_records, api_lines, retention, uncommitted_stops = {}, {}, [], []
    operational_files = {"completion-observer.json", "longitudinal/status.json", "phq-campaign-status.json",
                         "runtime/openrouter-rate-control/STOP.json"}
    for relative, before_bytes in originals.items():
        current = base / relative
        parent = str(Path(relative).parent)
        old_session = sessions.get(str(Path(relative).parent / "session.json"))
        row = {"path": relative, "checkpoint_sha256": checkpoints[relative], "retained": False}
        if relative in operational_files:
            row.update(retained=True, retention_rule="operational_status_original_immutable_in_checkpoint")
        elif relative.endswith("/phq9.partial.json") and parent not in complete_phq_runs:
            latest = base / parent / "phq9.json" if (base / parent / "phq9.json").is_file() else current
            accepted = json.loads(before_bytes)["answers"]
            after = read_json(latest).get("answers", {}) if latest.is_file() else {}
            row.update(retained=all(after.get(item) == value for item, value in accepted.items()),
                       retention_rule="all_accepted_partial_items_retained")
        elif not current.is_file():
            require(False, "transport_error_checkpoint_file_missing", "A checkpointed data file is missing.", path=relative)
        else:
            after_bytes = current.read_bytes()
            if parent in complete_phq_runs or old_session and old_session["status"] == "completed":
                row.update(retained=before_bytes == after_bytes, retention_rule="completed_file_byte_identical")
            elif relative.endswith("/session.json"):
                before, after = json.loads(before_bytes), json.loads(after_bytes)
                histories = ("turns", "execution_history", "resumed_at", "memory_records")
                dynamic = {*histories, "status", "finished_at", "failed_at", "error", "error_type",
                           "paused_at", "pause_reason", "finalization", "persisted_summary", "persisted_reflection"}
                kept = all(after.get(key, [])[:len(before.get(key, []))] == before.get(key, []) for key in histories)
                kept = kept and all(after.get(key) == value for key, value in before.items() if key not in dynamic)
                row.update(retained=kept, retention_rule="accepted_turn_and_execution_prefixes_original_identity_retained")
            elif relative.startswith("phq/") and relative.endswith("/metadata.json"):
                before, after = json.loads(before_bytes), json.loads(after_bytes)
                fields = ("patient_id", "run", "started_at", "provider", "region", "model_id", "temperature",
                          "max_tokens_initial", "top_p", "top_k", "stop_sequences", "seed", "history",
                          "profile_sha256", "questionnaire_sha256", "runner_sha256", "provider_sha256")
                kept = all(after.get(key) == before.get(key) for key in fields)
                kept = kept and all(after.get(key, [])[:len(before.get(key, []))] == before.get(key, [])
                                    for key in ("execution_segments", "resumed_at"))
                row.update(retained=kept, retention_rule="original_PHQ_metadata_and_execution_prefixes_retained")
            elif "/runs/" in relative and relative.endswith(".json"):
                before, after = json.loads(before_bytes), json.loads(after_bytes)
                old_sessions, new_sessions = before.get("sessions", []), after.get("sessions", [])
                kept = len(new_sessions) >= len(old_sessions)
                for old, new in zip(old_sessions, new_sessions):
                    if old.get("ended_at"):
                        kept = kept and old == new
                    else:
                        kept = kept and new.get("turns", [])[:len(old.get("turns", []))] == old.get("turns", [])
                        kept = kept and all(new.get(key) == value for key, value in old.items()
                                            if key not in {"turns", "final_state", "last_updated_at"})
                row.update(retained=kept, retention_rule="completed_ledger_entries_identical_and_partial_turn_prefix")
            elif relative.endswith("/process-monitor.json"):
                row.update(retained=True, retention_rule="operational_monitor_original_immutable_in_checkpoint")
            elif relative.endswith((".jsonl", "/process.log")):
                row.update(retained=after_bytes.startswith(before_bytes), retention_rule="exact_original_byte_prefix")
            else:
                row.update(retained=after_bytes == before_bytes, retention_rule="byte_identical")
        require(row["retained"], "transport_error_checkpoint_content_changed",
                "Accepted outputs, completed files or archived attempt prefixes changed.", **row)
        retention.append(row)
        if relative.startswith("phq/") and Path(relative).name in {"api_records.json", "api_records.jsonl"}:
            phq_records[parent] = len(json.loads(before_bytes)) if relative.endswith(".json") else len(before_bytes.splitlines())
        if relative.startswith("longitudinal/") and relative.endswith("/api_records.jsonl"):
            api_lines[relative] = len(before_bytes.splitlines())
            accepted_ids = {turn["turn_id"] for turn in old_session.get("turns", [])} if old_session else set()
            for line in before_bytes.splitlines():
                event = json.loads(line)
                visible_stop = any(c.get("finish_reason") == "STOP" and any(p.get("text") and not p.get("thought")
                    for p in c.get("content", {}).get("parts", [])) for c in event.get("response", {}).get("candidates", []))
                if event.get("stage") == "patient_response" and event.get("turn_id") not in accepted_ids and visible_stop:
                    uncommitted_stops.append({"path": relative, "turn_id": event.get("turn_id"), "attempt_id": event.get("attempt_id")})
    require(not uncommitted_stops, "transport_error_uncommitted_stop_requires_reconciliation",
            "A checkpointed patient STOP without a saved turn must be reconciled before generating a replacement.", outcomes=uncommitted_stops)
    partial_sessions = [{"patient_id": s["patient_id"], "condition": s["condition"], "session_index": s["session_index"],
                         "saved_turns": len(s["turns"]), "status": s["status"]}
                        for s in sessions.values() if s["status"] != "completed"]
    require({(s["patient_id"], s["condition"], s["session_index"], s["saved_turns"]) for s in partial_sessions}
            == {("alex_carter_001", "full", 4, 4), ("juanita_delgado_001", "full", 4, 5)},
            "transport_error_partial_sessions_changed", "The declared pause must retain Alex's four turns and Juanita's five turns.")
    native_relative = "runtime/openrouter-api-records.jsonl"
    native_events = [json.loads(line) for line in originals.get(native_relative, b"").splitlines()]
    v1_errors = [{"record_id": event.get("record_id"), "response_id": event.get("response", {}).get("id"),
                  "native_error_choices": [{"finish_reason": choice.get("finish_reason"), "error": choice.get("error")}
                                           for choice in event.get("response", {}).get("choices", []) if choice.get("error") is not None or choice.get("finish_reason") == "error"]}
                 for event in native_events if event.get("event") == "response" and any(choice.get("error") is not None or choice.get("finish_reason") == "error" for choice in event.get("response", {}).get("choices", []))]
    sidecar_relative = "runtime/openrouter-rate-control/events.jsonl"
    execution_path = base / "runtime/openrouter-error-handling-executions.jsonl"
    executions = [json.loads(line) for line in execution_path.read_text().splitlines() if line.strip()] if execution_path.is_file() else []
    for execution in executions:
        require(execution.get("amendment_id") == declaration["id"]
                and execution.get("amendment_sha256") == digest(declaration_path)
                and execution.get("target") in {"complete_phq9_openrouter.py", "run_longitudinal_openrouter.py", "run_openrouter_session.py"},
                "transport_error_execution_metadata_mismatch", "Bootstrap execution is not tied to the exact error-handling amendment.", execution=execution)
    return {"id": declaration["id"], "amendment_sha256": digest(declaration_path), "amendment": declaration,
            "runtime_validation": runtime_audit, "checkpoint_manifest_sha256": digest(checkpoint_path),
            "preflight_validation": preflight,
            "checkpoint_files_verified": len(originals), "checkpoint_counts": counts, "retention_checks": retention,
            "phq_checkpoint_record_counts": phq_records, "longitudinal_api_snapshot_lines": api_lines,
            "checkpoint_sessions": sessions, "partial_sessions": partial_sessions,
            "uncommitted_visible_stop_outcomes": uncommitted_stops,
            "new_longitudinal_prompt_exception": False, "v1_inband_error_responses_retained": v1_errors,
            "native_record_ids_at_checkpoint": sorted({event["record_id"] for event in native_events}),
            "sidecar_checkpoint_lines": len(originals.get(sidecar_relative, b"").splitlines()),
            "execution_records": executions, "analysis_allows_partial": allow_partial}


def public_error_handling_audit(audit):
    return None if audit is None else {key: value for key, value in audit.items() if key != "checkpoint_sessions"}


def audit_error_handling_requests(base, audit, calls, finding, scope):
    """Attribute only new attempts to the extension using the append-only sidecar."""
    if audit is None:
        return
    sidecar_path = base / "runtime/openrouter-rate-control/events.jsonl"
    lines = sidecar_path.read_text().splitlines() if sidecar_path.is_file() else []
    new_events = []
    for index, line in enumerate(lines[audit["sidecar_checkpoint_lines"]:], audit["sidecar_checkpoint_lines"] + 1):
        try:
            new_events.append(json.loads(line))
        except json.JSONDecodeError:
            live_tail = audit["analysis_allows_partial"] and index == len(lines)
            finding("warning" if live_tail else "error", "transport_error_sidecar_incomplete",
                    "An extension sidecar event is incomplete or invalid.", line=index)
    execution_path = base / audit["amendment"]["execution_records_file"]
    executions = [json.loads(line) for line in execution_path.read_text().splitlines() if line.strip()] if execution_path.is_file() else []
    for execution in executions:
        if execution.get("amendment_id") != audit["id"] or execution.get("amendment_sha256") != audit["amendment_sha256"] or execution.get("target") not in {"complete_phq9_openrouter.py", "run_longitudinal_openrouter.py", "run_openrouter_session.py"}:
            finding("error", "transport_error_execution_metadata_mismatch", "A bootstrap record added during analysis does not identify the exact extension.", execution=execution)
    audit["execution_records"] = executions
    for event in new_events:
        if event.get("transport_error_amendment_id") != audit["id"] or event.get("amendment_id") != OPENROUTER_AMENDMENT_ID:
            finding("error", "transport_error_sidecar_identity_missing", "Every new pacing event must declare both provider and transport-error amendments.", kind=event.get("kind"), pid=event.get("pid"))
        path = event.get("api_records_path", "")
        expected_target = "complete_phq9_openrouter.py" if path.startswith("phq/") else "run_openrouter_session.py" if path.startswith("longitudinal/") else None
        matching = [entry for entry in executions if entry.get("pid") == event.get("pid")
                    and (expected_target is None or entry.get("target") == expected_target)
                    and entry.get("at", "") <= event.get("at", "")]
        if not matching:
            finding("error", "transport_error_bootstrap_provenance_missing", "A new sidecar event has no preceding bootstrap execution for its process and campaign target.", pid=event.get("pid"), api_records_path=path)
    response_events = Counter((event.get("api_records_path"), event.get("response_id")) for event in new_events if event.get("kind") == "response_returned")
    started_events = Counter(event.get("api_records_path") for event in new_events if event.get("kind") == "request_started")
    post_calls = []
    for call in calls:
        path = call["api_log"]
        if path.startswith("phq/"):
            limit = audit["phq_checkpoint_record_counts"].get(str(Path(path).parent), 0)
        else:
            limit = audit["longitudinal_api_snapshot_lines"].get(path, 0)
        if call["request_log_line"] <= limit:
            continue
        post_calls.append(call)
        if call.get("stage") == "patient_response":
            session = audit["checkpoint_sessions"].get(str(Path(path).parent / "session.json"))
            accepted_ids = {turn["turn_id"] for turn in session.get("turns", [])} if session else set()
            if call.get("turn_id") in accepted_ids:
                finding("error", "transport_error_accepted_turn_replayed", "A patient turn accepted before this checkpoint was generated again.", api_log=path, turn_id=call.get("turn_id"), attempt_id=call.get("attempt_id"))
        if call.get("response_id") and call.get("status") == "returned":
            if response_events[(path, call["response_id"])] != 1:
                finding("error", "transport_error_response_sidecar_mismatch", "Every post-checkpoint response requires one extension-tagged pacing outcome.", api_log=path, response_id=call["response_id"])
        native = call.get("native_openrouter_validation") or call.get("native_openrouter_error_validation") or {}
        if native.get("archive_record_id") in audit["native_record_ids_at_checkpoint"]:
            finding("error", "transport_error_native_attempt_reused", "A post-checkpoint API attempt cites an already archived native call.", api_log=path, archive_record_id=native.get("archive_record_id"))
    expected_started = Counter(call["api_log"] for call in post_calls)
    for path, count in expected_started.items():
        if started_events[path] < count or not audit["analysis_allows_partial"] and started_events[path] != count:
            finding("error", "transport_error_request_sidecar_mismatch", "Post-checkpoint API attempts do not match the extension-tagged request-start events.", api_log=path, api_requests=count, sidecar_requests=started_events[path])
    juanita_path = "longitudinal/results/juanita_delgado_001/full/session_04/api_records.jsonl"
    juanita_calls = [call for call in post_calls if call["api_log"] == juanita_path]
    audit["request_phase_validation"] = {
        "scope": scope, "pre_checkpoint_requests": len(calls) - len(post_calls), "post_checkpoint_requests": len(post_calls),
        "post_checkpoint_outcomes": dict(Counter(call.get("status") for call in post_calls)),
        "post_checkpoint_error_types": dict(Counter(call["error_type"] for call in post_calls if call.get("error_type"))),
        "post_checkpoint_sidecar_events": len(new_events),
        "juanita_finalization_patient_requests": sum(call.get("stage") == "patient_response" for call in juanita_calls),
        "juanita_finalization_stages": dict(Counter(call.get("stage") for call in juanita_calls)),
        "new_prompt_exceptions": 0}


def audit_openrouter_error(base: Path, provider_audit: dict, request: dict, outcome: dict, finding, label):
    """Join a failed HTTP attempt when the transport supplied its native UUID."""
    record_id = outcome.get("openrouter_archive_record_id")
    if record_id is None:
        return {"label": label, "verified": True, "archive_record_id": None,
                "native_http_attempt_verified": False,
                "evidence_scope": "No native UUID supplied; no native HTTP outcome is invented for a pre-HTTP/local error.",
                "error_type": outcome.get("error_type")}
    checks = []

    def require(ok, code, message):
        checks.append(bool(ok))
        if not ok:
            finding("error", code, message, label=label, archive_record_id=record_id)

    cfg = request.get("generation_config", {})
    expected_request = {"model": OPENROUTER_MODEL_ID,
                        "messages": [{"role": "user", "content": request.get("prompt")}],
                        "provider": {"require_parameters": True, "allow_fallbacks": True}}
    for legacy, forwarded in (("temperature", "temperature"), ("max_output_tokens", "max_tokens"),
                              ("top_p", "top_p"), ("stop_sequences", "stop")):
        if legacy in cfg and cfg[legacy] is not None:
            expected_request[forwarded] = cfg[legacy]
    archive_path = base / provider_audit["amendment"]["native_api_records_file"]
    events = load_openrouter_native_records(base, provider_audit, record_id, finding).get(record_id, [])
    requests = [(line, event) for line, event in events if event.get("event") == "request"]
    errors = [(line, event) for line, event in events if event.get("event") == "error"]
    require(isinstance(record_id, str) and bool(record_id) and len(events) == 2 and len(requests) == len(errors) == 1,
            "openrouter_native_error_pair_mismatch", "A logged native error UUID requires one HTTP request and one error event.")
    if len(requests) == len(errors) == 1:
        before, after = requests[0][1], errors[0][1]
        require(requests[0][0] < errors[0][0]
                and before.get("request") == after.get("request") == expected_request
                and before.get("endpoint") == after.get("endpoint") == provider_audit["amendment"]["endpoint"]
                and before.get("omitted_legacy_generation_parameters") == after.get("omitted_legacy_generation_parameters") == ["top_k"]
                and before.get("safety_settings_forwarded") is after.get("safety_settings_forwarded") is False
                and after.get("error", {}).get("type") == outcome.get("error_type")
                and after.get("error", {}).get("message") == outcome.get("error"),
                "openrouter_native_error_content_mismatch", "The native failed request and sanitized error must exactly support the per-run error record.")
    return {"label": label, "verified": bool(checks) and all(checks), "archive_record_id": record_id,
            "archive_path": str(archive_path.relative_to(base)), "native_archive_lines": [line for line, _ in events],
            "native_http_attempt_verified": bool(checks) and all(checks),
            "error_type": outcome.get("error_type"), "native_request_sha256": canonical_digest(expected_request)}


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

    endpoint_audit = audit_endpoint_amendment(base, manifest, finding)
    amendment = endpoint_audit["amendment"]
    inherited_sessions = endpoint_audit["inherited_sessions"]
    inherited_api_lines = endpoint_audit["api_snapshot_lines"]
    resumption_audit = audit_process_resumption(base, manifest, finding)
    checkpoint_sessions = resumption_audit["checkpoint_sessions"]
    checkpoint_api_lines = resumption_audit["api_snapshot_lines"]
    rate_limit_audit = audit_rate_limit_support(base, manifest, finding, resumption_audit)
    provider_audit = audit_openrouter_support(base, manifest, finding, resumption_audit, allow_partial=allow_partial)
    error_handling_audit = audit_error_handling_support(base, finding, allow_partial=allow_partial)
    if provider_audit:
        provider_audit["error_handling_audit"] = error_handling_audit

    # A source epoch is verified before pooling observations from its sessions.
    integrity = []
    frozen_paths = {
        "endpoint_amendment_sha256": base / "endpoint-amendment.json",
        "inherited_file_manifest_sha256": base / amendment["inherited_file_manifest"],
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
        "endpoint_amendment_sha256": manifest["endpoint_amendment_sha256"],
        "source_manifest_sha256": manifest["source_manifest_sha256"],
        "session_runner_sha256": manifest["session_runner_sha256"],
        "scenarios_sha256": manifest["scenarios_sha256"],
        "model_id": manifest["model_id"],
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
                                    ("scenarios_sha256", "model_id", "temperature", "max_tokens_initial", "provider_seed")}}
                    inherited_session = inherited_sessions.get(str(path.relative_to(base)))
                    checkpoint_session = checkpoint_sessions.get(str(path.relative_to(base)))
                    expected_region = (checkpoint_session["region"] if checkpoint_session else "openrouter") if provider_audit else (
                        inherited_session["region"] if inherited_session else amendment["continuation_region"])
                    endpoint_metadata_valid = item.get("region") == expected_region
                    if provider_audit and not checkpoint_session:
                        endpoint_metadata_valid = endpoint_metadata_valid and item.get("provider") == "openrouter" and item.get("amendment_id") == provider_audit["id"]
                    elif not inherited_session:
                        endpoint_metadata_valid = endpoint_metadata_valid and item.get("amendment_id") == amendment["id"]
                    if not endpoint_metadata_valid:
                        finding("error", "session_endpoint_provenance_mismatch", "Session metadata does not match its inherited origin or declared continuation endpoint.", path=str(path), expected_region=expected_region, actual_region=item.get("region"))
                    row["epoch_fingerprint"] = canonical_digest(record_epoch)
                    row["eligible_epoch"] = source_ok and endpoint_metadata_valid and row["epoch_fingerprint"] == expected_epoch_hash
                    row["origin_region"] = item.get("region")
                    row["inherited_accepted_turns"] = len(inherited_session["turns"]) if inherited_session else 0
                    checkpoint_session = checkpoint_sessions.get(str(path.relative_to(base)))
                    row["accepted_turns_before_user_pause"] = len(checkpoint_session["turns"]) if checkpoint_session else 0
                    row["execution_history"] = item.get("execution_history", [])
                    for execution_index, execution in enumerate(row["execution_history"]):
                        previous_execution = checkpoint_session and execution_index < len(checkpoint_session.get("execution_history", []))
                        if provider_audit and not previous_execution:
                            execution_valid = (execution.get("region") == execution.get("provider") == "openrouter"
                                and execution.get("amendment_id") == provider_audit["id"]
                                and execution.get("session_runner_sha256") == provider_audit["amendment"]["runtime_files_sha256"].get("scripts/run_longitudinal_session_openrouter.py"))
                        else:
                            execution_valid = (execution.get("region") == amendment["continuation_region"]
                                and execution.get("amendment_id") == amendment["id"]
                                and execution.get("session_runner_sha256") == manifest["session_runner_sha256"])
                        if not execution_valid:
                            finding("error", "resumption_provenance_mismatch", "A continued execution record does not match the frozen wrapper and endpoint amendment.", path=str(path), execution=execution)
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
        relative_log = str(log_path.relative_to(base))
        inherited_line_limit = inherited_api_lines.get(relative_log, 0)
        checkpoint_line_limit = checkpoint_api_lines.get(relative_log, 0)
        original_session = inherited_sessions.get(str((directory / "session.json").relative_to(base)))
        inherited_turn_ids = {turn["turn_id"] for turn in original_session["turns"]} if original_session else set()
        checkpoint_session = checkpoint_sessions.get(str((directory / "session.json").relative_to(base)))
        checkpoint_turn_ids = {turn["turn_id"] for turn in checkpoint_session["turns"]} if checkpoint_session else set()
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
                is_inherited = line_no <= inherited_line_limit
                provider_checkpoint_event = bool(provider_audit) and line_no <= provider_audit["api_snapshot_lines"].get(relative_log, 0)
                if is_inherited:
                    event["_audit_region"] = amendment["inherited_region"]
                    event["_endpoint_provenance"] = "hash_verified_inherited_byte_prefix"
                    if event.get("region") not in (None, amendment["inherited_region"]):
                        finding("error", "inherited_event_endpoint_mismatch", "Inherited API event declares an unexpected region.", path=relative_log, line=line_no)
                elif provider_audit and not provider_checkpoint_event and event.get("region") == event.get("provider") == "openrouter" and event.get("amendment_id") == provider_audit["id"]:
                    event["_audit_region"] = "openrouter"
                    event["_endpoint_provenance"] = "explicit_provider_continuation_event"
                elif (not provider_audit or provider_checkpoint_event) and event.get("region") == amendment["continuation_region"] and event.get("amendment_id") == amendment["id"]:
                    event["_audit_region"] = amendment["continuation_region"]
                    event["_endpoint_provenance"] = "hash_verified_provider_checkpoint" if provider_audit else "explicit_continuation_event"
                else:
                    event["_audit_region"] = "unverified"
                    event["_endpoint_provenance"] = "missing_or_invalid_continuation_tags"
                    finding("error", "unverified_api_endpoint", "An API event lacks the endpoint/provider tags required by its verified checkpoint or declared continuation.", path=relative_log, line=line_no)
                event["_inherited"] = is_inherited
                event["_pause_checkpoint"] = line_no <= checkpoint_line_limit
                if not is_inherited and event.get("event") == "request" and event.get("stage") == "patient_response" and event.get("turn_id") in inherited_turn_ids:
                    finding("error", "accepted_inherited_turn_replayed", "A new patient-generation request replays an already accepted inherited turn.", path=relative_log, line=line_no, turn_id=event.get("turn_id"))
                if not event["_pause_checkpoint"] and event.get("event") == "request" and event.get("stage") == "patient_response" and event.get("turn_id") in checkpoint_turn_ids:
                    finding("error", "accepted_checkpoint_turn_replayed", "A patient-generation request after the user pause replays an already accepted checkpoint turn.", path=relative_log, line=line_no, turn_id=event.get("turn_id"))
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
                       "region": req["_audit_region"], "endpoint_provenance": req["_endpoint_provenance"],
                       "provider": "openrouter" if req["_audit_region"] == "openrouter" else "vertex_ai",
                       "inherited_attempt": req["_inherited"],
                       "request_in_user_pause_checkpoint": req["_pause_checkpoint"],
                       "completed_attempt_in_user_pause_checkpoint": req["_pause_checkpoint"] and bool(outcome) and outcome["_pause_checkpoint"],
                       "amendment_id": req.get("amendment_id"),
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
                if req["_audit_region"] == "openrouter" and response:
                    row["native_openrouter_validation"] = audit_openrouter_response(
                        base, provider_audit, req, response, finding, label=f"{relative_log}/{attempt_id}")
                if req["_audit_region"] == "openrouter" and outcome and "error" in outcome:
                    row["native_openrouter_error_validation"] = audit_openrouter_error(
                        base, provider_audit, req, outcome, finding, label=f"{relative_log}/{attempt_id}")
                api_calls.append(row)
                if outcome and (outcome["_audit_region"] != req["_audit_region"] or outcome["_inherited"] != req["_inherited"]):
                    finding("error", "request_outcome_endpoint_mismatch", "An API request/outcome pair has inconsistent endpoint provenance.", attempt_id=attempt_id)
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

    if any(not call["request_in_user_pause_checkpoint"] and call["region"] != "openrouter" for call in api_calls) and not resumption_audit["new_controller_execution_recorded"]:
        finding("error", "post_pause_execution_metadata_missing", "New longitudinal API requests exist after the checkpoint without matching controller resumption/worker metadata.")
    if rate_limit_audit:
        post_rate_calls = [call for call in api_calls if not call["request_in_user_pause_checkpoint"] and call["region"] != "openrouter"]
        rate_limit_audit["post_amendment_api_requests"] = len(post_rate_calls)
        rate_limit_audit["pre_amendment_api_requests"] = len(api_calls) - len(post_rate_calls)
        if post_rate_calls and resumption_audit["controller_execution"].get("rate_limit_amendment_id") != rate_limit_audit["id"]:
            finding("error", "rate_limit_controller_metadata_missing", "Post-checkpoint API calls require explicit rate-limit amendment provenance in controller execution metadata.")
    if provider_audit:
        provider_calls = [call for call in api_calls if call["region"] == "openrouter"]
        provider_audit["post_amendment_api_requests"] = len(provider_calls)
        execution = resumption_audit["controller_execution"]
        provider_audit["controller_execution"] = execution
        if provider_calls and not (execution.get("openrouter_amendment_id") == execution.get("rate_limit_amendment_id") == provider_audit["id"]
                and execution.get("rate_limit_amendment_sha256") == provider_audit["amendment_sha256"]
                and execution.get("session_runner_openrouter_sha256") == provider_audit["amendment"]["runtime_files_sha256"].get("scripts/run_longitudinal_session_openrouter.py")
                and execution.get("actual_workers") == provider_audit["amendment"]["actual_workers"]["longitudinal"] == 1):
            finding("error", "openrouter_controller_metadata_missing", "OpenRouter requests require controller provenance for the exact amendment/wrapper and actual worker count.")

    assertions = []
    turns = []
    history_checks = Counter()
    response_provenance_checks = Counter()
    interrupted_prompt_reconcilations = []
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
                           "api_formatted_text": None, "response_region": None,
                           "generation_attempt_regions": [], "endpoint_provenance": None}
                    if record:
                        if record.get("therapist_text") != spec_turn["text"]:
                            finding("error", "therapist_script_changed", "Recorded therapist input differs from the frozen script.", patient_id=pid, condition=condition, turn_id=tid)
                        requests = request_lookup[(pid, condition, tid, "patient_response")]
                        patient_calls = response_lookup[(pid, condition, tid, "patient_response")]
                        row["patient_api_attempts"] = len(requests)
                        row["generation_attempt_regions"] = sorted({call["region"] for call in patient_calls})
                        stops = [call for call in patient_calls if call["completed_visible_response"]]
                        last_stop = max(stops, key=lambda call: call["outcome_log_line"]) if stops else None
                        if last_stop:
                            raw_text = last_stop["visible_response_text"]
                            formatted = format_full(raw_text.strip()) if condition == "full" else re.sub(
                                r"^\s*Patient\s*:\s*", "", raw_text or "", flags=re.I).strip()
                            row.update(patient_api_attempt_id=last_stop["attempt_id"],
                                       patient_response_id=last_stop["response_id"],
                                       patient_api_log=last_stop["api_log"],
                                       patient_api_outcome_line=last_stop["outcome_log_line"],
                                       api_formatted_text=formatted,
                                       response_region=last_stop["region"], endpoint_provenance=last_stop["endpoint_provenance"])
                        elif len(row["generation_attempt_regions"]) == 1:
                            row["response_region"] = row["generation_attempt_regions"][0]
                            row["endpoint_provenance"] = "runtime_invalid_all_patient_attempts_same_endpoint"
                        elif row["generation_attempt_regions"]:
                            row["response_region"] = "mixed_runtime_failure"
                            row["endpoint_provenance"] = "runtime_invalid_patient_attempts_span_endpoints"
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
                        original_session = inherited_sessions.get(audit["path"])
                        inherited_accepted_ids = {t["turn_id"] for t in original_session["turns"]} if original_session else set()
                        failed_inherited = {call["attempt_id"] for call in patient_calls
                                            if call["inherited_attempt"] and call["region"] == amendment["inherited_region"]
                                            and call["status"] == "error"}
                        uncommitted_at_interruption = original_session is not None and original_session["status"] != "completed" and tid not in inherited_accepted_ids
                        inherited_visible_stops = [call for call in patient_calls if call["inherited_attempt"] and call["completed_visible_response"]]
                        if uncommitted_at_interruption and inherited_visible_stops:
                            finding("error", "uncommitted_inherited_completion_replaced", "An unfinished inherited turn already had a visible STOP answer; it must be reconciled without replacement.", turn_id=tid, condition=condition)
                        pause_session = checkpoint_sessions.get(audit["path"])
                        pause_accepted_ids = {t["turn_id"] for t in pause_session["turns"]} if pause_session else set()
                        uncommitted_at_pause = pause_session is not None and pause_session["status"] != "completed" and tid not in pause_accepted_ids
                        pause_visible_stops = [call for call in patient_calls if call["completed_attempt_in_user_pause_checkpoint"] and call["completed_visible_response"]]
                        failed_checkpoint = {call["attempt_id"] for call in patient_calls
                                             if call["completed_attempt_in_user_pause_checkpoint"] and call["region"] == "global" and call["status"] == "error"}
                        if uncommitted_at_pause and pause_visible_stops:
                            finding("error", "uncommitted_pause_completion_replaced", "A turn uncommitted at the user pause already had a visible STOP answer; it requires reconciliation, not replacement.", turn_id=tid, condition=condition)
                        for req in requests:
                            if req.get("prompt") == prompt:
                                continue
                            allowed_origin = None
                            if uncommitted_at_interruption and not inherited_visible_stops and req["attempt_id"] in failed_inherited:
                                allowed_origin = {"interruption": "regional_capacity", "record_id": amendment["id"]}
                            elif uncommitted_at_pause and not pause_visible_stops and req["attempt_id"] in failed_checkpoint:
                                allowed_origin = {"interruption": "user_pause", "record_id": resumption_audit["resumption"]["id"],
                                                  "checkpoint_manifest_sha256": resumption_audit["resumption"]["checkpoint_manifest_sha256"]}
                            if allowed_origin:
                                interrupted_prompt_reconcilations.append({
                                    **allowed_origin,
                                    "patient_id": pid, "condition": condition, "turn_id": tid,
                                    "inherited_attempt_id": req["attempt_id"], "archived_api_log": audit["path"].replace("session.json", "api_records.jsonl"),
                                    "inherited_failed_prompt": req.get("prompt"), "continued_actual_prompt": prompt,
                                    "accepted_response_id": row["patient_response_id"],
                                    "reason": "Only hash-verified failed requests saved before this interruption on an uncommitted turn may differ after normal state restoration; no prior visible STOP completion existed.",
                                })
                            else:
                                finding("error", "recorded_prompt_differs_from_request", "Stored patient prompt differs from an actual patient-generation request outside the narrow failed/uncommitted inherited exception.", turn_id=tid, condition=condition, attempt_id=req["attempt_id"])
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
                                                   "patient_api_log", "patient_api_outcome_line", "response_region",
                                                   "generation_attempt_regions", "endpoint_provenance")},
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
            finding("error", code, "Requested legacy patient-generation settings differ between conditions.", signatures={c: dict(signatures[c]) for c in CONDITIONS})
    versions_by_condition = {c: sorted({r["model_version"] for r in api_calls if r["condition"] == c and r["stage"] == "patient_response" and r["model_version"]}) for c in CONDITIONS}
    nonempty_versions = [set(v) for v in versions_by_condition.values() if v]
    if any(len(v) > 1 for v in nonempty_versions) or len(nonempty_versions) == 2 and nonempty_versions[0] != nonempty_versions[1]:
        finding("error", "returned_model_version_difference", "Patient responses span different provider-reported model versions; do not pool as a single comparison.", versions=versions_by_condition)
    patient_calls = [call for call in api_calls if call["stage"] == "patient_response"]
    all_patient_configs = {json.dumps({k: v for k, v in call["generation_config"].items() if k != "max_output_tokens"}, sort_keys=True) for call in patient_calls}
    all_patient_safety = {json.dumps(call["safety_settings"], sort_keys=True) for call in patient_calls}
    if len(all_patient_configs) > 1 or len(all_patient_safety) > 1:
        finding("error", "endpoint_patient_configuration_difference", "Requested legacy generation/safety settings differ beyond permitted retry output budgets; effective gateway forwarding is audited separately.", generation_signatures=sorted(all_patient_configs), safety_signatures=sorted(all_patient_safety))
    for call in patient_calls:
        if call["generation_config"].get("temperature") != manifest["temperature"] or call["generation_config"].get("max_output_tokens") not in {4096, 8192}:
            finding("error", "unsupported_patient_generation_configuration", "A patient request differs from the frozen temperature or initial/recovery output budgets.", attempt_id=call["attempt_id"], generation_config=call["generation_config"])

    completed = sum(r["status"] == "completed" for r in session_audits)
    observed_turns = [r for r in turns if r["observation_status"] == "observed"]
    if rate_limit_audit:
        new_attempts = {call["attempt_id"] for call in api_calls if not call["request_in_user_pause_checkpoint"] and call["region"] != "openrouter"}
        pairs = [(row["patient_api_log"], row["patient_response_id"]) for row in observed_turns
                 if row["runtime_valid"] and row["patient_api_attempt_id"] in new_attempts]
        rate_limit_audit["transport_sidecar_validation"] = audit_rate_limit_sidecar(base, rate_limit_audit, pairs, finding)
    if provider_audit:
        new_attempts = {call["attempt_id"] for call in api_calls if call["region"] == "openrouter"}
        pairs = [(row["patient_api_log"], row["patient_response_id"]) for row in observed_turns
                 if row["runtime_valid"] and row["patient_api_attempt_id"] in new_attempts]
        provider_audit["transport_sidecar_validation"] = audit_openrouter_sidecar(base, provider_audit, pairs, finding)
        provider_audit["native_response_checks"] = [call["native_openrouter_validation"] for call in api_calls if "native_openrouter_validation" in call]
        provider_audit["native_error_checks"] = [call["native_openrouter_error_validation"] for call in api_calls if "native_openrouter_error_validation" in call]
    audit_error_handling_requests(base, error_handling_audit, api_calls, finding, "longitudinal")
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
    endpoint_strata = []
    for region in sorted({amendment["inherited_region"], amendment["continuation_region"]}
                         | ({"openrouter"} if provider_audit else set())
                         | {r["response_region"] for r in observed_turns if r["response_region"]}
                         | {r["region"] for r in api_calls}):
        for condition in CONDITIONS:
            selected_assertions = [r for r in assertions if r["condition"] == condition and r["response_region"] == region]
            selected_turns = [r for r in observed_turns if r["condition"] == condition and r["response_region"] == region]
            selected_calls = [r for r in api_calls if r["condition"] == condition and r["region"] == region]
            usage = Counter()
            for call in selected_calls:
                usage.update({k: v for k, v in call["usage"].items() if isinstance(v, (int, float))})
            endpoint_strata.append({
                "region": region, "condition": condition,
                "denominator_scope": "Observed assertions attributed to this endpoint; endpoint allocation was operational, not randomized or planned as an independent sample",
                "observed_responses": len(selected_turns),
                "runtime_invalid_responses": sum(not row["runtime_valid"] for row in selected_turns),
                "primary": metric_summary([r for r in selected_assertions if r["is_primary"]]),
                "secondary": metric_summary([r for r in selected_assertions if not r["is_primary"]]),
                "by_metric": [{"metric": metric, "is_primary": primary, **metric_summary(rows)}
                              for metric, primary in sorted({(r["metric"], r["is_primary"]) for r in selected_assertions})
                              if (rows := [r for r in selected_assertions if r["metric"] == metric and r["is_primary"] == primary])],
                "requests": len(selected_calls), "outcomes": dict(Counter(r["status"] for r in selected_calls)),
                "requests_by_stage": dict(Counter(r["stage"] for r in selected_calls)),
                "finish_reasons": dict(Counter(v for r in selected_calls for v in r["finish_reasons"])),
                "errors": dict(Counter(r["error_type"] for r in selected_calls if r["error_type"])),
                "usage_totals": dict(usage), "api_latency_seconds": distribution(r["elapsed_seconds"] for r in selected_calls),
                "turn_latency_seconds": distribution(r["elapsed_seconds"] for r in selected_turns),
                "returned_model_versions": sorted({r["model_version"] for r in selected_calls if r["model_version"]}),
            })
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
    trajectory_strata = []
    for pid in patient_lookup:
        for condition in CONDITIONS:
            selected = [row for row in observed_turns if row["patient_id"] == pid and row["condition"] == condition]
            counts = Counter(row["response_region"] or "unverified" for row in selected)
            label = next(iter(counts)) if len(counts) == 1 else "mixed:" + "+".join(sorted(counts)) if counts else "none"
            trajectory_strata.append({"patient_id": pid, "condition": condition,
                                      "accepted_turn_endpoint_composition": label, "turns_by_endpoint": dict(counts),
                                      "history_crosses_endpoints": len(counts) > 1,
                                      "observed_turns": len(selected)})
    summary = {
        "analysis_version": "1.4-openrouter-provider-continuation", "snapshot_at": snapshot_at, "status": status,
        "process_resumption_id": resumption_audit["resumption"]["id"],
        "process_resumption_sha256": resumption_audit["process_resumption_sha256"],
        "user_pause_checkpoint": {"archived_files_checked": resumption_audit["archived_input_files_checked"],
                                  "saved_turns": resumption_audit["resumption"]["saved_longitudinal_turns_retained"],
                                  "completed_sessions": resumption_audit["resumption"]["completed_longitudinal_sessions_retained"],
                                  "uncommitted_visible_stop_outcomes": len(resumption_audit["uncommitted_visible_stop_outcomes"])},
        "controller_execution": resumption_audit["controller_execution"],
        "rate_limit_validation": rate_limit_audit,
        "openrouter_validation": public_openrouter_audit(provider_audit),
        "transport_error_validation": public_error_handling_audit(error_handling_audit),
        "single_provider_replication": False if provider_audit else True,
        "endpoint_amendment_id": amendment["id"], "regions": [amendment["inherited_region"], amendment["continuation_region"]] + (["openrouter"] if provider_audit else []),
        "endpoint_strata": endpoint_strata,
        "stratum_dimension": "API route/provider; openrouter is not an attested geographic region",
        "trajectory_endpoint_strata": trajectory_strata,
        "interrupted_failed_prompt_differences": len(interrupted_prompt_reconcilations),
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
        "combination_basis": "One continued descriptive dataset under declared endpoint/provider amendments, retaining every accepted result and runtime failure. Combined summaries require endpoint and trajectory strata; they do not represent a single-provider replication or isolate service differences from architecture.",
        "elapsed_wall_seconds": elapsed(min(starts), terminal_time) if starts else None,
        "elapsed_wall_is_partial": not structurally_complete,
        "api_statistics": api_stats, "findings_by_level": dict(Counter(r["level"] for r in findings)),
        "history_checks": dict(history_checks), "withheld_label_exposure_records": len(withheld_exposures),
        "response_provenance_checks": dict(response_provenance_checks), "api_response_id_audit": response_id_audit,
        "limitations": [
            "Operational us-central1 to global continuation: endpoint allocation is not randomized or balanced over sessions; global responses can depend on regional dialogue and memory. Combined results do not estimate endpoint effects or describe a single-endpoint study.",
            "The interrupted process reinitializes its recorded Python seed because RNG state was not checkpointed; accepted state is preserved but unfinished computation is recomputed. Only archived failed/uncommitted requests can use the documented old-prompt exception.",
            "The user-paused global execution resumes with one actual controller worker under the original frozen limit of two. The 165 checkpointed responses, including runtime failures, remain accepted; this is an operational continuation, not regenerated data.",
            "Five paired profile trajectories, one stochastic run per condition; no inferential tests or confidence intervals.",
            "Whole-configuration comparison: baseline retains full history; full system selects/compresses profile and memory.",
            "Only the separate reflection-card title has no earlier therapist probe; other facts were rehearsed by intermediate probes.",
            "Regex non-match is not a contradiction. Competing-value mentions may be temporally correct explanations and are conservatively ambiguous.",
            "Provider model_version can be an alias rather than an immutable backend snapshot.",
            *(["OpenRouter is a declared provider continuation. Exact user prompts and temperature/max_tokens/top_p/stop are forwarded; legacy top_k and Vertex safety settings are not forwarded, and no reasoning override is added. Effective decoding and upstream policies are not claimed equivalent. Endpoint/provider assignment was operational and mixed trajectories retain prior-provider history; do not attribute service differences to the clinical architecture."] if provider_audit else []),
            "Frozen file hashes are checked against the pre-execution manifest; per-session metadata does not independently attest source bytes at every call.",
        ],
    }
    audit_report = {"snapshot_at": snapshot_at, "integrity": integrity, "scenario_preflight": preflight,
                    "endpoint_amendment": {k: v for k, v in endpoint_audit.items() if k != "inherited_sessions"},
                    "process_resumption": {k: v for k, v in resumption_audit.items() if k != "checkpoint_sessions"},
                    "rate_limit_validation": rate_limit_audit,
                    "openrouter_validation": public_openrouter_audit(provider_audit),
                    "transport_error_validation": public_error_handling_audit(error_handling_audit),
                    "interrupted_failed_prompt_differences": interrupted_prompt_reconcilations,
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
    write_json("endpoint-strata.json", {"snapshot_at": summary["snapshot_at"], "status": summary["status"],
                                      "endpoint_amendment_id": summary["endpoint_amendment_id"],
                                      "openrouter_amendment_id": summary["openrouter_validation"]["id"] if summary["openrouter_validation"] else None,
                                      "strata": summary["endpoint_strata"],
                                      "trajectory_strata": summary["trajectory_endpoint_strata"]})
    write_jsonl("assertions.jsonl", assertions)
    write_jsonl("turns.jsonl", turns)
    write_jsonl("api-calls.jsonl", api_calls)
    csv_path = output / "longitudinal-assertions.csv"
    columns = ["patient_id", "condition", "session_index", "turn_id", "assertion_id", "is_primary", "metric", "fact_id",
               "expected_state", "expected_values", "observation_status", "score_status", "correct", "runtime_valid", "runtime_invalid_reason",
               "eligible_epoch", "expected_match_evidence", "competing_value_evidence", "abstention_evidence", "refusal_evidence",
               "api_response_provenance", "patient_api_attempt_id", "patient_response_id", "patient_api_log", "patient_api_outcome_line",
               "response_region", "generation_attempt_regions", "endpoint_provenance",
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
    lines += ["## Operational endpoint continuation", "",
              f"Initial routing amendment: `{summary['endpoint_amendment_id']}`. Accepted regional sessions, turns and runtime failures were retained for the global continuation. The target remains 110 sessions and 550 responses total.", "",
              "| Endpoint | Condition | Observed responses | Runtime invalid | API attempts | Correct secondary / observed |",
              "|---|---|---:|---:|---:|---:|"]
    for row in summary["endpoint_strata"]:
        lines.append(f"| {row['region']} | {row['condition']} | {row['observed_responses']} | {row['runtime_invalid_responses']} | {row['requests']} | {row['secondary']['correct']}/{row['secondary']['observed_assertions']} |")
    if summary["openrouter_validation"]:
        provider = summary["openrouter_validation"]
        lines += ["", f"Provider amendment: `{provider['id']}`; native model `google/gemini-2.5-pro`. All 375 checkpoint files and accepted Vertex outputs remain preserved. OpenRouter receives the exact user prompt and forwarded temperature/max_tokens/top_p/stop. Legacy top_k and Vertex safety settings are not forwarded, and upstream defaults are not asserted equivalent. Native request/response records and normalized response provenance are checked separately.", "",
                  "This is a provider continuation, not a single-provider replication. Provider assignment was operational rather than randomized; mixed trajectories inherit dialogue and memory from previous services. Service differences cannot be attributed to the clinical architecture. The legacy region value openrouter identifies the API route, not geography: the upstream geographic region is not attested.", "",
                  "| Patient | Condition | Trajectory endpoint composition | Observed turns |",
                  "|---|---|---|---:|"]
        for row in summary["trajectory_endpoint_strata"]:
            lines.append(f"| {row['patient_id']} | {row['condition']} | {row['accepted_turn_endpoint_composition']} | {row['observed_turns']} |")
    lines += ["", "Endpoint strata describe the operational routing allocation, which is not randomized or balanced over sessions. They cannot estimate endpoint effects; global continuations inherit regional history and memory. Full endpoint-specific metric/token/error/latency details are in longitudinal-endpoint-strata.json.", "",
              f"Archived input files checked: {audit['endpoint_amendment']['archived_input_files_checked']}. "
              f"Failed, uncommitted inherited prompt differences explicitly recorded: {summary['interrupted_failed_prompt_differences']}. "
              "The interrupted process reinitializes its recorded Python seed because no RNG checkpoint exists; accepted turn content is preserved.", ""]
    worker = summary["controller_execution"].get("actual_workers")
    lines += [f"User-pause resumption: `{summary['process_resumption_id']}`. Verified {summary['user_pause_checkpoint']['archived_files_checked']} checkpoint hashes, preserving {summary['user_pause_checkpoint']['saved_turns']} accepted responses and {summary['user_pause_checkpoint']['completed_sessions']} completed sessions. "
              f"Actual resumed controller workers: {worker if worker is not None else 'not started; one requested'}; original frozen upper bound: 2. "
              "A differing pre-pause prompt is permitted only for a checkpoint-proven failed, uncommitted attempt with no prior visible STOP answer; all new attempts retain the original equality checks.", ""]
    if summary["rate_limit_validation"]:
        rate = summary["rate_limit_validation"]
        lines += [f"Transport amendment: `{rate['id']}`. Shared request pacing/backoff is audited separately from frozen clinical inputs and response acceptance. The latest 375-file checkpoint preserves 68 complete PHQs, 12 partial PHQ items, 32 complete longitudinal sessions and 165 accepted turns. "
                  f"The {rate['longitudinal_checkpoint_files']} longitudinal hashes equal the earlier checkpoint; no new prompt exception is introduced. "
                  f"API requests after this amendment: {rate['post_amendment_api_requests']}. Availability, retries and latency span different operational policies; they are not a benchmark under one fixed transport policy.", ""]
    if summary["transport_error_validation"]:
        repair = summary["transport_error_validation"]
        lines += ["## Native-error handling continuation", "",
                  f"Amendment `{repair['id']}` preserves all 427 checkpoint files, 85 complete PHQs, six partial items, 35 complete sessions and 184 turns. The prior HTTP-200 upstream-504 response remains archived with its original OTHER normalization and failed finalization. New in-band native errors are rejected before response normalization, under the unchanged bounded retry policy.", "",
                  "Juanita full S04 resumes finalization only, with all five patient turns retained; Alex full S04 retains four turns and completes T05. No additional prompt exception is allowed. New sidecar events require the extension identity and a matching bootstrap process record. The original six OpenRouter runtime files and all scientific inputs remain frozen.", "",
                  f"Post-checkpoint longitudinal API requests: {repair['request_phase_validation']['post_checkpoint_requests']}; patient requests replaying Juanita's accepted S04: {repair['request_phase_validation']['juanita_finalization_patient_requests']}.", ""]
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
