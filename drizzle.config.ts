
import { type Config } from "drizzle-kit";



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
