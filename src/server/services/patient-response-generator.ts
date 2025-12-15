




export type PatientEmotion =
  | "anger"
  | "anticipation"
  | "disgust"
  | "joy"
  | "sadness"
  | "surprise"
  | "trust"
  | "base";

export type ResponseStatus = "success" | "error";

export type ServiceType = "mock" | "real";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface PatientResponse {
  message: string;
  emotion: PatientEmotion;
  timestamp?: Date;
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
}

export interface ChatRequest {
  external_patient_id: string;
  user_message: string;
  session_id: string;
  step_id: number;
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





import { env } from "~/env";

// API Configuration based on mode
const getApiConfig = () => {
  const isRemote = env.API === "remote";
  
  return {
    BASE_URL: isRemote ? (env.API_BASE_URL || "https://e-patients-api.whattadata.it") : "local",
    ENDPOINTS: {
      GENERATE_RESPONSE: isRemote ? (env.API_GENERATE_RESPONSE_ENDPOINT || "/api/message") : "/mock/generate-response",
      INITIALIZE_PATIENT: isRemote ? (env.API_INITIALIZE_PATIENT_ENDPOINT || "/initialise-patient") : "/mock/initialise-patient",
      CHAT_RESPONSE: isRemote ? (env.API_CHAT_RESPONSE_ENDPOINT || "/chat-response") : "/mock/chat-response",
    },
    HEADERS: {
      "Content-Type": "application/json",
      "X-API-Version": "1.0",
    },
    TIMEOUTS: {
      GENERATE_RESPONSE: parseInt(env.API_TIMEOUT_GENERATE_RESPONSE || "5000"),
      INITIALIZE_PATIENT: parseInt(env.API_TIMEOUT_INITIALIZE_PATIENT || "3000"),
      CHAT_RESPONSE: parseInt(env.API_TIMEOUT_CHAT_RESPONSE || "8000"),
    },
    IS_REMOTE: isRemote,
  } as const;
};

const API_CONFIG = getApiConfig();

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

// ANSI color codes for terminal output
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
} as const;

const LOG_CONFIG = {
  PREFIXES: {
    PATIENT_GENERATOR: "🎯 [PATIENT RESPONSE GENERATOR]",
    MOCK_AI: "🤖 [MOCK AI]",
    REAL_AI: "🌐 [REAL AI]",
  },
  MAX_MESSAGE_LENGTH: 100,
  MAX_CONVERSATION_HISTORY: 5,
} as const;

