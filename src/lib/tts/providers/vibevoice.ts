import { createLogger } from "~/lib/logger";
import type { TTSProviderName, TTSParams } from "./types";
import { getVibeVoicePreset } from "./voice-mapping";
import { BaseTTSAPIProvider, type VoiceSettings } from "./base-api";

const logger = createLogger("TTS:VibeVoice");

export class VibeVoiceProvider extends BaseTTSAPIProvider {
  name: TTSProviderName = "vibevoice";
  type = "local" as const;

  // Assuming default port 8000 for FastAPI, or configured via env
  protected baseUrl = process.env.VIBEVOICE_URL || "http://127.0.0.1:8000";
  protected apiKeyHeader = "xi-api-key";
  protected defaultModelId = "en-Carter_man";

  constructor() {
    super("TTS:VibeVoice");
  }

  protected getApiKey(): string | undefined {
    return process.env.VIBEVOICE_API_KEY;
  }

  getVoiceId(patientVoiceId?: string, patientName?: string): string {
    return getVibeVoicePreset(patientVoiceId);
  }

  protected getVoiceSettings(params: TTSParams): VoiceSettings {
    // Use defaults from the python backend or allow customization if needed
    // Python backend defaults: stability=0.5, similarity_boost=0.75, style=0.0
    return {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    };
  }

  protected getLanguageCode(): string | undefined {
    // VibeVoice backend snippet has language_code as optional.
    return undefined;
  }

  // Override isAvailable to check if the API is actually reachable if we wanted to be robust
  // but base class implementation checks if baseUrl exists.
  // We could add a health check here if there was a /health endpoint.

  cleanup(): void {
    // No bridge to stop anymore
  }
}
