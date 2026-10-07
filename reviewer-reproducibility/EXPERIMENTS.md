# LLMPatients experiments: design, results and reproduction

This guide explains the experiments preserved in the reviewer package as of
7 October 2026. It covers the original profile evaluations, the experiments
indexed A–F in the revision material, two subsequent memory pilots, and their
supporting engineering records. The experimental patient profiles and scripted
histories are simulated. Human clinician annotations and automated ratings are
identified separately.

The package preserves observations, including unfavorable results, interrupted
requests and missing outputs. The later pilots are separate from the experiments
already described in the manuscript. Creating this guide did not update the
manuscript or any `.tex` file.

## 1. How to read the evidence

The experiments address different questions:

| Study | Question | Main material |
|---|---|---|
| Original psychometric checks | Do the generated questionnaire answers describe the intended simulated profiles? | Questionnaire item responses, scores, interview outputs and scoring workbooks |
| Therapeutic misstep evaluation | How does the automatic detector compare with clinician annotations and deliberately scripted missteps? | Twenty transcripts, two completed clinician workbooks and detector outputs |
| A: repeated PHQ-9 | How variable are questionnaire totals across repeated administrations? | One hundred administrations across five profiles |
| B: eleven-session continuity | How does a structured application pipeline compare with a full-history narrative baseline? | Thirty generated trajectories and 180 probe answers |
| C: context length and compression | How do recall and request acceptance change as context grows? | Five length conditions, selected evidence, full history and a compression extension |
| D: fact position and source removal | What happens when facts occur in different regions or their sources are removed? | Three positions and eight context policies |
| E: selected structured evidence | How much information does the bounded evidence channel recover on the regional scenarios? | Thirty distinct structured answers mapped to earlier baseline answers |
| F: complete saved memory | What happens when the entire durable memory is supplied? | Complete payloads, accepted responses and capacity rejections |
| Representation pilot | Does JSON organization help relative to faithful linear text containing the same facts? | Fifteen paired comparisons |
| State/update/retrieval pilot | Does explicit currency information help compared with an ablation and two retrieval alternatives? | Five scripted histories, four conditions and a partial collection |

An **answer** is a generated response. A **category** is a complete question or
recall criterion; a **field** is one required value or relation within it.
Categories and fields from the same answer are dependent. A **trajectory** is a
sequence of sessions for one profile and repetition. A **job** may be an
extraction, summary update or recall request; job counts are not counts of
independent patients or experimental outcomes.

The five fixed profiles recur across several studies. Some experiments also
reuse source histories or previously generated comparator answers. The
24 families in [CATALOG.json](CATALOG.json) include protocols, recovery archives
and engineering checks, rather than 24 independent studies.

## 2. Original psychometric profile checks

Five profiles were assessed with six questionnaires: BES, the DSM-5-TR Level 1
cross-cutting measure, LPFS-BF 2.0, PHQ-9, PID-5-BF+M and SNAP-2. The package
contains 30 single-administration JSON records, selected SCID-5-PD interview
outputs for three profiles, and SNAP-2 scoring workbooks.

The purpose was descriptive profile coherence. A single administration cannot
establish score stability or clinical effectiveness. Some original generation
metadata were not saved, so a new administration is a new observation, even if
it uses the same profile and questionnaire.

The App and Agent copies of the 30 questionnaire JSON records are byte-identical
observations with different filenames. They must not be counted twice.

**Where to inspect:** after extraction, `legacy/app/evaluation/psycoquestionnaire/`
and `legacy/agent/data/questionnaire_results/`. Instrument definitions are in
`legacy/agent/data/questionnaires/`. The standalone coherence workbook is in
`legacy/app/analysis/coerenza_juanita.xlsx`.

## 3. Therapeutic misstep evaluation

The corpus contains 20 transcript sets, each with three short sessions. Two
clinicians annotated blinded workbooks. The automatic detector's saved outputs
identify flagged therapist turns, categories, confidence and evidence references.
The deterministic Panel B script compares its binary therapist-turn flags with
five reference definitions:

| Reference | Precision | Recall | F1 | Accuracy |
|---|---:|---:|---:|---:|
| Clinician 1 | 0.824 | 0.716 | 0.766 | 0.677 |
| Clinician 2 | 0.694 | 0.865 | 0.770 | 0.733 |
| Either clinician positive | 0.834 | 0.719 | 0.772 | 0.683 |
| Both clinicians positive | 0.684 | 0.863 | 0.763 | 0.727 |
| Deliberately scripted misstep turns | 0.679 | 0.873 | 0.764 | 0.730 |

