/**
 * TTS (Text-to-Speech) Constants and Types
 * 
 * Centralized constants and types for TTS functionality
 */

export const TTS_ERROR_CODES = {
  DISABLED: "TTS_DISABLED",
  CANCELLED: "CANCELLED",
  QUOTA_EXCEEDED: "TTS_QUOTA_EXCEEDED",
  RATE_LIMIT: "TTS_RATE_LIMIT",
  NOT_CONFIGURED: "TTS_NOT_CONFIGURED",
  GENERATION_FAILED: "TTS_GENERATION_FAILED",
} as const;

export const TTS_HTTP_STATUS = {
  DISABLED: 503,
  NOT_CONFIGURED: 401,
  QUOTA_EXCEEDED: 402,
  RATE_LIMIT: 429,
} as const;

export const TTS_ERROR_MESSAGES = {
  DISABLED: "TTS service is disabled - set ELEVENLABS_ENABLED=true to enable",
  NOT_CONFIGURED: "TTS service not configured - please check API key",
  QUOTA_EXCEEDED: "TTS quota exceeded - please check your ElevenLabs account credits",
  RATE_LIMIT: "TTS rate limit exceeded - please try again later",
  GENERATION_FAILED: "TTS generation failed",
  INTERNAL_ERROR: "Internal server error",
} as const;

export type TTSErrorCode = typeof TTS_ERROR_CODES[keyof typeof TTS_ERROR_CODES];

export type TTSStatus = "enabled" | "disabled" | "unavailable" | "unknown";

export interface TTSAvailabilityResult {
  isAvailable: boolean;
  status: TTSStatus;
  reason?: string;
}








