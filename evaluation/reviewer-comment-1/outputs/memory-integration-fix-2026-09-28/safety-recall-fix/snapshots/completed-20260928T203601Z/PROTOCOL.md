# Safety correction and completion of session 11

## Reason and scope

The authorized task is to correct and test the native 11-session integration.
The preceding attempt reached 51 archived replies and ten finalized sessions.
OpenRouter returned normally throughout that attempt. At s11t01 the native input
guard matched `call` inside `recall`, substituted a boundary instruction, and
the controller stopped on its input-integrity check. The same false positive
would also affect the unchanged planned s11t03. This is an application defect.

The production change is limited to word boundaries around the existing
`run|execute|call` alternation in `agent/core/safety.py`. Command and other guard
patterns remain active. The patch and before/after evidence are in `analysis/`.
This amendment is frozen before any further model calls. It documents a code
change during an engineering regression trajectory, not an unchanged-model
confirmatory experiment.

## Preserved checkpoint and scoring

`resume-03/runtime/` is an immutable source. A separate copy retains all 51
original API replies, the original blocked s11t01, its raw source with
`usable=false`, ten closed native sessions, the current session 11 ledger entry,
and all previous provider failures, request records and costs. Only the exact
previous STOP is renamed to `previous-stop-resume-03.json` in the copy.

Native restoration must recover session 11, cumulative turn 51,
last_episode_turn 50, five history entries and ten messages. The controller
attaches the existing open native ledger entry, preserving its run ID and start
time. It generates only the four originally planned turns s11t02–s11t05. No
original answer is regenerated, edited, removed or substituted for scoring.

All six original probes remain in the primary denominator. s11t01 is a failed
end-to-end probe caused by the input guard; memory recall on that probe is not
evaluable. The result cannot be presented as six clean observations of memory.
No additional notebook-title diagnostic is included in this continuation.

## Explicit code loading and memory accounting

All 35 original frozen files remain unchanged. The amendment separately stores
the corrected safety module. A fresh worker loads it under `agent.core.safety`
before importing the unchanged graph; the controller checks the module path and
that the graph uses the same pattern list. The loaded path and hash are saved.

Native closure must retain five raw session-11 sources, including the unusable
blocked source, and finish at 55 cumulative turns with 11 closed ledger sessions.
Only four usable sources are eligible for native factual extraction. The
collector reconciles API/ledger counts over those four, records the excluded
source ID, and checks that no factual batch processed the unusable source. All
five raw records remain in the evidence. Episodic summaries and reflections may
still contain the blocked exchange because the conversation history is intact.
Complete consolidation of four eligible sources does not mean all five raw
sources were processed. Rejected proposals remain quarantined and reported.

## Provider and stop rules

OpenRouter `google/gemini-2.5-pro` only. The original profile, all 55 therapist
messages, gold criteria, graph, memory logic and transport are unchanged.
Patient/classifier/memory temperatures are 0.7/0.0/0.2; output budgets are
4096/4096/8192; top-p is 0.95; thinking budget is 1024; no provider seed is set.
Legacy top-k 40 is omitted by the transport. Exact requests and responses are
archived, including costs and failure events.

Calls are serial with at least five seconds between starts. The only allowed
token-budget recovery is the preexisting single 4096-to-8192 retry after an
explicit MAX_TOKENS result. Any new provider, rate, transport, empty-completion,
timeout or integrity failure stops the attempt. No availability retry, alternate
provider or automatic relaunch is allowed. A separate exclusive launch receipt
and `processes-safety-recall-fix.jsonl` preserve the original process journals.

## Offline gate and reporting

Before live execution, network-blocked tests must verify native restoration,
exact preservation of the existing prefix, four new replies, the patched guard
in the actual graph, closure at 55 turns, raw-versus-eligible source accounting,
and stopping without subsequent calls after a provider failure. A corrupted
checkpoint must be rejected before inference. Production guard regression tests
must cover all 55 planned messages and representative prohibited inputs.

Report 11-session completion only after native closure, every original probe
outcome, the input-guard failure and the mid-trajectory amendment. Report
consolidation status, validated and rejected proposals, raw and eligible sources,
and cumulative plus attempt-specific calls/costs without double counting copied
records. This is one known synthetic profile and one interrupted regression
trajectory. It establishes no clinical validity, blinded evaluation, independent
replication, general reliability or superiority over a baseline.
