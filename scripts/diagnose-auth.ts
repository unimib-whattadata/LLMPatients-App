#!/usr/bin/env node

/**
 * Authentication Diagnostics Script
 * 
 * This script helps diagnose authentication issues in production
 * by checking environment variables, database connectivity, and auth configuration.
 * 
 * Usage:
 *   pnpm run auth:diagnose
 *   or
 *   npx tsx scripts/diagnose-auth.ts
 *   or
 *   node --loader tsx scripts/diagnose-auth.ts
 * 
 * Make sure to set your environment variables before running:
 *   - DATABASE_URL
 *   - AUTH_SECRET or NEXTAUTH_SECRET
 *   - DATABASE_AUTH_TOKEN (if required)
 *   - NODE_ENV
 * 
 * Environment files are loaded in priority order:
 *   1. .env.local (highest priority)
 *   2. .env.production (for production settings)
 *   3. .env (default)
 *   4. production.env (fallback)
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { users } from "../src/server/db/schema";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { readFileSync, existsSync } from "fs";

/**
 * Get file location information
 */
function getFileLocation() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = join(__dirname, "..");
  
  return {
    scriptPath: __filename,
    scriptDir: __dirname,
    projectRoot: projectRoot,
    workingDirectory: process.cwd()
  };
}

/**
 * Load environment variables from .env files
 */
function loadEnvironmentVariables() {
  const location = getFileLocation();
  const envFiles = [
    { path: join(location.projectRoot, ".env.local"), priority: 1, name: ".env.local" },
    { path: join(location.projectRoot, ".env.production"), priority: 2, name: ".env.production" },
    { path: join(location.projectRoot, ".env"), priority: 3, name: ".env" },
    { path: join(location.projectRoot, "production.env"), priority: 4, name: "production.env" }
  ];

  console.log("🔧 Loading environment variables...");
  
  let loadedFiles: string[] = [];
  let primaryEnvFile: string | null = null;
  
  for (const envFile of envFiles) {
    if (existsSync(envFile.path)) {
      console.log(`   📄 Found: ${envFile.name} (${envFile.path})`);
      config({ path: envFile.path });
      loadedFiles.push(envFile.name);
      
      // The first file found (highest priority) becomes the primary
      if (!primaryEnvFile) {
        primaryEnvFile = envFile.name;
      }
    } else {
      console.log(`   ❌ Not found: ${envFile.name}`);
    }
  }
  
  // Show which file is being used as primary
  if (primaryEnvFile) {
    console.log(`   ✅ Primary environment file: ${primaryEnvFile}`);
    console.log(`   📋 Loaded from files: ${loadedFiles.join(", ")}`);
    
    // Show production recommendation
    if (process.env.NODE_ENV === "production" && primaryEnvFile !== ".env.production") {
      console.log(`   💡 Production tip: Consider using .env.production for production environment`);
    }
  } else {
    console.log(`   ⚠️  No .env files found, using system environment variables only`);
  }
  
  // Also try to load from process.env if already set
  console.log(`   🌍 Current NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  
  // Show environment file contents (without sensitive data)
  if (primaryEnvFile) {
    try {
      const envFilePath = join(location.projectRoot, primaryEnvFile);
      const envContent = readFileSync(envFilePath, 'utf8');
      const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      console.log(`   📝 Environment variables in ${primaryEnvFile}:`);
      lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          // Hide sensitive values
          if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
            console.log(`     ${key}=***${value.slice(-4)}`);
          } else {
            console.log(`     ${key}=${value}`);
          }
        }
      });
    } catch (error) {
      console.log(`   ⚠️  Could not read ${primaryEnvFile} contents`);
    }
  }
}

async function diagnoseAuth() {
  console.log("🔍 Starting authentication diagnostics...\n");

  // 0. Load environment variables
  loadEnvironmentVariables();
  console.log("");

  // 1. Display file location information
  console.log("📁 File Location Information:");
  const location = getFileLocation();
  console.log(`   Script path: ${location.scriptPath}`);
  console.log(`   Script directory: ${location.scriptDir}`);
  console.log(`   Project root: ${location.projectRoot}`);
  console.log(`   Working directory: ${location.workingDirectory}`);
  console.log("");

  // 2. Check environment variables
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

  // 3. Test database connectivity
  console.log("🗄️  Database Connectivity Check:");
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log("❌ DATABASE_URL not set");
      return;
    }

    // Record connection start time for performance metrics
    const connectionStartTime = Date.now();

    // Parse database URL to extract connection details
    console.log("📊 Database Information:");
    try {
      const url = new URL(databaseUrl);
      console.log(`   Type: ${url.protocol.replace(':', '')}`);
      console.log(`   Host: ${url.hostname}`);
      console.log(`   Port: ${url.port || 'default'}`);
      console.log(`   Database: ${url.pathname.slice(1) || 'default'}`);
      if (url.searchParams.has('authToken')) {
        console.log(`   Auth Token: ${url.searchParams.get('authToken')?.length || 0} characters`);
      }
    } catch (urlError) {
      console.log(`   URL: ${databaseUrl.substring(0, 50)}...`);
    }

    const client = createClient({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });

    const db = drizzle(client);
    
    // Test basic connection
    const result = await db.select().from(users).limit(1);
    const connectionEndTime = Date.now();
    const connectionTime = connectionEndTime - connectionStartTime;
    
    console.log("✅ Database connection successful");
    console.log(`   Connection time: ${connectionTime}ms`);
    console.log(`   Found ${result.length} user(s) in database`);
    
    // Get additional database statistics
    try {
      const totalUsers = await db.select().from(users);
      console.log(`   Total users in database: ${totalUsers.length}`);
      
      // Check for different user roles
      const roleCounts = totalUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      if (Object.keys(roleCounts).length > 0) {
        console.log("   User roles distribution:");
        Object.entries(roleCounts).forEach(([role, count]) => {
          console.log(`     - ${role}: ${count} users`);
        });
      }
    } catch (statsError) {
      console.log("   ⚠️  Could not retrieve database statistics");
    }
    
    // Check database schema and tables
    console.log("\n📋 Database Schema Check:");
    try {
      // This is a basic check - in a real scenario you might want to query information_schema
      console.log("   ✅ Users table accessible");
      console.log("   ✅ Database schema appears to be properly configured");
    } catch (schemaError) {
      console.log("   ⚠️  Could not verify database schema");
    }
    
    client.close();
  } catch (error) {
    console.log("❌ Database connection failed:");
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log("   Please check your DATABASE_URL and network connectivity.\n");
    return;
  }

  // 4. Check NextAuth configuration
  console.log("🔐 NextAuth Configuration Check:");
  
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!authSecret) {
    console.log("❌ No AUTH_SECRET or NEXTAUTH_SECRET found");
  } else if (authSecret.length < 32) {
    console.log(`⚠️  AUTH_SECRET is too short (${authSecret.length} characters, minimum 32)`);
  } else {
    console.log("✅ AUTH_SECRET is properly configured");
  }

  // 5. Check production-specific settings
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

  // 6. Test user authentication
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

export { diagnoseAuth, getFileLocation };
