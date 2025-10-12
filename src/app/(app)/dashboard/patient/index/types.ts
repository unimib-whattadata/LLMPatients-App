export interface AdminPatientSummary {
  id: string;
  name: string;
  age: number;
  smallDescription: string;
  difficulty: number;
  estimatedDuration: number;
  isActive: boolean;
  createdAt: Date | string | null;
}

export interface AdminPatientDetail extends AdminPatientSummary {
  details: string;
  background: string;
  objectives: string[];
  avatarUrl?: string | null;
  voiceId?: string | null;
  welcomeMessage?: string | null;
  therapeuticJourney: unknown;
  externalPatientId?: string | null;
  updatedAt: Date | string | null;
}

