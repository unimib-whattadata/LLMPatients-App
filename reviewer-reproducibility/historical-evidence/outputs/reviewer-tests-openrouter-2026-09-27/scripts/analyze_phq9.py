"""Validate archived PHQ answers and declared endpoint/provider continuations.

No generation calls. Reconstruct frozen prompts, verify inherited bytes and retain
full scores for mixed-endpoint runs. Default gate: 100 runs, 20/profile, 1,000 items.
"""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import importlib.util
import json
import logging
import os
from pathlib import Path
import statistics
import sys

sys.dont_write_bytecode = True
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

AMENDMENT_ID = "vertex-global-continuation-2026-09-27"
INHERITED_REGION = "us-central1"
CONTINUATION_REGION = "global"
MODEL_ID = "gemini-2.5-pro"
PUBLISHED = {"alex_carter_001": 1, "jason_smith_001": 3, "daniel_isherwood_001": 10,
             "crystal_smith_001": 26, "juanita_delgado_001": 27}
REVIEWER = {"daniel_isherwood_001": 4, "crystal_smith_001": 20.4, "juanita_delgado_001": 18.25}
EXPECTED_CONFIG = {"temperature": 0.1, "max_output_tokens": 220, "top_p": 0.95, "top_k": 40,
                   "stop_sequences": ["\nTherapist:", "Therapist:"]}
EXPECTED_SAFETY = {"3": "3", "1": "3", "4": "3", "2": "4", "5": "4"}
ITEM_IDS = {str(k) for k in range(1, 11)}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(name, value):
    path = OUT / "analysis" / name
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temp.replace(path)


def decode_records(path, raw):
    if path.suffix == ".jsonl":
        return [json.loads(line) for line in raw.splitlines() if line.strip()]
    return json.loads(raw)


def load_records(directory):
    paths = [directory / name for name in ("api_records.jsonl", "api_records.json")
             if (directory / name).exists()]
    if len(paths) > 1:
        raise ValueError(f"Ambiguous raw API files: {directory}")
    if not paths:
        return None, [], b""
    raw = paths[0].read_bytes()
    return paths[0], decode_records(paths[0], raw), raw


def response_text(response):
    return "\n".join(part.get("text", "") for candidate in response.get("candidates", [])
                     for part in candidate.get("content", {}).get("parts", []) if not part.get("thought"))


def score_summary(values):
    return {"n": len(values), "scores": values,
            "mean": statistics.mean(values) if values else None,
            "sample_sd": statistics.stdev(values) if len(values) > 1 else None,
            "min": min(values) if values else None, "max": max(values) if values else None,
            "histogram": dict(sorted(Counter(values).items())),
            "n_at_least_10": sum(score >= 10 for score in values),
            "fraction_at_least_10": sum(score >= 10 for score in values) / len(values) if values else None}


def endpoint_composition(regions):
    counts = Counter(regions)
    label = next(iter(counts)) if len(counts) == 1 else "mixed:" + "+".join(sorted(counts)) if counts else "none"
    return label, ";".join(f"{region}={counts[region]}" for region in sorted(counts)), dict(sorted(counts.items()))


