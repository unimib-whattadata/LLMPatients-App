import { useState, useRef, useCallback, useEffect } from "react";
import { TTS_ERROR_CODES, TTS_HTTP_STATUS } from "~/lib/tts/constants";
import { isTTSDisabledError, isRealTTSError } from "~/lib/tts/utils";
import { createLogger } from "~/lib/logger";

const logger = createLogger("AudioPlayer");

export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentAudioUrl: string | null;
  currentTime: number;
  duration: number;
  error: string | null;
  isTTSAvailable: boolean;
}

export interface AudioPlayerActions {
  playText: (
    text: string,
    voiceId?: string, // deprecated, kept for backwards compatibility of external callers
    emotion?: string,
    patientName?: string,
    options?: { elevenlabsVoiceId?: string; vibevoiceVoiceId?: string },
  ) => Promise<void>;
  togglePlayPause: () => void;
  stop: () => void;
  clear: () => void;
  seek: (time: number) => void;
}

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}): AudioPlayerState & AudioPlayerActions {
  const { autoPlay = true, onPlaybackEnd, onError } = options;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isTTSAvailable, setIsTTSAvailable] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRequestRef = useRef<AbortController | null>(null);

  
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      onPlaybackEnd?.();
    };
    const handleError = () => {
      const errorMsg = "Errore durante la riproduzione audio";
      setError(errorMsg);
      setIsPlaying(false);
      setIsLoading(false);
      onError?.(errorMsg);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [onPlaybackEnd, onError]);

  const generateAudio = useCallback(async (
    text: string,
    voiceId?: string, // deprecated
    emotion?: string,
    patientName?: string,
    options?: { elevenlabsVoiceId?: string; vibevoiceVoiceId?: string },
  ): Promise<string> => {
    
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    const controller = new AbortController();
    currentRequestRef.current = controller;

    try {
      const params = new URLSearchParams({
        text,
        ...(emotion && { emotion }),
        ...(patientName && { patientName }),
        ...(options?.elevenlabsVoiceId && { elevenlabsVoiceId: options.elevenlabsVoiceId }),
        ...(options?.vibevoiceVoiceId && { vibevoiceVoiceId: options.vibevoiceVoiceId }),
      });

      const response = await fetch(`/api/tts/generate?${params}`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 503 (service disabled) silently - don't throw error
        if (response.status === TTS_HTTP_STATUS.DISABLED) {
          throw new Error(TTS_ERROR_CODES.DISABLED);
        }
        
        // Handle specific error cases
        if (response.status === TTS_HTTP_STATUS.NOT_CONFIGURED) {
          // Check if it's a quota issue
          if (errorData.detail?.status === "quota_exceeded") {
            throw new Error(TTS_ERROR_CODES.QUOTA_EXCEEDED);
          }
          throw new Error(TTS_ERROR_CODES.NOT_CONFIGURED);
        } else if (response.status === TTS_HTTP_STATUS.QUOTA_EXCEEDED) {
          throw new Error(TTS_ERROR_CODES.QUOTA_EXCEEDED);
        } else if (response.status === TTS_HTTP_STATUS.RATE_LIMIT) {
          throw new Error(TTS_ERROR_CODES.RATE_LIMIT);
        }
        
        throw new Error(errorData.error || `${TTS_ERROR_CODES.GENERATION_FAILED}: ${response.statusText}`);
      }

      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return audioUrl;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.debug("Audio generation cancelled");
        throw new Error(TTS_ERROR_CODES.CANCELLED);
      }
      
      // Re-throw TTS_DISABLED error to be handled in playText
      if (isTTSDisabledError(error)) {
        throw error;
      }
      
      throw error;
    } finally {
      currentRequestRef.current = null;
    }
  }, []);

  const playText = useCallback(async (
    text: string,
    voiceId?: string,
    emotion?: string,
    patientName?: string,
    options?: { elevenlabsVoiceId?: string; vibevoiceVoiceId?: string },
  ) => {
    if (!text.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      setIsTTSAvailable(true);

      
      if (audioRef.current) {
        audioRef.current.pause();
        
      }

      
      

      
      const audioUrl = await generateAudio(text, voiceId, emotion, patientName, options);
      
      
      setCurrentAudioUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return audioUrl;
      });
      setIsTTSAvailable(true);

      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      
      audio.addEventListener("canplaythrough", () => {
        setIsLoading(false);
        if (autoPlay) {
          audio.play().catch((playError) => {
            logger.error("Audio playback failed", playError);
            setError("Errore durante la riproduzione");
            setIsLoading(false);
          });
        }
      });

      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));

      
      audio.load();
    } catch (error) {
      // Handle cancellation silently
      if (error instanceof Error && error.message === TTS_ERROR_CODES.CANCELLED) {
        logger.debug("Audio generation cancelled by new request");
        setIsLoading(false);
        return;
      }
      
      // Handle TTS disabled case silently (no error logging)
      if (isTTSDisabledError(error)) {
        setIsTTSAvailable(false);
        setIsLoading(false);
        // Don't log error or call onError - TTS is simply disabled
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : "Errore nella generazione audio";
      
      // Handle real TTS errors (quota, rate limit, not configured)
      if (isRealTTSError(error)) {
        setIsTTSAvailable(false);
        logger.warn("TTS service unavailable, audio generation disabled");
        setIsLoading(false);
        return;
      }
      
      // Only log actual errors (not TTS disabled or real TTS errors)
      logger.error("Audio generation failed", error);
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  }, [autoPlay, generateAudio, onError]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((error) => {
        logger.error("Audio playback failed", error);
        setError("Errore durante la riproduzione");
      });
    }
  }, [isPlaying]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  const clear = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audioRef.current = null;
    }
    
    setCurrentAudioUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return null;
    });
    
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, duration));
    }
  }, [duration]);

  return {
    
    isPlaying,
    isLoading,
    currentAudioUrl,
    currentTime,
    duration,
    error,
    isTTSAvailable,
    
    playText,
    togglePlayPause,
    stop,
    clear,
    seek,
  };
}
