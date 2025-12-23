/**
 * TTS Configuration API Route
 * 
 * Exposes TTS provider configuration and availability status
 */

import { NextResponse } from "next/server";
import { createLogger } from "~/lib/logger";
import { getTTSProviderConfig } from "~/lib/tts/providers";
import { auth } from "~/server/auth";

const logger = createLogger("TTS:Config");

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getTTSProviderConfig();
    return NextResponse.json(config);
  } catch (error) {
    logger.error("Failed to get provider config", error);
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
