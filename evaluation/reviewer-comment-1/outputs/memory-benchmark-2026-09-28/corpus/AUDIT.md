# Fixed source corpus: offline audit

Prepared on 2026-09-28, before any model responses to these probes were observed.
This is a prospective technical fixture freeze, not registration in a public study registry.

## Material passport

The corpus is entirely synthetic. The five persona anchors were read from the canonical YAML files in `outputs/reviewer-tests-openrouter-2026-09-27/longitudinal-source/data/patients/`. `provenance.json` records their exact paths and SHA-256 values. The source profiles were not edited. New dialogue scenes, names of practice materials, and practical arrangements are invented fixtures; they are not historical patient observations.

`generate_corpus.py` is deterministic and uses only the Python standard library. It performs no model, API, network, or clinical-service calls. There is no random sampling or unreported seed. The corpus contains no authentication data.

## Files and intended use

- Each `<patient_id>.json` contains only `patient_id`, 11 session IDs, and 12 therapist–patient exchanges per session. Every exchange has `turn_index`, `therapist_text`, and `patient_text`.
- Only those five trajectory files are source material for memory construction and response generation.
- `gold.json` contains 8 final probes per trajectory and source quotations. It is an evaluator-only artifact. Category, expected values, source selection, and scoring instructions must not enter a condition's memory, retrieval index, summary, or response prompt.
- `provenance.json` contains the common uncertainty policy to apply identically to all conditions. It is not an additional memory source.
- `SCORING.md` specifies status-sensitive interpretation of the answers. Literal matching alone is insufficient for temporal/status claims.
- `audit.json` contains machine-readable length, occurrence, source, and schema checks.
- `manifest.json` identifies the frozen file versions. Regeneration must happen only before the run, or in a new corpus version after a run has started.

## Size checks

The length measure below is `ceil(len(UTF-8 bytes)/3)` for speaker-labelled source dialogue. It is a reproducible local approximation, **not the Gemini tokenizer**. Model-reported prompt tokens and condition-specific memory budgets must be recorded separately by the harness.

| Trajectory | Sessions | Exchanges | Final history length, local units |
|---|---:|---:|---:|
| Alex Carter | 11 | 132 | 19,473 |
| Jason Smith | 11 | 132 | 19,943 |
| Daniel Isherwood | 11 | 132 | 20,090 |
| Crystal Smith | 11 | 132 | 19,764 |
| Juanita Delgado | 11 | 132 | 19,948 |
| **Total** | **55** | **660** | **99,218** |

All five histories exceed both an 8,000-unit memory budget and the requested minimum length. They remain well within the full-history model's overall context capacity; failure of the full-history baseline is not assumed or required by the fixture.

## Frozen probe distribution

Each trajectory has:

1. Two remote facts: titles of a folder and a separate cue card.
2. The current weekly private reflection slot.
3. The previous version of that same slot.
4. The practice explicitly accepted among one accepted and one declined alternative.
5. The paper exercise explicitly completed while a second remains only planned.
6. Two absent attributes: folder cover material and the content of the cue card's reverse side.

This is 40 separately presented probes: 10 remote, 5 current, 5 past, 5 agreement, 5 completion, and 10 abstention. Current and past probes share an underlying event, and all probes within a trajectory are correlated. They are **not 40 independent patient-level observations**.

Each probe should start from the same frozen end-of-session-11 state. Do not ingest an earlier probe or generated answer into later probes. Questions use the therapist's second-person perspective and contain no expected answer string.

## Source placement

The early sources use different sessions and positions across the five trajectories. This is positional variation, not a fully balanced randomized design.

| Trajectory | Folder | Card | Earlier slot | Revised slot | Agreement | Exercise plans | Completion |
|---|---|---|---|---|---|---|---|
| Alex | S1 T2 | S2 T9 | S3 T4 | S8 T8 | S5 T3 | S6 T10 | S9 T6 |
| Jason | S2 T5 | S1 T11 | S4 T7 | S9 T3 | S6 T8 | S7 T2 | S10 T9 |
| Daniel | S3 T8 | S2 T2 | S5 T10 | S10 T5 | S4 T11 | S6 T4 | S8 T12 |
| Crystal | S1 T11 | S3 T5 | S3 T9 | S7 T11 | S5 T6 | S6 T1 | S9 T2 |
| Juanita | S2 T3 | S1 T8 | S4 T1 | S10 T10 | S6 T6 | S7 T9 | S9 T4 |

Target sources are spread across early, middle, and recent sessions. Old/new slot order and planned/completed order are explicit. The remote title values and slot values are stated once each. Named alternatives recur only where needed to establish their proposals, plans, and final statuses. Later conversational filler does not restate the target names or slot values.

## Checks performed

- Exactly 5 trajectories, 11 sessions per trajectory, and 12 exchanges per session; no duplicate source positions.
- Exactly 8 probes per trajectory, including exactly 2 abstention probes.
- Every gold source resolves to a real source turn and correct speaker, and its quotation is a literal substring of that speaker's text.
- Every expected value occurs in a cited source and is absent from its question.
- All expected values are distinct from each probe's forbidden values.
- Source dialogue does not specify the two absent attributes; the canonical profiles describe neither benchmark artifact.
- All 30 new concrete item labels were searched literally in the previous reviewer archive and the previous factual-memory diagnostic archive (`json`, `jsonl`, `csv`, `md`, `py`, and `txt` files): **no matches**. Clock times were not treated as unique names.
- Persona review preserved the canonical narrative anchors: healthy communication practice for Alex; good-functioning university transition for Jason; binge eating and localized shame for Daniel; low energy/guilt/withdrawal for Crystal; shame and sensitivity to criticism for Juanita. No new diagnosis, medication change, demographic change, or acute clinical outcome is asserted.
- No provider call has been used to author, refine, select, or score this corpus.

## Limits on interpretation

This is an intentionally controlled memory test. Dialogue is hand-authored from shared therapist/response templates, with persona-specific scenes and perspectives. The 12 exchanges in each session cover one coherent topic; the introductory vignette is not repeated in every turn merely to pad the history. Nevertheless, the shared templates and unusually explicit practical status statements differ from spontaneous therapy and limit ecological validity. The names and precise clock times make source-based scoring clear, but they may be easier or harder than real conversational facts.

The fixture holds conversation evidence constant across conditions. It isolates access to past information and its representation; it does not test a whole interactive therapy system in which each condition generates different sessions. It does not validate clinical realism, therapeutic efficacy, depression measurement, identity consistency, or therapist-misstep detection.

A result should be reported for all conditions, including a full-history reference, whether or not that reference ever fails. A useful finding may be comparable answer accuracy with lower prompt cost, after counting memory construction and update costs. The corpus was not revised in response to model outcomes, and no favorable case was selected after a baseline failure.
