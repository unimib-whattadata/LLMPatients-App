/**
 * Chat Skeleton Components
 * 
 * Specialized skeleton components for chat interfaces and messaging UI
 */

"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

/**
 * Chat message skeleton - simulates a chat message bubble
 */
export function ChatMessageSkeleton({ 
  isUser = false, 
  showAvatar = true 
}: { 
  isUser?: boolean; 
  showAvatar?: boolean; 
}) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-2xl space-x-3 ${
        isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
      }`}>
        {/* Avatar skeleton for patient messages */}
        {!isUser && showAvatar && (
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full flex-shrink-0">
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        )}
        
        {/* Message bubble skeleton */}
        <div className="rounded-lg px-4 py-3">
          <Skeleton 
            className={`${
              isUser ? "h-4 w-32" : "h-4 w-48"
            }`} 
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Chat header skeleton - for session info and controls
 */
export function ChatHeaderSkeleton() {
  return (
    <div className="border-b px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8 rounded" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Chat input skeleton - for the message input area
 */
export function ChatInputSkeleton() {
  return (
    <div className="border-t p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex space-x-3">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Complete chat interface skeleton
 */
export function ChatInterfaceSkeleton() {
  return (
    <div className="flex h-screen flex-col pt-16">
      {/* Header skeleton */}
      <ChatHeaderSkeleton />
      
      {/* Messages area skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Patient message skeleton */}
          <ChatMessageSkeleton isUser={false} />
          
          {/* User message skeleton */}
          <ChatMessageSkeleton isUser={true} />
          
          {/* Another patient message skeleton */}
          <ChatMessageSkeleton isUser={false} />
          
          {/* Loading indicator skeleton */}
          <div className="flex justify-start">
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="rounded-lg px-4 py-3">
                <div className="flex space-x-1">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Input skeleton */}
      <ChatInputSkeleton />
    </div>
  );
}

/**
 * Patient avatar skeleton
 */
export function PatientAvatarSkeleton() {
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full flex-shrink-0">
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  );
}

/**
 * Session timer skeleton
 */
export function SessionTimerSkeleton() {
  return (
    <div className="rounded-lg px-3 py-1">
      <Skeleton className="h-6 w-12" />
    </div>
  );
}
