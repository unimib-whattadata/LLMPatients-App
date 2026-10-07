# Reviewer Comment 1 — evaluation evidence

This package accompanies the PHQ-9 repeatability, eleven-session continuity and
context-policy analyses in the LLMPatients application manuscript. All patients
and experimental interactions are simulated. It preserves the observed outcomes,
including unfavorable results, API failures, exclusions and recovery records.
No model request was made to prepare this export.

## Start here

| Manuscript index | Directory under `outputs/` | Main evidence |
|---|---|---|
| A | `reviewer-tests-openrouter-2026-09-27` | `analysis/phq-items.csv`, `phq-runs.csv`, `phq-exact-prompts.json`, `phq-validation.json`; exact source snapshot and native item responses |
| B | `memory-comparison-run-2026-09-29` | `analysis/REPORT.md`, `semantic-results.json`, `runtime-audit.json`, `proposal-context-audit.json`; 30 trajectories, 330 sessions, 1,650 exchanges, 180 probes |
| B protocol | `memory-comparison-plan-2026-09-28` | `PROTOCOL.md`, `SCORING.md`, design, clinical-content matching and pre-execution input hashes |
| C | `memory-length-stress-2026-09-30` and `openrouter-compression-length-2026-09-30` | Five-length results, selected evidence, uncompressed and plugin-enabled baseline, responses and ratings |
| D | `regional-memory-compression-2026-09-30` | Position of original facts, 50%/75% regional removals, plugin condition, retained-source checks, all 120 answers |
| E | `structured-regional-comparison-2026-10-01` | Eight-item evidence channel; 30 distinct answers mapped to the baseline conditions |
| F | `full-saved-memory-comparison-2026-10-01` | Entire saved memory; 15 accepted answers and 15 capacity-rejected contexts, completeness inventory and technical amendment |

The `reviewer-audit`, `factual-memory-tests`, `memory-benchmark` and
`memory-integration-fix` directories retain historical checks and dependencies of
the frozen protocol/source snapshots. They are not additional independent samples
of the final eleven-session comparison. Directory A also contains an earlier
longitudinal evaluation; only its PHQ-9 observations enter the repeated PHQ table.
The final eleven-session endpoint is in B: structured 85/90, full-history baseline
89/90. This export does not establish general superiority or clinical validity.

## Verify and recompute without model access

From this directory, using Python 3.10 or later:

```sh
python3 verify.py
python3 recompute.py
```

`verify.py` hashes every loose file and every compressed member against
`MANIFEST.json`. `recompute.py` uses the exported PHQ item rows, independent
automated ratings, adjudication and condition mappings to recalculate totals and
check them against the recorded aggregate analysis. It does not rerate answers.
Its denominators distinguish generated answers from shared comparisons and API
rejections. Both tools use only the Python standard library and read no credentials.

Large raw records are in `data/*.tar.gz`. To restore the original scientific
layout, choose an empty scratch directory:

```sh
python3 verify.py --extract /absolute/path/to/empty/reviewer-data
python3 recompute.py --dataset-root /absolute/path/to/empty/reviewer-data
```

Extraction preserves original paths, including `outputs/<archive>/runtime/`,
all source snapshots and full prompt payloads. Gzip is lossless disk compression;
it is unrelated to the OpenRouter context-compression treatment. Bundles are
small enough for ordinary Git; Git LFS is not required.

## Provenance and limits

`SOURCE_VERSIONS.json` identifies the current software commits separately from
the frozen experimental implementations. Original manifests, prompts, responses,
ratings and hashes are unchanged. Historical absolute paths identify the original
execution environment; they do not require that machine to inspect the bytes or
run the standard-library recomputation. Original execution scripts may require
their documented dependencies and path configuration. No future identical model
response is promised.

The export omits compiler intermediates, previews and superseded response-letter
builds. `MANIFEST.json` lists each omission and the complete scientific coverage.
An original experiment manifest may therefore mention a historical build file
not included here; the export manifest is authoritative for this release.
No files are omitted according to whether an experimental answer was correct.
The missing original PHQ execution metadata remain missing, and automated
judgments remain distinct from clinician assessments.

## Release checks

`VALIDATION.json` records the offline test counts and local environment adjustments.
`RECOMPUTED.json` is the deterministic output of `recompute.py`; the same values
were obtained from the original and exported files. The byte verifier also tests
compressed member coverage. No provider integration was rerun during publication.

## Provenance dependencies and exploratory audit

`outputs/reviewer-tests-2026-09-27/` and
`outputs/reviewer-tests-global-2026-09-27/` preserve the provider
interruptions and continuations referenced by the PHQ provenance.
They reuse observations and are not independent PHQ samples.

`outputs/baseline-scenario-search-2026-09-30/` preserves the exploratory
search after the main continuity comparison, including original paired
answers, exact-prompt replays and automated ratings. Its two selected
explicit baseline contradictions did not recur in six baseline replays.
It is an exploratory audit, not an additional planned endpoint or
evidence of systematic baseline failure. These observations are not
added to the 85/90 versus 89/90 comparison.
