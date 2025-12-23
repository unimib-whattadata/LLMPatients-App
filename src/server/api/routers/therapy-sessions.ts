import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { patients, therapySessions, chat } from "~/server/db/tables";
import { createLogger } from "~/lib/logger";

const logger = createLogger("TherapySessions");

export type TherapySession = typeof therapySessions.$inferSelect;

export const therapySessionsRouter = createTRPCRouter({
    start: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
        sessionNumber: z.number().int().min(1).max(11).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { patientId } = input;
      const sessionNumber = input.sessionNumber ?? 1;
      const userId = ctx.session.user.id;

      const patientResult = await (ctx.db as any)
        .select({ id: (patients as any).id })
        .from(patients)
        .where(
          and(
            eq((patients as any).id, patientId),
            eq((patients as any).isActive, true),
          ),
        )
        .limit(1);

      if (patientResult.length === 0) {
        throw new Error("Patient not found or inactive");
      }

      const patient = patientResult[0];

      
      const existingSessionResult = await (ctx.db as any)
        .select()
        .from(therapySessions)
        .where(
          and(
            eq((therapySessions as any).userId, userId),
            eq((therapySessions as any).patientId, patientId),
          ),
        )
        .limit(1);

      const existingSession = existingSessionResult[0];

      if (existingSession) {
        
        if (sessionNumber > existingSession.sessionNumber) {
          const updated = await (ctx.db as any)
            .update(therapySessions)
            .set({
              sessionNumber,
              updatedAt: new Date(),
            })
            .where(eq((therapySessions as any).id, existingSession.id))
            .returning();

          return updated[0];
        }
        return existingSession;
      }

      
      const inserted = await (ctx.db as any)
        .insert(therapySessions)
        .values({
          userId,
          patientId,
          sessionNumber,
        })
        .returning();

      return inserted[0];
    }),

    getByPatient: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { patientId } = input;
      const userId = ctx.session.user.id;

      const sessionResult = await (ctx.db as any)
        .select()
        .from(therapySessions)
        .where(
          and(
            eq((therapySessions as any).userId, userId),
            eq((therapySessions as any).patientId, patientId),
          ),
        )
        .limit(1);

      const session = sessionResult[0];

      return session ?? null;
    }),

    advanceSession: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { patientId } = input;
      const userId = ctx.session.user.id;

      const existingSessionResult = await (ctx.db as any)
        .select()
        .from(therapySessions)
        .where(
          and(
            eq((therapySessions as any).userId, userId),
            eq((therapySessions as any).patientId, patientId),
          ),
        )
        .limit(1);

      const existingSession = existingSessionResult[0];

      if (!existingSession) {
        throw new Error("Therapy session not found");
      }

      const newSessionNumber = Math.min(existingSession.sessionNumber + 1, 11);

      const updated = await (ctx.db as any)
        .update(therapySessions)
        .set({
          sessionNumber: newSessionNumber,
          updatedAt: new Date(),
        })
        .where(eq((therapySessions as any).id, existingSession.id))
        .returning();

      return updated[0];
    }),

  getAllForUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    try {

      const sessions = await (ctx.db as any)
        .select({
          id: (therapySessions as any).id,
          userId: (therapySessions as any).userId,
          patientId: (therapySessions as any).patientId,
          sessionNumber: (therapySessions as any).sessionNumber,
          isCompleted: (therapySessions as any).isCompleted,
          createdAt: (therapySessions as any).createdAt,
          updatedAt: (therapySessions as any).updatedAt,
          patientName: (patients as any).name,
          patientSmallDescription: (patients as any).smallDescription,
          patientDetails: (patients as any).details,
          patientObjectives: (patients as any).objectives,
          patientAvatarUrl: (patients as any).avatarUrl,
          patientDifficulty: (patients as any).difficulty,
          patientEstimatedDuration: (patients as any).estimatedDuration,
        })
        .from(therapySessions)
        .leftJoin(
          patients,
          eq((therapySessions as any).patientId, (patients as any).id),
        )
        .where(eq((therapySessions as any).userId, userId))
        .orderBy(
          desc((therapySessions as any).updatedAt),
          desc((therapySessions as any).createdAt),
        );

      // Get completed steps count for each session
      const sessionsWithProgress = await Promise.all(
        sessions.map(async (session: any) => {
          const completedSteps = await (ctx.db as any)
            .select({ id: (chat as any).id })
            .from(chat)
            .where(
              and(
                eq((chat as any).therapySessionId, session.id),
                eq((chat as any).done, true),
              ),
            );

          return {
            id: session.id,
            userId: session.userId,
            patientId: session.patientId,
            sessionNumber: session.sessionNumber,
            isCompleted: session.isCompleted,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            completedStepsCount: completedSteps.length,
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
          };
        }),
      );

      return sessionsWithProgress;
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
      const { therapySessionId } = input;
      const userId = ctx.session.user.id;

      const sessionResult = await (ctx.db as any)
        .select({ isCompleted: (therapySessions as any).isCompleted })
        .from(therapySessions)
        .where(
          and(
            eq((therapySessions as any).id, therapySessionId),
            eq((therapySessions as any).userId, userId),
          ),
        )
        .limit(1);

      const session = sessionResult[0];

      return session?.isCompleted ?? false;
    }),
});
