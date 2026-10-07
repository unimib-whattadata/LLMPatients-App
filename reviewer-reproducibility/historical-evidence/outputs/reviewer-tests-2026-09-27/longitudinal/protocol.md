# Eleven-session technical continuity comparison — design v1

## Material Passport

- Origin skill: ARS-Codex academic-research-suite, experiment-agent.
- Origin mode: experiment planning; user-authorized implementation and execution.
- Origin date: 2026-09-27.
- Verification status: protocol and dataset specified; deterministic dataset preflight passed; longitudinal model results not yet evaluated when this design was written.
- Version label: reviewer-continuity-11s-v1.
- Data class: five existing fictional patient profiles and newly authored synthetic conversations; no new human participants.
- Local prospective specification: this protocol and its hashes are to be recorded before the first scored longitudinal response. This is not an externally registered preregistration.
- Scenario file SHA-256: `75aeb46e0723005584ead81b254c0d787aa06cacc5618e5392b4ba3dec1e8288`.

## Question and scope

Can the complete Agent preserve fixed identity facts, new shared facts and explicit changes across an eleven-session simulated pathway, and how does its observed recall compare with a narrative-profile baseline that retains the entire prior dialogue?

This is a technical test of factual continuity. It does not assess symptom validity, therapeutic benefit, realism of an eleven-session treatment, training effectiveness, or clinical safety. The short sessions are controlled probes, not full therapy sessions. There is no predeclared expectation that either condition must win, and no accuracy threshold that would turn the result into a clinical validation claim.

## Design and conditions

Five canonical profiles are used: Alex Carter, Jason Smith, Daniel Isherwood, Crystal Smith and Juanita Delgado. Each has one trajectory in each of two conditions, giving five paired cases, ten trajectories, 110 sessions and 550 patient responses. Each session contains exactly five therapist turns, reaching the runtime's five-turn episodic consolidation threshold. Session indices map to existing step IDs 1–11: acquaintance in 1–2, intervention in 3–10 and feedback in 11.

| Condition | Profile input | Prior conversation | Additional machinery |
|---|---|---|---|
| `full_system` | Native canonical profile object from the frozen YAML | Native bounded history plus persisted episodic/session/long-term memory | Normal state graph, affect updates, retrieval, role checks and prompt builder |
| `flat_full_history` | Deterministic prose serialization retaining every relevant leaf of the same profile, clinical, therapy and chat blocks | Complete earlier therapist and patient exchanges from this condition, including all prior sessions and boundary markers | Direct patient generation, with no state graph, summaries, retrieval or symbolic updates |

Voice, image and database identifier metadata may be omitted from the baseline; any omission must be listed. No clinical or biographical field, questionnaire-related field, treatment goal, initial message or personality content may be selectively removed. Archive the narrative and a leaf-coverage manifest, rather than describing the baseline as content-equivalent without checking it.

The scenario labels map to runner/output labels as follows: `full_system` → `full`, and `flat_full_history` → `baseline`. Both arms receive identical scripted therapist text in identical order. The same patient generator model and resolved generation parameters are used, including temperature, top-p/top-k where supported, visible output budget, reasoning settings and safety configuration. Native auxiliary calls in the full system retain their documented settings and are also logged. The run manifest must identify the provider, exact model ID, region/endpoint, returned model metadata when available, seed support and runtime/source hashes. Do not invent a seed when the provider does not expose one.

The planned patient-generation configuration is the runner's resolved Gemini 2.5 Pro/Vertex AI setup, temperature 0.7 and output budget 4096; the executable request records, not this planning sentence, establish what was actually used. Changes made to the runtime during the investigation must be documented and frozen before this experiment. These will be new results from that frozen revision, not a reproduction of the old eleven-session claim or the February PHQ-9 run.

The baseline deliberately has complete history. The full system uses its designed bounded context and memory. This compares whole configurations under the same input sequence and full baseline access to prior information. It does **not** isolate the contribution of schema structure or memory from context selection, history length, prompt wording, affect updates or other runtime differences. Do not call it a pure ablation. Log input/output tokens and latency so the context and cost difference is visible.

## Fixed facts and scripted events

Identity ground truth is the full name and age in each canonical YAML. The age is fixed throughout this short simulated pathway; no year elapses in the scenario.

