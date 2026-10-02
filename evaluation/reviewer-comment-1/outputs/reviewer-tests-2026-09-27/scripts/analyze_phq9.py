"""Independently validate archived API answers and summarize the PHQ replication.

No generation calls. Reconstructs the exact prompts from the frozen code and
requires 20 complete administrations per profile unless --allow-partial is set.
"""
import argparse
from collections import Counter
import csv
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import statistics
import sys

OUT = Path(__file__).resolve().parents[1]
SOURCE = OUT / "phq-source"
LIVE_SOURCE = Path("/Users/marco/Sites/LLMPatients-Agent")
sys.path.insert(0, str(SOURCE))
logging.basicConfig(level=logging.ERROR)
from dotenv import load_dotenv
load_dotenv(LIVE_SOURCE / "config/.env")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(LIVE_SOURCE / "config/vertex-ai-api-key.json")
from agent.core import questionnaire_runner as qr
qr.RESULTS_DIR = OUT / "phq"

PUBLISHED = {"alex_carter_001": 1, "jason_smith_001": 3, "daniel_isherwood_001": 10,
             "crystal_smith_001": 26, "juanita_delgado_001": 27}
REVIEWER = {"daniel_isherwood_001": 4, "crystal_smith_001": 20.4, "juanita_delgado_001": 18.25}
EXPECTED_CONFIG = {"temperature": 0.1, "max_output_tokens": 220, "top_p": 0.95, "top_k": 40,
                   "stop_sequences": ["\nTherapist:", "Therapist:"]}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(name, value):
    path = OUT / "analysis" / name
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temp.replace(path)


def load_records(directory):
    path = directory / "api_records.jsonl"
    if path.exists():
        return [json.loads(line) for line in path.read_text().splitlines()]
    return json.loads((directory / "api_records.json").read_text())


