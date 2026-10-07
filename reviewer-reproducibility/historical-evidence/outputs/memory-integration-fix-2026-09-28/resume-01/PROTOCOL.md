# Authorized continuation of the interrupted eleven-session regression

The user explicitly instructed `Procedi` after being told that the corrected
run stopped on an upstream 429 after two saved replies. This amendment resumes
that trajectory. It is not a new independent replication or a baseline trial.

## Frozen inputs and preserved observations

The original 35-file corrected implementation, scenario, six probe definitions,
transport and decoding settings remain unchanged. The original runtime directory
remains read-only. Its complete contents are copied into `resume-01/runtime/`,
and all original file hashes are recorded in this amendment's manifest before
any new live request. Earlier provider requests, responses, errors and their
costs remain part of the cumulative record; the copy does not count as another
observation. Accepted replies s01t01 and s01t02 must remain byte-for-byte equal
as strings in the result, ledger and raw sources.

## Recovery mechanism and limitation

The original controller intentionally refuses incomplete sessions. A separate
controller now hydrates the native RunLogger snapshot after turn 2, attaches its
existing open session to the process-local API registry, and continues at turn 3.
It does not call `start_run` for session 1. No graph node, validation rule, patient
profile, memory text, accepted answer or test question is changed. This explicit
experimental recovery adapter is not a claim that the production API itself
automatically resumes interrupted sessions.

The successful turn-3 classification preceding the failed patient generation
was not part of the last committed turn. It is retained in the provider journal
and its cost is included, but classification is rerun from the turn-2 snapshot.
The original failed request is retained. The two accepted patient replies are
never regenerated. No alternative response is selected based on probe scores.

For sessions 2 through 11, fresh processes call the unchanged frozen native API
test function with the continuation runtime directory explicitly supplied.
Each session must finalize before the next can start. The existing cumulative
turn, source, narrative-memory and consolidation checks remain in force.

## Model, calls, and stopping

OpenRouter `google/gemini-2.5-pro` only; patient temperature 0.7, classifier 0.0,
memory 0.2; top-p 0.95, thinking budget 1024; output budget 4096 for
conversation/classification and 8192 for memory; no provider seed. Only one
prespecified recovery from MAX_TOKENS at 4096 to 8192 is allowed. The exact
request body and response are archived by the original transport. The legacy
adapter requests top-k 40, but the unchanged OpenRouter transport omits top-k;
it must not be reported as an effective provider parameter. Serial
requests use the existing interprocess gate with at least five seconds between
request starts. No credentials are copied into the archive.

The first new provider, rate, transport, invalid-completion, timeout, storage or
integrity failure stops the attempt. There is no availability probe or automatic
retry. An exclusive launch receipt and a durable stop receipt prevent unattended
restarts. A later user instruction would require another documented continuation.

## Offline gate and outcomes

Before freezing and launching, mock-only tests verify that recovery preserves
the two accepted turns, avoids duplicate sessions/sources, finalizes through the
native API, and restores session 2 in a fresh process. Corrupt or already-used
checkpoints must be refused before inference. A new provider error or empty
completion must stop without later requests. Network connections are prohibited
in these tests.

Report completed sessions/11, accepted turns/55, complete/partial consolidations,
validated/rejected fact counts, all six prespecified semantic probe results when
observed, raw request/error counts and reported costs. These are regression
observations for one simulated profile, not evidence of general superiority.