Three new shared facts are introduced for each case. They concern labels and entries assigned by the therapist to fictional, optional practice materials. They do not invent patient history, imply consent to treatment, assert that a patient completed an activity, or require the patient to become more cooperative. The label/entry is a fact about what the therapist wrote even if the patient dislikes or declines the task.

| Profile | Journal title S1 → current title S6 | Check-in entry S1 → current entry S5 | Reflection-card title, introduced S2 |
|---|---|---|---|
| Alex Carter, 30 | Maple Ledger → Beacon Pages | Tuesday 18:20 → Friday 17:40 | Silver Kite |
| Jason Smith, 22 | Pebble Journal → Lantern Journal | Monday 16:10 → Thursday 18:50 | Amber Bridge |
| Daniel Isherwood, 55 | Cedar Notes → Harbor Notes | Wednesday 19:15 → Saturday 10:25 | Copper Leaf |
| Crystal Smith, 33 | Willow Pages → Meadow Pages | Thursday 15:30 → Monday 11:45 | Indigo Shell |
| Juanita Delgado, 33 | Juniper Book → Horizon Book | Friday 14:20 → Tuesday 16:35 | Coral Lantern |

The journal rename replaces its title; it does not create a second journal. The check-in update explicitly cancels the earlier day/time. Historical probes still ask about the original values. The separate reflection-card title is never repeated or tested in subsequent therapist text before session 11. These arbitrary labels permit exact, auditable scoring; success on them does not establish naturalistic clinical memory.

| Session | Scored or fact-changing content; remaining turns are open conversation |
|---|---|
| 1 | Name/age; introduce journal label; introduce optional check-in day/time |
| 2 | Short-lag recall of journal and check-in; introduce reflection-card title |
| 3 | Five profile-compatible open prompts |
| 4 | Name/age and original journal title |
| 5 | Replace check-in day/time; immediate current-value recall |
| 6 | Rename journal; immediate current-title recall |
| 7 | Current check-in recall; negative control for never-specified journal ink color |
| 8 | Five profile-compatible open prompts |
| 9 | Recall original canceled check-in and original journal title |
| 10 | Five profile-compatible open prompts |
| 11 | Final name/age, current journal, current check-in and reflection-card title; one unscored closing reflection |

All actual therapist inputs, ground truth and regexes are in `scenarios.json`. Only `turns[].text` is sent as therapist input. The facts registry, assertions, expected values, patterns and this protocol must never be placed in a model prompt. The final probes contain no expected title, day, time, name or age. The negative control supplies the generic response option “not specified” and is secondary; it cannot be used as evidence of substantive long-range recall.

Intermediate probes may rehearse the facts, especially when the model gives the right answer. Therefore final current-fact performance is not claimed to be unrehearsed retention from first exposure. The reflection-card probe is the prospectively withheld test: 45 scripted therapist–patient exchanges intervene between its S2:T3 introduction and S11:T4 probe. The patient may spontaneously repeat it or a full-system summary may retain it; archive these exposures. Lag fields count scripted intervening exchanges, not elapsed days or independent observations.

## Execution and isolation

1. Before the first scored longitudinal request, hash this protocol, `scenarios.json`, `verify_scenarios.py`, the runner, the runtime source and all five profile files. Record the resolved generation settings and baseline narrative. Run the deterministic verifier against the frozen profile and safety sources. It checks 275 distinct therapist inputs against all five native `SAFETY_PATTERNS`; the design preflight found zero matches.
2. Use isolated namespaces for every patient/condition. Never load production sessions, previous experimental memory, the PHQ-9 outputs, another patient's state, or the other condition's conversation.
3. Execute each full-system session through the real API path, with its own session ID and stable therapist/patient identity. Explicitly end the session, drain pending consolidation, and persist/restore through the actual runtime. A fresh process per session is permitted and exercises persistence. Preserve cumulative counters using the runtime's supported restoration mechanism; do not supply benchmark facts directly as restored state.
4. In the baseline, include all preceding exchanges from the same trajectory in each prompt. Do not reset history at a session boundary or summarize it. Save exact prompts and the full source narrative so an unintended truncation is detectable.
5. Execute session rounds 1–11. For each round, construct the ten patient–condition jobs in the fixed patient order in the JSON, then shuffle with a single Python `random.Random(20260927)` initialized before round 1. Use at most two concurrent jobs and finish the round before starting the next. Archive the fixed planned order, dispatch timestamps and actual completion order. The seed controls job scheduling, not provider sampling. Do not reorder based on outcomes or change the model/configuration during the comparison.
6. Save every visible response, raw provider metadata, prompt, session state, memory artifact, latency, token usage and error. Select the first completed visible answer. Infrastructure retries may recover requests that produced no usable completion according to the documented provider policy; preserve attempts. Do not rerun a poor factual answer until it becomes correct. A restarted completed session is a separate trajectory and cannot silently replace the first.

