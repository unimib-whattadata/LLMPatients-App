# Baseline with automatic OpenRouter compression

Extension of the sealed `../memory-length-stress-2026-09-30` experiment,
using the same five patient profiles, input files and Gemini 2.5 Pro settings.
The only outgoing request change is `plugins: [{"id":"context-compression"}]`.
The archive remains a single serialized user message; no local summary is added.

## Files
- `PROTOCOL.md`: scope, measurements, fixed scoring and stopping rules.
- `schedule.json`: 25 cells and absolute references/hashes for unchanged prompts.
- `manifest.json`, `source-hashes.json`: files frozen before live calls.
- `experiment.py`: offline preparation, preflight, freeze, collection and export.
- `openrouter_transport.py`, `timeout_retries.py`, their `.patch` files:
  isolated copies adding the plugin to transport and retry body verification.
- `preflight.json`: 25 request comparisons and error-classification fixtures;
  preflight uses a fake connection and a dummy credential, with no network calls.
- `runtime/`: state, exact native request/response archives and retry journals.
- `runtime/answers.jsonl`: committed outcomes; failed requests retain no invented score.
- `review/`: blinded exports, separate ratings, private mapping and execution record.
- `analysis/results.json`: semantic accuracy, availability, per-profile and field data.
- `analysis/token-analysis.json`: wire equality, actual token counts and calibrated
  uncompressed comparisons. Above 256k, no accepted native uncompressed control exists.
- `REPORT.md`: findings and limitations; `final-manifest.json`: final integrity record.

The previous control outcomes are reused from
`../memory-length-stress-2026-09-30/runtime-02/answers.jsonl`.
Their source prompts, gold and source hashes remain in that sealed experiment.
Nothing is overwritten there.

## Offline reproduction of analysis

From the repository root, after ratings are complete:

    python3 outputs/openrouter-compression-length-2026-09-30/analysis/summarize.py compare
    python3 outputs/openrouter-compression-length-2026-09-30/analysis/summarize.py score
    python3 outputs/openrouter-compression-length-2026-09-30/analysis/token_analysis.py

`compare` creates blinded adjudication cards only if ratings disagree. `score`
requires adjudication where necessary. These commands perform no model calls.
They regenerate derived timestamps/files; compare values with the archived results
rather than expecting regenerated file hashes to match the sealed final export.

The collection harness refuses to restart an existing runtime. Replication requires
a separate output directory and a reviewed source-path update; do not delete a
STOP marker or reuse an uncertain request. Live execution used the existing
`paired_runner.worker_environment()` with bundled Python and the restored
SciPy 1.16.3 overlay. The experiment does not change application runtime defaults.

OpenRouter's documented operation is middle removal/truncation, not semantic
summarization: https://openrouter.ai/docs/guides/features/message-transforms
