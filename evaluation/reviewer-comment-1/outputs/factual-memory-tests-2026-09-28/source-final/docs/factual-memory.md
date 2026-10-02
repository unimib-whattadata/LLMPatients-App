# Conversation facts and their sources

The patient prompt now receives original conversation evidence alongside the
existing narrative summaries. The implementation is in
`agent/core/factual_memory.py`, with graph integration in
`agent/core/langgraph_builder.py` and rendering in `agent/core/prompt_builder.py`.

## Write and read path

1. `update_memory` appends each original therapist/patient exchange before the
   five-turn history window is trimmed. The JSONL archive is
   `data/memory/<therapist_id>__<patient_id>.jsonl`.
2. `finalize_session_memory` creates the session reflection and long-term summary,
   then extracts facts from batches of at most five unprocessed source turns.
   Extraction uses temperature 0.2 and an output allowance of 8192 tokens for
   Gemini (2048 for other runners). Gemini 2.5 gets an explicit thinking budget
   of 1024 tokens so reasoning leaves room for the JSON output. This
   adds one model call per batch, excluding provider recovery attempts.
3. Every proposed fact must identify an archived turn and its speaker. Its quote
   must occur literally in that speaker's text, and its value must occur in the
   quote. Invalid JSON or an invalid fact rejects the entire batch. Original
   sources remain available; finalization does not report success on failure.
4. At the next turn, retrieval combines lexical matching and the existing local
   sentence encoder over facts and original utterances. Retrieval also works
   before extraction. Topic classification does not exclude source evidence.
5. The prompt receives attributed quotes in source order, with explicit current
   or superseded markers for extracted facts. It tells the patient to acknowledge
   missing information and to prefer original evidence for names, labels and times.

## Records and chronology

- `conversation_turn`: original texts, patient/therapist/session IDs, turn index,
  session order, timestamp, topic and an evidence eligibility flag. Turns flagged
  by the existing input safety check remain archived but are not retrieved.
- `fact_batch`: validated facts plus processed source IDs. Successful batches are
  idempotent when finalization is retried or the store is reopened.
- Each fact includes entity, attribute, literal value, speaker, source ID, quote,
  and status (`reported`, `proposed`, `agreed`, `completed`, or `negated`).
- Versions are grouped by entity, attribute, speaker and status. Source session
  order and turn index determine precedence, independently of extraction order.
  Both old and current values remain available. Searching an old value can also
  retrieve its current version.
- For an explicit rename, a unique previous name/title/label key for the same
  entity, speaker and status is reused. The originally extracted attribute is
  also retained. No such merge is made without a rename or with ambiguous keys.
- Multiple values of one attribute from the same source remain simultaneous
  assertions. Their fact-ID order cannot silently choose a winner. A later
  source can supersede the previous group, preserving all previous values.
- A later proposal does not overwrite an agreement. Statements by the patient
  and therapist remain separately attributed. Clinical profile fields are not
  changed by memory extraction.

## Context budgets

- Source evidence: at most eight records and approximately 1800 tokens.
- Recent dialogue: approximately 1800 tokens within the existing five-turn window.
- Retrieved narrative memories: approximately 700 tokens.

These are conservative local estimates, not counts from the provider tokenizer.
Quotes and turns are included whole or omitted; parentheses are preserved.
The existing summary and reflection length controls still apply to narrative
text. Old episode summaries, session reflections and long-term summaries are all
searched; topic agreement is only a ranking bonus.

## Failure and compatibility behavior

The archive stays append-only. Invalid batches do not mark their source turns as
processed. Valid earlier batches may already be saved if a later batch fails;
retry skips those completed batches. The session remains open on a failed
finalization. The raw archive can still answer retrieval queries.

Existing narrative-only archives remain readable. They gain the broader narrative
search, but missing original turns are not reconstructed automatically. Importing
old transcripts is a separate operation; `scripts/check_memory_retrieval.py`
performs an isolated diagnostic replay without modifying a production archive.

Literal validation checks provenance, not full semantic entailment. Entity/key
selection and status assignment still depend on the model. Proposal/question
guards inspect the enclosing source sentence and require explicit assertion
markers for agreement/completion; this conservative rule can reject legitimate
paraphrases. These checks do not establish clinical truth.
The rule excluding patient answers to explicit name/time recall questions is a
conservative heuristic to avoid reinforcing guessed answers. Ordinary
autobiographical recall remains eligible. Concurrent sessions, very large archives
and full longitudinal performance need separate evaluation; embeddings are
currently recomputed for retrieved candidate sets.

## Tests

With the project's dependencies available:

```sh
python -m unittest agent.test_factual_memory agent.test_session_memory agent.test_vertex_generation agent.test_vertex_rate_limit
python scripts/check_memory_retrieval.py --campaign /path/to/archived/campaign --output /path/to/fresh/replay
```

The replay reads expected values only after retrieval. It tests whether evidence
is present in the selected context, not whether a model answers correctly.
The bounded real-model integration probe and its exact prompts, settings and
responses are archived in the paper repository at
`outputs/factual-memory-tests-2026-09-28/`. That probe uses Gemini 2.5 Pro via
OpenRouter, separate processes between sessions, and stops on a provider
availability error. It is a component test, not a new eleven-session comparison.
In the recorded run, both extraction sessions completed; an upstream 504 stopped
the first final recall question. The six planned final answers remain untested.
Subsequent question, key-alignment and simultaneous-version corrections were
verified offline, including replay of the two saved, complete extraction outputs.

The budget mapping follows the provider documentation:
[OpenRouter reasoning tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
and [Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking).
