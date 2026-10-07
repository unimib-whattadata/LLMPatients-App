# Operational handoff — STOPPED on new429 at session9 turn1

## Current authorized work is stopped

Latest user request “Procedi” authorized resume-02 after the previous empty
classifier STOP. It ran from s06t02 through completed session8, then hit a NEW
upstream429 on the first classification of s09t01. Controller exec46222 exited2;
last worker is dead. Zero requests after the error. Do not send further model
requests or availability probes without a later user instruction.

Current retained trajectory: resume-02/runtime/. Previous integration/runtime
and resume-01/runtime are immutable. New process journal is
resume-02/runtime/processes-resume-02.jsonl. Active stop is runtime/STOP; the
preceding stop is retained as runtime/previous-stop-resume-01.json.

## Live results and limits

- 8/11 native sessions finalized, all with partial consolidation;40/55 accepted
  patient turns, each persisted as a unique raw source.
- 162 validated fact entries,20 rejected proposals,zero invalid JSON batches.
- Fresh-process restoration of cumulative count, summary, reflection and memory
  status verified for sessions2–9. Session9 restored40 before its first call.
- 0/6 prespecified semantic probes reached: identity in10, delayed memory in11.
  No longitudinal correctness score or baseline superiority claim is supported.
- All26 preexisting accepted turns and firstfive finalized session artifacts
  remained unchanged. Current attempt generated14 additional accepted replies.
- Current attempt41requests,40responses,one new error. Cumulative continued copy
  counted once:116requests,114responses,two provider errors. The earlier empty
  STOP remains one of the response events and its cost remains included.
- Cumulative reported response cost USD1.4976675; errorcost0. Previous total
  USD0.96056125. New response cost USD0.53710625.

## Latest stop and later continuation

Stopped2026-09-28T18:18:41.954586UTC. Stage classify_topic_and_emotion, turn s09t01.
Native record31abeada-0bb5-4670-bf5c-805208ebc506: HTTP200, upstream429,
OpenRouterInBandError converted to IntegrationAbort by the frozen adapter.
No availability retry, fallback provider or parallel campaign was run.

A later authorized continuation should reuse all40 accepted turns and start at
s09t01. IMPORTANT: native ledger already contains session9 with its original
run_id/started_at but ZERO turns and an EMPTY final_state. RunLogger.restore_state
correctly falls back to the closed session8 snapshot(total40,last_episode40).
Attach the existing empty open session9 at logger index8 and override request
identifiers normally through API payload; do not duplicate or delete that entry.
Do not assume the open entry's final_state holds the prior snapshot. No current
session9 raw sources or pending episode work exist. Preserve all eight closed
sessions, their results/journals, and the failed native request.

The current resume-02 controller is frozen for its26-turn checkpoint and cannot
be rerun. A later resume needs a separate documented continuation, retiring only
the historical STOP in a copied runtime. Never modify/refreeze older archives or
regenerate accepted correct/incorrect answers to improve scores.

## Code, tests and integrity

Production correction remains unchanged in /Users/marco/Sites/LLMPatients-Agent:
strict factual validation by default, explicit quarantine at native finalization,
durable rejected proposals+original extraction, API/ledger memory_status. All
provider/empty/persistence failures still stop. Source35-file snapshot unchanged.
Initial86production+22integration tests passed; resume-01 added5tests. Resume-02
passed6network-blocked tests plus targeted rerun of its process-journal case:
26→30 turns, four new replies, next session7 restores30, original data immutable,
corruption/STOP/provider/empty completion fail closed. Logs/gate in resume-02/.

A separate shared-context agent reviewed resume-02 and found an initial launch
journal race. Fixed before freeze: use new processes-resume-02.jsonl, leaving
old processes.jsonl byte-identical. The targeted offline test passed. Recovery
is an explicit experimental adapter, not proof of automatic production recovery.

Verified unchanged:35original frozen files,4resume-01 files,4resume-02 files,
32preceding runtime files,335prior completed component artifacts,27benchmark
snapshot files,20first-stop snapshot files,51resume-01 snapshot files.
Evidence: resume-02/integrity-check.json. Original raw prefixes and40sourceIDs
verified. No code/manual answer repair after observing this stop.

Current report: resume-02/REPORT.md. Metrics: resume-02/results.json.
Stop evidence: resume-02/stop-evidence.json. Frozen manifest/protocol/lineage in
resume-02/. Latest snapshot: resume-02/snapshots/stop-20260928T181841Z/.
Local-only export: bundledPython resume-02/resume_integration.py review.
Local-only summary: python3 resume-02/summarize.py. Observer: resume-02/observe.py.
No manuscript/TeX edits,commit,push,goal-tool changes or live jobs remain pending.

Original component comparison remains in ../memory-benchmark-2026-09-28:
280answers,55prep artifacts; full/raw/structured40/40 per condition,
summary4k20/40,summary8k26/40. No structured superiority over raw/full established.
Do not attribute those component scores to corrected native integration.

## Environment and constraints

OpenRouter google/gemini-2.5-pro only; synthetic processing authorized. Keyfile
/Users/marco/Sites/LLMPatients-Agent/config/openrouter-api-key.txt; never print it.
Stop on first NEW provider/rate/transport/invalid-completion failure; no automatic
availability retries. Only existing single4096→8192 MAX_TOKENS recovery allowed.
BundledPython:
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
Agent .venv/bin/python broken; frozen workers supply SciPy overlay,sitepackages,
offline encoder cache and PYTHONDONTWRITEBYTECODE=1.
