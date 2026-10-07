"""Read-only source scoring, native accounting and condition-blinded review export."""
from collections import Counter, defaultdict
import json
from pathlib import Path
import random

from benchmark import ROOT, RUN, read_json, write_json
from contexts import ARMS, sha, strict_score


def main():
    analysis = ROOT / "analysis"
    gold = {(case["patient_id"], p["probe_id"]): p
            for case in read_json(ROOT / "corpus/gold.json")["trajectories"] for p in case["probes"]}
    scores, blind, key = [], [], {}
    totals = {arm: {"complete": 0, "strict_pass": 0, "semantic_review_needed": 0} for arm in ARMS}
    for path in sorted(RUN.glob("*/answers/*.json")):
        row = read_json(path)
        probe = gold[row["patient_id"], row["probe_id"]]
        score = strict_score(row["response"], probe)
        review_id = sha(["blinded-memory-20260928", str(path.relative_to(ROOT))])[:20]
        key[review_id] = str(path.relative_to(ROOT))
        item = {k: row[k] for k in ("patient_id", "arm", "probe_id", "category", "response")}
        item.update(score=score, review_id=review_id,
                    memory_estimated_tokens=row["context_metadata"]["estimated_tokens"])
        scores.append(item)
        totals[row["arm"]]["complete"] += 1
        totals[row["arm"]]["strict_pass"] += int(score["strict_pass"])
        totals[row["arm"]]["semantic_review_needed"] += int(score["semantic_review"])
        blind.append({"review_id": review_id, "question": probe["question"],
                      "response": row["response"], "gold": probe,
                      "source_dialogue_path": f"corpus/{row['patient_id']}.json"})
    random.Random(90282026).shuffle(blind)
    requests, native_responses, errors = [], [], []
    if (RUN / "native.jsonl").exists():
        for line in (RUN / "native.jsonl").read_text().splitlines():
            row = json.loads(line)
            if row["event"] == "request":
                requests.append(row)
            elif row["event"] == "response":
                native_responses.append(row)
            else:
                errors.append(row)
    costs = defaultdict(lambda: {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0,
                                 "reported_usd": 0.0, "missing_cost_calls": 0})
    records_to_stage = {}
    for path in (RUN / "calls").glob("*.json"):
        call = read_json(path)
        for attempt in call["attempts"]:
            records_to_stage[attempt.get("native_record_id")] = (call["role"], call["stage"])
    for record in native_responses:
        role, stage = records_to_stage.get(record["record_id"], ("unmatched", "unmatched"))
        condition = stage.split("/")[1] if role == "answer" else role
        group = costs[condition]
        usage = record["response"].get("usage", {})
        group["calls"] += 1
        group["prompt_tokens"] += usage.get("prompt_tokens", 0)
        group["completion_tokens"] += usage.get("completion_tokens", 0)
        if usage.get("cost") is None:
            group["missing_cost_calls"] += 1
        else:
            group["reported_usd"] += usage["cost"]
    prep = [read_json(p) for p in sorted(RUN.glob("*/sessions/*.json"))]
    result = {"planned_answers": 280, "completed_answers": len(scores), "strict_by_arm": totals,
              "scores": scores, "native_requests": len(requests), "native_responses": len(native_responses),
              "native_errors": len(errors), "costs_by_stage": dict(costs),
              "prepared_sessions": len(prep),
              "sessions_with_extraction_failure": [f"{p['patient_id']}/{p['session_id']}" for p in prep if p["extraction_failure"]],
              "note": "Strict scores are not the final semantic assessment. Five paired synthetic trajectories; no clinical inference."}
    write_json(analysis / "results.json", result)
    write_json(analysis / "blinded-review.json", blind)
    write_json(analysis / "blinding-key.json", key)
    print(json.dumps({k: result[k] for k in ("completed_answers", "prepared_sessions", "native_requests", "native_errors")}))


if __name__ == "__main__":
    main()
