
import "dotenv/config";
import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema-postgres.ts",
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://user:password@localhost:5432/dbname",
  },
  tablesFilter: ["llmpatient_*"],
} satisfies Config;
