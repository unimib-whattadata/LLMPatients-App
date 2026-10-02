## Material Passport

- Artifact: pre-execution review of the eleven-session integration harness.
- Date: 2026-09-28.
- Scope: `run_integration.py`, `runtime_adapter.py`, `PROTOCOL.md`, scenario/gold separation, relevant frozen runtime paths, and the offline tests.
- Method: read-only code inspection and independent file-hash verification. No model API calls, credential reads, runtime changes, or live sessions were performed by this reviewer.
- Status: ANALYZED. No execution blocker identified in the inspected frozen revision; this is not a claim that the live integration test has succeeded.
- Manifest SHA-256: `5efc74e1ada99d762028952796d49c1c30d5608b8278c37962d52f630594c4e8`.
- Integrity check: all 33 manifest entries matched; no missing or mismatched files.

## Requested checks

| Check | Assessment |
|---|---|
| Real API/graph execution | `execute_session` invokes native `api.send_message` five times and native `api.end_session` once. These traverse the graph and factual/narrative finalization. No patient fixture is supplied during live operation. |
| Eleven distinct processes | `run_live` launches one child interpreter per session, records PID, and gives each execution a UUID. It checks that preceding ledger entries are finalized and contain five turns. |
| State restoration | The worker records `RunLogger.restore_state`, checks the cumulative turn count, and allows the API to perform its normal restoration. Prior full transcripts are not manually inserted into the prompt. |
| OpenRouter only | The factory is replaced before graph import. The adapter subclasses VertexLLMRunner solely for type/configuration checks, bypasses its constructor and generate method, and guards Vertex initialization/model construction with assertions. The SDK normalizes responses locally. All live generation uses the explicit OpenRouter transport. |
| Hidden/background calls | The inspected graph routes classification, patient generation, episodes, reflections, cumulative summaries and fact extraction through the same injected runner. The local embedding model is loaded under offline Hugging Face settings. |
| Stop after provider failure | Transport errors become the graph's existing propagated control exception. The shared fatal latch blocks later calls even if an asynchronous callback consumes the exception. A call lock plus interprocess gate serializes requests; the pre-finalization barrier inspects background futures and the latch. |
| Preserve successes | A session file is created before runtime execution. Completed sessions are skipped; incomplete/stopped sessions and orphaned worker-log directories cannot be replayed automatically. Earlier turns and native responses remain archived. This harness deliberately stops for a reviewed amendment rather than trying to reconstruct and regenerate an interrupted session. |
| Bounded recovery | Exactly one 4096→8192 recovery is allowed after MAX_TOKENS. A call initially at 8192 cannot escalate again. Empty text, safety/other termination and repeated truncation stop the run; they are not accepted as patient responses. |
| Gold separation | The worker reads the therapist-only scenario and verifies file hashes. Gold content is read only in preparation/review export, after or outside inference. Scored final questions do not contain the named targets. |
| Storage isolation | Source modules are copied into `integration/source`; generated ledgers, original turns, logs and model journals use the isolated runtime tree. No production memory is loaded. |
| Limits | HTTP timeout 120 seconds, session-process timeout 1200 seconds, episode barrier 180 seconds and minimum request spacing five seconds are explicit. The controller stops on a failed child. |

The offline test suite contains targeted coverage of HTTP/in-band failure, the background latch, pacing, output-limit handling, model settings, gold separation and two actual child processes using send_message/end_session/restore_state with networking forbidden. The implementing agent reports 14 passing tests; this reviewer inspected the cases and did not repeat the suite.

## Limits to preserve in the result report

1. **One profile and one trajectory.** Alex is fixed prospectively, with new labels. This is a longitudinal integration check, not a new comparative accuracy estimate across the five profiles and not clinical validation.
2. **Declared test configuration.** Episodic summaries, reflections and cumulative summaries use temperature 0.2, output 8192 and thinking budget 1024 in the adapter. The frozen production graph normally requests an internal 4096 budget for these narrative calls and leaves temperature/thinking at runner defaults. Patient settings and factual extraction are separately recorded. A successful result supports the runtime under the declared OpenRouter test configuration; it should not be presented as exact equivalence to every production decoding default.
3. **Episode completion barrier.** The 180-second barrier before native finalization makes pending work complete before the native 10-second drain. This is openly documented and useful for testing the complete persistence chain. It does not demonstrate that the unmodified scheduling timeout is reliable under the same remote latency.
4. **Sessions versus clinical phases.** step_id is API/logger metadata and is not propagated into the graph state. Completion establishes eleven closed/reopened sessions, not eleven validated therapy phases.
5. **Python route calls.** The test covers route functions, graph and persistence. It does not exercise HTTP-server transport or the user interface.
6. **Semantic scoring remains required.** Exported probe rows contain observed replies, source exchanges and relationship-level gold. Do not count mere target-word presence as success. Partial/mixed answers, wrong temporal relations, invented details and correct abstention must remain distinct.
7. **No automatic partial-session recovery.** Refusing to replay an incomplete session protects against regenerated successes but means a stop can leave the integration incomplete. All retained native/turn data must be reconciled in an explicit amendment before any continuation.
8. **Operational sequencing.** Run this integration after the component campaign, as specified. If that campaign stops for provider unavailability, do not automatically launch this separate harness against the same unavailable service.

## Disposition

The inspected revision can proceed as the authorized, bounded integration check once the operational sequencing condition above is satisfied. No runtime changes are requested by this review. Preserve the manifest, all responses and all failures; do not tune the scenario or memory implementation based on the live benchmark outcomes.
