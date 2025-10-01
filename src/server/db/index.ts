import { createClient, type Client } from "@libsql/client";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  client: Client | undefined;
};

// For now, we'll use LibSQL for both development and production
// This avoids TypeScript union type issues and provides a simpler solution
const client = globalForDb.client ?? createClient({ url: env.DATABASE_URL });
if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzleLibSQL(client, { schema });
