import { createLogger } from "~/lib/logger";
import type { TTSProvider, TTSParams, TTSProviderName } from "./types";
import { env } from "~/env";

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface TTSAPIRequest {
  text: string;
  model_id?: string;
  language_code?: string;
  voice_settings?: VoiceSettings;
}

export abstract class BaseTTSAPIProvider implements TTSProvider {
  abstract name: TTSProviderName;
  abstract type: "local" | "remote";
  
  protected abstract baseUrl: string;
  protected abstract apiKeyHeader: string;
  protected abstract getApiKey(): string | undefined;
  
  // Default model ID if not specified
  protected abstract defaultModelId: string;

  protected logger: ReturnType<typeof createLogger>;

  constructor(loggerName: string) {
    this.logger = createLogger(loggerName);
  }

  async isAvailable(): Promise<boolean> {
    const key = this.getApiKey();
    // For local services, we might not strictly need a key, or we might check a health endpoint.
    // For now, simple key check or base URL existence.
    return !!this.baseUrl && (this.type === "local" || !!key);
  }

  abstract getVoiceId(patientVoiceId?: string, patientName?: string): string;

  protected abstract getVoiceSettings(params: TTSParams): VoiceSettings;

  async generateAudio(params: TTSParams): Promise<ArrayBuffer> {
    const apiKey = this.getApiKey();
    if (this.type === "remote" && !apiKey) {
      throw new Error(`${this.name} API key not configured`);
    }

    const voiceId = this.getVoiceId(
        this.name === "elevenlabs" ? params.elevenlabsVoiceId : 
        this.name === "vibevoice" ? params.vibevoiceVoiceId : 
        this.name === "chatterbox" ? params.chatterboxVoiceId : params.voiceId,
        params.patientName
    );

    const voiceSettings = this.getVoiceSettings(params);
    
    // Construct URL
    const url = `${this.baseUrl}/v1/text-to-speech/${voiceId}`;
    
    const body: TTSAPIRequest = {
      text: params.text,
      model_id: this.defaultModelId,
      language_code: this.getLanguageCode(),
      voice_settings: voiceSettings,
    };

    this.logger.info(`Generating speech with ${this.name}`, { 
      voiceId, 
      model: body.model_id,
      url 
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    };

    if (apiKey) {
      headers[this.apiKeyHeader] = apiKey;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error("API request failed", { status: response.status, error: errorText.substring(0, 200) });
        throw new Error(`${this.name} API error: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      this.logger.info("Audio generated successfully", { bytes: buffer.byteLength });
      return buffer;
    } catch (error) {
      this.logger.error("Generation failed", error);
      throw error;
    }
  }

  protected getLanguageCode(): string | undefined {
    return "en"; // Default, override in subclasses
  }
}
