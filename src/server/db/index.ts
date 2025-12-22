import { createClient, type Client } from "@libsql/client";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as sqliteSchema from "./schema";
import * as postgresSchema from "./schema-postgres";

const isPostgres = env.DATABASE_URL.startsWith("postgres");
const schema = isPostgres ? postgresSchema : sqliteSchema;

const globalForDb = globalThis as unknown as {
  client: Client | undefined;
};


let db: ReturnType<typeof drizzleLibSQL>;
if (env.DATABASE_URL.startsWith("postgres")) {
  const client = postgres(env.DATABASE_URL);
  db = drizzlePostgres(client, { schema }) as any;
} else {
  const client = globalForDb.client ?? createClient({ url: env.DATABASE_URL });
  if (env.NODE_ENV !== "production") globalForDb.client = client;
  db = drizzleLibSQL(client, { schema });
}

export { db };
