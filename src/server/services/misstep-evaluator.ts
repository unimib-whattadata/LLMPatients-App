import { GoogleGenAI } from "@google/genai";

import {
  type MisstepCategoryId,
  type MisstepCategoryResult,
  MISSTEP_CATEGORIES,
  MISSTEP_DETECTOR_VERSION,
  type MisstepEvidence,
  type StepMisstepAnalysisMode,
  type StepMisstepEvaluationResult,
} from "~/lib/missteps";
import { createLogger } from "~/lib/logger";
import { env } from "~/env";

const logger = createLogger("MisstepEvaluator");

const OPEN_QUESTION_PATTERNS = [
  /\bwhat\b/i,
  /\bhow\b/i,
  /\bwhen\b/i,
  /\bwhere\b/i,
  /\bwho\b/i,
  /\bwhich\b/i,
  /\btell me\b/i,
  /\bwalk me through\b/i,
  /\bcan you describe\b/i,
  /\bcould you describe\b/i,
] as const;

const CLOSED_QUESTION_PATTERNS = [
  /\bdo\b/i,
  /\bdid\b/i,
  /\bare\b/i,
  /\bis\b/i,
  /\bhave\b/i,
  /\bhas\b/i,
  /\bcan\b/i,
  /\bcould\b/i,
  /\bwould\b/i,
  /\bwill\b/i,
  /\bwas\b/i,
  /\bwere\b/i,
] as const;

const VALIDATION_PATTERNS = [
  /\bthat makes sense\b/i,
  /\bit makes sense\b/i,
  /\bthat sounds\b/i,
  /\bi hear\b/i,
  /\bi'm hearing\b/i,
  /\bi can see\b/i,
  /\bthank you for sharing\b/i,
  /\bunderstandably\b/i,
  /\bit sounds like\b/i,
] as const;

const COLLABORATION_PATTERNS = [
  /\bwould it be helpful\b/i,
  /\bdoes it feel okay\b/i,
  /\bshall we\b/i,
  /\bcan we\b/i,
  /\bwould you like\b/i,
  /\bwe can\b/i,
  /\btogether\b/i,
  /\blet's explore\b/i,
  /\bmy role\b/i,
  /\bwhat feels most important\b/i,
] as const;

const STRUCTURE_PATTERNS = [
  /\btoday\b/i,
  /\bfocus on\b/i,
  /\bagenda\b/i,
  /\bgoal for\b/i,
  /\bfor this session\b/i,
  /\bbefore we end\b/i,
  /\bto summarize\b/i,
  /\bsummary\b/i,
  /\bnext time\b/i,
  /\bbetween now and next time\b/i,
  /\bfor next session\b/i,
  /\bhomework\b/i,
  /\bpractice\b/i,
  /\btry\b/i,
  /\bcheck in\b/i,
  /\bfollow up\b/i,
] as const;

const MONITORING_PATTERNS = [
  /\bsince last time\b/i,
  /\bhow have things been\b/i,
  /\bwhat changed\b/i,
  /\bprogress\b/i,
  /\bgoing this week\b/i,
  /\bhow did that go\b/i,
  /\bwhat got in the way\b/i,
  /\bany obstacles\b/i,
  /\bcheck in\b/i,
] as const;

const INTERPRETATION_PATTERNS = [
  /\bthis means\b/i,
  /\bwhat's really happening\b/i,
  /\bdeep down\b/i,
  /\bthe reason is\b/i,
  /\byou're actually\b/i,
  /\bperhaps this is because\b/i,
  /\bwhat this tells me\b/i,
  /\bclearly\b/i,
  /\bobviously\b/i,
  /\bit sounds as if\b/i,
] as const;

const TECHNIQUE_PATTERNS = [
  /\btechnique\b/i,
  /\bprotocol\b/i,
  /\bworksheet\b/i,
  /\bexercise\b/i,
  /\breframing\b/i,
  /\bthought record\b/i,
  /\bexposure\b/i,
  /\bmindfulness\b/i,
  /\bbreathing exercise\b/i,
  /\bcbt\b/i,
  /\bdbt\b/i,
  /\bact\b/i,
] as const;

const DIAGNOSIS_PATTERNS = [
  /\bit's just\b/i,
  /\bthat is just\b/i,
  /\byou are\b.*\banxious|depressed|borderline|bipolar|obsessive/i,
  /\bthis is\b.*\banxiety|depression|bpd|borderline|ptsd/i,
  /\bdiagnos/i,
] as const;

const SAFETY_PATTERNS = [
  /\bsuicid/i,
  /\bkill yourself\b/i,
  /\bend your life\b/i,
  /\bhurt yourself\b/i,
  /\bself-harm\b/i,
  /\bself harm\b/i,
  /\bplan\b/i,
  /\bmeans\b/i,
  /\bintent\b/i,
  /\bsafety plan\b/i,
  /\bcrisis\b/i,
  /\bemergency\b/i,
] as const;

