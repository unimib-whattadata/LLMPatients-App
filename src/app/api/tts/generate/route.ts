import { NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

/**
 * Voice mapping for different patients
 * Maps patient names to ElevenLabs Italian voice IDs
 */
const PATIENT_VOICE_MAP: Record<string, string> = {
  // Todd - Male Italian voice, anxious tone
  "todd": "pNInz6obpgDQGcFmaJgB", // Matteo - Italian male
  // John - Male Italian voice, mature and reflective
  "john": "TX3LPVmP7r2b3yJ8", // Luca - Italian male
  // Juanita - Female Italian voice, emotional range
  "juanita": "21m00Tcm4TlvDq8ikWAM",
};

// Default voice if patient not found
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella - expressive fallback voice

// Emotion-based voice settings for expressiveness
const EMOTION_VOICE_SETTINGS: Record<string, { stability: number; style: number }> = {
  "base": { stability: 0.7, style: 0.3 },      // Neutral, calm
  "joy": { stability: 0.4, style: 0.8 },       // Expressive, high tone
  "sadness": { stability: 0.6, style: 0.4 },   // Low, reflective
  "anger": { stability: 0.3, style: 0.9 },     // Intense, variable
  "surprise": { stability: 0.5, style: 0.7 },  // Dynamic
  "anticipation": { stability: 0.5, style: 0.6 }, // Curious
  "disgust": { stability: 0.4, style: 0.5 },   // Subdued
  "trust": { stability: 0.8, style: 0.4 },     // Calm, reliable
};

/**
 * GET handler for TTS generation
 * Generates speech from text using ElevenLabs API
 * 
 * Query parameters:
 * - text: The text to convert to speech
 * - patientName: The patient name (optional, for voice selection)
 * 
 * @param request - The incoming request
 * @returns Audio stream or error response
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get("text");
    const patientName = searchParams.get("patientName");

    // Validate input
    if (!text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return NextResponse.json(
        { error: "TTS service not configured - please check API key" },
        { status: 401 }
      );
    }

    // Select voice based on patient
    const normalizedPatientName = patientName?.toLowerCase().replace(/\s+/g, "-") || "";
    const voiceId = PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_VOICE_ID;

    // Determine emotion and apply settings
    const emotion = searchParams.get("emotion") || "base";
    const emotionSettings = EMOTION_VOICE_SETTINGS[emotion as keyof typeof EMOTION_VOICE_SETTINGS] || { stability: 0.5, style: 0.5 };

    console.log(`🎙️ [TTS] Generating speech for patient: ${patientName || "unknown"}, voice: ${voiceId}`);

    // Call ElevenLabs API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    
    const ttsRequestBody = {
      text,
      model_id: "eleven_multilingual_v2",
      language_code: "it",
      voice_settings: {
        stability: emotionSettings.stability,
        similarity_boost: 0.75,
        style: emotionSettings.style,
      },
    };

    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(ttsRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
      
      // Parse error response to check for specific error types
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {};
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        // Check if it's a quota exceeded error (ElevenLabs returns 401 for quota exceeded)
        if (errorData.detail?.status === "quota_exceeded") {
          return NextResponse.json(
            { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
            { status: 402 }
          );
        }
        return NextResponse.json(
          { error: "TTS service not configured - please check API key" },
          { status: 401 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: "TTS rate limit exceeded - please try again later" },
          { status: 429 }
        );
      } else if (response.status === 402) {
        return NextResponse.json(
          { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
          { status: 402 }
        );
      }
      
      return NextResponse.json(
        { error: `TTS generation failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();

    console.log(`✅ [TTS] Successfully generated ${audioBuffer.byteLength} bytes of audio`);

    // Return audio stream
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("❌ [TTS] Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for TTS generation
 * Alternative method for TTS generation with request body
 * 
 * Request body:
 * - text: The text to convert to speech
 * - patientName: The patient name (optional, for voice selection)
 * 
 * @param request - The incoming request
 * @returns Audio stream or error response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text: string; patientName?: string; emotion?: string };
    const { text, patientName } = body;

    // Validate input
    if (!text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return NextResponse.json(
        { error: "TTS service not configured - please check API key" },
        { status: 401 }
      );
    }

    // Select voice based on patient
    const normalizedPatientName = patientName?.toLowerCase().replace(/\s+/g, "-") || "";
    const voiceId = PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_VOICE_ID;

    // Determine emotion and apply settings
    const emotion = body.emotion || "base";
    const emotionSettings = EMOTION_VOICE_SETTINGS[emotion as keyof typeof EMOTION_VOICE_SETTINGS] || { stability: 0.5, style: 0.5 };

    console.log(`🎙️ [TTS] Generating speech for patient: ${patientName || "unknown"}, voice: ${voiceId}`);

    // Call ElevenLabs API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    
    const postRequestBody = {
      text,
      model_id: "eleven_flash_v2_5",
      language_code: "it",
      apply_text_normalization: "auto", 
      voice_settings: {
        stability: emotionSettings.stability,
        similarity_boost: 0.75,
        style: emotionSettings.style,
      },
    };

    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(postRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
      
      // Parse error response to check for specific error types
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {};
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        // Check if it's a quota exceeded error (ElevenLabs returns 401 for quota exceeded)
        if (errorData.detail?.status === "quota_exceeded") {
          return NextResponse.json(
            { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
            { status: 402 }
          );
        }
        return NextResponse.json(
          { error: "TTS service not configured - please check API key" },
          { status: 401 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: "TTS rate limit exceeded - please try again later" },
          { status: 429 }
        );
      } else if (response.status === 402) {
        return NextResponse.json(
          { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
          { status: 402 }
        );
      }
      
      return NextResponse.json(
        { error: `TTS generation failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();

    console.log(`✅ [TTS] Successfully generated ${audioBuffer.byteLength} bytes of audio`);

    // Return audio stream
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("❌ [TTS] Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