// Helper function to format timestamp
function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Helper function to format duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Helper function to colorize text
function colorize(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

// Helper function to create a visual separator
function separator(char: string = "─", length: number = 60): string {
  return colorize(char.repeat(length), "gray");
}





function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function truncateMessage(
  message: string,
  maxLength: number = LOG_CONFIG.MAX_MESSAGE_LENGTH,
): string {
  return message.length > maxLength
    ? message.substring(0, maxLength) + "..."
    : message;
}

// Improved logging functions with better formatting
function logServiceCall(
  prefix: string,
  service: string,
  method: string,
  requestId: string,
  data: Record<string, any>,
): void {
  const time = formatTime();
  const shortRequestId = requestId.split("_").pop()?.substring(0, 8) || requestId;
  
  console.log(
    `${colorize(prefix, "cyan")} ${colorize("→", "blue")} ${colorize(method, "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(time, "dim")}`
  );
  
  // Log key information in a structured way
  if (data.patientInfo) {
    console.log(
      `  ${colorize("Patient:", "dim")} ${colorize(data.patientInfo.name || data.patientInfo.id, "white")} ${colorize(`(${data.patientInfo.age}yo, ${data.patientInfo.gender})`, "gray")}`
    );
  }
  
  if (data.sessionInfo) {
    const sessionInfo = data.sessionInfo;
    console.log(
      `  ${colorize("Session:", "dim")} ${colorize(sessionInfo.sessionId?.substring(0, 8) || "N/A", "white")} ${colorize(`Step: ${sessionInfo.stepId || "N/A"}`, "gray")}`
    );
    if (sessionInfo.userMessage) {
      console.log(
        `  ${colorize("Message:", "dim")} ${colorize(truncateMessage(sessionInfo.userMessage, 80), "white")}`
      );
    }
  }
  
  if (data.url) {
    console.log(
      `  ${colorize("URL:", "dim")} ${colorize(data.url, "blue")}`
    );
  }
}

function logServiceResponse(
  prefix: string,
  service: string,
  method: string,
  requestId: string,
  duration: number,
  response: any,
  status: string,
): void {
  const time = formatTime();
  const shortRequestId = requestId.split("_").pop()?.substring(0, 8) || requestId;
  const statusColor = status === "success" ? "green" : status === "error" ? "red" : "yellow";
  const durationColor = duration > 3000 ? "yellow" : duration > 1000 ? "white" : "green";
  
  console.log(
    `${colorize(prefix, "cyan")} ${colorize("✓", status === "success" ? "green" : "red")} ${colorize(method, "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), durationColor)} ${colorize(time, "dim")}`
  );
  
  if (response.message) {
    console.log(
      `  ${colorize("Response:", "dim")} ${colorize(truncateMessage(response.message, 80), "white")}`
    );
  }
  
  if (response.emotion) {
    const emotionColors: Record<string, keyof typeof COLORS> = {
      anger: "red",
      sadness: "blue",
      joy: "yellow",
      trust: "green",
      surprise: "magenta",
      anticipation: "cyan",
      disgust: "red",
      base: "gray",
    };
    const emotionColor = emotionColors[response.emotion] || "white";
    console.log(
      `  ${colorize("Emotion:", "dim")} ${colorize(response.emotion, emotionColor)}`
    );
  }
  
  if (response.topic) {
    console.log(
      `  ${colorize("Topic:", "dim")} ${colorize(response.topic, "cyan")}`
    );
  }
  
  if (response.reasoning_time !== undefined) {
    console.log(
      `  ${colorize("Reasoning:", "dim")} ${colorize(`${response.reasoning_time}s`, "gray")}`
    );
  }
}

function logServiceError(
  prefix: string,
  service: string,
  method: string,
  requestId: string,
  duration: number,
  error: unknown,
  status: string = "error",
): void {
  const time = formatTime();
  const shortRequestId = requestId.split("_").pop()?.substring(0, 8) || requestId;
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  
  console.log(
    `${colorize(prefix, "cyan")} ${colorize("✗", "red")} ${colorize(method, "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), "red")} ${colorize(time, "dim")}`
  );
  
  console.log(
    `  ${colorize("Error:", "red")} ${colorize(errorMessage, "white")}`
  );
  
  if (error instanceof Error && error.stack && process.env.NODE_ENV === "development") {
    const stackLines = error.stack.split("\n").slice(1, 3);
    stackLines.forEach((line) => {
      console.log(`  ${colorize(line.trim(), "gray")}`);
    });
  }
}

function simulateDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, delay));
}





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

export class APIConfigurationError extends PatientResponseGeneratorError {
  constructor(message: string = "API configuration error") {
    super(message, "API_CONFIG_ERROR", 500);
    this.name = "APIConfigurationError";
  }
}

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

export class PatientInitializationError extends PatientResponseGeneratorError {
  public readonly patientId: string;

  constructor(message: string, patientId: string, statusCode: number = 400) {
    super(message, "PATIENT_INITIALIZATION_ERROR", statusCode);
    this.name = "PatientInitializationError";
    this.patientId = patientId;
  }
}

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





