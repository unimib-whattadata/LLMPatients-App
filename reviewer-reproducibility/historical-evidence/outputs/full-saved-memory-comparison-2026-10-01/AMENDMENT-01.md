# Capacity classification: OpenRouter 8 MB text limit

The first planned full-memory request (job 001) returned HTTP 400 with the exact message “The total text input size exceeds 8 MB” (spaces preserved in the native archive). The original capacity detector recognized token/context-length limits but not byte limits, so collection stopped before any output was accepted. The original code, native request/error, STOP and runtime are preserved.

`runner_v2.py` adds byte-size capacity errors to availability outcomes, verifies the complete original request against its frozen full prompt, and inherits that one error without another HTTP request. It proceeds only with the 29 unattempted jobs, with identical frozen prompts, order, model, decoding, plugin disabled, budget and retry policy. No source or generation parameter changes; no semantic-quality retry. This is continuation of the planned capacity experiment after a classification defect, not a response to a service outage.

The combined ledger is `runtime-02/answers.jsonl`; original native data for 001 remain in `runtime/001/`. All other native records are under runtime-02. The revised analysis reads both roots, counts unique jobs once, and uses the same endpoints and rubric. Oversize outputs remain unavailable, never semantic zeros. No assertion about the model context limit is inferred from the gateway text-byte limit.
