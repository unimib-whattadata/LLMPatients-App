# Persistent structured retrieval on the regional scenarios

## Material Passport
Authorized comparison on five simulated patients; no human participants. This
prospective extension compares the unchanged EvidenceMemory retrieval component
with the 120 sealed regional-baseline outcomes. Those baseline outcomes are
already known; the extension is exploratory and separately collected, not a
concurrent randomized full-application trial. Freeze code, inputs, rubric,
source hashes and schedule before structured generation. Report all cells.

## Same incoming histories, different memory policies
The 30 complete pre-cut corpora are identical to
`outputs/regional-memory-compression-2026-09-30/`: five profiles, three placements
of the same 45-turn factual block, and two sizes (approximately64k and1.2M
uncompressed local input tokens). CASE, common instructions, six batched questions
and gold are unchanged. No session10/11 probe answers enter the archive.

Baseline at64k applies no cut or one of six regional50%/75% cuts to its prompt.
At1.2M its prompt is transformed by the OpenRouter context-compression plugin.
The structured policy searches the complete persistent archive before any prompt
cut: native validated fact batches from the original nine sessions, and every
original/filler utterance. Filler is searchable raw text and is not newly
consolidated into facts. The policy can therefore recover information outside
the baseline's surviving prompt. This is the intended persistence intervention,
not a comparison of systems with identical post-cut information. Irreversible
loss before ingestion is not tested. Post-plugin text is unavailable.

Native `EvidenceMemory.retrieve` and `render_evidence` stay byte-identical to the
sealed eleven-session source: limit8, budget1800 native estimated tokens, same
MiniLM encoder revision and batched six-question query. The same original query
embedding truncation (272 encoder tokens versus maximum256) is disclosed. Do not
split queries, increase budgets, insert gold-derived facts, repair extracted
values, add missing evidence or regenerate based on answer quality.

All chronology fields of derived raw records and facts are reindexed from the
regional corpus's displayed positions. Literal utterances, fact values, source
quotes, extraction keys/statuses and IDs are preserved. Original-to-derived
provenance and metadata transformations are archived; original files are never
changed. Only sources from the original45turns support the reused fact batches.

This isolates persistent fact-and-utterance retrieval, NOT the full graph, which
also has summaries, reflections, recent-history and episodic channels and dynamic
state. Reusing old narrative state while relocating unprocessed filler would
not establish a faithful full-application run, so none is attached here.

## Unique prompts and shared comparisons
Build all30 structured contexts offline and hash exact final prompts. Generate
once per unique prompt; identical prompts, if any, share one actual response and
are explicitly mapped. Each64k context is the same for its seven baseline prompt
policies and therefore shares one structured response across those comparisons.
Do not call these seven independent structured generations. At most30 generation
calls;120 mapped comparisons across24 cells. Report actual unique counts and
all profile-level pairings. Compare to every baseline condition, including its
successful full-history and end-position controls.

## Execution
OpenRouter `google/gemini-2.5-pro`, temperature0.7, top_p0.95, max output4096,
reasoning budget1024, stop sequences newline+`Therapist:` and`Therapist:`;
no API seed, no top-k forwarded, provider parameters required and no fallback.
The same context-compression plugin is enabled; small structured prompts should
not trigger it. Check native input counts against local tokenizer counts.

Randomize unique jobs with seed2026100101. Maximum one output8192 recovery only
following an explicit4096-length finish. Serial gate,5-second pacing,300-second
HTTP timeout, and unchanged bounded429/504/timeout retries (maximum3 attempts,
Retry-After respected). Any unresolved service/protocol failure stops the run;
no automatic restart. Preserve all outcomes and costs. Local spending stop15USD,
using the inherited conservative reserve calculation. No paid baseline reruns.

## Evaluation and calculations
Two fresh automated raters see only randomized structured cards, exact answers,
questions and gold. They do not receive prompts, positions, baseline outcomes,
selected evidence or peer labels. Fresh third-context adjudication only for
actual disagreements. Archive requested versus observed model identity; these
are not human clinical judgments. Reuse the baseline's sealed final judgments.

Same primary endpoints: six all-fields-correct categories/twelve fields, with
positive-history recall reported separately (four categories/nine fields).
Identity and unestablished surname controls are excluded from positive recall.
For every one of24 baseline cells: semantic accuracy, completeness, paired
within-profile differences, wins/ties/losses, and native prompt-token differences.
Do not count shared structured responses several times in total cost, total
usage, number of generations or independent sample size. Five profiles are the
case units; positions/fields/shared comparisons are dependent. Descriptive
results only, no independent-binomial confidence intervals or significance tests.

Archive selected fact/utterance counts, final rendered evidence and local/native
prompt sizes. A selected source ID alone does not prove that all fields and
relations from that source reached the prompt. Any later delivered-support audit
must inspect the actual selected quote/value/status, remain separate from gold-
free generation, and not modify prompts. Report component limitations and both
favorable and unfavorable comparisons. Prior longitudinal conclusions remain
unchanged; no claim of full-application superiority from this component test.
