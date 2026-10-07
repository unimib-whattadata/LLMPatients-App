# Repeating the recorded experiments

The release preserves original prompts, inputs, source snapshots, configurations,
answers, failures and ratings. Offline reconstruction uses these saved observations
and should reproduce the recorded results exactly. A fresh provider run repeats
the procedure and produces new observations: Gemini responses and service
availability can change, and the original provider seed is not available.
Repeated clinician annotation also produces new human judgments.

## Materialize a working copy

From the root of the published `reviewer-reproducibility` folder:

```sh
python3 -B verify.py --extract /absolute/path/to/new/dataset
python3 -B historical-evidence/verify.py --extract /absolute/path/to/new/historical
```

Both destinations must be new. The first command materializes `pilots/`, `legacy/`
and the current runtime snapshots. The second restores the historical experiments
under `outputs/`. The recorded archive bytes and hashes remain unchanged.
`reproduce.py --work-dir /absolute/path/to/new/offline-check` performs the release's
supported offline checks and recalculations without model access.

## Send one exact historical request

The following explicit action sends one saved JSON request to OpenRouter, with
the original model, messages and generation parameters. It saves a new response
and does not overwrite the original or retry automatically:

```sh
python3 -B request-replay.py \
  --request /absolute/path/to/attempt-01-request.json.gz \
  --key-file /external/private/openrouter-key.txt \
  --output /absolute/path/to/new/replayed-response.json
```

Use an actual `*-request.json.gz` from the materialized pilots or a request-body
file restored from the historical export. Add `--ca-file /path/to/cacert.pem` if
the interpreter needs the bundled public certificate roots. Credentials belong
in an external file; they are excluded from the release. Full payloads include
the experimental prompt and parameter settings, while authentication headers
are added only during the new request. A newly available backend with the same
model name is not proof of an immutable original model revision.

`model-smoke.py --key-file /external/private/openrouter-key.txt --output
/absolute/path/to/new/smoke.json` is a small availability check. It is separate
from the scientific experiments.

## Prepare a complete fresh structure pilot

This pilot compares two complete representations of identical accepted facts.
The original first attempt failed before inference; the TLS continuation contains
all 30 accepted answers. Its saved ratings give 90/90 categories in each arm.

The prepare-only helper verifies the frozen source hashes and copies prospective
inputs into a fresh directory. It copies no accepted answers, old state or locks,
does not read a key and makes no network calls:

```sh
python3 -B prepare-replica.py --kind structure \
  --source-root /absolute/path/to/new/dataset/pilots/structure-ablation-pilot-2026-10-05 \
  --destination /absolute/path/to/new/structure-repetition

cd /absolute/path/to/new/structure-repetition
python3 -B verify.py --root .
```

Inspect `REPLICA_AMENDMENT.json` and `FREEZE.json`. The collector uses Python's
standard library, the original prompts and schedule, and the bundled public CA
certificate. The original saved local token counts are preserved. An explicit
fresh collection is:

```sh
python3 -B run.py --root . --key-file /external/private/openrouter-key.txt
```

The configuration retains the original 30 calls, decoding settings, stopping
policy and USD 15 budget cap. Check current provider availability and pricing
before choosing to run it. The collector refuses existing runtime state.
After collection, create new masked cards with `review-v2.py cards --root .`,
obtain new independent ratings under the recorded rubric, and run
`review-v2.py analyze --root .`. Original ratings cannot be applied to new answers.

## Prepare a complete fresh state/update/retrieval pilot

The archived collection is partial: 55 extractions, 55 summaries and 149 of 160
planned recall answers were accepted. The most recent saved grading snapshot
contains 147 answers; two subsequent answers are ungraded. HTTP 402 errors and
all prior continuations remain in the package. A fresh repetition starts from
the frozen scripted histories, rather than continuing these accepted outcomes.

The recorded generation runtime is Python 3.12.14 with
`sentence-transformers==5.2.2`, `transformers==4.53.3`, `torch==2.9.0`,
`numpy==2.3.5`, `scipy==1.16.2` and `sentencepiece==0.2.0`. Create a separate
Python 3.12 environment and record its complete installed package versions.
The helper does not install dependencies. Supply the environment's own
`site-packages` directory and interpreter below. A separate SciPy overlay can be
supplied with `--scipy-overlay`; otherwise the supplied environment provides it.

The semantic encoder is `sentence-transformers/all-MiniLM-L6-v2`, revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. Download that specific revision into
a reviewer-controlled local snapshot before preparation. The helper checks every
file against `source/embedding-source-manifest.json`, including the weight hash
`53aa51172d142c89d9012cce15ae4d6cc0ca6895895114379cacb4fab128d9db`.
Fresh collection loads that snapshot locally on CPU.

`source/tokenizer.model` is already included. Its SHA-256 is
`1299c11d7cf632ef3b4e11937501358ada021bbdf7c47638d13c0ee982f2e79c`.
It is the saved SentencePiece model used for the original local counts, with
calibration and model provenance in `source/runtime-calibration.json`.
Saved-vector offline reconstruction needs neither encoder weights nor a tokenizer
installation.

```sh
python3 -B prepare-replica.py --kind state \
  --source-root /absolute/path/to/new/dataset/pilots/state-update-retrieval-pilot-2026-10-05 \
  --destination /absolute/path/to/new/state-repetition \
  --embedding-snapshot /absolute/path/to/local/MiniLM-snapshot \
  --site-packages /absolute/path/to/python312-env/lib/python3.12/site-packages \
  --python-executable /absolute/path/to/python312-env/bin/python3
```

