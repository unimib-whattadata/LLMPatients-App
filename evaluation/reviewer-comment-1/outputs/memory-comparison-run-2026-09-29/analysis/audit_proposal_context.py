"""Offline source-to-prompt trace of all 30 appointment probes after scoring.

This records literal temporal markers, not an additional semantic score or a
causal ablation. Original model requests, sources and ratings are read only.
"""
import hashlib
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TIME = re.compile(r"\b0?9\s*[:.]\s*30\b|\bnine[-\s]+thirty\b|\bhalf[-\s]+past[-\s]+nine\b", re.I)


def read(path):
    return json.loads(path.read_text())


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines()]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    inputs = {"semantic-results.json": sha(HERE / "semantic-results.json")}
    evidence = []
    for rating in read(HERE / "semantic-results.json")["ratings"]:
        if rating["probe_type"] != "correction_and_proposal":
            continue
        run = ROOT / "runtime" / rating["run_id"]
        directory = run / "sessions/session_11"
        events_path, wire_path = directory / "generation-events.jsonl", directory / "openrouter-api-records.jsonl"
        events, wire = rows(events_path), rows(wire_path)
        request = [r for r in events if r.get("event") == "request" and r.get("stage") == "generate_response" and r.get("turn_id") == "s11t02"]
        assert len(request) == 1
        request = request[0]
        outcomes = [r for r in events if r.get("event") == "outcome" and r.get("logical_id") == request["logical_id"] and r.get("accepted")]
        assert len(outcomes) == 1
        record_id = outcomes[0]["native_record_id"]
        native = next(r for r in wire if r.get("event") == "request" and r["record_id"] == record_id)
        prompt = native["request"]["messages"][0]["content"]
        assert prompt == request["prompt"]
        for path in (events_path, wire_path, run / "accepted-turns.jsonl"):
            inputs[str(path.relative_to(ROOT))] = sha(path)
        source = next(r for r in rows(run / "accepted-turns.jsonl") if r["turn_id"] == "s06t02")
        assert "Saturday" in source["therapist_text"] and TIME.search(source["therapist_text"])
        facts = []
        for path in (run / "memory").glob("*.jsonl"):
            inputs[str(path.relative_to(ROOT))] = sha(path)
            for batch in rows(path):
                if batch.get("type") != "fact_batch" or batch.get("session_id") != "comparison_s06":
                    continue
                assert batch["created_at"] < request["timestamp"]
                for fact in batch["facts"]:
                    if fact.get("speaker") == "therapist" and TIME.search(json.dumps(fact, ensure_ascii=False)):
                        facts.append({"batch_created_at":batch["created_at"], "fact":fact})
        matches = list(TIME.finditer(prompt))
        evidence.append({"run_id":rating["run_id"], "arm":rating["arm"], "turn_id":"s11t02",
            "rating":rating["category"], "primary_success":rating["end_to_end_success"],
            "request_timestamp":request["timestamp"], "native_record_id":record_id,
            "source_turn_id":"s06t02", "therapist_source":source["therapist_text"],
            "validated_stored_therapist_facts_before_probe":facts,
            "prompt_has_time_marker":bool(matches), "prompt_has_saturday": "saturday" in prompt.lower(),
            "prompt_time_excerpts":[prompt[max(0,m.start()-170):m.end()+170] for m in matches],
            "prompt_sha256":hashlib.sha256(prompt.encode()).hexdigest()})
    assert len(evidence) == 30
    structured = [row for row in evidence if row["arm"] == "structured_common_profile"]
    failed = [row for row in structured if not row["primary_success"]]
    summary = {"structured_probes":len(structured), "structured_failures":len(failed),
        "failed_with_validated_stored_fact":sum(bool(row["validated_stored_therapist_facts_before_probe"]) for row in failed),
        "failed_with_time_in_transmitted_prompt":sum(row["prompt_has_time_marker"] for row in failed),
        "successful_structured_with_time_in_prompt":sum(row["primary_success"] and row["prompt_has_time_marker"] for row in structured),
        "flat_with_time_in_prompt":sum(row["arm"] == "flat_full_history" and row["prompt_has_time_marker"] for row in evidence)}
    output = {"status":"completed_literal_source_to_prompt_trace", "scope":"All 30 appointment probes; semantic ratings are unchanged",
        "limitations":["Literal markers and source excerpts are documented; this is not a new semantic score.",
            "Missing transmitted data localizes a context-selection/rendering issue but does not isolate ranking, versioning or budget causes."],
        "summary":summary, "evidence":evidence, "input_sha256":inputs, "script_sha256":sha(Path(__file__))}
    with (HERE / "proposal-context-audit.json").open("x") as stream:
        json.dump(output, stream, ensure_ascii=False, indent=2); stream.write("\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
