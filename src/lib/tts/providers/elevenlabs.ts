/**
 * ElevenLabs TTS Provider
 * 
 * Implementation of TTSProvider for ElevenLabs API
 */

import { env } from "~/env";
import type { TTSProvider, TTSParams } from "./types";
import { getElevenLabsVoiceId, getEmotionSettings } from "./voice-mapping";

export class ElevenLabsProvider implements TTSProvider {
  name = "elevenlabs" as const;

  /**
   * Check if ElevenLabs is available and configured
   */
  async isAvailable(): Promise<boolean> {
    const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
    return !!apiKey;
  }

  /**
   * Get the voice ID to use for a patient
   */
  getVoiceId(patientVoiceId?: string, patientName?: string): string {
    return getElevenLabsVoiceId(patientVoiceId, patientName);
  }

  /**
   * Generate audio from text using ElevenLabs API
   */
  async generateAudio(params: TTSParams): Promise<ArrayBuffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    // Determine voice ID
    const voiceId = params.voiceId || this.getVoiceId(undefined, params.patientName);

    // Determine emotion settings
    const emotionSettings = getEmotionSettings(params.emotion);

    // Use flash model for better performance
    const modelId = "eleven_flash_v2_5";

    console.log(`🎙️ [TTS] ElevenLabs generating speech for: ${params.patientName || "unknown"}`);

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const ttsRequestBody = {
      text: params.text,
      model_id: modelId,
      language_code: "it",
      apply_text_normalization: "auto",
      voice_settings: {
        stability: emotionSettings.stability,
        similarity_boost: 0.75,
        style: emotionSettings.style,
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
      
      // Re-throw with status code for error handling
      const error = new Error(`ElevenLabs API error: ${response.status}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`✅ [TTS] Successfully generated ${audioBuffer.byteLength} bytes of audio with ElevenLabs`);

    return audioBuffer;
  }
}

