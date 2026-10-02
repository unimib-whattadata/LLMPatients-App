# Offline semantic-review export interface

`export_review.py` uses Python's standard library only and never imports the
runtime or provider. It assigns no semantic or end-to-end scores. Its output
status is `semantic_review_pending`.

## Inputs

- `--plan`: frozen plan root, containing `package-manifest.json`, `PROTOCOL.md`,
  `SCORING.md`, and `design/run-matrix.json`. Consumed plan files must match the
  manifest. The matrix's `scenario_path` and `evaluator_only_gold_path` resolve
  relative to `design/`; an explicit `design/` prefix is also accepted.
- `--runtime`: directory containing `<run_id>/accepted-turns.jsonl`. Every line
  must contain `run_id`, `status: "accepted"`, `turn_index` (cumulative, 1–55),
  `session_index`, `turn_id`, original `therapist_text`, and visible `patient_text`.
  The ledger must be an ordered prefix with no duplicate or empty accepted
  responses. `accepted` means durably recorded, not correct.
- Optional `<run_id>/probe-outcomes.json`:

  ```json
  {"outcomes": [{"turn_id": "s11t02", "status": "application_failure"}]}
  ```

  Allowed statuses are `application_failure` and `not_observed`. Nonprobe turn
  entries are accepted and ignored by the export. An available answer with
  `application_failure` is still exported; `not_observed` with an available
  answer is contradictory and rejected. Without an explicit sidecar entry, an
  absent answer is `not_observed`, with no inference about its cause.

Optional ledger fields `safety_flags` and `application_guard_failure` are kept
only in the private mapping. All available answers, including guarded replies,
retain their original wording and whitespace. Unknown metadata, prompts,
reasoning, retrieval contents, costs, and provider records are not exported.

Run the exporter from a stable checkpoint; input mutation during collection,
unfinished JSONL lines, incorrect scenario text, or modified plan inputs cause
refusal before creating an export directory. It does not modify inputs.

## Output and distribution

`--output` must be a new directory outside the plan and runtime. Existing
exports are never overwritten.

- `evaluator_a/` and `evaluator_b/`: byte-identical `cards.json`, `SCORING.md`,
  `README.md`, and a path-free packet `manifest.json`. Cards contain only a
  random opaque ID, original question, original answer, and allowlisted gold
  fields/source facts. Prior therapist statements remain verbatim. Identity
  facts come from the frozen evaluator gold; source filenames are omitted.
- `private/mapping.json`: analyst-only opaque ID → run/arm/profile/repetition/
  probe mapping, plus availability and guard annotations. Never distribute it
  to evaluators.
- `missing.json`: separate opaque-ID availability register, with no answer,
  score, arm or path. It is not included in either evaluator packet.
- Root `manifest.json`: input hashes/counts, exporter hash, output hashes and
  pending-review status. It contains source identifiers and is analyst-only.

Give each isolated evaluator **only its evaluator directory**. Identical copies
do not establish independent clinical assessment or perfect blinding; an answer's
style or explicit visible wording may reveal its source. Such answer content is
never redacted. The final analyst may join guard annotations after the ratings,
as required by the frozen rubric. The exporter does not perform that judgment.

```sh
python3 export_review.py --runtime runtime --output review/export-001
python3 -m unittest -v test_export_review
```

Tests use temporary fixtures and responses explicitly labelled `OFFLINE STUB`;
network connections are blocked. They do not create experimental observations.
