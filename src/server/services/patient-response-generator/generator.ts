import { env } from "~/env";
import type {
  ExternalAIService,
  GenerateResponseInput,
  PatientResponse,
  InitializePatientInput,
  PatientInitializationResponse,
  ChatRequest,
  ChatResponse,
  FinalizeSessionInput,
  SessionFinalizationResponse,
} from "./types";
import { PatientResponseLogger } from "./logger";
import { generateRequestId } from "./utils";
import { ENHANCED_PATIENT_RESPONSES, buildEmotionSnapshot } from "./mock-data";
import { MockExternalAIService } from "./mock-service";
import { RealExternalAIService } from "./real-service";

export class PatientResponseGenerator {
  private externalAI: ExternalAIService;
  private useExternalAI: boolean;

  constructor(useExternalAI?: boolean) {
    // Use environment variable if not explicitly provided
    const shouldUseExternal = useExternalAI ?? env.API === "remote";

    this.useExternalAI = shouldUseExternal;
    
    this.externalAI = this.useExternalAI
      ? new RealExternalAIService()
      : new MockExternalAIService();
  }

  private async executeWithFallback<T>(
    method: string,
    serviceCall: () => Promise<T>,
    fallback: () => T,
    logData: {
      patientInfo?: { name?: string; age?: number; gender?: string };
      sessionId?: string;
      stepId?: number;
      userMessage?: string;
      conversationHistoryLength?: number;
      externalPatientId?: string;
    },
    responseMapper: (result: T) => Record<string, unknown>,
  ): Promise<T> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    PatientResponseLogger.logGeneratorCall(
      method,
      requestId,
      this.useExternalAI ? "REAL" : "MOCK",
      logData,
    );

    try {
      const result = await serviceCall();
      const duration = Date.now() - startTime;

      PatientResponseLogger.logGeneratorResponse(
        method,
        requestId,
        duration,
        responseMapper(result),
        "success",
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      PatientResponseLogger.logGeneratorError(
        method,
        requestId,
        duration,
        error,
        "Fallback",
      );

      const fallbackResult = fallback();
      const durationAfterFallback = Date.now() - startTime;

      PatientResponseLogger.logGeneratorResponse(
        method,
        requestId,
        durationAfterFallback,
        responseMapper(fallbackResult),
        "warning",
      );

      return fallbackResult;
    }
  }

  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    return this.executeWithFallback(
      "generateResponse",
      () => this.externalAI.generateResponse(input),
      () => {
        const fallbackResponses = ENHANCED_PATIENT_RESPONSES[input.patientInfo.name] || [
          {
            message: "I'm sorry, I'm not sure how to respond. Could you repeat that?",
            emotion: "base" as const,
          },
        ];

        const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
        const selectedResponse = fallbackResponses[randomIndex] ?? fallbackResponses[0]!;

        const fallbackResponseJson = JSON.stringify({
          message: selectedResponse.message,
          emotion: selectedResponse.emotion,
        }, null, 2);

        return {
          message: selectedResponse.message,
          emotion: selectedResponse.emotion,
          timestamp: new Date(),
          metadata: {
            apiType: "MOCK" as const,
            endpoint: "FALLBACK",
            requestData: {
              patientId: input.patientInfo.id,
              patientName: input.patientInfo.name,
              userMessage: input.userMessage,
              sessionId: input.sessionId,
              stepId: input.stepId,
            },
            responseData: {
              message: selectedResponse.message,
              emotion: selectedResponse.emotion,
            },
            rawResponseJson: fallbackResponseJson,
            timestamp: new Date().toISOString(),
          },
        };
      },
      {
        patientInfo: {
          name: input.patientInfo.name,
          age: input.patientInfo.age,
          gender: input.patientInfo.gender,
        },
        sessionId: input.sessionId,
        stepId: input.stepId,
        userMessage: input.userMessage,
        conversationHistoryLength: input.conversationHistory?.length,
      },
      (result) => ({
        message: result.message,
        emotion: result.emotion,
      }),
    );
  }

  setExternalAI(service: ExternalAIService): void {
    this.externalAI = service;
    this.useExternalAI = true;
  }

  setUseExternalAI(use: boolean): void {
    this.useExternalAI = use;
    // Reinitialize service if switching modes
    if (use) {
      this.externalAI = new RealExternalAIService();
    } else {
      this.externalAI = new MockExternalAIService();
    }
  }

  async initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse> {
    return this.executeWithFallback(
      "initializePatient",
      () => this.externalAI.initializePatient(input),
      () => ({
        status: "error" as const,
        code: "INITIALIZATION_FAILED",
        message: "Errore durante l'inizializzazione del paziente nel servizio esterno",
        timestamp: new Date().toISOString(),
      }),
      {
        patientInfo: {
          name: input.patientInfo.name,
          age: input.patientInfo.age,
          gender: input.patientInfo.gender,
        },
        sessionId: input.sessionId,
      },
      (result) => ({
        status: result.status,
        code: result.code,
        message: result.message,
        external_patient_id: result.external_patient_id,
      }),
    );
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    return this.executeWithFallback(
      "generateChatResponse",
      () => this.externalAI.generateChatResponse(input),
      () => {
        const fallbackTimestamp = new Date().toISOString();
        const fallbackSnapshot = buildEmotionSnapshot("base", 0.4);
        return {
          message: "I'm sorry, I'm not sure how to respond. Could you repeat that?",
          reasoning_time: 0,
          emotion: "base" as const,
          topic: "generale",
          timestamp: fallbackTimestamp,
          patient_name: null,
          avatar_url: null,
          emotion_snapshot: fallbackSnapshot,
          emotion_timeline: [],
          metadata: {
            apiType: "MOCK" as const,
            endpoint: "FALLBACK",
            requestData: {
              externalPatientId: input.external_patient_id,
              userMessage: input.user_message,
              sessionId: input.session_id,
              stepId: input.step_id,
            },
            responseData: {
              message: "I'm sorry, I'm not sure how to respond. Could you repeat that?",
              emotion: "base" as const,
              topic: "generale",
              reasoningTime: 0,
              patientName: null,
              avatarUrl: null,
              emotionSnapshot: fallbackSnapshot,
              emotionTimeline: [],
            },
            timestamp: fallbackTimestamp,
          },
        };
      },
      {
        externalPatientId: input.external_patient_id,
        sessionId: input.session_id,
        stepId: input.step_id,
        userMessage: input.user_message,
      },
      (result) => ({
        message: result.message,
        emotion: result.emotion,
        topic: result.topic,
        reasoning_time: result.reasoning_time,
      }),
    );
  }

  async finalizeSession(
    input: FinalizeSessionInput,
  ): Promise<SessionFinalizationResponse> {
    return this.executeWithFallback(
      "finalizeSession",
      () => this.externalAI.finalizeSession(input),
      () => ({
        status: "error" as const,
        message: "Unable to finalize external patient session.",
        timestamp: new Date().toISOString(),
      }),
      {
        externalPatientId: input.external_patient_id,
        sessionId: input.session_id,
      },
      (result) => ({
        status: result.status,
        message: result.message,
      }),
    );
  }
}

export const patientResponseGenerator = new PatientResponseGenerator();
