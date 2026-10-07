# Continuation from session 6, turn 2

The user instructed `Procedi` after being told that the previous continuation
completed five sessions, saved 26 accepted turns, and stopped at an empty
classifier completion in session 6. This amendment permits one continuation
from that saved state. It does not change the scientific scenario or add a
replication. No accepted answer is regenerated or selected for accuracy.

## Preserved checkpoint

The preceding `resume-01/runtime/` remains read-only. It is copied to this
amendment's runtime before inference. Its historical `STOP` receipt is moved
only inside the copy to `previous-stop-resume-01.json`, with a byte-equality
check. An active `STOP` in the new runtime still prevents all further calls.
The complete input file hashes and both predecessor manifests are recorded.

Sessions 1–5, their replies, native journals and completed ledger entries are
immutable. The one accepted turn s06t01, its source and ledger entry are
preserved. The empty output and its reported cost remain archived once. Before
inference, all copied input artifacts must agree byte for byte with the prior
checkpoint, except for the explicit historical stop rename.
New worker starts/exits use `processes-resume-02.jsonl`; the previous process
journal remains unchanged, including during the worker's checkpoint validation.

## Recovery and remaining sessions

The native RunLogger snapshot has total_turns=26, last_episode_turn=25, five
history entries and ten messages. Only s06t01 belongs to the current session;
the remaining window entries are from session 5. There is no current-session
episode batch to recover. The existing open ledger entry at index 5 is attached
to the API registry, with the hydrated native snapshot as base_state. No new
ledger session is created for this recovery.

The next generation starts at the failed uncommitted classification for s06t02;
no successful patient response from that turn exists. The four remaining turns
are passed to the unchanged native API, followed by its normal finalization.
The rolling history window may advance, but committed ledger turns and raw
sources must not change. Completion requires six ledger sessions, thirty
cumulative turns, five unique sources for session 6, persisted narrative memory
and reconciled consolidation status. Sessions 7–11 use the unchanged frozen
execute_session function in fresh processes, with the new runtime passed
explicitly. This recovery attachment is an experimental controller operation,
not evidence that the production API automatically recovers crashed sessions.

## Provider and stopping

OpenRouter `google/gemini-2.5-pro` only. The original corrected source snapshot,
patient profile, 55 therapist turns, six probe definitions, transport and
decoding settings are unchanged: patient temperature 0.7, classifier 0.0,
memory 0.2; top-p 0.95; output budgets 4096/4096/8192; thinking budget 1024;
no provider seed. Legacy top-k 40 is requested by the adapter but omitted by
the transport. The actual request bodies are retained in the native journal.

Serial requests retain the five-second minimum interval. Only the existing
single MAX_TOKENS recovery from 4096 to 8192 is allowed. An empty STOP, provider
or transport failure, timeout or integrity failure halts the attempt. No
availability probe, automatic availability retry, alternate provider, or
post-error campaign is permitted. The exclusive launch receipt and active stop
receipt prevent unreviewed relaunches.

## Offline gate and interpretation

Network-blocked tests verify recovery from 26 to 30 turns, exactly four new
patient replies, unchanged earlier sessions and accepted prefix, native closure,
and session 7 restoring thirty turns in a fresh process. Mismatched input,
active/altered STOP and completed checkpoints must be refused before calls.
Provider errors and empty classifier output must halt without later requests.

Report completed sessions/11, accepted turns/55, complete/partial consolidation,
validated/rejected fact entries, six semantic probe outcomes when observed,
and cumulative plus attempt-specific calls/costs. Read the continued copy once
to avoid counting historical requests twice. This is a single-profile regression
trajectory with disclosed interruptions, not an independent replication or a
comparison establishing superiority over a baseline.
