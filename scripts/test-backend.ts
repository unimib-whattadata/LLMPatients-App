import { spawnSync } from "node:child_process";

import { config } from "dotenv";
import postgres from "postgres";

const scenarioApiMode = process.env.API ?? "local";
config({ path: [".env.local", ".env"], quiet: true });

type DialectResult = {
  dialect: "postgres";
  status: "passed" | "failed" | "skipped";
};

function buildBaseEnv() {
  return {
    ...process.env,
    NODE_ENV: "test" as const,
    AUTH_SECRET:
      process.env.AUTH_SECRET ?? "test-auth-secret-which-is-long-enough-12345",
    NEXTAUTH_SECRET:
      process.env.NEXTAUTH_SECRET ??
      "test-nextauth-secret-which-is-long-enough-12345",
    API: scenarioApiMode,
  };
}

function runScenario(env: NodeJS.ProcessEnv): boolean {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/backend-scenario.ts"],
    {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    },
  );

  return result.status === 0;
}

async function runPostgresScenario(): Promise<DialectResult> {
  const adminUrl =
    process.env.TEST_POSTGRES_ADMIN_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

  let adminSql;
  try {
    adminSql = postgres(adminUrl, { max: 1 });
    await adminSql`select 1`;
  } catch {
    if (adminSql) {
      await adminSql.end({ timeout: 0 }).catch(() => undefined);
    }

    return {
      dialect: "postgres",
      status: "skipped",
    };
  }

  const databaseName = `llmpatients_test_${Date.now()}_${Math.floor(
    Math.random() * 1000,
  )}`;
  const databaseUrlObject = new URL(adminUrl);
  databaseUrlObject.pathname = `/${databaseName}`;

  try {
    await adminSql.unsafe(`create database "${databaseName}"`);

    const passed = runScenario({
      ...buildBaseEnv(),
      DATABASE_URL: databaseUrlObject.toString(),
    });

    return {
      dialect: "postgres",
      status: passed ? "passed" : "failed",
    };
  } finally {
    await adminSql.unsafe(
      `select pg_terminate_backend(pid)
       from pg_stat_activity
       where datname = '${databaseName}'
         and pid <> pg_backend_pid()`,
    );
    await adminSql.unsafe(`drop database if exists "${databaseName}"`);
    await adminSql.end({ timeout: 0 }).catch(() => undefined);
  }
}

async function main() {
  const results = [await runPostgresScenario()];

  for (const result of results) {
    const label = `[backend:${result.dialect}]`;
    if (result.status === "passed") {
      console.log(`${label} passed`);
    } else if (result.status === "skipped") {
      console.log(`${label} skipped`);
    } else {
      console.error(`${label} failed`);
    }
  }

  if (results.some((result) => result.status !== "passed")) {
    process.exitCode = 1;
  }
}

void main();
