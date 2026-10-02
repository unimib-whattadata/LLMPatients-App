"""Replay a captured extraction locally without calling any model or original store."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PREVIOUS = ROOT.parent / "memory-benchmark-2026-09-28"
AGENT = Path("/Users/marco/Sites/LLMPatients-Agent")
sys.path.insert(0, str(AGENT))
from agent.core.factual_memory import EvidenceMemory, MemoryExtractionError
from agent.core.memory_store import JsonlMemoryStore


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    base = PREVIOUS / "integration/runtime"
    memory_path = next((base / "memory").glob("*.jsonl"))
    generation_path = base / "sessions/session_01/generation-events.jsonl"
    session_path = base / "sessions/session_01/session.json"
    originals = {str(p.relative_to(PREVIOUS)): digest(p)
                 for p in (memory_path, generation_path, session_path)}
    events = [json.loads(line) for line in generation_path.read_text().splitlines() if line]
    request = next(r for r in events if r["stage"] == "_generate_factual_memory" and r["event"] == "request")
    response = next(r for r in events if r["stage"] == "_generate_factual_memory" and r["event"] == "outcome")
    session = json.loads(session_path.read_text())
    original_records = [json.loads(line) for line in memory_path.read_text().splitlines() if line]
    prompts = []

    def captured_generation(prompt):
        prompts.append(prompt)
        assert prompt == request["prompt"], "Replay prompt changed"
        return response["text"]

    with tempfile.TemporaryDirectory() as directory:
        store = JsonlMemoryStore(Path(directory))
        for record in original_records:
            store.append(record)
        memory = EvidenceMemory(store)
        options = dict(patient_id=session["patient_id"], therapist_id=session["therapist_id"],
                       session_id=session["session_id"], generate=captured_generation)
        path = store.file_path(session["patient_id"], session["therapist_id"])
        before = path.read_bytes()
        try:
            memory.consolidate_session(**options)
        except MemoryExtractionError as exc:
            strict_error = str(exc)
        else:
            raise AssertionError("Strict mode must still reject the original extraction")
        assert path.read_bytes() == before
        batch = memory.consolidate_session(**options, invalid_policy="quarantine")
        assert len(batch["facts"]) == 12
        assert [r["index"] + 1 for r in batch["rejected_facts"]] == [2, 5, 11]
        assert batch["extraction_response"] == response["text"]
        reopened = EvidenceMemory(JsonlMemoryStore(Path(directory)))
        assert reopened.consolidate_session(**options, invalid_policy="quarantine") is None
        assert len(prompts) == 2
        status = reopened.consolidation_status(session["patient_id"], session["therapist_id"], session["session_id"])
        assert status == {"status": "partial", "source_turns": 5, "processed_sources": 5,
                          "validated_facts": 12, "rejected_facts": 3, "invalid_batches": 0}
        raw = [r for r in store.iter_records(session["patient_id"], session["therapist_id"])
               if r["type"] == "conversation_turn"]
        assert raw == [r for r in original_records if r["type"] == "conversation_turn"]
        report = {
            "mode": "offline replay of already observed failure, not fresh longitudinal evidence",
            "model_calls": 0, "prompt_byte_identical": all(p == request["prompt"] for p in prompts),
            "original_response_unmodified": True, "strict_mode_error": strict_error,
            "quarantine_status": status, "rejected_fact_ordinals": [2, 5, 11],
            "rejections": [{"index": r["index"], "reason": r["reason"]} for r in batch["rejected_facts"]],
            "raw_sources_unchanged": True, "reopened_attempt_skipped": True,
            "validator_sha256": digest(AGENT / "agent/core/factual_memory.py"),
            "original_files": originals,
        }
    assert all(digest(PREVIOUS / p) == expected for p, expected in originals.items())
    (ROOT / "analysis/previous-extraction-replay.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"validated_facts": 12, "quarantined_facts": 3, "sources": 5,
                      "model_calls": 0, "prompt_identical": True, "idempotent_after_restart": True}))


if __name__ == "__main__":
    main()
