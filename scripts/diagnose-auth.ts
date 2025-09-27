#!/usr/bin/env node

/**
 * Authentication Diagnostics Script
 * 
 * This script helps diagnose authentication issues in production
 * by checking environment variables, database connectivity, and auth configuration.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { users } from "../src/server/db/schema";

async function diagnoseAuth() {
  console.log("🔍 Starting authentication diagnostics...\n");

  // 1. Check environment variables
  console.log("📋 Environment Variables Check:");
  const requiredEnvVars = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET", 
    "NODE_ENV"
  ];

  const missingVars: string[] = [];
  const presentVars: string[] = [];

  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.log(`❌ ${varName}: MISSING`);
    } else {
      presentVars.push(varName);
      // Don't log secret values in production
      if (varName.includes("SECRET")) {
        console.log(`✅ ${varName}: SET (${value.length} characters)`);
      } else {
        console.log(`✅ ${varName}: ${value}`);
      }
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n⚠️  Missing environment variables: ${missingVars.join(", ")}`);
    console.log("   Please set these variables in your production environment.\n");
  } else {
    console.log("\n✅ All required environment variables are set.\n");
  }

  // 2. Test database connectivity
  console.log("🗄️  Database Connectivity Check:");
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log("❌ DATABASE_URL not set");
      return;
    }

    const client = createClient({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });

    const db = drizzle(client);
    
    // Test basic connection
    const result = await db.select().from(users).limit(1);
    console.log("✅ Database connection successful");
    console.log(`   Found ${result.length} user(s) in database`);
    
    client.close();
  } catch (error) {
    console.log("❌ Database connection failed:");
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log("   Please check your DATABASE_URL and network connectivity.\n");
    return;
  }

  // 3. Check NextAuth configuration
  console.log("🔐 NextAuth Configuration Check:");
  
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!authSecret) {
    console.log("❌ No AUTH_SECRET or NEXTAUTH_SECRET found");
  } else if (authSecret.length < 32) {
    console.log(`⚠️  AUTH_SECRET is too short (${authSecret.length} characters, minimum 32)`);
  } else {
    console.log("✅ AUTH_SECRET is properly configured");
  }

  // 4. Check production-specific settings
  console.log("\n🏭 Production Settings Check:");
  
  if (process.env.NODE_ENV === "production") {
    console.log("✅ Running in production mode");
    
    // Check for HTTPS
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl && !nextAuthUrl.startsWith("https://")) {
      console.log("⚠️  NEXTAUTH_URL should use HTTPS in production");
    } else if (nextAuthUrl) {
      console.log("✅ NEXTAUTH_URL uses HTTPS");
    } else {
      console.log("⚠️  NEXTAUTH_URL not set (recommended for production)");
    }
  } else {
    console.log("ℹ️  Not in production mode (NODE_ENV != production)");
  }

  // 5. Test user authentication
  console.log("\n👤 User Authentication Test:");
  try {
    const client = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    const db = drizzle(client);

    // Check for test users
    const testUsers = await db
      .select({ email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, "admin@example.com"));

    if (testUsers.length > 0) {
      console.log("✅ Test user found in database");
      console.log(`   Email: ${testUsers[0]?.email}`);
      console.log(`   Role: ${testUsers[0]?.role}`);
    } else {
      console.log("⚠️  No test users found");
      console.log("   Run 'pnpm run db:seed' to create test users");
    }

    client.close();
  } catch (error) {
    console.log("❌ User authentication test failed:");
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("\n🏁 Diagnostics complete!");
  console.log("\nIf you're still having issues:");
  console.log("1. Check your production logs for specific error messages");
  console.log("2. Verify your database is accessible from your production environment");
  console.log("3. Ensure all environment variables are properly set");
  console.log("4. Check that your domain is properly configured with HTTPS");
}

// Run diagnostics if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseAuth().catch((error) => {
    console.error("❌ Diagnostics failed:", error);
    process.exit(1);
  });
}

export { diagnoseAuth };
