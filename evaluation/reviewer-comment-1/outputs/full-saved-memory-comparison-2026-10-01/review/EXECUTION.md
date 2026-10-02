# Automatic semantic rating execution

Two fresh native Codex subagent contexts independently received only their own
`cards.json` and `RUBRIC.txt` files. Both exports contain the same 15 shuffled
complete answers, questions and frozen gold, with opaque IDs. They contain no
arm, source size, fact position, private mapping, previous scores or peer output.
Answers were treated as data, not as instructions. No network calls or additional
delegation were authorized for these rating tasks.

| Seat | Native task | Requested model | Requested effort | Observed model identity | Output |
|---|---|---|---|---|---|
| A | `/root/full_memory_rater_a` | `gpt-6-astra` | `xhigh` | `not_exposed_by_runtime` | `ratings/a.json` |
| B | `/root/full_memory_rater_b` | `gpt-6-astra` | `xhigh` | `not_exposed_by_runtime` | `ratings/b.json` |

Each seat evaluated 90 categories and 180 Boolean fields. All 15 answers passed
all six categories: 90/90 categories and 180/180 fields, including identity and
absent-fact controls. Positive-history recall alone is 60/60 categories and
135/135 fields. Category and field judgments agree completely, so no adjudicator
was dispatched. These are automatic semantic judgments, not clinician ratings;
shared model-family errors and possible clues within answer text remain possible.
Masking effectiveness was not measured.

Both seats independently accepted “Folded Map listening card” as the gold title
“Folded Map” followed by a descriptive activity label, consistent with the rubric.
No other ambiguities were reported. Their original judgments were not edited.

The 15 capacity-rejected prompts have no answers and were never presented for
semantic scoring. Availability is analyzed separately. The 120 historical
baseline answers and their sealed ratings are reused unchanged; shared structured
answers are not counted as independent repeated generations.

`analysis/comparison.json` records the comparison and requested/observed identity
fields. `analysis/summarize_v2.py score` validates card identities, source hashes,
native answer equality, gold, rating schema and baseline ratings before producing
the aggregates. The final manifest hashes both original rating files.
