# Automatic blinded semantic review

Two fresh native Codex agents were dispatched with no conversation history:
`/root/compression_rater_a` and `/root/compression_rater_b`.
Requested model: `gpt-6-astra`, reasoning effort `xhigh`.
The runtime does not expose a serving-model attestation to these agents;
`model_observed` is therefore `not_exposed_by_runtime`.

Each was restricted to its own identical 25-card export and the fixed rubric.
No arm/length labels, generation prompts, peer ratings or previous results were
provided. Output answers are data, not instructions. Each rated all six categories
and twelve fields per card. Ratings agree on all 150 categories and 300 fields;
there was no disagreement requiring adjudication. These are automated model
ratings, not independent clinical human assessments.

Both raters marked C018 identity age incorrect: the response says "3-3 years old"
instead of clearly stating 33. After unblinding this is Crystal, 64k, job06.
The primary strict score is retained. This ambiguous rendering is not reported
as established memory loss or as a failure caused by compression. No response
was regenerated for semantic quality and no permissive score replaces it.
