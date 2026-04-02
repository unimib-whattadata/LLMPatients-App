export type PatientData = {
  id: string;
  name: string;
  smallDescription: string;
  details: string;
  background: string;
  objectives: string[];
  avatarUrl: string | null;
  difficulty: number;
  estimatedDuration: number;
  isActive: boolean;
  externalPatientId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TherapySessionData = {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  isCompleted: boolean;
  externalPatientId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CompletedStepData = {
  id: string;
  therapySessionId: string;
  stepNumber: number;
  messages: {
    id: string;
    content: string;
    sender: "user" | "patient";
    timestamp: Date | string;
    stepId: number;
  }[];
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};
