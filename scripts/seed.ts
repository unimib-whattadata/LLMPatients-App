#!/usr/bin/env node

/**
 * Database Seeding Script
 *
 * This script supports both PostgreSQL and SQLite databases for seeding.
 * The database type is automatically detected based on the DATABASE_URL:
 *
 * - PostgreSQL: If DATABASE_URL starts with "postgres://" or "postgresql://"
 * - SQLite/LibSQL: If DATABASE_URL starts with "file:" or other schemes
 *
 * For PostgreSQL seeding:
 * 1. Ensure PostgreSQL is running and accessible
 * 2. Set DATABASE_URL to your PostgreSQL connection string
 * 3. Run: pnpm tsx scripts/seed.ts
 *
 * For SQLite seeding (default):
 * 1. Set DATABASE_URL to "file:./dev.db" or leave unset
 * 2. Run: pnpm tsx scripts/seed.ts
 *
 * You can also override with SEED_DATABASE_URL environment variable.
 */

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "child_process";
import { config } from "dotenv";

// Load environment variables from .env files BEFORE any other imports
config({ path: join(process.cwd(), ".env.local") });
config({ path: join(process.cwd(), ".env") });

// Set default DATABASE_URL for development if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DIFFICULTY_LEVELS } from "../src/lib/constants/difficulty";

// Create database connection - default to local SQLite for seeding
const databaseUrl =
  process.env.SEED_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
// Import schema tables
// Dynamic schema import based on database type
const schemaPath = databaseUrl.startsWith("postgres")
  ? "../src/server/db/schema-postgres.ts"
  : "../src/server/db/schema.ts";

const { users, patients, therapySessions } = await import(schemaPath);

let db: any;
let client: any;

console.log(
  `[INFO] Using database: ${databaseUrl.startsWith("postgres") ? "PostgreSQL" : "SQLite"}`,
);

if (databaseUrl.startsWith("postgres")) {
  // PostgreSQL connection
  client = postgres(databaseUrl);
  db = drizzlePostgres(client, {
    schema: { users, patients, therapySessions },
  });
} else {
  // SQLite/LibSQL connection
  client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  db = drizzleLibSQL(client, { schema: { users, patients, therapySessions } });
}

const SALT_ROUNDS = 10;

const SEED_USERS = [
  {
    name: "Administrator",
    email: "admin@example.com",
    password: "Qwerty123!",
    role: "admin",
  },
  {
    name: "Test User",
    email: "user@example.com",
    password: "Qwerty123!",
    role: "user",
  },
] as const;

type PatientSeed = {
  name: string;
  smallDescription: string;
  details: {
    demographic_sociocultural_information: {
      age: string;
      gender: string;
    };
    psychological_profile_and_cognitive_functioning: {
      current_and_past_psychiatric_diagnoses: string;
    };
  };
  background: string;
  objectives: string[];
  avatarUrl: string | null;
  avatarType: string;
  difficulty: number;
  estimatedDuration: number;
};

// Function to read patient data from JSON files
function loadPatientsFromFiles(): PatientSeed[] {
  const patientsDir = join(process.cwd(), "src", "server", "db", "patients");
  const patientFiles = readdirSync(patientsDir).filter((file) =>
    file.endsWith(".json"),
  );

  const patients: PatientSeed[] = [];

  for (const file of patientFiles) {
    try {
      const filePath = join(patientsDir, file);
      const fileContent = readFileSync(filePath, "utf-8");
      const patientData = JSON.parse(fileContent);

      // Convert JSON data to PatientSeed format
      const patient: PatientSeed = {
        name: patientData.name || extractNameFromFilename(file),
        smallDescription:
          patientData.small_description ||
          extractDescriptionFromData(patientData),
        details: patientData.details || patientData, // Use the full data if no details field
        background:
          patientData.background || extractBackgroundFromData(patientData),
        objectives: patientData.objectives
          ? Array.isArray(patientData.objectives)
            ? patientData.objectives
            : JSON.parse(patientData.objectives)
          : extractObjectivesFromData(patientData),
        avatarUrl: patientData.avatarUrl || null,
        avatarType: patientData.avatarType || "illustration",
        difficulty: mapDifficultyToNumber(patientData.difficulty),
        estimatedDuration: patientData.estimatedDuration || 30,
      };

      patients.push(patient);
      console.log(`[INFO] Loaded patient: ${patient.name}`);
    } catch (error) {
      console.error(`[ERROR] Failed to load patient from ${file}:`, error);
    }
  }

  return patients;
}

