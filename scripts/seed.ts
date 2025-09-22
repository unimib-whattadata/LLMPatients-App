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
    age: d.integer({ mode: "number" }).notNull(),
    gender: d.text({ length: 20 }).notNull(),
    condition: d.text({ length: 500 }).notNull(),
    background: d.text({ length: 2000 }).notNull(),
    objectives: d.text({ length: 2000 }).notNull(),
    avatarUrl: d.text({ length: 500 }),
    avatarType: d.text({ length: 20 }).default("illustration").notNull(),
    difficulty: d.text({ length: 20 }).notNull(),
    estimatedDuration: d.integer({ mode: "number" }).default(30).notNull(),
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
];

type PatientSeed = {
  name: string;
  age: number;
  gender: string;
  condition: string;
  background: string;
  objectives: string[];
  avatarUrl: string | null;
  avatarType: string;
  difficulty: string;
  estimatedDuration: number;
  tags?: string[];
};

const PATIENTS: PatientSeed[] = [
  {
    name: "Juanita Delgado",
    age: 33,
    gender: "female",
    condition: "Terapia per depressione",
    background:
      "Juanita è una donna di 33 anni che ha recentemente attraversato un periodo difficile della sua vita. Ha perso il lavoro sei mesi fa e da allora sta lottando con sentimenti di inadeguatezza e tristezza persistente. Vive da sola e ha notato un progressivo isolamento sociale.",
    objectives: [
      "Valutare il livello di depressione e rischio suicidario",
      "Stabilire una relazione terapeutica di fiducia",
      "Identificare strategie di coping efficaci",
    ],
    avatarUrl: "/images/patients/juanita.png",
    avatarType: "photo",
    difficulty: "Medio",
    estimatedDuration: 45,
    tags: ["Tono dell'umore basso", "Isolamento sociale"],
  },
  {
    name: "Marco Rossi",
    age: 28,
    gender: "male",
    condition: "Gestione dell'ansia sociale",
    background:
      "Marco è un giovane sviluppatore software che ha sempre avuto difficoltà nelle situazioni sociali. Recentemente ha iniziato un nuovo lavoro dove deve presentare progetti al team, causandogli attacchi di panico. Cerca aiuto per gestire l'ansia.",
    objectives: [
      "Identificare i trigger dell'ansia sociale",
      "Insegnare tecniche di rilassamento",
      "Sviluppare un piano graduale di esposizione",
    ],
    avatarUrl: null,
    avatarType: "illustration",
    difficulty: "Facile",
    estimatedDuration: 30,
    tags: ["Ansia sociale"],
  },
  {
    name: "Elena Bianchi",
    age: 45,
    gender: "female",
    condition: "Disturbo post-traumatico da stress",
    background:
      "Elena è sopravvissuta a un grave incidente stradale otto mesi fa. Da allora soffre di flashback, incubi ricorrenti e evita di guidare. Ha difficoltà a dormire e si sente costantemente in allerta. La famiglia è preoccupata per i suoi cambiamenti comportamentali.",
    objectives: [
      "Valutare i sintomi del PTSD",
      "Stabilire la sicurezza del paziente",
      "Introdurre tecniche di grounding",
      "Pianificare un trattamento specialistico",
    ],
    avatarUrl: null,
    avatarType: "illustration",
    difficulty: "Difficile",
    estimatedDuration: 60,
    tags: ["Trauma", "Disturbi del sonno"],
  },
  {
    name: "Giuseppe Marino",
    age: 52,
    gender: "male",
    condition: "Dipendenza da alcol",
    background:
      "Giuseppe è un manager di mezza età che ha sviluppato una dipendenza da alcol negli ultimi tre anni. Ha iniziato a bere per gestire lo stress lavorativo, ma ora non riesce più a controllare il consumo. La moglie minaccia di lasciarlo se non cerca aiuto.",
    objectives: [
      "Valutare il grado di dipendenza",
      "Identificare la motivazione al cambiamento",
      "Discutere opzioni di trattamento",
      "Coinvolgere il supporto familiare",
    ],
    avatarUrl: null,
    avatarType: "illustration",
    difficulty: "Difficile",
    estimatedDuration: 50,
    tags: ["Impulsività", "Aggressività"],
  },
  {
    name: "Sofia Chen",
    age: 19,
    gender: "female",
    condition: "Disturbi alimentari",
    background:
      "Sofia è una studentessa universitaria al primo anno che ha sviluppato comportamenti alimentari restrittivi. È molto preoccupata per il peso e l'aspetto fisico. I genitori hanno notato una significativa perdita di peso e l'hanno convinta a cercare aiuto.",
    objectives: [
      "Valutare i comportamenti alimentari attuali",
      "Identificare fattori scatenanti",
      "Stabilire obiettivi nutrizionali sicuri",
      "Coinvolgere un team multidisciplinare",
    ],
    avatarUrl: null,
    avatarType: "illustration",
    difficulty: "Medio",
    estimatedDuration: 40,
    tags: ["Ansia sociale", "Disturbi del sonno"],
  },
  {
    name: "Roberto Ferri",
    age: 35,
    gender: "male",
    condition: "Disturbo bipolare",
    background:
      "Roberto ha una storia di episodi maniacali e depressivi alternati. Attualmente sta attraversando una fase depressiva dopo un periodo di ipomania durato due mesi. Ha smesso di prendere i farmaci senza consultare il medico perché si sentiva 'guarito'.",
    objectives: [
      "Valutare l'episodio depressivo attuale",
      "Discutere l'importanza dell'aderenza farmacologica",
      "Identificare i segni precoci degli episodi",
      "Stabilire un piano di monitoraggio",
    ],
    avatarUrl: null,
    avatarType: "illustration",
    difficulty: "Difficile",
    estimatedDuration: 55,
    tags: ["Tono dell'umore basso", "Impulsività"],
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
        age: patient.age,
        gender: patient.gender,
        condition: patient.condition,
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
