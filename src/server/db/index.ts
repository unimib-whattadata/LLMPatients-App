import { createClient, type Client } from "@libsql/client";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { env } from "~/env";
import * as sqliteSchema from "./schema";
import * as postgresSchema from "./schema-postgres";

export const isPostgres = env.DATABASE_URL.startsWith("postgres");

const globalForDb = globalThis as unknown as {
  libsqlClient: Client | undefined;
  postgresClient: Sql | undefined;
};

let db: ReturnType<typeof drizzleLibSQL>;
if (isPostgres) {
  const client =
    globalForDb.postgresClient ??
    postgres(env.DATABASE_URL, {
      max: env.NODE_ENV === "production" ? 10 : 1,
    });

  if (env.NODE_ENV !== "production") {
    globalForDb.postgresClient = client;
  }

  db = drizzlePostgres(client, { schema: postgresSchema }) as any;
} else {
  const client =
    globalForDb.libsqlClient ?? createClient({ url: env.DATABASE_URL });

  if (env.NODE_ENV !== "production") {
    globalForDb.libsqlClient = client;
  }

  db = drizzleLibSQL(client, { schema: sqliteSchema });
}

export type AppDb = typeof db;
export { db };
