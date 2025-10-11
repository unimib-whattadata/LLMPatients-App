#!/usr/bin/env node


import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "child_process";
import { config } from "dotenv";


config({ path: join(process.cwd(), ".env.local") });
config({ path: join(process.cwd(), ".env") });


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


const databaseUrl =
  process.env.SEED_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";


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
  
  client = postgres(databaseUrl);
  db = drizzlePostgres(client, {
    schema: { users, patients, therapySessions },
  });
} else {
  
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
  clinicalCase: string;
  objectives: string[];
  avatarUrl: string | null;
  voiceId?: string | null;
  welcomeMessage?: string | null;
  difficulty: number;
  estimatedDuration: number;
};


function loadPatientsFromFiles(): PatientSeed[] {
  const patientsDir = join(process.cwd(), "patients");
  const entries = readdirSync(patientsDir, { withFileTypes: true });

  const patients: PatientSeed[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const slug = entry.name;
      const patientFilePath = join(patientsDir, slug, `${slug}.json`);

      if (!existsSync(patientFilePath)) {
        continue;
      }

      try {
        const fileContent = readFileSync(patientFilePath, "utf-8");
        const patientData = JSON.parse(fileContent);

        const patient: PatientSeed = {
          name: patientData.name || extractNameFromFilename(`${slug}.json`),
          smallDescription:
            patientData.briefDescription ||
            patientData.small_description ||
            extractDescriptionFromData(patientData),
          details: patientData.details || patientData,
          clinicalCase: patientData.clinicalCase || "",
          objectives: Array.isArray(patientData.objectives)
            ? patientData.objectives
            : patientData.objectives
              ? [patientData.objectives].flat()
              : extractObjectivesFromData(patientData),
          avatarUrl: patientData.avatarUrl || null,
          difficulty: mapDifficultyToNumber(patientData.difficulty),
          estimatedDuration: patientData.estimatedDuration || 30,
        };

        patients.push(patient);
        console.log(`[INFO] Loaded patient: ${patient.name}`);
      } catch (error) {
        console.error(
          `[ERROR] Failed to load patient from ${patientFilePath}:`,
          error,
        );
      }
    }
  }

  if (patients.length === 0) {
    console.warn(
      "[WARN] No patient data loaded. Check that patient JSON files are available.",
    );
  }

  return patients;
}


function extractNameFromFilename(filename: string): string {
  return filename
    .replace(".json", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function extractDescriptionFromData(data: any): string {
  const brief = data.briefDescription;
  if (brief) {
    return brief;
  }

  // Try both camelCase and snake_case formats
  const diagnoses =
    data.psychologicalProfileAndCognitiveFunctioning
      ?.currentAndPastPsychiatricDiagnoses ||
    data.psychological_profile_and_cognitive_functioning
      ?.current_and_past_psychiatric_diagnoses;
  if (diagnoses) {
    return diagnoses.split(";")[0].trim();
  }
  return "Patient case study";
}

function extractBackgroundFromData(data: any): string {
  if (data.details?.clinicalCase) {
    return data.details.clinicalCase;
  }

  if (data.background) return data.background;

  // Try both camelCase and snake_case formats
  const age = 
    data.demographicAndSocioculturalInformation?.age ||
    data.demographic_sociocultural_information?.age;
  const gender = 
    data.demographicAndSocioculturalInformation?.gender ||
    data.demographic_sociocultural_information?.gender;
  const mainSymptoms =
    data.psychologicalProfileAndCognitiveFunctioning?.mainSymptoms ||
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
  if (Array.isArray(data.objectives)) {
    return data.objectives;
  }

  if (data.therapeutic_goals) {
    return Array.isArray(data.therapeutic_goals)
      ? data.therapeutic_goals
      : [data.therapeutic_goals];
  }

  
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
  return DIFFICULTY_LEVELS.MEDIO; 
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

function extractAgeFromDetails(details: any): number {
  // Try to find age in different possible locations
  if (details?.demographicAndSocioculturalInformation?.age) {
    const age = parseInt(details.demographicAndSocioculturalInformation.age, 10);
    if (!isNaN(age)) return age;
  }
  if (details?.demographic_sociocultural_information?.age) {
    const age = parseInt(details.demographic_sociocultural_information.age, 10);
    if (!isNaN(age)) return age;
  }
  // Default age if not found
  return 30;
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
  
  console.log("[INFO] Removing existing patients...");
  
  
  await db.delete(therapySessions);
  
  await db.delete(patients);
  console.log("[INFO] Existing patients removed");

  let created = 0;

  
  for (const patient of PATIENTS) {
    
    const result = await db
      .insert(patients)
      .values({
        name: patient.name,
        age: extractAgeFromDetails(patient.details),
        smallDescription: patient.smallDescription,
        details: JSON.stringify(patient.details),
        clinicalCase: patient.clinicalCase,
        objectives: JSON.stringify(patient.objectives),
        avatarUrl: patient.avatarUrl,
        voiceId: patient.voiceId || null,
        welcomeMessage: patient.welcomeMessage || null,
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
    
    
    
    
    
    
    
    
    

    await seedDatabase();
    await seedPatients();
    console.log("[SUCCESS] Seeding completato");
    process.exit(0);
  } catch (error) {
    console.error("[ERROR] Seeding non riuscito", error);
    process.exit(1);
  } finally {
    
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
