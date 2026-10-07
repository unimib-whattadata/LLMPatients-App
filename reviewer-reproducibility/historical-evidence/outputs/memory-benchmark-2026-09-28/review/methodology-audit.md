## Material Passport

- Artifact: prospective methodological review of the memory component benchmark.
- Date: 2026-09-28.
- Mode: experiment-agent, protocol/code inspection only.
- Materials: parent-supplied design; current `agent/core/factual_memory.py`, `langgraph_builder.py`, and `prompt_builder.py` in the LLMPatients-Agent repository.
- Access: read-only source inspection; writes limited to this review directory; no provider calls.
- Status: initial review; protocol, corpus, and executable harness not yet available for final inspection.
- Claim boundary: software component comparison on synthetic dialogues; no clinical validity, no expectation that any baseline must fail.

## Design and interpretation

The proposed seven conditions are full history without a memory ceiling and three bounded conditions at each of 4,000 and 8,000 estimated memory tokens: rolling summary plus recent dialogue; retrieved original dialogue; and structured facts plus original dialogue. All conditions should receive the same profile, source dialogue, question, generation instructions, model, decoding settings, and a fresh query state. Query answers must not become evidence for subsequent queries.

The full-history arm is an unconstrained reference. The primary fair capacity comparison is between bounded arms at the same ceiling. C versus D isolates the implemented factual-memory augmentation only if summary, recent-history allocation, retrieval scoring formula, embedding implementation, and selection limit match. D necessarily changes candidate contents and consequently corpus-dependent ranking statistics; this is part of the augmentation being tested.

Five profiles provide five paired trajectories, with eight correlated probes each. Report per-profile and per-category accuracy as well as total counts. A total of 280 completions does not provide 280 independent experimental units. One stochastic completion per cell is a descriptive initial benchmark; it does not estimate within-cell sampling variance.

## Minimum checks before the first provider call

1. Freeze hashes of corpus, separate gold file, protocol, prompts, harness, scoring implementation, and runtime memory implementation. Corpus and gold must be finalized before seeing model responses.
2. Verify source alignment and absence of contradictory gold. Gold labels and expected answers must never enter extraction, summary generation, retrieval queries beyond the published question, or patient-response prompts.
3. Freeze local execution order with a recorded seed and interleave conditions rather than running one entire condition first. Provider request seeds may be unavailable; disclose this independently of the local order seed.
4. Assert equal raw sources across arms, chronological preparation, no future turns at any earlier session, no final-answer reinsertion, and no sharing of one patient's facts with another.
5. Compute the rendered memory budget including labels, headers, and separators. Record used estimated tokens per query, total provider input/output/reasoning tokens, wall time, and cache/accounting fields. A ceiling is not evidence that an arm actually used that capacity.
6. Choose the same explicit retrieval limit for C/D. The production default of eight results may leave 4k and 8k conditions effectively identical. If changed, document the override as a component benchmark parameter.
7. Freeze answer-scoring rules. Negation, temporal distinction, proposal versus commitment, planned versus completed action, and abstention cannot be validated solely by a keyword substring. Preserve all answers for rule-based and semantic inspection, with any manual adjudication recorded separately.
8. Freeze failure handling. Provider availability errors stop the live run without automatic retry; completed responses remain checkpointed. Decide in advance how invalid extraction batches, local retrieval errors, empty responses, and output truncation enter denominators. Do not silently repair them or select the best retry.
9. Check transport settings and model identity against native request records, including extraction and summary calls. Use the same final-response settings in every arm; preparation settings may differ by role but must be documented.
10. Preserve all development and live outputs. Running a diagnostic after a failure must not overwrite the predeclared main experiment.

## Costs and practical comparison

Report final-query costs separately from preparation. With 12 exchanges per session, five-source extraction batches imply three extraction calls per session, hence 165 extraction calls for five 11-session trajectories, in addition to 55 rolling summaries and 280 final completions if all phases run once. Count actual calls and failures rather than only this theoretical total.

For each deployable configuration, charge the preparation it needs: summaries to summary-dependent arms, extraction to structured arms, and local indexing/retrieval CPU to retrieval arms. Shared execution of common summaries is an experimental optimization; it does not make their amortized deployment cost zero. Show both observed spend and per-configuration accounting, with the number of subsequent queries used for amortization explicit.

Local encoding time, memory/index size, and final-response latency should remain distinct from provider tokens. Savings claims based only on a smaller final prompt would omit the cost of building and updating memory.

## Relevant implementation limitations to retain as outcomes

- Fact identity relies on model-produced entity and attribute labels. Current versions are grouped by entity, attribute, speaker, and status. Different speakers/statuses remain separate; an old fact can still be labeled current in a parallel group after a real-world update.
- A narrow name/title normalization exists for explicit renaming, but it is not a general entity-resolution mechanism.
- Only the last 100 current facts are supplied to extraction for key reuse. Long trajectories may lose key context.
- One unsupported proposed fact rejects an entire extraction batch. Raw dialogue remains stored, but structured preparation may not complete.
- Literal quote/value checks ensure source substrings. They do not prove that the chosen attribute, entity, status, or clinical interpretation is semantically correct.
- Lexical/semantic retrieval can silently fall back to lexical scores for several encoder exceptions. Record the effective path so a fallback is not mistaken for the planned embedding condition.
- The estimator is a local approximation, not Gemini's tokenizer. Actual provider prompt tokens should be reported in addition.

These limitations must not be fixed in response to main benchmark outcomes and then hidden by rerunning the same corpus as if it were held out. Any later changes require a separately identified development iteration or new validation corpus.

## Final audit

Pending the frozen corpus, protocol, and harness.
