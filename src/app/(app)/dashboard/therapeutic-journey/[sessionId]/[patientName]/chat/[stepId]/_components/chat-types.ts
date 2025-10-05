
import type { User, ImpersonationContext } from "~/types";
import type { PatientEmotion } from "./chat-constants";

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patient";
  timestamp: Date | string;
  stepId: number;
  emotion?: PatientEmotion;
}

export interface PatientData {
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

