"""Reconcile independent ratings and describe the prespecified paired comparison.

Offline only. No semantic judgment, provider invocation, input rewriting,
p-values, or treatment of individual probes as independent samples.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
from statistics import mean

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EXPORT = ROOT / "review/export-001"
RATINGS = ROOT / "review/ratings"
ADJUDICATION = ROOT / "review/adjudication-001"
ARMS = ("structured_common_profile", "flat_full_history")
CATEGORIES = {"complete", "appropriate_abstention", "partial", "contradictory",
              "incorrect", "unjustified_abstention"}
FIELD_STATES = {"correct", "omitted", "wrong", "ambiguous"}
SUCCESS = {"complete", "appropriate_abstention"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_new(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")


def verify_export():
    manifest = read(EXPORT / "manifest.json")
    for name, expected in manifest["output_sha256"].items():
        require(digest(EXPORT / name) == expected, "Frozen review export changed: " + name)
    require(manifest["input_counts"] == {
        "planned_runs": 30, "ledgers_present": 30, "durable_turns": 1650,
        "planned_probes": 180, "exported_answers": 180, "missing_answers": 0},
        "This analysis requires the complete planned matrix")
    for name, expected in manifest["input_sha256"].items():
        prefix, relative = name.split("/", 1)
        base = ROOT.parent / "memory-comparison-plan-2026-09-28" if prefix == "plan" else ROOT / "runtime"
        path = base / relative
        require((not path.exists()) if expected is None else digest(path) == expected,
                "Export input changed: " + name)
    cards = read(EXPORT / "evaluator_a/cards.json")["cards"]
    lookup = {card["id"]: card for card in cards}
    require(len(lookup) == len(cards) == 180, "Repeated/missing exported card")
    return cards, lookup


def validate_ratings(path, card_lookup, packet, evaluator):
    document = read(path)
    require(document.get("evaluator") == evaluator and document.get("evaluation_type") == "automated",
            "Missing evaluator provenance")
    inputs = document.get("input_sha256", {})
    for name in ("cards.json", "SCORING.md", "README.md", "manifest.json"):
        require(inputs.get(name) == digest(packet / name), "Rater input hash differs: " + name)
    ratings = document.get("ratings", [])
    lookup = {row["id"]: row for row in ratings}
    require(set(lookup) == set(card_lookup) and len(lookup) == len(ratings), "Rater ID coverage differs")
    for identifier, row in lookup.items():
        require(row.get("category") in CATEGORIES and isinstance(row.get("rationale"), str)
                and row["rationale"].strip(), "Invalid category or missing rationale")
        fields = row.get("fields", {})
        require(set(fields) == set(card_lookup[identifier]["gold"]["requested_fields"]), "Field coverage differs")
        for value in fields.values():
            require(value.get("status") in FIELD_STATES and isinstance(value.get("reason"), str)
                    and value["reason"].strip(), "Invalid field assessment")
            require(value.get("evidence") is None or isinstance(value["evidence"], str), "Invalid evidence")
        states = [value["status"] for value in fields.values()]
        if row["category"] in SUCCESS:
            require(all(state == "correct" for state in states), "Success category has a non-correct required field")
        if row["category"] == "partial":
            require("correct" in states and any(state != "correct" for state in states) and "wrong" not in states,
                    "Partial category conflicts with its field ratings")
        require(row.get("gold_issue") is None or isinstance(row["gold_issue"], str), "Invalid gold-issue field")
    return document, lookup


def judgments():
    cards, card_lookup = verify_export()
    a_doc, a = validate_ratings(RATINGS / "evaluator_a.json", card_lookup, EXPORT / "evaluator_a", "A")
    b_doc, b = validate_ratings(RATINGS / "evaluator_b.json", card_lookup, EXPORT / "evaluator_b", "B")
    return cards, card_lookup, a_doc, b_doc, a, b


def differs(a, b):
    return (a["category"] != b["category"]
            or {k:v["status"] for k,v in a["fields"].items()} != {k:v["status"] for k,v in b["fields"].items()}
            or bool(a.get("gold_issue")) or bool(b.get("gold_issue")))


def prepare_adjudication():
    cards, card_lookup, a_doc, b_doc, a, b = judgments()
    disputed = [card for card in cards if differs(a[card["id"]], b[card["id"]])]
    require(not ADJUDICATION.exists(), "Adjudication packet already exists")
    ADJUDICATION.mkdir(parents=True)
    write_new(ADJUDICATION / "cards.json", {"schema_version": 1, "cards": disputed})
    write_new(ADJUDICATION / "judgments.json", {"schema_version": 1, "disagreements": [
        {"id": card["id"], "evaluator_a": a[card["id"]], "evaluator_b": b[card["id"]]} for card in disputed]})
    shutil.copyfile(EXPORT / "evaluator_a/SCORING.md", ADJUDICATION / "SCORING.md")
    (ADJUDICATION / "README.md").write_text(
        "# Adjudication packet\n\nReview only these disputed cards and the two preserved judgments. "
        "Apply SCORING.md independently to each original visible answer and its fixed gold. "
        "No condition mapping or experiment history is supplied. Do not alter gold. "
        "Record each required field and category in the same rating schema, evaluator C. "
        "Any genuine gold defect must remain explicit. This is automated review, not human clinical assessment.\n")
    write_new(ADJUDICATION / "manifest.json", {"schema_version": 1, "card_count": len(disputed),
        "files": {name:digest(ADJUDICATION / name) for name in ("cards.json", "judgments.json", "SCORING.md", "README.md")}})
    agreement = {"planned_ratings": 180, "category_agreement": sum(a[k]["category"] == b[k]["category"] for k in a),
        "binary_success_agreement": sum((a[k]["category"] in SUCCESS) == (b[k]["category"] in SUCCESS) for k in a),
        "field_and_category_agreement": 180 - len(disputed), "adjudication_cards": len(disputed),
        "rating_sha256": {"A": digest(RATINGS / "evaluator_a.json"), "B": digest(RATINGS / "evaluator_b.json")},
        "packet_manifest_sha256": digest(ADJUDICATION / "manifest.json")}
    write_new(HERE / "agreement-before-adjudication.json", agreement)
    return agreement


def distribution(rows):
    n = len(rows)
    success = sum(row["end_to_end_success"] for row in rows)
    field_states = Counter(value["status"] for row in rows for value in row["fields"].values())
    return {"successes": success, "denominator": n, "proportion": success/n,
        "categories": dict(Counter(row["category"] for row in rows)),
        "field_statuses": dict(field_states), "field_denominator": sum(field_states.values()),
        "application_failures": sum(row["application_guard_failure"] for row in rows), "not_observed": 0}


def analyze():
    cards, card_lookup, a_doc, b_doc, a, b = judgments()
    agreement = read(HERE / "agreement-before-adjudication.json")
    require(all(digest(RATINGS / f"evaluator_{key.lower()}.json") == value for key,value in agreement["rating_sha256"].items()),
            "Independent judgments changed after comparison")
    packet = read(ADJUDICATION / "manifest.json")
    require(digest(ADJUDICATION / "manifest.json") == agreement["packet_manifest_sha256"], "Adjudication manifest changed")
    for name, value in packet["files"].items():
        require(digest(ADJUDICATION / name) == value, "Adjudication input changed")
    disputed = {card["id"]:card for card in read(ADJUDICATION / "cards.json")["cards"]}
    require(set(disputed) == {key for key in a if differs(a[key], b[key])}, "Adjudication coverage changed")
    c_doc, c = (None, {})
    if disputed:
        c_doc, c = validate_ratings(RATINGS / "adjudicator.json", disputed, ADJUDICATION, "C")
        require(c_doc["input_sha256"].get("judgments.json") == digest(ADJUDICATION / "judgments.json"), "Peer judgments differ")
    mapping = read(EXPORT / "private/mapping.json")["records"]
    require(len(mapping) == 180 and {row["id"] for row in mapping} == set(card_lookup), "Private mapping coverage differs")
    rated, runs = [], defaultdict(list)
    for mapped in mapping:
        key = mapped["id"]
        row = c[key] if key in c else a[key]
        require(not row.get("gold_issue"), "Gold defect needs a visible disposition before final scoring")
        require(mapped["answer_available"] and mapped["declared_outcome"] != "not_observed", "Unexpected missing answer")
        failure = bool(mapped["application_guard_failure"] or mapped["declared_outcome"] == "application_failure")
        record = {**mapped, "probe_type": mapped["category"], "category": row["category"],
            "fields": row["fields"], "rationale": row["rationale"], "adjudicated": key in c,
            "semantic_success": int(row["category"] in SUCCESS),
            "application_guard_failure": failure, "end_to_end_success": int(row["category"] in SUCCESS and not failure)}
        rated.append(record); runs[mapped["run_id"]].append(record)
    trajectories = []
    for run_id, rows in sorted(runs.items()):
        require(len(rows) == 6 and len({row["turn_id"] for row in rows}) == 6, "Trajectory denominator differs from six")
        trajectories.append({k:rows[0][k] for k in ("run_id", "pair_id", "profile_id", "repetition", "arm")} |
                            distribution(rows))
    require(len(trajectories) == 30, "Incomplete trajectory matrix")
    paired = defaultdict(dict)
    for row in trajectories:
        require(row["arm"] in ARMS and row["arm"] not in paired[row["pair_id"]], "Repeated or unknown arm")
        paired[row["pair_id"]][row["arm"]] = row
    require(len(paired) == 15 and all(set(p)==set(ARMS) for p in paired.values()), "Incomplete paired design")
    differences = [{"pair_id":key, "profile_id":p[ARMS[0]]["profile_id"], "repetition":p[ARMS[0]]["repetition"],
        "structured_successes":p[ARMS[0]]["successes"], "flat_successes":p[ARMS[1]]["successes"],
        "difference":(p[ARMS[0]]["successes"]-p[ARMS[1]]["successes"])/6} for key,p in sorted(paired.items())]
    by_arm = {arm:distribution([row for row in rated if row["arm"] == arm]) for arm in ARMS}
    profiles = sorted({row["profile_id"] for row in rated})
    by_profile = {profile:{arm:distribution([row for row in rated if row["profile_id"]==profile and row["arm"]==arm])
        for arm in ARMS} for profile in profiles}
    by_probe = {probe:{arm:distribution([row for row in rated if row["probe_type"]==probe and row["arm"]==arm])
        for arm in ARMS} for probe in sorted({row["probe_type"] for row in rated})}
    require(len(profiles)==5 and all(v["denominator"]==90 for v in by_arm.values()), "Unbalanced global denominator")
    for arm in ARMS:
        require(all(p[arm]["denominator"]==18 for p in by_profile.values()) and all(p[arm]["denominator"]==15 for p in by_probe.values()), "Unbalanced subgroup denominator")
        require(abs(mean(row["proportion"] for row in trajectories if row["arm"]==arm)-by_arm[arm]["proportion"])<1e-12,
                "Trajectory and count aggregates differ")
    delta = mean(row["difference"] for row in differences)
    require(abs(delta-(by_arm[ARMS[0]]["proportion"]-by_arm[ARMS[1]]["proportion"]))<1e-12, "Paired and global difference differ")
    output = {"status":"completed_automated_semantic_review", "created_at":datetime.now(timezone.utc).isoformat(),
        "analysis":"Prespecified descriptive paired trajectory analysis; no probe-independence or clinical inference",
        "by_arm":by_arm, "by_profile":by_profile, "by_probe":by_probe, "trajectories":trajectories,
        "paired_differences":differences, "mean_paired_difference":delta,
        "pair_outcomes":dict(Counter("structured_higher" if d["difference"]>0 else "flat_higher" if d["difference"]<0 else "tie" for d in differences)),
        "all_six_successful_trajectories":{arm:sum(t["successes"]==6 for t in trajectories if t["arm"]==arm) for arm in ARMS},
        "agreement_before_adjudication":agreement, "ratings":rated,
        "provenance":{name:digest(path) for name,path in {
            "script":Path(__file__), "export_manifest":EXPORT/"manifest.json", "mapping":EXPORT/"private/mapping.json",
            "rater_a":RATINGS/"evaluator_a.json", "rater_b":RATINGS/"evaluator_b.json",
            **({"adjudicator":RATINGS/"adjudicator.json"} if disputed else {})}.items()},
        "raters":[{k:d.get(k) for k in ("evaluator","requested_model","observed_model","reasoning_effort","evaluation_type","context")} for d in (a_doc,b_doc,c_doc) if d]}
    write_new(HERE / "semantic-results.json", output)
    return {k:output[k] for k in ("status","by_arm","pair_outcomes","mean_paired_difference","all_six_successful_trajectories")}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare-adjudication", "analyze"))
    args = parser.parse_args()
    print(json.dumps(prepare_adjudication() if args.command=="prepare-adjudication" else analyze(), indent=2))
