
import type { User, ImpersonationContext } from "~/types";
import type { PatientEmotion } from "./chat-constants";
import type { ResponseMetadata } from "~/server/services/patient-response-generator";

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date | string;
  stepId: number;
  emotion?: PatientEmotion;
  metadata?: ResponseMetadata;
}

export interface PatientData {
  id: string;
  name: string;
  smallDescription: string;
  details: string;
  background: string;
  objectives: string[];
  avatarUrl: string | null;
  elevenlabsVoiceId: string | null;
  vibevoiceVoiceId: string | null;
  welcomeMessage: string | null;
  difficulty: number;
  estimatedDuration: number;
  isActive: boolean;
  externalPatientId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TherapySessionData {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatStepData {
  id: string;
  therapySessionId: string;
  stepNumber: number;
  messages: ChatMessage[];
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContentProps {
  user: User;
  impersonation?: ImpersonationContext;
}

