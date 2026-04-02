export const MISSTEP_DETECTOR_VERSION = "step-missteps-v1";

export const STEP_MISSTEP_EVALUATION_STATUSES = [
  "processing",
  "completed",
  "failed",
] as const;

export type StepMisstepEvaluationStatus =
  (typeof STEP_MISSTEP_EVALUATION_STATUSES)[number];

export const STEP_MISSTEP_ANALYSIS_MODES = [
  "hybrid",
  "heuristic",
] as const;

export type StepMisstepAnalysisMode =
  (typeof STEP_MISSTEP_ANALYSIS_MODES)[number];

export const MISSTEP_CATEGORIES = [
  {
    id: "alliance_failure",
    label: "Mancata costruzione dell’alleanza",
    severity: 2,
    definition:
      "Non coinvolgere il paziente nel processo; scarsa trasparenza o psicoeducazione.",
  },
  {
    id: "lack_of_structure",
    label: "Mancanza di struttura",
    severity: 1,
    definition:
      "Seduta senza agenda o contratto chiaro, con follow-up e chiusura deboli.",
  },
  {
    id: "lack_of_monitoring",
    label: "Mancato aggiornamento e monitoraggio",
    severity: 1,
    definition:
      "Non raccogliere aggiornamenti, progressi, ostacoli o motivi di drop-out.",
  },
  {
    id: "premature_interpretation",
    label: "Interpretazioni premature/eccessive",
    severity: 2,
    definition:
      "Interpretazioni precoci o insistite, non sufficientemente ancorate all’esplorazione.",
  },
  {
    id: "poor_listening_questions",
    label: "Ascolto e domande inadeguati",
    severity: 1,
    definition:
      "Domande povere o chiuse, scarso ascolto, bassa empatia o eccessiva direttività.",
  },
  {
    id: "rigid_model_use",
    label: "Uso rigido/inappropriato del modello",
    severity: 1,
    definition:
      "Applicare tecniche o un modello in modo rigido, forzato o incongruente.",
  },
  {
    id: "incorrect_diagnosis",
    label: "Diagnosi scorretta / solo sintomi",
    severity: 2,
    definition:
      "Etichettare impropriamente o ridurre il caso al solo sintomo senza formulazione.",
  },
  {
    id: "missing_suicide_plan",
    label: "Assenza di contratto / piano suicidario",
    severity: 3,
    definition:
      "Omettere assessment del rischio o piano di sicurezza quando emergono segnali rilevanti.",
  },
  {
    id: "unmanaged_countertransference",
    label: "Controtransfert non gestito",
    severity: 2,
    definition:
      "Reazioni del terapeuta non riconosciute o non gestite, con escalation o difensività.",
  },
  {
    id: "therapist_seductiveness",
    label: "Seduttività del terapeuta",
    severity: 3,
    definition:
      "Comportamenti seduttivi, allusivi o eroticizzazione del setting.",
  },
  {
    id: "financial_boundary_issues",
    label: "Problemi economici / compenso",
    severity: 2,
    definition:
      "Gestione inadeguata del compenso, con evitamento, pressione o regole incoerenti.",
  },
  {
    id: "missing_hope_motivation",
    label: "Mancata speranza e motivazione",
    severity: 2,
    definition:
      "Non promuovere motivazione, oppure creare aspettative irrealistiche o nichiliste.",
  },
  {
    id: "harmful_attitudes",
    label: "Atteggiamenti dannosi",
    severity: 3,
    definition:
      "Giudizio, invalidazione, minimizzazione, advice-giving o bassa sensibilità culturale.",
  },
  {
    id: "inducing_shame_fear",
    label: "Indurre vergogna / colpa / paura",
    severity: 3,
    definition:
      "Usare vergogna, colpa o paura come leva motivazionale, anche in modo implicito.",
  },
  {
    id: "inappropriate_self_disclosure",
    label: "Disclosure inappropriata",
    severity: 2,
    definition:
      "Auto-rivelazioni non funzionali o che spostano il focus dal paziente al terapeuta.",
  },
  {
    id: "professional_boundary_violation",
    label: "Violazioni dei confini professionali",
    severity: 3,
    definition:
      "Violazioni di limiti o ruolo, come contatti impropri o relazioni multiple.",
  },
] as const;

export type MisstepCategoryId = (typeof MISSTEP_CATEGORIES)[number]["id"];

export type MisstepCategoryDefinition = (typeof MISSTEP_CATEGORIES)[number];

export interface MisstepEvidence {
  excerpt: string;
  reason: string;
  messageId?: string;
  speaker?: "user" | "patient";
}

export type MisstepCategoryResult = MisstepCategoryDefinition & {
  present: boolean;
  confidence: number;
  evidence: MisstepEvidence[];
};

export interface StepMisstepEvaluationResult {
  analysisMode: StepMisstepAnalysisMode;
  modelName: string | null;
  detectorVersion: string;
  computedAt: string;
  summary: {
    detectedCount: number;
    highSeverityDetectedCount: number;
    therapistTurnCount: number;
    patientTurnCount: number;
    transcriptTurnCount: number;
    therapistTalkShare: number;
    openQuestionRatio: number;
  };
  categories: MisstepCategoryResult[];
}

export function getMisstepDefinition(
  id: MisstepCategoryId,
): MisstepCategoryDefinition {
  const definition = MISSTEP_CATEGORIES.find((category) => category.id === id);
  if (!definition) {
    throw new Error(`Unknown misstep category: ${id}`);
  }

  return definition;
}
