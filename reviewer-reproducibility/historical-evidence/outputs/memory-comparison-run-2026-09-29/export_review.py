"""Offline, allowlisted review export. Imports no runner, provider, or SDK.

Give each isolated evaluator ONLY one evaluator_* directory. The sibling private
mapping and source manifest are for the analyst and must not accompany it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

HERE = Path(__file__).resolve().parent
DEFAULT_PLAN = HERE.parent / "memory-comparison-plan-2026-09-28"
SCHEMA_VERSION = 1


class ExportError(ValueError):
    """Input integrity failed; no rating should be based on this export."""


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ExportError(message)


class Snapshot:
    def __init__(self):
        self.files = {}

    def read(self, path, *, optional=False):
        path = Path(path).resolve()
        if path not in self.files:
            if optional and not path.exists():
                self.files[path] = None
            else:
                require(path.is_file(), f"Missing input file: {path.name}")
                self.files[path] = path.read_bytes()
        return self.files[path]

    def json(self, path):
        try:
            return json.loads(self.read(path))
        except (ValueError, UnicodeError) as exc:
            raise ExportError(f"Invalid JSON: {Path(path).name}") from exc

    def check_unchanged(self):
        for path, content in self.files.items():
            require((not path.exists()) if content is None else
                    path.is_file() and path.read_bytes() == content,
                    f"Input changed during export: {path.name}; export from a stable checkpoint")


def design_path(plan, relative):
    require(isinstance(relative, str), "Design reference must be a relative string")
    path = Path(relative)
    require(not path.is_absolute() and ".." not in path.parts, "Unsafe design reference")
    candidate = plan / path if path.parts[:1] == ("design",) else plan / "design" / path
    candidate = candidate.resolve()
    require(candidate.is_relative_to(plan / "design"), "Design reference escapes the design directory")
    return candidate


def scenario_turns(scenario, row):
    turns = {}
    sessions = scenario.get("sessions", [])
    require(len(sessions) == row["sessions"], "Scenario session count differs from matrix")
    for index, session in enumerate(sessions, 1):
        require(session.get("session_index") == index, "Unordered scenario sessions")
        for position, turn in enumerate(session["turns"], 1):
            turn_id = turn.get("turn_id")
            require(turn_id == f"s{index:02d}t{position:02d}" and turn_id not in turns,
                    "Invalid or repeated scenario turn")
            require(isinstance(turn.get("text"), str), "Scenario message is not text")
            turns[turn_id] = {"text": turn["text"], "session": index, "exchange": position,
                              "index": len(turns) + 1}
    require(len(turns) == row["therapist_turns"], "Scenario turn count differs from matrix")
    return turns


def accepted_turns(snapshot, path, row, turns):
    data = snapshot.read(path, optional=True)
    if data is None:
        return {}
    require(not data or data.endswith(b"\n"), "Ledger has an incomplete final line")
    accepted = {}
    for index, line in enumerate(data.splitlines(), 1):
        try:
            entry = json.loads(line)
        except (ValueError, UnicodeError) as exc:
            raise ExportError("Invalid accepted-turn ledger line") from exc
        require(isinstance(entry, dict), "Ledger record is not an object")
        turn_id = entry.get("turn_id")
        require(entry.get("run_id") == row["run_id"] and entry.get("status") == "accepted",
                "Ledger identity or durable acceptance status differs")
        require(turn_id in turns and turn_id not in accepted, "Unknown or duplicate accepted turn")
        planned = turns[turn_id]
        require(entry.get("turn_index") == index == planned["index"] and
                entry.get("session_index") == planned["session"], "Ledger is not a chronological prefix")
        require(entry.get("therapist_text") == planned["text"],
                "Original therapist message differs from the frozen scenario")
        require(isinstance(entry.get("patient_text"), str) and entry["patient_text"].strip(),
                "Accepted record has no visible answer; record its absence in probe-outcomes.json")
        flags = entry.get("safety_flags", [])
        require(isinstance(flags, list) and all(isinstance(v, str) for v in flags), "Invalid safety flags")
        require(isinstance(entry.get("application_guard_failure", False), bool), "Invalid guard-failure marker")
        accepted[turn_id] = entry
    return accepted


def outcomes(snapshot, path, turns, accepted):
    data = snapshot.read(path, optional=True)
    if data is None:
        return {}
    try:
        value = json.loads(data)
    except (ValueError, UnicodeError) as exc:
        raise ExportError("Invalid probe-outcomes sidecar") from exc
    require(isinstance(value, dict) and isinstance(value.get("outcomes"), list), "Invalid outcomes schema")
    result = {}
    for item in value["outcomes"]:
        require(isinstance(item, dict), "Invalid outcome record")
        turn_id, status = item.get("turn_id"), item.get("status")
        require(turn_id in turns and turn_id not in result, "Unknown or duplicate outcome turn")
        require(status in {"not_observed", "application_failure"}, "Unknown availability status")
        require(not (turn_id in accepted and status == "not_observed"),
                "Sidecar says not observed for an archived answer")
        result[turn_id] = status
    return result


def gold_for_card(probe, turns):
    """Never copy gold wholesale: filenames and evaluation metadata stay private."""
    turn_id = probe["turn_id"]
    expected = probe.get("expected")
    requested = probe.get("requested_fields")
    require(expected is None or isinstance(expected, dict), "Expected fields must be an object or null")
    require(isinstance(requested, dict) and all(isinstance(k, str) and isinstance(v, str)
                                               for k, v in requested.items()), "Missing requested-field labels")
    source_ids = probe.get("source_turns", [])
    require(isinstance(source_ids, list) and len(source_ids) == len(set(source_ids)), "Invalid source list")
    sources, labels = [], {}
    for source_id in source_ids:
        require(source_id in turns and turns[source_id]["index"] < turns[turn_id]["index"],
                "Gold source must precede the probe")
        source = turns[source_id]
        label = f"source_{len(sources) + 1}"
        labels[source_id] = label
        sources.append({"id": label, "kind": "therapist_statement", "session": source["session"],
                        "exchange": source["exchange"], "text": source["text"]})
    if probe.get("profile_source"):
        require(isinstance(expected, dict), "Profile evidence requires named expected fields")
        for field, value in expected.items():
            sources.append({"id": f"source_{len(sources) + 1}", "kind": "canonical_profile_fact",
                            "field": field, "value": value})
    result = {"expected": expected, "requested_fields": requested, "sources": sources}
    if "field_sources" in probe:
        require(isinstance(probe["field_sources"], dict), "Invalid field-source map")
        converted = {}
        for field, ids in probe["field_sources"].items():
            require(field in requested and isinstance(ids, list) and all(i in labels for i in ids),
                    "Field source is outside the probe source list")
            converted[field] = [labels[i] for i in ids]
        result["field_sources"] = converted
    if "criterion" in probe:
        require(isinstance(probe["criterion"], str), "Criterion must be text")
        result["criterion"] = probe["criterion"]
    return result


PACKET_README = """# Semantic review packet

