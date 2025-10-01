import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { patients, therapySessions, chat } from "~/server/db/tables";

/**
 * TherapySession type inferred from database schema
 */
export type TherapySession = typeof therapySessions.$inferSelect;

/**
 * Therapy Sessions Router
 *
 * Handles all therapy session related operations including starting sessions,
 * retrieving user sessions, and managing session progress.
 */
export const therapySessionsRouter = createTRPCRouter({
  /**
   * Start a new therapy session or update existing session
   *
   * Creates a new therapy session for a user-patient pair or updates
   * the session number if a higher number is provided.
   *
   * @param input - Patient ID and optional session number
   * @returns Created or updated therapy session
   */
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

      const patientResult = await ctx.db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, patientId), eq(patients.isActive, true)))
        .limit(1);

      if (patientResult.length === 0) {
        throw new Error("Patient not found or inactive");
      }

      const patient = patientResult[0];

      // Check if a therapy session already exists for this user-patient pair
      const existingSessionResult = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.userId, userId),
            eq(therapySessions.patientId, patientId),
          ),
        )
        .limit(1);

      const existingSession = existingSessionResult[0];

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

  /**
   * Get therapy session for a specific patient
   *
   * Retrieves the therapy session for the current user and specified patient.
   * Returns null if no session exists.
   *
   * @param input - Patient ID
   * @returns Therapy session or null
   */
  getByPatient: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { patientId } = input;
      const userId = ctx.session.user.id;

      const sessionResult = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.userId, userId),
            eq(therapySessions.patientId, patientId),
          ),
        )
        .limit(1);

      const session = sessionResult[0];

      return session ?? null;
    }),

  /**
   * Advance therapy session to next step
   *
   * Increments the session number for a therapy session, up to a maximum of 11.
   * Used when a user completes a step in their therapy journey.
   *
   * @param input - Patient ID
   * @returns Updated therapy session
   */
  advanceSession: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1, "Patient id is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { patientId } = input;
      const userId = ctx.session.user.id;

      const existingSessionResult = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.userId, userId),
            eq(therapySessions.patientId, patientId),
          ),
        )
        .limit(1);

      const existingSession = existingSessionResult[0];

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

  getAllForUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const sessions = await ctx.db
      .select({
        id: therapySessions.id,
        userId: therapySessions.userId,
        patientId: therapySessions.patientId,
        sessionNumber: therapySessions.sessionNumber,
        isCompleted: therapySessions.isCompleted,
        createdAt: therapySessions.createdAt,
        updatedAt: therapySessions.updatedAt,
        patient: {
          id: patients.id,
          name: patients.name,
          smallDescription: patients.smallDescription,
          details: patients.details,
          background: patients.background,
          objectives: patients.objectives,
          avatarUrl: patients.avatarUrl,
          avatarType: patients.avatarType,
          difficulty: patients.difficulty,
          estimatedDuration: patients.estimatedDuration,
        },
      })
      .from(therapySessions)
      .leftJoin(patients, eq(therapySessions.patientId, patients.id))
      .where(eq(therapySessions.userId, userId))
      .orderBy(desc(therapySessions.updatedAt), desc(therapySessions.createdAt));

    // Get completed steps count for each session
    const sessionsWithProgress = await Promise.all(
      sessions.map(async (session) => {
        const completedSteps = await ctx.db
          .select({ id: chat.id })
          .from(chat)
          .where(
            and(eq(chat.therapySessionId, session.id), eq(chat.done, true)),
          );

        return {
          ...session,
          completedStepsCount: completedSteps.length,
        };
      }),
    );

    return sessionsWithProgress;
  }),

  /**
   * Check if a therapy session is completed
   *
   * Returns true if the therapy session has isCompleted set to true.
   *
   * @param input - Therapy session ID
   * @returns Boolean indicating completion status
   */
  isCompleted: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string().min(1, "Therapy session ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { therapySessionId } = input;
      const userId = ctx.session.user.id;

      const sessionResult = await ctx.db
        .select({ isCompleted: therapySessions.isCompleted })
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.id, therapySessionId),
            eq(therapySessions.userId, userId),
          ),
        )
        .limit(1);

      const session = sessionResult[0];

      return session?.isCompleted ?? false;
    }),
});