Each comparison covers the same 300 therapist turns. The reference definitions
are alternative labels for those turns, not five independent datasets. The
clinicians' judgments and the scripted reference serve different purposes.

The condition key and transcript generation metadata support reviewer audit.
They must be omitted when preparing a new blinded annotation exercise. Repeating
human annotation or running a new detector produces new judgments; recomputing
the saved confusion matrices produces the recorded metrics.

**Where to inspect:** `legacy/app/evaluation/misstep/`, especially `transcripts/`,
`completed/` and `automatic_detector/`. The package's `reproduce.py` runs
`compute_panel_b_metrics.py` on an extracted copy and checks the output bytes.

## 4. A: PHQ-9 repeatability

Twenty administrations were retained for each of five profiles, giving
100 administrations. The item table preserves 1,000 answers: nine symptom
items and a tenth functional-impact item per administration. The reported
PHQ-9 total sums symptom items 1–9.

| Profile | Administrations | Mean total | Sample SD | Observed range | Totals at least 10 |
|---|---:|---:|---:|---:|---:|
| Alex Carter | 20 | 1.00 | 0.000 | 1–1 | 0/20 |
| Crystal Smith | 20 | 25.60 | 0.821 | 24–27 | 20/20 |
| Daniel Isherwood | 20 | 9.90 | 0.308 | 9–10 | 18/20 |
| Jason Smith | 20 | 3.05 | 0.605 | 2–4 | 0/20 |
| Juanita Delgado | 20 | 26.95 | 0.224 | 26–27 | 20/20 |

These are repeated outputs from fixed simulated profiles. The counts describe
the observed answers and are not diagnoses. Missing metadata from the original
single-administration collection remain unresolved; these repetitions do not
reconstruct an unavailable original model revision or explain every reported
discrepancy.

**Evidence:** `historical-evidence/outputs/reviewer-tests-openrouter-2026-09-27/`,
including `analysis/phq-items.csv`, `phq-runs.csv`, `phq-exact-prompts.json` and
`phq-validation.json`. The regional/global recovery archives reuse earlier
observations and do not add independent PHQ administrations.

## 5. B: continuity across eleven sessions

Five profiles were run three times in each of two conditions: 15 pairs and
30 trajectories. Each trajectory contained eleven sessions of five generated
therapist/patient exchanges. The collection therefore contains 330 sessions,
1,650 exchanges and 180 answers to six recall probes.

Both conditions received an identical common clinical-profile block and the
same scripted therapist inputs and patient-generation settings. Their histories
contained the responses generated within their own condition.

- **Structured application pipeline:** state updates, bounded retrieval,
  consolidation and persistent memory, with the experimental common-profile
  adapter.
- **Full-history narrative baseline:** the common profile plus its complete
  dialogue history, reread from disk for each new session.

The probes covered persistent identity, a distant fact, appointment corrections,
venue replacement, completed versus planned activity, and abstention about an
unstated detail.

| Condition | Successful probes | Correct fields |
|---|---:|---:|
| Structured pipeline | 85/90 | 175/180 |
| Full-history baseline | 89/90 | 178/180 |

The baseline had more successful probes in this collection. The comparison
evaluates application packages with different context policies; it does not
isolate the causal contribution of structured facts. Profiles, repetitions and
probe answers are dependent. No superiority or equivalence conclusion follows
from these descriptive counts.

**Evidence:** the protocol and scoring rules in
`historical-evidence/outputs/memory-comparison-plan-2026-09-28/`, and the run's
`analysis/semantic-results.json`, runtime audits, prompts, answers and ratings in
`historical-evidence/outputs/memory-comparison-run-2026-09-29/`.

## 6. C–F: context and memory-policy experiments

These component experiments use saved histories and six recall categories per
generated answer. They examine the information delivered to the model rather
than replaying the complete web application. Their shared source material and
reused outputs must be respected when counting observations.

### C. Increasing context length

The length stress experiment planned five profiles in two conditions at five
source-context lengths: 50 requests. Forty answers were generated; ten
full-history requests were rejected because of context capacity.

