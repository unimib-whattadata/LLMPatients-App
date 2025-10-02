import { NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

/**
 * Voice mapping for different patients
 * Maps patient names to ElevenLabs voice IDs
 */
const PATIENT_VOICE_MAP: Record<string, string> = {
  // Todd - Male voice, anxious tone
  "todd": "onwK4e9ZLuTAKqWW03F9", // Daniel - conversational British
  // John - Male voice, mature and reflective
  "john": "TxGEqnHWrfWFTfGW9XjX", // Josh - American male
  // Juanita Delgado - Female voice, emotional range
  "juanita-delgado": "EXAVITQu4vr4xnSDxMaL", // Bella - expressive American female
  "juanita": "EXAVITQu4vr4xnSDxMaL", // Bella - expressive American female
};

// Default voice if patient not found
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - calm neutral voice

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
    const apiKey = env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return NextResponse.json(
        { error: "TTS service not configured" },
        { status: 503 }
      );
    }

    // Select voice based on patient
    const normalizedPatientName = patientName?.toLowerCase().replace(/\s+/g, "-") || "";
    const voiceId = PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_VOICE_ID;

    console.log(`🎙️ [TTS] Generating speech for patient: ${patientName || "unknown"}, voice: ${voiceId}`);

    // Call ElevenLabs API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", // Support for Italian
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
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
    const body = await request.json() as { text: string; patientName?: string };
    const { text, patientName } = body;

    // Validate input
    if (!text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return NextResponse.json(
        { error: "TTS service not configured" },
        { status: 503 }
      );
    }

    // Select voice based on patient
    const normalizedPatientName = patientName?.toLowerCase().replace(/\s+/g, "-") || "";
    const voiceId = PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_VOICE_ID;

    console.log(`🎙️ [TTS] Generating speech for patient: ${patientName || "unknown"}, voice: ${voiceId}`);

    // Call ElevenLabs API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", // Support for Italian
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
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

