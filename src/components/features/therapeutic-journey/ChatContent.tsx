"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "~/trpc/react";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatTypingIndicator } from "@/components/ui/TypingIndicator";
import { LoadingSpinner } from "@/components/ui";
import { ArrowLeft, Send, User as UserIcon } from "lucide-react";
import { createPatientSlug } from "~/lib/utils/slugify";
import type { User, ImpersonationContext } from "~/types";

interface ChatContentProps {
  user: User;
  impersonation?: ImpersonationContext;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date | string;
  stepId: number;
}

/**
 * Safely formats a timestamp to locale time string
 * @param timestamp - Date object or string timestamp
 * @returns Formatted time string
 */
function formatTimestamp(timestamp: Date | string): string {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Formats session time in MM:SS format
 * @param seconds - Number of seconds
 * @returns Formatted time string
 */
function formatSessionTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
function generatePatientAvatar(name: string): { backgroundColor: string; initials: string } {
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  const finalInitials = initials.length > 0 ? initials : "P";

  const colors = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];

  const colorIndex =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  const backgroundColor = colors[colorIndex] ?? colors[0] ?? "";

  return { backgroundColor, initials: finalInitials };
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Mutations for chat operations
  const saveChatMutation = api.chat.saveChatStep.useMutation();
  const markStepDoneMutation = api.chat.markStepDone.useMutation();

  // Get utils for invalidating queries
  const utils = api.useUtils();

  // Generate patient avatar data once
  const patientAvatar = selectedPatient ? generatePatientAvatar(selectedPatient.name) : { backgroundColor: "", initials: "P" };

  // Check if current step is completed
  const isStepCompleted = useMemo(() => {
    if (!completedSteps) return false;
    return completedSteps.some(
      (step) => step.stepNumber === stepId && step.done,
    );
  }, [completedSteps, stepId]);

  // Auto-scroll to bottom when new messages arrive or typing state changes
  useEffect(() => {
    // Use a small delay to ensure DOM is updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages, isTyping]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize chat with existing data or welcome message
  useEffect(() => {
    if (existingChat && existingChat.messages.length > 0) {
      // Convert string timestamps to Date objects
      const messagesWithDates = existingChat.messages.map(msg => ({
        ...msg,
        timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
      }));
      setMessages(messagesWithDates);
    } else if (selectedPatient && !chatLoading && !existingChat) {
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        content: `Ciao! Sono ${selectedPatient.name || 'il tuo paziente'}. Sono qui per aiutarti a esplorare la sessione ${stepId} del nostro percorso terapeutico. Come posso aiutarti oggi?`,
        sender: "patient",
        timestamp: new Date(),
        stepId,
      };
      setMessages([welcomeMessage]);
    }
  }, [existingChat, selectedPatient, stepId, chatLoading]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping || !therapySession) return;

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
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    // Show typing indicator after user message is visible
    setTimeout(() => {
      setIsTyping(true);
      // Scroll to show typing indicator
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }, 200);

    // Save user message to database
    try {
      await saveChatMutation.mutateAsync({
        therapySessionId: therapySession.id,
        stepNumber: stepId,
        messages: updatedMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
        })),
      });
    } catch (error) {
      console.error("Error saving user message:", error);
    }

    // Generate patient response after delay
    setTimeout(() => {
      const responses = [
        "Interessante punto di vista. Puoi elaborare ulteriormente?",
        "Capisco la tua preoccupazione. Come ti senti riguardo a questo?",
        "È un aspetto importante da considerare. Cosa pensi che potremmo fare?",
        "Grazie per aver condiviso questo con me. Vuoi parlarne di più?",
        "Mi sembra che stai facendo progressi. Continua così!",
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)] || 
        "Mi dispiace, non riesco a rispondere in questo momento.";

      const patientMessage: ChatMessage = {
        id: `patient-${Date.now()}`,
        content: randomResponse,
        sender: "patient",
        timestamp: new Date(),
        stepId,
      };

      // Add patient response
      const finalMessages = [...updatedMessages, patientMessage];
      setMessages(finalMessages);
      setIsTyping(false);
      
      // Force scroll to show patient response
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      // Save complete conversation
      saveChatMutation.mutate({
        therapySessionId: therapySession.id,
        stepNumber: stepId,
        messages: finalMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
        })),
      });
    }, 2000 + Math.random() * 2000); // 2-4 seconds delay
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSendMessage();
    }
  };

  const goBack = () => {
    if (selectedPatient) {
      const patientSlug = createPatientSlug(selectedPatient.name);
      router.push(`/dashboard/therapeutic-journey/${sessionId}/${patientSlug}`);
    } else {
      router.push(`/dashboard/therapeutic-journey`);
    }
  };

  const handleCompleteStep = async () => {
    if (!therapySession) return;

    try {
      await markStepDoneMutation.mutateAsync({
        therapySessionId: therapySession.id,
        stepNumber: stepId,
      });

      // Invalidate queries to refresh the timeline
      await utils.chat.getSessionChats.invalidate({
        therapySessionId: therapySession.id,
      });

      // Show success message or redirect
      alert(`Sessione ${stepId} completata con successo!`);
      goBack();
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
  };

  if (patientLoading || therapySessionLoading || chatLoading || completedStepsLoading) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
      >
        <LoadingSpinner message="Loading chat..." fullScreen={true} />
      </SharedLayout>
    );
  }

  if (patientError || !selectedPatient) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
      >
        <div
          className="flex items-center justify-center chat-error-container"
        >
          <div className="text-center">
            <h2
              className="text-heading-2 mb-4"
            >
              Paziente non trovato
            </h2>
            <p
              className="text-body-lg mb-6"
            >
              Il paziente richiesto non è disponibile.
            </p>
            <Button
              onClick={goBack}
            >
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
        className="flex flex-col chat-container"
      >
        {/* Header */}
        <div
          className="border-b px-6 py-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className=""
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "";
                  e.currentTarget.style.backgroundColor = "";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1
                  className="text-heading-3"
                >
                  Sessione {stepId} - {new Date().toLocaleDateString('it-IT')}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className="rounded-lg px-3 py-1"
              >
                <span className="text-sm font-medium">
                  {formatSessionTime(sessionTime)}
                </span>
              </div>
              {!isStepCompleted && (
                <Button
                  onClick={handleCompleteStep}
                  disabled={markStepDoneMutation.isPending}
                  className="px-4 py-2"
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = "";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = "";
                    }
                  }}
                >
                  {markStepDoneMutation.isPending ? "Completando..." : "Fine"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-6"
        >
          <div className="mx-auto max-w-4xl space-y-6">
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
                  {/* Avatar only for patient messages */}
                  {message.sender === "patient" && (
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full flex-shrink-0">
                      {selectedPatient.avatarUrl ? (
                        <Image
                          src={selectedPatient.avatarUrl}
                          alt={`Avatar di ${selectedPatient.name}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover chat-avatar-fixed-size"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full font-bold"
                        >
                          {patientAvatar?.initials}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div
                    className="rounded-lg px-4 py-3"
                  >
                    <p className="text-body">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <ChatTypingIndicator
                isVisible={true}
                avatarUrl={selectedPatient?.avatarUrl || undefined}
                patientName={selectedPatient?.name}
                avatarData={patientAvatar}
              />
            )}


            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - Only show if step is not completed */}
        {!isStepCompleted && (
          <div
            className="border-t p-6"
          >
            <div className="mx-auto max-w-4xl">
              <div className="flex space-x-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Inizia la conversazione"
                  disabled={isTyping}
                  className="flex-1"
                />
                <Button
                  onClick={() => void handleSendMessage()}
                  disabled={!inputMessage.trim() || isTyping}
                  className="px-6"
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = "";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = "";
                    }
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Session completed message */}
        {isStepCompleted && (
          <div
            className="border-t p-6"
          >
            <div className="mx-auto max-w-4xl text-center">
              <div
                className="rounded-lg px-4 py-3"
              >
                <p className="text-sm font-medium">
                  ✓ Sessione {stepId} completata - La conversazione è in modalità sola lettura
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SharedLayout>
  );
}