// Helper functions to extract data from patient JSON
function extractNameFromFilename(filename: string): string {
  return filename
    .replace(".json", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function extractDescriptionFromData(data: any): string {
  const diagnoses =
    data.psychological_profile_and_cognitive_functioning
      ?.current_and_past_psychiatric_diagnoses;
  if (diagnoses) {
    return diagnoses.split(";")[0].trim();
  }
  return "Patient case study";
}

function extractBackgroundFromData(data: any): string {
  // Try to find a background field, or create one from available data
  if (data.background) return data.background;

  const age = data.demographic_sociocultural_information?.age;
  const gender = data.demographic_sociocultural_information?.gender;
  const mainSymptoms =
    data.psychological_profile_and_cognitive_functioning?.main_symptoms;

  let background = "";
  if (age && gender) {
    background += `A ${age}-year-old ${gender.toLowerCase()} `;
  }
  if (mainSymptoms) {
    background += `presenting with ${mainSymptoms.toLowerCase()}. `;
  }
  background +=
    "This case study provides an opportunity to practice clinical assessment and intervention skills.";

  return background;
}

function extractObjectivesFromData(data: any): string[] {
  if (data.therapeutic_goals) {
    return Array.isArray(data.therapeutic_goals)
      ? data.therapeutic_goals
      : [data.therapeutic_goals];
  }

  // Default objectives based on common patterns
  return [
    "Conduct comprehensive clinical assessment",
    "Develop appropriate treatment plan",
    "Practice therapeutic communication skills",
    "Address patient's primary concerns",
  ];
}

function mapDifficultyToNumber(difficulty: any): number {
  if (typeof difficulty === "number") return difficulty;
  if (typeof difficulty === "string") {
    const lower = difficulty.toLowerCase();
    if (lower.includes("facile") || lower.includes("easy"))
      return DIFFICULTY_LEVELS.FACILE;
    if (lower.includes("medio") || lower.includes("medium"))
      return DIFFICULTY_LEVELS.MEDIO;
    if (lower.includes("difficile") || lower.includes("difficult"))
      return DIFFICULTY_LEVELS.DIFFICILE;
  }
  return DIFFICULTY_LEVELS.MEDIO; // Default to medium difficulty
}

function mapGenderToEnum(gender: string): "male" | "female" | "other" {
  const lower = gender.toLowerCase();
  if (
    lower.includes("maschio") ||
    lower.includes("male") ||
    lower.includes("uomo")
  ) {
    return "male";
  }
  if (
    lower.includes("femmina") ||
    lower.includes("female") ||
    lower.includes("donna")
  ) {
    return "female";
  }
  return "other";
}

const PATIENTS: PatientSeed[] = loadPatientsFromFiles();

async function seedDatabase() {
  const targetEmails = SEED_USERS.map((user) => user.email);
  const existingUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.email, targetEmails));

  const existing = new Set(
    existingUsers.map((record: { email: string }) => record.email),
  );
  const createdUsers: string[] = [];

  for (const user of SEED_USERS) {
    if (existing.has(user.email)) {
      console.log(`ℹ️  Utente già presente: ${user.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
    await db.insert(users).values({
      name: user.name,
      email: user.email,
      password: passwordHash,
      role: user.role,
    });

    createdUsers.push(user.email);
    console.log(`[SUCCESS] Creato utente ${user.email}`);
  }

  if (createdUsers.length === 0) {
    console.log("👌 Nessun nuovo utente da creare");
  } else {
    console.log("Credenziali disponibili:");
    for (const user of SEED_USERS) {
      if (createdUsers.includes(user.email)) {
        console.log(` • ${user.email} / ${user.password}`);
      }
    }
  }
}

async function seedPatients() {
  // First, delete all existing patients and their dependent records
  console.log("[INFO] Removing existing patients...");
  // Delete in order: first dependent tables, then main table
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(therapySessions);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(patients);
  console.log("[INFO] Existing patients removed");

  let created = 0;

  // Add all patients from JSON files
  for (const patient of PATIENTS) {
    // Extract age and gender from patient details
    const result = await db
      .insert(patients)
      .values({
        name: patient.name,
        smallDescription: patient.smallDescription,
        details: JSON.stringify(patient.details),
        background: patient.background,
        objectives: JSON.stringify(patient.objectives),
        avatarUrl: patient.avatarUrl,
        avatarType: patient.avatarType,
        difficulty: patient.difficulty,
        estimatedDuration: patient.estimatedDuration,
        isActive: true,
      })
      .returning({ id: patients.id });

    const patientId = result[0]?.id;
    if (!patientId) {
      console.error("[ERROR] Failed to create patient:", patient.name);
      continue;
    }

    created += 1;
  }

  console.log(`[INFO] Pazienti virtuali pronti (${created} totali)`);
}

async function runSeeding() {
  try {
    console.log("⏭️  Skipping migrations (schema already applied)...");
    // console.log("🔄 Running database migrations...");
    // const migrateCommand = databaseUrl.startsWith("postgres")
    //   ? "npx drizzle-kit migrate --config=drizzle-postgres.config.ts"
    //   : "npx drizzle-kit migrate";
    // execSync(migrateCommand, {
    //   stdio: "inherit",
    //   env: { ...process.env, DATABASE_URL: databaseUrl },
    // });
    // console.log("✅ Database migrations completed successfully!");

    await seedDatabase();
    await seedPatients();
    console.log("[SUCCESS] Seeding completato");
    process.exit(0);
  } catch (error) {
    console.error("[ERROR] Seeding non riuscito", error);
    process.exit(1);
  } finally {
    // Close database connection
    if (client && typeof client.close === "function") {
      client.close();
    }
  }
}

const isDirectExecution = (() => {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  void runSeeding();
}

export { seedDatabase };
