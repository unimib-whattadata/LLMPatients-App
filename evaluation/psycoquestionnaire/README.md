# Psychometric Questionnaire Materials

This directory contains the questionnaire instruments, scoring outputs, and
supporting files used for the exploratory psychometric-coherence checks reported
in the manuscript.

The purpose of these materials is to document how the simulated patient profiles
were checked against standard self-report instruments and selected structured
clinical-interview materials. The results should be read as descriptive,
single-administration evidence of profile coherence, not as a clinical
validation study.

## Directory Layout

```text
psycoquestionnaire/
  instruments/
    forms/
    manuals/
    references/
  results/
    patient_questionnaire_scores/
      alex_carter_001/
      crystal_smith_001/
      daniel_isherwood_001/
      jason_smith_001/
      juanita_delgado_001/
    snap2_scoring_workbooks/
```

The root directory keeps the historical name `psycoquestionnaire` to avoid
unnecessary path churn in the repository.

## Instruments

`instruments/` contains the questionnaire and interview materials used or
consulted during the evaluation.

### `instruments/forms/`

Operational forms, scales, or scoring booklets:

- `bes_binge_eating_scale_form_novopsych_2024.pdf`
- `dsm5tr_level1_cross_cutting_symptom_measure_adult_apa_2022.pdf`
- `lpfs_bf_2_0_weekers_hutsebaut_kamphuis_2018.pdf`
- `phq9_patient_health_questionnaire_9_2010.pdf`
- `pid5bf_plus_m_appendix_2020.pdf`
- `snap2_diagnostic_scales_booklet_clark_2015.pdf`

### `instruments/manuals/`

SCID-related manuals or interview guides:

- `scid5_cv_users_guide_2022.pdf`
- `scid5_pd_structured_clinical_interview_2015.pdf`

### `instruments/references/`

Supporting methodological or psychometric references archived with the
evaluation materials:

- `bes_factor_structure_imperatori_2015.pdf`

## Results

`results/` contains the generated or completed outputs for the simulated patient
profiles.

### `results/patient_questionnaire_scores/`

Each patient subdirectory contains JSON outputs for the self-report
questionnaire administrations:

- `bes_binge_eating_scale.json`
- `dsm5tr_level1_cross_cutting_symptom_measure_adult.json`
- `lpfs_bf_2_0_level_personality_functioning_scale.json`
- `phq9_patient_health_questionnaire_9.json`
- `pid5bf_plus_m_personality_inventory.json`
- `snap2_item_responses.json`

For the selected profiles that underwent the SCID-5-PD check, the corresponding
interview output is also included:

- `scid5_pd_interview_alex_carter_001.pdf`
- `scid5_pd_interview_daniel_isherwood_001.pdf`
- `scid5_pd_interview_juanita_delgado_001.pdf`

The manuscript reports the questionnaire scores as exploratory, pointwise
profile checks. They should not be interpreted as stable psychometric estimates
or diagnostic determinations.

### `results/snap2_scoring_workbooks/`

This directory contains the SNAP-2-related Excel workbooks:

- `snap2_scoring_juanita_delgado_001.xlsx`
- `snap2_excel_scoring_program_sample_3_2_20.xlsx`

The JSON `snap2_item_responses.json` files preserve item-level true/false
responses. The Excel workbooks preserve additional scoring-program materials
used for the descriptive interpretation reported in the manuscript.