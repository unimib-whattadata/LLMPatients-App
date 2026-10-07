## Material Passport

- Artifact: pre-execution audit of the memory benchmark harness.
- Date: 2026-09-28.
- Scope: `scripts/benchmark.py`, `contexts.py`, `analyze.py`, `test_benchmark.py`, OpenRouter transport/error wrapper, frozen memory dependencies, protocol and corpus/gold structure.
- Method: read-only source inspection and one pure offline scoring counterexample; no provider calls, no runtime edits, no live experiment executed by this reviewer.
- Status: correction readback completed; no remaining execution blocker identified in the inspected revision. Initial findings and their disposition are retained below. This is a static/offline audit, not evidence of live benchmark success.

## Findings requiring correction before execution

### 1. Accepted responses can be regenerated after interrupted checkpointing

`Client.generate` appends the successful attempt and writes it in `finally` while the saved status is still `pending`; a later write changes the status to `complete`. If the process stops between those writes, the next invocation sees a pending call with a nonempty STOP attempt but does not recover its text. It calls the provider again. A similar gap exists after the native response journal is durably written and before a call checkpoint is saved at all.

This contradicts the prospective rule that completed generations, including incorrect ones, are preserved and never repeated. It is especially relevant because the controller can terminate a worker at a fixed timeout.

Required resolution: persist request intent/call identity before sending; recover an already recorded nonempty STOP response from either the call checkpoint or the native journal; preserve every native attempt; never regenerate an accepted answer because a higher-level answer/session file was not yet written. Add offline tests for both interruption positions and assert zero extra provider calls on recovery.

### 2. The purported strict screen can accept uncertain remote recall without review

Observed offline counterexample with expected value `Stillwater Notes`:

```json
{"answer":"Possibly Stillwater Notes, but I cannot remember"}
```

The inspected scorer returns `strict_pass=true`, no flags, and `semantic_review=false`. It tests expected substrings and a limited negation list; therefore other incorrect alternatives, uncertainty, or a denial outside that list can pass the remote categories.

Required resolution: make automatic strict success require the normalized canonical answer (with only predefined innocuous format variations), or flag every noncanonical wording for semantic review. Keep temporal/action rows under semantic review regardless of literal overlap. The strict metric must not be represented as the final semantic result.

## Conditions that currently appear sound

- Seven arms, five profiles and eight questions per arm produce the declared 280 planned final responses.
- Gold is read during the pre-execution export of questions and later analysis, but worker preparation/generation uses source dialogue, the exported question text, and the profile. The worker does not use expected values or gold quotes to retrieve evidence or generate answers.
- Source sessions are loaded chronologically for preparation; each session requires the prior completed summary. Raw and structured stores receive the same therapist/patient turns. Final responses are never appended to either source store.
- Profile serialization and final instructions are shared across conditions. The full-history reference receives the full chronological source transcript.
- Raw and structured conditions use identical summary/recent allocations, the same question and retrieval implementation, and the declared limit of 64 records. Their difference is the presence of factual batches/version information in the structured store.
- Complete assembled memory blocks are checked against the 4k/8k estimated-token budgets, including labels. Whole source records are removed if separator overhead would exceed the ceiling.
- A malformed extraction batch is retained as a recorded component-preparation failure; remaining raw sources are still available. The protocol explicitly distinguishes this fallback from production finalization behavior.
- Provider exceptions propagate out of the worker and stop the serial controller. A 429 updates the shared circuit. In-band choice errors are rejected before extracting partial text. There is no automatic service-error retry within the inspected call.
- The only prespecified within-call recovery is a single answer-budget escalation from 4096 to 8192 after MAX_TOKENS; preparation starts at 8192 without another escalation. Partial outputs and their costs remain archived.
- Runtime imports resolve first to the local `frozen` package. The previously missing `llm_provider_base.py` is now present and only supplies local definitions needed by the limiter. The model transport's key is read only on invocation; no Vertex runner is instantiated by this component harness.
- Protocol timeout wording now matches the code: 1200 seconds per preparation session and 3600 seconds for a patient's batch of 56 queries.
- The benchmark is accurately described as a memory-component diagnostic. The separate integration trajectory being prepared is needed for claims about the complete runtime across eleven sessions.

## Nonblocking accounting and reporting limitations

