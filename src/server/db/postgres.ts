import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { env } from "~/env";
import * as postgresSchema from "./schema-postgres";


const globalForPostgres = globalThis as unknown as {
  client: Sql | undefined;
};


const client = globalForPostgres.client ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForPostgres.client = client;

export const dbPostgres = drizzlePostgres(client, { schema: postgresSchema });
