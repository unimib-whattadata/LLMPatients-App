# Misstep Evaluation Materials

This directory contains the materials associated with the blinded clinician
annotation exercise for therapeutic missteps reported in the manuscript.

The aim of this package is to make the transcript corpus and annotation
materials inspectable while keeping the distinction clear between reviewer-facing
materials, internal deblinding information, and completed clinician workbooks.

## Directory Layout

```text
misstep/
  transcripts/
    transcript_T001.md ... transcript_T020.md
    internal_transcript_condition_key.csv
  clinician_evaluation/
    build_blinded_clinician_evaluation_workbook.mjs
    verify_blinded_clinician_evaluation_workbook.mjs
  completed/
    LLMPatients_Misstep_Clinician_Evaluation_Rater_El_Completed.xlsx
    LLMPatients_Misstep_Clinician_Evaluation_Rater_Er_Completed.xlsx
  automatic_detector/
    evaluate-misstep-corpus.ts
    misstep_corpus_app_results.json
    misstep_corpus_app_summary.csv
    compute_panel_b_metrics.py
    panel_b_metrics.csv
```

## Transcript Corpus

`transcripts/` contains the 20 source transcript sets used for the misstep
annotation exercise. The filenames preserve the blinded transcript identifiers
(`T001` to `T020`) used in the clinician workbooks and in the analysis.

Each transcript contains three short sessions with alternating therapist and
patient turns. The source files also contain internal metadata, including the
simulated patient identifier, generation condition, script variant, and
available generation details. These metadata are useful for audit and analysis,
but they were not shown to blinded clinicians.

`internal_transcript_condition_key.csv` is the internal deblinding key. It maps
each transcript identifier to patient, condition, run, script variant, status,
and source path. This file should be treated as internal evaluation metadata and
should not be distributed as part of a blinded rater package.

## Clinician Evaluation Workbook

`clinician_evaluation/` contains the scripts used to build and check the
clinician-facing workbook.

- `build_blinded_clinician_evaluation_workbook.mjs` builds the blinded workbook
  from the source transcripts.
- `verify_blinded_clinician_evaluation_workbook.mjs` checks workbook structure,
  transcript completeness, turn counts, and obvious blinding leakage.

The build script applies blinding in memory: it removes condition labels,
patient identifiers, script variants, model information, and system metadata
from the text shown to clinicians. For this reason, separate blinded Markdown
copies are not stored in this directory. The blank clinician workbook is also
not stored because it can be regenerated from the source transcripts.

The scripts depend on the Node package `@oai/artifact-tool`, which was available
in the runtime used to create the workbook.

## Completed Clinician Workbooks

`completed/` contains the two returned clinician annotation workbooks:

- `LLMPatients_Misstep_Clinician_Evaluation_Rater_El_Completed.xlsx`
- `LLMPatients_Misstep_Clinician_Evaluation_Rater_Er_Completed.xlsx`

These files are primary evaluation evidence for the manuscript's reported
expert-annotation results. They may include clinician ratings, misstep labels,
confidence scores, rationales, and notes. Treat them as sensitive research
materials when deciding what can be shared beyond peer review.

## Automatic Detector Outputs

`automatic_detector/` contains the automatic misstep-detector outputs used for
Panel B of the manuscript table and the local reconstruction script for those
metrics.

- `misstep_corpus_app_results.json` is the transcript-level detector output,
  including detected categories, confidence values, severity levels and
  therapist-turn evidence references.
- `misstep_corpus_app_summary.csv` is a compact transcript-level summary of the
  same detector run.
- `evaluate-misstep-corpus.ts` is the application-side runner that produced
  those detector outputs. It is included for provenance; it depends on the
  LLMPatients application source tree.
- `compute_panel_b_metrics.py` recomputes the manuscript Panel B confusion
  matrices and metrics from `misstep_corpus_app_results.json` and the two
  completed clinician workbooks.
- `panel_b_metrics.csv` is the generated output of
  `compute_panel_b_metrics.py` and should match Panel B in the manuscript.

The detector-output files were recovered from the LLMPatients-App repository
commit `89e34a5bf95e2f40d2cf710975a3484735834248` (`Add misstep corpus app
evaluation results`) and archived here so that Panel B is reproducible from this
evaluation directory.

### Reproducing manuscript Panel B

The reconstruction script is self-contained with respect to the archived
evaluation files, but it requires a Python environment with `openpyxl` installed
to read the completed clinician workbooks. It was checked with Python 3 and
`openpyxl` 3.x.

From the repository root, prepare an environment if needed:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install openpyxl
```

Then regenerate the Panel B metrics:

```bash
python3 evaluation/misstep/automatic_detector/compute_panel_b_metrics.py
```

The script reads:

- `automatic_detector/misstep_corpus_app_results.json`
- `completed/LLMPatients_Misstep_Clinician_Evaluation_Rater_El_Completed.xlsx`
- `completed/LLMPatients_Misstep_Clinician_Evaluation_Rater_Er_Completed.xlsx`

It writes:

- `automatic_detector/panel_b_metrics.csv`

The script repairs the invalid `dc:creator` namespace in the archived clinician
workbooks in memory before reading them. It does not modify the original xlsx
files. If the recomputed values differ from the manuscript Panel B values, the
script exits with an error rather than silently overwriting the CSV.

The expected output is:

```text
Rater 1: TP=159 FP=34 TN=44 FN=63 P=0.824 R=0.716 F1=0.766 Acc=0.677
Rater 2: TP=134 FP=59 TN=86 FN=21 P=0.694 R=0.865 F1=0.770 Acc=0.733
Either clinician positive: TP=161 FP=32 TN=44 FN=63 P=0.834 R=0.719 F1=0.772 Acc=0.683
Both clinicians positive: TP=132 FP=61 TN=86 FN=21 P=0.684 R=0.863 F1=0.763 Acc=0.727
Therapist turns with deliberately scripted missteps: TP=131 FP=62 TN=88 FN=19 P=0.679 R=0.873 F1=0.764 Acc=0.730
```