| Local source-context target | Full-history categories correct | Selected-evidence categories correct |
|---|---:|---:|
| Original history, approximately 11–13 thousand tokens | 30/30 | 17/30 |
| 64,000 | 30/30 | 17/30 |
| 256,000 | 30/30 | 15/30 |
| 900,000 | Unavailable: five capacity rejections | 14/30 |
| 1,200,000 | Unavailable: five capacity rejections | 13/30 |

The selected-evidence condition sends a bounded retrieved subset. The source
lengths are not the lengths of its final prompts. A rejected request has no
semantic accuracy score and must not be represented as 0% recall.

The subsequent OpenRouter context-compression extension generated 25 answers
and scored 149/150 categories and 299/300 fields. Its category counts across
the same five lengths were 30/30, 29/30, 30/30, 30/30 and 30/30. Comparator
answers from the earlier experiment were reused. The provider's transformed
context is not directly observed.

**Evidence:** `memory-length-stress-2026-09-30` and
`openrouter-compression-length-2026-09-30` under
`historical-evidence/outputs/`.

### D. Fact position and regional source removal

Five profiles were tested with the original facts positioned at the start,
middle or end, under eight policies: intact history, six local 50%/75% regional
removals, and a provider compression condition. All 120 answers were collected.

The intact 64,000-token condition scored 20/20 positive-recall categories at
each position. At 1.2 million source tokens with the provider plugin, those
counts were 20/20 at the start, 0/20 in the middle and 20/20 at the end.
The local-removal audit recorded 542/542 correct fields when sufficient canonical
sources remained and 1/403 when those sources were removed.

These repeated fields are dependent. Local deletion and provider compression
are different treatments. The retained-source audit concerns inspectable local
inputs; it does not reveal the provider plugin's transformed context.

**Evidence:** `historical-evidence/outputs/regional-memory-compression-2026-09-30/`,
including condition mappings, source-retention checks, requests and ratings.

### E. Bounded structured evidence on the regional scenarios

Thirty distinct structured answers were generated using the selected evidence
channel, bounded to eight items and 1,800 conservatively estimated memory tokens.
They were mapped to 120 earlier baseline answers. Each shared structured answer
must be counted once in the unique-generation totals.

The saved structured answers scored 90/180 categories and 167/360 fields.
For the four positive-recall categories, they scored 31/120 categories and
78/270 fields. One 64,000-token structured answer is reused across seven
baseline policies.

Access to an intact structured archive versus a locally truncated baseline
creates unequal information availability. These results therefore require the
condition mappings and per-generation counts, rather than treating every mapped
comparison as a new paired generation.

**Evidence:** `historical-evidence/outputs/structured-regional-comparison-2026-10-01/`.

### F. Supplying the complete saved memory

This extension supplied the entire durable memory instead of the bounded
retrieval channel. Of 30 attempted contexts, 15 produced answers and 15 were
rejected by the API's 8 MB request limit. The accepted answers scored 90/90
categories and 180/180 fields; positive recall scored 60/60 categories.

Accepted prompts used 212,789–226,527 provider-native tokens. The mapped dataset
contains 105 evaluable comparisons, using previously generated baseline outputs.
Those comparisons are not 105 new generations. Accuracy is unavailable for the
15 rejected contexts.

This experiment documents an accuracy/capacity tradeoff for complete saved
memory under the tested conditions. It does not establish that the bounded
production retrieval channel achieved the same result.

**Evidence:** `historical-evidence/outputs/full-saved-memory-comparison-2026-10-01/`,
including both runtime records, the completeness inventory and technical amendment.

## 7. Representation pilot: JSON versus faithful linear text

Five profiles supplied accepted fact inventories from the first nine archived
sessions. Each inventory contained 202–237 facts, including historical versions.
The same facts were rendered as an indented JSON array and as reversible linear
sentences preserving values, chronology, speaker, sources, currency and links.
Neither representation was selectively truncated or given additional facts.

Five profiles × three repetitions × two representations produced 30 answers,
forming 15 pairs. Six questions were batched in each request. Both full prompts
had to fit a 128,000-token local cap; their actual provider-native token counts
differed. Gemini 2.5 Pro was requested through OpenRouter. An initial TLS failure
was followed by the documented continuation that completed collection.

| Representation | Fully correct answers | Correct categories | Correct fields |
|---|---:|---:|---:|
| Structured JSON | 15/15 | 90/90 | 180/180 |
| Faithful linear text | 15/15 | 90/90 | 180/180 |

