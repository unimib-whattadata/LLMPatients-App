# Automatic semantic review

Two native agent contexts were freshly created after all 50 outcomes had been
collected. Each received only its own identical 40-card packet and the frozen
rubric. Arm and length mapping, generation prompts, experiment reports and peer
judgments were excluded from the assignment. Responses themselves can contain
linguistic cues; blinding effectiveness is not empirically established.

Requested model: `gpt-6-astra`, reasoning effort `xhigh`, for both raters.
Observed served model: `not_exposed_by_runtime`. This is an automated assessment,
not independent human/clinical validation and not cross-family model review.

- Rater A: fresh task `/root/length_rater_a`; output `ratings/a.json`.
- Rater B: fresh task `/root/length_rater_b`; output `ratings/b.json`.
- Root: no semantic labels supplied to raters; checks completeness, aggregates
  judgments and interprets outcomes only after comparison.

Disagreements in pass or field correctness are sent to a fresh adjudicator with
raw cards and the same rubric, without the two raters' answers or arm/length
mapping. All ratings and any disagreement are retained. No model generation is
repeated to improve a semantic score.
