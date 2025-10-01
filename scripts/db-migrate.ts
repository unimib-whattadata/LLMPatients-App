#!/usr/bin/env tsx

/**
 * Database Migration Script
 * 
 * This script handles migrations for both SQLite and PostgreSQL databases.
 * It automatically detects the database type based on DATABASE_URL and runs
 * the appropriate migrations.
 */

import { execSync } from "child_process";
import { config } from "dotenv";

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Determine database type
const isPostgres = DATABASE_URL.startsWith("postgres://") || 
                   DATABASE_URL.startsWith("postgresql://");

const databaseType = isPostgres ? "PostgreSQL" : "SQLite";

console.log(`🗄️  Detected database type: ${databaseType}`);
console.log(`📊 Database URL: ${DATABASE_URL.replace(/\/\/.*@/, "//***:***@")}`);

try {
  console.log("🔄 Running database migrations...");
  
  // Run drizzle-kit migrate
  execSync("npx drizzle-kit migrate", { 
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL }
  });
  
  console.log("✅ Database migrations completed successfully!");
  
  if (isPostgres) {
    console.log("📝 PostgreSQL database is ready for production use");
  } else {
    console.log("📝 SQLite database is ready for development use");
  }
  
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
}