def response_text(response):
    return "\n".join(part.get("text", "") for candidate in response.get("candidates", [])
                     for part in candidate.get("content", {}).get("parts", []) if not part.get("thought"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-partial", action="store_true")
    args = parser.parse_args()
    errors, warnings, item_rows, run_rows, prompt_rows = [], [], [], [], []
    counts, finishes, models, error_types, usage = Counter(), Counter(), Counter(), Counter(), Counter()
    response_ids = set()
    profile_summaries = {}
    source_manifest = json.loads((OUT / "phq-source-manifest.json").read_text())
    for relative_path, expected in source_manifest.items():
        if digest(SOURCE / relative_path) != expected:
            errors.append(f"Frozen source changed: {relative_path}")
    for patient_id, published in PUBLISHED.items():
        runner = qr.QuestionnaireRunner("phq9", patient_id, force=False)
        context = runner._build_patient_context()
        prompts = {}
        for item in runner.q_def["items"]:
            prompt = runner._build_single_prompt(item, context, runner.profile.name,
                                                 item.get("scale_override") or runner.q_def["scale"])
            prompts[prompt] = str(item["id"])
            prompt_rows.append({"patient_id": patient_id, "item_id": str(item["id"]),
                                "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt})
        values = []
        item_distributions = {str(index): [] for index in range(1, 11)}
        for index in range(1, 21):
            directory = OUT / "phq" / patient_id / f"run_{index:02d}"
            result_path = directory / "phq9.json"
            meta_path = directory / "metadata.json"
            if not result_path.exists() or not meta_path.exists():
                continue
            meta = json.loads(meta_path.read_text())
            if meta.get("status") != "completed":
                continue
            result = json.loads(result_path.read_text())
            answers = result["answers"]
            if set(answers) != {str(k) for k in range(1, 11)}:
                errors.append(f"{patient_id}/{index}: incomplete answer set")
                continue
            recomputed = runner._compute_scores(answers)
            if recomputed != result["scores"]:
                errors.append(f"{patient_id}/{index}: score mismatch")
            for key, source in [("profile_sha256", SOURCE / "data/patients" / f"{patient_id}.yaml"),
                                ("questionnaire_sha256", SOURCE / "data/questionnaires/phq9.yaml")]:
                if meta[key] != digest(source):
                    errors.append(f"{patient_id}/{index}: {key} mismatch")
            if meta.get("model_id") != "gemini-2.5-pro":
                errors.append(f"{patient_id}/{index}: model differs")
            records = load_records(directory)
            accepted = {}
            accepted_response_ids = {}
            accepted_finishes = {}
            for event in records:
                counts["api_attempts"] += 1
                item_id = prompts.get(event.get("prompt"))
                if item_id is None:
                    errors.append(f"{patient_id}/{index}: prompt differs from frozen runner")
                if event.get("generation_config") != EXPECTED_CONFIG:
                    errors.append(f"{patient_id}/{index}/{item_id}: generation config differs")
                if "response" not in event:
                    counts["failed_api_attempts"] += 1
                    error_types[event.get("error_type", "unknown")] += 1
                    continue
                counts["successful_api_responses"] += 1
                response = event["response"]
                rid = response.get("response_id")
                if not rid:
                    errors.append(f"{patient_id}/{index}/{item_id}: missing response ID")
                elif rid in response_ids:
                    errors.append(f"Repeated API response ID: {rid}")
                response_ids.add(rid)
                models[response.get("model_version", "unknown")] += 1
                for candidate in response.get("candidates", []):
                    finishes[candidate.get("finish_reason", "unknown")] += 1
                for key, value in response.get("usage_metadata", {}).items():
                    if isinstance(value, int):
                        usage[key] += value
                text = response_text(response)
                try:
                    parsed = runner._parse_integer(text.strip(), runner.q_def["scale"])
                except ValueError:
                    counts["unparseable_responses"] += 1
                    continue
                accepted[item_id] = parsed
                accepted_response_ids[item_id] = rid
                accepted_finishes[item_id] = ",".join(c.get("finish_reason", "unknown") for c in response.get("candidates", []))
            if accepted != answers:
                errors.append(f"{patient_id}/{index}: item answers do not match archived visible API text")
            values.append(recomputed["total"])
            run_rows.append({"patient_id": patient_id, "run": index, "score": recomputed["total"],
                             "at_least_10": recomputed["total"] >= 10, "api_attempts": len(records),
                             "started_at": meta["started_at"], "finished_at": meta["finished_at"]})
            for item_id, value in answers.items():
                item_distributions[item_id].append(value)
                if accepted_finishes.get(item_id) != "STOP":
                    counts["accepted_answers_without_STOP"] += 1
                item_rows.append({"patient_id": patient_id, "run": index, "item_id": int(item_id),
                                  "answer": value, "counts_in_total": int(item_id) <= 9,
                                  "response_id": accepted_response_ids.get(item_id),
                                  "finish_reason": accepted_finishes.get(item_id)})
        profile_summaries[patient_id] = {
            "n": len(values), "scores": values, "mean": statistics.mean(values) if values else None,
            "sample_sd": statistics.stdev(values) if len(values) > 1 else None,
            "min": min(values) if values else None, "max": max(values) if values else None,
            "histogram": dict(sorted(Counter(values).items())),
            "n_at_least_10": sum(score >= 10 for score in values),
            "fraction_at_least_10": sum(score >= 10 for score in values) / len(values) if values else None,
            "archived_published_score": published,
            "n_matching_archived_score": values.count(published),
            "reviewer_reported_mean_unverified": REVIEWER.get(patient_id),
            "item_mean": {key: statistics.mean(vals) if vals else None for key, vals in item_distributions.items()},
        }
    completed = all(profile["n"] == 20 for profile in profile_summaries.values())
    if any(reason != "STOP" for reason in finishes):
        warnings.append("Some recorded candidates did not finish with STOP; the frozen runner's original handling is retained.")
    summary = {"status": "complete" if completed else "incomplete", "profiles": profile_summaries,
               "complete_administrations": len(run_rows), "item_answers": len(item_rows),
               "api_counts_for_complete_administrations": dict(counts), "finish_reasons": dict(finishes),
               "served_model_versions": dict(models), "error_types": dict(error_types), "token_usage": dict(usage),
               "unique_response_ids": len(response_ids), "validation_errors": errors, "warnings": warnings,
               "scope": "Stochastic within-configuration replication, not reconstruction of unknown historical model/seed or clinical validation",
               "sampling": "20 planned administrations per fixed synthetic patient; first 3 retained from the initial audit; previous unlogged run-04 partials excluded before continuation",
               "config": EXPECTED_CONFIG, "seed": "not set by original runner",
               "reviewer_values_source": "User-provided reviewer report; original reviewer code and outputs unavailable"}
    write_json("phq-validation.json", summary)
    write_json("phq-exact-prompts.json", prompt_rows)
    for filename, rows in [("phq-runs.csv", run_rows), ("phq-items.csv", item_rows)]:
        if rows:
            with (OUT / "analysis" / filename).open("w", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
                writer.writeheader()
                writer.writerows(rows)
    print(json.dumps({"status": summary["status"], "complete_administrations": len(run_rows),
                      "validation_errors": errors, "warnings": warnings,
                      "n_per_patient": {p: v["n"] for p, v in profile_summaries.items()}}, indent=2))
    return 1 if errors or (not completed and not args.allow_partial) else 0


if __name__ == "__main__":
    raise SystemExit(main())
