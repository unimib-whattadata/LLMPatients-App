"""Bounded replay of exact patient prompts selected by a disclosed archive audit.

Only the saved patient generation is repeated. No original files, graph state,
classifications, memory, or transcript prefixes are changed or regenerated.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import sys
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parent / "memory-comparison-run-2026-09-29"
RUNTIME = HERE / "replay-runtime"
PATIENTS = ("alex_carter_001", "juanita_delgado_001")
ARMS = ("structured_common_profile", "flat_full_history")
CONFIG = {"temperature": 0.7, "max_output_tokens": 4096, "top_p": 0.95,
          "top_k": 40, "stop_sequences": ["\nTherapist:", "Therapist:"],
          "thinking_config": {"thinking_budget": 1024}}
sys.path.insert(0, str(ORIGINAL))
sys.path.insert(0, str(ORIGINAL / "source"))
sys.path.insert(0, str(ORIGINAL / "continuations/resume-07"))


def now():
    return datetime.now(timezone.utc).isoformat()


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def rows(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def put_new(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


def prepare():
    if (HERE / "replay-manifest.json").exists():
        raise RuntimeError("Preparation already frozen")
    from prepare_execution import verify as verify_original
    verify_original()
    source_hashes, cases = {}, []
    for patient in PATIENTS:
        question = None
        for arm in ARMS:
            run_id = f"{patient}__r03__{arm}"
            run = ORIGINAL / "runtime" / run_id
            paths = [run / "accepted-turns.jsonl",
                     run / "sessions/session_04/generation-events.jsonl",
                     run / "sessions/session_04/openrouter-api-records.jsonl"]
            source_hashes.update({str(p.relative_to(ORIGINAL)): sha(p) for p in paths})
            turn = next(t for t in rows(paths[0]) if t["turn_id"] == "s04t02")
            requests = [r for r in rows(paths[1]) if r.get("event") == "request"
                        and r.get("stage") == "generate_response" and r.get("turn_id") == "s04t02"]
            assert len(requests) == 1
            request = requests[0]
            assert request["prompt"] == turn["prompt"] and request["generation_config"] == CONFIG
            assert question is None or question == turn["therapist_text"]
            question = turn["therapist_text"]
            native = [r for r in rows(paths[2]) if r.get("event") == "response"
                      and r.get("request", {}).get("messages") == [{"role": "user", "content": request["prompt"]}]]
            assert len(native) == 1
            assert native[0]["response"]["model"] == "google/gemini-2.5-pro"
            case_id = f"{patient}__{arm}"
            case = {"case_id": case_id, "patient_id": patient, "arm": arm,
                    "source_run_id": run_id, "turn_id": "s04t02", "session_index": 4,
                    "original_question": question, "original_response": turn["patient_text"],
                    "prompt": request["prompt"], "generation_config": CONFIG,
                    "source_native_record_id": native[0]["record_id"],
                    "prompt_sha256": hashlib.sha256(request["prompt"].encode()).hexdigest(),
                    "source_files": [str(p.relative_to(ORIGINAL)) for p in paths]}
            put_new(HERE / "replay-inputs" / f"{case_id}.json", case)
            cases.append(case_id)
    schedule = [{"case_id": case, "repetition": repetition}
                for repetition in range(1, 4) for case in cases]
    random.Random(20260930).shuffle(schedule)
    put_new(HERE / "replay-schedule.json", {"seed_for_order_only": 20260930,
                                          "jobs": schedule, "api_seed": None})
    files = [HERE / "replay.py", HERE / "PROTOCOL.md", HERE / "replay-schedule.json"]
    files += sorted((HERE / "replay-inputs").glob("*.json"))
    source_hashes.update({name: sha(ORIGINAL / name) for name in [
        "manifest.json", "runtime_adapter.py", "openrouter_transport.py",
        "openrouter_inband_errors.py", "continuations/resume-07/timeout_retries.py",
        "source/agent/core/llm_provider_vertex.py", "source/agent/core/llm_provider_base.py"]})
    put_new(HERE / "replay-manifest.json", {
        "created_at": now(), "status": "frozen_before_replay", "planned_responses": 12,
        "selection": "Two baseline contradictions selected post hoc from the completed original archive; same-turn structured counterparts included.",
        "scope": "Conditional patient-generation replay of four exact archived prompts, three independent calls each; no full trajectory rerun.",
        "files": {str(p.relative_to(HERE)): sha(p) for p in files},
        "original_root": str(ORIGINAL), "source_files": source_hashes,
        "model": "google/gemini-2.5-pro", "generation_config": CONFIG})
    print(json.dumps({"status": "prepared", "prompts": 4, "planned_responses": 12}), flush=True)


def verify():
    manifest = read(HERE / "replay-manifest.json")
    for name, expected in manifest["files"].items():
        assert sha(HERE / name) == expected, name
    for name, expected in manifest["source_files"].items():
        assert sha(ORIGINAL / name) == expected, name
    for path in (HERE / "replay-inputs").glob("*.json"):
        case = read(path)
        assert hashlib.sha256(case["prompt"].encode()).hexdigest() == case["prompt_sha256"]
        assert case["generation_config"] == CONFIG
        assert len(case["prompt"].encode()) <= 64_000 * 3
    return manifest


def generate_response(runner, prompt):
    # Keep the frozen runner's stage/configuration and validity checks.
    return runner.generate(prompt, temperature=0.7, max_tokens=4096, thinking_budget=1024)


def live():
    verify()
    if RUNTIME.exists():
        raise RuntimeError("Replay runtime already exists; no automatic restart")
    RUNTIME.mkdir()
    from runtime_adapter import SerialGate, create_runner, write_json, append_jsonl
    from openrouter_inband_errors import install_inband_error_handling
    from timeout_retries import install_retry_policy
    install_inband_error_handling()
    model_class = install_retry_policy(RUNTIME)
    schedule = read(HERE / "replay-schedule.json")["jobs"]
    gate = SerialGate(RUNTIME / "request-gate.json")
    started_at = now()
    write_json(RUNTIME / "state.json", {"status": "running", "pid": os.getpid(),
               "started_at": started_at, "completed": 0, "planned": len(schedule)})
    try:
        for index, job in enumerate(schedule, 1):
            case = read(HERE / "replay-inputs" / f"{job['case_id']}.json")
            directory = RUNTIME / f"{index:02d}__{job['case_id']}__rep{job['repetition']}"
            directory.mkdir()
            context = {"session_index": 4, "turn_id": "s04t02", "arm": case["arm"],
                       "patient_id": case["patient_id"]}
            model = model_class("gemini-2.5-pro", timeout_seconds=120,
                                records_path=directory / "openrouter-api-records.jsonl")
            runner = create_runner(model=model, events_path=directory / "generation-events.jsonl",
                                   gate=gate, context=context, stop_path=RUNTIME / "STOP")
            write_json(RUNTIME / "state.json", {"status": "running", "pid": os.getpid(),
                       "started_at": started_at, "heartbeat": now(), "completed": index - 1,
                       "planned": len(schedule), "current_job": job})
            response = generate_response(runner, case["prompt"])
            requests = [r for r in rows(directory / "generation-events.jsonl") if r["event"] == "request"]
            assert requests[0]["prompt"] == case["prompt"]
            assert requests[0]["generation_config"] == case["generation_config"]
            result = {**job, "patient_id": case["patient_id"], "arm": case["arm"],
                      "question": case["original_question"], "response": response,
                      "prompt_sha256": case["prompt_sha256"], "timestamp": now(),
                      "directory": str(directory.relative_to(HERE))}
            put_new(directory / "answer.json", result)
            append_jsonl(RUNTIME / "answers.jsonl", result)
            print(json.dumps({"status": "progress", "completed": index,
                              "planned": len(schedule), **job}), flush=True)
        verify()
        write_json(RUNTIME / "state.json", {"status": "completed", "pid": os.getpid(),
                   "started_at": started_at, "completed_at": now(), "completed": len(schedule),
                   "planned": len(schedule), "original_sources_unchanged": True})
    except BaseException as exc:
        write_json(RUNTIME / "state.json", {"status": "stopped", "pid": os.getpid(),
                   "started_at": started_at, "stopped_at": now(),
                   "completed": len(rows(RUNTIME / "answers.jsonl")) if (RUNTIME / "answers.jsonl").exists() else 0,
                   "planned": len(schedule), "error_type": type(exc).__name__})
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "verify", "live"))
    args = parser.parse_args()
    if args.command == "prepare":
        prepare()
    elif args.command == "verify":
        print(json.dumps({"status": "verified", "planned_responses": verify()["planned_responses"]}))
    else:
        live()
