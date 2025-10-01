import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment variables configuration
 *
 * Validates and provides type-safe access to environment variables.
 * Uses @t3-oss/env-nextjs for runtime validation and TypeScript support.
 *
 * Server variables are validated at build time and runtime.
 * Client variables must be prefixed with NEXT_PUBLIC_ to be exposed to the browser.
 */
export const env = createEnv({
  /**
   * Server-side environment variables schema
   *
   * These variables are only available on the server and are validated
   * to ensure the app isn't built with invalid configuration.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(32)
        : z.string().min(32).optional(),
    NEXTAUTH_SECRET: z.string().min(32).optional(), // Fallback for NextAuth
    JWT_SECRET: z.string().min(32).optional(), // JWT-specific secret
    DATABASE_URL: z.string().min(1).refine(
      (url) => {
        // Support both SQLite and PostgreSQL URLs
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
  },

  /**
   * Client-side environment variables schema
   *
   * Variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
   * These are validated to ensure the app isn't built with invalid configuration.
   */
  client: {
    NEXT_PUBLIC_NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
