#!/usr/bin/env tsx

/**
 * Test script to verify both local and remote API modes
 * This script tests the PatientResponseGenerator with different API modes
 */

import { config } from "dotenv";
import { PatientResponseGenerator } from "../src/server/services/patient-response-generator";

// Load environment variables from .env file
config();

async function testApiModes() {
  console.log("🧪 Testing API Modes...\n");

  const testInput = {
    patientInfo: {
      id: "test-patient-1",
      name: "Test Patient",
      age: 35,
      gender: "female",
      diagnosis: "anxiety",
      difficulty: "intermediate",
      psychologicalProfile: "introverted",
      background: "Software engineer with work stress",
      currentMedications: [],
      therapyGoals: ["reduce anxiety", "improve sleep"],
      previousSessions: 0,
    },
    sessionId: "test-session-1",
    stepId: "step-1",
    userMessage: "Hello, I'm feeling anxious today",
    conversationHistory: [],
  };

  // Test 1: Local API Mode (Mock)
  console.log("🤖 Testing Local API Mode (Mock)...");
  try {
    // Set environment to local mode
    process.env.API = "local";
    
    const localGenerator = new PatientResponseGenerator();
    console.log("  📤 Sending request to local API...");
    
    const startTime = Date.now();
    const localResponse = await localGenerator.generateResponse(testInput);
    const duration = Date.now() - startTime;
    
    console.log("  ✅ Local API Response:");
    console.log(`    Message: ${localResponse.message.substring(0, 100)}...`);
    console.log(`    Emotion: ${localResponse.emotion}`);
    console.log(`    Timestamp: ${localResponse.timestamp}`);
    console.log(`    Duration: ${duration}ms\n`);
  } catch (error) {
    console.log(`  ❌ Local API Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  }

  // Test 2: Remote API Mode
  console.log("🌐 Testing Remote API Mode...");
  try {
    // Set environment to remote mode
    process.env.API = "remote";
    
    const remoteGenerator = new PatientResponseGenerator();
    console.log("  📤 Sending request to remote API...");
    
    const startTime = Date.now();
    const remoteResponse = await remoteGenerator.generateResponse(testInput);
    const duration = Date.now() - startTime;
    
    console.log("  ✅ Remote API Response:");
    console.log(`    Message: ${remoteResponse.message.substring(0, 100)}...`);
    console.log(`    Emotion: ${remoteResponse.emotion}`);
    console.log(`    Timestamp: ${remoteResponse.timestamp}`);
    console.log(`    Duration: ${duration}ms\n`);
  } catch (error) {
    console.log(`  ❌ Remote API Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  }

  // Test 3: Explicit Mode Override
  console.log("🔧 Testing Explicit Mode Override...");
  try {
    // Force local mode even if env is remote
    const explicitLocalGenerator = new PatientResponseGenerator(false);
    console.log("  📤 Sending request with explicit local mode...");
    
    const startTime = Date.now();
    const explicitResponse = await explicitLocalGenerator.generateResponse(testInput);
    const duration = Date.now() - startTime;
    
    console.log("  ✅ Explicit Local Response:");
    console.log(`    Message: ${explicitResponse.message.substring(0, 100)}...`);
    console.log(`    Emotion: ${explicitResponse.emotion}`);
    console.log(`    Duration: ${duration}ms\n`);
  } catch (error) {
    console.log(`  ❌ Explicit Local Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  }

  console.log("🎉 API Mode testing completed!");
  console.log("\n📊 Test Summary:");
  console.log("✅ Local API Mode - Tested");
  console.log("✅ Remote API Mode - Tested");
  console.log("✅ Explicit Mode Override - Tested");
  
  console.log("\n📝 Configuration Notes:");
  console.log("- Set API='local' in .env for mock responses");
  console.log("- Set API='remote' in .env for real API calls");
  console.log("- You can override the mode in code: new PatientResponseGenerator(true/false)");
}

// Run the test
testApiModes().catch(console.error);
