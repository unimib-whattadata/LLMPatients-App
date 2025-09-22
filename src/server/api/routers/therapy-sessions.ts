import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { patients, therapySessions } from "~/server/db/schema";

export type TherapySession = typeof therapySessions.$inferSelect;

export const therapySessionsRouter = createTRPCRouter({
  start: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
        sessionNumber: z
          .number()
          .int()
          .min(1)
          .max(11)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { patientId } = input;
      const sessionNumber = input.sessionNumber ?? 1;
      const userId = ctx.session.user.id;

      const patient = await ctx.db.query.patients.findFirst({
        where: and(eq(patients.id, patientId), eq(patients.isActive, true)),
        columns: { id: true },
      });

      if (!patient) {
        throw new Error("Patient not found or inactive");
      }

      // Check if a therapy session already exists for this user-patient pair
      const existingSession = await ctx.db.query.therapySessions.findFirst({
        where: and(
          eq(therapySessions.userId, userId),
          eq(therapySessions.patientId, patientId),
        ),
      });

      if (existingSession) {
        // If session exists, update the session number if it's higher
        if (sessionNumber > existingSession.sessionNumber) {
          const updated = await ctx.db
            .update(therapySessions)
            .set({
              sessionNumber,
              updatedAt: new Date(),
            })
            .where(eq(therapySessions.id, existingSession.id))
            .returning();

          return updated[0];
        }
        return existingSession;
      }

      // Create new therapy session
      const inserted = await ctx.db
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

      const session = await ctx.db.query.therapySessions.findFirst({
        where: and(
          eq(therapySessions.userId, userId),
          eq(therapySessions.patientId, patientId),
        ),
      });

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

      const existingSession = await ctx.db.query.therapySessions.findFirst({
        where: and(
          eq(therapySessions.userId, userId),
          eq(therapySessions.patientId, patientId),
        ),
      });

      if (!existingSession) {
        throw new Error("Therapy session not found");
      }

      const newSessionNumber = Math.min(existingSession.sessionNumber + 1, 11);

      const updated = await ctx.db
        .update(therapySessions)
        .set({
          sessionNumber: newSessionNumber,
          updatedAt: new Date(),
        })
        .where(eq(therapySessions.id, existingSession.id))
        .returning();

      return updated[0];
    }),

  getAllForUser: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const sessions = await ctx.db.query.therapySessions.findMany({
        where: eq(therapySessions.userId, userId),
        with: {
          patient: {
            columns: {
              id: true,
              name: true,
              description: true,
              details: true,
              background: true,
              objectives: true,
              avatarUrl: true,
              avatarType: true,
              difficulty: true,
              estimatedDuration: true,
              tags: true,
            },
          },
        },
        orderBy: [desc(therapySessions.updatedAt), therapySessions.createdAt],
      });

      return sessions;
    }),
});
