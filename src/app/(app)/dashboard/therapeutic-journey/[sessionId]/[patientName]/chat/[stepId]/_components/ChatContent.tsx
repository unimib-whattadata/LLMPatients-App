"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "~/trpc/react";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ArrowLeft, Check, Loader2, Send, Mic, X, CheckCircle2, Maximize2, Info } from "lucide-react";
import { createPatientSlug } from "~/lib/utils/slugify";
import type {
  ChatMessage,
  PatientData,
  TherapySessionData,
  ChatStepData,
  ChatContentProps,
} from "./chat-types";
import type { PatientEmotion } from "./chat-constants";
import {
  EMOTION_COLORS,
  AVATAR_TRANSITION_DURATION_MS,
} from "./chat-constants";
import {
  formatSessionTime,
  getPatientAvatarPath,
  generatePatientAvatar,
} from "./chat-utils";
import { useAudioPlayer } from "~/hooks/useAudioPlayer";

export function ChatContent({ user, impersonation }: ChatContentProps) {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const stepId = parseInt(params.stepId as string);

  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionTime, setSessionTime] = useState(0); 
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<PatientEmotion>("base");
  const [nextEmotion, setNextEmotion] = useState<PatientEmotion | null>(null);
  const [isAvatarTransitioning, setIsAvatarTransitioning] = useState(false);
  const [showAudioWaveform, setShowAudioWaveform] = useState(true);
  const [showTTSWarning, setShowTTSWarning] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const avatarTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  
  const audioPlayer = useAudioPlayer({
    autoPlay: true,
    onPlaybackEnd: () => {
      console.log("🎙️ [AUDIO] Playback ended");
      
    },
    onError: (error) => {
      console.error("Audio error:", error);
      
      
      if (error.includes("not configured") || error.includes("API key")) {
        console.warn("TTS service not available - audio generation disabled");
      }
    },
  });

  
  useEffect(() => {
    if (audioPlayer.isTTSAvailable) {
      setShowTTSWarning(true);
    }
  }, [audioPlayer.isTTSAvailable]);

  
  const {
    data: selectedPatient,
    isLoading: patientLoading,
    error: patientError,
  } = api.patients.getPatientById.useQuery(
    { id: sessionId },
    { enabled: Boolean(sessionId) },
  );

  
  const { data: therapySession, isLoading: therapySessionLoading } =
    api.therapySessions.getByPatient.useQuery(
      { patientId: sessionId },
      { enabled: Boolean(sessionId) },
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
    if (!typedCompletedSteps) return false;
    return typedCompletedSteps.some(
      (step) => step.stepNumber === stepId && step.done,
    );
  }, [typedCompletedSteps, stepId]);

  
  const scrollToBottom = useCallback((delay = 100) => {
    setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container) {
        
        const extraSpace = audioPlayer.currentAudioUrl ? 120 : 0; 
        container.scrollTo({
          top: container.scrollHeight + extraSpace,
          behavior: 'smooth'
        });
      }
    }, delay);
  }, [audioPlayer.currentAudioUrl]);

  
  useEffect(() => {
    if (messages.length === 0 || !hasUserInteracted) return;
    
    const lastMessage = messages[messages.length - 1];
    
    if (
      lastMessage && 
      lastMessage.sender === "patient" && 
      lastMessage.id !== lastProcessedMessageIdRef.current
    ) {
      console.log("🎙️ [AUDIO] Processing new patient message:", {
        messageId: lastMessage.id,
        content: lastMessage.content.substring(0, 50) + "...",
        patientName: typedSelectedPatient?.name,
        previousProcessedId: lastProcessedMessageIdRef.current,
        hasUserInteracted
      });
      
      
      lastProcessedMessageIdRef.current = lastMessage.id;
      
      // Use voiceId from database for TTS
      void audioPlayer.playText(
        lastMessage.content, 
        typedSelectedPatient?.voiceId || undefined, 
        lastMessage.emotion
      );
    }
  }, [messages, audioPlayer, typedSelectedPatient?.voiceId, typedSelectedPatient?.name, hasUserInteracted]);

  
  useEffect(() => {
    if (audioPlayer.isPlaying || audioPlayer.currentAudioUrl) {
      
      scrollToBottom(100);
    }
  }, [audioPlayer.isPlaying, audioPlayer.currentAudioUrl, scrollToBottom]);

  

  
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (avatarTransitionTimeoutRef.current) {
        clearTimeout(avatarTransitionTimeoutRef.current);
        avatarTransitionTimeoutRef.current = null;
      }
    };
  }, []);


  
  useEffect(() => {
    if (typedExistingChat && typedExistingChat.messages.length > 0) {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        
        const messagesWithDates = typedExistingChat.messages.map((msg) => ({
          ...msg,
          timestamp:
            typeof msg.timestamp === "string"
              ? new Date(msg.timestamp)
              : msg.timestamp,
        }));
        setMessages(messagesWithDates);
        
        
        const lastPatientMessage = [...messagesWithDates]
          .reverse()
          .find((msg) => msg.sender === "patient" && msg.emotion);
        
        if (lastPatientMessage?.emotion) {
          setCurrentEmotion(lastPatientMessage.emotion);
          setNextEmotion(null);
          setIsAvatarTransitioning(false);
        }
        
        
        setTimeout(() => {
          scrollToBottom(100);
        }, 200);
      }
    } else if (typedSelectedPatient && !chatLoading && !typedExistingChat) {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        // Use welcome message from database, or generate a default one
        const welcomeContent = typedSelectedPatient.welcomeMessage || 
          `Ciao! Sono ${typedSelectedPatient.name}. Sono qui per aiutarti a esplorare la sessione ${stepId} del nostro percorso terapeutico.`;

        const welcomeMessage: ChatMessage = {
          id: `welcome-${Date.now()}`,
          content: welcomeContent,
          sender: "patient",
          timestamp: new Date(),
          stepId,
          emotion: "base",
        };
        setMessages([welcomeMessage]);
        setCurrentEmotion("base");
        setNextEmotion(null);
        setIsAvatarTransitioning(false);
        
        
        setTimeout(() => {
          scrollToBottom(100);
        }, 200);
      }
    }
  }, [typedExistingChat, typedSelectedPatient, stepId, chatLoading, scrollToBottom]);

  
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

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isTyping || !typedTherapySession) return;

    
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

    
    setTimeout(() => {
      setIsTyping(true);
      scrollToBottom(50);
    }, 200);

    
    try {
      await saveChatMutation.mutateAsync({
        therapySessionId: typedTherapySession.id,
        stepNumber: stepId,
        messages: updatedMessages.map((msg) => ({
          ...msg,
          timestamp:
            msg.timestamp instanceof Date
              ? msg.timestamp
              : new Date(msg.timestamp),
        })),
      });
    } catch (error) {
      console.error("Error saving user message:", error);
    }

    
    try {
      
      if (typedSelectedPatient?.externalPatientId) {
        
        const response = await generateChatResponseMutation.mutateAsync({
          external_patient_id: typedSelectedPatient.externalPatientId,
          user_message: messageText,
          session_id: typedTherapySession?.id || "",
          step_id: stepId,
        });

        console.log("🤖 [CHAT] Generated patient response:", {
          message: response.message.substring(0, 50) + "...",
          emotion: response.emotion,
          timestamp: response.timestamp,
          stepId
        });

        triggerAvatarEmotionChange(response.emotion);

        const patientMessage: ChatMessage = {
          id: `patient-${Date.now()}`,
          content: response.message,
          sender: "patient",
          timestamp: new Date(response.timestamp),
          stepId,
          emotion: response.emotion,
        };

        
        const finalMessages = [...updatedMessages, patientMessage];
        setMessages(finalMessages);
        setIsTyping(false);
        
        console.log("🤖 [CHAT] Added patient message to state:", {
          messageId: patientMessage.id,
          totalMessages: finalMessages.length
        });

        
        scrollToBottom(100);

        
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);

        
        saveChatMutation.mutate({
          therapySessionId: typedTherapySession.id,
          stepNumber: stepId,
          messages: finalMessages.map((msg) => ({
            ...msg,
            timestamp:
              msg.timestamp instanceof Date
                ? msg.timestamp
                : new Date(msg.timestamp),
          })),
        });
      } else {
        
        const response = await generateResponseMutation.mutateAsync({
          patientInfo: {
            id: typedSelectedPatient?.id || "",
            name: typedSelectedPatient?.name || "",
            age: 45, 
            gender: "male", 
            diagnosis: "Disturbo d'ansia generalizzato", 
            difficulty: typedSelectedPatient?.difficulty || 1,
            psychologicalProfile: typedSelectedPatient?.background || "Profilo psicologico standard",
            background: typedSelectedPatient?.background || "",
            currentMedications: [], 
            therapyGoals: typedSelectedPatient?.objectives || [],
            previousSessions: 0, 
          },
          userMessage: messageText,
          stepId,
          sessionId: typedTherapySession?.id || "",
          conversationHistory: messages.slice(-5).map(msg => ({
            content: msg.content,
            sender: msg.sender,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          })), 
        });

        console.log("🤖 [CHAT] Generated patient response (fallback):", {
          message: response.message.substring(0, 50) + "...",
          emotion: response.emotion,
          timestamp: response.timestamp,
          stepId
        });

        triggerAvatarEmotionChange(response.emotion);

        const patientMessage: ChatMessage = {
          id: `patient-${Date.now()}`,
          content: response.message,
          sender: "patient",
          timestamp: response.timestamp || new Date(),
          stepId,
          emotion: response.emotion,
        };

        
        const finalMessages = [...updatedMessages, patientMessage];
        setMessages(finalMessages);
        setIsTyping(false);
        
        console.log("🤖 [CHAT] Added patient message to state (fallback):", {
          messageId: patientMessage.id,
          totalMessages: finalMessages.length
        });

        
        scrollToBottom(100);

        
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);

        
        saveChatMutation.mutate({
          therapySessionId: typedTherapySession.id,
          stepNumber: stepId,
          messages: finalMessages.map((msg) => ({
            ...msg,
            timestamp:
              msg.timestamp instanceof Date
                ? msg.timestamp
                : new Date(msg.timestamp),
          })),
        });
      }
    } catch (error) {
      console.error("Error generating patient response:", error);
      setIsTyping(false);
      
      
      alert("Errore nella generazione della risposta. Riprova.");
      
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [
    inputMessage,
    isTyping,
    typedTherapySession,
    stepId,
    messages,
    scrollToBottom,
    typedSelectedPatient,
    saveChatMutation,
    generateResponseMutation,
    generateChatResponseMutation,
    triggerAvatarEmotionChange,
    hasUserInteracted,
  ]);

  const goBack = useCallback(() => {
    if (typedSelectedPatient) {
      const patientSlug = createPatientSlug(typedSelectedPatient.name);
      router.push(`/dashboard/therapeutic-journey/${sessionId}/${patientSlug}`);
    } else {
      router.push(`/dashboard/therapeutic-journey`);
    }
  }, [typedSelectedPatient, sessionId, router]);

  const handleCompleteStep = useCallback(async () => {
    if (!typedTherapySession) return;

    try {
      await markStepDoneMutation.mutateAsync({
        therapySessionId: typedTherapySession.id,
        stepNumber: stepId,
      });

      
      await utils.chat.getSessionChats.invalidate({
        therapySessionId: typedTherapySession.id,
      });

      
      setIsSuccessDialogOpen(true);
    } catch (error) {
      console.error("Error completing step:", error);

      
      if (error instanceof Error) {
        if (
          error.message.includes("not found") ||
          error.message.includes("access denied")
        ) {
          alert(
            "Sessione non trovata o accesso negato. Ricarica la pagina e riprova.",
          );
        } else {
          alert(`Errore nel completare la sessione: ${error.message}`);
        }
      } else {
        alert("Errore nel completare la sessione. Riprova.");
      }
    }
  }, [typedTherapySession, stepId, markStepDoneMutation, utils]);

  const handleCloseSuccessDialog = useCallback(() => {
    setIsSuccessDialogOpen(false);
    goBack();
  }, [goBack]);

  const handleKeyPress = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
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
    [patientLoading, therapySessionLoading, chatLoading, completedStepsLoading],
  );

  
  const currentDateString = useMemo(
    () => new Date().toLocaleDateString("it-IT"),
    [],
  );

  if (isLoading) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-page-background)]">
          <div className="dashboard-section text-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-green)]" />
              <p className="text-sm text-[var(--color-text-primary)]/70">
                Caricamento chat...
              </p>
            </div>
          </div>
        </div>
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
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-page-background)]">
          <div className="dashboard-section text-center">
            <h2 className="text-heading-2 mb-4 text-[var(--color-text-primary)]">
              Paziente non trovato
            </h2>
            <p className="text-body-lg mb-6 text-[var(--color-text-primary)]/70">
              Il paziente richiesto non è disponibile.
            </p>
            <Button onClick={goBack} size="lg" className="gap-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla Timeline
            </Button>
          </div>
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
    >
      <div
        className="chat-container page-background flex h-[calc(100vh-4rem)] flex-col"
        role="main"
        aria-label="Chat con paziente virtuale"
      >
        {}
        <header
          className="dashboard-section navbar-background flex-shrink-0 px-4 py-4 sm:px-6"
          role="banner"
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="flex-shrink-0 hover:bg-[var(--color-primary-green)]/15"
                aria-label="Torna alla timeline"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-heading-3 truncate text-[var(--color-text-primary)]">
                  <span className="hidden sm:inline">
                    {typedSelectedPatient?.name} -{" "}
                  </span>
                  Sessione {stepId}
                </h1>
                <p className="text-sm text-[var(--color-text-primary)]/70">
                  {currentDateString}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center space-x-2 sm:space-x-4">
              <div className="pill bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] px-2 py-1 sm:px-3 w-16 text-center">
                <span className="text-sm font-medium">
                  {formatSessionTime(sessionTime)}
                </span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 hover:bg-[var(--color-primary-green)]/15"
                    aria-label="Informazioni sessione"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-[var(--color-text-primary)]">
                      Informazioni Sessione
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">Patient ID (interno):</span>
                        <span className="font-mono text-xs text-[var(--color-text-primary)]">
                          {typedSelectedPatient?.id || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">Therapy Session ID:</span>
                        <span className="font-mono text-xs text-[var(--color-text-primary)]">
                          {typedTherapySession?.id || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">External Patient ID:</span>
                        <span className="font-mono text-xs text-[var(--color-text-primary)]">
                          {typedSelectedPatient?.externalPatientId || "Non inizializzato"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">Step ID:</span>
                        <span className="font-mono text-xs text-[var(--color-text-primary)]">
                          {stepId}
                        </span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {!isStepCompleted && (
                <Button
                  onClick={handleCompleteStep}
                  disabled={markStepDoneMutation.isPending}
                  isLoading={markStepDoneMutation.isPending}
                  size="sm"
                  className="px-2 text-xs sm:px-4 sm:text-sm"
                  aria-label="Completa sessione"
                >
                  <span className="hidden sm:inline">
                    {markStepDoneMutation.isPending ? "Completando..." : "Fine"}
                  </span>
                  <span className="sm:hidden">
                    {markStepDoneMutation.isPending ? "..." : "Fine"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {}
          <div className="hidden lg:flex flex-col items-center justify-start w-48 flex-shrink-0 p-4 page-background">
            <div className="flex flex-col items-center w-full space-y-3 pt-4">
              <div 
                className="relative rounded-[1.1rem]"
                style={{
                  padding: isAvatarTransitioning ? '4px' : '3px',
                  background: EMOTION_COLORS[nextEmotion ?? currentEmotion],
                  boxShadow: isAvatarTransitioning 
                    ? `0 0 35px ${EMOTION_COLORS[nextEmotion ?? currentEmotion]}90, 0 0 70px ${EMOTION_COLORS[nextEmotion ?? currentEmotion]}50`
                    : `0 0 20px ${EMOTION_COLORS[nextEmotion ?? currentEmotion]}40`,
                  transition: `all ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              >
                <div className="therapy-session-avatar-large relative group rounded-[calc(1.1rem-3px)] overflow-hidden">
                  {typedSelectedPatient ? (
                    <div className="relative w-full h-full">
                      {}
                      <Image
                        key={`current-${currentEmotion}`}
                        src={getPatientAvatarPath(typedSelectedPatient.avatarUrl, currentEmotion)}
                        alt={`Avatar di ${typedSelectedPatient.name} - ${currentEmotion}`}
                        width={100}
                        height={100}
                        className="rounded-[calc(1.1rem-3px)] object-cover shadow-lg w-full h-full"
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
                          src={getPatientAvatarPath(typedSelectedPatient.avatarUrl, nextEmotion)}
                          alt={`Avatar di ${typedSelectedPatient.name} - ${nextEmotion}`}
                          width={100}
                          height={100}
                          className="rounded-[calc(1.1rem-3px)] object-cover shadow-lg w-full h-full absolute inset-0"
                          style={{
                            opacity: isAvatarTransitioning ? 1 : 0,
                            transition: `opacity ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                          }}
                          priority
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`flex h-25 w-25 items-center justify-center rounded-[calc(1.1rem-3px)] font-bold text-white text-3xl shadow-lg ${patientAvatar?.colorClass || "avatar-color-default"}`}
                    >
                      {patientAvatar?.initials}
                    </div>
                  )}
                  {}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAvatarExpanded(true)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/40 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                    style={{ zIndex: 3 }}
                    aria-label="Espandi avatar"
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </Button>
                </div>
              </div>
              {}
            </div>
          </div>

          {}
          <div 
            ref={messagesContainerRef}
            className="flex-1 flex overflow-y-auto chat-scrollbar"
          >
            <div className="flex flex-1 min-h-full">
              {}
              <div className="flex-1 flex flex-col page-background relative">
                {}
                <div className={`flex-1 p-4 sm:p-6 ${audioPlayer.currentAudioUrl ? 'pb-40' : 'pb-24'}`}>
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="space-y-4 sm:space-y-6">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex max-w-2xl space-x-3 ${
                              message.sender === "user"
                                ? "flex-row-reverse space-x-reverse"
                                : "flex-row"
                            }`}
                          >
                            {}
                            <div
                              className={`max-w-xs rounded-lg px-3 py-2 text-white sm:max-w-sm sm:px-4 sm:py-3 ${
                                message.sender === "patient"
                                  ? "chat-bubble--patient"
                                  : message.sender === "user"
                                    ? "chat-bubble--user"
                                    : ""
                              }`}
                            >
                              <p className="text-body text-sm sm:text-base">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="mb-4 flex justify-start">
                          <div className="chat-typing-indicator rounded-lg px-4 py-3">
                            <div className="flex space-x-1">
                              <div className="chat-typing-dot h-2 w-2 animate-bounce rounded-full bg-white/80"></div>
                              <div className="chat-typing-dot--delay-1 h-2 w-2 animate-bounce rounded-full bg-white/80"></div>
                              <div className="chat-typing-dot--delay-2 h-2 w-2 animate-bounce rounded-full bg-white/80"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {}
                {!isStepCompleted && (
                  <div className="sticky bottom-0 left-0 right-0 z-20 p-4 sm:p-6 bg-transparent">
                    <div className="mx-auto max-w-4xl bg-transparent">
                      {}
                      {!audioPlayer.isTTSAvailable && showTTSWarning && (
                        <div className="mb-4">
                          <div className="message message-warning">
                            <div className="message-icon">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="message-content">
                              <div className="message-title">Audio non disponibile</div>
                              <div className="message-text">
                                La quota del servizio di sintesi vocale è esaurita. I messaggi del paziente verranno mostrati solo come testo.
                              </div>
                            </div>
                            <Button
                              onClick={() => setShowTTSWarning(false)}
                              variant="ghost"
                              size="icon"
                              className="message-dismiss"
                              aria-label="Chiudi avviso"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {}
                      {!hasUserInteracted && audioPlayer.isTTSAvailable && (
                        <div className="mb-4">
                          <div className="message message-info">
                            <div className="message-icon">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="message-content">
                              <div className="message-title">Riproduzione audio automatica</div>
                              <div className="message-text">
                                Invia un messaggio o clicca play per abilitare la riproduzione automatica dell&apos;audio dei messaggi del paziente.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {}
                      {(audioPlayer.isLoading || audioPlayer.currentAudioUrl) && (
                        <div className="mb-4 p-4 bg-transparent">
                          <div className="flex space-x-2 sm:space-x-3">
                            <div className="flex-1 flex items-center rounded-lg px-3 py-2 bg-[var(--color-surface-primary)]/50 backdrop-blur-sm">
                              {audioPlayer.isLoading ? (
                                <div className="flex items-center justify-center flex-1 h-20">
                                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary-green)]" />
                                  <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                                    Generazione audio...
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      
                                      if (!hasUserInteracted) {
                                        setHasUserInteracted(true);
                                      }
                                      audioPlayer.togglePlayPause();
                                    }}
                                    className="h-16 w-16 p-0 hover:bg-[var(--color-primary-green)]/10 flex-shrink-0"
                                    aria-label={audioPlayer.isPlaying ? "Pausa" : "Play"}
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

                                  {}
                                  {audioPlayer.isPlaying && showAudioWaveform && (
                                    <div className="flex items-center justify-between flex-1 space-x-1 h-20 px-4">
                                      {Array.from({ length: 60 }, (_, i) => {
                                        
                                        const progress = audioPlayer.duration > 0 
                                          ? (audioPlayer.currentTime / audioPlayer.duration) 
                                          : 0;
                                        const barProgress = i / 60;
                                        const isPast = barProgress < progress;
                                        const baseHeight = 6;
                                        const animatedHeight = isPast 
                                          ? baseHeight + (Math.sin(i * 0.5) * 15) 
                                          : baseHeight + (Math.sin(i * 0.3 + Date.now() * 0.002) * 20);
                                        
                                        return (
                                          <div
                                            key={i}
                                            className="w-1 rounded-full transition-all duration-200"
                                            style={{
                                              height: `${animatedHeight}px`,
                                              background: isPast
                                                ? "linear-gradient(135deg, var(--color-primary-green), var(--color-chat-bubble-patient))"
                                                : "linear-gradient(135deg, var(--color-chat-bubble-patient), var(--color-primary-green))",
                                              animation: !isPast ? `audioWave 1.2s ease-in-out infinite ${i * 0.02}s` : "none",
                                              transformOrigin: "center",
                                              opacity: isPast ? 0.5 : 0.8 + (Math.sin(i * 0.2) * 0.2),
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}

                                  {}
                                  {(!audioPlayer.isPlaying || !showAudioWaveform) && audioPlayer.currentAudioUrl && (
                                    <div className="flex items-center justify-center flex-1 h-20">
                                      <span className="text-sm text-[var(--color-text-secondary)]">
                                        {audioPlayer.isPlaying 
                                          ? "Riproduzione in corso..." 
                                          : "Audio pronto - Clicca play per ascoltare"
                                        }
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
                              className="h-20 w-11 p-0 hover:bg-[var(--color-primary-green)]/10 flex-shrink-0"
                              aria-label="Chiudi audio player"
                              disabled={audioPlayer.isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    
                    <div className="flex space-x-2 sm:space-x-3 bg-transparent">
                      <div className="relative flex-1">
                        <Input
                          ref={inputRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Inizia la conversazione"
                          disabled={isTyping}
                          className="flex-1 text-sm sm:text-base h-11"
                          aria-label="Messaggio da inviare"
                        />
                      </div>
                      <Button
                        onClick={() => void handleSendMessage()}
                        disabled={!inputMessage.trim() || isTyping}
                        className="chat-send-button h-11 w-11"
                        aria-label="Invia messaggio"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {}
              {isStepCompleted && (
                <div className="sticky bottom-0 left-0 right-0 z-20 navbar-background p-6">
                  <div className="mx-auto max-w-4xl text-center">
                    <div className="pill bg-primary-green text-white px-4 py-3">
                      <p className="flex items-center justify-center gap-2 text-sm font-medium">
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>
                          Sessione {stepId} completata - La conversazione è in modalità sola lettura
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {}
              <div className="hidden lg:block w-48 flex-shrink-0 page-background" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </div>

      {}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md [&>div]:!animate-none !animate-none">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-[var(--color-primary-green)]/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-[var(--color-primary-green)]" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Sessione Completata!
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Hai completato con successo la Sessione {stepId} con{" "}
              {typedSelectedPatient?.name}.
              <br />
              <span className="text-sm text-[var(--color-text-primary)]/60 mt-2 block">
                Le tue note sono state salvate e puoi rivederle in qualsiasi momento.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseSuccessDialog}
              className="w-full sm:w-auto"
              size="lg"
            >
              Torna alla Timeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={isAvatarExpanded} onOpenChange={setIsAvatarExpanded}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Avatar del paziente {typedSelectedPatient?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {typedSelectedPatient ? (
              <Image
                src={getPatientAvatarPath(typedSelectedPatient.avatarUrl, currentEmotion)}
                alt={`Avatar di ${typedSelectedPatient.name} - ${currentEmotion}`}
                width={600}
                height={600}
                className="w-full h-auto object-cover"
              />
            ) : (
              <div
                className={`flex w-full aspect-square items-center justify-center font-bold text-white text-9xl ${patientAvatar?.colorClass || "avatar-color-default"}`}
              >
                {patientAvatar?.initials}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAvatarExpanded(false)}
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/40 hover:bg-black/60"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SharedLayout>
  );
}
