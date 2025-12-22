/**
 * TTS Configuration API Route
 * 
 * Exposes TTS provider configuration and availability status
 */

import { NextResponse } from "next/server";
import { createLogger } from "~/lib/logger";
import { getTTSProviderConfig } from "~/lib/tts/providers";

const logger = createLogger("TTS:Config");

export async function GET() {
  try {
    const config = await getTTSProviderConfig();
    return NextResponse.json(config);
  } catch (error) {
    logger.error("Error getting provider config", error);
    return NextResponse.json(
      {
        provider: "none",
        isAvailable: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

