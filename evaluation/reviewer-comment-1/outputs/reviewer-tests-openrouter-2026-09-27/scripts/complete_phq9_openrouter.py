"""Continue the saved PHQ administrations through the declared OpenRouter transport.

Completed Vertex runs and partial answers are continued after a documented
provider amendment. Every new API attempt declares OpenRouter as its transport.
No completed answers are regenerated; model/generation settings are preserved.
"""
import argparse
import hashlib
import json
import logging
import os
import platform
import statistics
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
SOURCE = OUT / "phq-source"
LIVE_SOURCE = Path("/Users/marco/Sites/LLMPatients-Agent")
sys.path.insert(0, str(SOURCE))
from dotenv import load_dotenv

load_dotenv(LIVE_SOURCE / "config/.env")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(LIVE_SOURCE / "config/vertex-ai-api-key.json")
os.environ["GCP_LOCATION"] = "global"
os.environ["QUESTIONNAIRE_INTER_BATCH_DELAY_SECONDS"] = "0"
os.environ["VERTEX_MIN_REQUEST_INTERVAL_SECONDS"] = "3"
os.environ["VERTEX_RATE_LIMIT_COOLDOWN_SECONDS"] = "20"
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGSMITH_TRACING"] = "false"
from agent.core import questionnaire_runner as qr
from agent.core.llm_provider_base import STOP_SEQUENCES
from campaign_openrouter import AMENDMENT_ID as RATE_AMENDMENT_ID, CampaignCapacityPause, install_openrouter_overlay

qr.RESULTS_DIR = OUT / "phq"
PATS = ["alex_carter_001", "crystal_smith_001", "daniel_isherwood_001", "jason_smith_001", "juanita_delgado_001"]
LOCK = threading.Lock()
STOP = threading.Event()
COORDINATOR = None
TOTAL_RUNS = 20
AMENDMENT = json.loads((OUT / "openrouter-provider-amendment.json").read_text())
assert AMENDMENT["id"] == RATE_AMENDMENT_ID
assert AMENDMENT["continuation_provider"] == "openrouter"


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False, default=str) + "\n")
    temp.replace(path)


def summarize():
    summary = {}
    for patient in PATS:
        scores = []
        for index in range(1, TOTAL_RUNS + 1):
            result_path = OUT / "phq" / patient / f"run_{index:02d}" / "phq9.json"
            if result_path.exists():
                result = json.loads(result_path.read_text())
                assert len(result["answers"]) == 10
                assert sum(result["answers"][str(k)] for k in range(1, 10)) == result["scores"]["total"]
                scores.append(result["scores"]["total"])
        summary[patient] = {
            "n": len(scores), "scores": scores,
            "mean": statistics.mean(scores) if scores else None,
            "sd": statistics.stdev(scores) if len(scores) > 1 else None,
            "min": min(scores) if scores else None, "max": max(scores) if scores else None,
            "n_ge_10": sum(score >= 10 for score in scores),
        }
    write_json(OUT / "phq-summary.json", summary)
    return summary


class ObservedModel:
    def __init__(self, inner, path):
        self.inner, self.path = inner, path

    def generate_content(self, *args, **kwargs):
        event = {
            "attempt_id": str(uuid.uuid4()), "timestamp": now(),
            "region": "openrouter", "provider": "openrouter", "amendment_id": AMENDMENT["id"],
            "prompt": args[0] if args else kwargs.get("contents"),
            "generation_config": kwargs.get("generation_config"),
            "safety_settings": {str(k): str(v) for k, v in kwargs.get("safety_settings", {}).items()},
        }
        started = time.monotonic()
        try:
            response = self.inner.generate_content(*args, **kwargs)
            event["response"] = response.to_dict()
            return response
        except Exception as exc:
            event["error_type"], event["error"] = type(exc).__name__, str(exc)
            event["openrouter_archive_record_id"] = getattr(exc, "record_id", None)
            raise
        finally:
            event["elapsed_seconds"] = time.monotonic() - started
            with self.path.open("a") as stream:
                stream.write(json.dumps(event, ensure_ascii=False, default=str) + "\n")
                stream.flush()
                os.fsync(stream.fileno())


