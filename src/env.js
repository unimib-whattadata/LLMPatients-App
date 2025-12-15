import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(32)
        : z.string().min(32).optional(),
    NEXTAUTH_SECRET: z.string().min(32).optional(), 
    JWT_SECRET: z.string().min(32).optional(), 
    DATABASE_URL: z.string().min(1).refine(
      (url) => {
        
        return (
          url.startsWith("file:") ||
          url.startsWith("libsql:") ||
          url.startsWith("wss:") ||
          url.startsWith("ws:") ||
          url.startsWith("https:") ||
          url.startsWith("http:") ||
          url.startsWith("postgres://") ||
          url.startsWith("postgresql://")
        );
      },
      {
        message: "DATABASE_URL must be a valid SQLite (file:, libsql:, wss:, ws:, https:, http:) or PostgreSQL (postgres://, postgresql://) URL",
      }
    ),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    ELEVENLABS_ENABLED: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    ELEVENLABS_API_KEY: z.string().min(1).optional(),
    // API Configuration
    API: z.enum(["local", "remote"]).default("local"),
    API_BASE_URL: z.string().url().optional(),
    API_GENERATE_RESPONSE_ENDPOINT: z.string().optional(),
    API_INITIALIZE_PATIENT_ENDPOINT: z.string().optional(),
    API_CHAT_RESPONSE_ENDPOINT: z.string().optional(),
    API_TIMEOUT_GENERATE_RESPONSE: z.string().optional(),
    API_TIMEOUT_INITIALIZE_PATIENT: z.string().optional(),
    API_TIMEOUT_CHAT_RESPONSE: z.string().optional(),
    EXTERNAL_AI_API_KEY: z.string().min(1).optional(),
  },

    client: {
    NEXT_PUBLIC_NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  },

    runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    ELEVENLABS_ENABLED: process.env.ELEVENLABS_ENABLED,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    // API Configuration
    API: process.env.API,
    API_BASE_URL: process.env.API_BASE_URL,
    API_GENERATE_RESPONSE_ENDPOINT: process.env.API_GENERATE_RESPONSE_ENDPOINT,
    API_INITIALIZE_PATIENT_ENDPOINT: process.env.API_INITIALIZE_PATIENT_ENDPOINT,
    API_CHAT_RESPONSE_ENDPOINT: process.env.API_CHAT_RESPONSE_ENDPOINT,
    API_TIMEOUT_GENERATE_RESPONSE: process.env.API_TIMEOUT_GENERATE_RESPONSE,
    API_TIMEOUT_INITIALIZE_PATIENT: process.env.API_TIMEOUT_INITIALIZE_PATIENT,
    API_TIMEOUT_CHAT_RESPONSE: process.env.API_TIMEOUT_CHAT_RESPONSE,
    EXTERNAL_AI_API_KEY: process.env.EXTERNAL_AI_API_KEY,
  },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    emptyStringAsUndefined: true,
});
