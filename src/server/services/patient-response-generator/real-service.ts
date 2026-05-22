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
import { PatientResponseLogger, LOG_CONFIG } from "./logger";
import { ExternalAIServiceError } from "./errors";
import {
  API_CONFIG,
  generateRequestId,
  createGenerateResponseBody,
  truncateMessage,
  parseGenerateResponse,
  parseEmotionSnapshot,
  parseEmotionTimeline,
  normalizeEmotion,
  fetchWithTimeout,
  combineUrls,
} from "./utils";

export class RealExternalAIService implements ExternalAIService {
  private readonly apiKey = env.EXTERNAL_AI_API_KEY;

  private getAuthHeaders(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  private async makeApiRequest<T>(
    endpoint: string,
    method: string,
    requestId: string,
    requestBody: unknown,
    timeout: number,
    logData: {
      patientInfo?: { id?: string; name?: string; age?: number; gender?: string };
      sessionInfo?: { sessionId?: string; stepId?: number; userMessage?: string };
    },
    parseResponse: (data: unknown) => T,
  ): Promise<{ result: T; rawJson: string }> {
    const startTime = Date.now();
    const apiUrl = combineUrls(API_CONFIG.BASE_URL, endpoint);

    PatientResponseLogger.logServiceCall(
      LOG_CONFIG.PREFIXES.REAL_AI,
      method,
      requestId,
      {
        url: apiUrl,
        payload: requestBody,
        ...logData,
      },
    );

    try {
      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: "POST",
          headers: {
            ...API_CONFIG.HEADERS,
            ...this.getAuthHeaders(),
          },
          body: JSON.stringify(requestBody),
        },
        timeout,
      );

      const duration = Date.now() - startTime;

      if (!response.ok) {
        let errorDetails = "";
        try {
          errorDetails = await response.text();
        } catch (e) {
          errorDetails = "(Could not read response body)";
        }
        const error = new Error(`HTTP ${response.status}: ${response.statusText}. Response body: ${errorDetails}`);
        PatientResponseLogger.logServiceError(
          LOG_CONFIG.PREFIXES.REAL_AI,
          method,
          requestId,
          duration,
          error,
          apiUrl,
        );
        throw new ExternalAIServiceError(
          `External AI API error: ${response.status} ${response.statusText}. Details: ${errorDetails}`,
          "real",
          requestId,
          response.status,
        );
      }

      const data = await response.json();
      const rawJson = JSON.stringify(data, null, 2);
      const result = parseResponse(data);

      PatientResponseLogger.logServiceResponse(
        LOG_CONFIG.PREFIXES.REAL_AI,
        method,
        requestId,
        duration,
        result as Record<string, unknown>,
        "success",
      );

      return { result, rawJson };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'TimeoutError') {
        PatientResponseLogger.logServiceError(
          LOG_CONFIG.PREFIXES.REAL_AI,
          method,
          requestId,
          duration,
          error,
          apiUrl,
        );
        throw new ExternalAIServiceError(
          `External AI API timeout: The request took longer than ${timeout}ms to complete`,
          "real",
          requestId,
          408, // Request Timeout status code
        );
      }
      
