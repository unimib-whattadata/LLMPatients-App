export type PatientEmotion =
  | "SEEKING"
  | "RAGE"
  | "FEAR"
  | "CARE"
  | "LUST"
  | "PANIC_GRIEF"
  | "SADNESS"
  | "PLAY"
  | "base";

export type ResponseStatus = "success" | "error";

export type ServiceType = "mock" | "real";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface EmotionSnapshot {
  dominant: string;
  intensity: number;
  vector: Record<string, number>;
  event?: string | null;
  salience?: number | null;
  description: string;
}

export interface EmotionTimelinePoint {
  turn_index: number;
  timestamp: string;
  emotion: string;
  intensity: number;
}

export interface ResponseMetadata {
  apiType: "MOCK" | "REAL";
  endpoint?: string;
  requestData?: {
    patientId?: string;
    patientName?: string;
    userMessage?: string;
    sessionId?: string;
    stepId?: number;
    externalPatientId?: string;
    therapistId?: string;
  };
  responseData?: {
    message?: string;
    emotion?: string;
    topic?: string;
    reasoningTime?: number;
    status?: string;
    code?: string;
    externalPatientId?: string;
    patientName?: string | null;
    avatarUrl?: string | null;
    emotionSnapshot?: EmotionSnapshot | null;
    emotionTimeline?: EmotionTimelinePoint[];
  };
  rawResponseJson?: string;
  duration?: number;
  timestamp: string;
}

export interface PatientResponse {
  message: string;
  emotion: PatientEmotion;
  timestamp?: Date;
  metadata?: ResponseMetadata;
}

export interface PatientInitializationResponse {
  status: ResponseStatus;
  code: string;
  external_patient_id?: string;
  message: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  reasoning_time: number;
  emotion: PatientEmotion;
  topic: string;
  timestamp: string;
  patient_name?: string | null;
  avatar_url?: string | null;
  emotion_snapshot?: EmotionSnapshot | null;
  emotion_timeline?: EmotionTimelinePoint[];
  metadata?: ResponseMetadata;
}

export interface ChatRequest {
  external_patient_id: string;
  user_message: string;
  session_id: string;
  step_id: number;
  therapist_id: string;
}

export interface FinalizeSessionInput {
  external_patient_id: string;
  session_id: string;
  therapist_id: string;
}

export interface SessionFinalizationResponse {
  status: "finalized" | "not_found" | "error";
  message: string;
  timestamp: string;
}

export interface PatientInfo {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  difficulty: number;
  psychologicalProfile: string;
  background: string;
  currentMedications?: string[];
  therapyGoals?: string[];
  previousSessions?: number;
}

export interface GenerateResponseInput {
  patientInfo: PatientInfo;
  userMessage: string;
  stepId: number;
  sessionId: string;
  conversationHistory?: Array<{
    content: string;
    sender: "user" | "patient";
    timestamp: Date;
  }>;
}

export interface InitializePatientInput {
  patientInfo: PatientInfo;
  sessionId: string;
}

export interface ExternalAIService {
  generateResponse(input: GenerateResponseInput): Promise<PatientResponse>;
  initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse>;
  generateChatResponse(input: ChatRequest): Promise<ChatResponse>;
  finalizeSession(
    input: FinalizeSessionInput,
  ): Promise<SessionFinalizationResponse>;
}

