import path from "path";
import fs from "fs";
import { createLogger } from "~/lib/logger";
import type { TTSProviderName, TTSParams } from "./types";
import { BaseTTSAPIProvider, type VoiceSettings } from "./base-api";

export class ChatterboxProvider extends BaseTTSAPIProvider {
  name: TTSProviderName = "chatterbox";
  type = "local" as const;
  
  // Assuming default port 8001 or configured
  protected baseUrl = process.env.CHATTERBOX_API_URL || "http://127.0.0.1:8001";
  protected apiKeyHeader = "xi-api-key"; // Assuming similar auth
  protected defaultModelId = "chatterbox_turbo";

  constructor() {
    super("TTS:Chatterbox");
  }

  protected getApiKey(): string | undefined {
    return process.env.CHATTERBOX_API_KEY;
  }

  getVoiceId(patientVoiceId?: string, patientName?: string): string {
    return patientVoiceId || "default";
  }

  protected getVoiceSettings(params: TTSParams): VoiceSettings {
    return {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
    };
  }

  protected getLanguageCode(): string {
    return "en"; 
  }

  cleanup(): void {
  }
}
