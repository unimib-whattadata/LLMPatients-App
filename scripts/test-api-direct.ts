#!/usr/bin/env tsx

/**
 * Direct API test script that makes HTTP calls to the configured endpoints
 * This script tests the actual API endpoints without importing complex modules
 */

import { config } from "dotenv";

// Load environment variables from .env file
config();

// Disable SSL certificate verification for testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

async function testDirectApiCalls() {
  console.log("🧪 Testing Direct API Calls...\n");

  const baseUrl = process.env.API_BASE_URL || "https://api.therapeutic-ai.com/v1";
  const generateEndpoint = process.env.API_GENERATE_RESPONSE_ENDPOINT || "/generate-response";
  const initializeEndpoint = process.env.API_INITIALIZE_PATIENT_ENDPOINT || "/initialise-patient";
  const chatEndpoint = process.env.API_CHAT_RESPONSE_ENDPOINT || "/chat-response";

  console.log("📋 API Configuration:");
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Generate Response: ${baseUrl}${generateEndpoint}`);
  console.log(`  Initialize Patient: ${baseUrl}${initializeEndpoint}`);
  console.log(`  Chat Response: ${baseUrl}${chatEndpoint}\n`);

  // Test 1: Test Generate Response endpoint
  console.log("🔄 Testing Generate Response endpoint...");
  try {
    const generateUrl = `${baseUrl}${generateEndpoint}`;
    console.log(`  📤 POST ${generateUrl}`);
    
    const generatePayload = {
      session_id: "test-session-1",
      user_input: "Hello, I'm feeling anxious today",
    };

    const generateResponse = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Version": "1.0",
      },
      body: JSON.stringify(generatePayload),
    });

    console.log(`  📊 Status: ${generateResponse.status} ${generateResponse.statusText}`);
    
    if (generateResponse.ok) {
      const data = await generateResponse.json();
      console.log("  ✅ Generate Response Success:");
      console.log(`    Message: ${data.response?.message?.substring(0, 100) || "No message"}...`);
      console.log(`    Emotion: ${data.response?.emotion || "No emotion"}`);
    } else {
      const errorText = await generateResponse.text();
      console.log(`  ❌ Generate Response Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`  ❌ Generate Response Exception: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  console.log();

  // Test 2: Test Initialize Patient endpoint
  console.log("👤 Testing Initialize Patient endpoint...");
  try {
    const initUrl = `${baseUrl}${initializeEndpoint}`;
    console.log(`  📤 POST ${initUrl}`);
    
    const initPayload = {
      id: "test-patient-2",
      name: "New Patient",
      age: 28,
      gender: "male",
      diagnosis: "depression",
      difficulty: "beginner",
      psychological_profile: "extroverted",
      background: "Recent graduate looking for work",
      current_medications: [],
      therapy_goals: ["manage depression", "build confidence"],
      previous_sessions: 0,
      session_id: "test-session-2",
    };

    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Version": "1.0",
      },
      body: JSON.stringify(initPayload),
    });

    console.log(`  📊 Status: ${initResponse.status} ${initResponse.statusText}`);
    
    if (initResponse.ok) {
      const data = await initResponse.json();
      console.log("  ✅ Initialize Patient Success:");
      console.log(`    Status: ${data.status || "No status"}`);
      console.log(`    Code: ${data.code || "No code"}`);
      console.log(`    External Patient ID: ${data.external_patient_id || "No ID"}`);
    } else {
      const errorText = await initResponse.text();
      console.log(`  ❌ Initialize Patient Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`  ❌ Initialize Patient Exception: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  console.log();

  // Test 3: Test Chat Response endpoint
  console.log("💬 Testing Chat Response endpoint...");
  try {
    const chatUrl = `${baseUrl}${chatEndpoint}`;
    console.log(`  📤 POST ${chatUrl}`);
    
    const chatPayload = {
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

    const chatResponse = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Version": "1.0",
      },
      body: JSON.stringify(chatPayload),
    });

    console.log(`  📊 Status: ${chatResponse.status} ${chatResponse.statusText}`);
    
    if (chatResponse.ok) {
      const data = await chatResponse.json();
      console.log("  ✅ Chat Response Success:");
      console.log(`    Message: ${data.message?.substring(0, 100) || "No message"}...`);
      console.log(`    Emotion: ${data.emotion || "No emotion"}`);
    } else {
      const errorText = await chatResponse.text();
      console.log(`  ❌ Chat Response Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`  ❌ Chat Response Exception: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  console.log("\n🎉 Direct API testing completed!");
  console.log("\n📝 Note: These tests make actual HTTP calls to your configured API endpoints.");
  console.log("If you see connection errors, check that your API server is running and accessible.");
}

// Run the test
testDirectApiCalls().catch(console.error);
