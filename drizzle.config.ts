import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./dev.db",
  },
  tablesFilter: ["epatient_*"],
  out: "./drizzle",
} satisfies Config;
