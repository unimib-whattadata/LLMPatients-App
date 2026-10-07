# Operational amendment after job 31

Recorded 2026-09-30 after the first 30 completed calls and before any request for
jobs 32–50. This is a post-observation deviation from the original local-count
guard; the original protocol and code remain unchanged.

Job 31 (full history, nominal900,000) received definitive HTTP/API400:
the endpoint declared a 1,048,576-token context limit and estimated 1,107,919
input tokens plus4,096 output tokens (1,112,015 total). The metadata provider
name is null. These are **router/endpoint estimates**, not native provider usage.
The archived local Gemini count is lower. The request produced no model answer.

The original exception required a local count above1,048,576 and therefore
stopped instead of classifying this known capacity outcome. A fresh independent
automatic audit confirmed that accepting this archived rejection and continuing
the unchanged remaining matrix is a defensible operational amendment. Requested
review model gpt-6-astra, effort xhigh; served model identity is not exposed.

Amended exception: for the full-history arm only, require the exact matching
durable error record, HTTP/API400, and an explicit context/token-limit rejection,
without requiring the separate local tokenizer to agree that the limit was
exceeded. All other unresolved errors retain the original stopping rule.

The original runtime, STOP, gate, source files, schedule and exact prompts remain
unchanged. Record`8eea4bc9-1241-4199-a0b0-a80877b8543b` is normalized into a
non-evaluable context-rejection outcome in`continuation-inputs.json`. It is
**not requested again**. All30 completed answers are carried forward unchanged.
The previous worker was confirmed not running. The new`runtime-02` uses a fresh
gate and continues jobs32–50 once, preserving model, parameters and order.

Observed charges USD4.101272875 and zero unpriced timeout reserves are carried
forward. The USD40 budget gate still applies. No answer was regenerated, scored
or selected to trigger this amendment. Five-case semantic denominators lose six
categories for a rejected whole response; availability and rejection counts are
always reported beside accuracy. No0% semantic score is assigned to a rejection.

`continuation.patch` records the exact code changes. `continuation-manifest.json`
freezes this amendment, continuation code and carry-forward ledger before calls.
