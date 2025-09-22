#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { text, integer, sqliteTableCreator, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { config } from "dotenv";
import { DIFFICULTY_LEVELS } from "../src/lib/constants/difficulty";

config();

const createTable = sqliteTableCreator((name) => `epatient_${name}`);

const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  password: d.text({ length: 255 }),
  role: d.text({ length: 20 }).default("user").notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
}));

const patients = createTable(
  "patient",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.text({ length: 255 }).notNull(),
    description: d.text({ length: 500 }).notNull(), // Brief description of the case
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
  }),
);

const patientTags = createTable(
  "patient_tag",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    label: d.text({ length: 100 }).notNull(),
    category: d.text({ length: 50 }).notNull(),
    color: d.text({ length: 20 }).default("#gray").notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
);

const patientTagRelations = createTable(
  "patient_tag_relation",
  (d) => ({
    patientId: d.text({ length: 255 }).notNull(),
    tagId: d.text({ length: 255 }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.patientId, t.tagId] })],
);

const databaseUrl = process.env.DATABASE_URL ?? "file:./db.sqlite";
const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

const SALT_ROUNDS = 10;

const SEED_USERS = [
  {
    name: "Administrator",
    email: "admin",
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

const TAGS = [
  { label: "Tono dell'umore basso", category: "psychological", color: "#8B5CF6" },
  { label: "Impulsività", category: "behavioral", color: "#F59E0B" },
  { label: "Ansia sociale", category: "psychological", color: "#8B5CF6" },
  { label: "Dolore cronico", category: "physical", color: "#3B82F6" },
  { label: "Disturbi del sonno", category: "physical", color: "#3B82F6" },
  { label: "Aggressività", category: "behavioral", color: "#F59E0B" },
  { label: "Depressione", category: "psychological", color: "#8B5CF6" },
  { label: "Ipertensione", category: "physical", color: "#3B82F6" },
  { label: "Isolamento sociale", category: "behavioral", color: "#F59E0B" },
  { label: "Trauma", category: "psychological", color: "#8B5CF6" },
  { label: "Disturbi alimentari", category: "behavioral", color: "#F59E0B" },
  { label: "Problemi relazionali", category: "psychological", color: "#8B5CF6" },
];

type PatientSeed = {
  name: string;
  description: string;
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
  tags?: string[];
};

const PATIENTS: PatientSeed[] = [
  {
    name: "Juanita Delgado",
    description: "Depressione",
    details: {
      demographic_sociocultural_information: {
        age: "33",
        gender: "female",
      },
      psychological_profile_and_cognitive_functioning: {
        current_and_past_psychiatric_diagnoses: "Terapia per depressione",
      },
    },
    background:
      "Juanita è una donna di 33 anni che ha recentemente attraversato un periodo difficile della sua vita. Ha perso il lavoro sei mesi fa e da allora sta lottando con sentimenti di inadeguatezza e tristezza persistente. Vive da sola e ha notato un progressivo isolamento sociale.",
    objectives: [
      "Valutare il livello di depressione e rischio suicidario",
      "Stabilire una relazione terapeutica di fiducia",
      "Identificare strategie di coping efficaci",
    ],
    avatarUrl: "/images/patients/juanita.png",
    avatarType: "photo",
    difficulty: DIFFICULTY_LEVELS.MEDIO,
    estimatedDuration: 45,
    tags: ["Tono dell'umore basso", "Isolamento sociale"],
  },
  {
    name: "John",
    description: "Disturbo dell'adattamento e disturbi alimentari",
    details: {
      demographic_sociocultural_information: {
        age: "58",
        gender: "male",
      },
      psychological_profile_and_cognitive_functioning: {
        current_and_past_psychiatric_diagnoses: "Adjustment Disorder with Depressed Mood; Binge Eating Disorder; Substance/Medication-Induced Sexual Dysfunction",
      },
    },
    background:
      "John è un uomo di 58 anni che sta attraversando un periodo di stress significativo. Ha recentemente subito una riduzione delle ore lavorative che ha causato difficoltà finanziarie. Sta lottando con depressione, binge eating e disfunzione sessuale legata ai farmaci antidepressivi. Il suo matrimonio è sotto stress a causa di questi problemi.",
    objectives: [
      "Gestire i sintomi depressivi e l'ansia",
      "Sviluppare strategie di coping più sane per sostituire il binge eating",
      "Affrontare le difficoltà relazionali e sessuali nel matrimonio",
      "Valutare e gestire gli effetti collaterali dei farmaci",
    ],
    avatarUrl: null,
    avatarType: "illustration",
    difficulty: DIFFICULTY_LEVELS.DIFFICILE,
    estimatedDuration: 60,
    tags: ["Depressione", "Disturbi alimentari", "Problemi relazionali"],
  },
];

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

async function seedPatientTags() {
  const existingTags = await db
    .select({ label: patientTags.label })
    .from(patientTags);

  const knownLabels = new Set(existingTags.map((tag) => tag.label));
  let created = 0;

  for (const tag of TAGS) {
    if (knownLabels.has(tag.label)) {
      continue;
    }

    await db.insert(patientTags).values(tag);
    knownLabels.add(tag.label);
    created += 1;
  }

  console.log(`🏷️  Tag paziente pronti (${created} nuovi, ${knownLabels.size} totali)`);
}

async function seedPatients() {
  const existingPatients = await db
    .select({ name: patients.name })
    .from(patients);

  const existingNames = new Set(existingPatients.map((patient) => patient.name));
  const tagRows = await db
    .select({ id: patientTags.id, label: patientTags.label })
    .from(patientTags);
  const tagIdByLabel = new Map(tagRows.map((tag) => [tag.label, tag.id] as const));

  let created = 0;

  for (const patient of PATIENTS) {
    if (existingNames.has(patient.name)) {
      continue;
    }

    const result = await db
      .insert(patients)
      .values({
        name: patient.name,
        description: patient.description,
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

    for (const label of patient.tags ?? []) {
      const tagId = tagIdByLabel.get(label);
      if (!tagId) {
        continue;
      }

      await db.insert(patientTagRelations).values({ patientId, tagId });
    }
  }

  console.log(`[INFO] Pazienti virtuali pronti (${created} nuovi)`);
}

async function runSeeding() {
  try {
    await seedDatabase();
    await seedPatientTags();
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

export { seedDatabase, seedPatientTags };
