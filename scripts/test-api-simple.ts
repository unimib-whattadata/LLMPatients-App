#!/usr/bin/env tsx

/**
 * Simple test script to verify API configuration
 * This script tests that the environment variables are properly loaded
 */

import { config } from "dotenv";

// Load environment variables from .env file
config();

async function testApiConfiguration() {
  console.log("🧪 Testing API Configuration...\n");

  // Test 1: Check environment variables
  console.log("📋 Environment Variables:");
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL || "Not set"}`);
  console.log(`  API_BASE_URL: ${process.env.API_BASE_URL || "Not set (will use default)"}`);
  console.log(`  API_GENERATE_RESPONSE_ENDPOINT: ${process.env.API_GENERATE_RESPONSE_ENDPOINT || "Not set (will use default)"}`);
  console.log(`  API_INITIALIZE_PATIENT_ENDPOINT: ${process.env.API_INITIALIZE_PATIENT_ENDPOINT || "Not set (will use default)"}`);
  console.log(`  API_CHAT_RESPONSE_ENDPOINT: ${process.env.API_CHAT_RESPONSE_ENDPOINT || "Not set (will use default)"}`);
  console.log(`  API_TIMEOUT_GENERATE_RESPONSE: ${process.env.API_TIMEOUT_GENERATE_RESPONSE || "Not set (will use default)"}`);
  console.log(`  API_TIMEOUT_INITIALIZE_PATIENT: ${process.env.API_TIMEOUT_INITIALIZE_PATIENT || "Not set (will use default)"}`);
  console.log(`  API_TIMEOUT_CHAT_RESPONSE: ${process.env.API_TIMEOUT_CHAT_RESPONSE || "Not set (will use default)"}\n`);

  // Test 2: Test API endpoints construction
  console.log("🌐 Testing API Endpoints Construction:");
  
  const baseUrl = process.env.API_BASE_URL || "https://api.therapeutic-ai.com/v1";
  const generateEndpoint = process.env.API_GENERATE_RESPONSE_ENDPOINT || "/generate-response";
  const initializeEndpoint = process.env.API_INITIALIZE_PATIENT_ENDPOINT || "/initialise-patient";
  const chatEndpoint = process.env.API_CHAT_RESPONSE_ENDPOINT || "/chat-response";

  console.log(`  Generate Response URL: ${baseUrl}${generateEndpoint}`);
  console.log(`  Initialize Patient URL: ${baseUrl}${initializeEndpoint}`);
  console.log(`  Chat Response URL: ${baseUrl}${chatEndpoint}`);

  // Test 3: Test timeout configuration
  console.log("\n⏱️ Testing Timeout Configuration:");
  const generateTimeout = parseInt(process.env.API_TIMEOUT_GENERATE_RESPONSE || "5000");
  const initializeTimeout = parseInt(process.env.API_TIMEOUT_INITIALIZE_PATIENT || "3000");
  const chatTimeout = parseInt(process.env.API_TIMEOUT_CHAT_RESPONSE || "8000");

  console.log(`  Generate Response Timeout: ${generateTimeout}ms`);
  console.log(`  Initialize Patient Timeout: ${initializeTimeout}ms`);
  console.log(`  Chat Response Timeout: ${chatTimeout}ms`);

  // Test 4: Test API key configuration
  console.log("\n🔑 Testing API Key Configuration:");
  console.log(`  ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? "Set ✅" : "Not set ❌"}`);
  console.log(`  EXTERNAL_AI_API_KEY: ${process.env.EXTERNAL_AI_API_KEY ? "Set ✅" : "Not set ❌"}`);

  console.log("\n✅ API Configuration test completed successfully!");
  console.log("\n📝 Configuration Summary:");
  console.log(`- Base URL: ${baseUrl}`);
  console.log(`- Generate Response: ${baseUrl}${generateEndpoint}`);
  console.log(`- Initialize Patient: ${baseUrl}${initializeEndpoint}`);
  console.log(`- Chat Response: ${baseUrl}${chatEndpoint}`);
  console.log(`- Timeouts: ${generateTimeout}ms / ${initializeTimeout}ms / ${chatTimeout}ms`);
  
  console.log("\n📝 Next steps:");
  console.log("1. Update your .env file with your actual API URLs");
  console.log("2. Set EXTERNAL_AI_API_KEY if using real API mode");
  console.log("3. Test with real API calls if needed");
}

// Run the test
testApiConfiguration().catch(console.error);
