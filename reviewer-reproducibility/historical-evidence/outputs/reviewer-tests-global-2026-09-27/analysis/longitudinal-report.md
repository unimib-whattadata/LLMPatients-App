# Longitudinal continuity analysis

**Status: INCOMPLETE** — snapshot 2026-09-27T14:56:57.702374+00:00.

Completed sessions: 32/110. Observed patient responses: 165/550. Runtime-invalid observed responses: 10.

This is an incomplete monitoring snapshot, not the completed experiment. Pending probes are not observed recall failures. Final end-to-end accuracy remains unset until all planned assertions in the group are observed.

## Operational endpoint continuation

Amendment: `vertex-global-continuation-2026-09-27`. Accepted regional sessions, turns and runtime failures are retained; missing work continues globally. The target remains 110 sessions and 550 responses total.

| Endpoint | Condition | Observed responses | Runtime invalid | API attempts | Correct secondary / observed |
|---|---|---:|---:|---:|---:|
| global | full | 2 | 1 | 38 | 1/1 |
| global | baseline | 2 | 2 | 16 | 0/3 |
| us-central1 | full | 76 | 1 | 303 | 14/27 |
| us-central1 | baseline | 85 | 6 | 163 | 28/31 |

Endpoint strata describe the operational routing allocation, which is not randomized or balanced over sessions. They cannot estimate endpoint effects; global continuations inherit regional history and memory. Full endpoint-specific metric/token/error/latency details are in longitudinal-endpoint-strata.json.

Archived input files checked: 371. Failed, uncommitted inherited prompt differences explicitly recorded: 8. The interrupted process reinitializes its recorded Python seed because no RNG checkpoint exists; accepted turn content is preserved.

User-pause resumption: `user-resume-global-2026-09-27-1348`. Verified 375 checkpoint hashes, preserving 165 accepted responses and 32 completed sessions. Actual resumed controller workers: not started; one requested; original frozen upper bound: 2. A differing pre-pause prompt is permitted only for a checkpoint-proven failed, uncommitted attempt with no prior visible STOP answer; all new attempts retain the original equality checks.

Transport amendment: `vertex-shared-rate-limit-2026-09-27`. Shared request pacing/backoff is audited separately from frozen clinical inputs and response acceptance. The latest 375-file checkpoint preserves 68 complete PHQs, 12 partial PHQ items, 32 complete longitudinal sessions and 165 accepted turns. The 151 longitudinal hashes equal the earlier checkpoint; no new prompt exception is introduced. API requests after this amendment: 0. Availability, retries and latency span different operational policies; they are not a benchmark under one fixed transport policy.

## Locked primary endpoint

| Patient | Full system | Flat/full history | Full − flat |
|---|---:|---:|---:|
| alex_carter_001 | pending (0/6 observed; 0 correct) | pending (0/6 observed; 0 correct) | pending |
| jason_smith_001 | pending (0/6 observed; 0 correct) | pending (0/6 observed; 0 correct) | pending |
| daniel_isherwood_001 | pending (0/6 observed; 0 correct) | pending (0/6 observed; 0 correct) | pending |
| crystal_smith_001 | pending (0/6 observed; 0 correct) | pending (0/6 observed; 0 correct) | pending |
| juanita_delgado_001 | pending (0/6 observed; 0 correct) | pending (0/6 observed; 0 correct) | pending |

| Condition | Primary | Secondary | Ambiguous primary | Valid-only primary |
|---|---:|---:|---:|---:|
| full | pending (0/30 observed; 0 correct) | pending (28/85 observed; 15 correct) | 0 | pending |
| baseline | pending (0/30 observed; 0 correct) | pending (34/85 observed; 28 correct) | 0 | pending |

Primary assertions are final name, age, current journal label, current check-in day/time, and the withheld reflection-card label. The latter has 45 scripted exchanges between introduction and its first therapist probe. Intermediate probes can rehearse other facts; patient responses and stored memory can also re-expose labels.

A non-match does not establish a contradiction. The CSV/JSONL files retain every query, response, expected value, matched span and source. Both-value answers are conservatively ambiguous; abstention/refusal flags identify explicit phrases only.

## Runtime and provenance

| Condition | Provider requests | Returned patient model versions | Mean turn latency (s) |
|---|---:|---|---:|
| full | 341 | gemini-2.5-pro | 62.17 |
| baseline | 179 | gemini-2.5-pro | 42.63 |

History/counter checks: `{"baseline_count_checked": 87, "baseline_count_passed": 87, "baseline_full_history_checked": 87, "baseline_full_history_passed": 87, "full_counter_checked": 78, "full_counter_passed": 78}`.

Patient text/API provenance checks: `{"valid_patient_responses_checked": 155, "valid_patient_responses_verified": 155}`. Unique provider response IDs: 277; duplicated IDs: 0.

Frozen integrity: passed. Epochs observed: 1. Process warnings requiring inspection: 20.

The audit JSON lists all frozen hashes, profile coverage, generation/safety signatures, provider attempts, finish reasons, usage and pending/error records. Retry tokens and auxiliary full-system calls are included; no monetary cost is inferred without a pricing source.

Each valid patient response is matched to the last visible STOP completion for its turn after the frozen full-system formatter or baseline cleanup. Response IDs and raw visible text are retained in the API ledger. Completed full-system sessions require finalized status and nonempty usable persisted summary/reflection.

## Interpretation limits

- Operational us-central1 to global continuation: endpoint allocation is not randomized or balanced over sessions; global responses can depend on regional dialogue and memory. Combined results do not estimate endpoint effects or describe a single-endpoint study.
- The interrupted process reinitializes its recorded Python seed because RNG state was not checkpointed; accepted state is preserved but unfinished computation is recomputed. Only archived failed/uncommitted requests can use the documented old-prompt exception.
- The user-paused global execution resumes with one actual controller worker under the original frozen limit of two. The 165 checkpointed responses, including runtime failures, remain accepted; this is an operational continuation, not regenerated data.
- Five paired profile trajectories, one stochastic run per condition; no inferential tests or confidence intervals.
- Whole-configuration comparison: baseline retains full history; full system selects/compresses profile and memory.
- Only the separate reflection-card title has no earlier therapist probe; other facts were rehearsed by intermediate probes.
- Regex non-match is not a contradiction. Competing-value mentions may be temporally correct explanations and are conservatively ambiguous.
- Provider model_version can be an alias rather than an immutable backend snapshot.
- Frozen file hashes are checked against the pre-execution manifest; per-session metadata does not independently attest source bytes at every call.
