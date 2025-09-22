"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "~/trpc/react";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ArrowLeft, Send, User, Bot } from "lucide-react";

interface ChatContentProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    image?: string | null;
  };
  impersonation?: {
    impersonatedUserId: string;
    impersonatedUserName: string;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date;
  stepId: number;
}

/**
 * Generates a consistent avatar placeholder for patients based on their name
 * 
 * Creates a colored circle with initials for patients who don't have profile images.
 * Uses a deterministic color selection based on the patient's name for consistency.
 * 
 * @param name - The patient's name
 * @returns CSS background style string for the avatar
 */
function generatePatientAvatar(name: string): string {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
    '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548'
  ];
  
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const backgroundColor = colors[colorIndex] || colors[0];

  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" fill="${backgroundColor}" rx="20"/>
      <text x="20" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
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
  const [isLoading, setIsLoading] = useState(false);
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
  const {
    data: therapySession,
    isLoading: therapySessionLoading,
  } = api.therapySessions.getByPatient.useQuery(
    { patientId: sessionId },
    { enabled: Boolean(sessionId) },
  );

  // Get existing chat for this step
  const {
    data: existingChat,
    isLoading: chatLoading,
  } = api.chat.getChatStep.useQuery(
    { 
      therapySessionId: therapySession?.id ?? "", 
      stepNumber: stepId 
    },
    { enabled: Boolean(therapySession?.id) },
  );

  // Mutations for chat operations
  const saveChatMutation = api.chat.saveChatStep.useMutation();
  const markStepDoneMutation = api.chat.markStepDone.useMutation();
  
  // Get utils for invalidating queries
  const utils = api.useUtils();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize chat with existing data or welcome message
  useEffect(() => {
    if (existingChat && existingChat.messages.length > 0) {
      setMessages(existingChat.messages);
    } else if (selectedPatient && messages.length === 0 && !chatLoading) {
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        content: `Ciao! Sono ${selectedPatient.name}. Sono qui per aiutarti a esplorare la sessione ${stepId} del nostro percorso terapeutico. Come posso aiutarti oggi?`,
        sender: "patient",
        timestamp: new Date(),
        stepId,
      };
      setMessages([welcomeMessage]);
    }
  }, [existingChat, selectedPatient, stepId, messages.length, chatLoading]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !therapySession) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage.trim(),
      sender: "user",
      timestamp: new Date(),
      stepId,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage("");
    setIsLoading(true);

    // Save user message immediately
    try {
      await saveChatMutation.mutateAsync({
        therapySessionId: therapySession.id,
        stepNumber: stepId,
        messages: newMessages,
      });
    } catch (error) {
      console.error("Error saving chat:", error);
    }

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        "Interessante punto di vista. Puoi elaborare ulteriormente?",
        "Capisco la tua preoccupazione. Come ti senti riguardo a questo?",
        "È un aspetto importante da considerare. Cosa pensi che potremmo fare?",
        "Grazie per aver condiviso questo con me. Vuoi parlarne di più?",
        "Mi sembra che stai facendo progressi. Continua così!",
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const patientMessage: ChatMessage = {
        id: `patient-${Date.now()}`,
        content: randomResponse,
        sender: "patient",
        timestamp: new Date(),
        stepId,
      };

      const finalMessages = [...newMessages, patientMessage];
      setMessages(finalMessages);
      setIsLoading(false);

      // Save complete conversation
      saveChatMutation.mutate({
        therapySessionId: therapySession.id,
        stepNumber: stepId,
        messages: finalMessages,
      });
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const goBack = () => {
    router.push(`/therapeutic-journey/${sessionId}`);
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
      alert(`Step ${stepId} completato con successo!`);
      goBack();
    } catch (error) {
      console.error("Error completing step:", error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes("not found") || error.message.includes("access denied")) {
          alert("Sessione non trovata o accesso negato. Ricarica la pagina e riprova.");
        } else {
          alert(`Errore nel completare lo step: ${error.message}`);
        }
      } else {
        alert("Errore nel completare lo step. Riprova.");
      }
    }
  };

  if (patientLoading || therapySessionLoading || chatLoading) {
    return (
      <SharedLayout user={user} impersonation={impersonation} layoutType="dashboard">
        <div 
          className="flex h-screen items-center justify-center"
          style={{ backgroundColor: 'var(--surface-primary)' }}
        >
          <div className="text-center">
            <LoadingSkeleton className="h-8 w-64 mb-4" />
            <p style={{ color: 'var(--text-tertiary)' }}>Caricamento chat...</p>
          </div>
        </div>
      </SharedLayout>
    );
  }

  if (patientError || !selectedPatient) {
    return (
      <SharedLayout user={user} impersonation={impersonation} layoutType="dashboard">
        <div 
          className="flex h-screen items-center justify-center"
          style={{ backgroundColor: 'var(--surface-primary)' }}
        >
          <div className="text-center">
            <h2 
              className="text-heading-2 mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Paziente non trovato
            </h2>
            <p 
              className="text-body-lg mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              Il paziente richiesto non è disponibile.
            </p>
            <Button 
              onClick={goBack} 
              style={{
                backgroundColor: 'var(--color-primary-500)',
                color: 'white',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
              }}
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
    <SharedLayout user={user} impersonation={impersonation} layoutType="dashboard">
      <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--surface-primary)' }}>
        {/* Header */}
        <div 
          className="border-b px-6 py-4 shadow-sm" 
          style={{ 
            backgroundColor: 'var(--surface-secondary)', 
            borderColor: 'var(--border-primary)' 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="hover:bg-opacity-10"
                style={{ 
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 
                  className="text-heading-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Chat con {selectedPatient.name}
                </h1>
                <p 
                  className="text-body-sm"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Sessione {stepId} - {selectedPatient.diagnosis}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: 'var(--surface-primary)' }}
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
                  className={`flex max-w-xs space-x-3 ${
                    message.sender === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden">
                    {message.sender === "user" ? (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: 'var(--color-user-500)',
                          color: 'white'
                        }}
                      >
                        <User className="h-5 w-5" />
                      </div>
                    ) : (
                      <Image
                        src={selectedPatient.avatarUrl || generatePatientAvatar(selectedPatient.name)}
                        alt={`Avatar di ${selectedPatient.name}`}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                        style={{ width: '40px', height: '40px' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = generatePatientAvatar(selectedPatient.name);
                        }}
                      />
                    )}
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{
                      backgroundColor: message.sender === "user" 
                        ? 'var(--color-user-500)' 
                        : 'var(--surface-secondary)',
                      color: message.sender === "user" 
                        ? 'white' 
                        : 'var(--text-primary)',
                      border: message.sender === "user" 
                        ? 'none' 
                        : `1px solid var(--border-primary)`,
                      boxShadow: message.sender === "user" 
                        ? 'none' 
                        : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <p className="text-body" style={{ color: 'inherit' }}>{message.content}</p>
                    <p
                      className="mt-2 text-caption"
                      style={{ 
                        color: message.sender === "user" 
                          ? 'rgba(255, 255, 255, 0.7)' 
                          : 'var(--text-tertiary)' 
                      }}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden">
                    <Image
                      src={selectedPatient.avatarUrl || generatePatientAvatar(selectedPatient.name)}
                      alt={`Avatar di ${selectedPatient.name}`}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      style={{ width: '40px', height: '40px' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = generatePatientAvatar(selectedPatient.name);
                      }}
                    />
                  </div>
                  <div 
                    className="rounded-lg px-4 py-3"
                    style={{ 
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border-primary)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex space-x-1">
                      <div 
                        className="h-2 w-2 animate-bounce rounded-full"
                        style={{ backgroundColor: 'var(--text-tertiary)' }}
                      ></div>
                      <div 
                        className="h-2 w-2 animate-bounce rounded-full"
                        style={{ 
                          backgroundColor: 'var(--text-tertiary)',
                          animationDelay: "0.1s" 
                        }}
                      ></div>
                      <div 
                        className="h-2 w-2 animate-bounce rounded-full"
                        style={{ 
                          backgroundColor: 'var(--text-tertiary)',
                          animationDelay: "0.2s" 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div 
          className="border-t p-6"
          style={{ 
            backgroundColor: 'var(--surface-secondary)', 
            borderColor: 'var(--border-primary)' 
          }}
        >
          <div className="mx-auto max-w-4xl">
            <div className="flex space-x-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scrivi un messaggio..."
                disabled={isLoading}
                className="flex-1"
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6"
                style={{
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
                  }
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Complete Step Button */}
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleCompleteStep}
                disabled={markStepDoneMutation.isPending}
                className="px-8 py-2"
                style={{
                  backgroundColor: 'var(--color-success-500)',
                  color: 'white',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-success-600)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-success-500)';
                  }
                }}
              >
                {markStepDoneMutation.isPending ? "Completando..." : "Fine"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SharedLayout>
  );
}