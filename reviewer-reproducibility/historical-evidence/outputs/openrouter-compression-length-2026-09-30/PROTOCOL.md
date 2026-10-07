# OpenRouter automatic compression across history lengths

## Scope and prospective extension
The user explicitly selected automatic OpenRouter compression, rather than a
semantic running summary. This is a prospective extension designed after seeing
the sealed `../memory-length-stress-2026-09-30` results. Freeze this protocol,
code, schedule, exact input references and scoring rubric before live calls.

Five simulated profiles × five nested history sizes = 25 patient calls. Reuse
the previous full-history prompts byte for byte, including the clinical CASE,
common instructions, session/turn labels and six simultaneous recall questions.
Lengths are base (about 11–13k), 64k, 256k, 900k and 1.2M uncompressed local Gemini
text tokens. Change only the request field:

    "plugins": [{"id": "context-compression"}]

All history is inside the same single user message used in the previous test.
This isolates enabling the plugin on that implementation. It does not test a
different conversation serialization into separate API messages. The latter
could behave differently. Never silently switch serialization after a failure.
No local truncation or summary is added. Gold answers never enter generation.
Existing full-history and evidence-component outcomes are reused as separately
collected controls, not rerun or overwritten. No randomized causal comparison
over service date or sampling randomness is claimed.

## Model and execution
`google/gemini-2.5-pro` via OpenRouter; temperature 0.7, top-p 0.95, maximum
output 4096, requested thinking budget 1024; existing stop sequences. No API
seed. Legacy top-k 40 is omitted from the wire. Require supported parameters,
disable provider fallbacks, attest the requested model in every native response.
Local copies of the transport and retry verifier add the same plugin field;
all other code in these two copies is unchanged and diffs are archived.

Use the previous flat-arm order (ascending lengths, randomized profiles).
Keep the existing serial gate (five seconds minimum between starts) and at most
three total attempts only for verified timeouts/504 or 429. Respect Retry-After
up to the existing 300-second bound. HTTP timeout 300 seconds. On an explicit
output-length finish, allow one recovery with output budget 8192; archive both.
Never retry for semantic quality. An archived HTTP/API 400 context-capacity
rejection is an availability outcome at any nominal length and is not retried.
Other unresolved API/protocol/service failures stop collection; no automatic
restart. A compression/plugin-specific invalid request also stops for inspection.

Before each invocation, known charges plus reserves for unpriced timeouts and
three potential next attempts must fit a USD 60 execution ceiling. Conservative
forecast: 1.35 × local input tokens at USD 4.50/M, output 8192 at USD 27/M, plus
10% margin. This is a spending stop rule, not a price guarantee. Archive native
charges and unknown cost separately. No new summary-generation calls occur.

## Fixed scoring and measurements
Use exactly the prior six-category, 12-field semantic rubric. Two fresh automatic
raters receive randomized answer IDs, questions and gold only, without arm,
length, input prompts or the other ratings. A fresh adjudicator resolves actual
disagreements. These are model ratings, not human clinical validation.

Report for every length:
- complete responses / five attempted and context or other failures separately;
- strict correct categories / 30 and correct fields / 60 when all five return;
- all-six-categories profile success and per-category/profile values;
- local uncompressed input tokens versus native provider-reported prompt tokens;
- prompt token change relative to uncompressed local count minus one, calibrated
  from all 40 accepted requests in the previous test (not direct text inspection);
- native model/backend, actual charges, latency and retries.

A rejected request has no semantic accuracy, not 0% accuracy. Omitted sections
in a complete answer are errors. Do not infer which exact passages survived
from the answer or token count. The API may not return the transformed prompt;
archive that observability limitation. A smaller native token count is evidence
of reduced input size, not proof of semantic summarization or the exact cut rule.

Five profiles are the case units; categories and nested lengths are correlated.
Use descriptive values only, no significance tests or independent-binomial CIs.
One stochastic generation per cell cannot identify small length trends. Keep
all cells, including perfect baseline results or poor structured results.

## Interpretation boundaries
The filler consists of deterministic ordinary communication exercises, with
salient target facts near the beginning and questions at the end. Middle deletion
could preserve these deliberately located facts. Successful compression here
does not establish retention when targets occur in deleted regions. Conversely,
failure of this single-message format does not establish that every possible
OpenRouter message layout fails. Do not choose new fact positions after seeing
outcomes and present them as this experiment.

The evidence condition is the eight-item/1800-estimated-token retrieval component
from the prior stress test, with six questions batched. It is not the complete
11-session system. Preserve the separate longitudinal result (85/90 structured,
89/90 full history) and the prior stress results unchanged. This experiment tests
automatic input management, not the clinical validity of simulated patients.

## Provenance
Archive source hashes, exact outgoing requests and native responses, per-attempt
retry journal, ratings, analysis and final manifest. Never archive credentials.
Previous native controls: `../memory-length-stress-2026-09-30/runtime-02/answers.jsonl`.
Previous analysis: `../memory-length-stress-2026-09-30/analysis/results.json`.
Official documentation checked 2026-09-30:
https://openrouter.ai/docs/guides/features/message-transforms
