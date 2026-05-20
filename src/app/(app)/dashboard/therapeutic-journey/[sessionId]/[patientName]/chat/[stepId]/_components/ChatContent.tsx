"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { api } from "~/trpc/react";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { Button } from "~/components/ui/button";
import { DashboardPanel } from "~/components/dashboard/ui";
import { ChatPageSkeleton } from "~/components/ui/skeleton-variants";
import { useAudioPlayer } from "~/hooks/useAudioPlayer";
import { useAppToast } from "~/hooks/useAppToast";
import { useTTSStatus } from "~/hooks/useTTSStatus";
import { createLogger } from "~/lib/logger";
import { getErrorMessage } from "~/lib/utils";
import { createPatientSlug } from "~/lib/utils/slugify";

import { EmotionTrendPanel } from "./EmotionTrendPanel";
import { ChatComposer } from "./ChatComposer";
import {
  ChatCompletionFooter,
  ChatSuccessDialog,
  ExpandedAvatarDialog,
} from "./ChatDialogs";
import { ChatMessagesPane } from "./ChatMessagesPane";
import { ChatPatientSidebar } from "./ChatPatientSidebar";
import { ChatSessionHeader } from "./ChatSessionHeader";
import {
  appendSnapshotToTimeline,
  appendSnapshotToVectorTimeline,
  mergeTimelineState,
  normalizePatientEmotion,
  normalizeSnapshot,
  normalizeTimeline,
  resolveEmotionForDisplay,
  type ChatResponseEmotionPayload,
} from "./chat-emotion-utils";
import { buildQuestionAnswerRows, extractAndRemoveParentheses } from "./chat-message-utils";
import { exportChatStepPdf } from "./chat-pdf";
import type {
  ChatContentProps,
  ChatMessage,
  ChatStepData,
  EmotionSnapshot,
  EmotionTimelinePoint,
  EmotionVectorTimelinePoint,
  PatientData,
  TherapySessionData,
} from "./chat-types";
import {
  AVATAR_TRANSITION_DURATION_MS,
  type PatientEmotion,
} from "./chat-constants";
import {
  formatSessionTime,
  generatePatientAvatar,
  sanitizePatientAvatarUrl,
} from "./chat-utils";
import { useChatSessionTimer } from "./useChatSessionTimer";
import { usePdfHeaderAvatarDataUrl } from "./usePdfHeaderAvatarDataUrl";
import { useChatBootstrap } from "./useChatBootstrap";

const logger = createLogger("ChatContent");

