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
  details: Record<string, any>;
  clinicalCase: string;
  objectives: string[];
  avatarUrl: string | null;
  voiceId: string | null;
  welcomeMessage: string | null;
  difficulty: number;
  estimatedDuration: number;
  therapeuticJourney: unknown;
};


function loadRootAttributes(): Record<string, any> {
  const rootAttributesPath = join(process.cwd(), "patients", "attributes.json");

  if (!existsSync(rootAttributesPath)) {
    return {};
  }

  try {
    const rootAttributesContent = readFileSync(rootAttributesPath, "utf-8");
    return JSON.parse(rootAttributesContent);
  } catch (error) {
    console.warn(
      `[WARN] Failed to load root attributes from ${rootAttributesPath}. Using empty defaults.`,
      error,
    );
    return {};
  }
}

const rootAttributes = loadRootAttributes();


function loadPatientsFromFiles(): PatientSeed[] {
  const patientsDir = join(process.cwd(), "patients");
  const entries = readdirSync(patientsDir, { withFileTypes: true });

  const patients: PatientSeed[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const slug = entry.name;
      const attributesPath = join(patientsDir, slug, "attributes.json");

      if (!existsSync(attributesPath)) {
        console.warn(
          `[WARN] Missing attributes.json for patient directory '${slug}'. Skipping.`,
        );
        continue;
      }

      try {
        const attributesContent = readFileSync(attributesPath, "utf-8");
        const attributesData = {
          ...(rootAttributes ?? {}),
          ...JSON.parse(attributesContent),
        };

        const therapeuticJourneyPath = join(
          patientsDir,
          slug,
          "therapeutic-journey.json",
        );
        let therapeuticJourneyData: unknown = {};
        if (existsSync(therapeuticJourneyPath)) {
          const therapeuticJourneyContent = readFileSync(
            therapeuticJourneyPath,
            "utf-8",
          );
          therapeuticJourneyData = JSON.parse(therapeuticJourneyContent);
        } else {
          console.warn(
            `[WARN] Missing therapeutic-journey.json for patient '${slug}'. Using empty object.`,
          );
        }

        let clinicalCase: string = attributesData.clinicalCase || "";
        if (!clinicalCase) {
          const clinicalCasePath = join(patientsDir, slug, "clinical-case");
          if (existsSync(clinicalCasePath)) {
            clinicalCase = readFileSync(clinicalCasePath, "utf-8");
          }
        }

        const normalizedObjectives = normalizeObjectives(attributesData);
        const normalizedDetails = normalizeDetails(attributesData);

        const patient: PatientSeed = {
          name: attributesData.name || extractNameFromFilename(`${slug}.json`),
          smallDescription:
            attributesData.briefDescription ||
            attributesData.small_description ||
            extractDescriptionFromData(attributesData),
          details: normalizedDetails,
          clinicalCase,
          objectives: normalizedObjectives,
          avatarUrl: attributesData.avatarUrl || null,
          voiceId: attributesData.voiceId || null,
          welcomeMessage: attributesData.welcomeMessage || null,
          difficulty: mapDifficultyToNumber(attributesData.difficulty),
          estimatedDuration: attributesData.estimatedDuration || 30,
          therapeuticJourney: therapeuticJourneyData,
        };

        patients.push(patient);
        console.log(`[INFO] Loaded patient: ${patient.name}`);
      } catch (error) {
        console.error(
          `[ERROR] Failed to load patient from ${attributesPath}:`,
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
  const brief = data.briefDescription || data.smallDescription;
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

function extractObjectivesFromData(data: any): string[] {
  const detailsGoals =
    data.details?.treatmentsAndInterventions?.therapeuticGoals ||
    data.details?.treatments_and_interventions?.therapeutic_goals;
  const source = data.objectives || detailsGoals || data.therapeutic_goals;

  if (!source) {
    return [
      "Conduct comprehensive clinical assessment",
      "Develop appropriate treatment plan",
      "Practice therapeutic communication skills",
      "Address patient's primary concerns",
    ];
  }

  return Array.isArray(source) ? source : [source];
}

function normalizeDetails(data: any): Record<string, any> {
  if (data.details && typeof data.details === "object") {
    return data.details;
  }
  const cloned = { ...data };
  delete cloned.objectives;
  delete cloned.briefDescription;
  delete cloned.small_description;
  delete cloned.avatarUrl;
  delete cloned.avatar_url;
  delete cloned.voiceId;
  delete cloned.welcomeMessage;
  delete cloned.difficulty;
  delete cloned.estimatedDuration;
  delete cloned.name;
  delete cloned.clinicalCase;
  delete cloned.smallDescription;
  return cloned;
}

function normalizeObjectives(data: any): string[] {
  const objectives = extractObjectivesFromData(data);
  return objectives.map((objective) => {
    if (typeof objective === "string") {
      return objective.trim();
    }
    return JSON.stringify(objective);
  });
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
  const ageValue =
    details?.demographicAndSocioculturalInformation?.age ??
    details?.demographic_sociocultural_information?.age;
  if (ageValue !== undefined && ageValue !== null) {
    const age = parseInt(ageValue, 10);
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
        therapeuticJourney: JSON.stringify(patient.therapeuticJourney),
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
