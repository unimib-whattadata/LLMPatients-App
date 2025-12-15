/**
 * TTS Utility Functions
 * 
 * Helper functions for TTS operations
 */

import { TTS_ERROR_CODES, TTS_HTTP_STATUS, TTS_ERROR_MESSAGES, type TTSAvailabilityResult, type TTSStatus } from "./constants";

/**
 * Checks if TTS is enabled in the environment
 */
export function isTTSEnabled(): boolean {
  if (typeof window !== "undefined") {
    // Client-side: we can't directly check env vars, so we'll need to check via API
    return true; // Will be determined by API response
  }
  
  // Server-side: check environment variable
  const enabled = process.env.ELEVENLABS_ENABLED === "true";
  return enabled;
}

/**
 * Determines TTS status from HTTP response status
 */
export function getTTSStatusFromHTTPStatus(status: number): TTSStatus {
  switch (status) {
    case TTS_HTTP_STATUS.DISABLED:
      return "disabled";
    case TTS_HTTP_STATUS.NOT_CONFIGURED:
      return "unavailable";
    case TTS_HTTP_STATUS.QUOTA_EXCEEDED:
      return "unavailable";
    case TTS_HTTP_STATUS.RATE_LIMIT:
      return "unavailable";
    default:
      return status >= 200 && status < 300 ? "enabled" : "unknown";
  }
}

/**
 * Gets user-friendly error message from error code
 */
export function getTTSErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case TTS_ERROR_CODES.DISABLED:
      return TTS_ERROR_MESSAGES.DISABLED;
    case TTS_ERROR_CODES.NOT_CONFIGURED:
      return TTS_ERROR_MESSAGES.NOT_CONFIGURED;
    case TTS_ERROR_CODES.QUOTA_EXCEEDED:
      return TTS_ERROR_MESSAGES.QUOTA_EXCEEDED;
    case TTS_ERROR_CODES.RATE_LIMIT:
      return TTS_ERROR_MESSAGES.RATE_LIMIT;
    default:
      return TTS_ERROR_MESSAGES.GENERATION_FAILED;
  }
}

/**
 * Checks if an error indicates TTS is disabled (not an actual error)
 */
export function isTTSDisabledError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message === TTS_ERROR_CODES.DISABLED;
  }
  return false;
}

/**
 * Checks if an error indicates a real TTS problem (not just disabled)
 */
export function isRealTTSError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      !isTTSDisabledError(error) &&
      (message.includes("quota") ||
        message.includes("rate limit") ||
        message.includes("not configured") ||
        message.includes("api key"))
    );
  }
  return false;
}

/**
 * Checks TTS availability via API
 */
export async function checkTTSAvailability(): Promise<TTSAvailabilityResult> {
  try {
    const response = await fetch("/api/tts/generate?text=test");
    
    if (response.ok) {
      return {
        isAvailable: true,
        status: "enabled",
      };
    }
    
    const status = response.status;
    const statusType = getTTSStatusFromHTTPStatus(status);
    
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = {};
    }
    
    return {
      isAvailable: false,
      status: statusType,
      reason: errorData.error || `HTTP ${status}`,
    };
  } catch (error) {
    return {
      isAvailable: false,
      status: "unknown",
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

