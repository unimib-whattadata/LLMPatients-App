/**
 * TTS Provider Factory
 * 
 * Factory for creating and managing TTS providers
 */

import { env } from "~/env";
import { createLogger } from "~/lib/logger";
import type { TTSProvider, TTSProviderName, TTSProviderConfig } from "./types";

const logger = createLogger("TTS");
import { ElevenLabsProvider } from "./elevenlabs";
import { VibeVoiceProvider } from "./vibevoice";
import { ChatterboxProvider } from "./chatterbox";

/**
 * None Provider - used when TTS is disabled
 */
class NoneProvider implements TTSProvider {
  name = "none" as const;
  type = "local" as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  getVoiceId(): string {
    return "";
  }

  async generateAudio(): Promise<ArrayBuffer> {
    throw new Error("TTS is disabled");
  }
}

/**
 * Get the configured TTS provider name from environment
 */
export function getConfiguredProvider(): TTSProviderName {
  const provider = process.env.TTS_PROVIDER || env.TTS_PROVIDER || "none";

  if (provider === "none" || provider === "elevenlabs" || provider === "vibevoice" || provider === "chatterbox") {
    return provider;
  }

  logger.warn("Invalid TTS_PROVIDER configured, using none", { configured: provider });
  return "none";
}

/**
 * Create a TTS provider instance based on configuration
 */
export function createTTSProvider(): TTSProvider {
  const providerName = getConfiguredProvider();

  switch (providerName) {
    case "elevenlabs":
      return new ElevenLabsProvider();
    case "vibevoice":
      return new VibeVoiceProvider();
    case "chatterbox":
      return new ChatterboxProvider();
    case "none":
    default:
      return new NoneProvider();
  }
}

/**
 * Get the current TTS provider instance
 */
let cachedProvider: TTSProvider | null = null;
let cachedProviderName: TTSProviderName | null = null;

export function getTTSProvider(): TTSProvider {
  const currentProviderName = getConfiguredProvider();

  // Recreate provider if it changed or doesn't exist
  if (!cachedProvider || cachedProviderName !== currentProviderName) {
    cachedProvider = createTTSProvider();
    cachedProviderName = currentProviderName;
  }

  return cachedProvider;
}

/**
 * Get TTS provider configuration and availability
 */
export async function getTTSProviderConfig(): Promise<TTSProviderConfig> {
  const providerName = getConfiguredProvider();
  const provider = getTTSProvider();

  try {
    const isAvailable = await provider.isAvailable();
    return {
      provider: providerName,
      location: provider.type,
      isAvailable,
      reason: isAvailable ? undefined : "Provider is not available or not configured",
    };
  } catch (error) {
    return {
      provider: providerName,
      location: provider.type,
      isAvailable: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export provider classes for direct use if needed
export { ElevenLabsProvider, VibeVoiceProvider, ChatterboxProvider, NoneProvider };
export type { TTSProvider, TTSProviderName, TTSProviderConfig, TTSParams } from "./types";

