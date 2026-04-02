import { and, count, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";

import { createLogger } from "~/lib/logger";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { MAX_THERAPY_SESSION_NUMBER } from "~/server/db/contracts";
import { withDatabaseLockRetry } from "~/server/db/errors";
import { chat, patients, therapySessions } from "~/server/db/tables";

const logger = createLogger("TherapySessions");

export type TherapySession = typeof therapySessions.$inferSelect;

function getActivePatientSessionKey(userId: string, patientId: string) {
  return `${userId}:${patientId}`;
}

export const therapySessionsRouter = createTRPCRouter({
  start: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
        sessionNumber: z
          .number()
          .int()
          .min(1)
          .max(MAX_THERAPY_SESSION_NUMBER)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { patientId } = input;
      const sessionNumber = input.sessionNumber ?? 1;
      const userId = ctx.session.user.id;
      const activePatientSessionKey = getActivePatientSessionKey(userId, patientId);

      return withDatabaseLockRetry(async () => {
        // We validate the patient first so "create if missing" never revives
        // sessions for archived/inactive records.
        const patientResult = await ctx.db
          .select({ id: patients.id })
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.isActive, true)))
          .limit(1);

        if (patientResult.length === 0) {
          throw new Error("Patient not found or inactive");
        }

        // First write wins. Concurrent callers for the same user/patient pair
        // will no-op here and continue with the read/update fallback below.
        const inserted = (await (ctx.db as any)
          .insert(therapySessions)
          .values({
            userId,
            patientId,
            sessionNumber,
            activePatientSessionKey,
          })
          .onConflictDoNothing({
            target: [therapySessions.activePatientSessionKey],
          })
          .returning()) as any[];

        const insertedSession = inserted[0];
        if (insertedSession) {
          return insertedSession;
        }

        // If a session already exists, only move it forward. This keeps the
        // endpoint idempotent and prevents an older sessionNumber from
        // overwriting a newer one during concurrent requests.
        const updated = (await (ctx.db as any)
          .update(therapySessions)
          .set({
            sessionNumber,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(therapySessions.activePatientSessionKey, activePatientSessionKey),
              lt(therapySessions.sessionNumber, sessionNumber),
            ),
          )
          .returning()) as any[];

        const updatedSession = updated[0];
        if (updatedSession) {
          return updatedSession;
        }

        const existingSessionResult = await ctx.db
          .select()
          .from(therapySessions)
          .where(eq(therapySessions.activePatientSessionKey, activePatientSessionKey))
          .limit(1);

        const existingSession = existingSessionResult[0];
        if (!existingSession) {
          throw new Error("Failed to create or load therapy session");
        }

        return existingSession;
      });
    }),

  getByPatient: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const activeSessionResult = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.userId, ctx.session.user.id),
            eq(therapySessions.patientId, input.patientId),
            eq(therapySessions.isCompleted, false),
          ),
        )
        .orderBy(desc(therapySessions.updatedAt), desc(therapySessions.createdAt))
        .limit(1);

      if (activeSessionResult[0]) {
        return activeSessionResult[0];
      }

      const latestSessionResult = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.userId, ctx.session.user.id),
            eq(therapySessions.patientId, input.patientId),
          ),
        )
        .orderBy(desc(therapySessions.updatedAt), desc(therapySessions.createdAt))
        .limit(1);

      return latestSessionResult[0] ?? null;
    }),

  getById: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string().min(1, "Therapy session ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sessionResult = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.id, input.therapySessionId),
            eq(therapySessions.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      return sessionResult[0] ?? null;
    }),

  advanceSession: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string().min(1, "Therapy session ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return withDatabaseLockRetry(() =>
        ctx.db.transaction(async (tx) => {
          const existingSessionResult = await tx
            .select()
            .from(therapySessions)
            .where(
              and(
                eq(therapySessions.userId, userId),
                eq(therapySessions.id, input.therapySessionId),
              ),
            )
            .limit(1);

          const existingSession = existingSessionResult[0];
          if (!existingSession) {
            throw new Error("Therapy session not found");
          }

          if (existingSession.isCompleted) {
            throw new Error("Therapy session already completed");
          }

          const newSessionNumber = Math.min(
            existingSession.sessionNumber + 1,
            MAX_THERAPY_SESSION_NUMBER,
          );

          const updated = (await (tx as any)
            .update(therapySessions)
            .set({
              sessionNumber: newSessionNumber,
              updatedAt: new Date(),
            })
            .where(eq(therapySessions.id, existingSession.id))
            .returning()) as any[];

          return updated[0]!;
        }),
      );
    }),

  getAllForUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      const sessions = await ctx.db
        .select({
          id: therapySessions.id,
          userId: therapySessions.userId,
          patientId: therapySessions.patientId,
          sessionNumber: therapySessions.sessionNumber,
          isCompleted: therapySessions.isCompleted,
          externalPatientId: therapySessions.externalPatientId,
          createdAt: therapySessions.createdAt,
          updatedAt: therapySessions.updatedAt,
          patientName: patients.name,
          patientSmallDescription: patients.smallDescription,
          patientDetails: patients.details,
          patientObjectives: patients.objectives,
          patientAvatarUrl: patients.avatarUrl,
          patientDifficulty: patients.difficulty,
          patientEstimatedDuration: patients.estimatedDuration,
        })
        .from(therapySessions)
        .leftJoin(patients, eq(therapySessions.patientId, patients.id))
        .where(eq(therapySessions.userId, userId))
        .orderBy(desc(therapySessions.updatedAt), desc(therapySessions.createdAt));

      const completedSteps = await ctx.db
        .select({
          therapySessionId: chat.therapySessionId,
          completedStepsCount: count(chat.id),
        })
        .from(chat)
        .where(eq(chat.done, true))
        .groupBy(chat.therapySessionId);

      // Build the per-session count in one aggregate query to avoid the
      // previous N+1 "one count per session" pattern.
      const completedStepsBySessionId = new Map(
        completedSteps.map((step: { therapySessionId: string; completedStepsCount: unknown }) => [
          step.therapySessionId,
          Number(step.completedStepsCount ?? 0),
        ]),
      );

      return sessions.map((session: any) => ({
        id: session.id,
        userId: session.userId,
        patientId: session.patientId,
        sessionNumber: session.sessionNumber,
        isCompleted: session.isCompleted,
        externalPatientId: session.externalPatientId ?? null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        completedStepsCount: completedStepsBySessionId.get(session.id) ?? 0,
        patient: {
          id: session.patientId,
          name: session.patientName,
          smallDescription: session.patientSmallDescription,
          details: session.patientDetails,
          objectives: session.patientObjectives,
          avatarUrl: session.patientAvatarUrl,
          difficulty: session.patientDifficulty,
          estimatedDuration: session.patientEstimatedDuration,
        },
      }));
    } catch (error) {
      logger.error("Failed to retrieve user therapy sessions", { userId, error });
      throw error;
    }
  }),

  isCompleted: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string().min(1, "Therapy session ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sessionResult = await ctx.db
        .select({ isCompleted: therapySessions.isCompleted })
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.id, input.therapySessionId),
            eq(therapySessions.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      return sessionResult[0]?.isCompleted ?? false;
    }),
});
