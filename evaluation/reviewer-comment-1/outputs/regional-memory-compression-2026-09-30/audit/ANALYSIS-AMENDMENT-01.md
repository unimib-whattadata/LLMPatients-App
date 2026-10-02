# Offline analysis robustness amendment

The independent synthetic-fixture audit identified three edge cases: sorting
mixed missing/present provider names, reconciling charged API errors against the
runtime's successful-response charge total, and accepting unscheduled rejected
outcomes. `analysis/summarize_v2.py` fixes these cases in a separate copy; the
frozen scorer is unchanged. Missing providers are labeled `not_reported`, error
charges are retained separately and in the combined observed total, successful
response charges reconcile with runtime, and committed IDs/counts must match the
scheduled set and runtime.

The changes affect metadata validation and failure accounting. The six-category,
nine-history-field endpoints, support definitions, paired calculations, inputs,
randomization, model calls and ratings do not change. These corrections were
made while collection was running and before any semantic outcomes were scored.
The auditor used synthetic data and did not inspect live answers. A patch is
archived alongside the corrected scorer. Use the v2 scorer for final analysis.
