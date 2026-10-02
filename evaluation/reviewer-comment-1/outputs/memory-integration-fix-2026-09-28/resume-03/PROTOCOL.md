# Continuation from session 9, turn 1

The user instructed `Procedi` after being informed that eight sessions and forty
accepted turns were retained and that an upstream 429 stopped the first call of
session 9. This authorizes one continuation from that checkpoint. It does not
change the scientific scenario or create another replication.

## Preserved checkpoint

`resume-02/runtime/` remains read-only and is copied before inference. Only the
historical STOP in that copy is moved to `previous-stop-resume-02.json`, with a
byte-equality check. The preceding historical stop remains intact. An active
STOP still prevents inference. All forty accepted replies, their raw sources,
eight finalized session records and journals remain unchanged. Provider errors
and the prior empty completion remain in the cumulative record and cost once.
New process events use `processes-resume-03.jsonl`; all old journals are retained.

## Empty open session and native restoration

The ledger already contains session 9 with its original run ID and start time,
zero turns, and an empty final_state. The existing RunLogger.restore_state
implementation skips that empty snapshot and returns the finalized session 8
state: total_turns=40, last_episode_turn=40, five history entries and ten messages.
There are no raw sources or pending episode work for session 9.

The recovery controller attaches the existing open ledger entry at index 8 to
the process-local API registry and uses that restored session 8 state as base
state. The unchanged API merges the session 9 request identifiers normally.
It does not delete the empty entry or call start_run again. Calls resume at the
failed uncommitted classification of s09t01, followed by its patient generation
and remaining four turns. No accepted reply is regenerated.

Native closure must yield nine ledger sessions, five unique sources for session
9, forty-five cumulative turns, persisted narrative memory and reconciled
consolidation status. Sessions 10 and 11 call the unchanged frozen execute_session
function in fresh processes with the continued runtime explicitly supplied.
The recovery attachment is an experimental controller operation, not proof of
automatic crash recovery in the production API.

## Unchanged provider and stop rules

OpenRouter `google/gemini-2.5-pro` only. The original corrected source snapshot,
profile, 55 therapist turns, six probe criteria, transport and decoding settings
are unchanged: patient/classifier/memory temperatures 0.7/0.0/0.2; output budgets
4096/4096/8192; top-p 0.95; thinking budget 1024; no provider seed. Legacy top-k
40 is requested by the adapter but omitted by the transport. Exact request
bodies and responses remain archived.

Requests are serial with at least five seconds between starts. Only the existing
one-time MAX_TOKENS recovery from 4096 to 8192 is permitted. The first new
provider, rate, transport, empty-completion, timeout or integrity failure halts
the attempt. No availability probe, automatic availability retry or alternate
provider is allowed. An exclusive launch receipt prevents unattended relaunch.

## Offline gate and reporting

Network-blocked tests must verify: preserve all forty replies and eight closed
sessions; reuse the existing empty session 9; produce exactly five new patient
replies; close at45 cumulative turns; restore45 in session 10 in a new process;
reject corrupt checkpoints or active/altered STOP before inference; halt at
provider errors and empty output without later requests. The prior process
journals must stay byte-identical with the new journal present before execution.

Report sessions/11, turns/55, complete/partial consolidation, validated/rejected
fact entries, the six semantic probe results if observed, and cumulative plus
attempt-specific native calls/costs. Read the continued copy once to avoid double
counting. This is a single-profile regression trajectory with disclosed
interruptions; it does not establish general superiority over a baseline.
