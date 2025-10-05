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
    ELEVENLABS_API_KEY: z.string().min(1).optional(), 
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
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    emptyStringAsUndefined: true,
});
