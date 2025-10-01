/**
 * Patient Response Generator Service
 *
 * This service handles patient response generation with support for:
 * - External AI model integration (when available)
 * - Fallback to predefined responses
 * - Mock responses for development
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/** Supported patient emotions */
export type PatientEmotion =
  | "anger"
  | "anticipation"
  | "disgust"
  | "joy"
  | "sadness"
  | "surprise"
  | "trust"
  | "base";

/** API response status */
export type ResponseStatus = "success" | "error";

/** Service type indicator */
export type ServiceType = "mock" | "real";

/** Log level for debugging */
export type LogLevel = "info" | "warn" | "error" | "debug";

/** Patient response interface */
export interface PatientResponse {
  message: string;
  emotion: PatientEmotion;
  timestamp?: Date;
}

/** Patient initialization response interface */
export interface PatientInitializationResponse {
  status: ResponseStatus;
  code: string;
  external_patient_id?: string;
  message: string;
  timestamp: string;
}

/** Chat response interface */
export interface ChatResponse {
  message: string;
  reasoning_time: number;
  emotion: PatientEmotion;
  topic: string;
  timestamp: string;
}

/** Chat request interface */
export interface ChatRequest {
  external_patient_id: string;
  user_message: string;
  session_id: string;
  step_id: number;
}

/** Patient information interface */
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

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/** API Configuration */
const API_CONFIG = {
  BASE_URL: "https://api.therapeutic-ai.com/v1",
  ENDPOINTS: {
    GENERATE_RESPONSE: "/generate-response",
    INITIALIZE_PATIENT: "/initialise-patient",
    CHAT_RESPONSE: "/chat-response",
  },
  HEADERS: {
    "Content-Type": "application/json",
    "X-API-Version": "1.0",
  },
  TIMEOUTS: {
    GENERATE_RESPONSE: 5000,
    INITIALIZE_PATIENT: 3000,
    CHAT_RESPONSE: 8000,
  },
} as const;

/** Mock Service Configuration */
const MOCK_CONFIG = {
  DELAYS: {
    GENERATE_RESPONSE: { min: 1500, max: 2000 },
    INITIALIZE_PATIENT: { min: 1000, max: 1500 },
    CHAT_RESPONSE: { min: 2000, max: 3000 },
  },
  SAMPLE_TOPICS: [
    "ansia",
    "depressione",
    "famiglia",
    "lavoro",
    "relazioni",
    "terapia",
    "farmaci",
    "sonno",
  ],
  SAMPLE_EMOTIONS: [
    "sadness",
    "anger",
    "anticipation",
    "trust",
    "surprise",
    "joy",
    "base",
    "disgust",
  ] as PatientEmotion[],
} as const;

