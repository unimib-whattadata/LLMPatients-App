// @ts-nocheck
import { type Config } from "drizzle-kit";

/**
 * Drizzle ORM Configuration
 *
 * Configuration for Drizzle ORM database operations including schema location,
 * database connection, and migration settings.
 *
 * Uses SQLite database with file-based storage for development.
 * All tables are prefixed with 'llmpatient_' for multi-project support.
 */
export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
  tablesFilter: ["llmpatient_*"],
} satisfies Config;
