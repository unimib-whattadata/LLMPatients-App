#!/usr/bin/env node

import nodeCrypto from "node:crypto";
import { config } from "dotenv";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";
import { inArray } from "drizzle-orm";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { parse as parseYaml } from "yaml";
import { DIFFICULTY_LEVELS } from "../src/lib/constants/difficulty";

config({ path: join(process.cwd(), ".env.local") });
config({ path: join(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

// Ensure global crypto is available (bcryptjs relies on Web Crypto in some runtimes).
if (!(globalThis as { crypto?: Crypto }).crypto && (nodeCrypto as typeof nodeCrypto & { webcrypto?: Crypto }).webcrypto) {
  (globalThis as { crypto?: Crypto }).crypto = (nodeCrypto as typeof nodeCrypto & { webcrypto?: Crypto }).webcrypto;
}

const databaseUrl = process.env.SEED_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = databaseUrl.startsWith("postgres");
const schemaPath = isPostgres ? "../src/server/db/schema-postgres.ts" : "../src/server/db/schema.ts";

const { users, patients, therapySessions } = await import(schemaPath);

type JsonRecord = Record<string, unknown>;

type PatientSeed = {
  sourceFile: string;
  name: string;
  age: number;
  gender: string | null;
  smallDescription: string;
  diagnosis: string | null;
  psychologicalProfile: string | null;
  currentMedications: string[];
  details: JsonRecord;
  clinicalCase: string;
  objectives: string[];
  avatarUrl: string | null;
  elevenlabsVoiceId: string | null;
  vibevoiceVoiceId: string | null;
  chatterboxVoiceId: string | null;
  externalPatientId: string | null;
  welcomeMessage: string | null;
  difficulty: number;
  estimatedDuration: number;
  therapeuticJourney: unknown;
};

const SALT_ROUNDS = 10;
const PATIENTS_DIR = join(process.cwd(), "patients");
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

const DEFAULT_OBJECTIVES = [
  "Conduct comprehensive clinical assessment",
  "Develop appropriate treatment plan",
  "Practice therapeutic communication skills",
  "Address patient's primary concerns",
] as const;

let db: any;
let client: any;

console.log(`[INFO] Using database: ${isPostgres ? "PostgreSQL" : "SQLite"}`);

if (isPostgres) {
  client = postgres(databaseUrl);
  db = drizzlePostgres(client, { schema: { users, patients, therapySessions } });
} else {
  client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  db = drizzleLibSQL(client, { schema: { users, patients, therapySessions } });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readSafeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item === null || item === undefined) return "";
        return JSON.stringify(item);
      })
      .filter((item) => item.length > 0);
  }

  const single = readNonEmptyString(value);
  return single ? [single] : [];
}

