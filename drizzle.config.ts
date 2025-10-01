// @ts-nocheck
import { type Config } from "drizzle-kit";

/**
 * Drizzle ORM Configuration
 *
 * Configuration for Drizzle ORM database operations including schema location,
 * database connection, and migration settings.
 *
 * Dynamically supports both SQLite and PostgreSQL based on DATABASE_URL.
 * Uses SQLite for development and PostgreSQL for production.
 * All tables are prefixed with 'llmpatient_' for multi-project support.
 */

// Determine database type based on DATABASE_URL
const isPostgres = process.env.DATABASE_URL?.startsWith("postgres://") || 
                   process.env.DATABASE_URL?.startsWith("postgresql://");

const config: Config = {
  schema: isPostgres ? "./src/server/db/schema-postgres.ts" : "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: isPostgres ? "postgresql" : "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
  tablesFilter: ["llmpatient_*"],
};

export default config;
