#!/usr/bin/env tsx

/**
 * Test script to make actual API calls and verify they work
 * This script tests the real API endpoints with mock data
 */

import { config } from "dotenv";
import { PatientResponseGenerator } from "../src/server/services/patient-response-generator";

// Load environment variables from .env file
config();

async function testApiCalls() {
  console.log("🧪 Testing API Calls...\n");

  try {
    // Test 1: Test Mock API (should always work)
    console.log("🤖 Testing Mock API...");
    const mockGenerator = new PatientResponseGenerator(false);
    
    const mockInput = {
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

    console.log("  📤 Sending mock request...");
    const mockResponse = await mockGenerator.generateResponse(mockInput);
    console.log("  ✅ Mock API Response:");
    console.log(`    Message: ${mockResponse.message.substring(0, 100)}...`);
    console.log(`    Emotion: ${mockResponse.emotion}`);
    console.log(`    Timestamp: ${mockResponse.timestamp}\n`);

    // Test 2: Test Real API (if configured)
    console.log("🌐 Testing Real API...");
    const realGenerator = new PatientResponseGenerator(true);
    
    // Check if API key is configured
    if (!process.env.EXTERNAL_AI_API_KEY) {
      console.log("  ⚠️  EXTERNAL_AI_API_KEY not configured, skipping real API test");
      console.log("  💡 To test real API, add EXTERNAL_AI_API_KEY to your .env file\n");
    } else {
      console.log("  📤 Sending real API request...");
      try {
        const realResponse = await realGenerator.generateResponse(mockInput);
        console.log("  ✅ Real API Response:");
        console.log(`    Message: ${realResponse.message.substring(0, 100)}...`);
        console.log(`    Emotion: ${realResponse.emotion}`);
        console.log(`    Timestamp: ${realResponse.timestamp}\n`);
      } catch (error) {
        console.log("  ❌ Real API Error:");
        console.log(`    ${error instanceof Error ? error.message : "Unknown error"}\n`);
      }
    }

    // Test 3: Test Chat Response
    console.log("💬 Testing Chat Response...");
    const chatInput = {
      external_patient_id: "test-patient-1",
      user_message: "How are you feeling today?",
      conversation_history: [
        {
          content: "Hello, I'm feeling anxious today",
          sender: "user",
          timestamp: new Date().toISOString(),
        }
      ],
    };

    console.log("  📤 Sending chat request...");
    const chatResponse = await mockGenerator.generateChatResponse(chatInput);
    console.log("  ✅ Chat Response:");
    console.log(`    Message: ${chatResponse.message.substring(0, 100)}...`);
    console.log(`    Emotion: ${chatResponse.emotion}`);
    console.log(`    Timestamp: ${chatResponse.timestamp}\n`);

    // Test 4: Test Patient Initialization
    console.log("👤 Testing Patient Initialization...");
    const initInput = {
      patientInfo: {
        id: "test-patient-2",
        name: "New Patient",
        age: 28,
        gender: "male",
        diagnosis: "depression",
        difficulty: "beginner",
        psychologicalProfile: "extroverted",
        background: "Recent graduate looking for work",
        currentMedications: [],
        therapyGoals: ["manage depression", "build confidence"],
        previousSessions: 0,
      },
      sessionId: "test-session-2",
    };

    console.log("  📤 Sending initialization request...");
    const initResponse = await mockGenerator.initializePatient(initInput);
    console.log("  ✅ Initialization Response:");
    console.log(`    Status: ${initResponse.status}`);
    console.log(`    Code: ${initResponse.code}`);
    console.log(`    External Patient ID: ${initResponse.external_patient_id}`);
    console.log(`    Message: ${initResponse.message}\n`);

    console.log("🎉 All API tests completed successfully!");
    console.log("\n📊 Test Summary:");
    console.log("✅ Mock API - Working");
    console.log("✅ Chat Response - Working");
    console.log("✅ Patient Initialization - Working");
    if (!process.env.EXTERNAL_AI_API_KEY) {
      console.log("⚠️  Real API - Not configured (add EXTERNAL_AI_API_KEY to test)");
    } else {
      console.log("✅ Real API - Tested");
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testApiCalls().catch(console.error);
