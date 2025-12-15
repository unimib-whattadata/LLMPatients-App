/**
 * Hook for managing TTS (Text-to-Speech) status
 * 
 * Provides state and utilities for checking TTS availability
 */

import { useState, useEffect, useCallback } from "react";
import { checkTTSAvailability, type TTSAvailabilityResult } from "~/lib/tts/utils";

export interface UseTTSStatusReturn {
  isTTSEnabled: boolean | null;
  ttsStatus: TTSAvailabilityResult | null;
  isLoading: boolean;
  checkStatus: () => Promise<void>;
}

/**
 * Hook to check and manage TTS status
 * 
 * @param autoCheck - Whether to automatically check TTS status on mount (default: true)
 * @returns TTS status information and check function
 */
export function useTTSStatus(autoCheck: boolean = true): UseTTSStatusReturn {
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean | null>(null);
  const [ttsStatus, setTtsStatus] = useState<TTSAvailabilityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await checkTTSAvailability();
      setTtsStatus(result);
      setIsTTSEnabled(result.isAvailable);
    } catch (error) {
      setTtsStatus({
        isAvailable: false,
        status: "unknown",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
      setIsTTSEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheck && isTTSEnabled === null) {
      void checkStatus();
    }
  }, [autoCheck, isTTSEnabled, checkStatus]);

  return {
    isTTSEnabled,
    ttsStatus,
    isLoading,
    checkStatus,
  };
}

