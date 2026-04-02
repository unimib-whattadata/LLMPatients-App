"use client";

import type { RefObject } from "react";
import { Loader2, Send, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { AudioPlayerActions, AudioPlayerState } from "~/hooks/useAudioPlayer";

type AudioPlayerController = AudioPlayerState & AudioPlayerActions;

interface ChatComposerProps {
  isStepCompleted: boolean;
  audioPlayer: AudioPlayerController;
  showTTSWarning: boolean;
  setShowTTSWarning: (value: boolean) => void;
  isTTSEnabled: boolean | null;
  hasUserInteracted: boolean;
  onFirstAudioInteraction: () => void;
  showAudioWaveform: boolean;
  inputMessage: string;
  onInputMessageChange: (value: string) => void;
  onSendMessage: () => void | Promise<void>;
  onKeyPress: (event: React.KeyboardEvent) => void | Promise<void>;
  inputRef: RefObject<HTMLInputElement | null>;
  isTyping: boolean;
  isWaitingForResponse: boolean;
}

function ChatAudioPlayer({
  audioPlayer,
  hasUserInteracted,
  onFirstAudioInteraction,
  showAudioWaveform,
}: {
  audioPlayer: AudioPlayerController;
  hasUserInteracted: boolean;
  onFirstAudioInteraction: () => void;
  showAudioWaveform: boolean;
}) {
  if (!audioPlayer.isLoading && !audioPlayer.currentAudioUrl) {
    return null;
  }

  return (
    <div className="mb-4 bg-transparent p-4">
      <div className="flex space-x-2 sm:space-x-3">
        <div className="flex flex-1 items-center rounded-lg bg-[var(--color-surface-primary)]/50 px-3 py-2 backdrop-blur-sm">
          {audioPlayer.isLoading ? (
            <div className="flex h-20 flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary-green)]" />
              <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                Generating audio...
              </span>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!hasUserInteracted) {
                    onFirstAudioInteraction();
                  }
                  audioPlayer.togglePlayPause();
                }}
                className="h-16 w-16 flex-shrink-0 p-0 hover:bg-[var(--color-primary-green)]/10"
                aria-label={audioPlayer.isPlaying ? "Pause" : "Play"}
              >
                {audioPlayer.isPlaying ? (
                  <X className="h-6 w-6 text-[var(--color-primary-green)]" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-[var(--color-primary-green)]"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </Button>

              {audioPlayer.isPlaying && showAudioWaveform && (
                <div className="flex h-20 flex-1 items-center justify-between space-x-1 px-4">
                  {Array.from({ length: 60 }, (_, index) => {
                    const progress =
                      audioPlayer.duration > 0
                        ? audioPlayer.currentTime / audioPlayer.duration
                        : 0;
                    const barProgress = index / 60;
                    const isPast = barProgress < progress;
                    const baseHeight = 6;
                    const animatedHeight = isPast
                      ? baseHeight + Math.sin(index * 0.5) * 15
                      : baseHeight +
                        Math.sin(index * 0.3 + Date.now() * 0.002) * 20;

                    return (
                      <div
                        key={index}
                        className="w-1 rounded-full transition-all duration-200"
                        style={{
                          height: `${animatedHeight}px`,
                          background: isPast
                            ? "linear-gradient(135deg, var(--color-primary-green), var(--color-chat-bubble-patient))"
                            : "linear-gradient(135deg, var(--color-chat-bubble-patient), var(--color-primary-green))",
                          animation: !isPast
                            ? `audioWave 1.2s ease-in-out infinite ${index * 0.02}s`
                            : "none",
                          transformOrigin: "center",
                          opacity: isPast ? 0.5 : 0.8 + Math.sin(index * 0.2) * 0.2,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {(!audioPlayer.isPlaying || !showAudioWaveform) &&
                audioPlayer.currentAudioUrl && (
                  <div className="flex h-20 flex-1 items-center justify-center">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {audioPlayer.isPlaying
                        ? "Playing..."
                        : "Audio ready - Click play to listen"}
                    </span>
                  </div>
                )}
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={audioPlayer.clear}
          className="h-20 w-11 flex-shrink-0 p-0 hover:bg-[var(--color-primary-green)]/10"
          aria-label="Close audio player"
          disabled={audioPlayer.isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ChatComposer({
  isStepCompleted,
  audioPlayer,
  showTTSWarning,
  setShowTTSWarning,
  isTTSEnabled,
  hasUserInteracted,
  onFirstAudioInteraction,
  showAudioWaveform,
  inputMessage,
  onInputMessageChange,
  onSendMessage,
  onKeyPress,
  inputRef,
  isTyping,
  isWaitingForResponse,
}: ChatComposerProps) {
  if (isStepCompleted) {
    return null;
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 bg-transparent p-4 sm:p-6">
      <div className="mx-auto max-w-4xl bg-transparent">
        {!audioPlayer.isTTSAvailable && showTTSWarning && isTTSEnabled !== false && (
          <div className="mb-4">
            <div className="message message-warning">
              <div className="message-icon">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="message-content">
                <div className="message-title">Audio unavailable</div>
                <div className="message-text">
                  The text-to-speech service is currently unavailable. Patient
                  messages will be shown as text only.
                </div>
              </div>
              <Button
                onClick={() => setShowTTSWarning(false)}
                variant="ghost"
                size="icon"
                className="message-dismiss"
                aria-label="Close notice"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {!hasUserInteracted &&
          audioPlayer.isTTSAvailable &&
          isTTSEnabled !== false && (
            <div className="mb-4">
              <div className="message message-info">
                <div className="message-icon">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="message-content">
                  <div className="message-title">Automatic audio playback</div>
                  <div className="message-text">
                    Send a message or click play to enable automatic playback of
                    patient message audio.
                  </div>
                </div>
              </div>
            </div>
          )}

        <ChatAudioPlayer
          audioPlayer={audioPlayer}
          hasUserInteracted={hasUserInteracted}
          onFirstAudioInteraction={onFirstAudioInteraction}
          showAudioWaveform={showAudioWaveform}
        />

        <div className="flex space-x-2 bg-transparent sm:space-x-3">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(event) => onInputMessageChange(event.target.value)}
              onKeyPress={onKeyPress}
              placeholder="Start the conversation"
              disabled={isWaitingForResponse}
              className="h-11 flex-1 text-sm sm:text-base"
              aria-label="Message to send"
            />
          </div>
          <Button
            onClick={() => void onSendMessage()}
            disabled={!inputMessage.trim() || isWaitingForResponse}
            className="chat-send-button h-11 w-11"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
