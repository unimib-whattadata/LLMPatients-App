# Operational handoff — STOPPED after new provider failure

## Current task and stop rule

The user wants a test of memory continuity over11sessions to address the
reviewer, not therapist-misstep detection. The latest user message “Procedi”
authorized resuming from the earlier429 checkpoint. That resumption ran from
2026-09-28T11:30:34UTC to12:06:18UTC, then stopped on a NEW in-band504.

Do not resume or launch integration without another explicit user instruction.
The standing user instruction is to stop all live testing at the first new
availability, rate, transport or in-band service error. No automatic retry.

- Last controller PID87019 / exec session59536 has exited1 and is not running.
- Last failure: Juanita session09 summary; HTTP200 with upstream504 in body.
- Zero requests after this failure. The earlier429 is retained separately.
- 52/55 preparation sessions and224/280 final answers saved and evaluated.
- Component frozen files34 and integration33 are unchanged.
- All177 completed artifacts from the earlier snapshot remain byte-identical.
- OpenRouter only, google/gemini-2.5-pro, same fixed settings. Never print or
  expose credentials; the transport already uses the configured Agent key file.

## Current outcomes

Four profiles complete,11sessions and56answers each: Jason, Alex, Crystal,
Daniel. Juanita has8preparation sessions complete and no final answers yet.
Primary comparison uses all32questions on these four complete profiles:

- history_full, raw4000/raw8000 and structured4000/structured8000:32/32 each.
- summary4000:17/32; summary8000:21/32.
-26/52 preparation sessions had at least one rejected fact extraction.
  The declared component fallback keeps raw dialogue available; native
  end_session instead fails finalization. Do not equate the two conditions.
- Semantic judging is condition-hidden by a Codex agent also involved in corpus
  authorship, not independent clinical validation.
- All224 judgments are in analysis/semantic-adjudication.json. The old Crystal
  partial snapshot is preserved; its32judgments agree with the full assessment.
-403 native requests,401 responses,2 service errors in the full archive.
  Completed-response reported USD9.30256325; both error responses report cost0.
- Integration is prepared but NOT run. integration/runtime does not exist.

Main files: REPORT.md, analysis/results.json, analysis/resource-usage.json,
analysis/stop-evidence.json, run/status.json, run/native.jsonl.
Historical stop snapshots are in analysis/snapshots/; do not overwrite them.

## If the user later explicitly authorizes another resumption

Use the SAME root and frozen scripts. Never regenerate completed answers,
including incorrect ones. Pending failed call:
juanita_delgado_001/session_09/summary
run/calls/bc222e6a75af36d0ada28075c7e44203ac978baf89ff2f8d2e1f75ee95a15f24.json

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/benchmark.py run --resume-authorized
```

Remaining: finish Juanita sessions09–11 and56final questions. The controller
skips all completed checkpoints. Only one4096→8192 MAX_TOKENS recovery was
prespecified; availability errors must always stop the current run.

After Juanita completes, run scripts/analyze.py, then
analysis/review_packets.py packet --patient juanita. Existing agent
memory_benchmark_corpus can assess the packet with corpus/SCORING.md; hide all
arm mappings and reports from it. Merge with analysis/review_packets.py merge,
then analysis/build_report.py. These are offline actions.

If component completes without another service failure, run the already
prepared integration: bundledPython integration/run_integration.py run --live.
Monitor with analysis/monitor_integration.py and the returned exec session.

## Integration bounds

- One prospectively fixed Alex trajectory,11×5turns, real native route functions,
  graph, persistent state and a new process per session; roughly154calls.
-33 frozen files,14 offline tests passed. No live outcome yet.
- Explicit memory decoding settings and180s episode barrier are test overrides;
  disclose them. step_id is not propagated into the graph, so11sessions do not
  validate11different therapy phases. No HTTP server/UI is exercised.
- Native fact-extraction failure stops finalization. Do not invent a fallback,
  change frozen code or replay an incomplete session automatically.
- Export observed probes with integration/run_integration.py review, then judge
  their relations semantically; no target-word scoring shortcut.

## Resource accounting and scope

analysis/resource_usage.py retains distinct encoder loads from historical
snapshots plus current files, deduplicated by patient/hash. Crystal was loaded
again after the authorized resume; that extra process load is restart overhead,
not a hidden saving. No inference code was changed during execution.

Current results support retrieval retaining facts that the summary loses.
They show neither a structured-fact advantage over raw retrieval nor superiority
over full history. Whole-application eleven-session continuity remains untested.

Use bundledPython above, not the broken Agent .venv/bin/python. No commit/push
requested. Production runtime and existing sibling-repository user changes were
not modified by this benchmark task.
