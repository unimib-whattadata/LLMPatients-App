export const MISSTEP_DETECTOR_VERSION = "step-missteps-v1";

export const STEP_MISSTEP_EVALUATION_STATUSES = [
  "processing",
  "completed",
  "failed",
] as const;

export type StepMisstepEvaluationStatus =
  (typeof STEP_MISSTEP_EVALUATION_STATUSES)[number];

export const STEP_MISSTEP_ANALYSIS_MODES = ["hybrid", "heuristic"] as const;

export type StepMisstepAnalysisMode =
  (typeof STEP_MISSTEP_ANALYSIS_MODES)[number];

export const MISSTEP_CATEGORIES = [
  {
    id: "alliance_failure",
    label: "Alliance failure",
    severity: 2,
    definition:
      "Failing to involve the patient in the process, with weak transparency or psychoeducation.",
  },
  {
    id: "lack_of_structure",
    label: "Lack of structure",
    severity: 1,
    definition:
      "A session without a clear agenda or contract, with weak follow-up and closing.",
  },
  {
    id: "lack_of_monitoring",
    label: "Poor monitoring and updates",
    severity: 1,
    definition:
      "Failing to gather updates, progress, obstacles, or dropout risk factors.",
  },
  {
    id: "premature_interpretation",
    label: "Premature or excessive interpretation",
    severity: 2,
    definition:
      "Interpretations that arrive too early or too forcefully, without enough exploratory grounding.",
  },
  {
    id: "poor_listening_questions",
    label: "Poor listening and questioning",
    severity: 1,
    definition:
      "Overly closed or weak questions, poor listening, low empathy, or excessive directiveness.",
  },
  {
    id: "rigid_model_use",
    label: "Rigid or inappropriate model use",
    severity: 1,
    definition:
      "Applying techniques or a therapeutic model in a rigid, forced, or incongruent way.",
  },
  {
    id: "incorrect_diagnosis",
    label: "Incorrect diagnosis or symptom-only framing",
    severity: 2,
    definition:
      "Improperly labeling the case or reducing it to symptoms without a fuller formulation.",
  },
  {
    id: "missing_suicide_plan",
    label: "Missing suicide risk or safety planning",
    severity: 3,
    definition:
      "Failing to assess risk or establish a safety plan when relevant warning signs emerge.",
  },
  {
    id: "unmanaged_countertransference",
    label: "Unmanaged countertransference",
    severity: 2,
    definition:
      "Therapist reactions that are unrecognized or unmanaged, leading to escalation or defensiveness.",
  },
  {
    id: "therapist_seductiveness",
    label: "Therapist seductiveness",
    severity: 3,
    definition:
      "Seductive or suggestive behavior, including eroticizing the therapeutic setting.",
  },
  {
    id: "financial_boundary_issues",
    label: "Financial or fee boundary issues",
    severity: 2,
    definition:
      "Poor handling of fees or payment boundaries through avoidance, pressure, or inconsistent rules.",
  },
  {
    id: "missing_hope_motivation",
    label: "Missing hope or motivation support",
    severity: 2,
    definition:
      "Failing to support motivation, or fostering unrealistic or nihilistic expectations.",
  },
  {
    id: "harmful_attitudes",
    label: "Harmful attitudes",
    severity: 3,
    definition:
      "Judgment, invalidation, minimization, unsolicited advice-giving, or poor cultural sensitivity.",
  },
  {
    id: "inducing_shame_fear",
    label: "Inducing shame, guilt, or fear",
    severity: 3,
    definition:
      "Using shame, guilt, or fear as a motivational lever, even implicitly.",
  },
  {
    id: "inappropriate_self_disclosure",
    label: "Inappropriate self-disclosure",
    severity: 2,
    definition:
      "Self-disclosure that is not clinically useful or shifts the focus away from the patient.",
  },
  {
    id: "professional_boundary_violation",
    label: "Professional boundary violations",
    severity: 3,
    definition:
      "Boundary or role violations, such as inappropriate contact or multiple relationships.",
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
