"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import {
  buildVectorTimelineFromMessages,
  normalizePatientEmotion,
  normalizeSnapshot,
  normalizeTimeline,
} from "./chat-emotion-utils";
import { extractAndRemoveParentheses } from "./chat-message-utils";
import type {
  ChatMessage,
  ChatStepData,
  EmotionSnapshot,
  EmotionTimelinePoint,
  EmotionVectorTimelinePoint,
  PatientData,
} from "./chat-types";
import type { PatientEmotion } from "./chat-constants";

interface UseChatBootstrapOptions {
  existingChat: ChatStepData | undefined;
  selectedPatient: PatientData | undefined;
  stepId: number;
  chatLoading: boolean;
  isInitialLoad: MutableRefObject<boolean>;
  scrollToBottom: (delay?: number) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setExtractedText: Dispatch<SetStateAction<string | null>>;
  setEmotionSnapshot: Dispatch<SetStateAction<EmotionSnapshot | null>>;
  setEmotionTimeline: Dispatch<SetStateAction<EmotionTimelinePoint[]>>;
  setEmotionVectorTimeline: Dispatch<
    SetStateAction<EmotionVectorTimelinePoint[]>
  >;
  setCurrentEmotion: Dispatch<SetStateAction<PatientEmotion>>;
  setNextEmotion: Dispatch<SetStateAction<PatientEmotion | null>>;
  setIsAvatarTransitioning: Dispatch<SetStateAction<boolean>>;
}

export function useChatBootstrap({
  existingChat,
  selectedPatient,
  stepId,
  chatLoading,
  isInitialLoad,
  scrollToBottom,
  setMessages,
  setExtractedText,
  setEmotionSnapshot,
  setEmotionTimeline,
  setEmotionVectorTimeline,
  setCurrentEmotion,
  setNextEmotion,
  setIsAvatarTransitioning,
}: UseChatBootstrapOptions) {
  useEffect(() => {
    if (existingChat && existingChat.messages.length > 0) {
      if (!isInitialLoad.current) return;

      isInitialLoad.current = false;
      const restoredMessages = existingChat.messages.map((message) => {
        if (message.sender === "patient") {
          const { cleanedText, extractedText } = extractAndRemoveParentheses(
            message.content,
          );
          if (extractedText) {
            setExtractedText(extractedText);
          }
          return {
            ...message,
            content: cleanedText,
            timestamp:
              typeof message.timestamp === "string"
                ? new Date(message.timestamp)
                : message.timestamp,
          };
        }

        return {
          ...message,
          timestamp:
            typeof message.timestamp === "string"
              ? new Date(message.timestamp)
              : message.timestamp,
        };
      });

      setMessages(restoredMessages);

      const lastPatientMessage = [...restoredMessages]
        .reverse()
        .find((message) => message.sender === "patient" && message.emotion);
      const lastPatientWithMetadata = [...restoredMessages]
        .reverse()
        .find(
          (message) =>
            message.sender === "patient" && message.metadata?.responseData,
        );

      const restoredSnapshot = lastPatientWithMetadata?.metadata?.responseData
        ?.emotionSnapshot
        ? normalizeSnapshot(
            lastPatientWithMetadata.metadata.responseData.emotionSnapshot,
          )
        : null;
      const restoredTimeline = Array.isArray(
        lastPatientWithMetadata?.metadata?.responseData?.emotionTimeline,
      )
        ? normalizeTimeline(
            lastPatientWithMetadata.metadata.responseData.emotionTimeline,
          )
        : [];
      const restoredVectorTimeline =
        buildVectorTimelineFromMessages(restoredMessages);
      const restoredDisplayEmotion =
        normalizePatientEmotion(restoredSnapshot?.dominant) ??
        (restoredTimeline.length > 0
          ? normalizePatientEmotion(
              restoredTimeline[restoredTimeline.length - 1]?.emotion,
            )
          : null) ??
        lastPatientMessage?.emotion ??
        null;

      setEmotionSnapshot(restoredSnapshot);
      setEmotionVectorTimeline(restoredVectorTimeline);
      if (restoredDisplayEmotion) {
        setCurrentEmotion(restoredDisplayEmotion);
        setNextEmotion(null);
        setIsAvatarTransitioning(false);
      }

      if (restoredTimeline.length > 0) {
        setEmotionTimeline(restoredTimeline);
      } else if (restoredVectorTimeline.length > 0) {
        setEmotionTimeline(
          restoredVectorTimeline.map((point) => ({
            turn_index: point.turn_index,
            timestamp: point.timestamp,
            emotion: point.dominant,
            intensity: point.vector[point.dominant] ?? 0,
          })),
        );
      } else {
        setEmotionTimeline([]);
      }

      window.setTimeout(() => {
        scrollToBottom(100);
      }, 200);
      return;
    }

    if (!selectedPatient || chatLoading || existingChat || !isInitialLoad.current) {
      return;
    }

    isInitialLoad.current = false;
    const welcomeContent =
      selectedPatient.welcomeMessage ||
      `Hi! I’m ${selectedPatient.name}. I’m here to help you explore session ${stepId} of our therapeutic journey.`;
    const { cleanedText, extractedText } =
      extractAndRemoveParentheses(welcomeContent);
    if (extractedText) {
      setExtractedText(extractedText);
    }

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        content: cleanedText,
        sender: "patient",
        timestamp: new Date(),
        stepId,
        emotion: "base",
      },
    ]);
    setCurrentEmotion("base");
    setNextEmotion(null);
    setIsAvatarTransitioning(false);
    setEmotionSnapshot(null);
    setEmotionTimeline([]);
    setEmotionVectorTimeline([]);

    window.setTimeout(() => {
      scrollToBottom(100);
    }, 200);
  }, [
    chatLoading,
    existingChat,
    isInitialLoad,
    scrollToBottom,
    selectedPatient,
    setCurrentEmotion,
    setEmotionSnapshot,
    setEmotionTimeline,
    setEmotionVectorTimeline,
    setExtractedText,
    setIsAvatarTransitioning,
    setMessages,
    setNextEmotion,
    stepId,
  ]);
}
