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
import { text, integer, sqliteTableCreator } from "drizzle-orm/sqlite-core";
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

// Additional seeding functions can be added here
async function seedPosts() {
  // Example: Add sample posts if needed
  console.log("📝 Seeding sample posts...");
  // Implementation would go here
}

async function seedAdditionalData() {
  // Add any additional seeding logic here
  console.log("📊 Seeding additional data...");
  // Implementation would go here
}

// Main seeding function
async function runSeeding() {
  try {
    await seedDatabase();
    // Uncomment to seed additional data
    // await seedPosts();
    // await seedAdditionalData();
    
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
if (import.meta.url.endsWith(process.argv[1]!)) {
  void runSeeding();
}

export { seedDatabase, seedPosts, seedAdditionalData };