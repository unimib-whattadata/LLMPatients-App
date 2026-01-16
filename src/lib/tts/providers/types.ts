/**
 * TTS Provider Types
 * 
 * Common interfaces and types for TTS providers
 */

export type TTSProviderName = "none" | "elevenlabs" | "vibevoice" | "chatterbox";

export interface TTSParams {
  text: string;
  patientName?: string;
  // Provider-agnostic override for voice; when not provided,
  // provider-specific IDs from the patient record are used.
  voiceId?: string;
  emotion?: string;
  // Provider-specific patient voice identifiers (preferred over generic voiceId)
  elevenlabsVoiceId?: string;
  vibevoiceVoiceId?: string;
}

export interface TTSProvider {
  /**
   * Name of the provider
   */
  name: TTSProviderName;

  type: "local" | "remote";

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
  location: "local" | "remote";
  isAvailable: boolean;
  reason?: string;
}

