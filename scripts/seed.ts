#!/usr/bin/env node

/**
 * Database seeding script for the ePatient application
 * Creates a default admin user with predefined credentials
 * 
 * Usage: npm run db:seed
 */

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { text, integer, sqliteTableCreator, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

// Load environment variables
config();

// Create table creator for this seeding script
const createTable = sqliteTableCreator((name) => `epatient_${name}`);

// Define users table schema for seeding (updated with role field)
const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  password: d.text({ length: 255 }),
  // Role field for user access control - 'admin' or 'user'
  role: d.text({ length: 20 }).default('user').notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
}));

// Virtual Patients table for seeding
const virtualPatients = createTable(
  "virtual_patient",
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
    avatarType: d.text({ length: 20 }).default('illustration').notNull(),
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

// Patient Tags table for seeding
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
    color: d.text({ length: 20 }).default('#gray').notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
);

// Patient-Tag Relations table for seeding
const patientTagRelations = createTable(
  "patient_tag_relation",
  (d) => ({
    patientId: d
      .text({ length: 255 })
      .notNull(),
    tagId: d
      .text({ length: 255 })
      .notNull(),
  }),
  (t) => [
    primaryKey({ columns: [t.patientId, t.tagId] }),
  ],
);

// Create database connection
const databaseUrl = process.env.DATABASE_URL ?? "file:./db.sqlite";
const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Default admin user credentials
    const adminEmail = "admin";
    const adminPassword = "Qwerty123!";
    const adminName = "Administrator";

    // Default user credentials
    const userEmail = "user@example.com";
    const userPassword = "Qwerty123!";
    const userName = "Test User";

    // Check if admin user already exists
    console.log("Checking for existing admin user...");
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    // Check if test user already exists
    console.log("Checking for existing test user...");
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    // Create admin user if doesn't exist
    if (existingAdmin.length === 0) {
      console.log("Creating admin user...");
      const saltRounds = 10;
      const hashedAdminPassword = await bcrypt.hash(adminPassword, saltRounds);

      const newAdmin = await db
        .insert(users)
        .values({
          name: adminName,
          email: adminEmail,
          password: hashedAdminPassword,
          role: "admin", // Set admin role
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      if (newAdmin.length > 0) {
        console.log("✅ Admin user created successfully!");
        console.log(`   ID: ${newAdmin[0]?.id}`);
        console.log(`   Name: ${newAdmin[0]?.name}`);
        console.log(`   Email: ${newAdmin[0]?.email}`);
        console.log(`   Role: ${newAdmin[0]?.role}`);
        console.log(`   Password: ${adminPassword}`);
      }
    } else {
      console.log("✅ Admin user already exists, skipping creation");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Name: ${existingAdmin[0]?.name}`);
    }

    // Create test user if doesn't exist
    if (existingUser.length === 0) {
      console.log("Creating test user...");
      const saltRounds = 10;
      const hashedUserPassword = await bcrypt.hash(userPassword, saltRounds);

      const newUser = await db
        .insert(users)
        .values({
          name: userName,
          email: userEmail,
          password: hashedUserPassword,
          role: "user", // Set user role
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      if (newUser.length > 0) {
        console.log("✅ Test user created successfully!");
        console.log(`   ID: ${newUser[0]?.id}`);
        console.log(`   Name: ${newUser[0]?.name}`);
        console.log(`   Email: ${newUser[0]?.email}`);
        console.log(`   Role: ${newUser[0]?.role}`);
        console.log(`   Password: ${userPassword}`);
      }
    } else {
      console.log("✅ Test user already exists, skipping creation");
      console.log(`   Email: ${userEmail}`);
      console.log(`   Name: ${existingUser[0]?.name}`);
    }

    console.log("");
    console.log("🚀 Database seeding completed successfully!");
    console.log("");
    console.log("You can now log in with:");
    console.log("\n--- ADMIN ACCOUNT ---");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("\n--- USER ACCOUNT ---");
    console.log(`   Email: ${userEmail}`);
    console.log(`   Password: ${userPassword}`);

  } catch (error) {
    console.error("❌ Database seeding failed:");
    console.error(error);
    process.exit(1);
  }
}

// Additional seeding functions
async function seedPatientTags() {
  console.log("🏷️ Seeding patient tags...");

  const sampleTags = [
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

  try {
    for (const tag of sampleTags) {
      const existingTag = await db
        .select()
        .from(patientTags)
        .where(eq(patientTags.label, tag.label))
        .limit(1);

      if (existingTag.length === 0) {
        await db.insert(patientTags).values(tag);
        console.log(`   ✅ Created tag: ${tag.label}`);
      } else {
        console.log(`   ⏭️ Tag already exists: ${tag.label}`);
      }
    }
    console.log("✅ Patient tags seeding completed!");
  } catch (error) {
    console.error("❌ Patient tags seeding failed:", error);
    throw error;
  }
}

async function seedVirtualPatients() {
  console.log("👥 Seeding virtual patients...");

  const samplePatients = [
    {
      name: "Juanita Delgado",
      age: 33,
      gender: "female",
      condition: "Terapia per depressione",
      background: "Juanita è una donna di 33 anni che ha recentemente attraversato un periodo difficile della sua vita. Ha perso il lavoro sei mesi fa e da allora sta lottando con sentimenti di inadeguatezza e tristezza persistente. Vive da sola e ha notato un progressivo isolamento sociale.",
      objectives: JSON.stringify([
        "Valutare il livello di depressione e rischio suicidario",
        "Stabilire una relazione terapeutica di fiducia",
        "Identificare strategie di coping efficaci"
      ]),
      avatarUrl: null,
      avatarType: "illustration",
      difficulty: "Medio",
      estimatedDuration: 45
    },
    {
      name: "Marco Rossi",
      age: 28,
      gender: "male",
      condition: "Gestione dell'ansia sociale",
      background: "Marco è un giovane sviluppatore software che ha sempre avuto difficoltà nelle situazioni sociali. Recentemente ha iniziato un nuovo lavoro dove deve presentare progetti al team, causandogli attacchi di panico. Cerca aiuto per gestire l'ansia.",
      objectives: JSON.stringify([
        "Identificare i trigger dell'ansia sociale",
        "Insegnare tecniche di rilassamento",
        "Sviluppare un piano graduale di esposizione"
      ]),
      avatarUrl: null,
      avatarType: "illustration",
      difficulty: "Facile",
      estimatedDuration: 30
    },
    {
      name: "Elena Bianchi",
      age: 45,
      gender: "female",
      condition: "Disturbo post-traumatico da stress",
      background: "Elena è sopravvissuta a un grave incidente stradale otto mesi fa. Da allora soffre di flashback, incubi ricorrenti e evita di guidare. Ha difficoltà a dormire e si sente costantemente in allerta. La famiglia è preoccupata per i suoi cambiamenti comportamentali.",
      objectives: JSON.stringify([
        "Valutare i sintomi del PTSD",
        "Stabilire la sicurezza del paziente",
        "Introdurre tecniche di grounding",
        "Pianificare un trattamento specialistico"
      ]),
      avatarUrl: null,
      avatarType: "illustration",
      difficulty: "Difficile",
      estimatedDuration: 60
    },
    {
      name: "Giuseppe Marino",
      age: 52,
      gender: "male",
      condition: "Dipendenza da alcol",
      background: "Giuseppe è un manager di mezza età che ha sviluppato una dipendenza da alcol negli ultimi tre anni. Ha iniziato a bere per gestire lo stress lavorativo, ma ora non riesce più a controllare il consumo. La moglie minaccia di lasciarlo se non cerca aiuto.",
      objectives: JSON.stringify([
        "Valutare il grado di dipendenza",
        "Identificare la motivazione al cambiamento",
        "Discutere opzioni di trattamento",
        "Coinvolgere il supporto familiare"
      ]),
      avatarUrl: null,
      avatarType: "illustration",
      difficulty: "Difficile",
      estimatedDuration: 50
    },
    {
      name: "Sofia Chen",
      age: 19,
      gender: "female",
      condition: "Disturbi alimentari",
      background: "Sofia è una studentessa universitaria al primo anno che ha sviluppato comportamenti alimentari restrittivi. È molto preoccupata per il peso e l'aspetto fisico. I genitori hanno notato una significativa perdita di peso e l'hanno convinta a cercare aiuto.",
      objectives: JSON.stringify([
        "Valutare i comportamenti alimentari attuali",
        "Identificare fattori scatenanti",
        "Stabilire obiettivi nutrizionali sicuri",
        "Coinvolgere un team multidisciplinare"
      ]),
      avatarUrl: null,
      avatarType: "illustration",
      difficulty: "Medio",
      estimatedDuration: 40
    },
    {
      name: "Roberto Ferri",
      age: 35,
      gender: "male",
      condition: "Disturbo bipolare",
      background: "Roberto ha una storia di episodi maniacali e depressivi alternati. Attualmente sta attraversando una fase depressiva dopo un periodo di ipomania durato due mesi. Ha smesso di prendere i farmaci senza consultare il medico perché si sentiva 'guarito'.",
      objectives: JSON.stringify([
        "Valutare l'episodio depressivo attuale",
        "Discutere l'importanza dell'aderenza farmacologica",
        "Identificare i segni precoci degli episodi",
        "Stabilire un piano di monitoraggio"
      ]),
      avatarUrl: null,
      avatarType: "illustration",
      difficulty: "Difficile",
      estimatedDuration: 55
    }
  ];

  try {
    for (const patient of samplePatients) {
      const existingPatient = await db
        .select()
        .from(virtualPatients)
        .where(eq(virtualPatients.name, patient.name))
        .limit(1);

      if (existingPatient.length === 0) {
        const [newPatient] = await db.insert(virtualPatients).values(patient).returning({ id: virtualPatients.id });
        console.log(`   ✅ Created patient: ${patient.name}`);

        // Add some tags to patients
        const tagAssignments = {
          "Juanita Delgado": ["Tono dell'umore basso", "Isolamento sociale"],
          "Marco Rossi": ["Ansia sociale"],
          "Elena Bianchi": ["Trauma", "Disturbi del sonno"],
          "Giuseppe Marino": ["Impulsività", "Aggressività"],
          "Sofia Chen": ["Ansia sociale", "Disturbi del sonno"],
          "Roberto Ferri": ["Tono dell'umore basso", "Impulsività"]
        };

        const assignedTags = tagAssignments[patient.name as keyof typeof tagAssignments];
        if (assignedTags && newPatient) {
          for (const tagLabel of assignedTags) {
            const tag = await db
              .select()
              .from(patientTags)
              .where(eq(patientTags.label, tagLabel))
              .limit(1);

            if (tag.length > 0) {
              await db.insert(patientTagRelations).values({
                patientId: newPatient.id,
                tagId: tag[0]!.id
              });
              console.log(`     🏷️ Added tag "${tagLabel}" to ${patient.name}`);
            }
          }
        }
      } else {
        console.log(`   ⏭️ Patient already exists: ${patient.name}`);
      }
    }
    console.log("✅ Virtual patients seeding completed!");
  } catch (error) {
    console.error("❌ Virtual patients seeding failed:", error);
    throw error;
  }
}

// Main seeding function
async function runSeeding() {
  try {
    await seedDatabase();
    await seedPatientTags();
    await seedVirtualPatients();
    
    console.log("🎉 All seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding process failed:", error);
    process.exit(1);
  } finally {
    // Close database connection
    client.close();
  }
}

// Run seeding if this file is executed directly
if (process.argv[1] && import.meta.url.includes(process.argv[1])) {
  void runSeeding();
}

export { seedDatabase, seedPatientTags, seedVirtualPatients };