export function ChatContent({ user, impersonation }: ChatContentProps) {
  const params = useParams();
  const router = useRouter();
  const { error: showError } = useAppToast();
  const therapySessionId = params.sessionId as string;
  const stepId = Number.parseInt(params.stepId as string, 10);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isTypingVisible, setIsTypingVisible] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<PatientEmotion>("base");
  const [nextEmotion, setNextEmotion] = useState<PatientEmotion | null>(null);
  const [isAvatarTransitioning, setIsAvatarTransitioning] = useState(false);
  const [showTTSWarning, setShowTTSWarning] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [stepCompletionOverride, setStepCompletionOverride] = useState(false);
  const [emotionSnapshot, setEmotionSnapshot] = useState<EmotionSnapshot | null>(null);
  const [emotionTimeline, setEmotionTimeline] = useState<EmotionTimelinePoint[]>([]);
  const [emotionVectorTimeline, setEmotionVectorTimeline] = useState<
    EmotionVectorTimelinePoint[]
  >([]);
  const [responsePatientName, setResponsePatientName] = useState<string | null>(null);
  const [responseAvatarUrl, setResponseAvatarUrl] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const avatarTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  const timerStorageKey = useMemo(
    () => `llmpatients:chat-timer:${user.id}:${therapySessionId}:${stepId}`,
    [stepId, therapySessionId, user.id],
  );

  const { isTTSEnabled } = useTTSStatus(true);
  const audioPlayer = useAudioPlayer({
    autoPlay: true,
  });

  useEffect(() => {
    if (audioPlayer.isTTSAvailable) {
      setShowTTSWarning(true);
    }
  }, [audioPlayer.isTTSAvailable]);

  const { data: therapySession, isLoading: therapySessionLoading } =
    api.therapySessions.getById.useQuery(
      { therapySessionId },
      { enabled: Boolean(therapySessionId) },
    );

  const {
    data: selectedPatient,
    isLoading: patientLoading,
    error: patientError,
  } = api.patients.getPatientById.useQuery(
    { id: therapySession?.patientId ?? "" },
    { enabled: Boolean(therapySession?.patientId) },
  );

  const { data: existingChat, isLoading: chatLoading } =
    api.chat.getChatStep.useQuery(
      {
        therapySessionId: therapySession?.id ?? "",
        stepNumber: stepId,
      },
      { enabled: Boolean(therapySession?.id) },
    );

  const { data: completedSteps, isLoading: completedStepsLoading } =
    api.chat.getSessionChats.useQuery(
      { therapySessionId: therapySession?.id ?? "" },
      { enabled: Boolean(therapySession?.id) },
    );

  const typedSelectedPatient = selectedPatient as PatientData | undefined;
  const typedTherapySession = therapySession as TherapySessionData | undefined;
  const typedExistingChat = existingChat as ChatStepData | undefined;
  const typedCompletedSteps = completedSteps as ChatStepData[] | undefined;

  const selectedPatientId = typedSelectedPatient?.id;
  const basePatientAvatarUrl = typedSelectedPatient?.avatarUrl ?? null;
  const effectivePatientName =
    responsePatientName ?? typedSelectedPatient?.name ?? "Patient";
  const selectedPatientAvatarUrl = sanitizePatientAvatarUrl(
    responseAvatarUrl ?? basePatientAvatarUrl,
    basePatientAvatarUrl,
  );
  const shouldShowEmotionTrend =
    Boolean(emotionSnapshot) ||
    emotionTimeline.length > 0 ||
    emotionVectorTimeline.length > 0;

  const saveChatMutation = api.chat.saveChatStep.useMutation();
  const markStepDoneMutation = api.chat.markStepDone.useMutation();
  const generateResponseMutation = api.chat.generatePatientResponse.useMutation();
  const generateChatResponseMutation = api.chat.generateChatResponse.useMutation();
  const utils = api.useUtils();

  const patientAvatar = useMemo(
    () =>
      typedSelectedPatient
        ? generatePatientAvatar(typedSelectedPatient.name)
        : { colorClass: "avatar-color-default", initials: "P" },
    [typedSelectedPatient],
  );

  const isStepCompleted = useMemo(() => {
    if (stepCompletionOverride) return true;
    if (typedExistingChat?.done) return true;
    if (!typedCompletedSteps) return false;

    return typedCompletedSteps.some(
      (completedStep) => completedStep.stepNumber === stepId && completedStep.done,
    );
  }, [stepCompletionOverride, stepId, typedCompletedSteps, typedExistingChat?.done]);

  const { sessionTime } = useChatSessionTimer(timerStorageKey, isStepCompleted);
  const pdfHeaderAvatarDataUrl = usePdfHeaderAvatarDataUrl(
    selectedPatientId,
    selectedPatientAvatarUrl,
  );

  const questionAnswerRows = useMemo(
    () => buildQuestionAnswerRows(messages),
    [messages],
  );

  const scrollToBottom = useCallback(
    (delay = 100) => {
      window.setTimeout(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const extraSpace = audioPlayer.currentAudioUrl ? 120 : 0;
        container.scrollTo({
          top: container.scrollHeight + extraSpace,
          behavior: "smooth",
        });
      }, delay);
    },
    [audioPlayer.currentAudioUrl],
  );

  useEffect(() => {
    if (
      messages.length === 0 ||
      !hasUserInteracted ||
      isTTSEnabled === false ||
      !audioPlayer.isTTSAvailable
    ) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.sender === "patient" &&
      lastMessage.id !== lastProcessedMessageIdRef.current
    ) {
      lastProcessedMessageIdRef.current = lastMessage.id;

      void audioPlayer.playText(
        lastMessage.content,
        undefined,
        lastMessage.emotion,
        typedSelectedPatient?.name || undefined,
        {
          elevenlabsVoiceId: typedSelectedPatient?.elevenlabsVoiceId || undefined,
          vibevoiceVoiceId: typedSelectedPatient?.vibevoiceVoiceId || undefined,
          chatterboxVoiceId: typedSelectedPatient?.chatterboxVoiceId || undefined,
          gender: typedSelectedPatient?.gender || undefined,
        },
      );
    }
  }, [
    audioPlayer,
    hasUserInteracted,
    isTTSEnabled,
    messages,
    typedSelectedPatient?.chatterboxVoiceId,
    typedSelectedPatient?.elevenlabsVoiceId,
    typedSelectedPatient?.gender,
    typedSelectedPatient?.name,
    typedSelectedPatient?.vibevoiceVoiceId,
  ]);

  useEffect(() => {
    if (audioPlayer.isPlaying || audioPlayer.currentAudioUrl) {
      scrollToBottom(100);
    }
  }, [audioPlayer.currentAudioUrl, audioPlayer.isPlaying, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
        typingIndicatorTimeoutRef.current = null;
      }
      if (avatarTransitionTimeoutRef.current) {
        clearTimeout(avatarTransitionTimeoutRef.current);
        avatarTransitionTimeoutRef.current = null;
      }
    };
  }, []);

  const showTypingIndicator = useCallback(() => {
    setIsWaitingForResponse(true);

    if (typingIndicatorTimeoutRef.current) {
      clearTimeout(typingIndicatorTimeoutRef.current);
    }

    typingIndicatorTimeoutRef.current = setTimeout(() => {
      setIsTypingVisible(true);
      scrollToBottom(50);
      typingIndicatorTimeoutRef.current = null;
    }, 200);
  }, [scrollToBottom]);

  const clearTypingIndicator = useCallback(() => {
    if (typingIndicatorTimeoutRef.current) {
      clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }

    setIsWaitingForResponse(false);
    setIsTypingVisible(false);
  }, []);

  useChatBootstrap({
    existingChat: typedExistingChat,
    selectedPatient: typedSelectedPatient,
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
  });

  const triggerAvatarEmotionChange = useCallback(
    (emotion: PatientEmotion) => {
      if (emotion === currentEmotion || emotion === nextEmotion) return;

      if (avatarTransitionTimeoutRef.current) {
        clearTimeout(avatarTransitionTimeoutRef.current);
      }

      setNextEmotion(emotion);
      requestAnimationFrame(() => {
        setIsAvatarTransitioning(true);

        avatarTransitionTimeoutRef.current = setTimeout(() => {
          setCurrentEmotion(emotion);
          setNextEmotion(null);
          setIsAvatarTransitioning(false);
        }, AVATAR_TRANSITION_DURATION_MS);
      });
    },
    [currentEmotion, nextEmotion],
  );

  useEffect(() => {
    if (!messages.length) {
      setCurrentEmotion("base");
      setNextEmotion(null);
      setIsAvatarTransitioning(false);
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender === "patient" && lastMessage.emotion) {
      triggerAvatarEmotionChange(lastMessage.emotion);
    }
  }, [messages, triggerAvatarEmotionChange]);

  const applyEmotionPayload = useCallback(
    (payload: ChatResponseEmotionPayload) => {
      if (typeof payload.patient_name === "string" && payload.patient_name.trim()) {
        setResponsePatientName(payload.patient_name);
      }

      if (typeof payload.avatar_url === "string" && payload.avatar_url.trim()) {
        setResponseAvatarUrl(
          sanitizePatientAvatarUrl(payload.avatar_url, basePatientAvatarUrl),
        );
      } else if (payload.avatar_url === null) {
        setResponseAvatarUrl(null);
      }

      const normalizedIncomingTimeline = Array.isArray(payload.emotion_timeline)
        ? normalizeTimeline(payload.emotion_timeline)
        : [];

      if (normalizedIncomingTimeline.length > 0) {
        setEmotionTimeline((currentTimeline) =>
          mergeTimelineState(currentTimeline, normalizedIncomingTimeline),
        );
      }

      if (payload.emotion_snapshot) {
        const normalizedSnapshot = normalizeSnapshot(payload.emotion_snapshot);
        const latestIncomingPoint =
          normalizedIncomingTimeline.length > 0
            ? normalizedIncomingTimeline[normalizedIncomingTimeline.length - 1]
            : null;

        setEmotionSnapshot(normalizedSnapshot);
        setEmotionVectorTimeline((currentTimeline) =>
          appendSnapshotToVectorTimeline(
            currentTimeline,
            normalizedSnapshot,
            latestIncomingPoint?.turn_index,
            latestIncomingPoint?.timestamp,
          ),
        );

        if (normalizedIncomingTimeline.length === 0) {
          setEmotionTimeline((currentTimeline) =>
            appendSnapshotToTimeline(currentTimeline, normalizedSnapshot),
          );
        }
      }
    },
    [basePatientAvatarUrl],
  );

  const focusInputLater = useCallback(() => {
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, []);

  const persistMessages = useCallback(
    async (nextMessages: ChatMessage[]) => {
      if (!typedTherapySession) {
        return;
      }

      await saveChatMutation.mutateAsync({
        therapySessionId: typedTherapySession.id,
        stepNumber: stepId,
        messages: nextMessages.map((message) => ({
          ...message,
          timestamp:
            message.timestamp instanceof Date
              ? message.timestamp
              : new Date(message.timestamp),
        })),
      });
    },
    [saveChatMutation, stepId, typedTherapySession],
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isWaitingForResponse || !typedTherapySession) {
      return;
    }

    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    const messageText = inputMessage.trim();
    setInputMessage("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: messageText,
      sender: "user",
      timestamp: new Date(),
      stepId,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    scrollToBottom(50);
    showTypingIndicator();

    try {
      await persistMessages(updatedMessages);
    } catch (error) {
      logger.error("Unable to persist user message before response", error);
    }

    try {
      if (typedTherapySession.externalPatientId) {
        const response = await generateChatResponseMutation.mutateAsync({
          therapySessionId: typedTherapySession.id,
          user_message: messageText,
          step_id: stepId,
        });

        const responseEmotion = resolveEmotionForDisplay(
          response,
          response.emotion,
        );
        applyEmotionPayload(response);
        triggerAvatarEmotionChange(responseEmotion);

        const { cleanedText, extractedText: extractedCopy } =
          extractAndRemoveParentheses(response.message);
        if (extractedCopy) {
          setExtractedText(extractedCopy);
        }

        const patientMessage: ChatMessage = {
          id: `patient-${Date.now()}`,
          content: cleanedText,
          sender: "patient",
          timestamp: new Date(response.timestamp),
          stepId,
          emotion: responseEmotion,
          metadata: response.metadata,
        };

        const finalMessages = [...updatedMessages, patientMessage];
        setMessages(finalMessages);
        clearTypingIndicator();
        scrollToBottom(100);
        focusInputLater();
        void persistMessages(finalMessages).catch((error) => {
          logger.error("Unable to persist generated chat response", error);
        });
        return;
      }

      const response = await generateResponseMutation.mutateAsync({
        patientInfo: {
          id: typedSelectedPatient?.id || "",
          name: typedSelectedPatient?.name || "",
          age: 45,
          gender: "male",
          diagnosis: "Generalized anxiety disorder",
          difficulty: typedSelectedPatient?.difficulty || 1,
          psychologicalProfile:
            typedSelectedPatient?.background || "Standard psychological profile",
          background: typedSelectedPatient?.background || "",
          currentMedications: [],
          therapyGoals: typedSelectedPatient?.objectives || [],
          previousSessions: 0,
        },
        userMessage: messageText,
        stepId,
        sessionId: typedTherapySession.id,
        conversationHistory: messages.slice(-5).map((message) => ({
          content: message.content,
          sender: message.sender,
          timestamp:
            message.timestamp instanceof Date
              ? message.timestamp
              : new Date(message.timestamp),
        })),
      });

      const responseEmotion = normalizePatientEmotion(response.emotion) ?? "base";
      triggerAvatarEmotionChange(responseEmotion);

      const { cleanedText, extractedText: extractedCopy } =
        extractAndRemoveParentheses(response.message);
      if (extractedCopy) {
        setExtractedText(extractedCopy);
      }

      const patientMessage: ChatMessage = {
        id: `patient-${Date.now()}`,
        content: cleanedText,
        sender: "patient",
        timestamp: response.timestamp || new Date(),
        stepId,
        emotion: responseEmotion,
        metadata: response.metadata,
      };

      const finalMessages = [...updatedMessages, patientMessage];
      setMessages(finalMessages);
      clearTypingIndicator();
      scrollToBottom(100);
      focusInputLater();
      void persistMessages(finalMessages).catch((error) => {
        logger.error("Unable to persist fallback generated response", error);
      });
    } catch (error) {
      logger.error("Error generating patient response", error);
      clearTypingIndicator();
      showError(
        "Unable to generate response",
        getErrorMessage(error, "Error generating response. Please try again."),
      );
      focusInputLater();
    }
  }, [
    applyEmotionPayload,
    focusInputLater,
    generateChatResponseMutation,
    generateResponseMutation,
    hasUserInteracted,
    inputMessage,
    isWaitingForResponse,
    clearTypingIndicator,
    messages,
    persistMessages,
    scrollToBottom,
    showError,
    showTypingIndicator,
    stepId,
    triggerAvatarEmotionChange,
    typedSelectedPatient,
    typedTherapySession,
  ]);

  const goBack = useCallback(() => {
    if (typedSelectedPatient) {
      const patientSlug = createPatientSlug(typedSelectedPatient.name);
      router.push(
        `/dashboard/therapeutic-journey/${therapySessionId}/${patientSlug}`,
      );
      return;
    }

    router.push("/dashboard/therapeutic-journey");
  }, [router, therapySessionId, typedSelectedPatient]);

  const goToMisstepAnalysis = useCallback(() => {
    if (!typedSelectedPatient) {
      return;
    }

    const patientSlug = createPatientSlug(typedSelectedPatient.name);
    router.push(
      `/dashboard/therapeutic-journey/${therapySessionId}/${patientSlug}/chat/${stepId}/missteps`,
    );
  }, [router, stepId, therapySessionId, typedSelectedPatient]);

  const handleCompleteStep = useCallback(async () => {
    if (!typedTherapySession) return;

    try {
      await markStepDoneMutation.mutateAsync({
        therapySessionId: typedTherapySession.id,
        stepNumber: stepId,
      });

      setStepCompletionOverride(true);
      await utils.chat.getSessionChats.invalidate({
        therapySessionId: typedTherapySession.id,
      });
      setIsSuccessDialogOpen(true);
    } catch (error) {
      showError(
        "Unable to complete session",
        error instanceof Error &&
          (error.message.includes("not found") ||
            error.message.includes("access denied"))
          ? "Session not found or access denied. Reload the page and try again."
          : getErrorMessage(error, "Error completing session. Please try again."),
      );
    }
  }, [markStepDoneMutation, showError, stepId, typedTherapySession, utils]);

  const handleDownloadSessionPdf = useCallback(async () => {
    if (!typedSelectedPatient) return;

    setIsExportingPdf(true);
    try {
      await exportChatStepPdf({
        patient: typedSelectedPatient,
        therapySession: typedTherapySession,
        stepId,
        user,
        sessionTime,
        messages,
        isStepCompleted,
        questionAnswerRows,
        pdfHeaderAvatarDataUrl,
        patientAvatarInitials: patientAvatar.initials,
      });
    } catch (error) {
      logger.error("Error exporting session PDF", error);
      showError(
        "Unable to export PDF",
        getErrorMessage(error, "Error exporting PDF. Please try again."),
      );
    } finally {
      setIsExportingPdf(false);
    }
  }, [
    isStepCompleted,
    messages,
    patientAvatar.initials,
    pdfHeaderAvatarDataUrl,
    questionAnswerRows,
    sessionTime,
    showError,
    stepId,
    typedSelectedPatient,
    typedTherapySession,
    user,
  ]);

  const handleCloseSuccessDialog = useCallback(() => {
    setIsSuccessDialogOpen(false);
    goBack();
  }, [goBack]);

  const handleKeyPress = useCallback(
    async (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const isLoading = useMemo(
    () =>
      patientLoading ||
      therapySessionLoading ||
      chatLoading ||
      completedStepsLoading,
    [chatLoading, completedStepsLoading, patientLoading, therapySessionLoading],
  );

  const currentDateString = useMemo(
    () => new Date().toLocaleDateString("en-US"),
    [],
  );

  if (isLoading) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
        disablePadding={true}
      >
        <ChatPageSkeleton />
      </SharedLayout>
    );
  }

  if (patientError || !typedSelectedPatient) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <div className="flex min-h-screen items-center justify-center bg-background">
          <DashboardPanel className="dashboard-section max-w-md p-8 text-center">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              Patient not found
            </h2>
            <p className="mb-6 text-muted-foreground">
              The requested patient is not available.
            </p>
            <Button onClick={goBack} size="lg" className="gap-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Timeline
            </Button>
          </DashboardPanel>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      user={user}
      impersonation={impersonation}
      layoutType="dashboard"
      currentPage="/dashboard/therapeutic-journey"
      disablePadding={true}
    >
      <div
        className="flex h-[calc(100vh-4rem)] w-full min-w-0 flex-col bg-background"
        role="main"
        aria-label="Chat with virtual patient"
      >
        <ChatSessionHeader
          effectivePatientName={effectivePatientName}
          stepId={stepId}
          currentDateString={currentDateString}
          sessionTimeLabel={formatSessionTime(sessionTime)}
          patientId={typedSelectedPatient.id}
          therapySessionId={typedTherapySession?.id}
          externalPatientId={typedTherapySession?.externalPatientId}
          isStepCompleted={isStepCompleted}
          isCompleting={markStepDoneMutation.isPending}
          onBack={goBack}
          onCompleteStep={() => void handleCompleteStep()}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatPatientSidebar
            hasPatientAvatar={true}
            patientAvatarColorClass={patientAvatar.colorClass}
            patientAvatarInitials={patientAvatar.initials}
            selectedPatientAvatarUrl={selectedPatientAvatarUrl}
            currentEmotion={currentEmotion}
            nextEmotion={nextEmotion}
            isAvatarTransitioning={isAvatarTransitioning}
            effectivePatientName={effectivePatientName}
            extractedText={extractedText}
            onExpandAvatar={() => setIsAvatarExpanded(true)}
          />

          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="page-background flex min-h-full min-w-0 flex-1 flex-col">
              <ChatMessagesPane
                messagesContainerRef={messagesContainerRef}
                messages={messages}
                isTyping={isTypingVisible}
                shouldShowEmotionTrend={shouldShowEmotionTrend}
                selectedPatientAvatarUrl={selectedPatientAvatarUrl}
                currentEmotion={currentEmotion}
                nextEmotion={nextEmotion}
                effectivePatientName={effectivePatientName}
                emotionSnapshot={emotionSnapshot}
                emotionTimeline={emotionTimeline}
                emotionVectorTimeline={emotionVectorTimeline}
                hasAudioPlayer={
                  audioPlayer.isLoading || Boolean(audioPlayer.currentAudioUrl)
                }
              />

              <ChatComposer
                isStepCompleted={isStepCompleted}
                audioPlayer={audioPlayer}
                showTTSWarning={showTTSWarning}
                setShowTTSWarning={setShowTTSWarning}
                isTTSEnabled={isTTSEnabled}
                hasUserInteracted={hasUserInteracted}
                onFirstAudioInteraction={() => setHasUserInteracted(true)}
                showAudioWaveform={true}
                inputMessage={inputMessage}
                onInputMessageChange={setInputMessage}
                onSendMessage={() => void handleSendMessage()}
                onKeyPress={handleKeyPress}
                inputRef={inputRef}
                isTyping={isTypingVisible}
                isWaitingForResponse={isWaitingForResponse}
              />

              <ChatCompletionFooter
                isStepCompleted={isStepCompleted}
                stepId={stepId}
                isExportingPdf={isExportingPdf}
                onDownloadPdf={() => void handleDownloadSessionPdf()}
                onOpenMisstepAnalysis={goToMisstepAnalysis}
              />
            </div>
          </div>

          <div className="page-background hidden w-64 flex-shrink-0 self-start p-4 lg:flex">
            <div className="chat-scrollbar sticky top-4 max-h-[calc(100vh-7rem)] w-full overflow-y-auto pr-1 pt-4">
              {shouldShowEmotionTrend && (
                <EmotionTrendPanel
                  snapshot={emotionSnapshot}
                  timeline={emotionTimeline}
                  vectorTimeline={emotionVectorTimeline}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ChatSuccessDialog
        open={isSuccessDialogOpen}
        stepId={stepId}
        effectivePatientName={effectivePatientName}
        onOpenChange={setIsSuccessDialogOpen}
        onBackToTimeline={handleCloseSuccessDialog}
        onOpenMisstepAnalysis={goToMisstepAnalysis}
      />

      <ExpandedAvatarDialog
        open={isAvatarExpanded}
        onOpenChange={setIsAvatarExpanded}
        hasPatientAvatar={true}
        selectedPatientAvatarUrl={selectedPatientAvatarUrl}
        currentEmotion={currentEmotion}
        effectivePatientName={effectivePatientName}
        patientAvatarColorClass={patientAvatar.colorClass}
        patientAvatarInitials={patientAvatar.initials}
      />
    </SharedLayout>
  );
}
