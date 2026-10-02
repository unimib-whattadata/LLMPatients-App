"""Describe measured resources from saved outcomes without new inference."""
from collections import Counter, defaultdict
import json
import hashlib
import math
from pathlib import Path
import statistics

ROOT = Path(__file__).resolve().parents[1]


def describe(values):
    values = sorted(values)
    if not values:
        return {"n": 0}
    return {"n": len(values), "sum": sum(values), "mean": statistics.mean(values),
            "median": statistics.median(values), "min": values[0], "max": values[-1],
            "p95_nearest_rank": values[math.ceil(.95 * len(values)) - 1]}


def collect():
    measures = defaultdict(lambda: defaultdict(list))
    for path in sorted((ROOT / "run").glob("*/answers/*.json")):
        row = json.loads(path.read_text())
        meta = row["context_metadata"]
        group = measures[row["arm"]]
        group["memory_estimated_tokens"].append(meta["estimated_tokens"])
        group["answer_elapsed_seconds"].append(row["elapsed_seconds"])
        for key in ("context_wall_seconds", "retrieval_cpu_seconds"):
            if key in meta:
                group[key].append(meta[key])
        group["encoder_failure_count"].append(len(meta.get("encoder_failures", [])))
    encoder, seen_encoder = [], set()
    # The frozen query worker creates a new process after an authorized resume.
    # Stopped snapshots preserve an earlier initialization record before the
    # worker replaces its per-patient file. Count each observed record once.
    encoder_paths = sorted((ROOT / "analysis/snapshots").glob("*/run/*/encoder-initialization.json"))
    encoder_paths += sorted((ROOT / "run").glob("*/encoder-initialization.json"))
    for path in encoder_paths:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        key = path.parent.name, digest
        if key in seen_encoder:
            continue
        seen_encoder.add(key)
        encoder.append({"patient_id": path.parent.name, "source_path": str(path.relative_to(ROOT)),
                        "record_sha256": digest, **json.loads(path.read_text())})
    failures = Counter()
    clipped = 0
    sessions = []
    for path in sorted((ROOT / "run").glob("*/sessions/*.json")):
        row = json.loads(path.read_text())
        clipped += bool(row["summary_clipped"])
        if row["extraction_failure"]:
            failures[row["extraction_failure"]] += 1
        sessions.append({"patient_id": row["patient_id"], "session_id": row["session_id"],
                         "extraction_failure": row["extraction_failure"],
                         "accepted_batches": len(row["extraction_batches"]),
                         "current_facts": row["current_facts"]})
    return {"by_arm": {arm: {key: describe(values) for key, values in group.items()}
                       for arm, group in measures.items()},
            "encoder_initialization": encoder,
            "preparation": {"completed_sessions": len(sessions), "clipped_summaries": clipped,
                            "extraction_failure_reasons": dict(failures), "sessions": sessions},
            "interpretation": [
                "Descriptive observed durations; no inference of statistical significance.",
                "Memory token estimates exclude profile, question and instructions; they are not provider token counts.",
                "Answer elapsed is the saved logical generation duration, including admitted output-budget recovery.",
                "Context/retrieval measurements exclude encoder initialization; cache order is fixed by the schedule.",
                "Charge the shared encoder initialization once per patient to each separately deployed retrieval configuration.",
                "Observed initialization totals retain extra process loads after authorized resumes; these are restart overhead.",
                "A rejected extraction may follow accepted batches in the same session; failures are not zero-fact sessions."]}


if __name__ == "__main__":
    data = collect()
    (ROOT / "analysis/resource-usage.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"arms": len(data["by_arm"]), "sessions": data["preparation"]["completed_sessions"]}))
