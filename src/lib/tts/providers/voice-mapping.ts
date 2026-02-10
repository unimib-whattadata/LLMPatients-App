/**
 * Voice Mapping Configuration
 * 
 * Maps ElevenLabs voice IDs to VibeVoice voice presets
 * and provides emotion voice settings for ElevenLabs
 */

/**
 * Emotion-based voice settings for ElevenLabs
 * Adjusts stability and style based on the emotion
 */
export const EMOTION_VOICE_SETTINGS: Record<string, { stability: number; style: number }> = {
  base: { stability: 0.7, style: 0.3 },
  SEEKING: { stability: 0.5, style: 0.6 },
  RAGE: { stability: 0.3, style: 0.9 },
  FEAR: { stability: 0.4, style: 0.7 },
  CARE: { stability: 0.8, style: 0.4 },
  LUST: { stability: 0.4, style: 0.8 },
  SADNESS: { stability: 0.6, style: 0.4 },
  PLAY: { stability: 0.4, style: 0.8 },
};

/**
 * Patient name to ElevenLabs voice ID mapping
 */
export const PATIENT_VOICE_MAP: Record<string, string> = {
  "john": "TX3LPVmP7r2b3yJ8",
  "juanita": "21m00Tcm4TlvDq8ikWAM",
};

/**
 * Default ElevenLabs voice ID
 */
export const DEFAULT_ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

/**
 * Maps ElevenLabs voice IDs to VibeVoice voice preset names
 * 
 * VibeVoice voice presets are located in services/VibeVoice/demo/voices/streaming_model/
 * Format: {language}-{name}_{gender}.pt
 */
export const ELEVENLABS_TO_VIBEVOICE_MAP: Record<string, string> = {
  // Juanita - female Italian voice
  "21m00Tcm4TlvDq8ikWAM": "it-Spk0_woman",
  // Alex/Josh - male voice
  "TxGEqnHWrfWFTfGW9XjX": "it-Spk1_man",
  // Legacy male id kept for backward compatibility.
  "TX3LPVmP7r2b3yJ8": "it-Spk1_man",
  // Default ElevenLabs voice -> default Italian female
  "EXAVITQu4vr4xnSDxMaL": "it-Spk0_woman",
};

/**
 * Default VibeVoice voice preset
 */
export const DEFAULT_VIBEVOICE_VOICE = "it-Spk0_woman";

/**
 * Backward-compatible aliases previously used in patient YAML files.
 */
const LEGACY_VIBEVOICE_ALIASES: Record<string, string> = {
  Luna: "it-Spk0_woman",
  Alex: "it-Spk1_man",
};

/**
 * Native VibeVoice preset id pattern (examples: it-Spk1_man, en-Carter_man).
 */
const VIBEVOICE_PRESET_ID_PATTERN = /^[a-z]{2}-[A-Za-z0-9]+_(man|woman)$/;

/**
 * Resolve the VibeVoice preset from:
 * 1) explicit VibeVoice preset IDs,
 * 2) legacy aliases,
 * 3) legacy ElevenLabs->VibeVoice mapping fallback.
 * 
 * @param voiceId Voice hint from patient record or request
 * @returns VibeVoice voice preset name
 */
export function getVibeVoicePreset(voiceId?: string): string {
  if (!voiceId) {
    return DEFAULT_VIBEVOICE_VOICE;
  }

  if (VIBEVOICE_PRESET_ID_PATTERN.test(voiceId)) {
    return voiceId;
  }

  const legacyPreset = LEGACY_VIBEVOICE_ALIASES[voiceId];
  if (legacyPreset) {
    return legacyPreset;
  }

  return ELEVENLABS_TO_VIBEVOICE_MAP[voiceId] || DEFAULT_VIBEVOICE_VOICE;
}

/**
 * Get ElevenLabs voice ID for a patient
 */
export function getElevenLabsVoiceId(patientVoiceId?: string, patientName?: string): string {
  // If voiceId is provided, use it
  if (patientVoiceId) {
    return patientVoiceId;
  }

  // Otherwise, try to map from patient name
  const normalizedPatientName = patientName?.toLowerCase().replace(/\s+/g, "-") || "";
  return PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_ELEVENLABS_VOICE_ID;
}

const DEFAULT_EMOTION_SETTINGS = { stability: 0.7, style: 0.3 };

/**
 * Get emotion settings for ElevenLabs voice
 */
export function getEmotionSettings(emotion?: string): { stability: number; style: number } {
  if (!emotion) return DEFAULT_EMOTION_SETTINGS;
  return EMOTION_VOICE_SETTINGS[emotion] ?? DEFAULT_EMOTION_SETTINGS;
}
