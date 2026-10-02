# Operational handoff — CORRECTION VERIFIED OFFLINE; LIVE STOPPED ON 429

## User intent and standing constraints

Latest request: “Ok fai le correzioni per le 11 sessioni”. Correct the memory
finalization failure and test the eleven-session application pathway. Synthetic
processing with OpenRouter google/gemini-2.5-pro is authorized. Never expose
credentials. Stop ALL live work on a new service/rate/transport failure or
invalid completion. No availability probes or automatic retries after a stop.

The corrected live run has now stopped on a new upstream 429. No test process
is running. Do not send further model requests without a new user instruction.

## Production correction completed

Repo: /Users/marco/Sites/LLMPatients-Agent. Preserve pre-existing changes.

- agent/core/factual_memory.py: strict default remains; explicit quarantine
  promotes only facts that pass all unchanged provenance/status/recall guards.
  Rejected proposals, reasons and original extraction text are durable metadata.
  A nonempty malformed JSON response is recorded as a batch error, with no
  promoted facts. Source IDs are consumed idempotently; raw evidence remains.
- agent/core/langgraph_builder.py: native finalization selects quarantine and
  derives per-session memory_consolidation status/counts from saved batches.
  Empty/provider/persistence failures still propagate and leave the session open.
- agent/api/app.py: finalized response adds memory_status complete/partial and
  memory_warnings. The session is removed only after native finalization succeeds.
- agent/utils/run_logger.py: memory_consolidation persists in the state snapshot.
- Tests: updated agent/test_session_memory.py; new agent/test_memory_quarantine.py.
- Docs: docs/factual-memory.md updated. No commit or push requested/performed.

The exact four-file runtime diff and before/after hashes are archived in
analysis/runtime-correction.patch and analysis/correction-files.json.

## Offline verification complete

86 production tests PASS: fact memory, quarantine, session/API, generation and
rate limit. Log: analysis/production-tests.log. An initial fixture-construction
error (missing required reason) was corrected before the full successful run.
22 harness tests PASS: native close/reopen, partial memory across processes,
malformed JSON quarantine, strict provider stop, pacing and decoder behavior.
See integration/offline-test.log and integration/offline-gate.json.

Captured-failure replay used the same original output and identical prompt.
Strict mode still rejects it. Quarantine saves 12 validated facts and 3 rejected
proposals (ordinals 2, 5, 11), preserving all five raw turns. Reopening skips the
completed extraction. No model calls were made for the replay. Evidence:
analysis/previous-extraction-replay.json, analysis/replay_previous_extraction.py.

Both delegated agents finished; there is no pending delegated work.

## Revised integration — stopped, not completed

New isolated archive: this directory. Same Alex profile, same 55 therapist
messages and six probes/gold as the previous control; new therapist ID and empty
memory. This is a regression test of a known failure, not independent/blind or
another baseline comparison. Adapter and transport are identical to the original.

35 frozen files; manifest SHA256:
87407dce61dba48700c91280afa2c7080181713ccd29ee10d18d72451ef72e8d
The frozen corrected source matches the production code tested offline.
Do not refreeze or edit files listed in integration/manifest.json.

Live run: 2026-09-28T15:51:45.978216UTC to15:52:56.052862UTC.
Controller exec22056 exited2. During the third patient response, OpenRouter
returned upstream429 inside HTTP200. Native record:
86442d42-2b90-4a83-b816-5b70186bed09.

- Two patient replies accepted and saved (2/55 turns).
- Zero sessions finalized (0/11); first-session finalization was not reached.
- Zero of the six scored probes observed; no longitudinal accuracy score exists.
- Six requests, five response events and one provider error.
- Zero requests after the error; no retry or parallel fallback campaign.
- Reported response cost USD0.046165; failed request reported cost0 separately.

The old finalization defect is fixed in offline tests/replay, but a live success
of the corrected finalization and the eleven-session trajectory remains unproven.

## Later resumption

Wait for explicit new user instruction before any live request. The frozen
controller refuses automatic replay of an incomplete session. A later resume
must be reviewed/documented: preserve these two accepted turns and the failed
request. Do not simply rerun the controller or silently reset this archive.
Do not regenerate existing answers to improve their accuracy.

Current original data: integration/runtime/sessions/session_01/, memory/, runs/,
request-gate.json and processes.jsonl. Structured stop: analysis/stop-evidence.json.
Report and accounting: REPORT.md, analysis/results.json. Local monitor:
analysis/monitor_integration.py (read only, appends observation log).
To regenerate summaries offline: integration/run_integration.py review, then
analysis/summarize_run.py. Neither sends model requests.

## Preserved previous work

../memory-benchmark-2026-09-28/ remains unchanged: 280 component answers and
55 preparation artifacts; full history/raw/structured each40/40, summary4k20/40,
summary8k26/40. Its original native run failed at first closure after five turns.
All335 completed artifacts and27 copied snapshot files were verified unchanged
at the current stop. Never attribute those component results to this revised
runtime or overwrite the previous failure.

## Environment

Bundled Python:
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
Production test PYTHONPATH:
/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages
Set PYTHONDONTWRITEBYTECODE=1. Agent .venv/bin/python is broken. The integration
controller supplies its worker environment and offline encoder cache. No secrets
are included in the experiment artifacts. No manuscript/TeX changes were requested.