const PATIENT_RISK_PATTERNS = [
  /\bsuicid/i,
  /\bwant to die\b/i,
  /\bdon't want to live\b/i,
  /\bend it all\b/i,
  /\bkill myself\b/i,
  /\bhurt myself\b/i,
  /\bself-harm\b/i,
  /\bself harm\b/i,
  /\boverdose\b/i,
] as const;

const PAYMENT_PATTERNS = [
  /\bpayment\b/i,
  /\bpay\b/i,
  /\bfee\b/i,
  /\bcharge\b/i,
  /\binvoice\b/i,
  /\bcost\b/i,
  /\bcompenso\b/i,
] as const;

const PAYMENT_PRESSURE_PATTERNS = [
  /\byou need to pay\b/i,
  /\bmust pay\b/i,
  /\bwon't continue\b/i,
  /\bpay now\b/i,
  /\bpayment first\b/i,
] as const;

const HOPE_PATTERNS = [
  /\bthere is room for change\b/i,
  /\bwe can work on\b/i,
  /\bpossible\b/i,
  /\bsmall step\b/i,
  /\bprogress\b/i,
  /\bhope\b/i,
  /\bcan improve\b/i,
] as const;

const NIHILISTIC_PATTERNS = [
  /\bnothing will change\b/i,
  /\bthis won't change\b/i,
  /\bit's hopeless\b/i,
  /\bthere's no point\b/i,
  /\bnever get better\b/i,
  /\balways be this way\b/i,
] as const;

const HARMFUL_PATTERNS = [
  /\byou should just\b/i,
  /\bjust relax\b/i,
  /\bjust stop\b/i,
  /\bcome on\b/i,
  /\bthat's irrational\b/i,
  /\byou are overreacting\b/i,
  /\bnot a big deal\b/i,
  /\btoo sensitive\b/i,
  /\bclearly you\b/i,
  /\byou need to\b/i,
  /\bsarcasm\b/i,
] as const;

const SHAME_PATTERNS = [
  /\byou should be ashamed\b/i,
  /\bif you keep doing this\b/i,
  /\byou'll regret it\b/i,
  /\bdisappointing\b/i,
  /\byou ought to feel\b/i,
  /\bscared enough\b/i,
  /\bmoral\b/i,
] as const;

const BOUNDARY_PATTERNS = [
  /\btext me\b/i,
  /\bcall me anytime\b/i,
  /\boutside session\b/i,
  /\bmeet outside\b/i,
  /\bsee you outside\b/i,
  /\bkeep this between us\b/i,
  /\bsecret between us\b/i,
  /\bsocial media\b/i,
  /\bfriend request\b/i,
  /\bmultiple relationship\b/i,
  /\bdouble role\b/i,
] as const;

