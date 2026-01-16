/**
 * TTS (Text-to-Speech) Constants and Types
 */

export const TTS_ERROR_CODES = {
  DISABLED: "TTS_DISABLED",
  CANCELLED: "CANCELLED",
  QUOTA_EXCEEDED: "TTS_QUOTA_EXCEEDED",
  RATE_LIMIT: "TTS_RATE_LIMIT",
  NOT_CONFIGURED: "TTS_NOT_CONFIGURED",
  GENERATION_FAILED: "TTS_GENERATION_FAILED",
  CONNECTION_ERROR: "TTS_CONNECTION_ERROR",
} as const;

export const TTS_HTTP_STATUS = {
  DISABLED: 503,
  NOT_CONFIGURED: 401,
  QUOTA_EXCEEDED: 402,
  RATE_LIMIT: 429,
  CONNECTION_ERROR: 503,
} as const;

export const TTS_ERROR_MESSAGES = {
  DISABLED: "TTS service is disabled - set TTS_PROVIDER to 'elevenlabs' or 'vibevoice' to enable",
  NOT_CONFIGURED: "TTS service not configured - please check API key or server connection",
  QUOTA_EXCEEDED: "TTS quota exceeded - please check your account credits",
  RATE_LIMIT: "TTS rate limit exceeded - please try again later",
  GENERATION_FAILED: "TTS generation failed",
} as const;

export type TTSErrorCode = typeof TTS_ERROR_CODES[keyof typeof TTS_ERROR_CODES];
export type TTSStatus = "enabled" | "disabled" | "unavailable" | "unknown";

export interface TTSAvailabilityResult {
  isAvailable: boolean;
  status: TTSStatus;
  provider?: string;
  location?: "local" | "remote";
  reason?: string;
}








