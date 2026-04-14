import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getDbErrorMessage, isSchemaOutOfDateError } from "~/server/db/errors";
import { chat, therapySessions } from "~/server/db/tables";
import {
  analyzeAndPersistStepEvaluation,
  getStepEvaluationByStep,
  queueStepEvaluation,
} from "~/server/services/step-misstep-evaluations";

async function getOwnedCompletedStep(
  db: any,
  input: {
    therapySessionId: string;
    stepNumber: number;
    userId: string;
  },
) {
  const sessionRows = await db
    .select({ id: therapySessions.id })
    .from(therapySessions)
    .where(
      and(
        eq(therapySessions.id, input.therapySessionId),
        eq(therapySessions.userId, input.userId),
      ),
    )
    .limit(1);

  if (!sessionRows[0]) {
    return null;
  }

  const stepRows = await db
    .select({
      id: chat.id,
      done: chat.done,
    })
    .from(chat)
    .where(
      and(
        eq(chat.therapySessionId, input.therapySessionId),
        eq(chat.stepNumber, input.stepNumber),
      ),
    )
    .limit(1);

  return stepRows[0] ?? null;
}

function isStepEvaluationsSchemaError(error: unknown) {
  if (!isSchemaOutOfDateError(error)) {
    return false;
  }

  const message = getDbErrorMessage(error).toLowerCase();

  return [
    "llmpatient_chat_step_evaluation",
    "analysismode",
    "detectorversion",
    "resultjson",
    "errormessage",
    "analyzedat",
  ].some((token) => message.includes(token));
}

function rethrowStepEvaluationsError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (isStepEvaluationsSchemaError(error)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Misstep analysis requires the latest database migration. Run `pnpm db:migrate` and retry.",
      cause: error,
    });
  }

  throw error;
}

export const stepEvaluationsRouter = createTRPCRouter({
  getByStep: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string().min(1),
        stepNumber: z.number().int().min(1).max(11),
      }),
    )
    .query(async ({ ctx, input }) => {
      const ownedStep = await getOwnedCompletedStep(ctx.db, {
        ...input,
        userId: ctx.session.user.id,
      });

      if (!ownedStep?.done) {
        return null;
      }

      try {
        return await getStepEvaluationByStep(
          ctx.db,
          input.therapySessionId,
          input.stepNumber,
        );
      } catch (error) {
        rethrowStepEvaluationsError(error);
      }
    }),

  retryByStep: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string().min(1),
        stepNumber: z.number().int().min(1).max(11),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownedStep = await getOwnedCompletedStep(ctx.db, {
        ...input,
        userId: ctx.session.user.id,
      });

      if (!ownedStep?.done) {
        throw new Error(
          "This step must be completed before requesting misstep analysis",
        );
      }

      let queued;

      try {
        queued = await queueStepEvaluation(ctx.db, {
          ...input,
          forceReanalysis: true,
        });
      } catch (error) {
        rethrowStepEvaluationsError(error);
      }

      if (queued.shouldStartAnalysis) {
        void analyzeAndPersistStepEvaluation(ctx.db, input);
      }

      return queued.evaluation;
    }),
});
