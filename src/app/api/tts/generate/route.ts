import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createLogger } from "~/lib/logger";
import { getTTSProvider } from "~/lib/tts/providers";
import { TTS_HTTP_STATUS, TTS_ERROR_MESSAGES } from "~/lib/tts/constants";
import type { TTSParams } from "~/lib/tts/providers/types";

const logger = createLogger("TTS:API");

/**
 * Common TTS generation logic using provider factory
 */
async function generateTTS(params: TTSParams): Promise<Response> {
  const provider = getTTSProvider();

  if (provider.name === "none") {
    return NextResponse.json(
      { error: TTS_ERROR_MESSAGES.DISABLED },
      { status: TTS_HTTP_STATUS.DISABLED }
    );
  }

  try {
    const audioBuffer = await provider.generateAudio(params);

    // Determine content type based on provider
    const contentType = provider.name === "vibevoice" ? "audio/wav" : "audio/mpeg";

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    logger.error("Audio generation failed", { provider: provider.name, error: error instanceof Error ? error.message : String(error) });
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStatus = (error as Error & { status?: number }).status;
    
    // Map error status to appropriate response
    if (errorStatus === 402) {
      return NextResponse.json(
        { error: TTS_ERROR_MESSAGES.QUOTA_EXCEEDED },
        { status: TTS_HTTP_STATUS.QUOTA_EXCEEDED }
      );
    }
    if (errorStatus === 429) {
      return NextResponse.json(
        { error: TTS_ERROR_MESSAGES.RATE_LIMIT },
        { status: TTS_HTTP_STATUS.RATE_LIMIT }
      );
    }
    if (errorStatus === 401) {
      return NextResponse.json(
        { error: TTS_ERROR_MESSAGES.NOT_CONFIGURED },
        { status: TTS_HTTP_STATUS.NOT_CONFIGURED }
      );
    }

    // Connection errors for VibeVoice
    if (errorMessage.includes("connection") || errorMessage.includes("timeout")) {
      return NextResponse.json(
        { error: `TTS connection error: ${errorMessage}` },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || TTS_ERROR_MESSAGES.GENERATION_FAILED },
      { status: 500 }
    );
  }
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
    logger.error("GET request failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TTSParams;

    if (!body.text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    return generateTTS(body);
  } catch (error) {
    logger.error("POST request failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