def run_one(patient, index):
    if STOP.is_set() or (COORDINATOR is not None and COORDINATOR.stop_path.exists()):
        return
    run_dir = OUT / "phq" / patient / f"run_{index:02d}"
    run_dir.mkdir(parents=True, exist_ok=True)
    result_path = run_dir / "phq9.json"
    if result_path.exists():
        return
    runner = qr.QuestionnaireRunner("phq9", patient, force=True)
    assert runner.llm.model_id == AMENDMENT["legacy_model_id"]
    runner.result_path = result_path
    runner.partial_path = run_dir / "phq9.partial.json"
    runner.llm.model = ObservedModel(runner.llm.model, run_dir / "api_records.jsonl")
    meta_path = run_dir / "metadata.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        meta.setdefault("resumed_at", []).append(now())
    else:
        meta = {
            "patient_id": patient, "run": index, "model_id": runner.llm.model_id,
            "legacy_parser_class": type(runner.llm).__name__, "region": "openrouter", "provider": "openrouter",
            "openrouter_model_id": AMENDMENT["model_id"],
            "seed": "not set by original runner", "temperature": 0.1, "max_tokens_initial": 220,
            "top_p": 0.95, "top_k": 40, "stop_sequences": STOP_SEQUENCES,
            "history": "none; each item independent",
            "profile_sha256": digest(SOURCE / "data/patients" / f"{patient}.yaml"),
            "questionnaire_sha256": digest(SOURCE / "data/questionnaires/phq9.yaml"),
            "runner_sha256": digest(SOURCE / "agent/core/questionnaire_runner.py"),
            "provider_sha256": digest(SOURCE / "agent/core/llm_provider_vertex.py"),
            "started_at": now(),
        }
    retained_partial_answers = {}
    if runner.partial_path.exists():
        retained_partial_answers = json.loads(runner.partial_path.read_text()).get("answers", {})
    meta.setdefault("execution_segments", []).append({
        "started_at": now(), "region": "openrouter", "provider": "openrouter", "pid": os.getpid(),
        "amendment_id": AMENDMENT["id"],
        "rate_limit_amendment_id": RATE_AMENDMENT_ID, "openrouter_amendment_id": RATE_AMENDMENT_ID,
        "retained_item_ids": sorted(retained_partial_answers, key=int),
    })
    meta["status"] = "running"
    write_json(meta_path, meta)
    try:
        result = runner.run()
        meta.update(status="completed", total=result["scores"]["total"], answers=result["answers"])
    except CampaignCapacityPause as exc:
        STOP.set()
        meta.update(status="paused_capacity", pause_reason=exc.reason)
        raise
    except Exception as exc:
        meta.update(status="failed", error_type=type(exc).__name__, error=str(exc))
        raise
    finally:
        meta["finished_at"] = now()
        records_path = run_dir / "api_records.jsonl"
        meta["api_calls"] = len(records_path.read_text().splitlines()) if records_path.exists() else 0
        write_json(meta_path, meta)
        with LOCK:
            summary = summarize()
            print("CAMPAIGN_PROGRESS", json.dumps({p: v["n"] for p, v in summary.items()}), flush=True)


def main():
    global COORDINATOR
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    assert 1 <= args.workers <= 2
    logging.basicConfig(level=logging.WARNING)
    from agent.core.llm_provider_vertex import VertexLLMRunner
    COORDINATOR = install_openrouter_overlay(VertexLLMRunner, OUT)
    COORDINATOR.ensure_running()
    manifest = {
        "started_at": now(), "python": sys.version, "platform": platform.platform(),
        "patients": PATS, "runs_per_patient_requested": TOTAL_RUNS,
        "concurrent_workers": args.workers, "minimum_request_interval_seconds": 5,
        "rate_limit_cooldown_seconds": 20, "inter_batch_delay_seconds": 0,
        "imported_runs": "1–3 of each patient copied unaltered from reviewer-audit-2026-09-27",
        "prior_run_04_partials": "excluded, missing raw API records; retained in original audit archive",
        "original_data_overwritten": False, "source_snapshot": "phq-source",
        "requested_legacy_generation_parameters_changed": False,
        "transport_parameter_mapping_changed": True,
        "endpoint_amendment": AMENDMENT["id"],
        "endpoint_amendment_sha256": digest(OUT / "openrouter-provider-amendment.json"),
        "continuation_region": "openrouter",
        "inherited_complete_administrations": AMENDMENT["inherited_counts"]["phq_complete_administrations"],
        "inherited_runs_and_answers": "All recorded Vertex completions and partial answers are retained; each new attempt declares OpenRouter and archives the effective payload.",
    }
    manifest_path = OUT / "phq-campaign-manifest.json"
    if not manifest_path.exists():
        write_json(manifest_path, manifest)
    with LOCK:
        summarize()
    status = {"status": "running", "pid": os.getpid(), "started_at": now(),
              "actual_workers": args.workers, "rate_limit_amendment_id": RATE_AMENDMENT_ID, "openrouter_amendment_id": RATE_AMENDMENT_ID,
              "rate_limit_amendment_sha256": digest(OUT / "openrouter-provider-amendment.json")}
    write_json(OUT / "phq-campaign-status.json", status)
    failures = []
    # Round-robin by run number avoids a time-of-day block for one patient.
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run_one, p, i): (p, i) for i in range(1, TOTAL_RUNS + 1) for p in PATS}
        for future in as_completed(futures):
            if future.cancelled():
                continue
            try:
                future.result()
            except CampaignCapacityPause as exc:
                STOP.set()
                failures.append({"patient": futures[future][0], "run": futures[future][1],
                                 "type": "CampaignCapacityPause", "reason": exc.reason})
                for pending in futures:
                    pending.cancel()
            except Exception as exc:
                patient, index = futures[future]
                failures.append({"patient": patient, "run": index, "type": type(exc).__name__, "error": str(exc)})
                print("CAMPAIGN_FAILURE", json.dumps(failures[-1]), flush=True)
    summary = summarize()
    status.update(status="paused_capacity" if STOP.is_set() else "completed" if all(v["n"] == TOTAL_RUNS for v in summary.values()) else "incomplete",
                  finished_at=now(), failures=failures)
    write_json(OUT / "phq-campaign-status.json", status)
    print("FINAL_SUMMARY", json.dumps(summary), flush=True)
    return 75 if STOP.is_set() else 0 if status["status"] == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
