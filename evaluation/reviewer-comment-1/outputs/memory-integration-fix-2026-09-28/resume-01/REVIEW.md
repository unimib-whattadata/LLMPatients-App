# Review of the explicit continuation adapter

A separate Codex agent reviewed the archived checkpoint and the continuation
code with shared task context. This is a code/integrity review, not an independent
clinical assessment. The review was read-only and made no provider calls.

The checkpoint had one open session, two accepted replies, two raw sources,
total_turns=2, two history records, four serialized messages, and no pending
episode batch. Reply texts agreed across API results, ledger and raw sources.

The implementation attaches the existing native logger record without start_run,
restores the last committed snapshot, and sends only the remaining turns. Later
workers call the frozen execute_session with the new runtime supplied explicitly.
The original CLI is not reused because it addresses the original runtime.

Before freezing, the reviewer identified two stop-handling risks and a parameter
reporting issue. The continuation now sets an in-memory fatal latch before
filesystem writes and guarantees executor shutdown if result persistence fails;
its controller terminates a child when process-start logging or waiting fails.
The protocol states that top-k is omitted by the transport. Five offline tests,
including ten subprocess cases and two stop-helper tests, passed after these
corrections. See offline-tests.log and offline-gate.json.

The original frozen session routine for sessions 2–11 is reused unchanged. Its
existing provider-error latch remains active. The adapter recovery is explicitly
an experiment-control intervention, not an automatic production recovery feature.
All cost reporting reads the continued copy once and checks native request IDs
for duplicates, preventing double-counting of the original prefix.
