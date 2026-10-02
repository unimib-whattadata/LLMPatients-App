# Longitudinal continuity analysis

**Status: INCOMPLETE** — snapshot 2026-09-27T11:54:49.463773+00:00.

Completed sessions: 30/110. Observed patient responses: 152/550. Runtime-invalid observed responses: 0.

This is an incomplete monitoring snapshot, not the completed experiment. Pending probes are not observed recall failures. Final end-to-end accuracy remains unset until all planned assertions in the group are observed.

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
| full | pending (0/30 observed; 0 correct) | pending (25/85 observed; 14 correct) | 0 | pending |
| baseline | pending (0/30 observed; 0 correct) | pending (28/85 observed; 28 correct) | 0 | pending |

Primary assertions are final name, age, current journal label, current check-in day/time, and the withheld reflection-card label. The latter has 45 scripted exchanges between introduction and its first therapist probe. Intermediate probes can rehearse other facts; patient responses and stored memory can also re-expose labels.

A non-match does not establish a contradiction. The CSV/JSONL files retain every query, response, expected value, matched span and source. Both-value answers are conservatively ambiguous; abstention/refusal flags identify explicit phrases only.

## Runtime and provenance

| Condition | Provider requests | Returned patient model versions | Mean turn latency (s) |
|---|---:|---|---:|
| full | 270 | gemini-2.5-pro | 45.28 |
| baseline | 113 | gemini-2.5-pro | 23.38 |

History/counter checks: `{"baseline_count_checked": 77, "baseline_count_passed": 77, "baseline_full_history_checked": 77, "baseline_full_history_passed": 77, "full_counter_checked": 75, "full_counter_passed": 75}`.

Patient text/API provenance checks: `{"valid_patient_responses_checked": 152, "valid_patient_responses_verified": 152}`. Unique provider response IDs: 272; duplicated IDs: 0.

Frozen integrity: passed. Epochs observed: 1. Process warnings requiring inspection: 15.

The audit JSON lists all frozen hashes, profile coverage, generation/safety signatures, provider attempts, finish reasons, usage and pending/error records. Retry tokens and auxiliary full-system calls are included; no monetary cost is inferred without a pricing source.

Each valid patient response is matched to the last visible STOP completion for its turn after the frozen full-system formatter or baseline cleanup. Response IDs and raw visible text are retained in the API ledger. Completed full-system sessions require finalized status and nonempty usable persisted summary/reflection.

## Interpretation limits

- Five paired profile trajectories, one stochastic run per condition; no inferential tests or confidence intervals.
- Whole-configuration comparison: baseline retains full history; full system selects/compresses profile and memory.
- Only the separate reflection-card title has no earlier therapist probe; other facts were rehearsed by intermediate probes.
- Regex non-match is not a contradiction. Competing-value mentions may be temporally correct explanations and are conservatively ambiguous.
- Provider model_version can be an alias rather than an immutable backend snapshot.
- Frozen file hashes are checked against the pre-execution manifest; per-session metadata does not independently attest source bytes at every call.