If a needed runtime repair is discovered after scored execution begins, retain the initial outputs and version the change; do not pool across versions as if they were one experiment. A verification failure, incomplete run or impossible condition should be reported as such rather than converted into a favorable result.

## Locked scoring

The scorer is deterministic and does not call an LLM. Normalize the complete visible answer with Unicode NFKC, casefold and whitespace collapse. The supplied `all_regex` rule must match every required pattern; competing superseded/current values listed in `forbidden_patterns` are tracked separately. A time may be written in the fixed 24-hour form or its predeclared 12-hour equivalent with AM/PM. Names and arbitrary two-word labels are matched case-insensitively; ages have numeric and written aliases.

| Outcome | Rule | Primary numerical credit |
|---|---|---:|
| `correct` | All expected patterns present; no competing-value pattern | 1 |
| `ambiguous` | Expected patterns and a competing value both present | 0 |
| `not_matched` | At least one expected pattern absent | 0 |
| `runtime_invalid` | No usable visible response or invalid runtime result | 0 in end-to-end score |

A non-match is **not** automatically a contradiction. Refusal, abstention, a valid unlisted paraphrase, format variation and factual error can all produce a non-match. Preserve the response and matched text for audit. Similarly, mentioning both old and new values may be semantically correct in a longer explanation, but is conservatively ambiguous under this locked scorer because the probe requests only one temporal state. Report the ambiguity count and all such responses. Any later human semantic review is a separately labeled sensitivity analysis; it must not overwrite locked scores or invent clinician ratings.

There are six primary atomic assertions per profile, all in session 11: name, age, current journal title, current check-in day, current check-in time and reflection-card title. This gives 30 primary assertions per condition, clustered in five profiles. A complete check-in fact requires both its day and time. The 17 secondary assertions per profile cover acquisition, intermediate recall, historical recall, repeated identity and the negative control, giving 85 secondary assertions per condition. Separate primary and secondary outcomes in reports.

## Descriptive analysis

For each patient/condition, report all six primary outcomes, score out of six, full check-in correctness, errors/ambiguities and whether all eleven sessions completed. Report the paired full-minus-flat difference for each profile and the mean of the five profile scores. Also give category-specific totals: identity (10 assertions/condition), updated facts (15) and withheld title (5), always with numerator and denominator.

Report both an end-to-end primary score with runtime-invalid responses retained as zero, and conditional accuracy among valid responses with missing counts shown. This distinguishes runtime availability from lexical recall. Include the unrounded per-profile values, input/output token use, number of model calls, provider errors and latency summaries. An aggregated turn score must not hide a missing patient or failed trajectory.

The unit for the paired description is the **profile trajectory**, not each token, turn, assertion or session. With five profiles, one run per condition and a convenience case set, do not perform significance tests, power claims, generalization claims or stochastic variance estimates. Repeated turns are dependent. No confidence interval derived by treating 30 assertions as 30 independent patients is appropriate. Equal scores, baseline superiority, mixed outcomes and runtime failures are all valid possible results.

## Deliverables and limits

The run should produce a reproducibility manifest, exact inputs/outputs and provider settings, full-system persisted memory, baseline complete history and narrative, deterministic assertion scores, an error/ambiguity table and a paired descriptive summary. The protocol verifies continuity of selected factual constraints under one controlled scenario. A larger repeated study with richer clinician-defined outcomes would be needed to support broader longitudinal or clinical claims.

Run the dataset-only verifier from the manuscript project:

```sh
python3 outputs/reviewer-tests-2026-09-27/longitudinal/verify_scenarios.py
```

For another checkout, pass `--agent-root /path/to/LLMPatients-Agent`. A successful verifier result establishes dataset consistency and source/safety matching, not model performance.