This creates a new freeze with only declared environment paths rebased:
`embedding_snapshot`, `agent_site_packages`, `scipy_overlay` and `python`.
It preserves model, decoding, schedule, memory budgets, source implementations,
scripted cases and private gold. Original `FREEZE.json` and `config.json` are
copied into `provenance/`; the original source directory is unchanged.
Inspect the amendment and record the actual runtime package versions before
explicitly collecting:

```sh
cd /absolute/path/to/new/state-repetition
/absolute/path/to/python312-env/bin/python3 -B run.py \
  --root . --key-file /external/private/openrouter-key.txt
```

The collector plans 270 jobs, retains all attempts and stops on unresolved
failures. The original USD 15 budget and timeouts remain configured. Resume a
new repetition only after its checkpoint is reviewed, with the collector's
explicit `--resume` option; preparation never resumes a job. Recreate grading
cards with the copied `review.py` and rate only the new answers.

## Original historical collection entry points

Run these only in separately prepared fresh copies with a recorded relocation
amendment and new output directories. They describe the original collection
procedures; invoking them against the archived runtime would refuse a new launch
or act as a continuation. The portable single-request tool above can repeat an
individual preserved request without adapting these controllers.

| Experiment | Original entry point, from its own restored directory |
| --- | --- |
| A, repeated PHQ-9 | `python3 scripts/complete_phq9_openrouter.py --workers 1` |
| Earlier longitudinal comparison associated with A | `python3 scripts/run_longitudinal_openrouter.py --workers 1` |
| Memory component benchmark | `python3 scripts/benchmark.py run` |
| Separate benchmark integration test | `python3 integration/run_integration.py run --live` |
| B, final eleven-session comparison | `python3 paired_runner.py live` |
| C, original length stress | `python3 continuation.py live` |
| C, context-compression extension | `python3 experiment.py live` |
| D, regional source removal | `python3 runner.py live` |
| E, structured evidence on the regional scenarios | `python3 runner.py live` |
| F, complete saved memory | `python3 runner_v2.py live` |

The corresponding folders are listed in `historical-evidence/README.md` and the
release inventory. The earlier regional/global PHQ archives are reused prefixes
of A. E and F reuse mapped baseline answers from D. These are not new independent
samples.

Historical environment records include `runtime-environment.json`,
`dependency-versions.json`, `environment.json`, `preparation.json`, the source
manifests and original requirement files. Use the record belonging to the run;
the current App/Agent requirements do not replace frozen experimental versions.
Some older controllers hardcode the author's interpreter, Agent checkout,
`site-packages`, temporary SciPy overlay or MiniLM cache. Copies need explicit
rebasing to the reviewer environment and a new manifest before collection.
Historical manuscript-root `outputs/` references map to the restored
`outputs/` tree. Supply the provider key externally via
`OPENROUTER_API_KEY_FILE` where supported. Preserve original source hashes in
the relocation record; do not change the released archives.

For original preparation that recalculates context lengths, the recorded SDK is
`google-genai[local-tokenizer]==2.25.0`. The supplied state-pilot tokenizer has
the original model hash; the structure preparation script's old temporary cache
path requires a declared rebasing on a separate copy. Original API safety/top-k
settings and endpoint transitions are documented in the respective amendments;
do not silently replace them with current defaults.

## Legacy experiments and known gaps

The misstep package includes all 20 transcripts, both completed clinician
workbooks, the automatic detector outputs and the Panel B recalculation script.
`compute_panel_b_metrics.py` uses `openpyxl` and saved observations only. A new
detector run uses the supplied App source and lockfile plus a configured Vertex
provider; its results can differ from the recorded detector version. The original
blinded-workbook scripts require `@oai/artifact-tool`, which is not in the App's
package manifest. Completed workbooks and the condition key are peer-review
evidence; a new blinded rater package must omit that key and the transcript
generation metadata.

The 30 original questionnaire JSON outputs in the App and Agent are byte-identical
copies with different filenames. They preserve item answers, scores and completion
times. Original full prompts/model revision/seed were not saved. Repeating
`scripts/run_questionnaire.py` with a configured Agent creates a new administration;
use a fresh source/output copy. The SNAP-2 workbooks and SCID interview PDFs remain
supporting evidence. The batch shell script requires Bash with `mapfile` support.

Two Agent notebooks are preserved as historical exploration. Their source HTML
and `data/source/test.json` inputs are absent; the inference notebook also selects
GPU 1 and intentionally stops after its first persona. They cannot presently
reproduce a complete historical study. The initial scenario suite imported the
absent `agent.eval` module. The current runtime restores that engine; its
`scripts/run_eval_suite.py --validate-only` command reports two scenarios referring
to the still unavailable patient `juanita_perez_001` before inference. Frozen
historical artifacts remain distinct from this software repair.

The release retains 15 legacy Agent session logs and all 16 inventoried memory
ledgers. One unpublished manual API log and its untracked UUID profile are
excluded because their simulated-data provenance could not be established.
Other manual logs refer to absent `normal_user_001` and Juanita profile variants.
These exploratory sessions cannot be completely regenerated from the released
profiles; their precise source gaps are recorded in `CATALOG.json`. No successful
run or missing input has been invented.
