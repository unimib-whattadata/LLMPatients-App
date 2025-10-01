// @ts-nocheck
import { type Config } from "drizzle-kit";

/**
 * Drizzle ORM Configuration for PostgreSQL
 *
 * Use this configuration when working with PostgreSQL databases.
 * Run with: npx drizzle-kit --config=drizzle-postgres.config.ts
 */
export default {
  schema: "./src/server/db/schema-postgres.ts",
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/dbname",
  },
  tablesFilter: ["llmpatient_*"],
} satisfies Config;
