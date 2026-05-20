import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { AppDb } from "~/server/db";
import { chat } from "~/server/db/tables";
import {
  analyzeAndPersistStepEvaluation,
  getStepEvaluationByStep,
  queueStepEvaluation,
} from "~/server/services/step-misstep-evaluations";
import { getOwnedTherapySession } from "~/server/services/therapy-session-access";

async function getOwnedCompletedStep(
  db: AppDb,
  input: {
    therapySessionId: string;
    stepNumber: number;
    userId: string;
  },
) {
  const session = await getOwnedTherapySession(db, input);
  if (!session) {
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

      return getStepEvaluationByStep(
        ctx.db,
        input.therapySessionId,
        input.stepNumber,
      );
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

      const queued = await queueStepEvaluation(ctx.db, {
        ...input,
        forceReanalysis: true,
      });

      if (queued.shouldStartAnalysis) {
        void analyzeAndPersistStepEvaluation(ctx.db, input);
      }

      return queued.evaluation;
    }),
});