No representation advantage was observed on these cases. Both forms retain
temporal information, so this is a format comparison, not an ablation of temporal
knowledge. The ceiling result, five fixed developer-known profiles and dependent
repetitions limit generalization; the tie does not establish equivalence.

**Evidence after extraction:**
`pilots/structure-ablation-pilot-2026-10-05/`, particularly
`continuations/tls-ca-01/analysis/results.json`, the frozen protocol, input-parity
checks, prompts, response receipts and masked automated ratings.

## 8. State/update/retrieval pilot

Five fictional histories were written before collection. Each contains eleven
sessions of five exchanges, giving 55 sessions and 275 exchanges. Extraction
and rolling-summary updates replayed the predetermined dialogue. Eight final
questions were then planned separately for each of four conditions:

| Condition | Memory supplied for recall |
|---|---|
| A: native structured memory | Accepted facts, version/currency information and eligible raw-turn fallback; up to eight selected evidence items |
| B: currency ablation | The same extraction and archive, with currency labels and the currency ranking tie-break removed |
| C: raw-dialogue retrieval | Whole attributed turn pairs retrieved using BM25 and MiniLM, with rank fusion |
| D: rolling summary plus retrieval | A query-independent summary updated each session, supplemented by raw-dialogue retrieval |

All conditions used a 1,800-token estimated memory allowance. D could allocate
up to 900 estimated tokens to its summary. Equal estimated caps do not imply
equal actual provider token counts. The ablation retains chronology, speaker,
assertion status and other structure; it tests the two specified currency
mechanisms rather than removing the entire memory architecture.

### Collection status versus scored results

The plan contained 270 jobs: 55 extraction jobs, 55 summary jobs and
160 recall jobs. The latest saved collection accepted **259 jobs**, including
all 110 updates and **149 recall answers**. Eleven recall answers remain missing.
Collection stopped after an HTTP 402 credit error.

The preserved grading snapshot contains **147 answers**. Two later accepted
answers are ungraded and do not enter the following table:

| Condition | Primary questions correct / available | All questions correct / available | Fields correct / available |
|---|---:|---:|---:|
| A: native structured memory | 17/17 | 37/37 | 65/65 |
| B: currency ablation | 17/17 | 37/37 | 65/65 |
| C: raw-dialogue retrieval | 17/17 | 36/36 | 64/64 |
| D: summary plus retrieval | 17/17 | 37/37 | 65/65 |

Twenty primary questions and 40 total questions per condition were planned.
The primary contrast was the mean within-history A-minus-B difference across
all five histories. That comparison is complete in only three histories; their
observed differences are zero. The prespecified five-history mean remains
unavailable. Correctness on the available subset neither completes the planned
comparison nor establishes equivalence.

The saved-vector reconstruction checks 150 constructed retrieval contexts.
One constructed request has no accepted answer; ten planned contexts were
never constructed. This differs from the older report body's grading-checkpoint
counts of 257 jobs, 147 answers and 148 contexts. Use `run-state.json` for the
latest collection and the retained 147-answer snapshot for the reported scores.

The histories share an event template and repeated corrections, with one
stochastic memory build and one answer per cell. The pilot may have a ceiling
effect. Ratings were automated and masked; agreement between graders is not
clinical validation. The test replays memory components rather than executing
the complete application.

**Evidence after extraction:** `pilots/state-update-retrieval-pilot-2026-10-05/`.
Inspect `PROTOCOL.md`, `run-state.json`, `review/rating-v4/analysis.json`,
`runtime/embedding-cache.json.gz`, retrieval records, exact requests and
continuations. `reproduce.py` restores the 147-answer grading snapshot from
`continuations/automatic-control-2026-10-06/baseline-147.tar.gz` before aggregation.

## 9. Historical engineering records and exploratory material

The following families preserve chronology and explain how the later studies
were prepared. They must not be added to the final study denominators:

