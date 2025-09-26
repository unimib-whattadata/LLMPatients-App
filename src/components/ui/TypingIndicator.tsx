/**
 * Typing Indicator Component
 * 
 * Animated typing indicator with bouncing dots to show when someone is typing
 */

"use client";

import React from "react";

interface TypingIndicatorProps {
  /** Whether to show the typing indicator */
  isVisible?: boolean;
  /** Custom class name for styling */
  className?: string;
  /** Custom style for the container */
  style?: React.CSSProperties;
  /** Size of the dots */
  dotSize?: number;
}

/**
 * TypingIndicator Component
 * 
 * Shows animated bouncing dots to indicate typing activity.
 * Perfect for chat interfaces where you need to show when someone is typing.
 * 
 * @param isVisible - Whether to show the typing indicator
 * @param className - Custom class name for styling
 * @param style - Custom style for the container
 * @param dotSize - Size of the dots in pixels
 */
export function TypingIndicator({ 
  isVisible = true, 
  className = "",
  style,
  dotSize = 8
}: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div 
      className={`flex items-center space-x-1 ${className}`}
      style={style}
    >
      <div className="flex space-x-1">
        <div
          className="rounded-full animate-bounce typing-dot"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
          }}
        />
        <div
          className="rounded-full animate-bounce typing-dot typing-dot--delay-1"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
          }}
        />
        <div
          className="rounded-full animate-bounce typing-dot typing-dot--delay-2"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Chat Typing Indicator
 * 
 * Specialized typing indicator for chat messages with patient avatar
 */
interface ChatTypingIndicatorProps {
  /** Whether to show the typing indicator */
  isVisible?: boolean;
  /** Patient avatar URL */
  avatarUrl?: string;
  /** Patient name for alt text */
  patientName?: string;
  /** Patient avatar initials and background color */
  avatarData?: {
    initials: string;
    backgroundColor: string;
  };
  /** Custom class name */
  className?: string;
}

export function ChatTypingIndicator({
  isVisible = true,
  avatarUrl,
  patientName = "Patient",
  avatarData,
  className = ""
}: ChatTypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className={`flex justify-start ${className}`}>
      <div className="flex max-w-2xl space-x-3 flex-row">
        {/* Patient Avatar */}
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Avatar di ${patientName}`}
              className="rounded-full object-cover chat-avatar-fixed-size"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold"
            >
              {avatarData?.initials || "P"}
            </div>
          )}
        </div>
        
        {/* Typing bubble */}
        <div
          className="rounded-lg px-4 py-3"
        >
          <TypingIndicator 
            dotSize={6}
          />
        </div>
      </div>
    </div>
  );
}
