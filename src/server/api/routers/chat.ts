import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { AppDb } from "~/server/db";
import { withDatabaseLockRetry } from "~/server/db/errors";
import { chat, therapySessions, patients } from "~/server/db/tables";
import {
  patientResponseGenerator,
  type InitializePatientInput,
} from "~/server/services/patient-response-generator";
import { createLogger } from "~/lib/logger";

import type { ResponseMetadata } from "~/server/services/patient-response-generator";

const logger = createLogger("Chat");

// Helper to normalize emotion string to match PatientEmotion type
function normalizeEmotion(emotion: unknown): "SEEKING" | "RAGE" | "FEAR" | "CARE" | "LUST" | "PANIC_GRIEF" | "SADNESS" | "PLAY" | "base" {
  if (!emotion || typeof emotion !== "string") {
    return "base";
  }

  // Convert to uppercase to match PatientEmotion type
  const emotionUpper = emotion.toUpperCase();

  // Map valid emotions
  const validEmotions = [
    "SEEKING",
    "RAGE",
    "FEAR",
    "CARE",
    "LUST",
    "PANIC_GRIEF",
    "SADNESS",
    "PLAY",
    "base",
  ] as const;

  // Check if it's a valid emotion (case-insensitive)
  const matchedEmotion = validEmotions.find(
    (e) => e.toUpperCase() === emotionUpper
  );

  return matchedEmotion ?? "base";
}

// Helper to normalize chat messages from database
function normalizeChatMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map((msg: any) => ({
    ...msg,
    emotion: msg.emotion ? normalizeEmotion(msg.emotion) : undefined,
  })) as ChatMessage[];
}

async function ensureTherapySessionAccess(
  dbClient: AppDb,
  therapySessionId: string,
  userId: string,
): Promise<{
  id: string;
  patientId: string;
  externalPatientId: string | null;
}> {
  const therapySession = await dbClient
    .select({
      id: therapySessions.id,
      patientId: therapySessions.patientId,
      externalPatientId: therapySessions.externalPatientId,
    })
    .from(therapySessions)
    .where(
      and(
        eq(therapySessions.id, therapySessionId),
        eq(therapySessions.userId, userId),
      ),
    )
    .limit(1);

  if (therapySession.length === 0) {
    throw new Error("Therapy session not found or access denied");
  }

  return therapySession[0]!;
}

function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

async function buildInitializePatientInput(
  dbClient: AppDb,
  therapySessionId: string,
  userId: string,
): Promise<{
  therapySession: {
    id: string;
    patientId: string;
    externalPatientId: string | null;
  };
  initInput: InitializePatientInput;
}> {
  const therapySession = await ensureTherapySessionAccess(
    dbClient,
    therapySessionId,
    userId,
  );

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
        currentMedications: parseJsonStringArray(patient.currentMedications),
        therapyGoals: parseJsonStringArray(patient.objectives),
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

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date;
  stepId: number;
  emotion?: "SEEKING" | "RAGE" | "FEAR" | "CARE" | "LUST" | "PANIC_GRIEF" | "SADNESS" | "PLAY" | "base";
  metadata?: ResponseMetadata;
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

      const therapySession = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.id, input.therapySessionId),
            eq(therapySessions.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (therapySession.length === 0) {
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
      const parsedMessages = JSON.parse(chatData!.messages) as ChatMessage[];
      return {
        ...chatData,
        messages: normalizeChatMessages(parsedMessages),
      };
    }),


  saveChatStep: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
        messages: z.array(
          z.object({
            id: z.string(),
            content: z.string(),
            sender: z.enum(["user", "patient"]),
            timestamp: z.date(),
            stepId: z.number(),
            emotion: z.enum(["SEEKING", "RAGE", "FEAR", "CARE", "LUST", "PANIC_GRIEF", "SADNESS", "PLAY", "base"]).optional(),
            metadata: z.object({
              apiType: z.enum(["MOCK", "REAL"]),
              endpoint: z.string().optional(),
              requestData: z.object({
                patientId: z.string().optional(),
                patientName: z.string().optional(),
                userMessage: z.string().optional(),
                sessionId: z.string().optional(),
                stepId: z.number().optional(),
                externalPatientId: z.string().optional(),
              }).optional(),
              responseData: z.object({
                message: z.string().optional(),
                emotion: z.string().optional(),
                topic: z.string().optional(),
                reasoningTime: z.number().optional(),
                status: z.string().optional(),
                code: z.string().optional(),
                externalPatientId: z.string().optional(),
                patientName: z.string().nullable().optional(),
                avatarUrl: z.string().nullable().optional(),
                emotionSnapshot: z.object({
                  dominant: z.string(),
                  intensity: z.number(),
                  vector: z.record(z.string(), z.number()),
                  event: z.string().nullable().optional(),
                  salience: z.number().nullable().optional(),
                  description: z.string(),
                }).nullable().optional(),
                emotionTimeline: z.array(
                  z.object({
                    turn_index: z.number(),
                    timestamp: z.string(),
                    emotion: z.string(),
                    intensity: z.number(),
                  }),
                ).optional(),
              }).optional(),
              rawResponseJson: z.string().optional(),
              duration: z.number().optional(),
              timestamp: z.string(),
            }).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureTherapySessionAccess(
        ctx.db,
        input.therapySessionId,
        ctx.session.user.id,
      );

      const serializedMessages = JSON.stringify(input.messages);
      const savedChat = await withDatabaseLockRetry(async () => {
        // The pair (therapySessionId, stepNumber) is unique, so an upsert keeps
        // repeated saves idempotent across both SQLite and PostgreSQL.
        const savedChats = (await (ctx.db as any)
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
          .returning()) as any[];

        return savedChats[0];
      });

      if (!savedChat) {
        throw new Error("Failed to save chat step");
      }

      const parsedMessages = JSON.parse(savedChat.messages) as ChatMessage[];
      return {
        ...savedChat,
        messages: normalizeChatMessages(parsedMessages),
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

      await ensureTherapySessionAccess(
        ctx.db,
        input.therapySessionId,
        ctx.session.user.id,
      );

      const savedChat = await withDatabaseLockRetry(async () => {
        // "Done" can arrive before or after messages have been saved. This
        // upsert guarantees the row exists without wiping an existing payload.
        const savedChats = (await (ctx.db as any)
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
          .returning()) as any[];

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

      return {
        ...savedChat,
        messages: normalizeChatMessages(
          JSON.parse(savedChat.messages) as ChatMessage[],
        ),
      };
    }),


  getSessionChats: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {

      const therapySession = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.id, input.therapySessionId),
            eq(therapySessions.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (therapySession.length === 0) {
        return [];
      }

      const chatSteps = await ctx.db
        .select()
        .from(chat)
        .where(eq(chat.therapySessionId, input.therapySessionId))
        .orderBy(chat.stepNumber);

      return chatSteps.map((step: typeof chat.$inferSelect) => {
        const parsedMessages = JSON.parse(step.messages) as ChatMessage[];
        return {
          ...step,
          messages: normalizeChatMessages(parsedMessages),
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

      const therapySession = await ctx.db
        .select()
        .from(therapySessions)
        .where(
          and(
            eq(therapySessions.id, input.therapySessionId),
            eq(therapySessions.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (therapySession.length === 0) {
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
      const therapySession = await ensureTherapySessionAccess(
        ctx.db,
        input.therapySessionId,
        ctx.session.user.id,
      );

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
