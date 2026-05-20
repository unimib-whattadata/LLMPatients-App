import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { AppDb } from "~/server/db";
import { withDatabaseLockRetry } from "~/server/db/errors";
import { chat, therapySessions, patients } from "~/server/db/tables";
import {
  chatMessageSchema,
  parseStoredChatMessages,
  type ChatMessage,
} from "~/server/services/chat-messages";
import {
  analyzeAndPersistStepEvaluation,
  queueStepEvaluation,
} from "~/server/services/step-misstep-evaluations";
import {
  getOwnedTherapySession,
  requireOwnedTherapySession,
  type OwnedTherapySession,
} from "~/server/services/therapy-session-access";
import {
  patientResponseGenerator,
  type InitializePatientInput,
} from "~/server/services/patient-response-generator";
import { createLogger } from "~/lib/logger";
import { parseStringArray } from "~/server/utils/json";

const logger = createLogger("Chat");

async function buildInitializePatientInput(
  dbClient: AppDb,
  therapySessionId: string,
  userId: string,
): Promise<{
  therapySession: OwnedTherapySession;
  initInput: InitializePatientInput;
}> {
  const therapySession = await requireOwnedTherapySession(dbClient, {
    therapySessionId,
    userId,
  });

  const patientResult = await dbClient
    .select({
      id: patients.id,
      name: patients.name,
      age: patients.age,
      gender: patients.gender,
      diagnosis: patients.diagnosis,
      difficulty: patients.difficulty,
      psychologicalProfile: patients.psychologicalProfile,
      clinicalCase: patients.clinicalCase,
      currentMedications: patients.currentMedications,
      objectives: patients.objectives,
      previousSessions: patients.previousSessions,
    })
    .from(patients)
    .where(eq(patients.id, therapySession.patientId))
    .limit(1);

  const patient = patientResult[0];
  if (!patient) {
    throw new Error("Patient not found for therapy session");
  }

  return {
    therapySession,
    initInput: {
      sessionId: therapySession.id,
      patientInfo: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender ?? "not specified",
        diagnosis: patient.diagnosis ?? "Not specified",
        difficulty: patient.difficulty,
        psychologicalProfile:
          patient.psychologicalProfile ?? patient.clinicalCase,
        background: patient.clinicalCase,
        currentMedications: parseStringArray(patient.currentMedications),
        therapyGoals: parseStringArray(patient.objectives),
        previousSessions: patient.previousSessions ?? 0,
      },
    },
  };
}

async function markSessionCompletedIfNeeded(
  dbClient: AppDb,
  therapySessionId: string,
  stepNumber: number,
): Promise<void> {
  // Step 11 is the terminal step of the therapeutic flow. Keeping this in one
  // helper avoids scattering the completion rule across write paths.
  if (stepNumber !== 11) {
    return;
  }

  await dbClient
    .update(therapySessions)
    .set({
      isCompleted: true,
      activePatientSessionKey: null,
      updatedAt: new Date(),
    })
    .where(eq(therapySessions.id, therapySessionId));

  logger.info("Therapy session completed", { step: 11 });
}

export interface Chat {
  id: string;
  userId: string;
  virtualPatientId: string;
  stepNumber: number;
  messages: ChatMessage[];
  done: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export const chatRouter = createTRPCRouter({
  getChatStep: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const therapySession = await getOwnedTherapySession(ctx.db, {
        therapySessionId: input.therapySessionId,
        userId: ctx.session.user.id,
      });

      if (!therapySession) {
        return null;
      }

      const chatStep = await ctx.db
        .select()
        .from(chat)
        .where(
          and(
            eq(chat.therapySessionId, input.therapySessionId),
            eq(chat.stepNumber, input.stepNumber),
          ),
        )
        .limit(1);

      if (chatStep.length === 0) {
        return null;
      }

      const chatData = chatStep[0];
      return {
        ...chatData,
        messages: parseStoredChatMessages(chatData!.messages),
      };
    }),

