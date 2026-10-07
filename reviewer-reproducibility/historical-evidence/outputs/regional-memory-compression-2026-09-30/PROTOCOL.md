# Recall under regional deletion and automatic compression

## Material Passport
Authorized experiment on five simulated patients. Gemini 2.5 Pro through
OpenRouter; no human participants. Exploratory design fixed after the prior
compression test showed good recall for facts near the beginning. Freeze this
protocol, code, prompts, schedule, rubric and source-coverage definitions before
collection. Report every planned cell, including successes and failures.

## Design: 120 logical patient calls
1. **Controlled deletion, 105 calls**: five profiles × three positions of the
   same original 45-turn fact-bearing conversation block (beginning, middle,
   end) × seven conditions (full history; remove 50% or 75% of history tokens
   from the beginning, middle, or end). Full prompts are approximately 64k local
   Gemini tokens before deletion. Entire therapist/patient pairs are removed;
   achieved fractions and native input tokens are reported. No semantic summary
   is generated. Within a profile/position all seven conditions share the same
   uncut conversation. All positions share the same filler exchanges and the
   same unchanged fact-bearing block, preserving its internal order.
2. **OpenRouter plugin, 15 calls**: five profiles × the same three fact-block
   positions, approximately 1.2M uncompressed local tokens. Only OpenRouter
   decides what is removed. The transformed text is not returned, so actual
   post-plugin source coverage is unknown. Compare recall and native token
   counts across positions. This is a separate large-input experiment, not a
   randomized comparison of 64k deletion with 1.2M automatic compression.

The existing context-compression plugin is enabled for all requests. In the
64k manual experiment no extra router size reduction is expected; validate
native counts against the local tokenizer and flag any additional reduction.
The plugin offers no documented user selection of the removal region; manual
cuts are controlled local perturbations, never described as selectable modes
of the OpenRouter plugin. CASE, common role instructions and final questions
are protected from local deletion. OpenRouter's own transform is outside this
control. The entire prompt remains one serialized user message.

## Corpus and positions
Reuse the first nine sessions (45 real generated patient/therapist pairs) from
the sealed length-stress corpus. Exclude all session 10–11 recall answers. Use
the same deterministic ordinary-communication filler generator and seed; no
gold target names, times or updates enter filler. Reindex displayed chronology
after placing the original block, before deleting, and retain index gaps after
deletion. Keep the original IDs and source mapping evaluator-only. Do not place
the old session numbers into a contradictory display chronology. Use the common
neutral header "Available prior conversation in chronological order" in every
condition. Do not claim that a cut history is complete.

Place the complete fact-bearing block before, halfway through (by filler count),
or after the filler. Measure its token start/end positions; nominal middle is
not claimed to be an exact tokenizer midpoint. Deletion targets refer to
history tokens only, excluding the fixed CASE/instructions/question. Select
the nearest whole-turn interval using cumulative token weights; measure the
achieved exact local history count and full-prompt count after deletion.
Approximate equal budgets are reported, not represented as exact token matching.

## Fixed endpoints and source support
Use the same six questions in one batched query and the same semantic rubric:
six all-fields-correct categories / twelve fields for each completed answer.
Also report **positive history recall** separately: four categories and nine
fields (notebook, appointment details, venues, completed/planned activities).
Identity contributes two fields from protected CASE; the absent surname is one
correct-abstention control. Thus deleting every positive-history source can
still yield 2/6 overall categories; do not interpret this floor as memory recall.

For manual deletion, freeze canonical sufficient authoritative therapist sources:
- notebook title: s01t01;
- partner: s02t01 OR s06t01;
- current and former appointment, including status: s06t01;
- unagreed proposal: s06t02;
- current and former venue, including status: s07t01;
- completed activity: s04t02;
- planned/not-completed named activity: s08t01.

These map to original session-local turn IDs before reindexing; source raw
turn_index is global 1..45. An earlier booking alone does not establish its later
former status. Report stale-source-only cases (s02t01 without s06t01; s03t01
without s07t01) separately. Canonical-source absence is not proof of no possible
textual clue: patient echoes or partial evidence may remain. Report recall among
fields with sufficient canonical source retained and fields with that source
removed, plus source coverage. Do not identify literal keyword presence with
semantic support. Gold files and source-coverage metadata never enter generation.

## Execution and evaluation
OpenRouter `google/gemini-2.5-pro`, temperature 0.7, top-p 0.95, maximum output 4096,
requested reasoning 1024, existing therapist stop strings; no API seed, no top-k
on the wire, no provider fallback. Attest model ID, record realized provider.
Randomize the 105 manual cells with fixed seed 2026093003; then randomize the 15
plugin cells with the same seeded generator. One generation per cell. At most
one 8192-output recovery after an explicit 4096-length finish; never regenerate
for accuracy. Preserve raw requests, responses, costs, retries and failures.

Use the existing serial gate, five-second pacing, 300-second HTTP timeout,
maximum three total verified 429/504/timeout attempts, and bounded Retry-After.
Any unresolved service/protocol error stops the run without automatic restart.
Verified 400 capacity rejections are availability outcomes, not semantic zeros.
Execution budget 60 USD, using the same conservative reserves as the compression
experiment. This is a spending stop rule, not an inferred price guarantee.

Two fresh automatic raters receive randomized IDs, answers, questions and gold,
without position, deletion condition, source coverage, peer ratings or generation
prompts. Adjudicate actual disagreements using a fresh third context. Automatic
ratings are not clinical human judgments; requested and observed model identity
limitations are recorded. No outcomes are dropped for poor accuracy.

## Calculations and interpretation
For each region × fraction × fact-position cell (five profiles), report:
availability; overall and positive-history category/field accuracy; source
coverage and conditional field accuracy; native and local input tokens;
achieved memory reduction; paired change from its full-history control.
For the plugin report the same semantic endpoints by fact position and actual
native input size, without claiming visibility into its transformed text.

Profiles are the independent case units; positions, deletions, categories and
fields are correlated perturbations. Descriptive estimates and paired counts
only, no independent-binomial intervals or significance fishing. A failure after
removing the only sufficient source measures information loss under that policy;
it does not establish inferior reasoning or superiority of a structured system.
No structured system is re-evaluated in this experiment. Preserve the separate
11-session and eight-evidence retrieval-component results unchanged.

Official plugin semantics: https://openrouter.ai/docs/guides/features/message-transforms