const OMITTABLE_PUNCTUATION = /[^\p{L}\p{N}\s']/gu;
const WHITESPACE = /\s+/g;

const THERAPIST = "user";
const PATIENT = "patient";
const VERTEX_MAX_ATTEMPTS = 3;
const VERTEX_RETRY_BASE_DELAY_MS = 400;
const VERTEX_MAX_CANDIDATE_CATEGORIES = 6;
const DEFAULT_PATIENT_FALLBACK_MESSAGES = [
  "I'm sorry, I'm not sure how to respond. Could you repeat that?",
  "I'm sorry, I'm not sure how to respond.",
] as const;

type StoredChatMessage = {
  id: string;
  content: string;
  sender: "user" | "patient";
  stepId: number;
  timestamp: Date | string;
};

export interface EvaluateStepMisstepsInput {
  therapySessionId: string;
  stepNumber: number;
  messages: StoredChatMessage[];
  patient: {
    id: string;
    name: string;
    smallDescription?: string | null;
    details?: string | null;
    background?: string | null;
    objectives?: string[];
    diagnosis?: string | null;
    difficulty?: number | null;
    gender?: string | null;
    psychologicalProfile?: string | null;
  };
}

type NormalizedMessage = StoredChatMessage & {
  normalized: string;
  wordCount: number;
  turnId: number;
};

type TherapistTurn = {
  index: number;
  message: NormalizedMessage;
  beforePatient: NormalizedMessage | null;
  afterPatient: NormalizedMessage | null;
};

type HeuristicCategory = {
  score: number;
  evidence: MisstepEvidence[];
};

type HeuristicSummary = {
  therapistTurnCount: number;
  patientTurnCount: number;
  transcriptTurnCount: number;
  therapistTalkShare: number;
  openQuestionRatio: number;
  categories: Record<MisstepCategoryId, HeuristicCategory>;
};

let cachedGenAIClient: GoogleGenAI | null = null;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(OMITTABLE_PUNCTUATION, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(WHITESPACE).length;
}

function truncateText(value: string, maxLength = 220): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function collectMatches(
  turns: TherapistTurn[],
  patterns: readonly RegExp[],
  reason: string,
): MisstepEvidence[] {
  return turns
    .filter((turn) => matchesAny(turn.message.content, patterns))
    .slice(0, 3)
    .map((turn) => therapistEvidence(turn, reason));
}

function therapistEvidence(
  turn: TherapistTurn,
  reason: string,
): MisstepEvidence {
  const parts = [`Therapist: ${truncateText(turn.message.content, 180)}`];

  if (turn.afterPatient) {
    parts.push(`Patient: ${truncateText(turn.afterPatient.content, 140)}`);
  }

  return {
    excerpt: parts.join("\n"),
    reason,
    turnIds: turn.afterPatient
      ? [turn.message.turnId, turn.afterPatient.turnId]
      : [turn.message.turnId],
    messageId: turn.message.id,
    speaker: turn.message.sender,
  };
}

function patientEvidence(
  message: NormalizedMessage,
  reason: string,
): MisstepEvidence {
  return {
    excerpt: `Patient: ${truncateText(message.content, 220)}`,
    reason,
    turnIds: [message.turnId],
    messageId: message.id,
    speaker: message.sender,
  };
}

function dedupeEvidence(evidence: MisstepEvidence[]): MisstepEvidence[] {
  const seen = new Set<string>();
  const deduped: MisstepEvidence[] = [];

  for (const item of evidence) {
    const key = `${item.messageId ?? "none"}:${item.turnIds?.join(",") ?? "none"}:${item.reason}:${item.excerpt}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 3);
}

function finalizeCategory(
  id: MisstepCategoryId,
  score: number,
  evidence: MisstepEvidence[],
): HeuristicCategory {
  const boundedScore = clamp(score);
  const hasEvidence = evidence.length > 0;

  return {
    score: hasEvidence ? boundedScore : Math.min(boundedScore, 0.65),
    evidence: dedupeEvidence(evidence),
  };
}

function inferPhaseTips(stepNumber: number): string[] {
  if (stepNumber === 11) {
    return [
      "Summarize key points that emerged.",
      "Assess the effectiveness of the implemented strategies.",
      "Plan possible follow-ups or deep dives.",
    ];
  }

  if (stepNumber >= 3) {
    return [
      "Use interventions collaboratively rather than rigidly.",
      "Monitor progress and adapt interventions accordingly.",
      "Document observations and progress accurately.",
    ];
  }

  return [
    "Listen actively without interrupting.",
    "Maintain an empathic, non-judgmental attitude.",
    "Ask open-ended questions to deepen understanding.",
  ];
}

function buildTherapistTurns(messages: NormalizedMessage[]): TherapistTurn[] {
  return messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.sender === THERAPIST)
    .map(({ message, index }) => {
      const previousMessages = messages.slice(0, index).reverse();
      const nextMessages = messages.slice(index + 1);
      const beforePatient =
        previousMessages.find((entry) => entry.sender === PATIENT) ?? null;
      const afterPatient =
        nextMessages.find((entry) => entry.sender === PATIENT) ?? null;

      return {
        index,
        message,
        beforePatient,
        afterPatient,
      };
    });
}

function computeHeuristics(
  input: EvaluateStepMisstepsInput,
  messages: NormalizedMessage[],
): HeuristicSummary {
  const therapistTurns = buildTherapistTurns(messages);
  const patientTurns = messages.filter((message) => message.sender === PATIENT);
  const therapistWordCount = therapistTurns.reduce(
    (total, turn) => total + turn.message.wordCount,
    0,
  );
  const patientWordCount = patientTurns.reduce(
    (total, turn) => total + turn.wordCount,
    0,
  );
  const totalWordCount = therapistWordCount + patientWordCount;
  const therapistTalkShare =
    totalWordCount > 0 ? therapistWordCount / totalWordCount : 0;
  const therapistQuestions = therapistTurns.filter((turn) =>
    turn.message.content.includes("?"),
  );
  const openQuestions = therapistQuestions.filter((turn) =>
    matchesAny(turn.message.content, OPEN_QUESTION_PATTERNS),
  ).length;
  const closedQuestions = therapistQuestions.filter((turn) =>
    matchesAny(turn.message.content, CLOSED_QUESTION_PATTERNS),
  ).length;
  const openQuestionRatio =
    therapistQuestions.length > 0
      ? openQuestions / therapistQuestions.length
      : 0;
  const validationTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, VALIDATION_PATTERNS),
  );
  const collaborationTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, COLLABORATION_PATTERNS),
  );
  const structureTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, STRUCTURE_PATTERNS),
  );
  const monitoringTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, MONITORING_PATTERNS),
  );
  const techniqueTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, TECHNIQUE_PATTERNS),
  );
  const harmfulTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, HARMFUL_PATTERNS),
  );
  const interpretationTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, INTERPRETATION_PATTERNS),
  );
  const diagnosisTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, DIAGNOSIS_PATTERNS),
  );
  const safetyTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, SAFETY_PATTERNS),
  );
  const boundaryTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, BOUNDARY_PATTERNS),
  );
  const paymentTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, PAYMENT_PATTERNS),
  );
  const paymentPressureTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, PAYMENT_PRESSURE_PATTERNS),
  );
  const nihilisticTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, NIHILISTIC_PATTERNS),
  );
  const hopeTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, HOPE_PATTERNS),
  );
  const shameTurns = therapistTurns.filter((turn) =>
    matchesAny(turn.message.content, SHAME_PATTERNS),
  );
  const patientRiskTurns = patientTurns.filter((turn) =>
    matchesAny(turn.content, PATIENT_RISK_PATTERNS),
  );
  const patientProfileRisk =
    matchesAny(
      [
        input.patient.background,
        input.patient.details,
        input.patient.psychologicalProfile,
        input.patient.diagnosis,
      ]
        .filter(Boolean)
        .join(" "),
      PATIENT_RISK_PATTERNS,
    ) || /suicid/i.test(input.patient.diagnosis ?? "");

  const openingTherapistTurn = therapistTurns[0] ?? null;
  const closingTherapistTurn =
    therapistTurns[therapistTurns.length - 1] ?? null;

  const categories: Record<MisstepCategoryId, HeuristicCategory> = {
    alliance_failure: finalizeCategory(
      "alliance_failure",
      (validationTurns.length === 0 ? 0.28 : 0) +
        (collaborationTurns.length === 0 ? 0.24 : 0) +
        (harmfulTurns.length > 0 ? 0.3 : 0) +
        (openQuestionRatio < 0.35 ? 0.14 : 0),
      [
        ...collectMatches(
          harmfulTurns,
          HARMFUL_PATTERNS,
          "Directive or invalidating language can weaken alliance formation.",
        ),
        ...(openingTherapistTurn && validationTurns.length === 0
          ? [
              therapistEvidence(
                openingTherapistTurn,
                "Opening turns did not show clear validation or collaborative framing.",
              ),
            ]
          : []),
      ],
    ),
    lack_of_structure: finalizeCategory(
      "lack_of_structure",
      (structureTurns.length === 0 ? 0.72 : 0) +
        (input.stepNumber === 11 && !closingTherapistTurn ? 0.1 : 0),
      [
        ...(openingTherapistTurn
          ? [
              therapistEvidence(
                openingTherapistTurn,
                "Opening turns do not establish a clear agenda or structure.",
              ),
            ]
          : []),
        ...(closingTherapistTurn
          ? [
              therapistEvidence(
                closingTherapistTurn,
                "Closing turns do not include a recap, task or explicit next-step.",
              ),
            ]
          : []),
      ],
    ),
    lack_of_monitoring: finalizeCategory(
      "lack_of_monitoring",
      input.stepNumber <= 1
        ? monitoringTurns.length === 0
          ? 0.22
          : 0
        : monitoringTurns.length === 0
          ? 0.66
          : 0,
      [
        ...(openingTherapistTurn && input.stepNumber > 1
          ? [
              therapistEvidence(
                openingTherapistTurn,
                "The step does not open with a clear update, progress review or obstacle check-in.",
              ),
            ]
          : []),
      ],
    ),
    premature_interpretation: finalizeCategory(
      "premature_interpretation",
      interpretationTurns.reduce((total, turn) => {
        const priorPatientTurns = patientTurns.filter(
          (message) =>
            new Date(message.timestamp).getTime() <=
            new Date(turn.message.timestamp).getTime(),
        ).length;
        return total + (priorPatientTurns <= 1 ? 0.72 : 0.56);
      }, 0),
      collectMatches(
        interpretationTurns,
        INTERPRETATION_PATTERNS,
        "Interpretive framing appears stronger than the preceding exploration.",
      ),
    ),
    poor_listening_questions: finalizeCategory(
      "poor_listening_questions",
      (openQuestionRatio < 0.25 ? 0.26 : 0) +
        (therapistTalkShare > 0.62 ? 0.26 : 0) +
        (closedQuestions > openQuestions + 1 ? 0.18 : 0) +
        (validationTurns.length === 0 ? 0.16 : 0) +
        (harmfulTurns.length > 0 ? 0.12 : 0),
      [
        ...collectMatches(
          harmfulTurns,
          HARMFUL_PATTERNS,
          "Directive or minimizing turns can reflect weak listening or poor question quality.",
        ),
        ...(openingTherapistTurn && openQuestionRatio < 0.25
          ? [
              therapistEvidence(
                openingTherapistTurn,
                "Therapist questions are mostly closed or not exploratory.",
              ),
            ]
          : []),
      ],
    ),
    rigid_model_use: finalizeCategory(
      "rigid_model_use",
      techniqueTurns.length > 0 && collaborationTurns.length === 0
        ? 0.7
        : techniqueTurns.length > 0 && validationTurns.length === 0
          ? 0.56
          : 0,
      collectMatches(
        techniqueTurns,
        TECHNIQUE_PATTERNS,
        "A technique is introduced without clear collaborative framing.",
      ),
    ),
    incorrect_diagnosis: finalizeCategory(
      "incorrect_diagnosis",
      diagnosisTurns.length > 0 ? 0.74 : 0,
      collectMatches(
        diagnosisTurns,
        DIAGNOSIS_PATTERNS,
        "Diagnostic or reductive wording appears without enough formulation context.",
      ),
    ),
    missing_suicide_plan: finalizeCategory(
      "missing_suicide_plan",
      (patientRiskTurns.length > 0 || patientProfileRisk) &&
        safetyTurns.length === 0
        ? 0.92
        : 0,
      [
        ...patientRiskTurns.map((turn) =>
          patientEvidence(
            turn,
            "The patient disclosed a safety-relevant cue in this step.",
          ),
        ),
        ...(closingTherapistTurn &&
        (patientRiskTurns.length > 0 || patientProfileRisk) &&
        safetyTurns.length === 0
          ? [
              therapistEvidence(
                closingTherapistTurn,
                "Therapist turns do not show risk assessment or a safety plan after the cue.",
              ),
            ]
          : []),
      ],
    ),
    financial_boundary_issues: finalizeCategory(
      "financial_boundary_issues",
      paymentTurns.length > 0
        ? paymentPressureTurns.length > 0
          ? 0.9
          : 0.62
        : 0,
      [
        ...collectMatches(
          paymentTurns,
          PAYMENT_PATTERNS,
          "The therapist introduces compensation or payment management inside the step.",
        ),
        ...collectMatches(
          paymentPressureTurns,
          PAYMENT_PRESSURE_PATTERNS,
          "The wording suggests pressure or coercion around payment.",
        ),
      ],
    ),
    missing_hope_motivation: finalizeCategory(
      "missing_hope_motivation",
      nihilisticTurns.length > 0
        ? 0.82
        : input.stepNumber >= 3 && hopeTurns.length === 0
          ? 0.42
          : 0,
      [
        ...collectMatches(
          nihilisticTurns,
          NIHILISTIC_PATTERNS,
          "Therapist wording sounds hopeless or demotivating.",
        ),
        ...(closingTherapistTurn &&
        input.stepNumber >= 3 &&
        hopeTurns.length === 0
          ? [
              therapistEvidence(
                closingTherapistTurn,
                "The step ends without a clear motivational or hopeful frame.",
              ),
            ]
          : []),
      ],
    ),
    harmful_attitudes: finalizeCategory(
      "harmful_attitudes",
      harmfulTurns.length > 0 ? 0.88 : 0,
      collectMatches(
        harmfulTurns,
        HARMFUL_PATTERNS,
        "The wording risks sounding judgmental, minimizing or overly prescriptive.",
      ),
    ),
    inducing_shame_fear: finalizeCategory(
      "inducing_shame_fear",
      shameTurns.length > 0 ? 0.92 : 0,
      collectMatches(
        shameTurns,
        SHAME_PATTERNS,
        "The wording uses shame, guilt or fear as leverage.",
      ),
    ),
    professional_boundary_violation: finalizeCategory(
      "professional_boundary_violation",
      boundaryTurns.length > 0 ? 0.96 : 0,
      collectMatches(
        boundaryTurns,
        BOUNDARY_PATTERNS,
        "The wording suggests blurred professional boundaries or contact outside the setting.",
      ),
    ),
  };

  return {
    therapistTurnCount: therapistTurns.length,
    patientTurnCount: patientTurns.length,
    transcriptTurnCount: messages.length,
    therapistTalkShare: roundToTwo(therapistTalkShare),
    openQuestionRatio: roundToTwo(openQuestionRatio),
    categories,
  };
}

function buildEvaluationResult(input: {
  categories: MisstepCategoryResult[];
  analysisMode: StepMisstepAnalysisMode;
  modelName: string | null;
  summary: Pick<
    HeuristicSummary,
    | "therapistTurnCount"
    | "patientTurnCount"
    | "transcriptTurnCount"
    | "therapistTalkShare"
    | "openQuestionRatio"
  >;
}): StepMisstepEvaluationResult {
  return {
    analysisMode: input.analysisMode,
    modelName: input.modelName,
    detectorVersion: MISSTEP_DETECTOR_VERSION,
    computedAt: new Date().toISOString(),
    summary: {
      detectedCount: input.categories.filter((category) => category.present)
        .length,
      highSeverityDetectedCount: input.categories.filter(
        (category) => category.present && category.severity === 3,
      ).length,
      therapistTurnCount: input.summary.therapistTurnCount,
      patientTurnCount: input.summary.patientTurnCount,
      transcriptTurnCount: input.summary.transcriptTurnCount,
      therapistTalkShare: input.summary.therapistTalkShare,
      openQuestionRatio: input.summary.openQuestionRatio,
    },
    categories: input.categories,
  };
}

function normalizeMessages(messages: StoredChatMessage[]): NormalizedMessage[] {
  const ignoredPatientMessages = new Set(
    DEFAULT_PATIENT_FALLBACK_MESSAGES.map((message) => normalizeText(message)),
  );

  return messages
    .filter((message) => {
      if (message.content.trim().length === 0) {
        return false;
      }

      if (
        message.sender === PATIENT &&
        ignoredPatientMessages.has(normalizeText(message.content))
      ) {
        return false;
      }

      return true;
    })
    .map((message, index) => ({
      ...message,
      normalized: normalizeText(message.content),
      wordCount: countWords(message.content),
      turnId: index + 1,
    }));
}

function getGenAIClient(): GoogleGenAI {
  if (!env.GOOGLE_CLOUD_PROJECT) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT is required for Vertex AI evaluation",
    );
  }

  if (!cachedGenAIClient) {
    cachedGenAIClient = new GoogleGenAI({
      vertexai: env.GOOGLE_GENAI_USE_VERTEXAI !== "false",
      project: env.GOOGLE_CLOUD_PROJECT,
      location: env.GOOGLE_CLOUD_LOCATION,
    });
  }

  return cachedGenAIClient;
}

function buildCandidateEvidenceText(summary: HeuristicSummary): string {
  const candidates = MISSTEP_CATEGORIES.map((category) => ({
    category,
    heuristic: summary.categories[category.id],
  }))
    .filter(
      ({ heuristic }) =>
        heuristic.score > 0 || heuristic.evidence.length > 0,
    )
    .sort((left, right) => right.heuristic.score - left.heuristic.score)
    .slice(0, VERTEX_MAX_CANDIDATE_CATEGORIES);

  if (candidates.length === 0) {
    return "No heuristic candidates retained for this step.";
  }

  return candidates
    .map(({ category, heuristic }) => {
      const evidence =
        heuristic.evidence.length === 0
          ? "- Turn IDs: none"
          : heuristic.evidence
              .map((item, index) => {
                const turnIds = item.turnIds?.join(", ") ?? "unknown";
                return `${index + 1}. Turn IDs: ${turnIds}\nReason: ${item.reason}`;
              })
              .join("\n");

      return [
        `Category: ${category.label} (${category.id})`,
        `Heuristic score: ${roundToTwo(heuristic.score)}`,
        "Candidate evidence:",
        evidence,
      ].join("\n");
    })
    .join("\n\n");
}

function buildTranscriptText(messages: NormalizedMessage[]): string {
  return messages
    .map(
      (message) =>
        `[${message.turnId}] ${message.sender === THERAPIST ? "Therapist" : "Patient"}: ${message.content}`,
    )
    .join("\n");
}

function buildVertexPrompt(
  input: EvaluateStepMisstepsInput,
  messages: NormalizedMessage[],
  summary: HeuristicSummary,
): string {
  const patientContext = [
    `Patient name: ${input.patient.name}`,
    `Step number: ${input.stepNumber}`,
    `Difficulty: ${input.patient.difficulty ?? "unknown"}`,
    `Diagnosis: ${input.patient.diagnosis ?? "not specified"}`,
    `Small description: ${input.patient.smallDescription ?? "not specified"}`,
    `Background: ${input.patient.background ?? "not specified"}`,
    `Psychological profile: ${input.patient.psychologicalProfile ?? "not specified"}`,
    `Objectives: ${(input.patient.objectives ?? []).join("; ") || "not specified"}`,
    `Phase tips: ${inferPhaseTips(input.stepNumber).join(" | ")}`,
  ].join("\n");

  const taxonomy = MISSTEP_CATEGORIES.map(
    (category) =>
      `${category.id}: ${category.label}. Severity ${category.severity}. ${category.definition}`,
  ).join("\n");

  return [
    "You are evaluating a psychotherapy training transcript for therapist missteps.",
    "Use only the single-step transcript, the patient profile, and the provided candidate evidence.",
    "Candidate evidence is heuristic guidance only; the numbered transcript is authoritative.",
    "Return JSON only.",
    "Return one category object for every taxonomy id, exactly once.",
    "Mark present=true only when the transcript supports the finding, or when an omission-based category is strongly justified by risk cues or the step context.",
    "Confidence must be between 0 and 1.",
    "Each evidence item must contain turnIds that reference the numbered transcript turns.",
    "Use between 1 and 3 turnIds per evidence item.",
    "When possible, include both therapist and patient turnIds in the same evidence item.",
    "Do not invent turnIds. If a finding has no supporting turns, mark it absent.",
    "",
    "[Patient context]",
    patientContext,
    "",
    "[Taxonomy]",
    taxonomy,
    "",
    "[Heuristic summary]",
    `Therapist talk share: ${summary.therapistTalkShare}`,
    `Open question ratio: ${summary.openQuestionRatio}`,
    `Therapist turns: ${summary.therapistTurnCount}`,
    `Patient turns: ${summary.patientTurnCount}`,
    "",
    "[Candidate evidence by category]",
    buildCandidateEvidenceText(summary),
    "",
    "[Transcript]",
    buildTranscriptText(messages),
  ].join("\n");
}

function buildVertexSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["categories"],
    properties: {
      categories: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "present", "confidence", "evidence"],
          properties: {
            id: {
              type: "string",
            },
            present: {
              type: "boolean",
            },
            confidence: {
              type: "number",
            },
            evidence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["turnIds", "reason"],
                properties: {
                  turnIds: {
                    type: "array",
                    items: {
                      type: "number",
                    },
                  },
                  reason: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function findNearestCounterpartIndex(
  index: number,
  messages: NormalizedMessage[],
): number {
  const current = messages[index];
  if (!current) {
    return -1;
  }

  for (let offset = 1; offset < messages.length; offset += 1) {
    const nextIndex = index + offset;
    if (
      nextIndex < messages.length &&
      messages[nextIndex] &&
      messages[nextIndex].sender !== current.sender
    ) {
      return nextIndex;
    }

    const previousIndex = index - offset;
    if (
      previousIndex >= 0 &&
      messages[previousIndex] &&
      messages[previousIndex].sender !== current.sender
    ) {
      return previousIndex;
    }
  }

  return -1;
}

function formatEvidenceLine(message: NormalizedMessage): string {
  const speaker = message.sender === THERAPIST ? "Therapist" : "Patient";
  return `${speaker}: ${truncateText(message.content, 180)}`;
}

function isRetryableVertexError(error: unknown): boolean {
  if (error instanceof SyntaxError) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  if (message.includes("google_cloud_project is required")) {
    return false;
  }

  return [
    "429",
    "500",
    "502",
    "503",
    "504",
    "deadline",
    "timeout",
    "temporarily unavailable",
    "unavailable",
    "rate limit",
    "quota",
    "econnreset",
    "socket hang up",
    "empty misstep evaluation response",
    "response validation failed",
  ].some((token) => message.includes(token));
}

function normalizeEvidenceTurnIds(
  turnIds: number[],
  messages: NormalizedMessage[],
): number[] {
  const normalized = [...new Set(turnIds)].sort((left, right) => left - right);

  if (normalized.length === 0) {
    throw new Error("Evidence turnIds must contain at least 1 item");
  }

  for (const turnId of normalized) {
    if (!Number.isInteger(turnId) || turnId < 1 || turnId > messages.length) {
      throw new Error(`Evidence turnId ${turnId} is outside the transcript range`);
    }
  }

  if (normalized.length <= 3) {
    return normalized;
  }

  let bestWindow = normalized.slice(0, 3);
  let bestSpan = bestWindow[2]! - bestWindow[0]!;
  let bestSpeakerDiversity = new Set(
    bestWindow.map((turnId) => messages[turnId - 1]?.sender).filter(Boolean),
  ).size;

  for (let index = 1; index <= normalized.length - 3; index += 1) {
    const window = normalized.slice(index, index + 3);
    const span = window[2]! - window[0]!;
    const speakerDiversity = new Set(
      window.map((turnId) => messages[turnId - 1]?.sender).filter(Boolean),
    ).size;

    if (
      speakerDiversity > bestSpeakerDiversity ||
      (speakerDiversity === bestSpeakerDiversity && span < bestSpan)
    ) {
      bestWindow = window;
      bestSpan = span;
      bestSpeakerDiversity = speakerDiversity;
    }
  }

  return bestWindow;
}

function expandEvidenceTurnIds(
  turnIds: number[],
  messages: NormalizedMessage[],
): number[] {
  const normalized = normalizeEvidenceTurnIds(turnIds, messages);
  const speakers = new Set(
    normalized.map((turnId) => messages[turnId - 1]?.sender).filter(Boolean),
  );

  if (speakers.size > 1 || normalized.length >= 3) {
    return normalized;
  }

  let bestCounterpartTurnId: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const turnId of normalized) {
    const counterpartIndex = findNearestCounterpartIndex(turnId - 1, messages);
    if (counterpartIndex === -1) {
      continue;
    }

    const counterpartTurnId = counterpartIndex + 1;
    const distance = Math.min(
      ...normalized.map((currentTurnId) =>
        Math.abs(currentTurnId - counterpartTurnId),
      ),
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCounterpartTurnId = counterpartTurnId;
    }
  }

  if (bestCounterpartTurnId === null) {
    return normalized;
  }

  return [...new Set([...normalized, bestCounterpartTurnId])].sort(
    (left, right) => left - right,
  );
}

function buildEvidenceFromTurnIds(
  turnIds: number[],
  reason: string,
  messages: NormalizedMessage[],
): MisstepEvidence {
  const resolvedTurnIds = expandEvidenceTurnIds(turnIds, messages);
  const excerpt = resolvedTurnIds
    .map((turnId) => formatEvidenceLine(messages[turnId - 1]!))
    .join("\n");

  return {
    excerpt: truncateText(excerpt, 420),
    reason: reason.trim(),
    turnIds: resolvedTurnIds,
  };
}

function parseVertexResult(
  raw: string,
  summary: HeuristicSummary,
  messages: NormalizedMessage[],
): StepMisstepEvaluationResult {
  const parsed = JSON.parse(raw) as {
    categories?: Array<{
      id?: string;
      present?: boolean;
      confidence?: number;
      evidence?: Array<{ turnIds?: number[]; reason?: string }>;
    }>;
  };

  if (!Array.isArray(parsed.categories)) {
    throw new Error("Vertex response validation failed: categories must be an array");
  }

  if (parsed.categories.length !== MISSTEP_CATEGORIES.length) {
    throw new Error(
      `Vertex response validation failed: expected ${MISSTEP_CATEGORIES.length} categories, received ${parsed.categories.length}`,
    );
  }

  const byId = new Map<
    MisstepCategoryId,
    {
      id?: string;
      present?: boolean;
      confidence?: number;
      evidence?: Array<{ turnIds?: number[]; reason?: string }>;
    }
  >();

  for (const item of parsed.categories) {
    if (!item?.id || !MISSTEP_CATEGORIES.some((category) => category.id === item.id)) {
      throw new Error(
        `Vertex response validation failed: unknown category id "${item?.id ?? "missing"}"`,
      );
    }

    const typedId = item.id as MisstepCategoryId;
    if (byId.has(typedId)) {
      throw new Error(
        `Vertex response validation failed: duplicate category id "${typedId}"`,
      );
    }

    byId.set(typedId, item);
  }

  const categories = MISSTEP_CATEGORIES.map((category) => {
    const fromModel = byId.get(category.id);
    if (!fromModel) {
      throw new Error(
        `Vertex response validation failed: missing category "${category.id}"`,
      );
    }

    if (typeof fromModel.present !== "boolean") {
      throw new Error(
        `Vertex response validation failed: category "${category.id}" is missing a boolean present value`,
      );
    }

    if (
      typeof fromModel.confidence !== "number" ||
      !Number.isFinite(fromModel.confidence)
    ) {
      throw new Error(
        `Vertex response validation failed: category "${category.id}" is missing a numeric confidence value`,
      );
    }

    if (!Array.isArray(fromModel.evidence)) {
      throw new Error(
        `Vertex response validation failed: category "${category.id}" evidence must be an array`,
      );
    }

    const evidence = fromModel.evidence.map((item, index) => {
      if (!Array.isArray(item?.turnIds)) {
        throw new Error(
          `Vertex response validation failed: category "${category.id}" evidence #${index + 1} must include turnIds`,
        );
      }

      if (typeof item.reason !== "string" || item.reason.trim().length === 0) {
        throw new Error(
          `Vertex response validation failed: category "${category.id}" evidence #${index + 1} must include a non-empty reason`,
        );
      }

      return buildEvidenceFromTurnIds(item.turnIds, item.reason, messages);
    });

    if (fromModel.present && evidence.length === 0) {
      throw new Error(
        `Vertex response validation failed: category "${category.id}" is present but has no supporting evidence`,
      );
    }

    return {
      ...category,
      present: fromModel.present,
      confidence: roundToTwo(clamp(fromModel.confidence)),
      evidence,
    } satisfies MisstepCategoryResult;
  });

  return buildEvaluationResult({
    categories,
    analysisMode: "vertex",
    modelName: env.VERTEX_MODEL_ID,
    summary,
  });
}

