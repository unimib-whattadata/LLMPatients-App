#!/usr/bin/env python3
"""Validate the frozen continuity scenarios and score text without an LLM judge.

This module has no network dependencies and never calls a model. The runner may
import score_assertion/score_turn; only turn['text'] belongs in a model request.
"""

from __future__ import annotations

import argparse
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import unicodedata


CANONICAL_IDS = {
    "alex_carter_001", "jason_smith_001", "daniel_isherwood_001",
    "crystal_smith_001", "juanita_delgado_001",
}


def normalize_response(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def score_assertion(assertion: dict, response: str | None, *, runtime_valid: bool = True) -> dict:
    """Return a conservative lexical outcome, never a diagnosis or contradiction.

    Mentioning both expected and superseded values is ambiguous for this locked
    scorer, even when a human might understand the distinction from syntax.
    A non-match alone is not evidence of a factual contradiction.
    """
    base = {
        "assertion_id": assertion["assertion_id"],
        "fact_id": assertion["fact_id"],
        "metric": assertion["metric"],
        "is_primary": assertion["is_primary"],
    }
    if not runtime_valid or not isinstance(response, str) or not response.strip():
        return {**base, "status": "runtime_invalid", "correct": False,
                "expected_match_evidence": [], "competing_value_evidence": []}
    text = normalize_response(response)
    required = [re.search(pattern, text, flags=re.I) for pattern in assertion["match"]["patterns"]]
    competing = [re.search(pattern, text, flags=re.I)
                 for pattern in assertion["match"].get("forbidden_patterns", [])]
    expected_ok = bool(required) and all(match is not None for match in required)
    competing_evidence = [match.group(0) for match in competing if match is not None]
    status = ("ambiguous" if competing_evidence else "correct") if expected_ok else "not_matched"
    return {
        **base, "status": status, "correct": status == "correct",
        "expected_match_evidence": [match.group(0) for match in required if match is not None],
        "competing_value_evidence": competing_evidence,
    }


def score_turn(turn: dict, response: str | None, *, runtime_valid: bool = True) -> list[dict]:
    return [score_assertion(item, response, runtime_valid=runtime_valid)
            for item in turn.get("assertions", [])]


def read_safety_patterns(path: Path) -> list[tuple[str, re.Pattern]]:
    """Read only the literal regex list from safety.py, without importing runtime."""
    module = ast.parse(path.read_text())
    assignment = next(node for node in module.body if isinstance(node, ast.Assign)
                      and any(isinstance(t, ast.Name) and t.id == "SAFETY_PATTERNS"
                              for t in node.targets))
    patterns = []
    for row in assignment.value.elts:
        label = ast.literal_eval(row.elts[0])
        pattern = ast.literal_eval(row.elts[1].args[0])
        patterns.append((label, re.compile(pattern, re.I)))
    return patterns


def validate_scenarios(document: dict, *, agent_root: Path) -> dict:
    errors: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    require(document.get("schema_version") == 1, "Unsupported schema version")
    require(document.get("conditions") == ["full_system", "flat_full_history"], "Condition labels changed")
    patients = document.get("patients", [])
    require(len(patients) == 5, "Expected exactly five patients")
    require({p["patient_id"] for p in patients} == CANONICAL_IDS, "Canonical profile set changed")
    safety_path = agent_root / "agent/core/safety.py"
    safety_patterns = read_safety_patterns(safety_path)
    require(len(safety_patterns) > 0, "Safety preflight did not load any patterns")
    all_turn_ids: set[str] = set()
    all_assertion_ids: set[str] = set()
    counts: Counter = Counter()
    per_patient = []

    for patient in patients:
        pid = patient["patient_id"]
        path = agent_root / patient["profile_source"]["relative_path"]
        data = path.read_bytes()
        require(hashlib.sha256(data).hexdigest() == patient["profile_source"]["sha256"], f"{pid}: source profile hash changed")
        profile_text = data.decode()
        profile_block = profile_text.split("\nprofile:\n", 1)[1].split("\nvoice:\n", 1)[0]
        name_match = re.search(r"^  name: (.+)$", profile_block, re.M)
        age_match = re.search(r"^  age: (\d+)$", profile_block, re.M)
        require(name_match is not None and name_match.group(1).strip() == patient["identity"]["name"], f"{pid}: source name mismatch")
        require(age_match is not None and int(age_match.group(1)) == patient["identity"]["age"], f"{pid}: source age mismatch")
        sessions = patient["sessions"]
        require([s["session_index"] for s in sessions] == list(range(1, 12)), f"{pid}: sessions must be 1..11")
        fact_state: dict[str, dict] = {}
        seen_turns: dict[str, int] = {}
        patient_primary: Counter = Counter()
        assertion_counts: Counter = Counter()
        withheld_id = patient["facts"]["exercise_label"]["versions"][0]["source_turn_id"]
        withheld_value = patient["facts"]["exercise_label"]["versions"][0]["value"]
        require(normalize_response(withheld_value) not in normalize_response(profile_text), f"{pid}: withheld fact is already in profile")

        for session in sessions:
            s = session["session_index"]
            require(session["step_id"] == s, f"{pid}: step/session mismatch")
            phase = "acquaintance" if s <= 2 else "intervention" if s <= 10 else "feedback"
            require(session["phase"] == phase, f"{pid}: phase mismatch at session {s}")
            require(len(session["turns"]) == 5, f"{pid}: expected five turns in session {s}")
            for local_t, turn in enumerate(session["turns"], start=1):
                tid = turn["turn_id"]
                index = (s - 1) * 5 + local_t
                require(tid == f"{pid}:S{s:02d}:T{local_t:02d}", f"{tid}: turn ID/order mismatch")
                require(tid not in all_turn_ids, f"Duplicate turn ID {tid}")
                all_turn_ids.add(tid)
                require(isinstance(turn.get("text"), str) and bool(turn["text"].strip()), f"{tid}: empty text")
                for label, regex in safety_patterns:
                    require(regex.search(turn["text"]) is None, f"{tid}: activates safety pattern {label}")
                if tid != withheld_id:
                    require(normalize_response(withheld_value) not in normalize_response(turn["text"]), f"{tid}: withheld label leaked/rehearsed in therapist text")
                for change in turn.get("facts_changed", []):
                    key = change["fact_id"]
                    version = patient["facts"][key]["versions"][change["state_index"]]
                    require(version["value"] == change["value"] and version["source_turn_id"] == tid, f"{tid}: fact change disagrees with source registry")
                    require(normalize_response(change["value"]) in normalize_response(turn["text"]), f"{tid}: changed fact missing from therapist text")
                    if key in fact_state:
                        require(change["state_index"] == fact_state[key]["state_index"] + 1, f"{tid}: nonconsecutive fact version")
                    else:
                        require(change["state_index"] == 0, f"{tid}: first version is not zero")
                    fact_state[key] = change
                for assertion in turn.get("assertions", []):
                    aid = assertion["assertion_id"]
                    require(aid not in all_assertion_ids, f"Duplicate assertion ID {aid}")
                    all_assertion_ids.add(aid)
                    require(assertion["match"]["type"] == "all_regex", f"{aid}: unexpected match type")
                    for regex in assertion["match"]["patterns"] + assertion["match"].get("forbidden_patterns", []):
                        re.compile(regex, flags=re.I)
                    exemplar = " ".join(assertion["expected_values"])
                    require(score_assertion(assertion, exemplar)["status"] == "correct", f"{aid}: canonical expected answer does not pass")
                    require(score_assertion(assertion, "I do not remember.")["status"] == "not_matched", f"{aid}: abstention wrongly passes")
                    require(score_assertion(assertion, None)["status"] == "runtime_invalid", f"{aid}: missing response wrongly passes")
                    require(bool(assertion["is_primary"]) == (s == 11), f"{aid}: primary endpoint outside final session")
                    if assertion["is_primary"]:
                        patient_primary[assertion["metric"]] += 1
                    key = assertion["fact_id"]
                    if key in patient["facts"]:
                        versions = patient["facts"][key]["versions"]
                        target_index = 0 if assertion["expected_state"] == "initial" else fact_state[key]["state_index"]
                        expected_version = versions[target_index]
                        require(assertion["expected_values"] == [expected_version["value"]], f"{aid}: wrong expected factual version")
                        require(assertion["source_turn_id"] == expected_version["source_turn_id"], f"{aid}: wrong fact source")
                        require(assertion["source_turn_id"] in seen_turns, f"{aid}: fact is not introduced earlier")
                        if assertion["source_turn_id"] in seen_turns:
                            require(assertion["lag_turns"] == index - seen_turns[assertion["source_turn_id"]] - 1, f"{aid}: wrong lag")
                        for value in assertion["expected_values"]:
                            require(normalize_response(value) not in normalize_response(turn["text"]), f"{aid}: expected value is leaked in probe")
                        if len(versions) > 1:
                            other_value = next(v["value"] for v in versions if v["value"] != expected_version["value"])
                            require(score_assertion(assertion, other_value)["status"] == "not_matched", f"{aid}: stale/alternative value wrongly passes")
                            require(score_assertion(assertion, exemplar + "; " + other_value)["status"] == "ambiguous", f"{aid}: competing-value response not flagged as ambiguous")
                    if key == "exercise_label":
                        require(s == 11, f"{aid}: withheld recall probed before session 11")
                    assertion_counts["primary" if assertion["is_primary"] else "secondary"] += 1
                    counts["assertions_per_condition"] += 1
                seen_turns[tid] = index
                counts["therapist_inputs_per_condition"] += 1
        require(set(fact_state) == set(patient["facts"]), f"{pid}: unintroduced fact")
        require(assertion_counts == {"primary": 6, "secondary": 17}, f"{pid}: assertion counts changed")
        require(patient_primary == {"identity_preservation": 2, "current_fact_recall": 3, "withheld_fact_recall": 1}, f"{pid}: primary metric mix changed")
        counts["primary_assertions_per_condition"] += assertion_counts["primary"]
        per_patient.append({"patient_id": pid, **dict(assertion_counts)})

    require(counts["therapist_inputs_per_condition"] == 275, "Expected 275 inputs per condition")
    require(counts["assertions_per_condition"] == 115, "Expected 115 assertions per condition")
    require(counts["primary_assertions_per_condition"] == 30, "Expected 30 primary assertions per condition")
    return {
        "valid": not errors,
        "errors": errors,
        "counts": dict(counts),
        "per_patient": per_patient,
        "safety_patterns_checked": len(safety_patterns),
        "safety_source_sha256": hashlib.sha256(safety_path.read_bytes()).hexdigest(),
        "verification_scope": "Dataset/provenance/answer-key/safety-pattern checks only; no model or clinical validation.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenarios", type=Path, default=Path(__file__).with_name("scenarios.json"))
    parser.add_argument("--agent-root", type=Path, default=Path(__file__).resolve().parents[4] / "LLMPatients-Agent")
    args = parser.parse_args()
    try:
        document = json.loads(args.scenarios.read_text())
        result = validate_scenarios(document, agent_root=args.agent_root)
        result["scenarios_sha256"] = hashlib.sha256(args.scenarios.read_bytes()).hexdigest()
    except Exception as exc:
        result = {"valid": False, "errors": [f"{type(exc).__name__}: {exc}"]}
    print(json.dumps(result, indent=2))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
