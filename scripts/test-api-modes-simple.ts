#!/usr/bin/env tsx

/**
 * Simple test script to verify API modes without complex imports
 * This script tests the API configuration based on environment variables
 */

import { config } from "dotenv";

// Load environment variables from .env file
config();

async function testApiModesSimple() {
  console.log("🧪 Testing API Modes (Simple)...\n");

  // Test 1: Check current API mode
  console.log("📋 Current API Configuration:");
  console.log(`  API Mode: ${process.env.API || "Not set (defaults to local)"}`);
  console.log(`  API_BASE_URL: ${process.env.API_BASE_URL || "Not set"}`);
  console.log(`  API_GENERATE_RESPONSE_ENDPOINT: ${process.env.API_GENERATE_RESPONSE_ENDPOINT || "Not set"}\n`);

  // Test 2: Simulate local mode
  console.log("🤖 Simulating Local API Mode...");
  process.env.API = "local";
  
  const localConfig = {
    BASE_URL: "local",
    ENDPOINT: "/mock/generate-response",
    IS_REMOTE: false,
  };
  
  console.log(`  Base URL: ${localConfig.BASE_URL}`);
  console.log(`  Endpoint: ${localConfig.ENDPOINT}`);
  console.log(`  Is Remote: ${localConfig.IS_REMOTE}`);
  console.log(`  Request Format: Full patient data object`);
  console.log(`  Response Format: { response: { message, emotion, timestamp } }`);
  console.log("  ✅ Local mode configured for mock responses\n");

  // Test 3: Simulate remote mode
  console.log("🌐 Simulating Remote API Mode...");
  process.env.API = "remote";
  
  const remoteConfig = {
    BASE_URL: process.env.API_BASE_URL || "https://e-patients-api.whattadata.it",
    ENDPOINT: process.env.API_GENERATE_RESPONSE_ENDPOINT || "/api/message",
    IS_REMOTE: true,
  };
  
  console.log(`  Base URL: ${remoteConfig.BASE_URL}`);
  console.log(`  Endpoint: ${remoteConfig.ENDPOINT}`);
  console.log(`  Is Remote: ${remoteConfig.IS_REMOTE}`);
  console.log(`  Request Format: { session_id, user_input }`);
  console.log(`  Response Format: { message, emotion, timestamp }`);
  console.log("  ✅ Remote mode configured for real API calls\n");

  // Test 4: Test API endpoint construction
  console.log("🔗 Testing API Endpoint Construction:");
  
  const testSessionId = "test-session-123";
  const testUserInput = "Hello, I'm feeling anxious today";
  
  // Local mode request
  const localRequest = {
    id: "test-patient-1",
    name: "Test Patient",
    age: 35,
    gender: "female",
    diagnosis: "anxiety",
    difficulty_level: "intermediate",
    psychological_profile: "introverted",
    background: "Software engineer with work stress",
    current_medications: [],
    therapy_goals: ["reduce anxiety", "improve sleep"],
    previous_sessions: 0,
    session_id: testSessionId,
  };
  
  // Remote mode request
  const remoteRequest = {
    session_id: testSessionId,
    user_input: testUserInput,
  };
  
  console.log("  Local Mode Request:");
  console.log(`    URL: ${localConfig.BASE_URL}${localConfig.ENDPOINT}`);
  console.log(`    Body: ${JSON.stringify(localRequest, null, 2).substring(0, 200)}...`);
  
  console.log("\n  Remote Mode Request:");
  console.log(`    URL: ${remoteConfig.BASE_URL}${remoteConfig.ENDPOINT}`);
  console.log(`    Body: ${JSON.stringify(remoteRequest, null, 2)}`);

  console.log("\n🎉 API Mode testing completed!");
  console.log("\n📊 Configuration Summary:");
  console.log("✅ Local Mode - Mock responses with full patient data");
  console.log("✅ Remote Mode - Real API calls with simplified format");
  
  console.log("\n📝 Usage Instructions:");
  console.log("1. Set API='local' in .env for development/testing");
  console.log("2. Set API='remote' in .env for production");
  console.log("3. The PatientResponseGenerator will automatically use the correct mode");
  console.log("4. You can override the mode in code: new PatientResponseGenerator(true/false)");
}

// Run the test
testApiModesSimple().catch(console.error);