/** Logging Configuration */
const LOG_CONFIG = {
  PREFIXES: {
    PATIENT_GENERATOR: "🎯 [PATIENT RESPONSE GENERATOR]",
    MOCK_AI: "🤖 [MOCK AI]",
    REAL_AI: "🌐 [REAL AI]",
  },
  MAX_MESSAGE_LENGTH: 100,
  MAX_CONVERSATION_HISTORY: 5,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Generate unique request ID */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Truncate message for logging */
function truncateMessage(
  message: string,
  maxLength: number = LOG_CONFIG.MAX_MESSAGE_LENGTH,
): string {
  return message.length > maxLength
    ? message.substring(0, maxLength) + "..."
    : message;
}

/** Create base log object */
function createBaseLog(service: string, method: string, requestId: string) {
  return {
    timestamp: new Date().toISOString(),
    service,
    method,
    requestId,
  };
}

/** Log service call start */
function logServiceCall(
  prefix: string,
  service: string,
  method: string,
  requestId: string,
  data: Record<string, any>,
): void {
  console.log(`${prefix} ${service} Call:`, {
    ...createBaseLog(service, method, requestId),
    ...data,
  });
}

/** Log service response */
function logServiceResponse(
  prefix: string,
  service: string,
  method: string,
  requestId: string,
  duration: number,
  response: any,
  status: string,
): void {
  console.log(`${prefix} ${service} Response:`, {
    ...createBaseLog(service, method, requestId),
    duration: `${duration}ms`,
    response:
      typeof response === "string" ? truncateMessage(response) : response,
    status,
  });
}

/** Log service error */
function logServiceError(
  prefix: string,
  service: string,
  method: string,
  requestId: string,
  duration: number,
  error: unknown,
  status: string = "error",
): void {
  console.log(`${prefix} ${service} Error:`, {
    ...createBaseLog(service, method, requestId),
    duration: `${duration}ms`,
    error: {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    },
    status,
  });
}

/** Simulate API delay */
function simulateDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/** Base error class for Patient Response Generator */
export class PatientResponseGeneratorError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly timestamp: string;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = "PatientResponseGeneratorError";
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

/** API configuration error */
export class APIConfigurationError extends PatientResponseGeneratorError {
  constructor(message: string = "API configuration error") {
    super(message, "API_CONFIG_ERROR", 500);
    this.name = "APIConfigurationError";
  }
}

/** External AI service error */
export class ExternalAIServiceError extends PatientResponseGeneratorError {
  public readonly serviceType: ServiceType;
  public readonly requestId?: string;

  constructor(
    message: string,
    serviceType: ServiceType,
    requestId?: string,
    statusCode: number = 502,
  ) {
    super(message, "EXTERNAL_AI_ERROR", statusCode);
    this.name = "ExternalAIServiceError";
    this.serviceType = serviceType;
    this.requestId = requestId;
  }
}

/** Patient initialization error */
export class PatientInitializationError extends PatientResponseGeneratorError {
  public readonly patientId: string;

  constructor(message: string, patientId: string, statusCode: number = 400) {
    super(message, "PATIENT_INITIALIZATION_ERROR", statusCode);
    this.name = "PatientInitializationError";
    this.patientId = patientId;
  }
}

/** Response generation error */
export class ResponseGenerationError extends PatientResponseGeneratorError {
  public readonly patientId: string;
  public readonly stepId: number;

  constructor(
    message: string,
    patientId: string,
    stepId: number,
    statusCode: number = 500,
  ) {
    super(message, "RESPONSE_GENERATION_ERROR", statusCode);
    this.name = "ResponseGenerationError";
    this.patientId = patientId;
    this.stepId = stepId;
  }
}

// ============================================================================
// PREDEFINED RESPONSES & CACHING
// ============================================================================

/** Enhanced predefined responses for each patient */
const ENHANCED_PATIENT_RESPONSES: Record<string, PatientResponse[]> = {
  John: [
    {
      message:
        "Capisco la sua preoccupazione. È difficile gestire tutto questo stress...",
      emotion: "sadness",
    },
    {
      message:
        "Lei ha ragione, dovrei essere più proattivo. Ma a volte mi sento sopraffatto.",
      emotion: "anticipation",
    },
    {
      message:
        "Grazie per il suo supporto. Mi aiuta sapere che non sono solo in questo.",
      emotion: "trust",
    },
    {
      message:
        "Quando parlo di questi problemi, mi sento un po' meglio. È come se non fossi più solo.",
      emotion: "trust",
    },
    {
      message:
        "A volte penso che sia tutto nella mia testa. Ma poi ricordo che i sintomi sono reali.",
      emotion: "sadness",
    },
    {
      message:
        "Mia moglie dice che sono cambiato. Forse ha ragione, ma non so come tornare indietro.",
      emotion: "sadness",
    },
    {
      message:
        "Il lavoro mi sta consumando. Ogni giorno è una lotta per mantenere la concentrazione.",
      emotion: "anticipation",
    },
    {
      message:
        "Lei mi fa riflettere su cose che non avevo mai considerato. È... illuminante.",
      emotion: "surprise",
    },
  ],
  "Juanita Delgado": [
    {
      message:
        "Non so se ha senso parlare di questo. Ma forse... forse può aiutare.",
      emotion: "base",
    },
    {
      message:
        "Lei sembra capire. È raro trovare qualcuno che non mi giudichi.",
      emotion: "trust",
    },
    {
      message:
        "A volte mi sento così arrabbiata con tutto. Non so come gestire questa rabbia.",
      emotion: "anger",
    },
    {
      message:
        "È strano, ma quando parlo con lei mi sento meno sola. Non so perché.",
      emotion: "trust",
    },
    {
      message:
        "Tutto sembra così complicato. A volte vorrei solo scappare da tutto.",
      emotion: "sadness",
    },
    {
      message:
        "Lei mi fa delle domande che non mi sono mai posta. È... interessante.",
      emotion: "surprise",
    },
    {
      message: "La rabbia mi divora dall'interno. Non so come fermarla.",
      emotion: "anger",
    },
    {
      message:
        "Forse c'è speranza. Non lo so, ma per la prima volta non mi sento completamente persa.",
      emotion: "trust",
    },
  ],
  Todd: [
    {
      message:
        "Mi dispiace, è difficile per me parlare di queste cose. Mi sento così ansioso...",
      emotion: "anticipation",
    },
    {
      message: "Grazie per la sua pazienza. So che non è facile con me.",
      emotion: "sadness",
    },
    {
      message:
        "Quando lei mi fa queste domande, mi sento meno solo. È confortante.",
      emotion: "trust",
    },
    {
      message:
        "A volte ho paura di dire la cosa sbagliata. Ma lei non mi giudica.",
      emotion: "trust",
    },
    {
      message:
        "Il mio cuore batte forte quando parlo di certe cose. È normale?",
      emotion: "anticipation",
    },
    {
      message:
        "Dopo che papà è morto, tutto è cambiato. Non sono mai più riuscito a sentirmi sicuro.",
      emotion: "sadness",
    },
    {
      message: "Uscire di casa è diventato una sfida. L'ansia mi paralizza.",
      emotion: "anticipation",
    },
    {
      message: "Lei mi sta aiutando a capire cose su me stesso che non sapevo.",
      emotion: "surprise",
    },
  ],
};

/** Cache for patient responses to improve performance */
const responseCache = new Map<string, PatientResponse[]>();

/** Cache for contextual analysis results */
const contextCache = new Map<string, PatientResponse[]>();

/** Generic fallback responses */
const GENERIC_RESPONSES: PatientResponse[] = [
  { message: "Interessante. Puoi elaborare ulteriormente?", emotion: "base" },
  {
    message: "Capisco la tua preoccupazione. Come ti senti riguardo a questo?",
    emotion: "base",
  },
  {
    message:
      "È un aspetto importante da considerare. Cosa pensi che potremmo fare?",
    emotion: "base",
  },
  {
    message: "Grazie per aver condiviso questo con me. Vuoi parlarne di più?",
    emotion: "base",
  },
];

/** Get cached responses for a patient */
function getCachedResponses(patientName: string): PatientResponse[] {
  if (responseCache.has(patientName)) {
    return responseCache.get(patientName)!;
  }

  const responses =
    ENHANCED_PATIENT_RESPONSES[patientName] || GENERIC_RESPONSES;
  responseCache.set(patientName, responses);
  return responses;
}

/** Get cached contextual responses */
function getCachedContextualResponses(
  cacheKey: string,
  responses: PatientResponse[],
): PatientResponse[] {
  if (contextCache.has(cacheKey)) {
    return contextCache.get(cacheKey)!;
  }

  // Cache will be populated by the calling function
  return responses;
}

/** Set cached contextual responses */
function setCachedContextualResponses(
  cacheKey: string,
  responses: PatientResponse[],
): void {
  contextCache.set(cacheKey, responses);
}

/**
 * Context-aware response selection with caching
 * Analyzes conversation history to select more appropriate responses
 */
function selectContextualResponse(
  patientInfo: PatientInfo,
  userMessage: string,
  conversationHistory: GenerateResponseInput["conversationHistory"] = [],
): PatientResponse {
  // Get cached responses for the patient
  const responses = getCachedResponses(patientInfo.name);

  // Create cache key for contextual analysis
  const recentMessages = conversationHistory
    .slice(-LOG_CONFIG.MAX_CONVERSATION_HISTORY)
    .map((m) => m.content.toLowerCase())
    .join(" ");
  const cacheKey = `${patientInfo.name}_${userMessage.toLowerCase()}_${recentMessages}`;

  // Check if we have cached contextual responses
  let filteredResponses = getCachedContextualResponses(cacheKey, responses);

  // If not cached, perform contextual analysis
  if (filteredResponses === responses) {
    filteredResponses = performContextualAnalysis(
      responses,
      userMessage,
      recentMessages,
    );
    setCachedContextualResponses(cacheKey, filteredResponses);
  }

  // Select random response from filtered set and add timestamp
  const selectedResponse =
    filteredResponses[Math.floor(Math.random() * filteredResponses.length)];
  if (!selectedResponse) {
    // Fallback if no response found
    return {
      message:
        "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
      emotion: "base",
      timestamp: new Date(),
    };
  }

  return {
    message: selectedResponse.message,
    emotion: selectedResponse.emotion,
    timestamp: new Date(),
  };
}

/** Perform contextual analysis on responses */
function performContextualAnalysis(
  responses: PatientResponse[],
  userMessage: string,
  recentMessages: string,
): PatientResponse[] {
  const userMessageLower = userMessage.toLowerCase();
  const contextText = `${userMessageLower} ${recentMessages}`;

  // Define keyword patterns for better matching
  const keywordPatterns = [
    {
      keywords: [
        "famiglia",
        "moglie",
        "familiare",
        "marito",
        "figli",
        "parenti",
      ],
      filter: (r: PatientResponse) =>
        r.message.toLowerCase().includes("moglie") ||
        r.message.toLowerCase().includes("famiglia") ||
        r.message.toLowerCase().includes("papà") ||
        r.message.toLowerCase().includes("mamma"),
    },
    {
      keywords: ["lavoro", "ufficio", "carriera", "professione"],
      filter: (r: PatientResponse) =>
        r.message.toLowerCase().includes("lavoro") ||
        r.message.toLowerCase().includes("competente") ||
        r.message.toLowerCase().includes("ufficio"),
    },
    {
      keywords: ["ansia", "paura", "nervoso", "preoccupato", "tensione"],
      filter: (r: PatientResponse) =>
        r.message.toLowerCase().includes("ansioso") ||
        r.message.toLowerCase().includes("paura") ||
        r.message.toLowerCase().includes("battito") ||
        r.message.toLowerCase().includes("nervoso"),
    },
    {
      keywords: ["rabbia", "arrabbiato", "frustrato", "irritato", "furioso"],
      filter: (r: PatientResponse) =>
        r.message.toLowerCase().includes("rabbia") ||
        r.message.toLowerCase().includes("arrabbiata") ||
        r.message.toLowerCase().includes("furioso"),
    },
    {
      keywords: ["speranza", "migliorare", "aiuto", "guarire", "bene"],
      filter: (r: PatientResponse) =>
        r.message.toLowerCase().includes("speranza") ||
        r.message.toLowerCase().includes("aiuto") ||
        r.message.toLowerCase().includes("migliore") ||
        r.message.toLowerCase().includes("bene"),
    },
  ];

  // Find matching patterns
  for (const pattern of keywordPatterns) {
    if (pattern.keywords.some((keyword) => contextText.includes(keyword))) {
      const filtered = responses.filter(pattern.filter);
      if (filtered.length > 0) {
        return filtered;
      }
    }
  }

  // If no contextual matches, return all responses
  return responses;
}

/**
 * External AI integration interface
 * This will be implemented when the external AI model is available
 */
export interface ExternalAIService {
  generateResponse(input: GenerateResponseInput): Promise<PatientResponse>;
  initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse>;
  generateChatResponse(input: ChatRequest): Promise<ChatResponse>;
}

/**
 * Mock external AI service for development
 * Simulates external AI with enhanced responses
 */
class MockExternalAIService implements ExternalAIService {
  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Log the simulated API call
    logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "Simulating External AI API",
      "generateResponse",
      requestId,
      {
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_RESPONSE}`,
        httpMethod: "POST",
        patientInfo: {
          id: input.patientInfo.id,
          name: input.patientInfo.name,
          age: input.patientInfo.age,
          gender: input.patientInfo.gender,
          diagnosis: input.patientInfo.diagnosis,
          difficulty: input.patientInfo.difficulty,
          psychologicalProfile: input.patientInfo.psychologicalProfile,
          background: input.patientInfo.background,
          currentMedications: input.patientInfo.currentMedications || [],
          therapyGoals: input.patientInfo.therapyGoals || [],
          previousSessions: input.patientInfo.previousSessions || 0,
        },
        sessionInfo: {
          sessionId: input.sessionId,
          stepId: input.stepId,
          userMessage: truncateMessage(input.userMessage),
          conversationHistoryLength: input.conversationHistory?.length || 0,
        },
        requestBody: {
          patient_id: input.patientInfo.id,
          patient_name: input.patientInfo.name,
          patient_age: input.patientInfo.age,
          patient_gender: input.patientInfo.gender,
          diagnosis: input.patientInfo.diagnosis,
          difficulty_level: input.patientInfo.difficulty,
          psychological_profile: input.patientInfo.psychologicalProfile,
          background: input.patientInfo.background,
          current_medications: input.patientInfo.currentMedications || [],
          therapy_goals: input.patientInfo.therapyGoals || [],
          previous_sessions: input.patientInfo.previousSessions || 0,
          session_id: input.sessionId,
          step_id: input.stepId,
          user_message: input.userMessage,
          conversation_history:
            input.conversationHistory?.map((msg) => ({
              content: truncateMessage(msg.content, 50),
              sender: msg.sender,
              timestamp: msg.timestamp,
            })) || [],
        },
      },
    );

    // Simulate API call delay
    await simulateDelay(
      MOCK_CONFIG.DELAYS.GENERATE_RESPONSE.min,
      MOCK_CONFIG.DELAYS.GENERATE_RESPONSE.max,
    );

    // Use contextual response selection
    const response = selectContextualResponse(
      input.patientInfo,
      input.userMessage,
      input.conversationHistory,
    );

    const duration = Date.now() - startTime;

    // Log the response
    logServiceResponse(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "External AI API",
      "generateResponse",
      requestId,
      duration,
      {
        message: truncateMessage(response.message),
        emotion: response.emotion,
        timestamp: response.timestamp,
      },
      "success",
    );

    return response;
  }

  async initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse> {
    const startTime = Date.now();

    // Log the simulated API call for debugging
    console.log("🤖 [MOCK AI] Simulating Patient Initialization API Call:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "initializePatient",
      url: "https://api.therapeutic-ai.com/v1/initialise-patient",
      httpMethod: "POST",
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientInfo: {
        id: input.patientInfo.id,
        name: input.patientInfo.name,
        age: input.patientInfo.age,
        gender: input.patientInfo.gender,
        diagnosis: input.patientInfo.diagnosis,
        difficulty: input.patientInfo.difficulty,
        psychologicalProfile: input.patientInfo.psychologicalProfile,
        background: input.patientInfo.background,
        currentMedications: input.patientInfo.currentMedications || [],
        therapyGoals: input.patientInfo.therapyGoals || [],
        previousSessions: input.patientInfo.previousSessions || 0,
      },
      sessionInfo: {
        sessionId: input.sessionId,
      },
      requestBody: {
        patient_id: input.patientInfo.id,
        patient_name: input.patientInfo.name,
        patient_age: input.patientInfo.age,
        patient_gender: input.patientInfo.gender,
        diagnosis: input.patientInfo.diagnosis,
        difficulty_level: input.patientInfo.difficulty,
        psychological_profile: input.patientInfo.psychologicalProfile,
        background: input.patientInfo.background,
        current_medications: input.patientInfo.currentMedications || [],
        therapy_goals: input.patientInfo.therapyGoals || [],
        previous_sessions: input.patientInfo.previousSessions || 0,
        session_id: input.sessionId,
      },
    });

    // Simulate API call delay
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1500),
    );

    // Simulate successful patient creation
    const response = {
      status: "success" as const,
      code: "PATIENT_CREATED",
      external_patient_id: `ext_patient_${Date.now()}`,
      message: "Paziente inizializzato correttamente nel sistema esterno",
      timestamp: new Date().toISOString(),
    };

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log the response
    console.log("🤖 [MOCK AI] Patient Initialization API Response:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "initializePatient",
      requestId: `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
      duration: `${duration}ms`,
      response: {
        status: response.status,
        code: response.code,
        external_patient_id: response.external_patient_id,
        message: response.message,
        timestamp: response.timestamp,
      },
      status: "success",
    });

    return response;
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // Log the simulated API call for debugging
    console.log("🤖 [MOCK AI] Simulating Chat Response API Call:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "generateChatResponse",
      url: "https://api.therapeutic-ai.com/v1/chat-response",
      httpMethod: "POST",
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestInfo: {
        external_patient_id: input.external_patient_id,
        user_message:
          input.user_message.substring(0, 100) +
          (input.user_message.length > 100 ? "..." : ""),
        session_id: input.session_id,
        step_id: input.step_id,
      },
      requestBody: {
        external_patient_id: input.external_patient_id,
        user_message: input.user_message,
        session_id: input.session_id,
        step_id: input.step_id,
      },
    });

    // Simulate API call delay
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 3000),
    );

    // Simulate chat response with reasoning time
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
      "sadness",
      "anger",
      "anticipation",
      "trust",
      "surprise",
      "joy",
      "base",
      "disgust",
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
    ];

    const selectedResponse =
      sampleResponses[Math.floor(Math.random() * sampleResponses.length)] ||
      "Mi dispiace, non sono sicuro di come rispondere.";
    const selectedEmotion =
      emotions[Math.floor(Math.random() * emotions.length)] || "base";
    const selectedTopic =
      topics[Math.floor(Math.random() * topics.length)] || "generale";

    const response = {
      message: selectedResponse,
      reasoning_time: Math.floor(Math.random() * 3) + 1, // 1-3 seconds
      emotion: selectedEmotion as
        | "anger"
        | "anticipation"
        | "disgust"
        | "joy"
        | "sadness"
        | "surprise"
        | "trust"
        | "base",
      topic: selectedTopic,
      timestamp: new Date().toISOString(),
    };

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log the response
    console.log("🤖 [MOCK AI] Chat Response API Response:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "generateChatResponse",
      requestId: `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
      duration: `${duration}ms`,
      response: {
        message:
          response.message.substring(0, 100) +
          (response.message.length > 100 ? "..." : ""),
        reasoning_time: response.reasoning_time,
        emotion: response.emotion,
        topic: response.topic,
        timestamp: response.timestamp,
      },
      status: "success",
    });

    return response;
  }
}

/**
 * Real external AI service (to be implemented)
 * This will integrate with the actual external AI model
 */
class RealExternalAIService implements ExternalAIService {
  private apiUrl = "https://api.therapeutic-ai.com/v1/initialise-patient";
  private apiKey = process.env.EXTERNAL_AI_API_KEY;

  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    // Log the API call
    console.log("🌐 [REAL AI] External AI API Call:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "generateResponse",
      url: this.apiUrl,
      httpMethod: "POST",
      requestId,
      patientInfo: {
        id: input.patientInfo.id,
        name: input.patientInfo.name,
        age: input.patientInfo.age,
        gender: input.patientInfo.gender,
        diagnosis: input.patientInfo.diagnosis,
        difficulty: input.patientInfo.difficulty,
        psychologicalProfile: input.patientInfo.psychologicalProfile,
        background: input.patientInfo.background,
        currentMedications: input.patientInfo.currentMedications || [],
        therapyGoals: input.patientInfo.therapyGoals || [],
        previousSessions: input.patientInfo.previousSessions || 0,
      },
      sessionInfo: {
        sessionId: input.sessionId,
        stepId: input.stepId,
        userMessage:
          input.userMessage.substring(0, 100) +
          (input.userMessage.length > 100 ? "..." : ""),
        conversationHistoryLength: input.conversationHistory?.length || 0,
      },
      requestBody,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey.substring(0, 10)}...`,
        "X-API-Version": "1.0",
      },
    });

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "X-API-Version": "1.0",
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!response.ok) {
        console.log("🌐 [REAL AI] External AI API Error Response:", {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateResponse",
          requestId,
          duration: `${duration}ms`,
          error: {
            status: response.status,
            statusText: response.statusText,
            url: this.apiUrl,
          },
          status: "error",
        });
        throw new Error(
          `External AI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      const result = {
        message: data.response.message,
        emotion: data.response.emotion,
        timestamp: new Date(data.response.timestamp || new Date()),
      };

      // Log the successful response
      console.log("🌐 [REAL AI] External AI API Success Response:", {
        timestamp: new Date().toISOString(),
        service: "PatientResponseGenerator",
        method: "generateResponse",
        requestId,
        duration: `${duration}ms`,
        response: {
          message:
            result.message.substring(0, 100) +
            (result.message.length > 100 ? "..." : ""),
          emotion: result.emotion,
          timestamp: result.timestamp,
        },
        status: "success",
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log("🌐 [REAL AI] External AI API Exception:", {
        timestamp: new Date().toISOString(),
        service: "PatientResponseGenerator",
        method: "generateResponse",
        requestId,
        duration: `${duration}ms`,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          url: this.apiUrl,
        },
        status: "error",
      });

      console.error("External AI API call failed:", error);
      throw error;
    }
  }

  async initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    // Log the API call
    console.log("🌐 [REAL AI] Patient Initialization API Call:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "initializePatient",
      url: this.apiUrl,
      httpMethod: "POST",
      requestId,
      patientInfo: {
        id: input.patientInfo.id,
        name: input.patientInfo.name,
        age: input.patientInfo.age,
        gender: input.patientInfo.gender,
        diagnosis: input.patientInfo.diagnosis,
        difficulty: input.patientInfo.difficulty,
        psychologicalProfile: input.patientInfo.psychologicalProfile,
        background: input.patientInfo.background,
        currentMedications: input.patientInfo.currentMedications || [],
        therapyGoals: input.patientInfo.therapyGoals || [],
        previousSessions: input.patientInfo.previousSessions || 0,
      },
      sessionInfo: {
        sessionId: input.sessionId,
      },
      requestBody,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey.substring(0, 10)}...`,
        "X-API-Version": "1.0",
      },
    });

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "X-API-Version": "1.0",
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!response.ok) {
        console.log("🌐 [REAL AI] Patient Initialization API Error Response:", {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "initializePatient",
          requestId,
          duration: `${duration}ms`,
          error: {
            status: response.status,
            statusText: response.statusText,
            url: this.apiUrl,
          },
          status: "error",
        });
        throw new Error(
          `External AI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      const result = {
        status: data.status,
        code: data.code,
        external_patient_id: data.external_patient_id,
        message: data.message,
        timestamp: data.timestamp,
      };

      // Log the successful response
      console.log("🌐 [REAL AI] Patient Initialization API Success Response:", {
        timestamp: new Date().toISOString(),
        service: "PatientResponseGenerator",
        method: "initializePatient",
        requestId,
        duration: `${duration}ms`,
        response: {
          status: result.status,
          code: result.code,
          external_patient_id: result.external_patient_id,
          message: result.message,
          timestamp: result.timestamp,
        },
        status: "success",
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log("🌐 [REAL AI] Patient Initialization API Exception:", {
        timestamp: new Date().toISOString(),
        service: "PatientResponseGenerator",
        method: "initializePatient",
        requestId,
        duration: `${duration}ms`,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          url: this.apiUrl,
        },
        status: "error",
      });

      console.error("External AI API call failed:", error);
      throw error;
    }
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiUrl = "https://api.therapeutic-ai.com/v1/chat-response";

    // Log the API call
    console.log("🌐 [REAL AI] Chat Response API Call:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "generateChatResponse",
      url: apiUrl,
      httpMethod: "POST",
      requestId,
      requestInfo: {
        external_patient_id: input.external_patient_id,
        user_message:
          input.user_message.substring(0, 100) +
          (input.user_message.length > 100 ? "..." : ""),
        session_id: input.session_id,
        step_id: input.step_id,
      },
      requestBody: input,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey.substring(0, 10)}...`,
        "X-API-Version": "1.0",
      },
    });

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "X-API-Version": "1.0",
        },
        body: JSON.stringify(input),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!response.ok) {
        console.log("🌐 [REAL AI] Chat Response API Error Response:", {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateChatResponse",
          requestId,
          duration: `${duration}ms`,
          error: {
            status: response.status,
            statusText: response.statusText,
            url: apiUrl,
          },
          status: "error",
        });
        throw new Error(
          `External AI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      const result = {
        message: data.message,
        reasoning_time: data.reasoning_time,
        emotion: data.emotion,
        topic: data.topic,
        timestamp: data.timestamp,
      };

      // Log the successful response
      console.log("🌐 [REAL AI] Chat Response API Success Response:", {
        timestamp: new Date().toISOString(),
        service: "PatientResponseGenerator",
        method: "generateChatResponse",
        requestId,
        duration: `${duration}ms`,
        response: {
          message:
            result.message.substring(0, 100) +
            (result.message.length > 100 ? "..." : ""),
          reasoning_time: result.reasoning_time,
          emotion: result.emotion,
          topic: result.topic,
          timestamp: result.timestamp,
        },
        status: "success",
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log("🌐 [REAL AI] Chat Response API Exception:", {
        timestamp: new Date().toISOString(),
        service: "PatientResponseGenerator",
        method: "generateChatResponse",
        requestId,
        duration: `${duration}ms`,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          url: apiUrl,
        },
        status: "error",
      });

      console.error("External AI API call failed:", error);
      throw error;
    }
  }
}

/**
 * Main patient response generator
 * Handles fallback logic between external AI and predefined responses
 */
export class PatientResponseGenerator {
  private externalAI: ExternalAIService;
  private useExternalAI: boolean;

  constructor(useExternalAI: boolean = false) {
    this.useExternalAI = useExternalAI;
    this.externalAI = useExternalAI
      ? new RealExternalAIService()
      : new MockExternalAIService();
  }

  /**
   * Generate a patient response
   * Tries external AI first, falls back to predefined responses
   */
  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("🎯 [PATIENT RESPONSE GENERATOR] Starting generateResponse:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "generateResponse",
      requestId,
      useExternalAI: this.useExternalAI,
      patientInfo: {
        id: input.patientInfo.id,
        name: input.patientInfo.name,
        age: input.patientInfo.age,
        gender: input.patientInfo.gender,
        diagnosis: input.patientInfo.diagnosis,
        difficulty: input.patientInfo.difficulty,
      },
      sessionInfo: {
        sessionId: input.sessionId,
        stepId: input.stepId,
        userMessage:
          input.userMessage.substring(0, 100) +
          (input.userMessage.length > 100 ? "..." : ""),
        conversationHistoryLength: input.conversationHistory?.length || 0,
      },
    });

    try {
      let result: PatientResponse;

      if (this.useExternalAI) {
        console.log(
          "🎯 [PATIENT RESPONSE GENERATOR] Using Real External AI Service",
        );
        result = await this.externalAI.generateResponse(input);
      } else {
        console.log(
          "🎯 [PATIENT RESPONSE GENERATOR] Using Mock External AI Service",
        );
        result = await this.externalAI.generateResponse(input);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] generateResponse completed successfully:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateResponse",
          requestId,
          duration: `${duration}ms`,
          response: {
            message:
              result.message.substring(0, 100) +
              (result.message.length > 100 ? "..." : ""),
            emotion: result.emotion,
            timestamp: result.timestamp,
          },
          status: "success",
        },
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] generateResponse failed, using fallback:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateResponse",
          requestId,
          duration: `${duration}ms`,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          },
          status: "fallback",
        },
      );

      console.error("Error generating patient response:", error);

      // Fallback to simple predefined response
      const fallbackResponses = ENHANCED_PATIENT_RESPONSES[
        input.patientInfo.name
      ] || [
        {
          message:
            "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
          emotion: "base" as const,
        },
      ];

      const selectedResponse =
        fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      if (!selectedResponse) {
        // Fallback if no response found
        const fallbackResult = {
          message:
            "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
          emotion: "base" as const,
          timestamp: new Date(),
        };

        console.log(
          "🎯 [PATIENT RESPONSE GENERATOR] Using emergency fallback response:",
          {
            timestamp: new Date().toISOString(),
            service: "PatientResponseGenerator",
            method: "generateResponse",
            requestId,
            response: fallbackResult,
            status: "emergency_fallback",
          },
        );

        return fallbackResult;
      }

      const fallbackResult = {
        message: selectedResponse.message,
        emotion: selectedResponse.emotion,
        timestamp: new Date(),
      };

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] Using predefined fallback response:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateResponse",
          requestId,
          response: fallbackResult,
          status: "predefined_fallback",
        },
      );

      return fallbackResult;
    }
  }

  /**
   * Update the external AI service
   * Call this when the external AI becomes available
   */
  setExternalAI(service: ExternalAIService) {
    this.externalAI = service;
    this.useExternalAI = true;
  }

  /**
   * Enable/disable external AI
   */
  setUseExternalAI(use: boolean) {
    this.useExternalAI = use;
  }

  /**
   * Initialize patient in external AI service
   * This is the Step 1 - Patient Initialization
   */
  async initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("🎯 [PATIENT RESPONSE GENERATOR] Starting initializePatient:", {
      timestamp: new Date().toISOString(),
      service: "PatientResponseGenerator",
      method: "initializePatient",
      requestId,
      useExternalAI: this.useExternalAI,
      patientInfo: {
        id: input.patientInfo.id,
        name: input.patientInfo.name,
        age: input.patientInfo.age,
        gender: input.patientInfo.gender,
        diagnosis: input.patientInfo.diagnosis,
        difficulty: input.patientInfo.difficulty,
      },
      sessionInfo: {
        sessionId: input.sessionId,
      },
    });

    try {
      let result: PatientInitializationResponse;

      if (this.useExternalAI) {
        console.log(
          "🎯 [PATIENT RESPONSE GENERATOR] Using Real External AI Service for initialization",
        );
        result = await this.externalAI.initializePatient(input);
      } else {
        console.log(
          "🎯 [PATIENT RESPONSE GENERATOR] Using Mock External AI Service for initialization",
        );
        result = await this.externalAI.initializePatient(input);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] initializePatient completed successfully:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "initializePatient",
          requestId,
          duration: `${duration}ms`,
          response: {
            status: result.status,
            code: result.code,
            external_patient_id: result.external_patient_id,
            message: result.message,
            timestamp: result.timestamp,
          },
          status: "success",
        },
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] initializePatient failed, using fallback:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "initializePatient",
          requestId,
          duration: `${duration}ms`,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          },
          status: "fallback",
        },
      );

      console.error("Error initializing patient:", error);

      // Fallback response
      const fallbackResult = {
        status: "error" as const,
        code: "INITIALIZATION_FAILED",
        message:
          "Errore durante l'inizializzazione del paziente nel servizio esterno",
        timestamp: new Date().toISOString(),
      };

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] Using error fallback response:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "initializePatient",
          requestId,
          response: fallbackResult,
          status: "error_fallback",
        },
      );

      return fallbackResult;
    }
  }

  /**
   * Generate chat response for ongoing conversation
   * This is the Step 2 - Chat Response Generation
   */
  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(
      "🎯 [PATIENT RESPONSE GENERATOR] Starting generateChatResponse:",
      {
        timestamp: new Date().toISOString(),
        service: "PatientResponseGenerator",
        method: "generateChatResponse",
        requestId,
        useExternalAI: this.useExternalAI,
        requestInfo: {
          external_patient_id: input.external_patient_id,
          user_message:
            input.user_message.substring(0, 100) +
            (input.user_message.length > 100 ? "..." : ""),
          session_id: input.session_id,
          step_id: input.step_id,
        },
      },
    );

    try {
      let result: ChatResponse;

      if (this.useExternalAI) {
        console.log(
          "🎯 [PATIENT RESPONSE GENERATOR] Using Real External AI Service for chat response",
        );
        result = await this.externalAI.generateChatResponse(input);
      } else {
        console.log(
          "🎯 [PATIENT RESPONSE GENERATOR] Using Mock External AI Service for chat response",
        );
        result = await this.externalAI.generateChatResponse(input);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] generateChatResponse completed successfully:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateChatResponse",
          requestId,
          duration: `${duration}ms`,
          response: {
            message:
              result.message.substring(0, 100) +
              (result.message.length > 100 ? "..." : ""),
            reasoning_time: result.reasoning_time,
            emotion: result.emotion,
            topic: result.topic,
            timestamp: result.timestamp,
          },
          status: "success",
        },
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] generateChatResponse failed, using fallback:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateChatResponse",
          requestId,
          duration: `${duration}ms`,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          },
          status: "fallback",
        },
      );

      console.error("Error generating chat response:", error);

      // Fallback response
      const fallbackResult = {
        message:
          "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
        reasoning_time: 0,
        emotion: "base" as const,
        topic: "generale",
        timestamp: new Date().toISOString(),
      };

      console.log(
        "🎯 [PATIENT RESPONSE GENERATOR] Using fallback chat response:",
        {
          timestamp: new Date().toISOString(),
          service: "PatientResponseGenerator",
          method: "generateChatResponse",
          requestId,
          response: fallbackResult,
          status: "fallback",
        },
      );

      return fallbackResult;
    }
  }
}

// Export singleton instance
export const patientResponseGenerator = new PatientResponseGenerator(false); // Start with mock
