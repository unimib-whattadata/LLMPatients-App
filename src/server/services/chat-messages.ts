import { z } from "zod";

import type {
  PatientEmotion,
  ResponseMetadata,
} from "~/server/services/patient-response-generator";
import { parseJsonOr } from "~/server/utils/json";

export const patientEmotionSchema = z.enum([
  "SEEKING",
  "RAGE",
  "FEAR",
  "CARE",
  "LUST",
  "PANIC_GRIEF",
  "SADNESS",
  "PLAY",
  "base",
]);

const emotionSnapshotSchema = z
  .object({
    dominant: z.string(),
    intensity: z.number(),
    vector: z.record(z.string(), z.number()),
    event: z.string().nullable().optional(),
    salience: z.number().nullable().optional(),
    description: z.string(),
  })
  .nullable()
  .optional();

const responseMetadataSchema = z
  .object({
    apiType: z.enum(["MOCK", "REAL"]),
    endpoint: z.string().optional(),
    requestData: z
      .object({
        patientId: z.string().optional(),
        patientName: z.string().optional(),
        userMessage: z.string().optional(),
        sessionId: z.string().optional(),
        stepId: z.number().optional(),
        externalPatientId: z.string().optional(),
      })
      .optional(),
    responseData: z
      .object({
        message: z.string().optional(),
        emotion: z.string().optional(),
        topic: z.string().optional(),
        reasoningTime: z.number().optional(),
        status: z.string().optional(),
        code: z.string().optional(),
        externalPatientId: z.string().optional(),
        patientName: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional(),
        emotionSnapshot: emotionSnapshotSchema,
        emotionTimeline: z
          .array(
            z.object({
              turn_index: z.number(),
              timestamp: z.string(),
              emotion: z.string(),
              intensity: z.number(),
            }),
          )
          .optional(),
      })
      .optional(),
    rawResponseJson: z.string().optional(),
    duration: z.number().optional(),
    timestamp: z.string(),
  })
  .optional();

export const chatMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  sender: z.enum(["user", "patient"]),
  timestamp: z.date(),
  stepId: z.number(),
  emotion: patientEmotionSchema.optional(),
  metadata: responseMetadataSchema,
});

export type ChatMessage = {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date | string;
  stepId: number;
  emotion?: PatientEmotion;
  metadata?: ResponseMetadata;
};

const patientEmotions = patientEmotionSchema.options;

export function normalizeEmotion(emotion: unknown): PatientEmotion {
  if (typeof emotion !== "string") {
    return "base";
  }

  const normalizedEmotion = patientEmotions.find(
    (candidate) => candidate.toUpperCase() === emotion.toUpperCase(),
  );

  return normalizedEmotion ?? "base";
}

export function normalizeChatMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message): message is Record<string, unknown> => {
      return Boolean(message) && typeof message === "object";
    })
    .map((message) => ({
      ...(message as Omit<ChatMessage, "emotion">),
      emotion: message.emotion ? normalizeEmotion(message.emotion) : undefined,
    }));
}

export function parseStoredChatMessages(messages: string): ChatMessage[] {
  return normalizeChatMessages(
    parseJsonOr<unknown>(messages, {
      fallback: [],
      context: "stored-chat-messages",
    }),
  );
}