def verify_inheritance(errors):
    """Only hash-verified originals and exact raw prefixes establish inheritance."""
    amendment = json.loads((OUT / "endpoint-amendment.json").read_text())
    for key, expected in [("id", AMENDMENT_ID), ("inherited_region", INHERITED_REGION),
                          ("continuation_region", CONTINUATION_REGION), ("model_id", MODEL_ID)]:
        if amendment.get(key) != expected:
            errors.append(f"Unexpected endpoint amendment {key}")
    archived = Path(amendment["source_directory"]).resolve()
    if archived == OUT.resolve() or (OUT / amendment["source_relative"]).resolve() != archived:
        errors.append("Endpoint amendment archive paths disagree or refer to the active output")
    manifest_path = OUT / amendment["inherited_file_manifest"]
    manifest_valid = digest(manifest_path) == amendment["inherited_file_manifest_sha256"]
    if not manifest_valid:
        errors.append("Inherited file manifest hash changed")
    manifest = json.loads(manifest_path.read_text())
    for relative, expected in amendment["invariant_hashes"].items():
        original = archived / relative
        if not original.is_file() or digest(original) != expected:
            errors.append(f"Archived invariant changed: {relative}")
    if digest(OUT / "phq-source-manifest.json") != amendment["invariant_hashes"]["phq-source-manifest.json"]:
        errors.append("Inherited PHQ source manifest changed")
    phq_manifest = {path: expected for path, expected in manifest.items() if path.startswith("phq/")}
    archived_files = {str(path.relative_to(archived)) for path in (archived / "phq").rglob("*") if path.is_file()}
    if archived_files != set(phq_manifest):
        errors.append("Archived PHQ file inventory differs from inherited manifest")
    originals, verified = {}, set()
    audit = {"archived_phq_files": len(phq_manifest), "verified_original_hashes": 0,
             "complete_inherited_administrations": 0, "identical_complete_files": 0,
             "incomplete_inherited_administrations": 0, "verified_raw_prefixes": 0,
             "inherited_saved_partial_items": 0, "retained_saved_partial_items": 0}
    for relative, expected in phq_manifest.items():
        if ".." in Path(relative).parts:
            errors.append(f"Invalid inherited relative path: {relative}")
            continue
        path = archived / relative
        if not path.is_file():
            errors.append(f"Missing archived PHQ file: {relative}")
            continue
        raw = path.read_bytes()
        originals[relative] = raw
        if hashlib.sha256(raw).hexdigest() != expected:
            errors.append(f"Archived PHQ file changed: {relative}")
        elif manifest_valid:
            verified.add(relative)
            audit["verified_original_hashes"] += 1
    inherited = {}
    for run_path in sorted({str(Path(path).parent) for path in phq_manifest}):
        meta_relative = f"{run_path}/metadata.json"
        if meta_relative not in verified:
            errors.append(f"Unverifiable inherited metadata: {run_path}")
            continue
        old_meta = json.loads(originals[meta_relative])
        complete = old_meta.get("status") == "completed"
        audit["complete_inherited_administrations" if complete else "incomplete_inherited_administrations"] += 1
        run_files = [path for path in originals if str(Path(path).parent) == run_path]
        raw_paths = [path for path in run_files if Path(path).name in ("api_records.json", "api_records.jsonl")]
        if len(raw_paths) > 1:
            errors.append(f"Ambiguous inherited API logs: {run_path}")
        proof = {"metadata": old_meta, "complete": complete, "raw_path": None,
                 "raw_bytes": b"", "proven_record_count": 0, "saved_answers": {}}
        if complete:
            for relative in run_files:
                current = OUT / relative
                if relative not in verified or not current.is_file() or current.read_bytes() != originals[relative]:
                    errors.append(f"Completed inherited file is not byte-identical: {relative}")
                else:
                    audit["identical_complete_files"] += 1
            if f"{run_path}/phq9.json" not in verified or not raw_paths:
                errors.append(f"Incomplete original evidence for completed run: {run_path}")
        if raw_paths:
            relative = raw_paths[0]
            original_raw = originals[relative]
            current = OUT / relative
            old_records = decode_records(Path(relative), original_raw)
            proof.update(raw_path=relative, raw_bytes=original_raw)
            same_prefix = current.is_file() and current.read_bytes().startswith(original_raw)
            if relative not in verified or not same_prefix:
                errors.append(f"Inherited raw API bytes are not an exact prefix: {relative}")
            elif Path(relative).suffix == ".json" and current.read_bytes() != original_raw:
                errors.append(f"Inherited JSON array API archive was changed: {relative}")
            elif original_raw and Path(relative).suffix == ".jsonl" and not original_raw.endswith(b"\n"):
                errors.append(f"Inherited API prefix has no complete record boundary: {relative}")
            else:
                proof["proven_record_count"] = len(old_records)
                audit["verified_raw_prefixes"] += 1
        partial_relative = f"{run_path}/phq9.partial.json"
        if not complete and partial_relative in originals:
            if partial_relative not in verified:
                errors.append(f"Unverifiable original partial answers: {run_path}")
            proof["saved_answers"] = json.loads(originals[partial_relative])["answers"]
            audit["inherited_saved_partial_items"] += len(proof["saved_answers"])
        inherited[run_path] = proof
    if audit["complete_inherited_administrations"] != amendment["inherited_counts"]["phq_complete_administrations"]:
        errors.append("Inherited completed PHQ count differs from endpoint amendment")
    return amendment, inherited, audit