| Family or material | Role and limitation |
|---|---|
| `reviewer-audit-2026-09-27` | Prior source/runtime diagnosis |
| `factual-memory-tests-2026-09-28` | Extraction, validation and regression evidence, including failure cases |
| `memory-benchmark-2026-09-28` | Earlier scripted component benchmark; its separate integration attempt stopped at the first session closing |
| `memory-integration-fix-2026-09-28` | Integration amendments, safety-recall repair and recovery lineage |
| `memory-comparison-plan-2026-09-28` | Frozen inputs, common-profile construction, protocol and scoring rules for B |
| Earlier longitudinal outputs in `reviewer-tests-openrouter-2026-09-27` | A previous comparison with a different protocol; separate from B |
| `reviewer-tests-2026-09-27` and `reviewer-tests-global-2026-09-27` | Interrupted provider prefixes and recoveries reused by A |
| `baseline-scenario-search-2026-09-30` | Exploratory selected contradictions; those two contradictions did not recur in six baseline replays |
| Legacy Agent scenario suite | Restored current evaluator; preflight identifies two scenarios referencing missing `juanita_perez_001` |
| Legacy sessions and memory ledgers | Fifteen released run logs and 16 memory ledgers; some profile variants are unavailable |
| Data-management and inference notebooks | Historical exploration with missing HTML/test inputs; the inference notebook also selects GPU 1 and stops after its first persona |
| Manuscript patient listing, coherence workbook and archived anonymous runtime | Supporting inputs or source provenance, rather than additional outcome datasets |

One unpublished manual API log and its untracked profile were excluded because
their simulated-data provenance could not be established. The files remain
preserved locally. This exclusion concerns material outside the frozen study
cohorts; it is not selection according to experimental correctness.

## 10. Reproduce the recorded results

Run these commands **from this package directory**, using Python 3.10 or later.
The offline workbook calculation also needs `openpyxl`:

```sh
python3 -m venv /absolute/path/to/new/reviewer-env
/absolute/path/to/new/reviewer-env/bin/python -m pip install -r requirements-offline.txt
/absolute/path/to/new/reviewer-env/bin/python verify.py
/absolute/path/to/new/reviewer-env/bin/python reproduce.py \
  --work-dir /absolute/path/to/new/reanalysis
```

The work directory must not exist. The tools verify hashes, extract into that
new directory and recalculate saved PHQ totals, continuity/component endpoints,
pilot ratings and clinician Panel B. The state pilot's partial collection remains
partial. They make no model calls and perform no new semantic grading.
For the standard-library checks alone, add `--skip-clinician` to `reproduce.py`.

To inspect complete inputs separately:

```sh
python3 verify.py --extract /absolute/path/to/new/materialized
python3 historical-evidence/verify.py --extract /absolute/path/to/new/historical
```

The first command restores `pilots/`, `legacy/` and `runtime/`. The second
restores the historical `outputs/` tree, including compressed raw records and
frozen source. Gzip is lossless file packaging; it is unrelated to the provider's
experimental context-compression treatment.

The current Agent source and legacy datasets are stored separately. Original
questionnaire scripts expect `data/questionnaires/` under the Agent root, and
the additional legacy tests expect `tests/`. In a fresh scratch checkout, copy
those directories from `legacy/agent/` into `runtime/agent/` before invoking
the corresponding original tools. Use new output directories for generation
and preserve the released session records.

For fresh generation, follow [REPLAY.md](REPLAY.md). `prepare-replica.py` creates
new pilot inputs and documents environment-path relocation. `request-replay.py`
submits one preserved request and saves a new response. New generations require
provider access, incur charges, and need new ratings. An identical model name
does not guarantee the original provider implementation or identical answers.

## 11. Software validation is a separate evidence layer

[VALIDATION.json](VALIDATION.json), [APP_VALIDATION.md](APP_VALIDATION.md) and
[AGENT_VALIDATION.md](AGENT_VALIDATION.md) describe the software audit: App
type/lint/build checks, HTTP checks, isolated PostgreSQL tests, 109 Agent tests
and a real MiniLM CPU check. Synthetic fixtures and fake providers were used
where specified. The separate Gemini availability request returned `READY`.

Those checks establish the tested software contracts and provider availability.
The scientific experiments above address different outcomes. Neither passing
software tests nor correct recall on small simulated cases establishes clinical
effectiveness. The local App still needs a PostgreSQL connection rather than its
legacy SQLite URL, and the recorded workstation Agent environment must be
recreated using the provided dependency instructions.

Use [README.md](README.md) for package setup, [CATALOG.json](CATALOG.json) for
the full family inventory, [MANIFEST.json](MANIFEST.json) for byte coverage, and
[OFFLINE_REPRODUCTION.json](OFFLINE_REPRODUCTION.json) for the verified saved-data
reanalysis. Original protocols, receipts, ratings and amendments remain the
authoritative evidence for details beyond this guide.
