"""Serial, checkpointed memory comparison. A provider failure stops the run."""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import random
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "frozen"))
sys.path.insert(0, str(ROOT / "scripts"))
os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", TOKENIZERS_PARALLELISM="false")
from agent.core.factual_memory import EvidenceMemory, MemoryExtractionError, estimated_tokens
from agent.core.memory_store import JsonlMemoryStore
from contexts import (ARMS, THERAPIST_ID, answer_prompt, assemble_context, narrative_from_profile,
                      prefix_sentences, sha, summary_prompt)

RUN = ROOT / "run"
ENCODER_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
PATIENTS = ["alex_carter_001", "jason_smith_001", "daniel_isherwood_001",
            "crystal_smith_001", "juanita_delgado_001"]


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def read_json(path):
    return json.loads(Path(path).read_text())


def file_sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def event(**data):
    RUN.mkdir(exist_ok=True)
    data = {"timestamp": now(), **data}
    with (RUN / "progress.jsonl").open("a") as stream:
        stream.write(json.dumps(data) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    print(json.dumps(data), flush=True)


def freeze():
    if (ROOT / "manifest.json").exists():
        raise RuntimeError("Manifest already exists; verify it, do not silently replace the frozen experiment")
    gold = read_json(ROOT / "corpus/gold.json")
    questions = {t["patient_id"]: [{k: p[k] for k in ("probe_id", "category", "question")}
                  for p in t["probes"]] for t in gold["trajectories"]}
    assert set(questions) == set(PATIENTS)
    assert all(len(value) == 8 for value in questions.values())
    rng = random.Random(20260928)
    patients = list(PATIENTS)
    rng.shuffle(patients)
    order = {}
    for pid in patients:
        data = read_json(ROOT / "corpus" / f"{pid}.json")
        assert len(data["sessions"]) == 11
        assert all(len(s["turns"]) == 12 for s in data["sessions"])
        jobs = [{"patient_id": pid, "arm": arm, "probe_id": q["probe_id"]}
                for q in questions[pid] for arm in ARMS]
        rng.shuffle(jobs)
        order[pid] = jobs
    write_json(ROOT / "questions.json", questions)
    write_json(ROOT / "schedule.json", {"seed": 20260928, "patients": patients, "queries": order})
    packages = {}
    for name in ("sentence-transformers", "transformers", "torch", "numpy", "scipy",
                 "google-cloud-aiplatform", "protobuf", "PyYAML", "huggingface-hub"):
        packages[name] = importlib.metadata.version(name)
    encoder_path = Path.home() / ".cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots" / ENCODER_REVISION
    write_json(ROOT / "environment.json", {"python": sys.version, "executable": sys.executable,
               "platform": platform.platform(), "packages": packages,
               "encoder_revision": ENCODER_REVISION,
               "encoder_files": {str(p.relative_to(encoder_path)): file_sha(p)
                                 for p in sorted(encoder_path.rglob("*")) if p.is_file()}})
    files = [ROOT / "PROTOCOL.md", ROOT / "questions.json", ROOT / "schedule.json", ROOT / "environment.json"]
    for directory in ("scripts", "frozen", "corpus"):
        files += [p for p in (ROOT / directory).rglob("*")
                  if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"]
    manifest = {"frozen_at": now(), "model": "google/gemini-2.5-pro", "provider": "OpenRouter",
                "local_seed": 20260928, "api_seed": None,
                "files": {str(p.relative_to(ROOT)): file_sha(p) for p in sorted(set(files))}}
    write_json(ROOT / "manifest.json", manifest)
    print(json.dumps({"frozen_files": len(manifest["files"]), "patients": patients,
                      "final_queries": sum(map(len, order.values()))}), flush=True)


def verify():
    manifest = read_json(ROOT / "manifest.json")
    for relative, expected in manifest["files"].items():
        if file_sha(ROOT / relative) != expected:
            raise RuntimeError(f"Frozen input changed: {relative}")


class Client:
    def __init__(self, root=RUN, model=None, limiter=None):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        if model is None:
            from openrouter_transport import OpenRouterModel
            from openrouter_inband_errors import install_inband_error_handling
            install_inband_error_handling()
            model = OpenRouterModel("gemini-2.5-pro", timeout_seconds=120,
                                    records_path=self.root / "native.jsonl")
        if limiter is None:
            from agent.core.vertex_rate_limit import VertexRateLimiter
            limiter = VertexRateLimiter(self.root / "pacing.sqlite3", "openrouter-memory-benchmark",
                                       interval_seconds=5, failure_threshold=1, max_wait_seconds=60)
        self.model, self.limiter = model, limiter

    def reconcile_attempt(self, attempt, prompt):
        """Recover an already archived completion before considering any new call."""
        if "finish_reason" in attempt or "error_type" in attempt:
            return
        native_path = getattr(self.model, "records_path", None)
        if native_path is None or "native_log_offset" not in attempt:
            raise RuntimeError("Unresolved request intent; refusing to repeat an unaccounted request")
        if not Path(native_path).exists():
            # Intent was written, but no request was ever journaled/sent.
            attempt["error_type"] = "UnsentIntent"
            return
        with Path(native_path).open("rb") as stream:
            stream.seek(attempt["native_log_offset"])
            records = [json.loads(line) for line in stream if line.strip()]
        if not records:
            attempt["error_type"] = "UnsentIntent"
            return
        request = records[0]
        if (request.get("event") != "request" or
                request["request"]["messages"] != [{"role": "user", "content": prompt}] or
                request["request"]["max_tokens"] != attempt["config"]["max_output_tokens"]):
            raise RuntimeError("Native journal does not match its durable request intent")
        outcomes = [r for r in records if r["record_id"] == request["record_id"] and r["event"] != "request"]
        if len(outcomes) != 1:
            raise RuntimeError("Request outcome unknown; refusing to repeat an unaccounted request")
        record = outcomes[0]
        attempt.update(native_record_id=record["record_id"], recovered_from_native_journal=True,
                       elapsed_seconds=record.get("elapsed_seconds"))
        if record["event"] != "response":
            attempt["error_type"] = record.get("error_type", "ArchivedProviderFailure")
            return
        import openrouter_transport
        from openrouter_inband_errors import install_inband_error_handling
        install_inband_error_handling()
        response = openrouter_transport._normalized_response(record["response"])
        attempt.update(finish_reason=response.candidates[0].finish_reason.name,
                       text=response.text if response.candidates[0].content.parts else "")

    def generate(self, prompt, *, role, stage):
        initial = 4096 if role == "answer" else 8192
        config = {"temperature": .7 if role == "answer" else .2, "max_output_tokens": initial,
                  "top_p": .95, "stop_sequences": ["\nTherapist:", "Therapist:"],
                  "thinking_config": {"thinking_budget": 1024}}
        call_id = sha({"stage": stage, "prompt": prompt, "config": config})
        path = self.root / "calls" / f"{call_id}.json"
        if path.exists():
            saved = read_json(path)
            if saved["status"] == "complete":
                return saved["text"]
            attempts = saved.get("attempts", [])
            for attempt in attempts:
                self.reconcile_attempt(attempt, prompt)
                if attempt.get("finish_reason") == "STOP" and attempt.get("text", "").strip():
                    saved.update(status="complete", text=attempt["text"])
                    write_json(path, saved)
                    return attempt["text"]
            write_json(path, saved)
        else:
            attempts = []
        prior_lengths = [a for a in attempts if a.get("finish_reason") == "MAX_TOKENS"]
        budgets = [initial, 8192] if initial == 4096 else [8192]
        if prior_lengths:
            budgets = [8192] if initial == 4096 and len(prior_lengths) == 1 else []
        saved = {"call_id": call_id, "stage": stage, "role": role, "prompt": prompt,
                 "initial_config": config.copy(), "attempts": attempts, "status": "pending"}
        for budget in budgets:
            config["max_output_tokens"] = budget
            slot = self.limiter.acquire()
            started = time.monotonic()
            attempt = {"started_at": now(), "config": config.copy()}
            native_path = getattr(self.model, "records_path", None)
            if native_path is not None:
                attempt["native_log_offset"] = Path(native_path).stat().st_size if Path(native_path).exists() else 0
            attempts.append(attempt)
            write_json(path, saved)  # Durable intent precedes the native request journal.
            try:
                response = self.model.generate_content(prompt, generation_config=config)
                reason = response.candidates[0].finish_reason.name
                text = response.text if response.candidates[0].content.parts else ""
                attempt.update(finish_reason=reason, text=text,
                               native_record_id=response.to_dict().get("_openrouter", {}).get("archive_record_id"))
                if reason == "STOP" and text.strip():
                    saved.update(status="complete", text=text)
                self.limiter.record_success(slot)
            except Exception as exc:
                # Native transport exceptions are sanitized; never log exception internals.
                attempt.update(error_type=type(exc).__name__, error=str(exc),
                               native_record_id=getattr(exc, "record_id", None))
                if getattr(exc, "status_code", None) == 429:
                    from agent.core.vertex_rate_limit import retry_after_seconds
                    self.limiter.record_rate_limit(retry_after_seconds(exc))
                saved.update(status="stopped_provider_error", error_type=type(exc).__name__)
                raise
            finally:
                attempt["elapsed_seconds"] = time.monotonic() - started
                write_json(path, saved)
            if reason == "STOP" and text.strip():
                return text
            if reason != "MAX_TOKENS":
                saved.update(status="stopped_invalid_completion")
                write_json(path, saved)
                raise RuntimeError(f"Invalid completion: {reason}; empty={not text.strip()}")
        saved.update(status="stopped_output_limit")
        write_json(path, saved)
        raise RuntimeError("Output incomplete after the prespecified output-budget recovery")


def stores(patient_id):
    base = RUN / patient_id
    return {kind: EvidenceMemory(JsonlMemoryStore(base / kind)) for kind in ("raw", "structured")}


def prepare_session(patient_id, index):
    verify()
    sessions = read_json(ROOT / "corpus" / f"{patient_id}.json")["sessions"]
    session = sessions[index]
    path = RUN / patient_id / "sessions" / f"{session['session_id']}.json"
    if path.exists() and read_json(path).get("status") == "complete":
        event(stage="session_cached", patient_id=patient_id, session=index + 1)
        return
    prior = ""
    if index:
        previous = read_json(path.parent / f"{sessions[index - 1]['session_id']}.json")
        assert previous["status"] == "complete"
        prior = previous["summary"]
    memory = stores(patient_id)
    for turn in session["turns"]:
        for store in memory.values():
            store.record_turn(patient_id=patient_id, therapist_id=THERAPIST_ID,
                              session_id=session["session_id"], **turn)
    client = Client()
    context = f"{patient_id}/{session['session_id']}"
    summary = client.generate(summary_prompt(prior, session), role="summary", stage=context + "/summary")
    clipped = prefix_sentences(summary, 2000)
    result = {"patient_id": patient_id, "session_id": session["session_id"], "status": "preparing",
              "summary": clipped, "summary_raw": summary, "summary_clipped": clipped != summary,
              "extraction_batches": [], "extraction_failure": None}
    # Already validated batches persist. Reopening cannot duplicate them.
    while True:
        def generate(prompt):
            return client.generate(prompt, role="extraction", stage=context + "/extraction")
        try:
            batch = memory["structured"].consolidate_session(
                patient_id=patient_id, therapist_id=THERAPIST_ID, session_id=session["session_id"],
                generate=generate)
            if batch is None:
                break
            result["extraction_batches"].append({"id": batch["id"], "facts": len(batch["facts"])})
        except MemoryExtractionError as exc:
            result["extraction_failure"] = str(exc)
            break
    result["extraction_batches"] = [{"id": r["id"], "facts": len(r["facts"])}
                                    for r in memory["structured"].store.iter_records(patient_id, THERAPIST_ID)
                                    if r["type"] == "fact_batch" and r["session_id"] == session["session_id"]]
    result.update(status="complete", completed_at=now(),
                  current_facts=len(memory["structured"].current_facts(patient_id, THERAPIST_ID)))
    write_json(path, result)
    event(stage="session_complete", patient_id=patient_id, session=index + 1,
          current_facts=result["current_facts"], extraction_failure=result["extraction_failure"])


class Encoder:
    def __init__(self, model=None):
        if model is None:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2", revision=ENCODER_REVISION,
                                        device="cpu", local_files_only=True)
        self.model = model
        self.cache = {}
        self.calls = 0
        self.failures = []

    def __call__(self, texts):
        self.calls += 1
        missing = list(dict.fromkeys(t for t in texts if t not in self.cache))
        if missing:
            try:
                values = self.model.encode(missing, show_progress_bar=False, convert_to_numpy=True)
                self.cache.update(zip(missing, values))
            except Exception as exc:
                self.failures.append(type(exc).__name__)
                raise
        return [self.cache[t] for t in texts]


def query_patient(patient_id):
    verify()
    sessions = read_json(ROOT / "corpus" / f"{patient_id}.json")["sessions"]
    last = read_json(RUN / patient_id / "sessions" / f"{sessions[-1]['session_id']}.json")
    assert last["status"] == "complete"
    questions = {q["probe_id"]: q for q in read_json(ROOT / "questions.json")[patient_id]}
    narrative, leaves = narrative_from_profile(ROOT / "frozen/profiles" / f"{patient_id}.yaml")
    write_json(RUN / patient_id / "profile-parity.json", {"narrative": narrative, "leaves": leaves})
    memory, client, encoders, encoder_model = stores(patient_id), Client(), {}, None
    for job in read_json(ROOT / "schedule.json")["queries"][patient_id]:
        arm, probe_id = job["arm"], job["probe_id"]
        path = RUN / patient_id / "answers" / f"{arm}__{probe_id}.json"
        if path.exists():
            assert read_json(path)["status"] == "complete"
            continue
        question = questions[probe_id]["question"]
        kind = arm.rsplit("_", 1)[0]
        encoder = None
        if kind in {"raw", "structured"}:
            if arm not in encoders:
                cpu_start, wall_start = time.process_time(), time.monotonic()
                encoders[arm] = Encoder(encoder_model)
                if encoder_model is None:
                    write_json(RUN / patient_id / "encoder-initialization.json", {
                        "cpu_seconds": time.process_time() - cpu_start,
                        "wall_seconds": time.monotonic() - wall_start,
                        "allocation": "Shared model load; charge once to each deployed retrieval configuration. Vector caches are separate per arm."})
                    encoder_model = encoders[arm].model
            encoder = encoders[arm]
        cpu, start = time.process_time(), time.monotonic()
        failures_before = len(encoder.failures) if encoder else 0
        context, metadata = assemble_context(arm, sessions, last["summary"], memory.get(kind),
                                            patient_id=patient_id, question=question,
                                            embed=encoder if kind in {"raw", "structured"} else None)
        metadata.update(retrieval_cpu_seconds=time.process_time() - cpu,
                        context_wall_seconds=time.monotonic() - start,
                        encoder_failures=(encoder.failures[failures_before:] if encoder else []))
        prompt = answer_prompt(narrative, context, question)
        start = time.monotonic()
        response = client.generate(prompt, role="answer", stage=f"{patient_id}/{arm}/{probe_id}")
        write_json(path, {**job, "question": question, "category": questions[probe_id]["category"],
                         "status": "complete", "completed_at": now(), "response": response,
                         "prompt": prompt, "context": context, "context_metadata": metadata,
                         "profile_sha256": file_sha(ROOT / "frozen/profiles" / f"{patient_id}.yaml"),
                         "elapsed_seconds": time.monotonic() - start})
        event(stage="answer_complete", **job)


def run(resume=False):
    verify()
    RUN.mkdir(exist_ok=True)
    status_path = RUN / "status.json"
    if status_path.exists():
        prior = read_json(status_path)
        if prior["status"] == "complete":
            return
        if not resume:
            raise RuntimeError("Previous run exists; explicit user-authorized resume is required")
    event(stage="authorized_resume" if resume else "start", pid=os.getpid())
    schedule = read_json(ROOT / "schedule.json")
    tasks = [(pid, "prepare", index) for pid in schedule["patients"] for index in range(11)]
    # Query each patient immediately after their preparation; fixed beforehand.
    tasks = [job for pid in schedule["patients"]
             for job in ([(pid, "prepare", index) for index in range(11)] + [(pid, "query", None)])]
    for pid, stage, index in tasks:
        command = [sys.executable, str(Path(__file__).resolve()), stage, "--patient", pid]
        if index is not None:
            command += ["--session-index", str(index)]
        status = {"status": "running", "patient_id": pid, "stage": stage,
                  "session_index": index, "updated_at": now(), "controller_pid": os.getpid()}
        write_json(status_path, status)
        # Queries run as one fresh process with individual durable checkpoints.
        # 56 answers can take longer than one 20-minute session; fixed cap is 1 hour.
        timeout = 1200 if stage == "prepare" else 3600
        try:
            completed = subprocess.run(command, timeout=timeout, check=False)
        except subprocess.TimeoutExpired:
            write_json(status_path, {**status, "status": "stopped_timeout", "updated_at": now()})
            event(stage="stopped_timeout", patient_id=pid, timeout_seconds=timeout)
            return 2
        if completed.returncode:
            write_json(status_path, {**status, "status": "stopped", "exit_code": completed.returncode,
                                     "updated_at": now()})
            event(stage="stopped", patient_id=pid, child_exit_code=completed.returncode)
            return completed.returncode
    write_json(status_path, {"status": "complete", "updated_at": now()})
    event(stage="complete")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["freeze", "verify", "run", "prepare", "query"])
    parser.add_argument("--resume-authorized", action="store_true")
    parser.add_argument("--patient", choices=PATIENTS)
    parser.add_argument("--session-index", type=int)
    args = parser.parse_args()
    try:
        if args.action == "freeze":
            freeze()
        elif args.action == "verify":
            verify()
        elif args.action == "run":
            return run(args.resume_authorized)
        elif args.action == "prepare":
            prepare_session(args.patient, args.session_index)
        else:
            query_patient(args.patient)
    except Exception as exc:
        event(stage="worker_stopped", error_type=type(exc).__name__, error=str(exc),
              patient_id=args.patient, action=args.action)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
