import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { env } from "~/env";
import * as postgresSchema from "./schema-postgres";

const globalForDb = globalThis as unknown as {
  postgresClient: Sql | undefined;
};

const connectionPoolSize = env.NODE_ENV === "production" ? 10 : 1;

export const postgresClient =
  globalForDb.postgresClient ??
  postgres(env.DATABASE_URL, {
    max: connectionPoolSize,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.postgresClient = postgresClient;
}

const db = drizzlePostgres(postgresClient, { schema: postgresSchema });

export type AppDb = typeof db;
export { db };
