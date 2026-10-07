# Psychometric questionnaire materials

These materials document exploratory, single-administration checks of five simulated patient profiles. They describe profile coherence; they do not establish score stability, clinical effectiveness or diagnoses.

`instruments/` contains forms and scoring booklets, SCID guides and supporting references. `results/patient_questionnaire_scores/` contains 30 item-response JSON records: BES, DSM-5-TR Level 1, LPFS-BF 2.0, PHQ-9, PID-5-BF+M and SNAP-2 for each profile. Selected SCID-5-PD interview outputs are retained for Alex Carter, Daniel Isherwood and Juanita Delgado.

`results/snap2_scoring_workbooks/` preserves the Juanita scoring workbook and the scoring-program example. The SNAP-2 JSON records retain the original true/false item responses.

The [canonical reproducibility package](https://github.com/cremarco/LLMPatient---APPLICATION/tree/main/reproducibility/experiments) provides a combined command to verify the saved data and recalculate the reported results. App and Agent copies of identical questionnaire responses represent the same observations and must not be counted twice. Fresh questionnaire administrations produce new observations; they cannot recover original generation metadata that were not recorded.
