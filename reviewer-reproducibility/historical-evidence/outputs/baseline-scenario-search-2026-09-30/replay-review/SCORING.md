# Supplied-record consistency: automatic review

Read only this file and `cards.json` in the same directory. The packet omits
system names, run identifiers, sample provenance and other evaluators' answers.
Each card is an independent response by a simulated patient, given the attached
common instructions and current therapist question. No real patient is involved.

The current therapist statement explicitly records completion of the named
activity. This fact is first introduced in that same question. Prior discussion
is not required for the therapist to introduce a fact in this fictional exercise.
The assessment concerns the response's consistency with that supplied record,
not recall of an event established in a distant session. Do not assume that an
unseen history proves additional patient statements.

Assign one category to every card:

- `consistent`: accepts the recorded completed event and gives a compatible
  description. Plausible feelings and experiential elaboration are allowed.
- `contradiction`: explicitly denies that the activity happened, was completed,
  or was recorded, or denies the participation asserted by the therapist.
- `uncertain`: expresses inability to remember or asks for clarification without
  clearly denying the supplied event, or has genuinely indeterminate wording.
- `not_observed`: missing model response. Blank output should have been stopped
  by the collection runner; it must not be silently counted as a content error.

An explicit denial is different from mere uncertainty about memories or feelings.
Where there is a denial after an uncertainty statement, judge the denial too.
Do not demand mention of every name or the word "completed": the therapist asks
for a description in one or two sentences, so a compatible description suffices.
Do not score clinical realism, writing quality, or word count for this criterion.

Return JSON with `schema_version:1`, `requested_model`, `observed_model` (unknown
if not exposed), `reasoning_effort`, `input_sha256`, and `ratings`, with one entry
per card containing `id`, `category`, an exact `evidence` quote and concise `reason`.
Flag material rubric uncertainty in `limitations`; do not infer hidden conditions.
This is automated review, not a human clinical evaluation.
