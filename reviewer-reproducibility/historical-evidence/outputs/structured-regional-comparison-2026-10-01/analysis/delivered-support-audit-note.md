## Material Passport

Descriptive audit of all 30 frozen structured contexts from five simulated patients. Requested model: `gpt-6-astra`; observed identity: `not_exposed_by_runtime`. Verification status: **ANALYZED**. No generated answers or ratings were read; no network or external model calls were made; no generation input was changed.

Two measures are kept separate. **Explicit semantic content** means the rendered value/quote contains the correct value and requested relationship/status, regardless of speaker. It can occur inside a patient's proposed wording and does not establish confirmation. **Therapist-authoritative support** is a conservative subset requiring the full content in a therapist record. It is not an additional answer-scoring rule.

| Profile | 64k: semantic / therapist | 1.2M: semantic / therapist |
|---|---:|---:|
| Alex | 2 / 2 | 0 / 0 |
| Crystal | 2 / 2 | 2 / 2 |
| Daniel | 5 / 3 | 3 / 3 |
| Jason | 2 / 0 | 2 / 0 |
| Juanita | 4 / 4 | 3 / 3 |

Each entry is out of nine positive-history fields and holds across all three placements. Across the 30 contexts, explicit semantic content was delivered for **75/270 field-context instances (27.8%)**; the therapist-authoritative subset was **57/270 (21.1%)**. The difference comprises six instances of plain patient notebook/partner recall in Daniel 64k and twelve instances of correct venue content inside Jason's proposed wording. The remaining fields include partial mentions and competing values; they must not all be described as absent.

No appointment current/former/proposal field has its full value and requested status delivered. Daniel 64k retains Wednesday 17:45 without its former status or Friday correction; all Daniel contexts mention Erik in patient practice-venue examples. Juanita 64k names Rina as a completed-activity coparticipant, leaving the appointment-partner relation inferential. Proposed/superseded tags attached to statement or phrasing keys do not establish appointment or venue status.

All 240 selected items matched their exact rendered headers, values/statuses and quotes; all 30 prompt hashes and questions matched. All 72 audited source hashes remained unchanged. The evidence reduces to 10 semantic groups after normalizing only session and turn numbers. Selected IDs and unrendered search/previous-value metadata were not counted as delivery. The JSON contains all 270 field judgments and exact evidence blocks.

These are dependent descriptive observations from five simulated profiles. They do not measure generated-answer accuracy, persistent-archive retention, or full-application performance.
