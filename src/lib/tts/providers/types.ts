/**
 * TTS Provider Types
 * 
 * Common interfaces and types for TTS providers
 */

export type TTSProviderName = "none" | "elevenlabs" | "vibevoice";

export interface TTSParams {
  text: string;
  patientName?: string;
  voiceId?: string;
  emotion?: string;
}

export interface TTSProvider {
  /**
   * Name of the provider
   */
  name: TTSProviderName;

  /**
   * Check if the provider is available and configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate audio from text
   * @param params TTS parameters
   * @returns Audio buffer as ArrayBuffer
   */
  generateAudio(params: TTSParams): Promise<ArrayBuffer>;

  /**
   * Get the voice ID to use for a patient
   * @param patientVoiceId Optional voice ID from patient record
   * @returns Voice ID string for this provider
   */
  getVoiceId(patientVoiceId?: string): string;
}

export interface TTSProviderConfig {
  provider: TTSProviderName;
  isAvailable: boolean;
  reason?: string;
}

