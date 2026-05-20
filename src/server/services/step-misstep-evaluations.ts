import { and, eq } from "drizzle-orm";

import { env } from "~/env";
import {
  MISSTEP_DETECTOR_VERSION,
  type StepMisstepEvaluationResult,
} from "~/lib/missteps";
import { createLogger } from "~/lib/logger";
import type { AppDb } from "~/server/db";
import {
  chat,
  chatStepEvaluations,
  patients,
  therapySessions,
} from "~/server/db/tables";
import { parseJsonOr, parseStringArray } from "~/server/utils/json";

import { evaluateStepMissteps } from "./misstep-evaluator";

const logger = createLogger("StepMisstepEvaluations");

type StepEvaluationRow = {
  id: string;
  therapySessionId: string;
  stepNumber: number;
  status: "processing" | "completed" | "failed";
  analysisMode: "hybrid" | "heuristic";
  modelName: string | null;
  detectorVersion: string;
  resultJson: string | null;
  errorMessage: string | null;
  analyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export type ParsedStepEvaluation = StepEvaluationRow & {
  result: StepMisstepEvaluationResult | null;
};

function parseStepEvaluation(row: StepEvaluationRow): ParsedStepEvaluation {
  return {
    ...row,
    result: parseJsonOr<StepMisstepEvaluationResult | null>(row.resultJson, {
      fallback: null,
      context: "step-evaluation.resultJson",
    }),
  };
}

function currentRequestedMode() {
  return env.MISSTEP_ANALYSIS_MODE;
}

export async function getStepEvaluationByStep(
  db: AppDb,
  therapySessionId: string,
  stepNumber: number,
): Promise<ParsedStepEvaluation | null> {
  const rows = await db
    .select()
    .from(chatStepEvaluations)
    .where(
      and(
        eq(chatStepEvaluations.therapySessionId, therapySessionId),
        eq(chatStepEvaluations.stepNumber, stepNumber),
      ),
    )
    .limit(1);

  const row = rows[0] as StepEvaluationRow | undefined;
  return row ? parseStepEvaluation(row) : null;
}

export async function queueStepEvaluation(
  db: AppDb,
  input: {
    therapySessionId: string;
    stepNumber: number;
    forceReanalysis?: boolean;
  },
): Promise<{ evaluation: ParsedStepEvaluation; shouldStartAnalysis: boolean }> {
  const insertedRows = (await db
    .insert(chatStepEvaluations)
    .values({
      therapySessionId: input.therapySessionId,
      stepNumber: input.stepNumber,
      status: "processing",
      analysisMode: currentRequestedMode(),
      modelName: null,
      detectorVersion: MISSTEP_DETECTOR_VERSION,
      resultJson: null,
      errorMessage: null,
      analyzedAt: null,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [
        chatStepEvaluations.therapySessionId,
        chatStepEvaluations.stepNumber,
      ],
    })
    .returning()) as StepEvaluationRow[];

  const inserted = insertedRows[0];
  if (inserted) {
    return {
      evaluation: parseStepEvaluation(inserted),
      shouldStartAnalysis: true,
    };
  }

  const existing = await getStepEvaluationByStep(
    db,
    input.therapySessionId,
    input.stepNumber,
  );

  if (!existing) {
    throw new Error("Unable to load queued step evaluation");
  }

  if (existing.status === "processing") {
    return {
      evaluation: existing,
      shouldStartAnalysis: false,
    };
  }

  if (
    !input.forceReanalysis &&
    existing.status === "completed" &&
    existing.detectorVersion === MISSTEP_DETECTOR_VERSION
  ) {
    return {
      evaluation: existing,
      shouldStartAnalysis: false,
    };
  }

  const updatedRows = (await db
    .update(chatStepEvaluations)
    .set({
      status: "processing",
      analysisMode: currentRequestedMode(),
      modelName: null,
      detectorVersion: MISSTEP_DETECTOR_VERSION,
      resultJson: null,
      errorMessage: null,
      analyzedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(chatStepEvaluations.therapySessionId, input.therapySessionId),
        eq(chatStepEvaluations.stepNumber, input.stepNumber),
      ),
    )
    .returning()) as StepEvaluationRow[];

  const updated = updatedRows[0];
  if (!updated) {
    throw new Error("Unable to update queued step evaluation");
  }

  return {
    evaluation: parseStepEvaluation(updated),
    shouldStartAnalysis: true,
  };
}

async function loadEvaluationInput(
  db: AppDb,
  therapySessionId: string,
  stepNumber: number,
) {
  const sessionRows = await db
    .select({
      id: therapySessions.id,
      patientId: therapySessions.patientId,
    })
    .from(therapySessions)
    .where(eq(therapySessions.id, therapySessionId))
    .limit(1);

  const session = sessionRows[0];
  if (!session) {
    throw new Error("Therapy session not found for misstep evaluation");
  }

  const stepRows = await db
    .select({
      id: chat.id,
      messages: chat.messages,
      done: chat.done,
    })
    .from(chat)
    .where(
      and(
        eq(chat.therapySessionId, therapySessionId),
        eq(chat.stepNumber, stepNumber),
      ),
    )
    .limit(1);

  const step = stepRows[0];
  if (!step) {
    throw new Error("Chat step not found for misstep evaluation");
  }

  if (!step.done) {
    throw new Error("Chat step must be completed before misstep evaluation");
  }

  const patientRows = await db
    .select({
      id: patients.id,
      name: patients.name,
      smallDescription: patients.smallDescription,
      details: patients.details,
      background: patients.clinicalCase,
      objectives: patients.objectives,
      diagnosis: patients.diagnosis,
      difficulty: patients.difficulty,
      gender: patients.gender,
      psychologicalProfile: patients.psychologicalProfile,
    })
    .from(patients)
    .where(eq(patients.id, session.patientId))
    .limit(1);

  const patient = patientRows[0];
  if (!patient) {
    throw new Error("Patient not found for misstep evaluation");
  }

  return {
    therapySessionId,
    stepNumber,
    messages: parseJsonOr(step.messages, {
      fallback: [],
      context: "step-evaluation.chatMessages",
    }),
    patient: {
      id: patient.id,
      name: patient.name,
      smallDescription: patient.smallDescription,
      details: patient.details,
      background: patient.background,
      objectives: parseStringArray(patient.objectives),
      diagnosis: patient.diagnosis,
      difficulty: patient.difficulty,
      gender: patient.gender,
      psychologicalProfile: patient.psychologicalProfile,
    },
  };
}

export async function analyzeAndPersistStepEvaluation(
  db: AppDb,
  input: {
    therapySessionId: string;
    stepNumber: number;
  },
): Promise<void> {
  try {
    const evaluationInput = await loadEvaluationInput(
      db,
      input.therapySessionId,
      input.stepNumber,
    );
    const result = await evaluateStepMissteps(evaluationInput);

    await db
      .update(chatStepEvaluations)
      .set({
        status: "completed",
        analysisMode: result.analysisMode,
        modelName: result.modelName,
        detectorVersion: result.detectorVersion,
        resultJson: JSON.stringify(result),
        errorMessage: null,
        analyzedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatStepEvaluations.therapySessionId, input.therapySessionId),
          eq(chatStepEvaluations.stepNumber, input.stepNumber),
        ),
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error("Step misstep evaluation failed", {
      therapySessionId: input.therapySessionId,
      stepNumber: input.stepNumber,
      error: message,
    });

    await db
      .update(chatStepEvaluations)
      .set({
        status: "failed",
        analysisMode: currentRequestedMode(),
        modelName: null,
        detectorVersion: MISSTEP_DETECTOR_VERSION,
        resultJson: null,
        errorMessage: message,
        analyzedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatStepEvaluations.therapySessionId, input.therapySessionId),
          eq(chatStepEvaluations.stepNumber, input.stepNumber),
        ),
      );
  }
}