1. One `Encoder.cache` is shared across all raw/structured arms within a patient. The first condition pays vector generation; later conditions reuse it. Encoder construction is outside the recorded context timer. Consequently, these timings cannot be interpreted as independent per-configuration deployment costs. Either separate caches and record initialization, or report shared-cache operational timings explicitly and account for indexing/encoding separately.
2. The analysis currently reports native costs by query arm or preparation role. A final report must additionally allocate shared summaries to each configuration that needs them and extraction to structured configurations; amortization must state the query count. Preserve reasoning-token usage and missing-cost indicators from native records.
3. Per-profile and per-category tables still need to be produced from saved scores. Treat five paired trajectories as the units; do not infer precision from 280 nominally independent answers.
4. The blinded review export contains all answers, which is useful. It must actually be reviewed before semantic accuracy is claimed. Keep adjudication distinct from the strict screen and preserve its rationale.
5. Capture the local encoder revision/dependency versions and process-alive observations in execution provenance. The source-file manifest alone does not identify model-cache contents or installed package versions.
6. If execution is interrupted after valid factual batches but before the session result file, resumption correctly retains stored facts, but the recreated session's `extraction_batches` list currently contains only batches produced during that resumed invocation. Reconstruct that list from the store or label it as newly produced batches; total facts and costs should not omit earlier preparation.

## Source snapshot inspected

| File | SHA-256 |
|---|---|
| scripts/benchmark.py | 1354c3ab6e6352a3f23b00a774de50b2a30eecf825d093aca62d8beec5185706 |
| scripts/contexts.py | 6f1249a3c75b174e56dbc053c7c5ed6fd64eb9e066b40851f1eb8046d85a2e36 |
| scripts/analyze.py | a20eaf884c0bbb8d5a7b272b4307503794dc007626eab3a067ab6dffe3f0d6b2 |
| scripts/test_benchmark.py | 20f453bef55f5609e47b748aa4e4047e978b328e79290f4254d6c403b2bde644 |
| PROTOCOL.md | 031df7ee8080749fb347b31e27257cd04def4ad8c93b3c64e05ba52039c49b26 |

This review does not freeze or approve any later source revision automatically.

## Correction readback

Completed before freeze/API execution.

- **Checkpoint finding resolved in the inspected code.** A call attempt with the native-journal offset is saved before invocation. Pending attempts are reconciled against the journal; a previously saved nonempty STOP response is returned without another provider call. If a sent request has no known outcome, resumption stops instead of repeating it. Successful status/text are set before the final checkpoint write. Offline regression tests now cover recovery of a completed wrong answer from pending state, recovery of a journaled STOP through the real SDK normalizer without a model call, and refusal to replay an unknown outcome. The saved `review/offline-test-output.txt` reports 13 tests passing; this reviewer inspected the cases and output rather than rerunning the complete suite.
- **Strict-scoring finding resolved.** Canonical normalized equality, permitting a trailing period, is now required for automatic literal success. The exact uncertain-answer counterexample was repeated offline and now returns `strict_pass=false`, `semantic_review=true`; the canonical answer and its trailing-period variant still pass. Temporal/action rows remain flagged for semantic review.
- **Encoding accounting improved.** Vector caches are now separate per arm. Model weights are shared within the process, and model-loading time is saved separately with a documented allocation to each deployed retrieval configuration.
- **Protocol aligned.** It now describes request-intent reconciliation, refusal to replay unknown outcomes, separate vector caches, and the 1200/3600-second process limits.
- **Local encoder preflight.** The parent reports successful offline loading of all-MiniLM-L6-v2 and two 384-dimensional vectors. No remote encoder fallback is planned.

No additional code changes are required by this reviewer before freezing this revision. The nonblocking reporting limitations above remain applicable where not explicitly resolved here. Semantic adjudication and cost allocation are analysis work after execution, not grounds to select or rerun favorable answers.

### Corrected revision inspected

| File | SHA-256 |
|---|---|
| scripts/benchmark.py | 4f084c74b484873946713494df75e191312d296f153634c80233c9596d219ca9 |
| scripts/contexts.py | 87fd3640e959357643da73388aad80e66f6d129cda77c22f53d7624d92e5e01a |
| scripts/analyze.py | a20eaf884c0bbb8d5a7b272b4307503794dc007626eab3a067ab6dffe3f0d6b2 |
| scripts/test_benchmark.py | b4d549d77262926654116362f5c2514806b9f8b00a35489a0c29a8d6c900142d |
| PROTOCOL.md | e2e288c323851d430d4d1ba5afd516f82c5128b6b33ae3885b9fee47e45cd6fc |
