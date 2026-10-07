# Operational handoff — STOPPED after third explicit resumption

## Current instruction and state

Task: evaluate memory continuity over 11 sessions for the reviewer. Use OpenRouter
with google/gemini-2.5-pro only, fixed protocol/corpus/code. All patients are
simulated and external processing is explicitly authorized. Never expose keys.
The user requires stopping live work on service unavailability; the frozen
runner also stops invalid completions. No automatic retry of this stop.

The latest user “Procedi” authorized a third resume. It ran from
2026-09-28T13:50:56UTC to 13:51:31UTC and saved two additional valid answers.
Controller 91089 / exec 3597 exited 1. No process is running and integration
has NOT started. Do not run availability probes or another live controller
without a new user instruction.

The latest failure is an upstream 429 returned inside HTTP 200. The frozen
runner correctly marked stopped_provider_error and stopped immediately.
There were zero requests after this new error. Earlier 429, 504, and empty
STOP attempts remain archived; the previously empty cell now has a valid
answer, with its original empty attempt preserved.

## Saved outcomes

- 55/55 preparation sessions complete; 259/280 final answers saved and evaluated.
- Four complete profiles: Jason, Alex, Crystal, Daniel, 56 answers each.
- Primary comparison on 32 questions per arm: history_full, raw4000/raw8000,
  structured4000/structured8000 each 32/32; summary4000 17/32; summary8000 21/32.
- Juanita 35/56 valid responses, 29 correct/6 wrong in condition-hidden assessment.
  Partial sets differ by arm and must remain separate from the fair comparison.
- 27/55 sessions had at least one rejected fact extraction. Component fallback
  preserves raw sources; native application finalization would instead fail.
- 450 native requests, 447 response events, 3 error events (429, 504, 429).
  One response event is the historical empty STOP; it is not among the 259
  completed answer artifacts.
- Native-response cost USD 10.246329125 includes the historical empty response
  cost USD 0.0145675 exactly once. All three error events reported cost 0.
- All 312 completed artifacts from the previous snapshot are byte-identical;
  all 67 frozen component/integration files remain unchanged.

Current evidence: REPORT.md, analysis/results.json, analysis/resource-usage.json,
analysis/stop-evidence.json, run/native.jsonl, run/status.json.
Historical snapshots: analysis/snapshots/; never overwrite them.
Latest snapshot: analysis/snapshots/stop-20260928T135131Z/ (314 completed artifacts).

Semantic review is condition-hidden by a Codex agent also involved in corpus
authorship, not independent clinical validation. All 259 judgments are merged
in analysis/semantic-adjudication.json. Historical partial judgments are
unchanged. The newest assessment is
analysis/semantic-juanita-partial-20260928T135131Z.json (33 reused, 2 new).

## If the user explicitly authorizes another resume

Use the SAME root and frozen script. All 55 sessions are done; the controller
skips them and all 259 existing answers. Preserve incorrect completed responses.
Only 21 Juanita query cells remain, including the latest failed cell:
juanita_delgado_001/raw_8000/agreed_practice
run/calls/551407474c19080c4a6731483e8b38cdf8c15af8c0b5d1ac9fb5c57015da7be3.json
Its 429 attempt must remain in the attempts array and native journal.

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/benchmark.py run --resume-authorized
```

Stop again on any new provider failure or invalid completion. The only automatic
recovery prespecified is 4096→8192 after MAX_TOKENS; empty STOP is not that case.

After Juanita's 56 answers complete: scripts/analyze.py;
analysis/review_packets.py packet --patient juanita. Give that packet, frozen
SCORING.md and the previous 35 judgments to memory_benchmark_corpus. Reuse those
35 judgments, assess the 21 new responses, write semantic-juanita.json. Never
give arm mapping/results/report to the assessor. Merge with review_packets.py
merge, then analysis/build_report.py. Merge rejects conflicting judgments.

## Integration still pending

Only after the component finishes without another new operational failure may
integration/run_integration.py run --live be executed with bundled Python.
Monitor via analysis/monitor_integration.py. No need to prepare/refreeze again.

One prespecified Alex trajectory, 11×5 turns, native API route functions and graph,
persistent memory, a new process per session. About 154 serial calls; 33 frozen
files and 14 offline tests passed. No live result exists. Memory decoding settings
and a 180s episode barrier are declared overrides. step_id is not propagated into
the graph: 11 sessions do not validate 11 distinct therapy phases. No UI/server HTTP.

Native extraction rejection fails finalization. Do not invent component-style
fallback or replay an incomplete session. Export probes with run_integration.py
review and evaluate their relationships semantically, not by keyword presence.

## Analysis and limits

Resource accounting retains distinct encoder initialization records from stopped
snapshots plus current files, deduplicated by patient/hash. Seven initializations
are currently archived, including restart overhead. A future Juanita resume will
load again; its current initialization is preserved in this snapshot.

The comparison uses fixed source dialogues and controlled final questions.
It currently supports retrieval preserving facts lost by summary, with no added
accuracy advantage demonstrated for structured facts over raw retrieval or for
either over full history. Whole-application longitudinal continuity is pending.

Use bundled Python above, not the broken Agent .venv/bin/python. No commit/push
requested, no production runtime changed by this benchmark task. Preserve the
user's existing changes in the sibling Agent repository.
