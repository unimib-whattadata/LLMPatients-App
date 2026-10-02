# Frozen answer interpretation

Apply these criteria to every condition. Use a condition-blinded review of ambiguous answers, with the reviewed answer and reason archived. A semantic reviewer must see the same source-based gold for every condition; its output is an assessment, not an independent clinical validation.

## Literal facts

The requested title must be associated with the correct object. Ignore case and innocuous whitespace. A response that includes the right string only to reject it, speculate about it, or attach it to the wrong object is incorrect. A response may mention the other object accurately as a contrast; the occurrence of a `forbidden_values` string is only a flag for review, not a sufficient automatic failure.

## Current and previous slot

The correct day and time must be assigned to the temporal role requested. Accept semantically equivalent time formatting, such as a correctly disambiguated 12-hour rendering. Mentioning both slots is acceptable if their current/previous roles are correct. Merely listing both or choosing the wrong one is incorrect. The corpus explicitly changes the arrangement; no inference about attendance or completion is justified.

## Actual agreement

The accepted practice must be identified as accepted. The declined practice may be mentioned explicitly as declined. Listing both without distinguishing their statuses, accepting the declined practice, or claiming the accepted practice was already completed is incorrect. The source contains both the proposal and the patient's explicit decision in the same exchange.

## Completed exercise

The completed exercise must be identified as completed. Mentioning the other exercise as still planned is acceptable. Reporting both as completed, treating the planned item as completed, or merely listing two titles without the requested status is incorrect. No general improvement can be inferred from completion of the first paper exercise.

## Absent attributes

A correct answer clearly abstains: the detail is unknown, not remembered, or was not specified. It must not supply a guessed material or guessed reverse-side inscription. “Probably cardboard” remains an invented answer even if accompanied by uncertainty. “I do not know; we only discussed the title” is a valid abstention. Gold contains no source because the question asks for an attribute never provided in the source dialogue or profile.

## Reporting

Archive exact replies and score at the probe level. Report literal/source-presence checks separately from assessed answer correctness; retrieval of a string is not proof of a correct answer. Summarize by category and by trajectory, with all provider failures and unscorable outputs preserved. The five trajectories are the patient-level paired units; current/past probes and probes within a trajectory are not statistically independent.

Do not silently convert a transport failure into a memory error or a wrong answer. Do not regenerate an incorrect valid response to obtain a better outcome. Any allowed retry policy, common decoding parameters, run order, budgets, and end-of-session state must be frozen by the main harness before provider calls.
