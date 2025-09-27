#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "crypto";

import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  text,
  integer,
  sqliteTableCreator,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { DIFFICULTY_LEVELS } from "../src/lib/constants/difficulty";

// Next.js automatically loads environment variables from .env files

const createTable = sqliteTableCreator((name) => `llmpatient_${name}`);

const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  password: d.text({ length: 255 }),
  role: d.text({ length: 20 }).default("user").notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
}));

const patients = createTable("patient", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: d.text({ length: 255 }).notNull(),
  smallDescription: d.text({ length: 500 }).notNull(), // Brief description of the case
  details: d.text().notNull(), // JSON string containing all patient details
  background: d.text({ length: 2000 }).notNull(),
  objectives: d.text({ length: 2000 }).notNull(), // JSON array of objectives
  avatarUrl: d.text({ length: 500 }),
  avatarType: d.text({ length: 20 }).default("illustration").notNull(), // 'photo', 'illustration', 'avatar'
  difficulty: d.integer({ mode: "number" }).notNull(), // 1: Facile, 2: Medio, 3: Difficile
  estimatedDuration: d.integer({ mode: "number" }).default(30).notNull(), // minutes
  isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

const therapySessions = createTable(
  "therapy_session",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    patientId: d
      .text({ length: 255 })
      .notNull()
      .references(() => patients.id),
    sessionNumber: d.integer({ mode: "number" }).default(1).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("therapy_session_user_idx").on(t.userId),
    index("therapy_session_patient_idx").on(t.patientId),
  ],
);

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

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

const PATIENTS: PatientSeed[] = loadPatientsFromFiles();

async function seedDatabase() {
  const targetEmails = SEED_USERS.map((user) => user.email);
  const existingUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.email, targetEmails));

  const existing = new Set(existingUsers.map((record) => record.email));
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
  await db.delete(therapySessions);
  await db.delete(patients);
  console.log("[INFO] Existing patients removed");

  let created = 0;

  // Add all patients from JSON files
  for (const patient of PATIENTS) {
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
    await seedDatabase();
    await seedPatients();
    console.log("[SUCCESS] Seeding completato");
    process.exit(0);
  } catch (error) {
    console.error("[ERROR] Seeding non riuscito", error);
    process.exit(1);
  } finally {
    client.close();
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