const ENHANCED_PATIENT_RESPONSES: Record<string, PatientResponse[]> = {
  "Franklin Johnson": [
    {
      message:
        "È difficile concentrarsi in classe dopo aver lavorato tutta la notte... A volte mi chiedo se ce la farò.",
      emotion: "sadness",
    },
    {
      message:
        "I miei genitori non capiscono davvero perché ho scelto questa università. Mi sento solo in questo.",
      emotion: "sadness",
    },
    {
      message:
        "Dopo la rottura con la mia ragazza, continuo a pensare ai soldi, ai voti, al futuro... Non riesco a smettere.",
      emotion: "anticipation",
    },
    {
      message:
        "A volte mi sento come se volessi mollare tutto. Non è che voglia farmi del male, ma... è tutto così difficile.",
      emotion: "sadness",
    },
    {
      message:
        "Grazie per ascoltarmi. Mia cugina aveva ragione a dirmi di venire qui. Non è stato facile per me fare questo passo.",
      emotion: "trust",
    },
    {
      message:
        "Quando ho un giorno libero, sto bene con i miei amici. È solo che... tutto il resto è troppo pesante.",
      emotion: "base",
    },
    {
      message:
        "Lei mi sta aiutando a vedere le cose in modo diverso. Non avevo mai pensato che potessi avere dei punti di forza.",
      emotion: "surprise",
    },
    {
      message:
        "Essere il primo della mia famiglia ad andare al college dovrebbe essere un orgoglio, ma a volte sembra solo un peso.",
      emotion: "sadness",
    },
    {
      message:
        "Sul campus ho vissuto episodi di discriminazione razziale. Mi fa arrabbiare e mi fa sentire ancora più fuori posto.",
      emotion: "anger",
    },
    {
      message:
        "I miei voti stanno calando e questo mi scoraggia. Non sono mai stato così.",
      emotion: "sadness",
    },
  ],
  "Juanita Pérez": [
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
    {
      message:
        "I miei capi sembrano sempre fantastici all'inizio, ma poi si rivelano tutti degli idioti. È sempre la stessa storia.",
      emotion: "anger",
    },
    {
      message:
        "Mi vergogno così tanto di me stessa. Non riesco nemmeno a lavorare come impiegata.",
      emotion: "sadness",
    },
    {
      message:
        "Mio padre voleva che fossi un successo. Invece guarda dove sono finita.",
      emotion: "sadness",
    },
    {
      message:
        "A volte penso di essere qui per fare qualcosa di grande. Poi mi guardo allo specchio e... niente.",
      emotion: "sadness",
    },
  ],
};

const responseCache = new Map<string, PatientResponse[]>();

const contextCache = new Map<string, PatientResponse[]>();

const CACHE_CONFIG = {
  MAX_CONTEXT_CACHE_SIZE: 100, 
  CACHE_CLEANUP_INTERVAL: 300000, 
};

let lastCacheCleanup = Date.now();

function cleanupCache(): void {
  const now = Date.now();
  if (now - lastCacheCleanup < CACHE_CONFIG.CACHE_CLEANUP_INTERVAL) {
    return;
  }

  
  if (contextCache.size > CACHE_CONFIG.MAX_CONTEXT_CACHE_SIZE) {
    contextCache.clear();
    console.log(
      `${colorize("🧹 [CACHE]", "yellow")} ${colorize("Cleared contextual response cache", "dim")}`
    );
  }

  lastCacheCleanup = now;
}

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

function getCachedResponses(patientName: string): PatientResponse[] {
  if (responseCache.has(patientName)) {
    return responseCache.get(patientName)!;
  }

  const responses =
    ENHANCED_PATIENT_RESPONSES[patientName] || GENERIC_RESPONSES;
  responseCache.set(patientName, responses);
  return responses;
}

function getCachedContextualResponses(
  cacheKey: string,
  responses: PatientResponse[],
): PatientResponse[] {
  if (contextCache.has(cacheKey)) {
    return contextCache.get(cacheKey)!;
  }

  
  return responses;
}

function setCachedContextualResponses(
  cacheKey: string,
  responses: PatientResponse[],
): void {
  contextCache.set(cacheKey, responses);
}