      // Handle abort errors (shouldn't happen with our improved fetchWithTimeout, but just in case)
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        PatientResponseLogger.logServiceError(
          LOG_CONFIG.PREFIXES.REAL_AI,
          method,
          requestId,
          duration,
          error,
          apiUrl,
        );
        throw new ExternalAIServiceError(
          `External AI API request was aborted: ${error.message}`,
          "real",
          requestId,
          408,
        );
      }
      
      // Handle other errors
      PatientResponseLogger.logServiceError(
        LOG_CONFIG.PREFIXES.REAL_AI,
        method,
        requestId,
        duration,
        error,
        apiUrl,
      );
      throw error;
    }
  }

  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    const requestId = generateRequestId();
    const requestBody = createGenerateResponseBody(input, API_CONFIG.IS_REMOTE);
    const startTime = Date.now();
    const apiUrl = combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.GENERATE_RESPONSE);

    const { result, rawJson } = await this.makeApiRequest<PatientResponse>(
      API_CONFIG.ENDPOINTS.GENERATE_RESPONSE,
      "generateResponse",
      requestId,
      requestBody,
      API_CONFIG.TIMEOUTS.GENERATE_RESPONSE,
      {
        patientInfo: {
          id: input.patientInfo.id,
          name: input.patientInfo.name,
          age: input.patientInfo.age,
          gender: input.patientInfo.gender,
        },
        sessionInfo: {
          sessionId: input.sessionId,
          stepId: input.stepId,
          userMessage: truncateMessage(input.userMessage),
        },
      },
      (data) => parseGenerateResponse(data, API_CONFIG.IS_REMOTE),
    );

    const duration = Date.now() - startTime;

    return {
      ...result,
      metadata: {
        apiType: "REAL" as const,
        endpoint: apiUrl,
        requestData: {
          patientId: input.patientInfo.id,
          patientName: input.patientInfo.name,
          userMessage: input.userMessage,
          sessionId: input.sessionId,
          stepId: input.stepId,
        },
        responseData: {
          message: result.message,
          emotion: result.emotion,
        },
        rawResponseJson: rawJson,
        duration,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse> {
    const requestId = generateRequestId();
    const requestBody = {
      id: input.patientInfo.id,
      name: input.patientInfo.name,
      age: input.patientInfo.age,
      gender: input.patientInfo.gender,
      diagnosis: input.patientInfo.diagnosis,
      difficulty_level: input.patientInfo.difficulty,
      psychological_profile: input.patientInfo.psychologicalProfile,
      background: input.patientInfo.background,
      current_medications: input.patientInfo.currentMedications || [],
      therapy_goals: input.patientInfo.therapyGoals || [],
      previous_sessions: input.patientInfo.previousSessions || 0,
      session_id: input.sessionId,
    };

    const { result } = await this.makeApiRequest<PatientInitializationResponse>(
      API_CONFIG.ENDPOINTS.INITIALIZE_PATIENT,
      "initializePatient",
      requestId,
      requestBody,
      API_CONFIG.TIMEOUTS.INITIALIZE_PATIENT,
      {
        patientInfo: {
          id: input.patientInfo.id,
          name: input.patientInfo.name,
          age: input.patientInfo.age,
          gender: input.patientInfo.gender,
        },
        sessionInfo: {
          sessionId: input.sessionId,
        },
      },
      (data) => {
        const response = data as PatientInitializationResponse;
        return {
          status: response.status,
          code: response.code,
          external_patient_id: response.external_patient_id,
          message: response.message,
          timestamp: response.timestamp,
        };
      },
    );
    return result;
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const apiUrl = combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.CHAT_RESPONSE);

    const { result, rawJson } = await this.makeApiRequest<ChatResponse>(
      API_CONFIG.ENDPOINTS.CHAT_RESPONSE,
      "generateChatResponse",
      requestId,
      input,
      API_CONFIG.TIMEOUTS.CHAT_RESPONSE,
      {
        sessionInfo: {
          sessionId: input.session_id,
          stepId: input.step_id,
          userMessage: truncateMessage(input.user_message),
        },
        patientInfo: {
          id: input.external_patient_id,
        },
      },
      (data) => {
        const response = data as Record<string, unknown>;
        const parsedSnapshot = parseEmotionSnapshot(response.emotion_snapshot);
        const parsedTimeline = parseEmotionTimeline(response.emotion_timeline);
        return {
          message:
            typeof response.message === "string"
              ? response.message
              : "I'm sorry, I'm not sure how to respond. Could you repeat that?",
          reasoning_time:
            typeof response.reasoning_time === "number" &&
            Number.isFinite(response.reasoning_time)
              ? response.reasoning_time
              : 0,
          emotion: normalizeEmotion(response.emotion),
          topic: typeof response.topic === "string" ? response.topic : "generale",
          timestamp:
            typeof response.timestamp === "string" && response.timestamp.trim()
              ? response.timestamp
              : new Date().toISOString(),
          patient_name:
            typeof response.patient_name === "string"
              ? response.patient_name
              : response.patient_name === null
                ? null
                : null,
          avatar_url:
            typeof response.avatar_url === "string"
              ? response.avatar_url
              : response.avatar_url === null
                ? null
                : null,
          emotion_snapshot: parsedSnapshot,
          emotion_timeline: parsedTimeline,
        };
      },
    );

    const duration = Date.now() - startTime;

    return {
      ...result,
      metadata: {
        apiType: "REAL" as const,
        endpoint: apiUrl,
        requestData: {
          externalPatientId: input.external_patient_id,
          userMessage: input.user_message,
          sessionId: input.session_id,
          stepId: input.step_id,
          therapistId: input.therapist_id,
        },
        responseData: {
          message: result.message,
          emotion: result.emotion,
          topic: result.topic,
          reasoningTime: result.reasoning_time,
          patientName: result.patient_name ?? null,
          avatarUrl: result.avatar_url ?? null,
          emotionSnapshot: result.emotion_snapshot ?? null,
          emotionTimeline: result.emotion_timeline ?? [],
        },
        rawResponseJson: rawJson,
        duration,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async finalizeSession(
    input: FinalizeSessionInput,
  ): Promise<SessionFinalizationResponse> {
    const requestId = generateRequestId();

    const { result } = await this.makeApiRequest<SessionFinalizationResponse>(
      API_CONFIG.ENDPOINTS.SESSION_END,
      "finalizeSession",
      requestId,
      input,
      API_CONFIG.TIMEOUTS.SESSION_END,
      {
        patientInfo: {
          id: input.external_patient_id,
        },
        sessionInfo: {
          sessionId: input.session_id,
        },
      },
      (data) => {
        const response = data as Partial<SessionFinalizationResponse>;
        const status =
          response.status === "finalized" || response.status === "not_found"
            ? response.status
            : "error";
        return {
          status,
          message:
            typeof response.message === "string"
              ? response.message
              : "Session finalization returned an unexpected response.",
          timestamp:
            typeof response.timestamp === "string" && response.timestamp.trim()
              ? response.timestamp
              : new Date().toISOString(),
        };
      },
    );

    return result;
  }
}
