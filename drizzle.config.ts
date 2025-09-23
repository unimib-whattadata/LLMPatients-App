import { type Config } from "drizzle-kit";

/**
 * Drizzle ORM Configuration
 * 
 * Configuration for Drizzle ORM database operations including schema location,
 * database connection, and migration settings.
 * 
 * Uses SQLite database with file-based storage for development.
 * All tables are prefixed with 'epatient_' for multi-project support.
 */
export default {
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./dev.db",
  },
  tablesFilter: ["epatient_*"],
  out: "./drizzle",
} satisfies Config;
