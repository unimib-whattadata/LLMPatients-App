# Operational handoff — COMPONENT COMPLETE; INTEGRATION STOPPED

## Task and standing constraints

User wants a rigorous comparison of memory continuity across 11 sessions for
the reviewer, separate from therapist misstep detection. Patients are synthetic;
external processing is authorized. Use OpenRouter google/gemini-2.5-pro only.
Never expose credentials. Stop live testing on a new service failure; frozen
runners also stop invalid completions. Do not regenerate completed wrong answers.

## Latest user-authorized execution

The fourth explicit resume (“Procedi”) ran the remaining 21 component answers
from 2026-09-28T15:21:16UTC to15:25:56UTC. Controller93288 / exec16115 exited0.
All280 answers now exist and have been semantically assessed. No new provider
errors occurred in this resume. All314 artifacts from the previous snapshot and
all67 frozen files were verified unchanged. See analysis/completion-evidence.json.

The separate native integration then ran from15:27:11UTC to15:29:59UTC.
Exec15999 and worker94517 exited2; no test process is running. It stopped on
SessionMemoryError during finalization of session1, after five accepted turns.
This was an application memory failure: all14 provider calls returned HTTP200,
STOP and nonempty output. No live requests were made after the failure.

## Component comparison — complete

- Five fixed source trajectories,11 sessions each,7 conditions,8 final questions.
- 55/55 preparation sessions;280/280 final answers;zero unresolved judgments.
- history_full, raw4000/raw8000, structured4000/structured8000: each40/40 correct.
- summary4000:20/40; summary8000:26/40.
- Juanita's complete56-answer assessment is analysis/semantic-juanita.json:
  48correct/8wrong; all35 previous judgments preserved,19/21 new correct.
-27/55 preparation sessions had at least one rejected fact extraction. The
  declared component fallback retains retrieval of original dialogue.
-471 native requests,468 responses,3 historical provider errors (429,504,429).
  The historical empty STOP remains in the native responses and cost, outside
  the280 completed answer artifacts. All original failed attempts are preserved.
- Reported native-response cost USD10.628996125. Per-condition cost allocation,
  input/output tokens and eight encoder initializations are in REPORT.md and
  analysis/resource-usage.json. No total-cost advantage is demonstrated.

Assessment is condition-hidden by a Codex agent also involved in corpus
creation, not independent clinical validation. Five paired patient trajectories
are the units;280 answers are not280 independent observations. This is a fixed
source component comparison, not a live patient dialogue comparison.

All component inference is complete. Do not rerun it. Frozen protocol and files
remain unchanged. Preserve every historical partial assessment and stop snapshot.

## Native integration — observed failure

Prespecified Alex trajectory,11×5turns, native send_message/end_session, new
process per session. The first five turns and one episodic summary are durable.
No fact batch, finalized reflection or cumulative summary was persisted.
0/11 sessions finalized;0/6 probes observed. The six unobserved probes are not
six incorrect answers. No cross-session restoration occurred.

The original15-fact extraction fails on fact2: “keeping a notebook sounds
 totally fine” marked agreed, which the deterministic lexical guard rejects.
Replaying the captured output against the frozen validator and same sources
reproduces the error without API calls or original-file writes. An individual
fact inspection is diagnostic, not a replacement result for the original batch.
See analysis/integration-diagnosis.json/.md and analysis/integration-results.json.

Integration provider cost USD0.15762375 for14 successful calls; no provider
errors or requests after stop. The graph's extraction rejection propagates to
session finalization, unlike the declared fallback in the component condition.
Therefore the component's40/40 does not establish application continuity.

The controller refuses replay of an incomplete session. Do not restart it or
modify frozen code/data to pass. A correction of finalization needs a separately
documented runtime revision and integration test, preserving this failure and
all original turns. Existing authorization covers synthetic processing; the
remaining issue is experimental versioning and native memory behavior.

## Artifacts and interpretation

REPORT.md: full comparison, settings references, cost and integration outcome.
analysis/results.json, semantic-adjudication.json, resource-usage.json:
component results, all280 semantic judgments, resource accounting.
analysis/completion-evidence.json: completed component receipt and hashes.
analysis/integration-results.json: integration counts and native journal hash.
analysis/integration-diagnosis.json/.md: offline replay evidence.
integration/runtime/: original native records, generation events, turns,
persistent memory and session ledger. No production memory was used or changed.
analysis/snapshots/: immutable prior stops and final retained artifacts.

No demonstrated accuracy advantage of structured facts over raw retrieval or
full history. Retrieval does outperform bounded summary on this corpus.
Native application continuity over11 sessions remains unverified because the
first native finalization failed. No clinical validation or statistical
significance claim follows from these descriptive results.

## Environment

Bundled Python:
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
Agent .venv/bin/python is broken. Component environment:
PYTHONDONTWRITEBYTECODE=1
PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages

Integration's controller supplies its own worker environment. Never run prepare
again against the frozen integration. No commit/push or manuscript/TeX changes
were requested for this test. Preserve existing changes in both repositories.
