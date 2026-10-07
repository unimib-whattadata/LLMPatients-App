# Full saved memory, without selection or cuts

User-requested policy: send all durable saved-memory records, including every
field and historical version, plus the same regional raw filler. No top-eight
retrieval, local truncation or context-compression plugin. This is a complete
saved-memory payload experiment, not a new full-application graph replay.

Start with `REPORT.md` for all 24 cells and explicit availability denominators.

- `audit/saved-memory-inventory.json`:81-record prefix per profile, independently
  matched to session 9 closing hash; later recall answers excluded.
- `audit/full-payload-completeness-review.json`: all 30 full payloads roundtrip
  with every field/record and regional raw utterance preserved.
- `inputs/`: all exact prompts in lossless `.txt.gz` storage; no semantic
  compression. `completeness.json` gives plain-text hashes and full counts.
- `manifest.json`: code/input freeze before first API request.
- `AMENDMENT-01.md`, `manifest-amendment-01.json`: byte-capacity recognition
  amendment; original job 001 inherited once, never resent.
- `runtime/001/`: immutable initial request and 8 MB rejection.
- `runtime-02/`: remaining requests; `answers.jsonl` combines every unique outcome.
- `review/`: fresh blinded automatic ratings and execution details.
- `analysis/results.json`: unique totals and 120 mapped comparisons across 24 cells;
  `runtime-verification.json` checks all native payloads across both roots.
- `figures/full-saved-memory-recall.png` and `.svg`: all 24 cells, rejected inputs N/V.
- `previous-review-response/`: verified preceding TeX/PDF checkpoint.
- `final-manifest.json`: final integrity seal and immutable source links.

## Offline recalculation

From the repository root, using Python 3:

```sh
python3 outputs/full-saved-memory-comparison-2026-10-01/analysis/summarize_v2.py compare
python3 outputs/full-saved-memory-comparison-2026-10-01/analysis/summarize_v2.py score
python3 outputs/full-saved-memory-comparison-2026-10-01/analysis/verify_runtime_v2.py
python3 outputs/full-saved-memory-comparison-2026-10-01/analysis/render_report.py
```

These commands make no network calls. Use a copy to preserve the final seal:
derived timestamps change on recalculation. Absolute source paths identify the
local archives used during collection; a relocation requires declared rebasing
on a copy, preserving original hashes. Generation/retrieval models need not be
rerun to verify these results. Gzip files decode directly with Python's `gzip`.
The runner refuses to overwrite existing runtime directories. No credential is
included in the experiment artifacts.