function selectContextualResponse(
  patientInfo: PatientInfo,
  userMessage: string,
  conversationHistory: GenerateResponseInput["conversationHistory"] = [],
): PatientResponse {
  
  cleanupCache();
  
  
  const responses = getCachedResponses(patientInfo.name);

  
  const recentMessages = conversationHistory
    .slice(-LOG_CONFIG.MAX_CONVERSATION_HISTORY)
    .map((m) => m.content.toLowerCase())
    .join(" ");
  
  const timestampComponent = Math.floor(Date.now() / 10000); 
  const cacheKey = `${patientInfo.name}_${userMessage.toLowerCase()}_${recentMessages}_${timestampComponent}`;

  
  let filteredResponses = getCachedContextualResponses(cacheKey, responses);

  
  if (filteredResponses === responses) {
    filteredResponses = performContextualAnalysis(
      responses,
      userMessage,
      recentMessages,
    );
    setCachedContextualResponses(cacheKey, filteredResponses);
  }

  
  const randomSeed = Math.random() * 1000 + Date.now() % 1000;
  const selectedIndex = Math.floor((randomSeed * Math.random()) % filteredResponses.length);
  const selectedResponse = filteredResponses[selectedIndex];
  
  
  console.log(
    `${colorize("🎲 [RANDOMIZATION]", "magenta")} ${colorize(patientInfo.name, "white")} ${colorize(`(${filteredResponses.length} responses)`, "gray")} ${colorize(`→ #${selectedIndex}`, "cyan")}`
  );
  
  if (!selectedResponse) {
    
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

function performContextualAnalysis(
  responses: PatientResponse[],
  userMessage: string,
  recentMessages: string,
): PatientResponse[] {
  const userMessageLower = userMessage.toLowerCase();
  const contextText = `${userMessageLower} ${recentMessages}`;

  
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

  
  for (const pattern of keywordPatterns) {
    if (pattern.keywords.some((keyword) => contextText.includes(keyword))) {
      const filtered = responses.filter(pattern.filter);
      if (filtered.length > 0) {
        return filtered;
      }
    }
  }

  
  return responses;
}

export interface ExternalAIService {
  generateResponse(input: GenerateResponseInput): Promise<PatientResponse>;
  initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse>;
  generateChatResponse(input: ChatRequest): Promise<ChatResponse>;
}

class MockExternalAIService implements ExternalAIService {
  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    
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

    
    const requestId = generateRequestId();
    logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "Simulating External AI API",
      "initializePatient",
      requestId,
      {
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INITIALIZE_PATIENT}`,
        httpMethod: "POST",
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

    
    logServiceResponse(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "External AI API",
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
    
    if (response.external_patient_id) {
      console.log(
        `  ${colorize("External ID:", "dim")} ${colorize(response.external_patient_id, "cyan")}`
      );
    }

    return response;
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    
    const requestId = generateRequestId();
    logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "Simulating External AI API",
      "generateChatResponse",
      requestId,
      {
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_RESPONSE}`,
        httpMethod: "POST",
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
      "È strano, ma quando parlo con lei mi sento meno solo. Non so perché.",
      "Tutto sembra così complicato. A volte vorrei solo scappare da tutto.",
      "Lei mi fa delle domande che non mi sono mai posta. È... interessante.",
      "Forse c'è speranza. Non lo so, ma per la prima volta non mi sento completamente persa.",
      "A volte penso che sia tutto nella mia testa. Ma poi ricordo che i sintomi sono reali.",
      "Mia moglie dice che sono cambiato. Forse ha ragione, ma non so come tornare indietro.",
      "Il lavoro mi sta consumando. Ogni giorno è una lotta per mantenere la concentrazione.",
      "Lei mi fa riflettere su cose che non avevo mai considerato. È... illuminante.",
    ];

    
    const randomSeed = Math.random() * 1000 + Date.now() % 1000;
    const responseIndex = Math.floor((randomSeed * Math.random()) % sampleResponses.length);
    const emotionIndex = Math.floor((randomSeed * Math.random() * 0.7) % emotions.length);
    const topicIndex = Math.floor((randomSeed * Math.random() * 0.5) % topics.length);

    const selectedResponse =
      sampleResponses[responseIndex] ||
      "Mi dispiace, non sono sicuro di come rispondere.";
    const selectedEmotion =
      emotions[emotionIndex] || "base";
    const selectedTopic =
      topics[topicIndex] || "generale";
    
    console.log(
      `${colorize("🎲 [CHAT RANDOMIZATION]", "magenta")} ${colorize(`${sampleResponses.length} responses`, "gray")} ${colorize(`→ #${responseIndex}`, "cyan")} ${colorize(`[${selectedEmotion}]`, "yellow")} ${colorize(`(${selectedTopic})`, "blue")}`
    );

    const response = {
      message: selectedResponse,
      reasoning_time: Math.floor(Math.random() * 3) + 1, 
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

    
    logServiceResponse(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "External AI API",
      "generateChatResponse",
      requestId,
      duration,
      response,
      "success",
    );

    return response;
  }
}

class RealExternalAIService implements ExternalAIService {
  private apiKey = env.EXTERNAL_AI_API_KEY;

  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_RESPONSE}`;
    
    // Format request body based on API mode
    const requestBody = API_CONFIG.IS_REMOTE ? {
      session_id: input.sessionId,
      user_input: input.userMessage,
    } : {
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

    
    logServiceCall(
      LOG_CONFIG.PREFIXES.REAL_AI,
      "External AI API",
      "generateResponse",
      requestId,
      {
        url: apiUrl,
        httpMethod: "POST",
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
          userMessage: truncateMessage(input.userMessage),
          conversationHistoryLength: input.conversationHistory?.length || 0,
        },
      },
    );

    try {
      const apiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_RESPONSE}`;
      const response = await fetch(apiUrl, {
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
        logServiceError(
          LOG_CONFIG.PREFIXES.REAL_AI,
          "External AI API",
          "generateResponse",
          requestId,
          duration,
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          "error",
        );
        console.log(
          `  ${colorize("URL:", "dim")} ${colorize(apiUrl, "red")}`
        );
        throw new Error(
          `External AI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Handle response format based on API mode
      const result = API_CONFIG.IS_REMOTE ? {
        message: data.message,
        emotion: data.emotion,
        timestamp: new Date(data.timestamp || new Date()),
      } : {
        message: data.response.message,
        emotion: data.response.emotion,
        timestamp: new Date(data.response.timestamp || new Date()),
      };

      
      logServiceResponse(
        LOG_CONFIG.PREFIXES.REAL_AI,
        "External AI API",
        "generateResponse",
        requestId,
        duration,
        result,
        "success",
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      logServiceError(
        LOG_CONFIG.PREFIXES.REAL_AI,
        "External AI API",
        "generateResponse",
        requestId,
        duration,
        error,
        "error",
      );
      
      console.log(
        `  ${colorize("URL:", "dim")} ${colorize(apiUrl, "red")}`
      );
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
    const apiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INITIALIZE_PATIENT}`;
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

    
    logServiceCall(
      LOG_CONFIG.PREFIXES.REAL_AI,
      "External AI API",
      "initializePatient",
      requestId,
      {
        url: apiUrl,
        httpMethod: "POST",
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
      },
    );

    try {
      const response = await fetch(apiUrl, {
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
        logServiceError(
          LOG_CONFIG.PREFIXES.REAL_AI,
          "External AI API",
          "initializePatient",
          requestId,
          duration,
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          "error",
        );
        console.log(
          `  ${colorize("URL:", "dim")} ${colorize(apiUrl, "red")}`
        );
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

      
      logServiceResponse(
        LOG_CONFIG.PREFIXES.REAL_AI,
        "External AI API",
        "initializePatient",
        requestId,
        duration,
        {
          status: result.status,
          code: result.code,
          message: result.message,
        },
        "success",
      );
      
      if (result.external_patient_id) {
        console.log(
          `  ${colorize("External ID:", "dim")} ${colorize(result.external_patient_id, "cyan")}`
        );
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      logServiceError(
        LOG_CONFIG.PREFIXES.REAL_AI,
        "External AI API",
        "initializePatient",
        requestId,
        duration,
        error,
        "error",
      );
      
      console.log(
        `  ${colorize("URL:", "dim")} ${colorize(apiUrl, "red")}`
      );
      throw error;
    }
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_RESPONSE}`;

    
    logServiceCall(
      LOG_CONFIG.PREFIXES.REAL_AI,
      "External AI API",
      "generateChatResponse",
      requestId,
      {
        url: apiUrl,
        httpMethod: "POST",
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
        logServiceError(
          LOG_CONFIG.PREFIXES.REAL_AI,
          "External AI API",
          "generateChatResponse",
          requestId,
          duration,
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          "error",
        );
        console.log(
          `  ${colorize("URL:", "dim")} ${colorize(apiUrl, "red")}`
        );
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

      
      logServiceResponse(
        LOG_CONFIG.PREFIXES.REAL_AI,
        "External AI API",
        "generateChatResponse",
        requestId,
        duration,
        result,
        "success",
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      logServiceError(
        LOG_CONFIG.PREFIXES.REAL_AI,
        "External AI API",
        "generateChatResponse",
        requestId,
        duration,
        error,
        "error",
      );
      
      console.log(
        `  ${colorize("URL:", "dim")} ${colorize(apiUrl, "red")}`
      );
      throw error;
    }
  }
}

export class PatientResponseGenerator {
  private externalAI: ExternalAIService;
  private useExternalAI: boolean;

  constructor(useExternalAI?: boolean) {
    // Use environment variable if not explicitly provided
    if (useExternalAI === undefined) {
      this.useExternalAI = env.API === "remote";
    } else {
      this.useExternalAI = useExternalAI;
    }
    
    // Fallback to MOCK AI if REAL AI is requested but API key is not configured
    if (this.useExternalAI && !env.EXTERNAL_AI_API_KEY) {
      console.warn(
        `${colorize("⚠", "yellow")} ${colorize("[PATIENT RESPONSE GENERATOR]", "cyan")} ${colorize("EXTERNAL_AI_API_KEY not configured. Falling back to MOCK AI.", "yellow")}`
      );
      this.useExternalAI = false;
    }
    
    this.externalAI = this.useExternalAI
      ? new RealExternalAIService()
      : new MockExternalAIService();
  }

    async generateResponse(
    input: GenerateResponseInput,
  ): Promise<PatientResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const time = formatTime();
    const shortRequestId = requestId.split("_").pop()?.substring(0, 8) || requestId;
    const serviceType = this.useExternalAI ? colorize("REAL", "green") : colorize("MOCK", "yellow");
    
    console.log(
      `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("→", "blue")} ${colorize("generateResponse", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${serviceType} ${colorize(time, "dim")}`
    );
    
    console.log(
      `  ${colorize("Patient:", "dim")} ${colorize(input.patientInfo.name, "white")} ${colorize(`(${input.patientInfo.age}yo, ${input.patientInfo.gender})`, "gray")}`
    );
    
    console.log(
      `  ${colorize("Session:", "dim")} ${colorize(input.sessionId.substring(0, 8), "white")} ${colorize(`Step: ${input.stepId}`, "gray")}`
    );
    
    if (input.userMessage) {
      console.log(
        `  ${colorize("Message:", "dim")} ${colorize(truncateMessage(input.userMessage, 80), "white")}`
      );
    }
    
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      console.log(
        `  ${colorize("History:", "dim")} ${colorize(`${input.conversationHistory.length} messages`, "gray")}`
      );
    }

    try {
      let result: PatientResponse;

      result = await this.externalAI.generateResponse(input);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const durationColor = duration > 3000 ? "yellow" : duration > 1000 ? "white" : "green";

      console.log(
        `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("✓", "green")} ${colorize("generateResponse", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), durationColor)} ${colorize(formatTime(), "dim")}`
      );
      
      console.log(
        `  ${colorize("Response:", "dim")} ${colorize(truncateMessage(result.message, 80), "white")}`
      );
      
      const emotionColors: Record<string, keyof typeof COLORS> = {
        anger: "red",
        sadness: "blue",
        joy: "yellow",
        trust: "green",
        surprise: "magenta",
        anticipation: "cyan",
        disgust: "red",
        base: "gray",
      };
      const emotionColor = emotionColors[result.emotion] || "white";
      console.log(
        `  ${colorize("Emotion:", "dim")} ${colorize(result.emotion, emotionColor)}`
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("⚠", "yellow")} ${colorize("generateResponse", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), "yellow")} ${colorize(formatTime(), "dim")} ${colorize("→ FALLBACK", "yellow")}`
      );
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log(
        `  ${colorize("Error:", "red")} ${colorize(errorMessage, "white")}`
      );

      
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
        
        const fallbackResult = {
          message:
            "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
          emotion: "base" as const,
          timestamp: new Date(),
        };

        console.log(
          `  ${colorize("→", "yellow")} ${colorize("Emergency fallback", "yellow")}`
        );

        return fallbackResult;
      }

      const fallbackResult = {
        message: selectedResponse.message,
        emotion: selectedResponse.emotion,
        timestamp: new Date(),
      };

      console.log(
        `  ${colorize("→", "yellow")} ${colorize("Predefined fallback", "yellow")}`
      );
      
      console.log(
        `  ${colorize("Response:", "dim")} ${colorize(truncateMessage(fallbackResult.message, 80), "white")}`
      );
      
      const emotionColors: Record<string, keyof typeof COLORS> = {
        anger: "red",
        sadness: "blue",
        joy: "yellow",
        trust: "green",
        surprise: "magenta",
        anticipation: "cyan",
        disgust: "red",
        base: "gray",
      };
      const emotionColor = emotionColors[fallbackResult.emotion] || "white";
      console.log(
        `  ${colorize("Emotion:", "dim")} ${colorize(fallbackResult.emotion, emotionColor)}`
      );

      return fallbackResult;
    }
  }

    setExternalAI(service: ExternalAIService) {
    this.externalAI = service;
    this.useExternalAI = true;
  }

    setUseExternalAI(use: boolean) {
    this.useExternalAI = use;
  }

    async initializePatient(
    input: InitializePatientInput,
  ): Promise<PatientInitializationResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const time = formatTime();
    const shortRequestId = requestId.split("_").pop()?.substring(0, 8) || requestId;
    const serviceType = this.useExternalAI ? colorize("REAL", "green") : colorize("MOCK", "yellow");
    
    console.log(
      `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("→", "blue")} ${colorize("initializePatient", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${serviceType} ${colorize(time, "dim")}`
    );
    
    console.log(
      `  ${colorize("Patient:", "dim")} ${colorize(input.patientInfo.name, "white")} ${colorize(`(${input.patientInfo.age}yo, ${input.patientInfo.gender})`, "gray")}`
    );
    
    console.log(
      `  ${colorize("Session:", "dim")} ${colorize(input.sessionId.substring(0, 8), "white")}`
    );

    try {
      let result: PatientInitializationResponse;

      result = await this.externalAI.initializePatient(input);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const durationColor = duration > 3000 ? "yellow" : duration > 1000 ? "white" : "green";
      const statusColor = result.status === "success" ? "green" : "red";

      console.log(
        `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("✓", statusColor)} ${colorize("initializePatient", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), durationColor)} ${colorize(formatTime(), "dim")}`
      );
      
      console.log(
        `  ${colorize("Status:", "dim")} ${colorize(result.status.toUpperCase(), statusColor)} ${colorize(`(${result.code})`, "gray")}`
      );
      
      if (result.external_patient_id) {
        console.log(
          `  ${colorize("External ID:", "dim")} ${colorize(result.external_patient_id, "cyan")}`
        );
      }
      
      if (result.message) {
        console.log(
          `  ${colorize("Message:", "dim")} ${colorize(result.message, "white")}`
        );
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("✗", "red")} ${colorize("initializePatient", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), "red")} ${colorize(formatTime(), "dim")} ${colorize("→ FALLBACK", "yellow")}`
      );
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log(
        `  ${colorize("Error:", "red")} ${colorize(errorMessage, "white")}`
      );

      
      const fallbackResult = {
        status: "error" as const,
        code: "INITIALIZATION_FAILED",
        message:
          "Errore durante l'inizializzazione del paziente nel servizio esterno",
        timestamp: new Date().toISOString(),
      };

      console.log(
        `  ${colorize("→", "yellow")} ${colorize("Error fallback", "yellow")}`
      );
      
      console.log(
        `  ${colorize("Status:", "dim")} ${colorize(fallbackResult.status.toUpperCase(), "red")} ${colorize(`(${fallbackResult.code})`, "gray")}`
      );
      
      if (fallbackResult.message) {
        console.log(
          `  ${colorize("Message:", "dim")} ${colorize(fallbackResult.message, "white")}`
        );
      }

      return fallbackResult;
    }
  }

    async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const time = formatTime();
    const shortRequestId = requestId.split("_").pop()?.substring(0, 8) || requestId;
    const serviceType = this.useExternalAI ? colorize("REAL", "green") : colorize("MOCK", "yellow");
    
    console.log(
      `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("→", "blue")} ${colorize("generateChatResponse", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${serviceType} ${colorize(time, "dim")}`
    );
    
    console.log(
      `  ${colorize("External ID:", "dim")} ${colorize(input.external_patient_id.substring(0, 16), "white")}`
    );
    
    console.log(
      `  ${colorize("Session:", "dim")} ${colorize(input.session_id.substring(0, 8), "white")} ${colorize(`Step: ${input.step_id}`, "gray")}`
    );
    
    if (input.user_message) {
      console.log(
        `  ${colorize("Message:", "dim")} ${colorize(truncateMessage(input.user_message, 80), "white")}`
      );
    }

    try {
      let result: ChatResponse;

      result = await this.externalAI.generateChatResponse(input);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const durationColor = duration > 5000 ? "yellow" : duration > 2000 ? "white" : "green";

      console.log(
        `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("✓", "green")} ${colorize("generateChatResponse", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), durationColor)} ${colorize(formatTime(), "dim")}`
      );
      
      console.log(
        `  ${colorize("Response:", "dim")} ${colorize(truncateMessage(result.message, 80), "white")}`
      );
      
      const emotionColors: Record<string, keyof typeof COLORS> = {
        anger: "red",
        sadness: "blue",
        joy: "yellow",
        trust: "green",
        surprise: "magenta",
        anticipation: "cyan",
        disgust: "red",
        base: "gray",
      };
      const emotionColor = emotionColors[result.emotion] || "white";
      console.log(
        `  ${colorize("Emotion:", "dim")} ${colorize(result.emotion, emotionColor)} ${colorize(`| Topic: ${result.topic}`, "gray")} ${colorize(`| Reasoning: ${result.reasoning_time}s`, "gray")}`
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `${colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "cyan")} ${colorize("⚠", "yellow")} ${colorize("generateChatResponse", "bright")} ${colorize(`[${shortRequestId}]`, "gray")} ${colorize(formatDuration(duration), "yellow")} ${colorize(formatTime(), "dim")} ${colorize("→ FALLBACK", "yellow")}`
      );
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log(
        `  ${colorize("Error:", "red")} ${colorize(errorMessage, "white")}`
      );

      
      const fallbackResult = {
        message:
          "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
        reasoning_time: 0,
        emotion: "base" as const,
        topic: "generale",
        timestamp: new Date().toISOString(),
      };

      console.log(
        `  ${colorize("→", "yellow")} ${colorize("Fallback chat response", "yellow")}`
      );
      
      console.log(
        `  ${colorize("Response:", "dim")} ${colorize(truncateMessage(fallbackResult.message, 80), "white")}`
      );
      
      console.log(
        `  ${colorize("Emotion:", "dim")} ${colorize(fallbackResult.emotion, "gray")} ${colorize(`| Topic: ${fallbackResult.topic}`, "gray")}`
      );

      return fallbackResult;
    }
  }
}


export const patientResponseGenerator = new PatientResponseGenerator(); 
