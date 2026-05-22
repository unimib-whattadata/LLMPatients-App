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
  PatientEmotion,
} from "./types";
import { PatientResponseLogger, LOG_CONFIG } from "./logger";
import {
  API_CONFIG,
  MOCK_CONFIG,
  generateRequestId,
  truncateMessage,
  simulateDelay,
  clampUnitValue,
  combineUrls,
} from "./utils";
import {
  selectContextualResponse,
  buildEmotionSnapshot,
  appendMockTimelinePoint,
  mockTimelineCache,
} from "./mock-data";

export class MockExternalAIService implements ExternalAIService {
  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    PatientResponseLogger.logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "generateResponse",
      requestId,
      {
        url: combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.GENERATE_RESPONSE),
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
    );

    await simulateDelay(
      MOCK_CONFIG.DELAYS.GENERATE_RESPONSE.min,
      MOCK_CONFIG.DELAYS.GENERATE_RESPONSE.max,
    );

    const response = selectContextualResponse(
      input.patientInfo,
      input.userMessage,
      input.conversationHistory,
    );

    const duration = Date.now() - startTime;

    PatientResponseLogger.logServiceResponse(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "generateResponse",
      requestId,
      duration,
      {
        message: truncateMessage(response.message),
        emotion: response.emotion,
      },
      "success",
    );

    const mockResponseJson = JSON.stringify({
      message: response.message,
      emotion: response.emotion,
    }, null, 2);

    return {
      ...response,
      metadata: {
        apiType: "MOCK",
        endpoint: combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.GENERATE_RESPONSE),
        requestData: {
          patientId: input.patientInfo.id,
          patientName: input.patientInfo.name,
          userMessage: input.userMessage,
          sessionId: input.sessionId,
          stepId: input.stepId,
        },
        responseData: {
          message: response.message,
          emotion: response.emotion,
        },
        rawResponseJson: mockResponseJson,
        duration,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse> {
    const startTime = Date.now();

    const requestId = generateRequestId();
    PatientResponseLogger.logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "initializePatient",
      requestId,
      {
        url: combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.INITIALIZE_PATIENT),
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
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1500),
    );

    const response = {
      status: "success" as const,
      code: "PATIENT_CREATED",
      external_patient_id: `ext_patient_${Date.now()}`,
      message: "Paziente inizializzato correttamente nel sistema esterno",
      timestamp: new Date().toISOString(),
    };
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    PatientResponseLogger.logServiceResponse(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "initializePatient",
      requestId,
      duration,
      {
        status: response.status,
        code: response.code,
        external_patient_id: response.external_patient_id,
        message: response.message,
      },
      "success",
    );

    return response;
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    const requestId = generateRequestId();
    PatientResponseLogger.logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "generateChatResponse",
      requestId,
      {
        url: combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.CHAT_RESPONSE),
        sessionInfo: {
          sessionId: input.session_id,
          stepId: input.step_id,
          userMessage: truncateMessage(input.user_message),
        },
        patientInfo: {
          id: input.external_patient_id,
        },
      },
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 3000),
    );

    const topics = [
      "ansia",
      "depressione",
      "famiglia",
      "lavoro",
      "relazioni",
      "terapia",
      "farmaci",
      "sonno",
    ];
    const emotions = [
      "SADNESS",
      "RAGE",
      "SEEKING",
      "CARE",
      "FEAR",
      "PLAY",
      "LUST",
      "PANIC_GRIEF",
      "base",
    ];

    const sampleResponses = [
      "Capisco la sua preoccupazione. È normale sentirsi così in questa situazione.",
      "Mi fa piacere che lei mi stia ascoltando. A volte è difficile esprimere questi sentimenti.",
      "Quando parlo di queste cose, mi sento un po' meglio. È come se non fossi più solo.",
      "Lei mi sta aiutando a capire cose su me stesso che non sapevo.",
      "A volte ho paura di dire la cosa sbagliata, ma lei non mi giudica.",
      "Grazie per la sua pazienza. So che non è facile con me.",
      "Quando lei mi fa queste domande, mi sento meno solo. È confortante.",
      "Il mio cuore batte forte quando parlo di certe cose. È normale?",
      "È strano, ma quando parlo con lei mi sento meno solo. Non so perché.",
      "Tutto sembra così complicato. A volte vorrei solo scappare da tutto.",
      "Lei mi fa delle domande che non mi sono mai posta. È... interessante.",
      "Forse c'è speranza. Non lo so, ma per la prima volta non mi sento completamente persa.",
      "A volte penso che sia tutto nella mia testa. Ma poi ricordo che i sintomi sono reali.",
      "Mia moglie dice che sono cambiato. Forse ha ragione, ma non so come tornare indietro.",
      "Il lavoro mi sta consumando. Ogni giorno è una lotta per mantenere la concentrazione.",
      "Lei mi fa riflettere su cose che non avevo mai considerato. È... illuminante.",
    ];

    const responseIndex = Math.floor(Math.random() * sampleResponses.length);
    const emotionIndex = Math.floor(Math.random() * emotions.length);
    const topicIndex = Math.floor(Math.random() * topics.length);
    const reasoningTime = Math.floor(Math.random() * 3) + 1;

    const selectedResponse =
      sampleResponses[responseIndex] ||
      "I'm sorry, I'm not sure how to respond.";
    const selectedEmotion = (emotions[emotionIndex] || "base") as PatientEmotion;
    const selectedTopic =
      topics[topicIndex] || "generale";
    
    PatientResponseLogger.logRandomization(
      `Chat (${sampleResponses.length} responses)`,
      sampleResponses.length,
      responseIndex,
      selectedEmotion,
      selectedTopic,
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    const responseTimestamp = new Date().toISOString();

    const intensityByEmotion: Record<PatientEmotion, number> = {
      SEEKING: 0.62,
      RAGE: 0.78,
      FEAR: 0.74,
      CARE: 0.58,
      LUST: 0.6,
      PANIC_GRIEF: 0.72,
      SADNESS: 0.7,
      PLAY: 0.52,
      base: 0.45,
    };
    const sampledIntensity = clampUnitValue(
      intensityByEmotion[selectedEmotion] + (Math.random() * 0.24 - 0.08),
      0.35,
    );
    const emotionSnapshot = buildEmotionSnapshot(selectedEmotion, sampledIntensity);

    const timelineKey = `${input.session_id}:${input.external_patient_id}`;
    const previousTimeline = mockTimelineCache.get(timelineKey) ?? [];
    const previousTurn = previousTimeline[previousTimeline.length - 1]?.turn_index ?? 0;
    const emotionTimeline = appendMockTimelinePoint(input, {
      turn_index: previousTurn + 1,
      timestamp: responseTimestamp,
      emotion: emotionSnapshot.dominant,
      intensity: sampledIntensity,
    });

    const mockResponseData = {
      message: selectedResponse,
      reasoning_time: reasoningTime,
      emotion: selectedEmotion,
      topic: selectedTopic,
      timestamp: responseTimestamp,
      patient_name: null,
      avatar_url: null,
      emotion_snapshot: emotionSnapshot,
      emotion_timeline: emotionTimeline,
    };
    const mockResponseJson = JSON.stringify(mockResponseData, null, 2);

    const response = {
      ...mockResponseData,
      metadata: {
        apiType: "MOCK" as const,
        endpoint: combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.CHAT_RESPONSE),
        requestData: {
          externalPatientId: input.external_patient_id,
          userMessage: input.user_message,
          sessionId: input.session_id,
          stepId: input.step_id,
          therapistId: input.therapist_id,
        },
        responseData: {
          message: selectedResponse,
          emotion: selectedEmotion,
          topic: selectedTopic,
          reasoningTime,
          patientName: null,
          avatarUrl: null,
          emotionSnapshot,
          emotionTimeline,
        },
        rawResponseJson: mockResponseJson,
        duration,
        timestamp: new Date().toISOString(),
      },
    };

    PatientResponseLogger.logServiceResponse(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "generateChatResponse",
      requestId,
      duration,
      response,
      "success",
    );

    return response;
  }

  async finalizeSession(
    input: FinalizeSessionInput,
  ): Promise<SessionFinalizationResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    PatientResponseLogger.logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "finalizeSession",
      requestId,
      {
        url: combineUrls(API_CONFIG.BASE_URL, API_CONFIG.ENDPOINTS.SESSION_END),
        patientInfo: {
          id: input.external_patient_id,
        },
        sessionInfo: {
          sessionId: input.session_id,
        },
      },
    );

    mockTimelineCache.delete(`${input.session_id}:${input.external_patient_id}`);

    const response = {
      status: "finalized" as const,
      message: "Mock session memory finalized.",
      timestamp: new Date().toISOString(),
    };

    PatientResponseLogger.logServiceResponse(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "finalizeSession",
      requestId,
      Date.now() - startTime,
      response,
      "success",
    );

    return response;
  }
}
