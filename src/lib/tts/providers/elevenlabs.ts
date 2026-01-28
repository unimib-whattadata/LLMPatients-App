import { env } from "~/env";
import type { TTSProviderName, TTSParams } from "./types";
import { getElevenLabsVoiceId, getEmotionSettings } from "./voice-mapping";
import { BaseTTSAPIProvider, type VoiceSettings } from "./base-api";

export class ElevenLabsProvider extends BaseTTSAPIProvider {
  name: TTSProviderName = "elevenlabs";
  type = "remote" as const;
  
  protected baseUrl = "https://api.elevenlabs.io";
  protected apiKeyHeader = "xi-api-key";
  protected defaultModelId = "eleven_flash_v2_5";

  constructor() {
    super("TTS:ElevenLabs");
  }

  protected getApiKey(): string | undefined {
    return process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
  }

  getVoiceId(patientVoiceId?: string, patientName?: string): string {
    return getElevenLabsVoiceId(patientVoiceId, patientName);
  }

  protected getVoiceSettings(params: TTSParams): VoiceSettings {
    const emotionSettings = getEmotionSettings(params.emotion);
    return {
      stability: emotionSettings.stability,
      similarity_boost: 0.75,
      style: emotionSettings.style,
    };
  }

  protected getLanguageCode(): string {
    return "it";
  }
}
