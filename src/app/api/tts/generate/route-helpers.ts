/**
 * TTS API Route Helpers
 * 
 * Shared logic for GET and POST endpoints
 */

import { env } from "~/env";
import { TTS_HTTP_STATUS, TTS_ERROR_MESSAGES } from "~/lib/tts/constants";

export const PATIENT_VOICE_MAP: Record<string, string> = {
  "john": "TX3LPVmP7r2b3yJ8",
  "juanita": "21m00Tcm4TlvDq8ikWAM",
};

export const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

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

export interface TTSRequestParams {
  text: string;
  patientName?: string;
  voiceId?: string;
  emotion?: string;
}

export interface TTSConfig {
  voiceId: string;
  emotion: string;
  emotionSettings: { stability: number; style: number };
}

/**
 * Validates TTS service availability
 */
export function validateTTSService(): { isValid: boolean; error?: { message: string; status: number } } {
  const elevenLabsEnabled = process.env.ELEVENLABS_ENABLED === "true" || env.ELEVENLABS_ENABLED === true;
  
  if (!elevenLabsEnabled) {
    console.log("🎙️ [TTS] ElevenLabs is disabled - TTS conversion skipped");
    return {
      isValid: false,
      error: {
        message: TTS_ERROR_MESSAGES.DISABLED,
        status: TTS_HTTP_STATUS.DISABLED,
      },
    };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ElevenLabs API key not configured");
    return {
      isValid: false,
      error: {
        message: TTS_ERROR_MESSAGES.NOT_CONFIGURED,
        status: TTS_HTTP_STATUS.NOT_CONFIGURED,
      },
    };
  }

  return { isValid: true };
}

/**
 * Prepares TTS configuration from request parameters
 */
export function prepareTTSConfig(params: TTSRequestParams): TTSConfig {
  // Determine voice ID
  let voiceId: string;
  if (params.voiceId) {
    voiceId = params.voiceId;
  } else {
    const normalizedPatientName = params.patientName?.toLowerCase().replace(/\s+/g, "-") || "";
    voiceId = PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_VOICE_ID;
  }

  // Determine emotion settings
  const emotion = params.emotion || "base";
  const emotionSettings =
    EMOTION_VOICE_SETTINGS[emotion] || { stability: 0.5, style: 0.5 };

  return {
    voiceId,
    emotion,
    emotionSettings,
  };
}

/**
 * Handles ElevenLabs API errors
 */
export function handleElevenLabsError(
  status: number,
  errorText: string
): { message: string; status: number } {
  let errorData;
  try {
    errorData = JSON.parse(errorText);
  } catch {
    errorData = {};
  }

  if (status === TTS_HTTP_STATUS.NOT_CONFIGURED) {
    // Check if it's a quota issue
    if (errorData.detail?.status === "quota_exceeded") {
      return {
        message: TTS_ERROR_MESSAGES.QUOTA_EXCEEDED,
        status: TTS_HTTP_STATUS.QUOTA_EXCEEDED,
      };
    }
    return {
      message: TTS_ERROR_MESSAGES.NOT_CONFIGURED,
      status: TTS_HTTP_STATUS.NOT_CONFIGURED,
    };
  }

  if (status === TTS_HTTP_STATUS.RATE_LIMIT) {
    return {
      message: TTS_ERROR_MESSAGES.RATE_LIMIT,
      status: TTS_HTTP_STATUS.RATE_LIMIT,
    };
  }

  if (status === TTS_HTTP_STATUS.QUOTA_EXCEEDED) {
    return {
      message: TTS_ERROR_MESSAGES.QUOTA_EXCEEDED,
      status: TTS_HTTP_STATUS.QUOTA_EXCEEDED,
    };
  }

  return {
    message: `${TTS_ERROR_MESSAGES.GENERATION_FAILED}: ${errorText}`,
    status,
  };
}