Use only cards.json and SCORING.md in this directory. Judge the original visible
answer against the supplied question, expected fields and source facts. Preserve
the opaque ID in your output. Do not rewrite the answer or infer a condition.
No scores have been assigned by this exporter. Record your evaluator model,
context and actual input hashes separately when submitting your judgments.

Missing answers are tracked separately by the analyst; no fabricated answer or
placeholder is supplied for semantic rating. Source statements have authority
under the frozen rubric; an earlier patient answer never rewrites the gold.
Condition metadata are withheld, but response style/content may still reveal
the system. This is not evidence of independent clinical assessment or perfect
blinding. Keep your judgments separate from other evaluators until adjudication.
"""


def export_review(plan_dir, runtime_dir, output_dir):
    plan, runtime, destination = map(lambda p: Path(p).resolve(), (plan_dir, runtime_dir, output_dir))
    require(not destination.exists(), "Export destination already exists; use a new snapshot directory")
    require(not destination.is_relative_to(plan) and not destination.is_relative_to(runtime),
            "Export must be outside the immutable plan and runtime inputs")
    snapshot = Snapshot()
    plan_manifest = snapshot.json(plan / "package-manifest.json")
    matrix = snapshot.json(plan / "design/run-matrix.json")
    scoring = snapshot.read(plan / "SCORING.md")
    snapshot.read(plan / "PROTOCOL.md")
    rows = matrix.get("runs")
    require(isinstance(rows, list) and rows, "Matrix has no planned runs")
    require(len({r["run_id"] for r in rows}) == len(rows), "Duplicate matrix run IDs")
    cards, missing, mapping = [], [], []
    accepted_count, ledger_count, planned_count = 0, 0, 0
    for row in rows:
        run_id = row["run_id"]
        require(isinstance(run_id, str) and re.fullmatch(r"[A-Za-z0-9_-]+", run_id), "Unsafe run ID")
        scenario = snapshot.json(design_path(plan, row["scenario_path"]))
        gold = snapshot.json(design_path(plan, row["evaluator_only_gold_path"]))
        turns = scenario_turns(scenario, row)
        probes = gold.get("probes")
        require(isinstance(probes, list) and len(probes) == row["probes"], "Gold count differs from matrix")
        require(len({p["turn_id"] for p in probes}) == len(probes), "Duplicate gold probe")
        ledger_path = runtime / run_id / "accepted-turns.jsonl"
        require(ledger_path.resolve().is_relative_to(runtime), "Ledger escapes the runtime directory")
        accepted = accepted_turns(snapshot, ledger_path, row, turns)
        availability = outcomes(snapshot, runtime / run_id / "probe-outcomes.json", turns, accepted)
        accepted_count += len(accepted)
        ledger_count += int(snapshot.files[ledger_path.resolve()] is not None)
        for probe in probes:
            turn_id = probe["turn_id"]
            require(turn_id in turns, "Gold refers to a missing scenario turn")
            public_gold = gold_for_card(probe, turns)
            review_id = uuid4().hex
            entry = accepted.get(turn_id)
            private = {"id": review_id, "run_id": run_id, "pair_id": row.get("pair_id"),
                       "arm": row["arm"], "profile_id": row["profile_id"], "repetition": row["repetition"],
                       "turn_id": turn_id, "category": probe.get("category"),
                       "turn_index": turns[turn_id]["index"], "answer_available": entry is not None,
                       "declared_outcome": availability.get(turn_id)}
            if entry is not None:
                cards.append({"id": review_id, "question": turns[turn_id]["text"],
                              "response": entry["patient_text"], "gold": public_gold})
                private.update(safety_flags=entry.get("safety_flags", []),
                               application_guard_failure=entry.get("application_guard_failure", False))
            else:
                missing.append({"id": review_id, "availability": availability.get(turn_id, "not_observed")})
                private["missing_cause_recorded"] = turn_id in availability
            mapping.append(private)
            planned_count += 1
    # Check only the plan inputs actually consumed; never alter or refreeze them.
    for path, data in snapshot.files.items():
        if path.is_relative_to(plan) and path != plan / "package-manifest.json":
            expected = plan_manifest.get("files", {}).get(str(path.relative_to(plan)))
            require(expected == sha(data), f"Frozen plan input mismatch: {path.name}")
    snapshot.check_unchanged()
    random.SystemRandom().shuffle(cards)
    random.SystemRandom().shuffle(missing)
    packet_files = {"cards.json": encoded({"schema_version": SCHEMA_VERSION, "cards": cards}),
                    "SCORING.md": scoring, "README.md": PACKET_README.encode("utf-8")}
    packet_manifest = {"schema_version": SCHEMA_VERSION, "status": "semantic_review_pending",
                       "card_count": len(cards), "files": {name: sha(data) for name, data in packet_files.items()}}
    packet_files["manifest.json"] = encoded(packet_manifest)
    private_data = {"schema_version": SCHEMA_VERSION, "status": "semantic_review_pending", "records": mapping,
                    "warning": "Analyst-only key. Never provide this file to a masked evaluator."}
    missing_data = {"schema_version": SCHEMA_VERSION, "records": missing,
                    "note": "No answer to rate. not_observed does not infer a service cause; no semantic score assigned."}
    output_files = {f"evaluator_{label}/{name}": data for label in ("a", "b") for name, data in packet_files.items()}
    output_files["private/mapping.json"] = encoded(private_data)
    output_files["missing.json"] = encoded(missing_data)
    input_hashes = {}
    for path, data in snapshot.files.items():
        root, prefix = (plan, "plan") if path.is_relative_to(plan) else (runtime, "runtime")
        input_hashes[f"{prefix}/{path.relative_to(root)}"] = None if data is None else sha(data)
    manifest = {"schema_version": SCHEMA_VERSION, "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "semantic_review_pending", "live_calls": 0, "scores_assigned": 0,
                "input_counts": {"planned_runs": len(rows), "ledgers_present": ledger_count,
                                 "durable_turns": accepted_count, "planned_probes": planned_count,
                                 "exported_answers": len(cards), "missing_answers": len(missing)},
                "input_sha256": input_hashes, "exporter_sha256": sha(Path(__file__).read_bytes()),
                "output_sha256": {name: sha(data) for name, data in output_files.items()},
                "scope": "Metadata-masked automated semantic review; no clinical or perfect-blinding claim.",
                "distribution": "Give each isolated evaluator only its evaluator_* directory, never this root manifest or private/."}
    output_files["manifest.json"] = encoded(manifest)
    destination.mkdir(parents=True, exist_ok=False)
    for name, data in output_files.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as stream:
            stream.write(data)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--runtime", type=Path, default=HERE / "runtime")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = export_review(args.plan, args.runtime, args.output)
    except (ExportError, OSError) as exc:
        parser.exit(2, f"Export refused: {exc}\n")
    print(json.dumps({"status": result["status"], **result["input_counts"]}))


if __name__ == "__main__":
    main()
