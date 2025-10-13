#!/usr/bin/env tsx

/**
 * Test script to verify API configuration
 * This script tests that the environment variables are properly loaded
 * and that the API configuration is working correctly
 */

import { config } from "dotenv";
import { env } from "../src/env";

// Load environment variables from .env file
config();
import { PatientResponseGenerator } from "../src/server/services/patient-response-generator";

async function testApiConfiguration() {
  console.log("🧪 Testing API Configuration...\n");

  // Test 1: Check environment variables
  console.log("📋 Environment Variables:");
  console.log(`  API_BASE_URL: ${env.API_BASE_URL || "Not set (using default)"}`);
  console.log(`  API_GENERATE_RESPONSE_ENDPOINT: ${env.API_GENERATE_RESPONSE_ENDPOINT || "Not set (using default)"}`);
  console.log(`  API_INITIALIZE_PATIENT_ENDPOINT: ${env.API_INITIALIZE_PATIENT_ENDPOINT || "Not set (using default)"}`);
  console.log(`  API_CHAT_RESPONSE_ENDPOINT: ${env.API_CHAT_RESPONSE_ENDPOINT || "Not set (using default)"}`);
  console.log(`  API_TIMEOUT_GENERATE_RESPONSE: ${env.API_TIMEOUT_GENERATE_RESPONSE || "Not set (using default)"}`);
  console.log(`  API_TIMEOUT_INITIALIZE_PATIENT: ${env.API_TIMEOUT_INITIALIZE_PATIENT || "Not set (using default)"}`);
  console.log(`  API_TIMEOUT_CHAT_RESPONSE: ${env.API_TIMEOUT_CHAT_RESPONSE || "Not set (using default)"}\n`);

  // Test 2: Test PatientResponseGenerator instantiation
  console.log("🔧 Testing PatientResponseGenerator instantiation...");
  try {
    const generator = new PatientResponseGenerator(false); // Use mock mode for testing
    console.log("✅ PatientResponseGenerator created successfully (Mock mode)");
    
    const generatorReal = new PatientResponseGenerator(true); // Use real mode for testing
    console.log("✅ PatientResponseGenerator created successfully (Real mode)");
  } catch (error) {
    console.error("❌ Failed to create PatientResponseGenerator:", error);
    return;
  }

  // Test 3: Test API endpoints construction
  console.log("\n🌐 Testing API Endpoints Construction:");
  
  const baseUrl = env.API_BASE_URL || "https://api.therapeutic-ai.com/v1";
  const generateEndpoint = env.API_GENERATE_RESPONSE_ENDPOINT || "/generate-response";
  const initializeEndpoint = env.API_INITIALIZE_PATIENT_ENDPOINT || "/initialise-patient";
  const chatEndpoint = env.API_CHAT_RESPONSE_ENDPOINT || "/chat-response";

  console.log(`  Generate Response URL: ${baseUrl}${generateEndpoint}`);
  console.log(`  Initialize Patient URL: ${baseUrl}${initializeEndpoint}`);
  console.log(`  Chat Response URL: ${baseUrl}${chatEndpoint}`);

  // Test 4: Test timeout configuration
  console.log("\n⏱️ Testing Timeout Configuration:");
  const generateTimeout = parseInt(env.API_TIMEOUT_GENERATE_RESPONSE || "5000");
  const initializeTimeout = parseInt(env.API_TIMEOUT_INITIALIZE_PATIENT || "3000");
  const chatTimeout = parseInt(env.API_TIMEOUT_CHAT_RESPONSE || "8000");

  console.log(`  Generate Response Timeout: ${generateTimeout}ms`);
  console.log(`  Initialize Patient Timeout: ${initializeTimeout}ms`);
  console.log(`  Chat Response Timeout: ${chatTimeout}ms`);

  console.log("\n✅ API Configuration test completed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Create a .env file in the project root");
  console.log("2. Add your API URLs to the .env file");
  console.log("3. Set EXTERNAL_AI_API_KEY if using real API mode");
  console.log("4. Test with real API calls if needed");
}

// Run the test
testApiConfiguration().catch(console.error);
