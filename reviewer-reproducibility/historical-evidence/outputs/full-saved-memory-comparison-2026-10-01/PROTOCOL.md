# Full saved-memory payload on the same regional scenarios

## Material Passport
Authorized simulated-patient comparison. User explicitly selected **all saved
memory, without selection or cuts** on2026-10-01. This supersedes the eight-item
retrieval policy only for this separately archived experiment. Prior results
remain immutable. No human participant data or clinical performance inference.

## Intervention and complete-source boundary
Use the same30 complete regional corpora, five profiles × three factual-block
positions × two sizes (baseline uncut inputs approximately64k and1.2M tokens).
Same CASE, common instructions, six batched questions, gold, and Gemini2.5Pro.
Reuse all120 sealed baseline results; do not generate baseline answers again.

For every profile the first81 JSONL records of the native persistent memory
exactly reproduce the SHA256 recorded at session9 close:45 conversation turns,
9 fact batches,9 episode summaries,9 reflections and9 long-term summary versions.
Include **every field of every record**, including superseded summary versions,
rejected extraction proposals and original extraction responses. Preserve those
processing logs under their original keys; they are not promoted to validated
facts. Do not choose records based on questions or gold. The source memory file
also contains later records; the witnessed81-line prefix excludes all session10/
11 recall answers and subsequent consolidation.

Preserve the native record content exactly after JSON decoding. Place each
non-conversation record immediately after its preceding original conversation
turn, as in the saved stream. Insert all existing regional filler turns at the
same positions as the baseline corpus. An outer wrapper records the regional
conversation order; original source session/turn metadata remain unchanged.
All original and filler utterances occur once as conversation records. No record
limit, recency filter, retrieval, character truncation or new summarization is
applied. All five memory record types are sent, including complete summaries.

Regional filler was saved as raw conversation only; it was never processed by
native consolidation. Reusing the saved original memory does not claim that the
full application processed1.2M tokens or produced summaries of the filler. This
is the **full durable-memory payload policy**, not a fresh full-graph replay.
Auxiliary graph caches, model request logs and patient-profile state outside the
persistent memory store are not additional memory records; CASE stays identical.

## No prompt compression
Set `plugins:[{"id":"context-compression","enabled":false}]` explicitly on
all structured requests. No automatic slicing to fit the model. A native context-
capacity rejection is a planned availability outcome, not zero semantic accuracy
and not a service outage. Preserve it and continue the other planned contexts.
Any unresolved service/protocol failure stops collection, with no automatic
restart. Do not alter prompts or regenerate on the basis of accuracy.

Exact full prompts and native JSONL logs use lossless gzip **on disk only** to
avoid duplicate large files. Decompress to the complete original string before
building the API body. Freeze both uncompressed hashes and compressed files;
prove lossless round trips and full native request equality offline. No gzip
encoding, semantic compression or prompt transformation is sent to the model.

## Execution and accounting
At most30 distinct full-memory prompts; each64k output is shared across seven
baseline conditions.30 source contexts link once to all120 baseline jobs in24
comparison cells. Hash-identical prompts share one actual output if any occur;
report the actual count. Random order seed2026100103; blind export2026100104.

`google/gemini-2.5-pro` via OpenRouter, temperature0.7, top_p0.95, max output4096,
reasoning1024, stops newline+Therapist: andTherapist:, no API seed, top_k omitted,
provider parameters required, no fallback. One8192-output recovery only after an
explicit4096 length finish. Serial gate,5-second spacing,300-second HTTP timeout,
at most3 attempts for previously specified429/504/timeout conditions and bounded
Retry-After. Capacity400 is never retried. Local cost-stop60USD with conservative
three-attempt reserve; unresolved/unpriced failures remain visible. Archive all
native outcomes. Baseline historical cost remains separate from these calls.

## Analysis
Freeze code, prompts, schedule, rubric and sources before live requests. Use two
fresh independent automatic raters, blinded to context/condition and each other,
with same six-category/twelve-field rubric. Adjudicate only disagreements. Primary
positive-history recall excludes identity/absent-surname controls: four categories
and nine fields per response. Five profiles per full cell yield20 categories and
45fields. Reuse unchanged sealed baseline ratings.

Report completed and rejected outputs separately, scores only on evaluable
responses, all24cells, native and local token counts, costs, matched differences
on complete pairs and wins/ties/losses. Do not duplicate shared structured outputs
in unique totals, costs or token totals. No independent-binomial confidence
intervals or significance tests; five profiles are dependent across positions,
fields and shared conditions. Full memory serialization contains more information
and metadata than the baseline prompt; no claim of equal token budgets or general
architecture superiority. Collection dates differ. Update reviewer materials
with the literal full-memory result and the earlier retrieval result separately.

## External transport documentation
OpenRouter explicitly documents disabling the plugin with enabled:false:
https://openrouter.ai/docs/guides/features/message-transforms (checked2026-10-01).
The observed native responses, rather than a model-card threshold, determine
capacity outcomes in this experiment.
