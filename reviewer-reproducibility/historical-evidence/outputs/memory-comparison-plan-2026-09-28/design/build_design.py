"""Build and validate an offline protocol kit, never an inference runner.

Only files below this script's directory are written. The seven archived inputs
are read and hashed before and after generation. Generation is deterministic;
the scheduling seed is not a model/provider seed.
"""
from __future__ import annotations

import argparse
from collections import Counter
import copy
import hashlib
import json
from pathlib import Path
import random
import re
import socket
import sys
import tempfile

import yaml

from prompt_contract import (ARMS, COMMON_INSTRUCTIONS, PROMPT_TEMPLATE,
                             flat_context_from_ledger, render_flat_history, render_prompt)


HERE = Path(__file__).resolve().parent
APP = HERE.parents[2]
OUTPUTS = HERE.parents[1]
PROFILE_SOURCE = OUTPUTS / "memory-benchmark-2026-09-28/frozen/profiles"
BASE = OUTPUTS / "memory-integration-fix-2026-09-28/integration"
PROFILE_IDS = ("alex_carter_001", "crystal_smith_001", "daniel_isherwood_001",
               "jason_smith_001", "juanita_delgado_001")
SEED = 20260929
ROOTS = ("profile", "clinical", "therapy", "chat")
EXCLUDED = {
    "/profile/avatarUrl": "Presentation-only avatar URL; not part of the patient case.",
    "/voice": "Voice synthesis configuration; both arms produce text only.",
    "/identifiers": "Routing identifiers, including disorderId; clinical diagnosis text is retained.",
}
PROBE_TEXT = {
    "s10t01": "Please state your full name and your age in years, in your own words.",
    "s11t01": "What is the exact title I gave the reflection notebook at the beginning of our practice? Please give that title from our conversations.",
    "s11t02": "According to what I recorded, please give all four details from the appointment record: the practice partner's full name; the current agreed day and time; the former agreed day and time that were replaced; and the proposed day and time that were not agreed. Clearly label which appointment is current, which is former, and which remained only a proposal.",
    "s11t03": "Please give both venue names from my venue records: the exact name of the current booked venue, and the exact name of the former venue it replaced. Clearly say which is current and which is former.",
    "s11t04": "Please give both activity titles from my activity records: the exact title of the activity I recorded as completed, and the exact title of the telephone activity that remained planned and not completed. Clearly state the completion status of each activity.",
    "s11t05": "Did I ever record and confirm the surname of the person who reserved our training room? If I did not, say that it was never established in my records; do not guess.",
}
REQUESTS = {
    "s10t01": {"name": "full name", "age": "age in years"},
    "s11t01": {"notebook_title": "exact title"},
    "s11t02": {"partner": "practice partner's full name", "current": "current agreed day and time",
                 "former": "former agreed day and time", "proposal_only": "proposed day and time that were not agreed"},
    "s11t03": {"current_venue": "exact name of the current booked venue",
                 "former_venue": "exact name of the former venue"},
    "s11t04": {"completed": "exact title of the activity I recorded as completed",
                 "planned_not_completed": "exact title of the telephone activity that remained planned and not completed"},
    "s11t05": {"surname_or_not_established": "record and confirm the surname"},
}
FIELD_SOURCES = {
    "s11t01": {"notebook_title": ["s01t01"]},
    "s11t02": {"partner": ["s02t01", "s06t01"], "current": ["s06t01"],
                 "former": ["s02t01", "s06t01"], "proposal_only": ["s06t02"]},
    "s11t03": {"current_venue": ["s07t01"], "former_venue": ["s03t01", "s07t01"]},
    "s11t04": {"completed": ["s04t02"], "planned_not_completed": ["s08t01"]},
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def write(relative: str, value) -> None:
    target = (HERE / relative).resolve()
    if not target.is_relative_to(HERE) or target == HERE:
        raise ValueError("Only the design directory may be written")
    target.parent.mkdir(parents=True, exist_ok=True)
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    temporary = target.with_name(target.name + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(target)


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


class UniqueKeyLoader(yaml.SafeLoader):
    """Do not silently discard duplicate YAML mapping keys."""


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"Duplicate YAML mapping key: {key}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def load_profile(profile_id):
    value = yaml.load((PROFILE_SOURCE / f"{profile_id}.yaml").read_text(encoding="utf-8"), Loader=UniqueKeyLoader)
    if set(value) != set(ROOTS) | {"identifiers", "voice"}:
        raise ValueError(f"Unexpected profile root: {profile_id}")
    # The archived Jason filename and routing IDs differ. Keep the source intact:
    # profile_id is the kit's filename key, not an inferred native API identity.
    return value


def leaves(value, parts=()):
    if isinstance(value, dict) and value:
        for key, child in value.items():
            if not isinstance(key, str):
                raise TypeError("Case field keys must be strings")
            yield from leaves(child, (*parts, key))
    elif isinstance(value, list) and value:
        for index, child in enumerate(value):
            yield from leaves(child, (*parts, index))
    else:
        pointer = "/" + "/".join(str(part).replace("~", "~0").replace("/", "~1") for part in parts)
        path = ""
        for part in parts:
            path += f"[{part}]" if isinstance(part, int) else ("." if path else "") + part
        kind = "null" if value is None else ("boolean" if type(value) is bool else
               "integer" if type(value) is int else "number" if type(value) is float else
               "string" if isinstance(value, str) else "array" if isinstance(value, list) else "object")
        yield {"path": path, "json_pointer": pointer, "value": value, "type": kind,
               "value_sha256": sha(canonical(value).encode("utf-8"))}


def inputs():
    paths = [PROFILE_SOURCE / f"{profile_id}.yaml" for profile_id in PROFILE_IDS]
    paths += [BASE / "scenario.json", BASE / "gold.json"]
    return {str(path.relative_to(APP)): sha(path.read_bytes()) for path in paths}


def make_case(profile_id):
    profile = load_profile(profile_id)
    entries = list(leaves(profile))
    retained, omitted = [], []
    for entry in entries:
        reason = next((reason for pointer, reason in EXCLUDED.items()
                       if entry["json_pointer"] == pointer or entry["json_pointer"].startswith(pointer + "/")), None)
        if reason:
            omitted.append({**entry, "reason": reason})
        elif entry["json_pointer"].split("/")[1] in ROOTS:
            retained.append(entry)
        else:
            raise ValueError("Undeclared omitted field")
    order = {name: position for position, name in enumerate(ROOTS)}
    retained.sort(key=lambda entry: (order[entry["json_pointer"].split("/")[1]], entry["json_pointer"]))
    lines = [
        "Complete simulated-patient case, rendered as flat statements from the archived source.",
        "Each line names a source field and preserves its typed JSON value verbatim after parsing the YAML.",
        "A JSON null is a supplied null value, not evidence that a condition, event, or relationship is absent.",
        "Quoted values such as \"None\" and \"Not reported\" remain the source's exact words.",
        "",
    ]
    for entry in retained:
        line = f"The recorded value for {entry['path']} is {canonical(entry['value'])}."
        lines.append(line)
        entry.update(line_number=len(lines), line_sha256=sha(line.encode("utf-8")))
    case = "\n".join(lines) + "\n"
    case_path = f"profiles/{profile_id}/case-narrative.txt"
    write(case_path, case)
    return {
        "profile_id": profile_id, "profile_id_semantics": "Archived filename key; not an inferred native API identifier.",
        "archived_patient_id": profile["identifiers"]["patientId"],
        "archived_external_patient_id": profile["identifiers"]["externalPatientId"],
        "source": str((PROFILE_SOURCE / f"{profile_id}.yaml").relative_to(APP)),
        "source_sha256": sha((PROFILE_SOURCE / f"{profile_id}.yaml").read_bytes()),
        "case_path": case_path, "case_sha256": sha(case.encode("utf-8")),
        "source_leaf_count": len(entries), "retained_leaf_count": len(retained),
        "omitted_leaf_count": len(omitted), "retained": retained, "omitted": omitted,
    }


def make_scenario(profile_id):
    scenario, gold = copy.deepcopy(read(BASE / "scenario.json")), copy.deepcopy(read(BASE / "gold.json"))
    scenario_id = f"{profile_id}_known_communication_memory_v1"
    scenario.update(scenario_id=scenario_id, patient_id=profile_id,
                    response_source="Not supplied in this prepared kit; future model outputs only.",
                    suite_status="Known development suite replicated across profiles and repetitions; not a holdout.")
    for session in scenario["sessions"]:
        for turn in session["turns"]:
            if turn["turn_id"] in PROBE_TEXT:
                turn["text"] = PROBE_TEXT[turn["turn_id"]]
    gold.update(scenario_id=scenario_id, patient_id=profile_id,
                model_visibility="Evaluator-only: never include this file or its expected values in generation context.",
                authority="Identity comes from the archived profile. Exercise facts come from explicit therapist statements. Patient replies are outcomes, never gold replacements.")
    profile = load_profile(profile_id)
    for probe in gold["probes"]:
        probe["requested_fields"] = REQUESTS[probe["turn_id"]]
        if probe["turn_id"] == "s10t01":
            probe["expected"] = {"name": profile["profile"]["name"], "age": profile["profile"]["age"]}
            probe["profile_source"] = str((PROFILE_SOURCE / f"{profile_id}.yaml").relative_to(APP))
            probe["profile_paths"] = {"name": "/profile/name", "age": "/profile/age"}
        if probe["turn_id"] in FIELD_SOURCES:
            probe["field_sources"] = FIELD_SOURCES[probe["turn_id"]]
        if probe["expected"] is None:
            probe["null_meaning"] = "Scoring sentinel: the requested surname has no source in this exercise. This is unrelated to null profile fields."
            probe["criterion"] = "Explicitly states that the surname was never established in the therapist's records, without inventing a surname or substituting the practice partner. A patient's unsupported earlier assertion does not establish the therapist's record."
    write(f"scenarios/{profile_id}.json", scenario)
    write(f"gold/{profile_id}.json", gold)


def make_run_matrix(profiles):
    runs = []
    for profile in profiles:
        pid = profile["profile_id"]
        for repeat in range(1, 4):
            pair = f"{pid}__r{repeat:02d}"
            for arm in ARMS:
                run_id = f"{pair}__{arm}"
                runs.append({
                    "run_id": run_id, "pair_id": pair, "profile_id": pid, "repetition": repeat, "arm": arm,
                    "case_path": profile["case_path"], "case_sha256": profile["case_sha256"],
                    "scenario_path": f"scenarios/{pid}.json", "evaluator_only_gold_path": f"gold/{pid}.json",
                    "planned_ledger": f"planned-runtime/{run_id}/accepted-turns.jsonl",
                    "sessions": 11, "therapist_turns": 55, "probes": 6,
                })
    return {"status": "PREPARED_NOT_EXECUTED", "arms": list(ARMS), "profiles": 5,
            "repetitions_per_profile": 3, "trajectory_count": 30, "therapist_turn_count": 1650,
            "probe_count": 180, "replication_scope": "The same known scenario and gold are used for all three repetitions of each profile; this is not held-out evaluation.",
            "runs": runs}


def make_schedule(matrix):
    rng = random.Random(SEED)
    by_pair = {}
    for run in matrix["runs"]:
        by_pair.setdefault(run["pair_id"], {})[run["arm"]] = run["run_id"]
    sessions, flat_rows = [], []
    for index in range(1, 12):
        pairs = sorted(by_pair)
        rng.shuffle(pairs)
        pairs_in_session = []
        for pair_index, pair in enumerate(pairs, 1):
            arms = list(ARMS)
            rng.shuffle(arms)
            pairs_in_session.append({"pair_order": pair_index, "pair_id": pair, "arm_order": arms})
            for arm in arms:
                flat_rows.append({"execution_order": len(flat_rows) + 1, "session_index": index,
                                  "pair_order": pair_index, "pair_id": pair, "arm": arm,
                                  "run_id": by_pair[pair][arm],
                                  "turn_ids": [f"s{index:02d}t{turn:02d}" for turn in range(1, 6)]})
        sessions.append({"session_index": index, "pairs": pairs_in_session})
    return {"status": "PREPARED_NOT_EXECUTED", "scheduling_seed": SEED,
            "seed_scope": "Pair order and arm order within each session only; no provider seed is specified.",
            "algorithm": "One Python random.Random(20260929); for sessions 1..11, shuffle initially sorted pair IDs, then shuffle the two arms for each pair.",
            "sessions": sessions, "session_executions": flat_rows}


def build():
    before = inputs()
    profiles = [make_case(profile_id) for profile_id in PROFILE_IDS]
    for profile_id in PROFILE_IDS:
        make_scenario(profile_id)
    write("profile-manifest.json", {"status": "PREPARED_NOT_EXECUTED", "case_roots": list(ROOTS),
                                     "declared_exclusions": EXCLUDED, "null_policy": "Preserved as explicit null; not interpreted as absence.",
                                     "profiles": profiles})
    write("input-hashes.json", {"algorithm": "sha256", "base": "application repository root", "files": before})
    write("COMMON_INSTRUCTIONS.txt", COMMON_INSTRUCTIONS)
    write("prompt-template.txt", PROMPT_TEMPLATE)
    write("arm-contracts.json", {
        "status": "PREPARED_NOT_EXECUTED", "template_order": ["common_instructions", "case_block", "ARM_CONTEXT", "latest_question"],
        "case_and_instructions": "Byte-identical between arms for each profile. Only ARM_CONTEXT differs.",
        "structured_common_profile": {"ARM_CONTEXT": "The structured system's actual persisted/retrieved memory and conversation context, supplied by a future adapter. No gold or other-run replies.",
                                      "runtime_status": "No structured runner or retrieval/window configuration is implemented in this kit; bind those settings explicitly before execution."},
        "flat_full_history": {"ARM_CONTEXT": "Every previously accepted therapist/patient pair from this run's private ledger, in original chronological order, including all earlier sessions.",
                              "helper": "prompt_contract.py:flat_context_from_ledger", "last_n_window": "forbidden", "history_summary_substitution": "forbidden",
                              "overflow_policy": "Stop and report inability to fit the full context; never silently truncate.",
                              "ledger_fields": ["run_id", "status=accepted", "turn_index", "session_index", "turn_id", "therapist_text", "patient_text"]},
        "isolation": "Each profile/repetition/arm has a separate persistent ledger and memory. The two arms receive the same therapist script and case, but generate and retain their own replies.",
        "gold": "Read only by evaluators after responses are stored; never passed to prompt construction.",
        "provider_configuration": "Not implemented or inferred by this design generator. The schedule seed is not a provider seed.",
    })
    matrix = make_run_matrix(profiles)
    write("run-matrix.json", matrix)
    write("schedule.json", make_schedule(matrix))
    if inputs() != before:
        raise AssertionError("An archived input changed during generation")
    write("README.md", """# Prepared comparison design

## Material Passport

- Stage: offline preparation and mechanical validation.
- Status: PREPARED_NOT_EXECUTED.
- Inputs: five archived synthetic profiles, the existing 55-turn therapist scenario, and its six evaluator-only probes; exact hashes are in `input-hashes.json`.
- Evidence scope: data preservation, prompt parity, schedule integrity, and complete baseline-history construction. No model outcomes or comparative effectiveness estimates are produced here.

The five case narratives retain every leaf in `profile`, `clinical`, `therapy`, and `chat`, except `profile.avatarUrl`. Voice settings and routing identifiers are explicitly excluded in `profile-manifest.json`. Its per-leaf path, typed value, value hash, rendered line number, and rendered line hash make the deterministic flat rendering auditable. JSON null is preserved and is not an assertion of absence.

The identical case block and instructions are used in both arms. The template permits only `ARM_CONTEXT` to differ. `prompt_contract.py` is a pure offline helper, not a model runner. The flat arm reads its entire accepted-turn ledger; there is no last-five-turn window or summary substitution. The structured context and provider settings require an explicitly specified adapter before any execution.

The therapist supplies exercise facts. No patient response is prescribed or imported. `scenarios/` contains five 55-turn scripts; `gold/` is separate and evaluator-only. All six probes explicitly request their gold fields without naming expected values. Three repeats per profile use the same known suite, not a holdout.

`run-matrix.json` lists 30 planned trajectories (1,650 therapist turns and 180 probe administrations). `schedule.json` fixes pair and arm order for every session using scheduling seed 20260929; it is not a provider seed. No runtime directory or accepted patient data is created by this generator.

Rebuild and run the offline checks from the application repository:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/memory-comparison-plan-2026-09-28/design/build_design.py
```

Use `--check-only` to validate existing outputs without rebuilding them. The checks block socket connections and write `check.json` and `offline-checks.log`. Those checks use clearly synthetic ledger fixtures, never provider calls. Kit-level freezing and the study protocol are handled outside this directory.
""")


def assert_rejected(function):
    try:
        function()
    except (ValueError, TypeError):
        return
    raise AssertionError("An invalid ledger was accepted")


def validate():
    checks = []
    def record(name, **details):
        checks.append({"name": name, "status": "PASS", **details})
    frozen = read(HERE / "input-hashes.json")["files"]
    assert inputs() == frozen, "Archived inputs differ from the generation hashes"
    manifest = read(HERE / "profile-manifest.json")
    assert len(manifest["profiles"]) == 5
    total_retained = total_omitted = total_null = 0
    for item in manifest["profiles"]:
        profile = load_profile(item["profile_id"])
        original = {leaf["json_pointer"]: leaf for leaf in leaves(profile)}
        exported = item["retained"] + item["omitted"]
        assert len(exported) == len(original) == item["source_leaf_count"]
        assert len({leaf["json_pointer"] for leaf in exported}) == len(original)
        lines = (HERE / item["case_path"]).read_text(encoding="utf-8").splitlines()
        case = (HERE / item["case_path"]).read_bytes()
        assert sha(case) == item["case_sha256"]
        for leaf in exported:
            source = original[leaf["json_pointer"]]
            assert canonical(leaf["value"]) == canonical(source["value"])
            assert leaf["type"] == source["type"] and leaf["value_sha256"] == sha(canonical(source["value"]).encode())
        for leaf in item["retained"]:
            assert not any(leaf["json_pointer"] == p or leaf["json_pointer"].startswith(p + "/") for p in EXCLUDED)
            line = lines[leaf["line_number"] - 1]
            prefix = f"The recorded value for {leaf['path']} is "
            assert line.startswith(prefix) and line.endswith(".")
            roundtrip = json.loads(line[len(prefix):-1])
            assert canonical(roundtrip) == canonical(source_value(profile, leaf["json_pointer"]))
            assert sha(line.encode()) == leaf["line_sha256"]
            total_null += leaf["type"] == "null"
        for leaf in item["omitted"]:
            assert any(leaf["json_pointer"] == p or leaf["json_pointer"].startswith(p + "/") for p in EXCLUDED)
        assert len(item["retained"]) == item["retained_leaf_count"]
        assert len(item["omitted"]) == item["omitted_leaf_count"]
        total_retained += len(item["retained"])
        total_omitted += len(item["omitted"])
    record("all_case_leaves_typed_and_roundtripped", profiles=5, retained_leaves=total_retained,
           explicitly_omitted_leaves=total_omitted, preserved_nulls=total_null)

    base = read(BASE / "scenario.json")
    base_turns = {turn["turn_id"]: turn["text"] for session in base["sessions"] for turn in session["turns"]}
    scenario_texts = []
    for pid in PROFILE_IDS:
        scenario = read(HERE / f"scenarios/{pid}.json")
        gold = read(HERE / f"gold/{pid}.json")
        assert len(scenario["sessions"]) == 11 and all(len(s["turns"]) == 5 for s in scenario["sessions"])
        turns = {turn["turn_id"]: turn["text"] for session in scenario["sessions"] for turn in session["turns"]}
        assert len(turns) == 55 and set(turns) == set(base_turns)
        assert len(gold["probes"]) == 6 and {p["turn_id"] for p in gold["probes"]} == set(PROBE_TEXT)
        for session in scenario["sessions"]:
            for turn in session["turns"]:
                assert set(turn) == {"turn_id", "text"}, "Patient replies or gold leaked into scenario"
                assert turn["text"] == (PROBE_TEXT.get(turn["turn_id"]) or base_turns[turn["turn_id"]])
        all_probe_text = "\n".join(turns[turn_id] for turn_id in PROBE_TEXT)
        for probe in gold["probes"]:
            question = turns[probe["turn_id"]]
            assert probe["requested_fields"] == REQUESTS[probe["turn_id"]]
            assert all(phrase.casefold() in question.casefold() for phrase in probe["requested_fields"].values())
            assert all(source < probe["turn_id"] for source in probe["source_turns"])
            if probe["expected"] is None:
                assert not probe["source_turns"] and probe["category"] == "absent_fact_abstention"
                continue
            assert set(probe["expected"]) == set(probe["requested_fields"])
            for field, value in probe["expected"].items():
                assert re.search(r"(?<!\w)" + re.escape(str(value)) + r"(?!\w)", all_probe_text, re.I) is None, "Expected value leaked into a probe"
                if probe["turn_id"] == "s10t01":
                    assert value == source_value(load_profile(pid), probe["profile_paths"][field])
                else:
                    origins = probe["field_sources"][field]
                    assert origins and set(origins) <= set(probe["source_turns"])
                    assert all(str(value) in turns[origin] and origin < probe["turn_id"] for origin in origins)
        assert "replaces the old appointment" in turns["s06t01"]
        assert "we did not agree to it" in turns["s06t02"]
        assert "former venue" in turns["s07t01"]
        assert "completed" in turns["s04t02"] and "has not been completed" in turns["s08t01"]
        case_text = (HERE / f"profiles/{pid}/case-narrative.txt").read_text(encoding="utf-8").casefold()
        nonidentity_targets = {str(value) for probe in gold["probes"]
                               if probe["turn_id"] != "s10t01" and isinstance(probe["expected"], dict)
                               for value in probe["expected"].values()}
        nonidentity_targets |= {time for value in nonidentity_targets for time in re.findall(r"\b\d{2}:\d{2}\b", value)}
        assert all(target.casefold() not in case_text for target in nonidentity_targets), "Exercise target already present in a case block"
        scenario_texts.append(turns)
    assert all(text == scenario_texts[0] for text in scenario_texts)
    record("scenarios_gold_chronology_field_coverage_and_no_answer_cues", scenario_count=5,
           therapist_turns_per_scenario=55, probes_per_scenario=6, changed_probe_texts=6,
           nonidentity_names_titles_venues_and_exact_times_absent_from_case=True,
           source="Profile identity and earlier explicit therapist statements only")

    matrix, schedule = read(HERE / "run-matrix.json"), read(HERE / "schedule.json")
    runs = matrix["runs"]
    assert len(runs) == 30 and len({r["run_id"] for r in runs}) == 30
    assert sum(r["therapist_turns"] for r in runs) == 1650
    assert sum(r["probes"] for r in runs) == 180
    assert len({r["planned_ledger"] for r in runs}) == 30
    assert len({(r["profile_id"], r["repetition"], r["arm"]) for r in runs}) == 30
    assert Counter((r["profile_id"], r["repetition"]) for r in runs) == Counter({(p, n): 2 for p in PROFILE_IDS for n in range(1, 4)})
    pairs = {}
    for run in runs:
        pairs.setdefault(run["pair_id"], []).append(run)
    for pair_runs in pairs.values():
        assert {r["arm"] for r in pair_runs} == set(ARMS)
        assert len({r["case_path"] for r in pair_runs}) == len({r["case_sha256"] for r in pair_runs}) == 1
        assert len({r["scenario_path"] for r in pair_runs}) == 1
    executions = schedule["session_executions"]
    assert len(executions) == 330
    assert [r["execution_order"] for r in executions] == list(range(1, 331))
    assert Counter(r["run_id"] for r in executions) == Counter({r["run_id"]: 11 for r in runs})
    for session in range(1, 12):
        rows = [r for r in executions if r["session_index"] == session]
        assert len(rows) == 30 and {r["run_id"] for r in rows} == {r["run_id"] for r in runs}
        for pos in range(0, 30, 2):
            assert rows[pos]["pair_id"] == rows[pos + 1]["pair_id"]
            assert {rows[pos]["arm"], rows[pos + 1]["arm"]} == set(ARMS)
    for run in runs:
        assert [r["session_index"] for r in executions if r["run_id"] == run["run_id"]] == list(range(1, 12))
    assert schedule == make_schedule(matrix) == make_schedule(matrix)
    record("run_matrix_and_deterministic_paired_schedule", trajectories=30, therapist_turns=1650,
           probe_administrations=180, paired_session_blocks=165, session_executions=330,
           scheduling_seed=SEED, provider_seed="not specified")

    assert (HERE / "COMMON_INSTRUCTIONS.txt").read_text() == COMMON_INSTRUCTIONS
    assert (HERE / "prompt-template.txt").read_text() == PROMPT_TEMPLATE
    for profile in manifest["profiles"]:
        case = (HERE / profile["case_path"]).read_text(encoding="utf-8")
        prompts = [render_prompt(case_block=case, arm_context=context, latest_question=PROBE_TEXT["s11t02"])
                   for context in ("Structured context fixture.\n", "Flat history fixture.\n")]
        cases = [prompt.split("<CASE>\n", 1)[1].split("</CASE>", 1)[0].encode() for prompt in prompts]
        assert cases[0] == cases[1] == case.encode()
        prefixes = [prompt.split("<ARM_CONTEXT>\n", 1)[0] for prompt in prompts]
        suffixes = [prompt.split("</ARM_CONTEXT>\n", 1)[1] for prompt in prompts]
        assert prefixes[0] == prefixes[1] and suffixes[0] == suffixes[1]
    record("common_case_instructions_and_template_byte_identity", compared_profile_pairs=5,
           differing_section="ARM_CONTEXT only", common_instructions_sha256=sha(COMMON_INSTRUCTIONS.encode()))

    fixture = [{"run_id": "OFFLINE_FIXTURE__flat_full_history", "status": "accepted", "turn_index": n,
                "session_index": (n - 1) // 5 + 1, "turn_id": f"s{(n - 1) // 5 + 1:02d}t{(n - 1) % 5 + 1:02d}",
                "therapist_text": f"OFFLINE THERAPIST SENTINEL {n} with quote \" and newline\nkept.",
                "patient_text": f"OFFLINE PATIENT FIXTURE {n}; not a generated patient outcome."} for n in range(1, 18)]
    run_id = fixture[0]["run_id"]
    with tempfile.TemporaryDirectory(prefix="offline-ledger-check-", dir=HERE) as directory:
        path = Path(directory) / "ledger.jsonl"
        path.write_text("".join(canonical(row) + "\n" for row in fixture))
        context = flat_context_from_ledger(path, run_id=run_id, expected_prior_turns=17)
        parsed = [json.loads(line) for line in context.splitlines()[1:]]
        assert len(parsed) == 17
        assert [r["therapist"] for r in parsed] == [r["therapist_text"] for r in fixture]
        assert [r["patient"] for r in parsed] == [r["patient_text"] for r in fixture]
        assert_rejected(lambda: render_flat_history(fixture[-5:], run_id=run_id, expected_prior_turns=17))
        assert_rejected(lambda: render_flat_history(fixture[-5:], run_id=run_id, expected_prior_turns=5))
        wrong = copy.deepcopy(fixture)
        wrong[0]["run_id"] = "OTHER_ARM"
        assert_rejected(lambda: render_flat_history(wrong, run_id=run_id, expected_prior_turns=17))
        wrong = copy.deepcopy(fixture)
        wrong[0]["status"] = "failed"
        assert_rejected(lambda: render_flat_history(wrong, run_id=run_id, expected_prior_turns=17))
        assert_rejected(lambda: flat_context_from_ledger(Path(directory) / "missing", run_id=run_id, expected_prior_turns=17))
    record("flat_history_reads_all_own_turns_with_no_last_five_window", fixture_turns=17, fixture_sessions=4,
           exact_text_and_newline_roundtrip=True, rejected=["last-five suffix", "reindexed-length suffix", "other arm", "unaccepted pair", "missing ledger"],
           fixture_is_patient_data=False)
    assert inputs() == frozen
    record("archived_inputs_unchanged", hashed_inputs=len(frozen), hashes_before_equal_after=True)
    report = {"status": "PASS", "scope": "Prepared protocol and offline mechanics only; no experiment results.",
              "network": "Socket connection entry points blocked throughout build/check; no model APIs imported or called.",
              "checks": checks, "check_count": len(checks),
              "counts": {"profiles": 5, "retained_case_leaves": total_retained, "omitted_leaves": total_omitted,
                         "preserved_nulls": total_null, "trajectories": 30, "therapist_turns": 1650, "probe_administrations": 180},
              "input_hashes": frozen}
    write("check.json", report)
    log = "Offline design validation; no model runner or provider calls.\n" + "".join(
        f"PASS {entry['name']}: {canonical({k: v for k, v in entry.items() if k not in {'name', 'status'}})}\n" for entry in checks)
    log += f"PASS {len(checks)}/{len(checks)} checks. PREPARED_NOT_EXECUTED.\n"
    write("offline-checks.log", log)
    return report


def source_value(profile, pointer):
    value = profile
    for piece in pointer.split("/")[1:]:
        key = piece.replace("~1", "/").replace("~0", "~")
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value


def no_network(*args, **kwargs):
    raise AssertionError("The prepared design generator is offline; networking is forbidden")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    socket.socket.connect = no_network
    socket.socket.connect_ex = no_network
    socket.create_connection = no_network
    try:
        if not args.check_only:
            build()
        outcome = validate()
    except Exception as exc:
        write("check.json", {"status": "FAIL", "scope": "Offline preparation", "error_type": type(exc).__name__, "error": str(exc)})
        write("offline-checks.log", f"FAIL {type(exc).__name__}: {exc}\n")
        raise
    print(canonical({"status": outcome["status"], "checks": outcome["check_count"], **outcome["counts"]}))
