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
import { ArrowLeft, Check, Loader2, Send, Mic, X, CheckCircle2, Maximize2 } from "lucide-react";
import { createPatientSlug } from "~/lib/utils/slugify";
import type { User, ImpersonationContext } from "~/types";

// API Response Types
type PatientData = {
  id: string;
  name: string;
  smallDescription: string;
  details: string;
  background: string;
  objectives: string[];
  avatarUrl: string | null;
  avatarType: string;
  difficulty: number;
  estimatedDuration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TherapySessionData = {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ChatStepData = {
  id: string;
  therapySessionId: string;
  stepNumber: number;
  messages: ChatMessage[];
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CompletedStepData = {
  id: string;
  therapySessionId: string;
  stepNumber: number;
  messages: ChatMessage[];
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

interface ChatContentProps {
  user: User;
  impersonation?: ImpersonationContext;
}

// Emotion types for patient avatars
type PatientEmotion = "anger" | "anticipation" | "disgust" | "joy" | "sadness" | "surprise" | "trust" | "base";

interface PatientResponse {
  message: string;
  emotion: PatientEmotion;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date | string;
  stepId: number;
  emotion?: PatientEmotion; // Optional emotion for patient messages
}

/**
 * Safely formats a timestamp to locale time string
 * @param timestamp - Date object or string timestamp
 * @returns Formatted time string
 */

/**
 * Formats session time in MM:SS format
 * @param seconds - Number of seconds
 * @returns Formatted time string
 */
function formatSessionTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Patient-specific responses based on psychological profiles with emotions
 * Extracted as constant to avoid recreation on each render
 */
const PATIENT_RESPONSES: Record<string, PatientResponse[]> = {
  John: [
    { message: "È difficile... mi sento sopraffatto da tutto quello che sta succedendo. Non so come affrontare tutto insieme.", emotion: "sadness" },
    { message: "Mia moglie è preoccupata per me, ma è complicato parlare di queste cose. Mi sento in imbarazzo.", emotion: "sadness" },
    { message: "Al lavoro le cose non vanno bene. Ho paura di non essere più abbastanza competente... l'età, sa?", emotion: "anticipation" },
    { message: "Ho provato a seguire i consigli che mi ha dato, ma è più difficile di quanto pensassi. A volte mangio senza nemmeno accorgermene.", emotion: "sadness" },
    { message: "Quando le cose si accumulano, mi sento paralizzato. Come se non potessi fare nulla.", emotion: "sadness" },
    { message: "I farmaci aiutano un po', ma hanno anche creato altri problemi... non so se ne vale la pena.", emotion: "disgust" },
    { message: "Vorrei solo tornare a come ero prima, quando le cose sembravano più gestibili.", emotion: "sadness" },
  ],
  "Juanita Delgado": [
    { message: "Non so... forse. Ma sento che nessuno capisce veramente cosa sto passando.", emotion: "sadness" },
    { message: "È sempre la stessa storia. Le persone dicono di voler aiutare, ma poi mi deludono.", emotion: "anger" },
    { message: "A volte penso di poter fare grandi cose, altre volte... altre volte non riesco nemmeno ad alzarmi dal letto.", emotion: "sadness" },
    { message: "Mio padre mi ha sempre spinto a eccellere, ma ora guarda dove sono finita. Un fallimento totale.", emotion: "sadness" },
    { message: "Perché dovrei fidarmi? Tutti finiscono per usarmi o abbandonarmi comunque.", emotion: "anger" },
    { message: "C'è qualcosa che non va in me... o forse sono tutti gli altri il problema. Non lo so più.", emotion: "sadness" },
    { message: "Ho provato la terapia prima. Non ha mai funzionato. Perché questa volta dovrebbe essere diverso?", emotion: "disgust" },
    { message: "A volte mi arrabbio così tanto che non riesco a controllarlo. Poi mi sento terribilmente in colpa.", emotion: "anger" },
  ],
  Todd: [
    { message: "Mi dispiace, è solo che... è difficile anche solo parlarne. Mi sento stupido.", emotion: "sadness" },
    { message: "Sono preoccupato per tutto. Il lavoro, uscire di casa, persino fare la spesa. È esaustivo.", emotion: "anticipation" },
    { message: "So che dovrei fare di più, ma l'ansia è paralizzante. Il mio cuore batte così forte...", emotion: "anticipation" },
    { message: "Le mie sorelle pensano che stia esagerando. Forse hanno ragione, non lo so.", emotion: "sadness" },
    { message: "Dopo che papà è morto, tutto è cambiato. Non sono mai più riuscito a sentirmi sicuro.", emotion: "sadness" },
    { message: "Preferisco stare a casa. Lì almeno so cosa aspettarmi. Fuori... fuori è troppo imprevedibile.", emotion: "anticipation" },
    { message: "Mi sento un peso per tutti. Il mio vicino si preoccupa, ma non dovrebbe. Dovrei farcela da solo.", emotion: "sadness" },
    { message: "A volte penso che sarebbe più facile lasciare il lavoro, ma poi cosa farei? Sono bloccato.", emotion: "sadness" },
  ],
};

/**
 * Patient-specific welcome messages based on psychological profiles
 * Extracted as constant to avoid recreation on each render
 */
const WELCOME_MESSAGES: Record<string, string> = {
  John: "Buongiorno. Sono John. Grazie per avermi dedicato del tempo oggi. Ci sono... molte cose di cui dovremmo parlare, se va bene per lei.",
  "Juanita Delgado": "Sono Juanita. Non so bene da dove iniziare... o se ha senso iniziare. Ma sono qui, suppongo.",
  Todd: "Salve... sono Todd. Mi scusi se sembro nervoso. Non sono molto bravo in queste cose, ma... cercherò di fare del mio meglio.",
};

/**
 * Generic fallback responses for patients not in the predefined list
 */
const GENERIC_RESPONSES: PatientResponse[] = [
  { message: "Interessante punto di vista. Puoi elaborare ulteriormente?", emotion: "base" },
  { message: "Capisco la tua preoccupazione. Come ti senti riguardo a questo?", emotion: "base" },
  { message: "È un aspetto importante da considerare. Cosa pensi che potremmo fare?", emotion: "base" },
  { message: "Grazie per aver condiviso questo con me. Vuoi parlarne di più?", emotion: "base" },
];

/**
 * Gets the avatar path based on patient name and emotion
 * 
 * @param patientName - The patient's name
 * @param emotion - The current emotion
 * @returns Avatar URL path
 */
function getPatientAvatarPath(patientName: string, emotion: PatientEmotion = "base"): string {
  // Normalize patient name for file path
  const normalizedName = patientName.toLowerCase().replace(/\s+/g, "-");
  
  // Map patient names to their folder names
  const patientFolderMap: Record<string, string> = {
    "john": "john",
    "juanita-delgado": "juanita",
    "todd": "todd",
  };
  
  const folderName = patientFolderMap[normalizedName] || normalizedName;
  
  // Check if emotion image exists (Todd has all emotions, others only have base)
  if (folderName === "todd" || emotion === "base") {
    return `/images/patients/${folderName}/${emotion}.png`;
  }
  
  // Fallback to base for patients without emotion avatars
  return `/images/patients/${folderName}/base.png`;
}

/**
 * Generates a consistent avatar placeholder for patients based on their name
 *
 * Creates a colored circle with initials for patients who don't have profile images.
 * Uses a deterministic color selection based on the patient's name for consistency.
 *
 * @param name - The patient's name
 * @returns Object with background color and initials for the avatar
 */
function generatePatientAvatar(name: string): {
  colorClass: string;
  initials: string;
} {
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const finalInitials = initials.length > 0 ? initials : "P";

  const colorClasses = [
    "avatar-color-olive",
    "avatar-color-mustard",
    "avatar-color-violet",
    "avatar-color-teal",
    "avatar-color-coral",
    "avatar-color-slate",
    "avatar-color-amber",
    "avatar-color-emerald",
    "avatar-color-indigo",
    "avatar-color-rose",
    "avatar-color-cyan",
    "avatar-color-lime",
    "avatar-color-purple",
    "avatar-color-pink",
    "avatar-color-orange",
  ];

  const colorIndex =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colorClasses.length;
  const colorClass = colorClasses[colorIndex] ?? "avatar-color-default";

  return { colorClass, initials: finalInitials };
}

/**
 * ChatContent Component
 *
 * Interactive chat interface for therapy sessions with virtual patients.
 * Handles real-time messaging, message persistence, and patient interaction.
 *
 * Features:
 * - Real-time chat with virtual patients
 * - Message history persistence
 * - Auto-scroll to latest messages
 * - Patient avatar generation
 * - Loading states and error handling
 * - Support for impersonation mode
 *
 * @param user - Current user information
 * @param impersonation - Optional impersonation context for admin users
 * @returns JSX element containing the chat interface
 */
export function ChatContent({ user, impersonation }: ChatContentProps) {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const stepId = parseInt(params.stepId as string);

  // Chat state management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionTime, setSessionTime] = useState(0); // Timer in seconds
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isAudioAnimating, setIsAudioAnimating] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<PatientEmotion>("base");
  const [previousEmotion, setPreviousEmotion] = useState<PatientEmotion>("base");
  const [isAvatarTransitioning, setIsAvatarTransitioning] = useState(false);
  const [isCurrentAvatarLoaded, setIsCurrentAvatarLoaded] = useState(true);
  const transitionDurationMs = 700;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const avatarTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch patient data
  const {
    data: selectedPatient,
    isLoading: patientLoading,
    error: patientError,
  } = api.patients.getPatientById.useQuery(
    { id: sessionId },
    { enabled: Boolean(sessionId) },
  );

  // Fetch therapy session data
  const { data: therapySession, isLoading: therapySessionLoading } =
    api.therapySessions.getByPatient.useQuery(
      { patientId: sessionId },
      { enabled: Boolean(sessionId) },
    );

  // Get existing chat for this step
  const { data: existingChat, isLoading: chatLoading } =
    api.chat.getChatStep.useQuery(
      {
        therapySessionId: therapySession?.id ?? "",
        stepNumber: stepId,
      },
      { enabled: Boolean(therapySession?.id) },
    );

  // Get all completed chat steps for this therapy session
  const { data: completedSteps, isLoading: completedStepsLoading } =
    api.chat.getSessionChats.useQuery(
      { therapySessionId: therapySession?.id ?? "" },
      { enabled: Boolean(therapySession?.id) },
    );

  // Type assertions for API responses
  const typedSelectedPatient = selectedPatient as PatientData | undefined;
  const typedTherapySession = therapySession as TherapySessionData | undefined;
  const typedExistingChat = existingChat as ChatStepData | undefined;
  const typedCompletedSteps = completedSteps as CompletedStepData[] | undefined;

  // Mutations for chat operations
  const saveChatMutation = api.chat.saveChatStep.useMutation();
  const markStepDoneMutation = api.chat.markStepDone.useMutation();

  // Get utils for invalidating queries
  const utils = api.useUtils();

  // Memoize patient avatar to avoid recalculation on each render
  const patientAvatar = useMemo(
    () =>
      typedSelectedPatient
        ? generatePatientAvatar(typedSelectedPatient.name)
        : { colorClass: "avatar-color-default", initials: "P" },
    [typedSelectedPatient],
  );

  // Check if current step is completed
  const isStepCompleted = useMemo(() => {
    if (!typedCompletedSteps) return false;
    return typedCompletedSteps.some(
      (step) => step.stepNumber === stepId && step.done,
    );
  }, [typedCompletedSteps, stepId]);

  // Removed auto-scroll to prevent avatar from jumping
  // Manual scroll is handled in handleSendMessage and other places

  // Animate audio only when patient message arrives (not during typing)
  useEffect(() => {
    if (!isAudioPlayerOpen || messages.length === 0) return;
    
    // Get the last message
    const lastMessage = messages[messages.length - 1];
    
    // Only animate if the last message is from the patient
    if (lastMessage && lastMessage.sender === "patient") {
      setIsAudioAnimating(true);
      
      // Stop animation after 3 seconds
      const timer = setTimeout(() => {
        setIsAudioAnimating(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [messages, isAudioPlayerOpen]);

  // Scroll chat when audio player opens to avoid overlaps
  useEffect(() => {
    if (isAudioPlayerOpen) {
      // Wait for the audio player to render, then scroll
      setTimeout(() => {
        // Use the helper to ensure we scroll only the messages container
        scrollToBottom(100);
      }, 100);
    }
  }, [isAudioPlayerOpen]);

  // Timer effect
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
      if (avatarFallbackTimeoutRef.current) {
        clearTimeout(avatarFallbackTimeoutRef.current);
        avatarFallbackTimeoutRef.current = null;
      }
    };
  }, []);

  // Initialize chat with existing data or welcome message
  useEffect(() => {
    if (typedExistingChat && typedExistingChat.messages.length > 0) {
      // Convert string timestamps to Date objects
      const messagesWithDates = typedExistingChat.messages.map((msg) => ({
        ...msg,
        timestamp:
          typeof msg.timestamp === "string"
            ? new Date(msg.timestamp)
            : msg.timestamp,
      }));
      setMessages(messagesWithDates);
      
      // Find the last patient message with an emotion to set the current avatar
      const lastPatientMessage = [...messagesWithDates]
        .reverse()
        .find((msg) => msg.sender === "patient" && msg.emotion);
      
      if (lastPatientMessage?.emotion) {
        setCurrentEmotion(lastPatientMessage.emotion);
      }
    } else if (typedSelectedPatient && !chatLoading && !typedExistingChat) {
      const patientName = typedSelectedPatient.name || "";
      const welcomeContent =
        WELCOME_MESSAGES[patientName] ||
        `Ciao! Sono ${patientName}. Sono qui per aiutarti a esplorare la sessione ${stepId} del nostro percorso terapeutico. Come posso aiutarti oggi?`;

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
    }
  }, [typedExistingChat, typedSelectedPatient, stepId, chatLoading]);

  // Scroll to bottom helper function (smooth scroll to avoid avatar jumping)
  const scrollToBottom = useCallback((delay = 100) => {
    setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, delay);
  }, []);

  // Generate random patient response with emotion
  const getPatientResponse = useCallback(
    (patientName: string): PatientResponse => {
      const responses = PATIENT_RESPONSES[patientName] || GENERIC_RESPONSES;
      return (
        responses[Math.floor(Math.random() * responses.length)] ||
        { message: "Mi dispiace, non riesco a rispondere in questo momento.", emotion: "base" }
      );
    },
    [],
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isTyping || !typedTherapySession) return;

    const messageText = inputMessage.trim();
    setInputMessage(""); // Clear input immediately

    // Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: messageText,
      sender: "user",
      timestamp: new Date(),
      stepId,
    };

    // Add user message to chat immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Force immediate scroll to show user message
    scrollToBottom(50);

    // Show typing indicator after user message is visible
    setTimeout(() => {
      setIsTyping(true);
      scrollToBottom(50);
    }, 200);

    // Save user message to database
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

    // Generate patient response after delay
    setTimeout(
      () => {
        const patientName = typedSelectedPatient?.name || "";
        const patientResponse = getPatientResponse(patientName);

        // Update current emotion with smooth crossfade transition
        if (patientResponse.emotion !== currentEmotion) {
          // Save current emotion as previous and set next
          setPreviousEmotion(currentEmotion);
          setCurrentEmotion(patientResponse.emotion);

          // Start transition only after the new image has loaded to avoid flicker
          setIsCurrentAvatarLoaded(false);

          // Clear previous timers
          if (avatarTransitionTimeoutRef.current) {
            clearTimeout(avatarTransitionTimeoutRef.current);
          }
          if (avatarFallbackTimeoutRef.current) {
            clearTimeout(avatarFallbackTimeoutRef.current);
          }

          // Fallback: if onLoad doesn't fire quickly, still transition after a delay
          avatarFallbackTimeoutRef.current = setTimeout(() => {
            setIsAvatarTransitioning(true);
            avatarTransitionTimeoutRef.current = setTimeout(() => {
              setPreviousEmotion(patientResponse.emotion);
              setIsAvatarTransitioning(false);
            }, transitionDurationMs + 50);
          }, 150);

          // onLoad handler (attached below) will clear this fallback and run
          // the same transition with precise timing
        }

        const patientMessage: ChatMessage = {
          id: `patient-${Date.now()}`,
          content: patientResponse.message,
          sender: "patient",
          timestamp: new Date(),
          stepId,
          emotion: patientResponse.emotion,
        };

        // Add patient response
        const finalMessages = [...updatedMessages, patientMessage];
        setMessages(finalMessages);
        setIsTyping(false);

        // Force scroll to show patient response
        scrollToBottom(100);

        // Save complete conversation
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
      },
      2000 + Math.random() * 2000,
    ); // 2-4 seconds delay
  }, [
    inputMessage,
    isTyping,
    typedTherapySession,
    stepId,
    messages,
    scrollToBottom,
    getPatientResponse,
    typedSelectedPatient,
    saveChatMutation,
    currentEmotion,
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

      // Invalidate queries to refresh the timeline
      await utils.chat.getSessionChats.invalidate({
        therapySessionId: typedTherapySession.id,
      });

      // Show success dialog
      setIsSuccessDialogOpen(true);
    } catch (error) {
      console.error("Error completing step:", error);

      // More specific error handling
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

  // Memoize loading state
  const isLoading = useMemo(
    () =>
      patientLoading ||
      therapySessionLoading ||
      chatLoading ||
      completedStepsLoading,
    [patientLoading, therapySessionLoading, chatLoading, completedStepsLoading],
  );

  // Memoize current date string
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
    >
      <div
        className="chat-container page-background flex h-[calc(100vh-4rem)] flex-col"
        role="main"
        aria-label="Chat con paziente virtuale"
      >
        {/* Header */}
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
              <div className="pill bg-primary-green text-white px-2 py-1 sm:px-3">
                <span className="text-sm font-medium">
                  {formatSessionTime(sessionTime)}
                </span>
              </div>
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

        {/* Messages */}
        <div className="page-background flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 justify-center lg:justify-start lg:gap-6">
            {/* Patient Avatar - Left area */}
            <div className="hidden lg:flex flex-col items-start justify-start w-48 flex-shrink-0 pt-4">
              <div className="flex items-center justify-center w-full sticky top-4">
                <div className="therapy-session-avatar-large relative group rounded-[1.1rem] overflow-hidden">
                  {typedSelectedPatient ? (
                    <div className="relative w-full h-full">
                      {/* Show only one image when emotions are the same (normal state) */}
                      {previousEmotion === currentEmotion ? (
                          <Image
                          src={getPatientAvatarPath(typedSelectedPatient.name, currentEmotion)}
                          alt={`Avatar di ${typedSelectedPatient.name} - ${currentEmotion}`}
                          width={100}
                          height={100}
                            className="rounded-[1.1rem] object-cover shadow-lg w-full h-full"
                        />
                      ) : (
                        <>
                          {/* Previous emotion image (visible at start, then fades out) */}
                          <Image
                            src={getPatientAvatarPath(typedSelectedPatient.name, previousEmotion)}
                            alt={`Avatar precedente di ${typedSelectedPatient.name}`}
                            width={100}
                            height={100}
                            className="rounded-[1.1rem] object-cover shadow-lg w-full h-full absolute inset-0"
                            style={{ 
                              zIndex: 1,
                              opacity: isAvatarTransitioning ? 0 : 1,
                              transition: `opacity ${transitionDurationMs}ms ease-in-out`
                            }}
                          />
                          {/* Current emotion image (invisible at start, then fades in) */}
                          <Image
                            src={getPatientAvatarPath(typedSelectedPatient.name, currentEmotion)}
                            alt={`Avatar di ${typedSelectedPatient.name} - ${currentEmotion}`}
                            width={100}
                            height={100}
                            className="rounded-[1.1rem] object-cover shadow-lg w-full h-full absolute inset-0"
                            style={{ 
                              zIndex: 2,
                              opacity: isAvatarTransitioning ? 1 : 0,
                              transition: `opacity ${transitionDurationMs}ms ease-in-out`
                            }}
                            onLoad={() => {
                              // Start transition when image is ready
                              if (!isCurrentAvatarLoaded) {
                                setIsCurrentAvatarLoaded(true);
                                setIsAvatarTransitioning(true);
                                if (avatarFallbackTimeoutRef.current) {
                                  clearTimeout(avatarFallbackTimeoutRef.current);
                                  avatarFallbackTimeoutRef.current = null;
                                }

                                if (avatarTransitionTimeoutRef.current) {
                                  clearTimeout(avatarTransitionTimeoutRef.current);
                                }

                                avatarTransitionTimeoutRef.current = setTimeout(() => {
                                  setPreviousEmotion(currentEmotion);
                                  setIsAvatarTransitioning(false);
                                }, transitionDurationMs + 50);
                              }
                            }}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`flex h-25 w-25 items-center justify-center rounded-[1.1rem] font-bold text-white text-3xl shadow-lg ${patientAvatar?.colorClass || "avatar-color-default"}`}
                    >
                      {patientAvatar?.initials}
                    </div>
                  )}
                  {/* Expand icon */}
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
            </div>

            {/* Messages area (scrollable) */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 w-full lg:max-w-4xl p-4 sm:p-6 overflow-y-auto min-h-0 chat-scrollbar"
              style={{
                paddingBottom: isAudioPlayerOpen ? "10rem" : undefined,
              }}
            >
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
                      {/* Message bubble */}
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

                <div ref={messagesEndRef} />
              </div>
            </div>

          </div>
        </div>

        {/* Input - Only show if step is not completed */}
        {!isStepCompleted && (
          <div className="flex-shrink-0 p-4 sm:p-6">
            <div className="mx-auto max-w-4xl">
              <div className="relative">
                {/* Audio Player - appears above input */}
                {isAudioPlayerOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-3 rounded-lg bg-[var(--color-card-background)] p-4 shadow-lg border border-[var(--color-border)]">
                    <div className="flex items-center justify-end mb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAudioPlayerOpen(false)}
                        className="h-6 w-6 p-0 hover:bg-[var(--color-primary-green)]/10"
                        aria-label="Chiudi audio player"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Audio Waveform Visualization */}
                    <div className="flex items-center justify-between w-full space-x-1 h-20 px-4">
                      {[...Array(80)].map((_, i) => {
                        // Create more dynamic wave patterns
                        const baseHeight = 4; // Flat when not animating
                        const animatedHeight = 15 + (Math.sin(i * 0.4) * 25) + (Math.cos(i * 0.2) * 15);
                        
                        return (
                          <div
                            key={i}
                            className="w-1 rounded-full transition-all duration-300"
                            style={{
                              height: isAudioAnimating
                                ? `${animatedHeight}px`
                                : `${baseHeight}px`,
                              background: isAudioAnimating
                                ? "linear-gradient(135deg, var(--color-chat-bubble-patient), var(--color-primary-green))"
                                : "rgba(236, 236, 236, 0.2)",
                              animation: isAudioAnimating
                                ? `audioWave 0.8s ease-in-out infinite ${i * 0.03}s`
                                : "none",
                              transformOrigin: "center",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 sm:space-x-3">
                  <div className="relative flex-1">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Inizia la conversazione"
                      disabled={isTyping}
                      className="flex-1 text-sm sm:text-base pr-10 h-11"
                      aria-label="Messaggio da inviare"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAudioPlayerOpen(!isAudioPlayerOpen)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${
                        isAudioPlayerOpen 
                          ? "bg-[var(--color-primary-green)]/20 hover:bg-[var(--color-primary-green)]/30" 
                          : "hover:bg-[var(--color-primary-green)]/10"
                      }`}
                      aria-label={isAudioPlayerOpen ? "Chiudi audio" : "Apri audio"}
                    >
                      <Mic className={`h-4 w-4 ${isAudioPlayerOpen ? "text-[var(--color-primary-green)]" : ""}`} />
                    </Button>
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
          </div>
        )}

        {/* Session completed message */}
        {isStepCompleted && (
          <div className="navbar-background flex-shrink-0 p-6">
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

      {/* Success Dialog */}
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

      {/* Avatar Expanded Dialog */}
      <Dialog open={isAvatarExpanded} onOpenChange={setIsAvatarExpanded}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Avatar del paziente {typedSelectedPatient?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {typedSelectedPatient ? (
              <Image
                src={getPatientAvatarPath(typedSelectedPatient.name, currentEmotion)}
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
