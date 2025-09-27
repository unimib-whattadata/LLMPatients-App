import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { chat, therapySessions } from "~/server/db/schema";

/**
 * Chat message type for TypeScript
 */
export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date;
  stepId: number;
}

/**
 * Chat type for TypeScript
 */
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
  // Get chat for a specific step
  getChatStep: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to this therapy session
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

      const chatData = chatStep[0]!;
      return {
        ...chatData,
        messages: JSON.parse(chatData.messages) as ChatMessage[],
      };
    }),

  // Save or update chat for a specific step
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
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to this therapy session
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
        // Create new chat step
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
        // Update existing chat step
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

  // Mark chat step as done
  markStepDone: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("markStepDone called with:", {
        therapySessionId: input.therapySessionId,
        stepNumber: input.stepNumber,
        userId: ctx.session.user.id,
      });

      // Verify user has access to this therapy session
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

      console.log("Found therapy session:", therapySession.length > 0);

      if (therapySession.length === 0) {
        throw new Error("Therapy session not found or access denied");
      }

      // First, try to find existing chat step
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

        console.log("Updating existing chat step:", existingChatData.id);
        // Update existing chat step
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

        console.log("Updated chat step successfully");

        // Check if step 11 is completed and mark therapy session as completed
        if (input.stepNumber === 11) {
          await ctx.db
            .update(therapySessions)
            .set({
              isCompleted: true,
              updatedAt: new Date(),
            })
            .where(eq(therapySessions.id, input.therapySessionId));

          console.log("Therapy session marked as completed (step 11 finished)");
        }

        return {
          ...updatedChat,
          messages: JSON.parse(updatedChat.messages) as ChatMessage[],
        };
      } else {
        console.log("Creating new chat step with done=true");
        // Create new chat step with done=true
        const [newChat] = await ctx.db
          .insert(chat)
          .values({
            therapySessionId: input.therapySessionId,
            stepNumber: input.stepNumber,
            messages: JSON.stringify([]), // Empty messages array
            done: true,
            updatedAt: new Date(),
          })
          .returning();

        if (!newChat) {
          throw new Error("Failed to create chat step");
        }

        console.log("Created new chat step successfully:", newChat.id);

        // Check if step 11 is completed and mark therapy session as completed
        if (input.stepNumber === 11) {
          await ctx.db
            .update(therapySessions)
            .set({
              isCompleted: true,
              updatedAt: new Date(),
            })
            .where(eq(therapySessions.id, input.therapySessionId));

          console.log("Therapy session marked as completed (step 11 finished)");
        }

        return {
          ...newChat,
          messages: [] as ChatMessage[],
        };
      }
    }),

  // Get all chat steps for a therapy session
  getSessionChats: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to this therapy session
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

      return chatSteps.map((step) => ({
        ...step,
        messages: JSON.parse(step.messages) as ChatMessage[],
      }));
    }),

  // Check if a step is completed
  isStepCompleted: protectedProcedure
    .input(
      z.object({
        therapySessionId: z.string(),
        stepNumber: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to this therapy session
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
});
