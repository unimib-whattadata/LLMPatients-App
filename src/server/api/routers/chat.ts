import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { chats, messages } from "~/server/db/schema";

export const chatRouter = createTRPCRouter({
  getOrCreate: publicProcedure
    .input(z.object({ userId: z.string(), virtualPatientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId, virtualPatientId } = input;

      let chat = await ctx.db.query.chats.findFirst({
        where: and(
          eq(chats.userId, userId),
          eq(chats.virtualPatientId, virtualPatientId),
        ),
        with: {
          messages: true,
          virtualPatient: true,
        },
      });

      if (!chat) {
        const [inserted] = await ctx.db
          .insert(chats)
          .values({
            userId,
            virtualPatientId,
          })
          .returning();

        if (!inserted) {
          throw new TRPCError({
            message: "Error on creating new chat",
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        chat = await ctx.db.query.chats.findFirst({
          where: eq(chats.id, inserted.id),
          with: {
            messages: true,
            virtualPatient: true,
          },
        });
      }

      return chat;
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        chatId: z.string().min(1),
        senderId: z.string().min(1),
        content: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId, senderId, content } = input;

      // QUA FARE CHIAMATA API AL BOT E SALVARE RISPOSTA

      const [newMessage] = await ctx.db
        .insert(messages)
        .values({
          chatId,
          senderId,
          content,
        })
        .returning();

      if (!newMessage)
        throw new TRPCError({
          message: "Error on save message",
          code: "INTERNAL_SERVER_ERROR",
        });
    }),
});
