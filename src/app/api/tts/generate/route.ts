import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  validateTTSService,
  prepareTTSConfig,
  handleElevenLabsError,
  type TTSRequestParams,
} from "./route-helpers";
import { env } from "~/env";

/**
 * Common TTS generation logic
 */
async function generateTTS(params: TTSRequestParams, modelId: string = "eleven_multilingual_v2"): Promise<Response> {
  // Validate service availability
  const validation = validateTTSService();
  if (!validation.isValid && validation.error) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: validation.error.status }
    );
  }

  // Prepare TTS configuration
  const config = prepareTTSConfig(params);
  const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY!;

  console.log(`🎙️ [TTS] Generating speech for patient: ${params.patientName || "unknown"}, voice: ${config.voiceId}`);

  // Call ElevenLabs API
  const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`;
  const ttsRequestBody = {
    text: params.text,
    model_id: modelId,
    language_code: "it",
    ...(modelId === "eleven_flash_v2_5" && { apply_text_normalization: "auto" }),
    voice_settings: {
      stability: config.emotionSettings.stability,
      similarity_boost: 0.75,
      style: config.emotionSettings.style,
    },
  };

  const response = await fetch(elevenLabsUrl, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify(ttsRequestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
    
    const error = handleElevenLabsError(response.status, errorText);
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // Return audio buffer
  const audioBuffer = await response.arrayBuffer();
  console.log(`✅ [TTS] Successfully generated ${audioBuffer.byteLength} bytes of audio`);

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get("text");
    const patientName = searchParams.get("patientName");
    const voiceId = searchParams.get("voiceId");
    const emotion = searchParams.get("emotion");

    if (!text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    return generateTTS({
      text,
      patientName: patientName || undefined,
      voiceId: voiceId || undefined,
      emotion: emotion || undefined,
    });
  } catch (error) {
    console.error("❌ [TTS] Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TTSRequestParams;

    if (!body.text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    return generateTTS(body, "eleven_flash_v2_5");
  } catch (error) {
    console.error("❌ [TTS] Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

