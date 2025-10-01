import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { env } from "~/env";
import * as postgresSchema from "./schema-postgres";

/**
 * PostgreSQL database configuration
 * 
 * Use this when you need to connect to a PostgreSQL database.
 * This is a separate configuration that doesn't interfere with the main LibSQL setup.
 */

const globalForPostgres = globalThis as unknown as {
  client: Sql | undefined;
};

// Create PostgreSQL connection
const client = globalForPostgres.client ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForPostgres.client = client;

export const dbPostgres = drizzlePostgres(client, { schema: postgresSchema });
