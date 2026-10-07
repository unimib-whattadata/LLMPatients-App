# Misstep evaluation

This folder preserves the blinded clinician annotation exercise and automatic detector comparison reported in the manuscript. It covers 20 simulated transcript sets, each with three short sessions, and 300 therapist turns.

- `transcripts/`: original texts identified as T001–T020 and the internal condition key.
- `completed/`: the two returned clinician workbooks, preserved as primary annotation evidence.
- `automatic_detector/`: saved detector results, summaries, the Panel B calculation script and `panel_b_metrics.csv`.
- `clinician_evaluation/`: workbook generation and verification scripts; these require `@oai/artifact-tool`.

Source transcripts contain patient/condition metadata. For a new blinded annotation exercise, use the workbook builder, which removes those fields in memory. Exclude the internal condition key from the rater package.

## Recalculate Panel B

From the repository root, with Python 3 and `openpyxl` installed:

```sh
python3 evaluation/misstep/automatic_detector/compute_panel_b_metrics.py
```

The script reads the saved detector JSON and both clinician workbooks, then writes `automatic_detector/panel_b_metrics.csv`. It repairs the archived workbook XML namespace in memory and leaves the original workbooks unchanged. A mismatch against the expected manuscript values raises an error before writing results.

The five reference definitions compare the same turns against clinician 1, clinician 2, either clinician, both clinicians and deliberately scripted missteps. They are alternative labels, not independent datasets. Recalculation uses saved judgments and makes no model requests; rerunning the detector or human annotation creates new judgments.

For the combined experiment checks, use the [canonical reproducibility package](https://github.com/cremarco/LLMPatient---APPLICATION/tree/main/reproducibility/experiments).
