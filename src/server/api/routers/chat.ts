import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { chat, therapySessions, patients } from "~/server/db/tables";
import {
  patientResponseGenerator,
  type InitializePatientInput,
} from "~/server/services/patient-response-generator";
import { createLogger } from "~/lib/logger";

import type { ResponseMetadata } from "~/server/services/patient-response-generator";

const logger = createLogger("Chat");

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date;
  stepId: number;
  emotion?: "SEEKING" | "RAGE" | "FEAR" | "CARE" | "LUST" | "SADNESS" | "PLAY" | "base";
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
      return {
        ...chatData,
        messages: JSON.parse(chatData!.messages) as ChatMessage[],
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
            emotion: z.enum(["SEEKING", "RAGE", "FEAR", "CARE", "LUST", "SADNESS", "PLAY", "base"]).optional(),
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
                emotion: z.enum(["SEEKING", "RAGE", "FEAR", "CARE", "LUST", "SADNESS", "PLAY", "base"]).optional(),
                topic: z.string().optional(),
                reasoningTime: z.number().optional(),
                status: z.string().optional(),
                code: z.string().optional(),
                externalPatientId: z.string().optional(),
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
        throw new Error("Therapy session not found or access denied");
      }

      const existingChat = await ctx.db
        .select()
        .from(chat)
        .where(
          and(
            eq(chat.therapySessionId, input.therapySessionId),
            eq(chat.stepNumber, input.stepNumber),
          ),
        )
        .limit(1);

      const chatData = {
        therapySessionId: input.therapySessionId,
        stepNumber: input.stepNumber,
        messages: JSON.stringify(input.messages),
        done: false,
        updatedAt: new Date(),
      };

      if (existingChat.length === 0) {
        
        const [newChat] = await ctx.db
          .insert(chat)
          .values(chatData)
          .returning();

        if (!newChat) {
          throw new Error("Failed to create chat step");
        }

        return {
          ...newChat,
          messages: JSON.parse(newChat.messages) as ChatMessage[],
        };
      } else {
        
        const existingChatData = existingChat[0];
        if (!existingChatData) {
          throw new Error("Chat step not found");
        }

        const [updatedChat] = await ctx.db
          .update(chat)
          .set({
            messages: JSON.stringify(input.messages),
            updatedAt: new Date(),
          })
          .where(eq(chat.id, existingChatData.id))
          .returning();

        if (!updatedChat) {
          throw new Error("Failed to update chat step");
        }

        return {
          ...updatedChat,
          messages: JSON.parse(updatedChat.messages) as ChatMessage[],
        };
      }
    }),

  
  markStepDone: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      logger.debug("markStepDone called", {
        therapySessionId: input.therapySessionId,
        stepNumber: input.stepNumber,
        userId: ctx.session.user.id,
      });

      
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

      logger.debug("Found therapy session", { found: therapySession.length > 0 });

      if (therapySession.length === 0) {
        throw new Error("Therapy session not found or access denied");
      }

      
      const existingChat = await ctx.db
        .select()
        .from(chat)
        .where(
          and(
            eq(chat.therapySessionId, input.therapySessionId),
            eq(chat.stepNumber, input.stepNumber),
          ),
        )
        .limit(1);

      if (existingChat.length > 0) {
        const existingChatData = existingChat[0];
        if (!existingChatData) {
          throw new Error("Chat step not found");
        }

        logger.debug("Updating existing chat step", { chatId: existingChatData.id });
        
        const [updatedChat] = await ctx.db
          .update(chat)
          .set({
            done: true,
            updatedAt: new Date(),
          })
          .where(eq(chat.id, existingChatData.id))
          .returning();

        if (!updatedChat) {
          throw new Error("Failed to update chat step");
        }

        logger.debug("Updated chat step successfully");

        
        if (input.stepNumber === 11) {
          await ctx.db
            .update(therapySessions)
            .set({
              isCompleted: true,
              updatedAt: new Date(),
            })
            .where(eq(therapySessions.id, input.therapySessionId));

          logger.info("Therapy session marked as completed (step 11 finished)");
        }

        return {
          ...updatedChat,
          messages: JSON.parse(updatedChat.messages) as ChatMessage[],
        };
      } else {
        logger.debug("Creating new chat step with done=true");
        
        const [newChat] = await ctx.db
          .insert(chat)
          .values({
            therapySessionId: input.therapySessionId,
            stepNumber: input.stepNumber,
            messages: JSON.stringify([]), 
            done: true,
            updatedAt: new Date(),
          })
          .returning();

        if (!newChat) {
          throw new Error("Failed to create chat step");
        }

        logger.debug("Created new chat step successfully", { chatId: newChat.id });

        
        if (input.stepNumber === 11) {
          await ctx.db
            .update(therapySessions)
            .set({
              isCompleted: true,
              updatedAt: new Date(),
            })
            .where(eq(therapySessions.id, input.therapySessionId));

          logger.info("Therapy session marked as completed (step 11 finished)");
        }

        return {
          ...newChat,
          messages: [] as ChatMessage[],
        };
      }
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

      const chatSteps = await (ctx.db as any)
        .select()
        .from(chat)
        .where(eq(chat.therapySessionId, input.therapySessionId))
        .orderBy(chat.stepNumber);

      return chatSteps.map((step: typeof chat.$inferSelect) => {
        return {
          ...step,
          messages: JSON.parse(step.messages) as ChatMessage[],
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

      const chatStep = await (ctx.db as any)
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
        external_patient_id: z.string(),
        user_message: z.string(),
        session_id: z.string(),
        step_id: z.number(),
        therapist_id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return await patientResponseGenerator.generateChatResponse(input);
    }),

  
  initializePatient: protectedProcedure
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
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      
      const initInput: InitializePatientInput = {
        patientInfo: input.patientInfo,
        sessionId: input.sessionId,
      };
      const initResponse =
        await patientResponseGenerator.initializePatient(initInput);

      
      if (
        initResponse.status === "success" &&
        initResponse.external_patient_id
      ) {
        await ctx.db
          .update(patients)
          .set({
            externalPatientId: initResponse.external_patient_id,
            updatedAt: new Date(),
          })
          .where(eq(patients.id, input.patientInfo.id));
      }

      return initResponse;
    }),

  
  toggleExternalAI: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      patientResponseGenerator.setUseExternalAI(input.enabled);
      return { success: true, externalAIEnabled: input.enabled };
    }),
});