def verify_user_resume_checkpoint(errors):
    """Retain all completed runs and accepted partial answers at the user pause."""
    resumption_path = OUT / "process-resumption.json"
    declaration = json.loads(resumption_path.read_text())
    if declaration.get("id") != "user-resume-global-2026-09-27-1348":
        errors.append("Unexpected user-resumption declaration")
    if digest(resumption_path) != "24c0330e8dfa3157b4526ffac57a91bee951be16b13c22f1390547b5708f3945":
        errors.append("User-resumption declaration changed after launch")
    manifest_path = OUT / declaration["checkpoint_manifest"]
    if digest(manifest_path) != declaration["checkpoint_manifest_sha256"]:
        errors.append("User-pause checkpoint manifest changed")
    manifest = json.loads(manifest_path.read_text())
    archive = OUT / declaration["checkpoint_archive"]
    originals = {}
    audit = {"resumption_id": declaration["id"], "verified_archived_phq_files": 0,
             "completed_runs_retained": 0, "identical_completed_files": 0,
             "api_byte_prefixes_retained": 0, "partial_answers_retained": 0,
             "metadata_execution_prefixes_retained": 0}
    for relative, expected in manifest.items():
        if not relative.startswith("phq/"):
            continue
        path = archive / relative
        if ".." in Path(relative).parts or not path.is_file() or digest(path) != expected:
            errors.append(f"User-pause PHQ archive changed or missing: {relative}")
            continue
        originals[relative] = path.read_bytes()
        audit["verified_archived_phq_files"] += 1
    for run in sorted({str(Path(relative).parent) for relative in originals}):
        result_relative = f"{run}/phq9.json"
        run_files = {relative: raw for relative, raw in originals.items()
                     if str(Path(relative).parent) == run}
        if result_relative in originals:
            audit["completed_runs_retained"] += 1
            for relative, raw in run_files.items():
                current = OUT / relative
                if not current.is_file() or current.read_bytes() != raw:
                    errors.append(f"Completed PHQ file changed after user pause: {relative}")
                else:
                    audit["identical_completed_files"] += 1
            continue
        for relative, raw in run_files.items():
            current = OUT / relative
            name = Path(relative).name
            if name in {"api_records.json", "api_records.jsonl"}:
                kept = current.is_file() and current.read_bytes().startswith(raw)
                if name.endswith(".json"):
                    kept = kept and current.read_bytes() == raw
                if not kept:
                    errors.append(f"Pre-pause PHQ API bytes changed: {relative}")
                else:
                    audit["api_byte_prefixes_retained"] += 1
            elif name == "phq9.partial.json":
                saved = json.loads(raw)["answers"]
                latest = OUT / result_relative if (OUT / result_relative).is_file() else current
                answers = json.loads(latest.read_text())["answers"] if latest.is_file() else {}
                for item, value in saved.items():
                    if answers.get(item) != value:
                        errors.append(f"Pre-pause PHQ answer changed: {run}/item{item}")
                    else:
                        audit["partial_answers_retained"] += 1
            elif name == "metadata.json":
                old = json.loads(raw)
                meta = json.loads(current.read_text()) if current.is_file() else {}
                for field in ("execution_segments", "resumed_at"):
                    previous = old.get(field, [])
                    if meta.get(field, [])[:len(previous)] != previous:
                        errors.append(f"Pre-pause PHQ metadata history changed: {run}/{field}")
                    else:
                        audit["metadata_execution_prefixes_retained"] += 1
    if audit["completed_runs_retained"] != declaration["completed_phq_administrations_retained"]:
        errors.append("User-pause completed PHQ count differs from resumption declaration")
    return audit


def event_endpoint(event, is_proven_inherited, label, errors, provider_audit=None, provider_checkpoint_event=False):
    if is_proven_inherited:
        if event.get("region", INHERITED_REGION) != INHERITED_REGION:
            errors.append(f"{label}: inherited API event has conflicting region")
        if event.get("amendment_id") is not None:
            errors.append(f"{label}: inherited API event unexpectedly declares continuation amendment")
        return INHERITED_REGION, "verified_archived_raw_prefix"
    if provider_audit and not provider_checkpoint_event:
        if event.get("region") != "openrouter" or event.get("provider") != "openrouter" or event.get("amendment_id") != provider_audit["id"]:
            errors.append(f"{label}: a post-provider-checkpoint API event must declare OpenRouter and its exact amendment")
            return "unverified", "missing_or_invalid_provider_tags"
        return "openrouter", "explicit_provider_continuation_event"
    if event.get("region") != CONTINUATION_REGION:
        errors.append(f"{label}: new API event must explicitly declare region=global")
    if event.get("amendment_id") != AMENDMENT_ID:
        errors.append(f"{label}: new API event lacks the correct amendment_id")
    region = event.get("region")
    return (region if region in (INHERITED_REGION, CONTINUATION_REGION) else "unverified"), ("hash_verified_provider_checkpoint" if provider_audit else "explicit_new_event")


