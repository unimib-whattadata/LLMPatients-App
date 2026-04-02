"use client";

import Image from "next/image";
import { Maximize2 } from "lucide-react";

import { Button } from "~/components/ui/button";

import {
  AVATAR_TRANSITION_DURATION_MS,
  EMOTION_COLORS,
  EMOTION_LABELS,
  type PatientEmotion,
} from "./chat-constants";
import { getPatientAvatarPath } from "./chat-utils";

interface ChatPatientSidebarProps {
  hasPatientAvatar: boolean;
  patientAvatarColorClass: string;
  patientAvatarInitials: string;
  selectedPatientAvatarUrl: string | null;
  currentEmotion: PatientEmotion;
  nextEmotion: PatientEmotion | null;
  isAvatarTransitioning: boolean;
  effectivePatientName: string;
  extractedText: string | null;
  onExpandAvatar: () => void;
}

export function ChatPatientSidebar({
  hasPatientAvatar,
  patientAvatarColorClass,
  patientAvatarInitials,
  selectedPatientAvatarUrl,
  currentEmotion,
  nextEmotion,
  isAvatarTransitioning,
  effectivePatientName,
  extractedText,
  onExpandAvatar,
}: ChatPatientSidebarProps) {
  const displayedEmotion = nextEmotion ?? currentEmotion;

  return (
    <div className="page-background hidden w-64 flex-shrink-0 flex-col items-center justify-start p-4 lg:flex">
      <div className="flex w-full flex-col items-center space-y-3 pt-4">
        <div
          className="relative rounded-[1.1rem]"
          style={{
            padding: isAvatarTransitioning ? "4px" : "3px",
            background: EMOTION_COLORS[displayedEmotion],
            boxShadow: isAvatarTransitioning
              ? `0 0 35px ${EMOTION_COLORS[displayedEmotion]}90, 0 0 70px ${EMOTION_COLORS[displayedEmotion]}50`
              : `0 0 20px ${EMOTION_COLORS[displayedEmotion]}40`,
            transition: `all ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          <div className="therapy-session-avatar-large group relative overflow-hidden rounded-[calc(1.1rem-3px)]">
            {hasPatientAvatar ? (
              <div className="relative h-full w-full">
                <Image
                  key={`current-${currentEmotion}`}
                  src={getPatientAvatarPath(selectedPatientAvatarUrl, currentEmotion)}
                  alt={`Avatar of ${effectivePatientName} - ${currentEmotion}`}
                  width={100}
                  height={100}
                  className="h-full w-full rounded-[calc(1.1rem-3px)] object-cover shadow-lg"
                  priority
                  style={{
                    opacity:
                      nextEmotion && nextEmotion !== currentEmotion
                        ? isAvatarTransitioning
                          ? 0
                          : 1
                        : 1,
                    transition: `opacity ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                />
                {nextEmotion && nextEmotion !== currentEmotion && (
                  <Image
                    key={`next-${nextEmotion}`}
                    src={getPatientAvatarPath(selectedPatientAvatarUrl, nextEmotion)}
                    alt={`Avatar of ${effectivePatientName} - ${nextEmotion}`}
                    width={100}
                    height={100}
                    className="absolute inset-0 h-full w-full rounded-[calc(1.1rem-3px)] object-cover shadow-lg"
                    priority
                    style={{
                      opacity: isAvatarTransitioning ? 1 : 0,
                      transition: `opacity ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                    }}
                  />
                )}
              </div>
            ) : (
              <div
                className={`avatar-color-default flex h-25 w-25 items-center justify-center rounded-[calc(1.1rem-3px)] text-3xl font-bold text-white shadow-lg ${patientAvatarColorClass}`}
              >
                {patientAvatarInitials}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpandAvatar}
              className="absolute right-1 top-1 z-[3] h-6 w-6 rounded-md bg-black/40 p-0 opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100"
              aria-label="Expand avatar"
            >
              <Maximize2 className="h-3 w-3 text-white" />
            </Button>
          </div>
        </div>
        <p className="mt-1 break-words text-center text-sm font-semibold text-[var(--color-text-primary)]">
          {effectivePatientName}
        </p>
        {extractedText && (
          <div className="mt-2 flex w-full flex-col items-center px-2">
            <div
              className="max-w-full break-words text-center text-xs italic text-[var(--color-text-secondary)]"
              style={{
                animation: "fadeIn 0.5s ease-in-out",
              }}
            >
              {extractedText}
            </div>
          </div>
        )}
        <div className="mt-2 flex w-full flex-col items-center">
          <div
            className="rounded-full px-3 py-1.5 text-xs font-medium text-white transition-all duration-300"
            style={{
              backgroundColor: EMOTION_COLORS[displayedEmotion],
              boxShadow: `0 2px 8px ${EMOTION_COLORS[displayedEmotion]}60`,
            }}
          >
            {EMOTION_LABELS[displayedEmotion]}
          </div>
        </div>
      </div>
    </div>
  );
}
