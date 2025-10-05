#!/usr/bin/env tsx


import { execSync } from "child_process";
import { config } from "dotenv";


config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}


const isPostgres = DATABASE_URL.startsWith("postgres://") || 
                   DATABASE_URL.startsWith("postgresql://");

const databaseType = isPostgres ? "PostgreSQL" : "SQLite";

console.log(`🗄️  Detected database type: ${databaseType}`);
console.log(`📊 Database URL: ${DATABASE_URL.replace(/\/\/.*@/, "//***:***@")}`);

try {
  console.log("🔄 Generating database migrations...");
  
  
  execSync("npx drizzle-kit generate", { 
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL }
  });
  
  console.log("✅ Database migrations generated successfully!");
  
  if (isPostgres) {
    console.log("📝 PostgreSQL migration files created in ./drizzle/");
  } else {
    console.log("📝 SQLite migration files created in ./drizzle/");
  }
  
} catch (error) {
  console.error("❌ Migration generation failed:", error);
  process.exit(1);
}
