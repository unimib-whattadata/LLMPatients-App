"""Validate blinded ratings and summarize the frozen length experiment offline.

    python analysis/summarize.py compare
    python analysis/summarize.py score

``compare`` never opens the private mapping. It exports whole blinded cards for
every disputed answer; adjudicators return all six categories, but ``score``
uses their judgment only for categories on which A and B disagreed. No model
transport is imported, and runtime files are only read. --root supports isolated
offline fixtures. Derived analysis/review exports may be regenerated.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import statistics


ROOT = Path(__file__).resolve().parents[1]
ARMS = ("flat_auto_compression",)
LEVELS = (0, 64000, 256000, 900000, 1200000)
FIELDS = {
    "persistent_identity": ("name", "age"),
    "distant_stable_fact": ("notebook_title",),
    "correction_and_proposal": ("partner", "current", "former", "proposal_only"),
    "explicit_replacement": ("current_venue", "former_venue"),
    "completed_versus_planned": ("completed", "planned_not_completed"),
    "absent_fact_abstention": ("surname_or_not_established",),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def rows(path):
    path = Path(path)
    return ([json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()
             if line.strip()] if path.exists() else [])


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
                         encoding="utf-8")
    temporary.replace(path)


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def index_unique(items, key, label):
    require(isinstance(items, list), f"{label}: expected a list")
    result = {}
    for item in items:
        require(isinstance(item, dict), f"{label}: item is not an object")
        ident = item.get(key)
        require(isinstance(ident, str) and ident, f"{label}: missing {key}")
        require(ident not in result, f"{label}: duplicate {key} {ident}")
        result[ident] = item
    return result


def validate_gold(probes, label):
    indexed = index_unique(probes, "category", label)
    require(set(indexed) == set(FIELDS), f"{label}: gold category keys differ")
    for category, fields in FIELDS.items():
        requested = indexed[category].get("requested_fields")
        require(isinstance(requested, dict) and set(requested) == set(fields),
                f"{label}/{category}: gold field keys differ")
    require(sum(len(p["requested_fields"]) for p in probes) == 12,
            f"{label}: expected 12 gold fields")
    return indexed


def load_cards(root):
    a_path, b_path = root / "review/a/cards.json", root / "review/b/cards.json"
    cards = read(a_path)
    require(cards == read(b_path), "Reviewer card exports differ")
    indexed = index_unique(cards, "id", "cards")
    for ident, card in indexed.items():
        require(set(card) == {"id", "question", "gold", "answer"},
                f"{ident}: unexpected card fields or identifying metadata")
        require(isinstance(card["answer"], str) and card["answer"].strip(), f"{ident}: empty answer")
        require(isinstance(card["question"], str) and card["question"].strip(), f"{ident}: empty question")
        validate_gold(card["gold"], ident)
    return indexed


def validate_ratings(path, cards):
    data = read(path)
    require(isinstance(data, dict), f"{path}: expected an object")
    for key in ("model_requested", "model_observed"):
        require(isinstance(data.get(key), str) and data[key], f"{path}: missing {key}")
    ratings = index_unique(data.get("ratings"), "id", str(path))
    require(set(ratings) == set(cards),
            f"{path}: card IDs differ; missing={sorted(set(cards)-set(ratings))}, "
            f"extra={sorted(set(ratings)-set(cards))}")
    normalized = {}
    for ident, item in ratings.items():
        categories = index_unique(item.get("categories"), "category", f"{path}/{ident}")
        require(set(categories) == set(FIELDS), f"{path}/{ident}: expected exact six categories")
        normalized[ident] = {}
        for category, fields in FIELDS.items():
            rating = categories[category]
            values = rating.get("field_correct")
            require(isinstance(values, dict) and set(values) == set(fields),
                    f"{path}/{ident}/{category}: field keys differ")
            require(all(type(v) is bool for v in values.values()),
                    f"{path}/{ident}/{category}: field values must be booleans")
            require(type(rating.get("pass")) is bool and rating["pass"] == all(values.values()),
                    f"{path}/{ident}/{category}: pass must equal all fields correct")
            require(isinstance(rating.get("reason"), str), f"{path}/{ident}/{category}: missing reason")
            normalized[ident][category] = {
                "category": category, "pass": rating["pass"],
                "field_correct": {field: values[field] for field in fields}, "reason": rating["reason"],
            }
    return normalized, {key: data[key] for key in ("model_requested", "model_observed")}


def judgment(rating):
    return rating["pass"], rating["field_correct"]


def comparison(root):
    cards = load_cards(root)
    a, a_model = validate_ratings(root / "review/ratings/a.json", cards)
    b, b_model = validate_ratings(root / "review/ratings/b.json", cards)
    disagreements = [
        {"id": ident, "category": category, "a": a[ident][category], "b": b[ident][category]}
        for ident in cards for category in FIELDS
        if judgment(a[ident][category]) != judgment(b[ident][category])
    ]
    return cards, a, b, disagreements, {"a": a_model, "b": b_model}


def compare(root):
    cards, _, _, disagreements, models = comparison(root)
    disputed = {row["id"] for row in disagreements}
    adjudication_cards = [card for ident, card in cards.items() if ident in disputed]
    write(root / "analysis/disagreements.json", disagreements)
    write(root / "review/adjudication/cards.json", adjudication_cards)
    rubric = root / "review/a/RUBRIC.txt"
    if rubric.exists():
        destination = root / "review/adjudication/RUBRIC.txt"
        destination.write_text(rubric.read_text(encoding="utf-8"), encoding="utf-8")
    result = {"created_at": timestamp(), "cards": len(cards), "categories": 6 * len(cards),
              "disagreement_categories": len(disagreements), "disagreement_cards": len(disputed),
              "agreement_categories": 6 * len(cards) - len(disagreements), "raters": models,
              "comparison_ignores_reason_prose": True,
              "adjudication_requires_all_six_categories_per_disputed_card": True,
              "private_mapping_opened": False}
    write(root / "analysis/comparison.json", result)
    return result


def finite_number(value):
    return type(value) in (int, float) and math.isfinite(value) and value >= 0


def stats(values):
    require(all(finite_number(v) for v in values), "Invalid numeric measurement")
    return {"count": len(values), "min": min(values) if values else None,
            "max": max(values) if values else None,
            "mean": statistics.mean(values) if values else None}


def usage_summary(outcomes):
    result = {"records": len(outcomes)}
    for field in ("cost", "prompt_tokens", "completion_tokens", "total_tokens"):
        measured = []
        for outcome in outcomes:
            raw = outcome.get("response")
            usage = raw.get("usage") if isinstance(raw, dict) else None
            value = usage.get(field) if isinstance(usage, dict) else None
            if value is not None:
                require(finite_number(value), f"Invalid native {field} in {outcome['record_id']}")
                measured.append(value)
        result[field] = {"sum_observed": sum(measured), "records_with_value": len(measured),
                         "records_without_value": len(outcomes) - len(measured)}
    return result


def provider_names(raw):
    if not isinstance(raw, dict):
        return []
    found = [raw.get("provider")]
    error = raw.get("error")
    if isinstance(error, dict) and isinstance(error.get("metadata"), dict):
        found.append(error["metadata"].get("provider_name"))
    return sorted({name for name in found if isinstance(name, str) and name})


def router_token_estimate(raw):
    """Parse router context-error diagnostics, never call them provider usage."""
    if not isinstance(raw, dict) or not isinstance(raw.get("error"), dict):
        return None
    message = raw["error"].get("message")
    if not isinstance(message, str):
        return None
    patterns = {
        "input_tokens": r"([\d,]+)\s+of text input",
        "requested_output_tokens": r"([\d,]+)\s+in the output",
        "requested_total_tokens": r"requested about\s+([\d,]+)\s+tokens",
        "endpoint_context_limit": r"maximum context length is\s+([\d,]+)\s+tokens",
    }
    values = {key: int(match.group(1).replace(",", "")) for key, pattern in patterns.items()
              if (match := re.search(pattern, message, re.I))}
    return {"source": "router_error_message_estimate_not_provider_usage", **values} if values else None


def native_archive(root, jobs, runtime_roots):
    by_job, all_ids = {}, set()
    for ident in jobs:
        directories = [directory / ident for directory in runtime_roots]
        archived = [row for directory in directories for row in rows(directory / "openrouter-api-records.jsonl")]
        requests, outcomes = {}, {}
        for row in archived:
            rid, event = row.get("record_id"), row.get("event")
            require(isinstance(rid, str) and rid, f"{ident}: native record lacks ID")
            require(event in ("request", "response", "error"), f"{ident}: unknown native event")
            if event == "request":
                if rid in requests:
                    require(row == requests[rid], f"Copied native request differs: {rid}")
                    continue
                require(rid not in requests and rid not in all_ids, f"Duplicate native request {rid}")
                requests[rid] = row
                all_ids.add(rid)
            else:
                if rid in outcomes:
                    require(row == outcomes[rid], f"Copied native outcome differs: {rid}")
                    continue
                require(rid in requests and rid not in outcomes, f"Unpaired/duplicate native outcome {rid}")
                outcomes[rid] = row
                require(row.get("request") == requests[rid].get("request"), f"Wire request differs for {rid}")
        by_job[ident] = {"requests": requests, "outcomes": outcomes,
                        "responses": [r for r in outcomes.values() if r["event"] == "response"],
                        "errors": [r for r in outcomes.values() if r["event"] == "error"],
                        "unresolved_request_ids": sorted(set(requests) - set(outcomes)),
                        "execution_started": any(rows(directory / "events.jsonl") for directory in directories)}
    return by_job


def score(root):
    active_runtime = root / ("runtime-02" if (root / "runtime-02/answers.jsonl").exists() else "runtime")
    runtime_roots = [root / "runtime"] + ([root / "runtime-02"] if active_runtime.name == "runtime-02" else [])
    state = read(active_runtime / "state.json")
    require(state.get("status") in ("completed", "stopped"), "Score only a completed or stopped run")
    cards, a, _, disagreements, models = comparison(root)
    disputed_ids = {r["id"] for r in disagreements}
    disputed_pairs = {(r["id"], r["category"]) for r in disagreements}
    adjudicator, adjud_model = {}, None
    if disputed_ids:
        adjudicator, adjud_model = validate_ratings(root / "review/ratings/adjudicator.json",
                                                  {ident: cards[ident] for ident in disputed_ids})
    jobs = index_unique(read(root / "schedule.json")["jobs"], "job_id", "schedule")
    patients = sorted({job["patient_id"] for job in jobs.values()})
    require(len(patients) == 5 and len(jobs) == 25, "Expected five profiles and 25 planned jobs")
    expected = {(patient, arm, level) for patient in patients for arm in ARMS for level in LEVELS}
    require({(j["patient_id"], j["arm"], j["target_tokens"]) for j in jobs.values()} == expected,
            "Schedule is not the complete five-profile/one-arm/five-length matrix")
    answers_path = active_runtime / "answers.jsonl"
    answers = index_unique(rows(answers_path), "job_id", "committed answers")
    require(set(answers) <= set(jobs), "Unscheduled committed answer")
    if active_runtime.name == "runtime-02":
        original_answers = index_unique(rows(root / "runtime/answers.jsonl"), "job_id", "original committed answers")
        require(all(answers.get(ident) == answer for ident, answer in original_answers.items()),
                "Continuation changed or omitted an original committed answer")
    export_manifest = root / "review/export-manifest.json"
    if export_manifest.exists():
        require(read(export_manifest)["source_answers_sha256"] == sha(answers_path),
                "Answer archive changed after review export")
    mapping = read(root / "review/private/mapping.json")
    require(isinstance(mapping, dict) and set(mapping) == set(cards), "Private mapping/card IDs differ")
    complete_ids = {ident for ident, answer in answers.items() if answer["status"] == "complete"}
    require({m["job_id"] for m in mapping.values()} == complete_ids and len(mapping) == len(complete_ids),
            "Mapping must cover every completed response exactly once")
    golds = {}
    for patient in patients:
        golds[patient] = read(root / "inputs" / patient / "gold.json")["probes"]
        validate_gold(golds[patient], f"source gold/{patient}")
    rating_by_job = {}
    for ident, metadata in mapping.items():
        job = jobs[metadata["job_id"]]
        require(all(metadata.get(k) == job[k] for k in ("job_id", "patient_id", "arm", "target_tokens")),
                f"{ident}: mapping/schedule mismatch")
        require(cards[ident]["gold"] == golds[job["patient_id"]], f"{ident}: card/source gold mismatch")
        answer = answers[job["job_id"]]
        require(cards[ident]["answer"] == answer["answer"], f"{ident}: card/committed answer mismatch")
        selected = []
        for category in FIELDS:
            use_adjudicator = (ident, category) in disputed_pairs
            rating = (adjudicator if use_adjudicator else a)[ident][category]
            selected.append({**rating, "rating_source": "adjudicator" if use_adjudicator else "a_and_b"})
        rating_by_job[job["job_id"]] = {"card_id": ident, "categories": selected}
    native = native_archive(root, jobs, runtime_roots)
    details, errors = [], []
    for ident, job in jobs.items():
        archive, answer = native[ident], answers.get(ident)
        attempted = bool(archive["requests"])
        if answer is not None:
            require(all(answer.get(k) == job[k] for k in
                        ("job_id", "patient_id", "arm", "target_tokens", "local_prompt_tokens")),
                    f"{ident}: committed answer/schedule mismatch")
            require(attempted, f"{ident}: committed answer without native request")
            require(answer["status"] in ("complete", "context_rejected"), f"{ident}: unexpected committed status")
            outcome = archive["outcomes"].get(answer.get("native_record_id"))
            require(outcome is not None, f"{ident}: final answer missing native outcome")
            if answer["status"] == "complete":
                require(answer.get("semantic_evaluable") is True and outcome["event"] == "response",
                        f"{ident}: inconsistent complete status")
                raw = outcome["response"]
                require(raw.get("model") == "google/gemini-2.5-pro", f"{ident}: wrong native model")
                require([c.get("finish_reason") for c in raw["choices"]] == ["stop"], f"{ident}: incomplete native answer")
                require(answer.get("usage") == raw.get("usage"), f"{ident}: usage differs from native archive")
            else:
                require(answer.get("semantic_evaluable") is False and outcome["event"] == "error",
                        f"{ident}: inconsistent context rejection")
        status = answer["status"] if answer else ("other_missing" if attempted else "unattempted")
        chosen = rating_by_job.get(ident)
        categories = chosen["categories"] if chosen else None
        native_tokens = (answer["usage"].get("prompt_tokens") if status == "complete" else None)
        router_estimate = router_token_estimate(outcome.get("response")) if answer and status == "context_rejected" else None
        if native_tokens is not None:
            require(finite_number(native_tokens), f"{ident}: invalid prompt tokens")
        cost = usage_summary(list(archive["outcomes"].values()))
        detail = {"job_id": ident, "patient_id": job["patient_id"], "arm": job["arm"],
                  "target_tokens": job["target_tokens"], "status": status, "attempted": attempted,
                  "execution_started": archive["execution_started"],
                  "card_id": chosen["card_id"] if chosen else None, "categories": categories,
                  "categories_correct": sum(r["pass"] for r in categories) if categories else None,
                  "categories_denominator": 6 if categories else 0,
                  "fields_correct": sum(sum(r["field_correct"].values()) for r in categories) if categories else None,
                  "fields_denominator": 12 if categories else 0,
                  "all_six_correct": all(r["pass"] for r in categories) if categories else None,
                  "local_prompt_tokens": job["local_prompt_tokens"], "native_prompt_tokens": native_tokens,
                  "router_token_estimate": router_estimate,
                  "elapsed_seconds": answer.get("elapsed_seconds") if answer else None,
                  "http_requests": len(archive["requests"]), "http_responses": len(archive["responses"]),
                  "http_errors": len(archive["errors"]),
                  "unresolved_request_ids": archive["unresolved_request_ids"],
                  "observed_cost_usd": cost["cost"]["sum_observed"], "native_usage_all_outcomes": cost}
        details.append(detail)
        for row in archive["errors"]:
            raw = row.get("response")
            errors.append({"job_id": ident, "patient_id": job["patient_id"], "arm": job["arm"],
                           "target_tokens": job["target_tokens"], "record_id": row["record_id"],
                           "http_status": row.get("http_status"), "transport_error": row.get("error"),
                           "provider_error": raw, "observed_providers": provider_names(raw),
                           "router_token_estimate": router_token_estimate(raw),
                           "expected_context_rejection": bool(answer and answer["status"] == "context_rejected"
                                                                and answer.get("native_record_id") == row["record_id"])})
    cells = []
    for level in LEVELS:
        for arm in ARMS:
            subset = [r for r in details if r["target_tokens"] == level and r["arm"] == arm]
            available = [r for r in subset if r["status"] == "complete"]
            category_correct = sum(r["categories_correct"] for r in available)
            field_correct = sum(r["fields_correct"] for r in available)
            category_results = [{"category": category,
                                 "correct": sum(next(c for c in r["categories"] if c["category"] == category)["pass"]
                                                for r in available),
                                 "denominator": len(available)} for category in FIELDS]
            cell_outcomes = [row for r in subset for row in native[r["job_id"]]["outcomes"].values()]
            cell_usage = usage_summary(cell_outcomes)
            cells.append({"target_tokens": level, "arm": arm, "planned": 5,
                          "attempted": sum(r["attempted"] for r in subset), "completed": len(available),
                          "context_rejected": sum(r["status"] == "context_rejected" for r in subset),
                          "other_missing": sum(r["status"] == "other_missing" for r in subset),
                          "unattempted": sum(r["status"] == "unattempted" for r in subset),
                          "categories_correct": category_correct, "categories_denominator": 6 * len(available),
                          "planned_category_denominator": 30,
                          "category_accuracy_percent": 100 * category_correct / (6 * len(available)) if available else None,
                          "fields_correct": field_correct, "fields_denominator": 12 * len(available),
                          "planned_field_denominator": 60,
                          "field_accuracy_percent": 100 * field_correct / (12 * len(available)) if available else None,
                          "all_six_profiles": sum(r["all_six_correct"] for r in available),
                          "all_six_profiles_denominator": len(available),
                          "native_prompt_tokens": stats([r["native_prompt_tokens"] for r in available
                                                        if r["native_prompt_tokens"] is not None]),
                          "router_estimated_input_tokens_for_rejections": stats([
                              r["router_token_estimate"]["input_tokens"] for r in subset
                              if r["router_token_estimate"] and "input_tokens" in r["router_token_estimate"]]),
                          "local_prompt_tokens": {
                              "planned": stats([r["local_prompt_tokens"] for r in subset]),
                              "attempted": stats([r["local_prompt_tokens"] for r in subset if r["attempted"]]),
                              "completed": stats([r["local_prompt_tokens"] for r in available])},
                          "observed_cost_usd": cell_usage["cost"]["sum_observed"],
                          "native_usage_all_outcomes": cell_usage, "per_category": category_results,
                          "per_patient": sorted(subset, key=lambda r: r["patient_id"])})
    responses = [r for archive in native.values() for r in archive["responses"]]
    failed = [r for archive in native.values() for r in archive["errors"]]
    all_usage = usage_summary(responses + failed)
    response_usage, error_usage = usage_summary(responses), usage_summary(failed)
    providers = Counter(name for row in responses + failed for name in provider_names(row.get("response")))
    models_observed = Counter(r["response"].get("model", "not_reported") for r in responses)
    source_files = [root / "schedule.json", active_runtime / "state.json", answers_path,
                    root / "review/a/cards.json", root / "review/b/cards.json",
                    root / "review/private/mapping.json", root / "review/ratings/a.json", root / "review/ratings/b.json"]
    source_files += [root / "inputs" / patient / "gold.json" for patient in patients]
    source_files += [p for directory in runtime_roots for p in directory.glob("*/openrouter-api-records.jsonl")]
    source_files += [p for directory in runtime_roots for p in (directory / "state.json", directory / "answers.jsonl")
                     if p.exists()]
    if disputed_ids:
        source_files.append(root / "review/ratings/adjudicator.json")
    result = {"created_at": timestamp(), "runtime_status": state["status"],
              "authoritative_answer_archive": str(answers_path.relative_to(root)),
              "native_archive_directories": [str(directory.relative_to(root)) for directory in runtime_roots],
              "planned_calls": 25, "attempted_calls": sum(r["attempted"] for r in details),
              "completed_responses": len(complete_ids),
              "context_rejected": sum(r["status"] == "context_rejected" for r in details),
              "other_missing": sum(r["status"] == "other_missing" for r in details),
              "unattempted": sum(r["status"] == "unattempted" for r in details),
              "http_requests": sum(len(a["requests"]) for a in native.values()),
              "http_responses": len(responses), "http_errors": len(failed),
              "unresolved_request_ids": [rid for a in native.values() for rid in a["unresolved_request_ids"]],
              "observed_cost_usd": all_usage["cost"]["sum_observed"],
              "native_response_cost_usd": response_usage["cost"]["sum_observed"],
              "native_error_cost_usd": error_usage["cost"]["sum_observed"],
              "runtime_reported_cost_usd": state.get("observed_cost_usd"),
              "runtime_unknown_charge_reserve_usd": state.get("unknown_charge_reserve_usd"),
              "native_usage_all_responses_including_output_recovery": response_usage,
              "native_usage_errors": error_usage,
              "observed_providers": dict(providers), "observed_models": dict(models_observed),
              "error_inventory": errors, "cells": cells,
              "review": {"cards": len(cards), "categories": 6 * len(cards), "raters": models,
                         "disagreement_categories": len(disagreements), "disagreement_cards": len(disputed_ids),
                         "agreement_categories": 6 * len(cards) - len(disagreements),
                         "adjudicator": adjud_model},
              "interpretation": [
                  "Six categories and twelve fields enter the denominator for every completed response, including omissions.",
                  "Unavailable and unattempted calls have no semantic score; they are reported separately.",
                  "Native prompt-token statistics describe final completed answers; usage totals include every archived response.",
                  "Local tokenizer counts, provider-native usage, and router estimates in rejection messages are distinct measures.",
                  "Observed costs sum reported native charges only; absent error usage is not imputed as zero cost.",
                  "Five profiles are the independent case units; categories and nested lengths are correlated; results are descriptive."],
              "source_sha256": {str(p.relative_to(root)): sha(p) for p in source_files if p.exists()},
              "analysis_script_sha256": sha(Path(__file__))}
    require(sum(c["categories_denominator"] for c in cells) == 6 * len(cards), "Category denominators lost cards")
    require(sum(c["fields_denominator"] for c in cells) == 12 * len(cards), "Field denominators lost cards")
    require(result["attempted_calls"] == result["completed_responses"] + result["context_rejected"] + result["other_missing"],
            "Attempted-call accounting differs")
    require(result["attempted_calls"] + result["unattempted"] == 25, "Planned-call accounting differs")
    write(root / "analysis/results.json", result)
    return {key: result[key] for key in ("runtime_status", "planned_calls", "attempted_calls", "completed_responses",
                                        "context_rejected", "other_missing", "unattempted", "observed_cost_usd")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("compare", "score"))
    parser.add_argument("--root", type=Path, default=ROOT, help="Experiment directory (offline fixtures supported)")
    args = parser.parse_args()
    result = (compare if args.command == "compare" else score)(args.root.resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
