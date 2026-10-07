# LLMPatients — complete reviewer material, 7 October 2026

This standalone directory combines the available experiments from the manuscript,
Next.js application and Python Agent repositories. It includes the previously
released evidence, both October 5 pilots, earlier psychometric and therapeutic
misstep evaluations, archived exploratory sessions, and current runtime source.
All experimental patients and dialogue are simulated. Completed clinician ratings
remain distinct from automated ratings. Original unfavorable answers, missing
outputs, failed requests and amendments are retained.

## Reproduce the saved results

Use Python 3.10 or later. The complete offline check also requires `openpyxl` for
the two completed clinician workbooks:

```sh
python3 -m venv /absolute/path/to/new/reviewer-env
/absolute/path/to/new/reviewer-env/bin/python -m pip install -r requirements-offline.txt
/absolute/path/to/new/reviewer-env/bin/python verify.py
/absolute/path/to/new/reviewer-env/bin/python reproduce.py --work-dir /absolute/path/to/new/reanalysis
```

The work directory must **not exist**. The tools preserve all release inputs and
write regenerated outputs only in that new directory. `REPRODUCED.json` records
the checks and comparisons. For a standard-library-only check, use Python without
installing packages and add `--skip-clinician` to `reproduce.py`; only Panel B is
then omitted. No offline command reads credentials or calls a model.

The historical archive covers 13,380 files and 86 lossless bundles. Its PHQ-9,
eleven-session continuity and context-policy endpoints must match the saved
results exactly. The representation pilot's 30 answers and 15 pairs are checked
against frozen inputs, then their retained ratings are reaggregated. For the
state-update pilot, saved embedding vectors rebuild 150 of 160 planned retrieval
contexts; 10 contexts were never produced. Its preserved grading snapshot contains
147 answers. The collection accepted 259 of 270 planned jobs, including 149 recall
answers, and stopped after an HTTP 402 credit error. The ungraded or missing
outputs are not silently filled. Offline reanalysis does not make this pilot a
complete experiment.

`verify.py --extract /absolute/path/to/new/materialized` restores pilots, legacy
evidence and runtime snapshots. `historical-evidence/verify.py --extract
/absolute/path/to/new/historical-data` additionally restores every historical
scientific file, including frozen implementations and complete requests; allow
about 2.4 GB for that optional extraction. The compressed release is self-contained
and does not need the original computer, Git checkout or a Git LFS client.

## Material and experiment index

| Path | Contents and purpose |
|---|---|
| `CATALOG.json` | Inventory of 24 experiment/support families, exact inputs, commands, provenance and known gaps |
| `MANIFEST.json` | SHA-256 and size of each release file and each member of the new lossless bundles; source commits and scope |
| `historical-evidence/` | Original published PHQ, continuity, context, dependency and recovery package; its own manifests and tools remain unchanged |
| `data/state-update-*.tar.gz` | Complete available October 5 state-update pilot, including partial runs, continuations, saved vectors, grades and stop records |
| `data/structure-ablation-*.tar.gz` | Original TLS failure plus completed representation continuation, prompts, requests, native usage and automated ratings |
| `data/legacy-experiments*.tar.gz` | Psychometric outputs/instruments, misstep corpus/workbooks/detector, exploratory Agent logs and notebooks |
| `data/runtime-*.tar.gz` | Audited App and Agent source, dependency manifests, synthetic profiles and deployment files |
| `data/manuscript-inputs*.tar.gz` | Patient listing used in manuscript supporting material |
| `REPLAY.md` | Fresh model-run preparation and relocation instructions |
| `VALIDATION.json`, `MODEL_SMOKE.json` | Current software/offline checks and one small live model availability test |
| `CLEANUP.json` | Cleanup accounting and recovery instructions |

The 30 single-administration questionnaire JSON records in App and Agent are
byte-identical copies of the same observations, not independent samples. The
historical dependencies, provider recoveries and exploratory scenario search also
do not add independent observations to the final endpoints. `CATALOG.json`
records those relationships. See each experiment's protocol and report for its
denominator, exclusions, simulated cases and limitations.

## New model calls and runtime checks

Exact archived requests can be submitted one at a time with `request-replay.py`,
using a private key kept outside this folder and a **new** output path. This
explicit command incurs provider charges and sends the selected simulated prompt.
It retains the original request body and does not retry or overwrite evidence:

```sh
python3 request-replay.py --request /path/to/materialized/attempt-01-request.json.gz \
  --key-file /private/path/openrouter-key.txt --output /new/path/replayed-response.json
```

This replays one request's input; it does not rebuild a whole stochastic memory
trajectory. `REPLAY.md` describes preparing new pilot runs. A provider can change
the implementation behind a model identifier, so identical future responses are
not guaranteed. The `model-smoke.py` tool sends only “Reply with the single word
READY.” and checks model availability; it does not validate patient behavior or
clinical effectiveness.

In a **new extracted App checkout**, copy `app-reviewer.env.example` from this
package to its `.env` before build/HTTP checks. That file supplies synthetic
configuration and a sentinel PostgreSQL URL; it does not create a database.
`APP_VALIDATION.md` gives the dedicated PostgreSQL setup and backend test command.
The author's retained local `.env` still uses a legacy `file:` database URL and
cannot start the current PostgreSQL-only app without an appropriate connection.
No migration of that author's database was attempted.

After extracting, install App dependencies with `pnpm install --frozen-lockfile`
and use `pnpm typecheck`, `pnpm lint`, `pnpm test:offline`, and `pnpm build`.
Agent runtime/test instructions and minimal dependency manifests are in the
extracted `runtime/agent/` source. Its offline tests exercise synthetic fixtures.
Local vLLM/XPU inference still requires the documented compatible hardware and
base image; it was not exercised by a macOS provider smoke.

Some historical exploration cannot be completely regenerated from the available
files: the notebooks reference absent HTML/test inputs and a GPU-specific early
stop, and two legacy scenario references name an unavailable patient. The restored
scenario preflight reports those gaps before inference. These records are
included for audit and labelled accordingly; no replacement data were invented.

The release excludes credentials, live databases/session stores, build caches,
slide scratch files and duplicate historical working copies. It leaves all
manuscript `.tex` files unchanged. Source code licenses are preserved in runtime
snapshots; clinical instruments and other third-party materials retain their
original terms. No new statistical, superiority, equivalence or clinical-validity
claim is made by packaging or successful software checks.