  saveChatStep: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
        messages: z.array(chatMessageSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnedTherapySession(ctx.db, {
        therapySessionId: input.therapySessionId,
        userId: ctx.session.user.id,
      });

      const serializedMessages = JSON.stringify(input.messages);
      const savedChat = await withDatabaseLockRetry(async () => {
        // The pair (therapySessionId, stepNumber) is unique, so an upsert keeps
        // repeated saves idempotent.
        const savedChats = await ctx.db
          .insert(chat)
          .values({
            therapySessionId: input.therapySessionId,
            stepNumber: input.stepNumber,
            messages: serializedMessages,
            done: false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [chat.therapySessionId, chat.stepNumber],
            set: {
              messages: serializedMessages,
              done: false,
              updatedAt: new Date(),
            },
          })
          .returning();

        return savedChats[0];
      });

      if (!savedChat) {
        throw new Error("Failed to save chat step");
      }

      return {
        ...savedChat,
        messages: parseStoredChatMessages(savedChat.messages),
      };
    }),

  markStepDone: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      logger.debug("Marking step as done", {
        sessionId: input.therapySessionId,
        step: input.stepNumber,
        userId: ctx.session.user.id,
      });

      await requireOwnedTherapySession(ctx.db, {
        therapySessionId: input.therapySessionId,
        userId: ctx.session.user.id,
      });

      const savedChat = await withDatabaseLockRetry(async () => {
        // "Done" can arrive before or after messages have been saved. This
        // upsert guarantees the row exists without wiping an existing payload.
        const savedChats = await ctx.db
          .insert(chat)
          .values({
            therapySessionId: input.therapySessionId,
            stepNumber: input.stepNumber,
            messages: JSON.stringify([]),
            done: true,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [chat.therapySessionId, chat.stepNumber],
            set: {
              done: true,
              updatedAt: new Date(),
            },
          })
          .returning();

        await markSessionCompletedIfNeeded(
          ctx.db,
          input.therapySessionId,
          input.stepNumber,
        );

        return savedChats[0];
      });

      if (!savedChat) {
        throw new Error("Failed to mark chat step as done");
      }

      try {
        const queuedEvaluation = await queueStepEvaluation(ctx.db, {
          therapySessionId: input.therapySessionId,
          stepNumber: input.stepNumber,
        });

        if (queuedEvaluation.shouldStartAnalysis) {
          void analyzeAndPersistStepEvaluation(ctx.db, {
            therapySessionId: input.therapySessionId,
            stepNumber: input.stepNumber,
          });
        }
      } catch (error) {
        logger.error("Unable to queue step misstep evaluation", {
          sessionId: input.therapySessionId,
          step: input.stepNumber,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        ...savedChat,
        messages: parseStoredChatMessages(savedChat.messages),
      };
    }),

  getSessionChats: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const therapySession = await getOwnedTherapySession(ctx.db, {
        therapySessionId: input.therapySessionId,
        userId: ctx.session.user.id,
      });

      if (!therapySession) {
        return [];
      }

      const chatSteps = await ctx.db
        .select()
        .from(chat)
        .where(eq(chat.therapySessionId, input.therapySessionId))
        .orderBy(chat.stepNumber);

      return chatSteps.map((step: typeof chat.$inferSelect) => {
        return {
          ...step,
          messages: parseStoredChatMessages(step.messages),
        };
      });
    }),

  isStepCompleted: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const therapySession = await getOwnedTherapySession(ctx.db, {
        therapySessionId: input.therapySessionId,
        userId: ctx.session.user.id,
      });

      if (!therapySession) {
        return false;
      }

      const chatStep = await ctx.db
        .select({ done: chat.done })
        .from(chat)
        .where(
          and(
            eq(chat.therapySessionId, input.therapySessionId),
            eq(chat.stepNumber, input.stepNumber),
          ),
        )
        .limit(1);

      return chatStep.length > 0 ? chatStep[0]!.done : false;
    }),

  generatePatientResponse: protectedProcedure
    .input(
      z.object({
        patientInfo: z.object({
          id: z.string(),
          name: z.string(),
          age: z.number(),
          gender: z.string(),
          diagnosis: z.string(),
          difficulty: z.number(),
          psychologicalProfile: z.string(),
          background: z.string(),
          currentMedications: z.array(z.string()).optional(),
          therapyGoals: z.array(z.string()).optional(),
          previousSessions: z.number().optional(),
        }),
        userMessage: z.string(),
        stepId: z.number(),
        sessionId: z.string(),
        conversationHistory: z
          .array(
            z.object({
              content: z.string(),
              sender: z.enum(["user", "patient"]),
              timestamp: z.date(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await patientResponseGenerator.generateResponse(input);
    }),

  generateChatResponse: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        user_message: z.string(),
        step_id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const therapySession = await requireOwnedTherapySession(ctx.db, {
        therapySessionId: input.therapySessionId,
        userId: ctx.session.user.id,
      });

      if (!therapySession.externalPatientId) {
        throw new Error("Patient not initialized for this therapy session");
      }

      return await patientResponseGenerator.generateChatResponse({
        external_patient_id: therapySession.externalPatientId,
        user_message: input.user_message,
        session_id: therapySession.id,
        step_id: input.step_id,
        therapist_id: ctx.session.user.id,
      });
    }),

  initializePatient: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { therapySession, initInput } = await buildInitializePatientInput(
        ctx.db,
        input.therapySessionId,
        ctx.session.user.id,
      );

      if (therapySession.externalPatientId) {
        return {
          status: "success" as const,
          code: "PATIENT_ALREADY_INITIALIZED",
          external_patient_id: therapySession.externalPatientId,
          message: "Patient already initialized for this therapy session",
          timestamp: new Date().toISOString(),
        };
      }

      const initResponse =
        await patientResponseGenerator.initializePatient(initInput);

      if (
        initResponse.status === "success" &&
        initResponse.external_patient_id
      ) {
        await ctx.db
          .update(therapySessions)
          .set({
            externalPatientId: initResponse.external_patient_id,
            updatedAt: new Date(),
          })
          .where(eq(therapySessions.id, therapySession.id));
      }

      return initResponse;
    }),

  toggleExternalAI: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      return { success: true, externalAIEnabled: input.enabled };
    }),
});
