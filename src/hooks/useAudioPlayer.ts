
import { useState, useRef, useCallback, useEffect } from "react";

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
  playText: (text: string, patientName?: string, emotion?: string) => Promise<void>;
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

  const generateAudio = useCallback(async (text: string, patientName?: string, emotion?: string): Promise<string> => {
    
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    const controller = new AbortController();
    currentRequestRef.current = controller;

    try {
      const params = new URLSearchParams({
        text,
        ...(patientName && { patientName }),
        ...(emotion && { emotion }),
      });

      const response = await fetch(`/api/tts/generate?${params}`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        
        if (response.status === 401) {
          
          if (errorData.detail?.status === "quota_exceeded") {
            throw new Error("TTS quota exceeded - please check your ElevenLabs account credits");
          }
          throw new Error("TTS service not configured - please check API key");
        } else if (response.status === 402) {
          throw new Error("TTS quota exceeded - please check your ElevenLabs account credits");
        } else if (response.status === 429) {
          throw new Error("TTS rate limit exceeded - please try again later");
        } else if (response.status === 503) {
          throw new Error("TTS service temporarily unavailable");
        }
        
        throw new Error(errorData.error || `TTS generation failed: ${response.statusText}`);
      }

      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return audioUrl;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        
        console.log("Audio generation cancelled for new request");
        throw new Error("CANCELLED"); 
      }
      throw error;
    } finally {
      currentRequestRef.current = null;
    }
  }, []);

  const playText = useCallback(async (text: string, patientName?: string, emotion?: string) => {
    if (!text.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      setIsTTSAvailable(true);

      
      if (audioRef.current) {
        audioRef.current.pause();
        
      }

      
      

      
      const audioUrl = await generateAudio(text, patientName, emotion);
      
      
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
            console.error("Error playing audio:", playError);
            setError("Errore durante la riproduzione");
            setIsLoading(false);
          });
        }
      });

      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));

      
      audio.load();
    } catch (error) {
      
      if (error instanceof Error && error.message === "CANCELLED") {
        console.log("Audio generation was cancelled for new request");
        setIsLoading(false);
        return;
      }
      
      console.error("Error generating audio:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore nella generazione audio";
      
      
      if (errorMessage.includes("not configured") || errorMessage.includes("API key") || errorMessage.includes("quota exceeded")) {
        setIsTTSAvailable(false);
        console.warn("TTS service not available - audio generation disabled");
        setIsLoading(false);
        return;
      }
      
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
        console.error("Error playing audio:", error);
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
