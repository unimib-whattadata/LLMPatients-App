"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { Code2 } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { EmotionTrendPanel } from "./EmotionTrendPanel";
import { EMOTION_LABELS, type PatientEmotion } from "./chat-constants";
import { getPatientAvatarPath } from "./chat-utils";
import type {
  ChatMessage,
  EmotionSnapshot,
  EmotionTimelinePoint,
  EmotionVectorTimelinePoint,
} from "./chat-types";

interface ChatMessagesPaneProps {
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  isTyping: boolean;
  shouldShowEmotionTrend: boolean;
  selectedPatientAvatarUrl: string | null;
  currentEmotion: PatientEmotion;
  nextEmotion: PatientEmotion | null;
  effectivePatientName: string;
  emotionSnapshot: EmotionSnapshot | null;
  emotionTimeline: EmotionTimelinePoint[];
  emotionVectorTimeline: EmotionVectorTimelinePoint[];
  hasAudioPlayer: boolean;
}

function ChatMessageMetadataTooltip({ message }: { message: ChatMessage }) {
  if (message.sender !== "patient" || !message.metadata) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="mt-0.5 flex-shrink-0 rounded p-1 opacity-70 transition-all hover:scale-110 hover:bg-white/20 hover:opacity-100"
            aria-label="Technical response details"
            type="button"
          >
            <Code2 className="h-4 w-4 text-white" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-h-[70vh] max-w-xs w-full overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-secondary)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-primary)]"
          sideOffset={8}
        >
          <div className="max-w-full space-y-3">
            <div>
              <h4 className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">
                Technical Information
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">API Type:</span>
                  <span
                    className={`font-mono text-[10px] ${message.metadata.apiType === "REAL" ? "text-green-400" : "text-yellow-400"}`}
                  >
                    {message.metadata.apiType}
                  </span>
                </div>
                {message.metadata.endpoint && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[var(--color-text-secondary)]">Endpoint:</span>
                    <span className="break-all font-mono text-[10px] text-[var(--color-text-primary)]">
                      {message.metadata.endpoint.length > 30
                        ? `${message.metadata.endpoint.substring(0, 30)}...`
                        : message.metadata.endpoint}
                    </span>
                  </div>
                )}
                {message.metadata.duration !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Duration:</span>
                    <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                      {message.metadata.duration < 1000
                        ? `${message.metadata.duration}ms`
                        : `${(message.metadata.duration / 1000).toFixed(2)}s`}
                    </span>
                  </div>
                )}
                {message.metadata.timestamp && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Timestamp:</span>
                    <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                      {new Date(message.metadata.timestamp).toLocaleTimeString("en-US")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {message.metadata.requestData && (
              <div className="border-t border-[var(--color-border-secondary)] pt-3">
                <h4 className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">
                  Sent Data
                </h4>
                <div className="space-y-2 text-xs">
                  {message.metadata.requestData.patientId && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[var(--color-text-secondary)]">Patient ID:</span>
                      <span className="break-all font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.requestData.patientId.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                  {message.metadata.requestData.patientName && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Patient Name:</span>
                      <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.requestData.patientName}
                      </span>
                    </div>
                  )}
                  {message.metadata.requestData.externalPatientId && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[var(--color-text-secondary)]">External ID:</span>
                      <span className="break-all font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.requestData.externalPatientId.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                  {message.metadata.requestData.userMessage && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[var(--color-text-secondary)]">User Message:</span>
                      <span className="break-words font-mono text-[10px] leading-tight text-[var(--color-text-primary)]">
                        {message.metadata.requestData.userMessage.length > 50
                          ? `${message.metadata.requestData.userMessage.substring(0, 50)}...`
                          : message.metadata.requestData.userMessage}
                      </span>
                    </div>
                  )}
                  {message.metadata.requestData.sessionId && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[var(--color-text-secondary)]">Session ID:</span>
                      <span className="break-all font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.requestData.sessionId.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                  {message.metadata.requestData.stepId !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Step ID:</span>
                      <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.requestData.stepId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {message.metadata.responseData && (
              <div className="border-t border-[var(--color-border-secondary)] pt-3">
                <h4 className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">
                  Received Data
                </h4>
                <div className="space-y-2 text-xs">
                  {message.metadata.responseData.emotion && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Emotion:</span>
                      <span className="font-mono text-[10px] capitalize text-[var(--color-text-primary)]">
                        {message.metadata.responseData.emotion}
                      </span>
                    </div>
                  )}
                  {message.metadata.responseData.topic && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Topic:</span>
                      <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.responseData.topic}
                      </span>
                    </div>
                  )}
                  {message.metadata.responseData.reasoningTime !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Reasoning Time:</span>
                      <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.responseData.reasoningTime}s
                      </span>
                    </div>
                  )}
                  {message.metadata.responseData.status && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Status:</span>
                      <span
                        className={`font-mono text-[10px] ${message.metadata.responseData.status === "success" ? "text-green-400" : "text-red-400"}`}
                      >
                        {message.metadata.responseData.status}
                      </span>
                    </div>
                  )}
                  {message.metadata.responseData.code && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Code:</span>
                      <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                        {message.metadata.responseData.code}
                      </span>
                    </div>
                  )}
                </div>

                {message.metadata.rawResponseJson && (
                  <div className="mt-3 border-t border-[var(--color-border-secondary)] pt-3">
                    <h4 className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">
                      Response JSON
                    </h4>
                    <pre className="max-h-32 overflow-auto rounded border border-[var(--color-border-secondary)] bg-[var(--color-surface-primary)] p-2 font-mono text-[10px] text-[var(--color-text-primary)]">
                      {message.metadata.rawResponseJson}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ChatMessagesPane({
  messagesContainerRef,
  messages,
  isTyping,
  shouldShowEmotionTrend,
  selectedPatientAvatarUrl,
  currentEmotion,
  nextEmotion,
  effectivePatientName,
  emotionSnapshot,
  emotionTimeline,
  emotionVectorTimeline,
  hasAudioPlayer,
}: ChatMessagesPaneProps) {
  return (
    <div
      ref={messagesContainerRef}
      className="chat-scrollbar flex min-w-0 flex-1 overflow-y-auto"
    >
      <div className="flex min-h-full min-w-0 flex-1 items-stretch">
        <div className="page-background relative flex min-h-full min-w-0 flex-1 flex-col">
          <div className={`flex-1 p-4 sm:p-6 ${hasAudioPlayer ? "pb-40" : "pb-24"}`}>
            <div className="mx-auto w-full min-w-0 max-w-4xl">
              {shouldShowEmotionTrend && (
                <div className="sticky top-2 z-20 mb-4 rounded-xl border border-[var(--color-border-secondary)] bg-[var(--color-surface-primary)]/80 p-3 backdrop-blur-sm lg:hidden">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[var(--color-border-secondary)]">
                      <Image
                        src={getPatientAvatarPath(selectedPatientAvatarUrl, currentEmotion)}
                        alt={`Avatar of ${effectivePatientName}`}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {effectivePatientName}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {EMOTION_LABELS[nextEmotion ?? currentEmotion]}
                      </p>
                    </div>
                  </div>
                  <EmotionTrendPanel
                    snapshot={emotionSnapshot}
                    timeline={emotionTimeline}
                    vectorTimeline={emotionVectorTimeline}
                    compact={true}
                  />
                </div>
              )}
              <div className="space-y-4 sm:space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-2xl space-x-3 ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`flex max-w-xs items-start gap-2 rounded-lg px-3 py-2 text-white sm:max-w-sm sm:px-4 sm:py-3 ${message.sender === "patient" ? "chat-bubble--patient" : message.sender === "user" ? "chat-bubble--user" : ""}`}
                      >
                        <p className="text-body flex-1 text-sm sm:text-base">
                          {message.content}
                        </p>
                        <ChatMessageMetadataTooltip message={message} />
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="mb-4 flex justify-start">
                    <div className="chat-typing-indicator rounded-lg px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="chat-typing-dot h-2 w-2 animate-bounce rounded-full bg-white/80" />
                        <div className="chat-typing-dot--delay-1 h-2 w-2 animate-bounce rounded-full bg-white/80" />
                        <div className="chat-typing-dot--delay-2 h-2 w-2 animate-bounce rounded-full bg-white/80" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