def verify_metadata(meta, proof, patient_id, index, records, has_new_records, errors, provider_audit=None):
    label = f"{patient_id}/{index}"
    checkpoint_meta = (provider_audit or {}).get("phq_checkpoint_metadata", {}).get(f"phq/{patient_id}/run_{index:02d}")
    expected_provider = checkpoint_meta["provider"] if checkpoint_meta else "openrouter" if provider_audit else "VertexLLMRunner"
    required = {"patient_id": patient_id, "run": index, "model_id": MODEL_ID,
                "provider": expected_provider, "temperature": 0.1, "max_tokens_initial": 220,
                "top_p": 0.95, "top_k": 40, "stop_sequences": EXPECTED_CONFIG["stop_sequences"],
                "seed": "not set by original runner", "history": "none; each item independent"}
    for key, expected in required.items():
        if meta.get(key) != expected:
            errors.append(f"{label}: metadata {key} differs")
    for key, source in [("profile_sha256", SOURCE / "data/patients" / f"{patient_id}.yaml"),
                        ("questionnaire_sha256", SOURCE / "data/questionnaires/phq9.yaml"),
                        ("runner_sha256", SOURCE / "agent/core/questionnaire_runner.py"),
                        ("provider_sha256", SOURCE / "agent/core/llm_provider_vertex.py")]:
        legacy_missing = proof and proof["complete"] and key not in proof["metadata"]
        if not legacy_missing and meta.get(key) != digest(source):
            errors.append(f"{label}: {key} mismatch")
    if proof:
        if meta.get("region") != proof["metadata"].get("region"):
            errors.append(f"{label}: inherited metadata region was rewritten")
        if meta.get("started_at") != proof["metadata"].get("started_at"):
            errors.append(f"{label}: inherited started_at was rewritten")
    elif meta.get("region") != (checkpoint_meta.get("region") if checkpoint_meta else "openrouter" if provider_audit else CONTINUATION_REGION):
        errors.append(f"{label}: run origin metadata differs from its verified checkpoint or declared provider")
    if has_new_records and any(event.get("region") == CONTINUATION_REGION for event in records):
        segments = meta.get("execution_segments", [])
        if not any(segment.get("region") == CONTINUATION_REGION and segment.get("amendment_id") == AMENDMENT_ID
                   for segment in segments):
            errors.append(f"{label}: no global execution segment with the correct amendment_id")
    if provider_audit and len(records) > provider_audit["phq_checkpoint_record_counts"].get(f"phq/{patient_id}/run_{index:02d}", 0):
        if not any(segment.get("region") == "openrouter" and segment.get("provider") == "openrouter"
                   and segment.get("amendment_id") == provider_audit["id"]
                   and segment.get("openrouter_amendment_id") == provider_audit["id"]
                   and segment.get("rate_limit_amendment_id") == provider_audit["id"]
                   for segment in meta.get("execution_segments", [])):
            errors.append(f"{label}: no execution segment proving the new OpenRouter transport")
    if meta.get("status") == "completed" and meta.get("api_calls") != len(records):
        errors.append(f"{label}: metadata API count differs from archived logs")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-partial", action="store_true")
    args = parser.parse_args()
    errors, warnings, item_rows, partial_rows, run_rows, prompt_rows = [], [], [], [], [], []
    counts, finishes, models, error_types, usage = Counter(), Counter(), Counter(), Counter(), Counter()
    all_counts, attempt_endpoints, accepted_endpoints, partial_endpoints = Counter(), Counter(), Counter(), Counter()
    response_ids, complete_response_ids, attempt_ids = set(), set(), set()
    profile_summaries = {}
    rate_response_pairs = []
    provider_response_pairs = []
    amendment, inherited, inheritance_audit = verify_inheritance(errors)
    user_resume_audit = verify_user_resume_checkpoint(errors)
    spec = importlib.util.spec_from_file_location("longitudinal_checkpoint_audit", Path(__file__).with_name("analyze_longitudinal.py"))
    checkpoint_audit = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(checkpoint_audit)
    rate_limit_audit = checkpoint_audit.audit_rate_limit_support(
        OUT, json.loads((OUT / "longitudinal/manifest.json").read_text()),
        lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None)
    provider_audit = checkpoint_audit.audit_openrouter_support(
        OUT, json.loads((OUT / "longitudinal/manifest.json").read_text()),
        lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None,
        allow_partial=args.allow_partial)
    native_response_checks = []
    native_error_checks = []
    error_handling_audit = checkpoint_audit.audit_error_handling_support(
        OUT, lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None,
        allow_partial=args.allow_partial)
    if provider_audit:
        provider_audit["error_handling_audit"] = error_handling_audit
    phase_calls = []
    source_manifest = json.loads((OUT / "phq-source-manifest.json").read_text())
    for relative_path, expected in source_manifest.items():
        if not (SOURCE / relative_path).is_file() or digest(SOURCE / relative_path) != expected:
            errors.append(f"Frozen source changed: {relative_path}")
    expected_runs = {f"phq/{patient}/run_{index:02d}" for patient in PUBLISHED for index in range(1, 21)}
    observed_runs = {str(path.parent.relative_to(OUT)) for path in (OUT / "phq").rglob("metadata.json")}
    if observed_runs - expected_runs:
        errors.append(f"Unexpected PHQ run directories: {sorted(observed_runs - expected_runs)}")
    for patient_id, published in PUBLISHED.items():
        runner = qr.QuestionnaireRunner("phq9", patient_id, force=False)
        context = runner._build_patient_context()
        prompts, scales = {}, {}
        for item in runner.q_def["items"]:
            item_id = str(item["id"])
            scale = item.get("scale_override") or runner.q_def["scale"]
            prompt = runner._build_single_prompt(item, context, runner.profile.name, scale)
            prompts[prompt], scales[item_id] = item_id, scale
            prompt_rows.append({"patient_id": patient_id, "item_id": item_id,
                                "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt})
        values = []
        item_distributions = {item_id: [] for item_id in ITEM_IDS}
        for index in range(1, 21):
            relative = f"phq/{patient_id}/run_{index:02d}"
            directory = OUT / relative
            result_path, meta_path = directory / "phq9.json", directory / "metadata.json"
            if not meta_path.exists():
                if directory.exists() and any(directory.iterdir()):
                    errors.append(f"{relative}: files exist without metadata")
                continue
            meta = json.loads(meta_path.read_text())
            complete = meta.get("status") == "completed"
            if result_path.exists() != complete:
                errors.append(f"{relative}: completed result and metadata status disagree")
                continue
            result = json.loads(result_path.read_text()) if complete else None
            partial_path = directory / "phq9.partial.json"
            answers = (result["answers"] if complete else
                       json.loads(partial_path.read_text())["answers"] if partial_path.exists() else {})
            if (complete and set(answers) != ITEM_IDS) or not set(answers).issubset(ITEM_IDS):
                errors.append(f"{relative}: invalid or incomplete answer set")
                continue
            if any(type(value) is not int or not 0 <= value <= 3 for value in answers.values()):
                errors.append(f"{relative}: invalid answer values")
                continue
            proof = inherited.get(relative)
            try:
                raw_path, records, raw_bytes = load_records(directory)
            except (ValueError, json.JSONDecodeError) as exc:
                errors.append(str(exc))
                continue
            inherited_count = proof["proven_record_count"] if proof else 0
            if proof and proof["raw_path"] and (raw_path is None or str(raw_path.relative_to(OUT)) != proof["raw_path"]):
                errors.append(f"{relative}: raw API log file was replaced")
                inherited_count = 0
            if proof and proof["raw_path"] and not raw_bytes.startswith(proof["raw_bytes"]):
                errors.append(f"{relative}: raw API prefix changed during analysis")
                inherited_count = 0
            has_new_records = len(records) > inherited_count
            if proof and proof["complete"] and has_new_records:
                errors.append(f"{relative}: completed inherited run gained new API attempts")
            verify_metadata(meta, proof, patient_id, index, records, has_new_records, errors, provider_audit)
            provider_checkpoint_count = provider_audit["phq_checkpoint_record_counts"].get(relative, 0) if provider_audit else 0
            if rate_limit_audit:
                checkpoint_count = rate_limit_audit["phq_checkpoint_record_counts"].get(relative, 0)
                post_rate_count = sum(event.get("region") != "openrouter" for event in records[checkpoint_count:])
                rate_limit_audit["post_amendment_api_requests"] = rate_limit_audit.get("post_amendment_api_requests", 0) + post_rate_count
                if post_rate_count and not any(segment.get("rate_limit_amendment_id") == rate_limit_audit["id"] for segment in meta.get("execution_segments", [])):
                    errors.append(f"{relative}: post-checkpoint API attempts lack the rate-limit amendment execution segment")
            accepted, accepted_details, original_accepted = {}, {}, {}
            local_counts = Counter()
            for event_index, event in enumerate(records):
                label = f"{relative}/event_{event_index + 1}"
                old_event = event_index < inherited_count
                region, endpoint_evidence = event_endpoint(event, old_event, label, errors, provider_audit,
                                                           event_index < provider_checkpoint_count)
                phase_call = {"api_log": str(raw_path.relative_to(OUT)), "request_log_line": event_index + 1,
                              "attempt_id": event.get("attempt_id"), "stage": "phq_item",
                              "response_id": event.get("response", {}).get("response_id"),
                              "status": "returned" if "response" in event else "error", "error_type": event.get("error_type")}
                phase_calls.append(phase_call)
                attempt_endpoints[region] += 1
                local_counts["api_attempts"] += 1
                item_id = prompts.get(event.get("prompt"))
                if item_id is None:
                    errors.append(f"{label}: prompt differs from frozen runner")
                if event.get("generation_config") != EXPECTED_CONFIG:
                    errors.append(f"{label}: generation config differs")
                if event.get("safety_settings") != EXPECTED_SAFETY:
                    errors.append(f"{label}: safety settings differ")
                attempt_id = event.get("attempt_id")
                if not old_event and not attempt_id:
                    errors.append(f"{label}: new event lacks attempt ID")
                if attempt_id:
                    if attempt_id in attempt_ids:
                        errors.append(f"Repeated API attempt ID: {attempt_id}")
                    attempt_ids.add(attempt_id)
                if "response" not in event:
                    local_counts["failed_api_attempts"] += 1
                    if region == "openrouter":
                        native_error_checks.append(checkpoint_audit.audit_openrouter_error(
                            OUT, provider_audit, event, event,
                            lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None,
                            label=label))
                        phase_call["native_openrouter_error_validation"] = native_error_checks[-1]
                    if complete:
                        error_types[event.get("error_type", "unknown")] += 1
                    continue
                local_counts["successful_api_responses"] += 1
                response = event["response"]
                if region == "openrouter":
                    native_response_checks.append(checkpoint_audit.audit_openrouter_response(
                        OUT, provider_audit, event, response,
                        lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None,
                        label=label))
                    phase_call["native_openrouter_validation"] = native_response_checks[-1]
                rid = response.get("response_id")
                if not rid:
                    errors.append(f"{label}: missing response ID")
                elif rid in response_ids:
                    errors.append(f"Repeated API response ID: {rid}")
                if rid:
                    response_ids.add(rid)
                    if complete:
                        complete_response_ids.add(rid)
                if response.get("model_version") != MODEL_ID:
                    errors.append(f"{label}: served model differs")
                if complete:
                    models[response.get("model_version", "unknown")] += 1
                    for candidate in response.get("candidates", []):
                        finishes[candidate.get("finish_reason", "unknown")] += 1
                    for key, value in response.get("usage_metadata", {}).items():
                        if isinstance(value, int):
                            usage[key] += value
                if item_id is None:
                    continue
                try:
                    parsed = runner._parse_integer(response_text(response).strip(), scales[item_id])
                except ValueError:
                    local_counts["unparseable_responses"] += 1
                    continue
                if item_id in accepted:
                    errors.append(f"{label}: already accepted item was generated again")
                accepted[item_id] = parsed
                if old_event:
                    original_accepted[item_id] = parsed
                accepted_details[item_id] = {"response_id": rid,
                    "finish_reason": ",".join(c.get("finish_reason", "unknown") for c in response.get("candidates", [])),
                    "accepted_endpoint": region, "endpoint_evidence": endpoint_evidence,
                    "amendment_id": event.get("amendment_id", ""), "api_record_index": event_index + 1}
            all_counts.update(local_counts)
            if accepted != answers:
                errors.append(f"{relative}: saved answers do not match archived visible API text")
            if proof and not proof["complete"]:
                old_answers = proof["saved_answers"]
                if original_accepted != old_answers:
                    errors.append(f"{relative}: original partial answers disagree with inherited API records")
                for item_id, value in old_answers.items():
                    if answers.get(item_id) != value or accepted_details.get(item_id, {}).get("accepted_endpoint") != INHERITED_REGION:
                        errors.append(f"{relative}: inherited accepted item {item_id} was lost or replaced")
                    else:
                        inheritance_audit["retained_saved_partial_items"] += 1
            if complete:
                recomputed = runner._compute_scores(answers)
                if recomputed != result["scores"]:
                    errors.append(f"{relative}: score mismatch")
                if meta.get("answers") != answers or meta.get("total") != recomputed["total"]:
                    errors.append(f"{relative}: metadata answers or total differ")
                values.append(recomputed["total"])
                counts.update(local_counts)
                label, composition, endpoint_counts = endpoint_composition(
                    accepted_details.get(item_id, {}).get("accepted_endpoint", "unverified") for item_id in answers)
                run_rows.append({"patient_id": patient_id, "run": index, "score": recomputed["total"],
                                 "at_least_10": recomputed["total"] >= 10, "api_attempts": len(records),
                                 "started_at": meta["started_at"], "finished_at": meta["finished_at"],
                                 "accepted_endpoint_composition": label, "accepted_endpoint_item_counts": composition,
                                 "accepted_items_us_central1": endpoint_counts.get(INHERITED_REGION, 0),
                                 "accepted_items_global": endpoint_counts.get(CONTINUATION_REGION, 0),
                                 "accepted_items_openrouter": endpoint_counts.get("openrouter", 0),
                                 "inherited_api_attempts": inherited_count,
                                 "continuation_api_attempts": len(records) - inherited_count})
            for item_id, value in sorted(answers.items(), key=lambda pair: int(pair[0])):
                details = accepted_details.get(item_id, {})
                if rate_limit_audit and details.get("accepted_endpoint") != "openrouter" and details.get("api_record_index", 0) > checkpoint_count and details.get("response_id"):
                    rate_response_pairs.append((str(raw_path.relative_to(OUT)), details["response_id"]))
                if provider_audit and details.get("accepted_endpoint") == "openrouter" and details.get("response_id"):
                    provider_response_pairs.append((str(raw_path.relative_to(OUT)), details["response_id"]))
                row = {"patient_id": patient_id, "run": index, "item_id": int(item_id),
                       "answer": value, "counts_in_total": int(item_id) <= 9,
                       **{key: details.get(key) for key in ("response_id", "finish_reason", "accepted_endpoint",
                                                          "endpoint_evidence", "amendment_id", "api_record_index")}}
                region = details.get("accepted_endpoint", "unverified")
                if complete:
                    item_distributions[item_id].append(value)
                    accepted_endpoints[region] += 1
                    if details.get("finish_reason") != "STOP":
                        counts["accepted_answers_without_STOP"] += 1
                    item_rows.append(row)
                else:
                    partial_endpoints[region] += 1
                    partial_rows.append({**row, "run_status": meta.get("status")})
        profile_summaries[patient_id] = {
            **score_summary(values), "archived_published_score": published,
            "n_matching_archived_score": values.count(published),
            "reviewer_reported_mean_unverified": REVIEWER.get(patient_id),
            "item_mean": {key: statistics.mean(item_distributions[key]) if item_distributions[key] else None
                          for key in sorted(ITEM_IDS, key=int)}}
    strata = defaultdict(list)
    for row in run_rows:
        strata[row["accepted_endpoint_composition"]].append(row)
    endpoint_statistics = {
        label: {"all_profiles": score_summary([row["score"] for row in rows]),
                "profiles": {patient: score_summary([row["score"] for row in rows if row["patient_id"] == patient])
                             for patient in PUBLISHED},
                "item_count_compositions": dict(Counter(row["accepted_endpoint_item_counts"] for row in rows))}
        for label, rows in sorted(strata.items())}
    completed = (all(profile["n"] == 20 for profile in profile_summaries.values())
                 and len(run_rows) == 100 and len(item_rows) == 1000)
    if any(profile["n"] > 20 for profile in profile_summaries.values()) or len(run_rows) > 100 or len(item_rows) > 1000:
        errors.append("Planned administration or item count exceeded")
    if any(reason != "STOP" for reason in finishes):
        warnings.append("Some recorded candidates did not finish with STOP; the frozen runner's original handling is retained.")
    warnings.append("Operational routing amendment: inherited us-central1 data and explicit global continuation; not a single-endpoint replication.")
    warnings.append("Endpoint strata describe accepted answers, not random endpoint assignment; mixed runs use their complete score, never a subset score.")
    if rate_limit_audit:
        rate_limit_audit["transport_sidecar_validation"] = checkpoint_audit.audit_rate_limit_sidecar(
            OUT, rate_limit_audit, rate_response_pairs,
            lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None)
        warnings.append("Shared-rate-limit transport amendment preserves all 68 complete PHQs and 12 accepted partial items; original prompts, generation parameters and MAX_TOKENS acceptance remain unchanged. Retry/latency statistics span operational policies.")
    if provider_audit:
        provider_audit["transport_sidecar_validation"] = checkpoint_audit.audit_openrouter_sidecar(
            OUT, provider_audit, provider_response_pairs,
            lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None)
        provider_audit["native_response_checks"] = native_response_checks
        provider_audit["native_error_checks"] = native_error_checks
        provider_audit["post_amendment_api_requests"] = attempt_endpoints["openrouter"]
        warnings.append("OpenRouter continuation retains every Vertex answer and uses the requested Gemini 2.5 Pro model, with exact user prompts and forwarded temperature/max_tokens/top_p/stop. Legacy top_k and Vertex safety settings are not forwarded. Effective decoding and service behavior are not identical; report Vertex us-central1/global, OpenRouter and mixed complete-administration strata. Provider assignment is operational, not randomized.")
    checkpoint_audit.audit_error_handling_requests(
        OUT, error_handling_audit, phase_calls,
        lambda level, code, message, **context: errors.append(f"{code}: {message} {context}") if level == "error" else None, "phq")
    if error_handling_audit:
        warnings.append("A separate transport extension rejects native in-band choice errors before normalization. The original HTTP-200/OTHER failure, all 85 completed PHQs, six partial items and 184 longitudinal turns remain archived; only unfinished work resumes. Prompt/scoring/decoding settings and ordinary STOP/MAX_TOKENS/SAFETY handling are unchanged.")
    summary = {"status": "complete" if completed else "incomplete", "profiles": profile_summaries,
               "complete_administrations": len(run_rows), "item_answers": len(item_rows),
               "api_counts_for_complete_administrations": dict(counts), "finish_reasons": dict(finishes),
               "served_model_versions": dict(models), "error_types": dict(error_types), "token_usage": dict(usage),
               "unique_response_ids": len(complete_response_ids), "validation_errors": errors, "warnings": warnings,
               "scope": "Frozen clinical inputs and requested legacy generation configuration with declared endpoint/provider continuations; effective OpenRouter parameters are separately audited, not assumed identical. Not reconstruction of unknown historical model/seed or clinical validation",
               "sampling": "20 planned administrations per fixed synthetic patient; 68 regional complete administrations and saved partial answers reused; prior initial-audit unlogged run-04 partials remain excluded",
               "config": EXPECTED_CONFIG, "seed": "not set by original runner",
               "reviewer_values_source": "User-provided reviewer report; original reviewer code and outputs unavailable",
               "endpoint_amendment": {"id": amendment["id"], "reason": amendment["reason"],
                                      "inherited_region": INHERITED_REGION, "continuation_region": CONTINUATION_REGION},
               "inheritance_validation": inheritance_audit,
               "user_resume_validation": user_resume_audit,
               "rate_limit_validation": rate_limit_audit,
               "openrouter_validation": checkpoint_audit.public_openrouter_audit(provider_audit),
               "transport_error_validation": checkpoint_audit.public_error_handling_audit(error_handling_audit),
               "single_provider_replication": False if provider_audit else True,
               "stratum_dimension": "API route/provider; openrouter is not an attested geographic region",
               "endpoint_statistics_for_complete_administrations": endpoint_statistics,
               "accepted_item_endpoint_counts_complete_administrations": dict(accepted_endpoints),
               "accepted_item_endpoint_counts_incomplete_administrations": dict(partial_endpoints),
               "api_attempt_endpoint_counts_all_started_administrations": dict(attempt_endpoints),
               "api_counts_all_started_administrations": dict(all_counts),
               "unique_response_ids_all_started_administrations": len(response_ids),
               "unique_attempt_ids_where_available": len(attempt_ids),
               "saved_items_in_incomplete_administrations": len(partial_rows)}
    (OUT / "analysis").mkdir(parents=True, exist_ok=True)
    write_json("phq-validation.json", summary)
    write_json("phq-exact-prompts.json", prompt_rows)
    for filename, rows in [("phq-runs.csv", run_rows), ("phq-items.csv", item_rows),
                           ("phq-incomplete-items.csv", partial_rows)]:
        if rows:
            with (OUT / "analysis" / filename).open("w", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
                writer.writeheader()
                writer.writerows(rows)
        else:
            (OUT / "analysis" / filename).unlink(missing_ok=True)
    print(json.dumps({"status": summary["status"], "complete_administrations": len(run_rows),
                      "item_answers": len(item_rows), "validation_errors": errors, "warnings": warnings,
                      "n_per_patient": {p: v["n"] for p, v in profile_summaries.items()},
                      "inheritance_validation": inheritance_audit,
                      "accepted_item_endpoint_counts": dict(accepted_endpoints),
                      "complete_run_endpoint_counts": {key: len(value) for key, value in strata.items()}}, indent=2))
    return 1 if errors or (not completed and not args.allow_partial) else 0


if __name__ == "__main__":
    raise SystemExit(main())