async function judgeWithVertex(
  input: EvaluateStepMisstepsInput,
  messages: NormalizedMessage[],
  summary: HeuristicSummary,
): Promise<StepMisstepEvaluationResult> {
  const prompt = buildVertexPrompt(input, messages, summary);
  const ai = getGenAIClient();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= VERTEX_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: env.VERTEX_MODEL_ID,
        contents: prompt,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseJsonSchema: buildVertexSchema(),
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error("Vertex AI returned an empty misstep evaluation response");
      }

      return parseVertexResult(rawText, summary, messages);
    } catch (error) {
      lastError = error;

      if (attempt === VERTEX_MAX_ATTEMPTS || !isRetryableVertexError(error)) {
        throw error;
      }

      logger.warn("Retrying Vertex misstep evaluation", {
        therapySessionId: input.therapySessionId,
        stepNumber: input.stepNumber,
        attempt,
        maxAttempts: VERTEX_MAX_ATTEMPTS,
        error: getErrorMessage(error),
      });

      await sleep(VERTEX_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Vertex misstep evaluation failed");
}

export async function evaluateStepMissteps(
  input: EvaluateStepMisstepsInput,
): Promise<StepMisstepEvaluationResult> {
  const normalizedMessages = normalizeMessages(input.messages);
  const summary = computeHeuristics(input, normalizedMessages);

  try {
    return await judgeWithVertex(input, normalizedMessages, summary);
  } catch (error) {
    logger.error("Vertex misstep evaluation failed", {
      therapySessionId: input.therapySessionId,
      stepNumber: input.stepNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
