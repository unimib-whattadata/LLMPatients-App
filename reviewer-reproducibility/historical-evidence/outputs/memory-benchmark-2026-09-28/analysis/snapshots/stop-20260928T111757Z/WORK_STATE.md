# Operational handoff — STOPPED after provider rate limit

The user clarified that this task concerns memory continuity over eleven
sessions, not therapist-misstep detection. The user explicitly requires all
live tests to stop when the service is unavailable. That condition occurred.

## Do not resume without a new user instruction

- Stopped 2026-09-28 at 11:17:57 UTC after an OpenRouter in-band upstream429
  inside HTTP200. No calls followed the error; no availability retry was made.
- Controller83928 / exec session22140 exited1. They are no longer running.
- Evidence: `analysis/stop-evidence.json`, `run/status.json`, `run/native.jsonl`.
- Integration has NOT started (`integration/runtime/` does not exist).
- Never print credentials or read their value into tool output. OpenRouter
  transport already uses the configured Agent key file.
- Source, protocol and corpus remain frozen:34 component files and33 integration
  files verified. Do not refreeze or change the experiment after seeing results.

## Completed and preserved

- 33/55 preparation sessions;144/280 final answers;258 native requests,
  257 responses and one service error. Observed reported cost $6.006061125
  for completed responses; the native error response additionally reports cost0.
- Jason and Alex:11 sessions and56 answers each. In the combined complete
  cohort, history_full, raw4k/raw8k and structured4k/structured8k each16/16;
  summary4k11/16; summary8k13/16.
- Crystal:all11 preparation sessions and32/56 final answers;27/32 correct
  in condition-hidden semantic review. All five observed errors are summary4k.
  These are unequal partial question sets and must NOT be pooled into a fair
  arm comparison. The primary report uses only the two complete profiles.
-14/33 preparation sessions had at least one rejected fact extraction.
  The component's declared fallback keeps raw dialogue available. Production
  end_session would instead fail finalization; do not claim it is equivalent.
- Semantic review is by a Codex agent also involved in corpus authorship,
  with arm labels hidden. It is not independent clinical validation.
- Full assessments: `analysis/semantic-jason.json`, `semantic-alex.json`.
- Crystal snapshot: `analysis/semantic-crystal-partial-20260928T111757Z.json`;
  do not overwrite it with a future56-answer packet.
- Merged144 judgments: `analysis/semantic-adjudication.json`.
- Main report: `REPORT.md`; resources: `analysis/resource-usage.json`.

## If the user later explicitly authorizes resumption

Use the SAME output root and frozen scripts. Completed answers are checkpointed
and must never be regenerated, including wrong ones. The pending failed call
is `crystal_smith_001/raw_4000/previous_slot`; its single429 attempt is archived.
Do not start integration as an alternative way around this stop.

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/benchmark.py run --resume-authorized
```

Remaining component work:24 Crystal answers; Daniel and Juanita with11 sessions
and56 answers each. The controller skips completed checkpoints in the fixed
order. The first subsequent availability/rate/transport/in-band error must again
stop everything. Only the prespecified4096→8192 MAX_TOKENS recovery is allowed.

After each complete profile, run `scripts/analyze.py`, then
`analysis/review_packets.py packet --patient <name>`. Give the blinded packet
and `corpus/SCORING.md` to the existing `memory_benchmark_corpus` agent; never
expose the arm mapping to it. Merge with `analysis/review_packets.py merge`, then
run `analysis/build_report.py`. The merge preserves partial assessments and
rejects correctness conflicts rather than silently replacing judgments.

Only after the component finishes without a new service failure may the
integration control run, using bundledPython:
`integration/run_integration.py run --live`.

## Integration: prepared only

- One fixed Alex trajectory,11×5 turns, native send_message/end_session and a
  fresh process per session. Around154 serial calls.14 offline tests passed;
  no live integration result exists yet.
- `integration/PROTOCOL.md` and `integration/review.md` document the operational
  overrides: memory decoding settings and a180s episode-completion barrier.
- A rejected native fact extraction fails finalization. Do not invent a
  fallback or automatically replay an incomplete session.
- step_id is not propagated to graph state:11 sessions do not validate11
  different clinical phases. Route calls do not test the UI/HTTP transport.

## Limits and workspace

The comparison uses fixed source dialogues and controlled final queries.
Current results support retrieval retaining information lost by a bounded
summary. They do not establish a structured-fact advantage over raw retrieval,
superiority over full history, or whole-application longitudinal success.

Use the bundled Python path above, not the broken Agent `.venv/bin/python`.
No commit or push was requested. No production runtime was edited in this
benchmark task; preserve the user's existing changes in the sibling Agent repo.
