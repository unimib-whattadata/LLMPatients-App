import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { patients, therapySessions } from "~/server/db/schema";

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

      const session = await ctx.db.query.therapySessions.findFirst({
        where: and(
          eq(therapySessions.userId, userId),
          eq(therapySessions.patientId, patientId),
        ),
      });

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

  getAllForUser: protectedProcedure.query(async ({ ctx }) => {
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
          },
          with: {
            tagRelations: {
              with: {
                tag: true,
              },
            },
          },
        },
      },
      orderBy: [desc(therapySessions.updatedAt), therapySessions.createdAt],
    });

    // Transform the data to include tags array
    const transformedSessions = sessions.map((session) => ({
      ...session,
      patient: {
        ...session.patient,
        tags: session.patient.tagRelations.map((relation) => ({
          id: relation.tag.id,
          label: relation.tag.label,
          category: relation.tag.category,
          color: relation.tag.color,
        })),
      },
    }));

    return transformedSessions;
  }),
});