function getNestedValue(record: JsonRecord, path: readonly string[]): unknown {
  let current: unknown = record;

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

function getFirstDefinedValue(
  record: JsonRecord,
  paths: readonly (readonly string[])[],
): unknown {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function readStringFromPaths(
  record: JsonRecord,
  paths: readonly (readonly string[])[],
): string | null {
  for (const path of paths) {
    const value = readNonEmptyString(getNestedValue(record, path));
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function looksLikePatientPayload(payload: JsonRecord): boolean {
  return (
    readStringFromPaths(payload, [["profile", "name"], ["name"]]) !== null ||
    readStringFromPaths(payload, [["identifiers", "patientId"], ["patientId"]]) !== null ||
    isRecord(getFirstDefinedValue(payload, [["clinical", "details"], ["details"]]))
  );
}

function extractNameFromFilename(filename: string): string {
  return filename
    .replace(/\.(json|ya?ml)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractDescription(payload: JsonRecord, details: JsonRecord): string {
  const directDescription = readStringFromPaths(payload, [
    ["profile", "smallDescription"],
    ["smallDescription"],
    ["briefDescription"],
    ["small_description"],
  ]);

  if (directDescription) {
    return directDescription;
  }

  const diagnosis = readNonEmptyString(
    getNestedValue(details, ["clinicalFunctioning", "personalityAndSymptomAxis", "personalitySyndrome"]),
  );

  if (diagnosis) {
    return diagnosis;
  }

  const previousDiagnoses = readStringArray(
    getNestedValue(details, ["treatmentsAndInterventions", "previousPsychiatricDiagnoses"]),
  );

  if (previousDiagnoses.length > 0) {
    return previousDiagnoses[0]!;
  }

  return "Patient case study";
}

function extractObjectives(payload: JsonRecord, details: JsonRecord): string[] {
  const directObjectives = readStringArray(
    getFirstDefinedValue(payload, [
      ["therapy", "objectives"],
      ["objectives"],
    ]),
  );
  if (directObjectives.length > 0) {
    return directObjectives;
  }

  const detailsObjectives = readStringArray(
    getNestedValue(details, ["treatmentsAndInterventions", "therapeuticGoals"]),
  );

  if (detailsObjectives.length > 0) {
    return detailsObjectives;
  }

  return [...DEFAULT_OBJECTIVES];
}

function mapDifficultyToNumber(value: unknown): number {
  const numericDifficulty = readSafeInteger(value);
  if (numericDifficulty !== null && numericDifficulty >= DIFFICULTY_LEVELS.FACILE && numericDifficulty <= DIFFICULTY_LEVELS.DIFFICILE) {
    return numericDifficulty;
  }

  const stringDifficulty = readNonEmptyString(value)?.toLowerCase();
  if (!stringDifficulty) {
    return DIFFICULTY_LEVELS.MEDIO;
  }

  if (stringDifficulty.includes("facile") || stringDifficulty.includes("easy")) {
    return DIFFICULTY_LEVELS.FACILE;
  }

  if (stringDifficulty.includes("medio") || stringDifficulty.includes("medium")) {
    return DIFFICULTY_LEVELS.MEDIO;
  }

  if (stringDifficulty.includes("difficile") || stringDifficulty.includes("difficult") || stringDifficulty.includes("hard")) {
    return DIFFICULTY_LEVELS.DIFFICILE;
  }

  return DIFFICULTY_LEVELS.MEDIO;
}

function parseCountFromText(text: string): number | null {
  const lower = text.toLowerCase();

  if (
    lower.includes("none") ||
    lower.includes("nessuna") ||
    lower.includes("nessuno") ||
    lower.includes("non applicabile") ||
    lower.includes("not reported")
  ) {
    return 0;
  }

  const digitMatch = lower.match(/\d+/);
  if (digitMatch) {
    return Number.parseInt(digitMatch[0], 10);
  }

  const wordToNumber: Record<string, number> = {
    one: 1,
    uno: 1,
    una: 1,
    two: 2,
    due: 2,
    three: 3,
    tre: 3,
    four: 4,
    quattro: 4,
    five: 5,
    cinque: 5,
  };

  for (const [word, number] of Object.entries(wordToNumber)) {
    if (lower.includes(word)) {
      return number;
    }
  }

  if (lower.includes("multiple") || lower.includes("several") || lower.includes("varie") || lower.includes("various")) {
    return 2;
  }

  return null;
}

function extractAge(details: JsonRecord): number {
  const age =
    readSafeInteger(getNestedValue(details, ["demographicAndSocioculturalInformation", "age"])) ??
    readSafeInteger(getNestedValue(details, ["demographic_sociocultural_information", "age"]));

  return age !== null && age > 0 ? age : 30;
}

function extractGender(details: JsonRecord): string | null {
  return (
    readNonEmptyString(getNestedValue(details, ["demographicAndSocioculturalInformation", "gender"])) ??
    readNonEmptyString(getNestedValue(details, ["demographic_sociocultural_information", "gender"]))
  );
}

function extractDiagnosis(details: JsonRecord): string | null {
  const directDisorder = readNonEmptyString(getNestedValue(details, ["disorder", "disorderName"]));
  if (directDisorder) {
    return directDisorder;
  }

  const previousDiagnoses = readStringArray(
    getNestedValue(details, ["treatmentsAndInterventions", "previousPsychiatricDiagnoses"]),
  );

  if (previousDiagnoses.length > 0) {
    return previousDiagnoses.join("; ");
  }

  return readNonEmptyString(
    getNestedValue(details, ["clinicalFunctioning", "personalityAndSymptomAxis", "personalitySyndrome"]),
  );
}

function extractPsychologicalProfile(details: JsonRecord): string | null {
  const profile = getNestedValue(details, ["psychologicalProfileAndCognitiveFunctioning"]);
  if (!isRecord(profile)) {
    return null;
  }

  const chunks: string[] = [];

  const affective = readNonEmptyString(profile.affectiveEmotionalFunctioningAndMoodRegulation);
  if (affective) {
    chunks.push(`Affective/Emotional: ${affective}`);
  }

  const comorbidities = readNonEmptyString(profile.psychiatricComorbidities);
  if (comorbidities) {
    chunks.push(`Comorbidities: ${comorbidities}`);
  }

  const selfAndOthers = readNonEmptyString(profile.senseOfSelfAndOthers);
  if (selfAndOthers) {
    chunks.push(`Self/Others: ${selfAndOthers}`);
  }

  const cognitiveStyle = readNonEmptyString(profile.thoughtFunctioningAndCognitiveStyle);
  if (cognitiveStyle) {
    chunks.push(`Cognitive Style: ${cognitiveStyle}`);
  }

  return chunks.length > 0 ? chunks.join(". ") : null;
}

function extractCurrentMedications(details: JsonRecord): string[] {
  const treatments = getNestedValue(details, ["treatmentsAndInterventions"]);
  const medicalHistory = getNestedValue(details, ["medicalAndPhysicalHistory"]);

  const medications = new Set<string>();

  if (isRecord(treatments)) {
    for (const medication of readStringArray(treatments.medicationHistory)) {
      medications.add(medication);
    }
    for (const medication of readStringArray(treatments.pharmacologicalTreatments)) {
      medications.add(medication);
    }
  }

  if (isRecord(medicalHistory)) {
    for (const medication of readStringArray(medicalHistory.pharmacologicalTreatments)) {
      medications.add(medication);
    }
  }

  return [...medications];
}

function extractPreviousSessions(details: JsonRecord): number {
  const explicitCount = readSafeInteger(getNestedValue(details, ["treatmentsAndInterventions", "previousSessions"]));
  if (explicitCount !== null && explicitCount >= 0) {
    return explicitCount;
  }

  const previousTherapyText = readNonEmptyString(
    getNestedValue(details, ["treatmentsAndInterventions", "previousTherapeuticExperiences"]),
  );
  const previousHospitalizationsText = readNonEmptyString(
    getNestedValue(details, ["treatmentsAndInterventions", "previousHospitalizations"]),
  );

  const parsedTherapyCount = previousTherapyText ? parseCountFromText(previousTherapyText) : null;
  const parsedHospitalizationCount = previousHospitalizationsText
    ? parseCountFromText(previousHospitalizationsText)
    : null;

  if (parsedTherapyCount !== null || parsedHospitalizationCount !== null) {
    return Math.max(parsedTherapyCount ?? 0, parsedHospitalizationCount ?? 0);
  }

  return previousTherapyText ? 1 : 0;
}

function createDetailsPayload(payload: JsonRecord): JsonRecord {
  const detailsSource = getFirstDefinedValue(payload, [
    ["clinical", "details"],
    ["details"],
  ]);
  const details = isRecord(detailsSource) ? { ...detailsSource } : {};

  // Keep additional clinically relevant top-level sections inside details for a single payload source of truth.
  const emotionTraits = getFirstDefinedValue(payload, [
    ["clinical", "emotionTraits"],
    ["emotionTraits"],
  ]);
  if (isRecord(emotionTraits)) {
    details.emotionTraits = emotionTraits;
  }

  const disorderId = readStringFromPaths(payload, [
    ["identifiers", "disorderId"],
    ["disorderId"],
  ]);
  if (disorderId) {
    details.disorderId = disorderId;
  }

  return details;
}

function buildPatientSeed(payload: JsonRecord, sourceFile: string): PatientSeed {
  const details = createDetailsPayload(payload);
  const fallbackName = extractNameFromFilename(sourceFile);

  const patientName =
    readStringFromPaths(payload, [["profile", "name"], ["name"]]) ?? fallbackName;
  const externalPatientId = readStringFromPaths(payload, [
    ["identifiers", "externalPatientId"],
    ["externalPatientId"],
    ["identifiers", "patientId"],
    ["patientId"],
  ]);
  const age =
    readSafeInteger(
      getFirstDefinedValue(payload, [
        ["profile", "age"],
        ["age"],
      ]),
    ) ?? extractAge(details);
  const gender =
    readStringFromPaths(payload, [["profile", "gender"], ["gender"]]) ??
    extractGender(details);
  const diagnosis =
    readStringFromPaths(payload, [["profile", "diagnosis"], ["diagnosis"]]) ??
    extractDiagnosis(details);
  const psychologicalProfile =
    readStringFromPaths(payload, [
      ["profile", "psychologicalProfile"],
      ["psychologicalProfile"],
    ]) ?? extractPsychologicalProfile(details);
  const explicitCurrentMedications = readStringArray(
    getFirstDefinedValue(payload, [
      ["clinical", "currentMedications"],
      ["currentMedications"],
    ]),
  );
  const currentMedications =
    explicitCurrentMedications.length > 0
      ? explicitCurrentMedications
      : extractCurrentMedications(details);

  return {
    sourceFile,
    name: patientName,
    age,
    gender,
    smallDescription: extractDescription(payload, details),
    diagnosis,
    psychologicalProfile,
    currentMedications,
    details,
    clinicalCase:
      readStringFromPaths(payload, [["clinical", "clinicalCase"], ["clinicalCase"]]) ?? "",
    objectives: extractObjectives(payload, details),
    avatarUrl: readStringFromPaths(payload, [
      ["profile", "avatarUrl"],
      ["avatarUrl"],
    ]),
    // Backward compatibility: legacy "voiceId" is interpreted as ElevenLabs voice id.
    elevenlabsVoiceId:
      readStringFromPaths(payload, [
        ["voice", "elevenlabsVoiceId"],
        ["elevenlabsVoiceId"],
      ]) ??
      readStringFromPaths(payload, [["voice", "voiceId"], ["voiceId"]]),
    vibevoiceVoiceId: readStringFromPaths(payload, [
      ["voice", "vibevoiceVoiceId"],
      ["vibevoiceVoiceId"],
    ]),
    chatterboxVoiceId: readStringFromPaths(payload, [
      ["voice", "chatterboxVoiceId"],
      ["chatterboxVoiceId"],
    ]),
    externalPatientId,
    welcomeMessage: readStringFromPaths(payload, [
      ["chat", "welcomeMessage"],
      ["voice", "welcomeMessage"],
      ["welcomeMessage"],
    ]),
    difficulty: mapDifficultyToNumber(
      getFirstDefinedValue(payload, [["therapy", "difficulty"], ["difficulty"]]),
    ),
    estimatedDuration:
      readSafeInteger(
        getFirstDefinedValue(payload, [
          ["therapy", "estimatedDuration"],
          ["estimatedDuration"],
        ]),
      ) ?? 30,
    therapeuticJourney: getFirstDefinedValue(payload, [["therapy", "journey"], ["therapeuticJourney"]]) ?? {},
  };
}

function loadPatientsFromYamlFiles(): PatientSeed[] {
  if (!existsSync(PATIENTS_DIR)) {
    console.warn(`[WARN] Missing patients directory: ${PATIENTS_DIR}`);
    return [];
  }

  const patientFiles = readdirSync(PATIENTS_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.toLowerCase().endsWith(".yaml") ||
          entry.name.toLowerCase().endsWith(".yml")),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const loadedPatients: PatientSeed[] = [];

  for (const filename of patientFiles) {
    const fullPath = join(PATIENTS_DIR, filename);

    try {
      const rawContent = readFileSync(fullPath, "utf-8");
      const parsed = parseYaml(rawContent) as unknown;

      if (!isRecord(parsed)) {
        console.warn(`[WARN] ${filename} is not a YAML object. Skipping.`);
        continue;
      }

      if (!looksLikePatientPayload(parsed)) {
        console.log(`[INFO] Skipping non-patient JSON file: ${filename}`);
        continue;
      }

      const patient = buildPatientSeed(parsed, filename);
      loadedPatients.push(patient);
      console.log(`[INFO] Loaded patient: ${patient.name} (${filename})`);
    } catch (error) {
      console.error(`[ERROR] Failed to parse patient YAML file ${filename}:`, error);
    }
  }

  if (loadedPatients.length === 0) {
    console.warn("[WARN] No patients loaded from patients/*.yaml");
  }

  return loadedPatients;
}

const PATIENTS: PatientSeed[] = loadPatientsFromYamlFiles();

async function seedDatabase() {
  const targetEmails = SEED_USERS.map((user) => user.email);
  const existingUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.email, targetEmails));

  const existingUserEmails = new Set(
    existingUsers.map((record: { email: string }) => record.email),
  );

  const createdUsers: string[] = [];

  for (const user of SEED_USERS) {
    if (existingUserEmails.has(user.email)) {
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
    return;
  }

  console.log("Credenziali disponibili:");
  for (const user of SEED_USERS) {
    if (createdUsers.includes(user.email)) {
      console.log(` • ${user.email} / ${user.password}`);
    }
  }
}

async function seedPatients() {
  console.log("[INFO] Removing existing therapy sessions and patients...");

  // Delete dependent records first to avoid foreign key violations.
  await db.delete(therapySessions);
  await db.delete(patients);

  if (PATIENTS.length === 0) {
    console.warn("[WARN] No patients to insert.");
    return;
  }

  const rows = PATIENTS.map((patient) => {
    const details = patient.details;

    return {
      name: patient.name,
      age: patient.age,
      smallDescription: patient.smallDescription,
      details: JSON.stringify(details),
      clinicalCase: patient.clinicalCase,
      objectives: JSON.stringify(patient.objectives),
      avatarUrl: patient.avatarUrl,
      elevenlabsVoiceId: patient.elevenlabsVoiceId,
      vibevoiceVoiceId: patient.vibevoiceVoiceId,
      chatterboxVoiceId: patient.chatterboxVoiceId,
      externalPatientId: patient.externalPatientId,
      welcomeMessage: patient.welcomeMessage,
      difficulty: patient.difficulty,
      estimatedDuration: patient.estimatedDuration,
      therapeuticJourney: JSON.stringify(patient.therapeuticJourney),
      isActive: true,
      gender: patient.gender,
      diagnosis: patient.diagnosis,
      psychologicalProfile: patient.psychologicalProfile,
      currentMedications:
        patient.currentMedications.length > 0
          ? JSON.stringify(patient.currentMedications)
          : null,
      previousSessions: extractPreviousSessions(details),
    };
  });

  await db.insert(patients).values(rows);

  console.log(`[INFO] Pazienti virtuali pronti (${rows.length} totali)`);
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
