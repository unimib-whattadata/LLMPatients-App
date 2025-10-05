#!/usr/bin/env tsx


import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { asc, eq, and } from "drizzle-orm";
import { patients } from "../src/server/db/tables";

async function checkDatabaseConnection() {
  console.log("🔍 Production Database Check");
  console.log("==========================");
  
  
  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  
  console.log("📊 Environment Check:");
  console.log(`DATABASE_URL: ${databaseUrl ? "SET" : "NOT_SET"}`);
  console.log(`DATABASE_AUTH_TOKEN: ${authToken ? "SET" : "NOT_SET"}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set!");
    process.exit(1);
  }
  
  try {
    console.log("\n🔌 Testing Database Connection...");
    
    const client = createClient({
      url: databaseUrl,
      authToken: authToken,
    });
    
    const db = drizzle(client, { schema: { patients } });
    
    
    console.log("Testing basic connection...");
    const startTime = Date.now();
    
    
    const result = await db.query.patients.findMany({
      limit: 1,
    });
    
    const endTime = Date.now();
    const connectionTime = endTime - startTime;
    
    console.log(`✅ Database connection successful!`);
    console.log(`⏱️  Connection time: ${connectionTime}ms`);
    console.log(`📊 Found ${result.length} patient(s) in database`);
    
    
    console.log("\n🧪 Testing Specific Query...");
    
    const specificQuery = await db.query.patients.findMany({
      where: and(
        eq(patients.isActive, true)
      ),
      orderBy: [
        asc(patients.difficulty),
        asc(patients.name)
      ],
      limit: 20,
    });
    
    console.log(`✅ Specific query successful!`);
    console.log(`📊 Found ${specificQuery.length} active patient(s)`);
    
    
    console.log("\n📋 Testing Table Schema...");
    
    
    const schemaTest = await db.query.patients.findFirst({
      columns: {
        id: true,
        name: true,
        smallDescription: true,
        details: true,
        background: true,
        objectives: true,
        avatarUrl: true,
        avatarType: true,
        difficulty: true,
        estimatedDuration: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    console.log("✅ Table schema is correct!");
    
    if (schemaTest) {
      console.log("📄 Sample record structure:");
      console.log(JSON.stringify(schemaTest, null, 2));
    }
    
    client.close();
    console.log("\n🎉 All database checks passed!");
    
  } catch (error) {
    console.error("\n❌ Database check failed:");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : undefined);
    
    
    console.log("\n🔧 Troubleshooting Steps:");
    console.log("1. Verify DATABASE_URL is correct");
    console.log("2. Check if DATABASE_AUTH_TOKEN is valid (for Turso)");
    console.log("3. Ensure the database is accessible from your production environment");
    console.log("4. Check if the 'llmpatient_patient' table exists");
    console.log("5. Verify network connectivity to the database");
    
    process.exit(1);
  }
}


checkDatabaseConnection().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
