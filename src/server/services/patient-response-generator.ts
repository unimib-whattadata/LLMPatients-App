
import { createLogger } from "~/lib/logger";

const baseLogger = createLogger("PatientResponseGenerator");

export type PatientEmotion =
  | "SEEKING"
  | "RAGE"
  | "FEAR"
  | "CARE"
  | "LUST"
  | "SADNESS"
  | "PLAY"
  | "base";

export type ResponseStatus = "success" | "error";

export type ServiceType = "mock" | "real";

export type LogLevel = "info" | "warn" | "error" | "debug";

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
    emotion?: PatientEmotion;
    topic?: string;
    reasoningTime?: number;
    status?: string;
    code?: string;
    externalPatientId?: string;
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
  metadata?: ResponseMetadata;
}

export interface ChatRequest {
  external_patient_id: string;
  user_message: string;
  session_id: string;
  step_id: number;
  therapist_id: string;
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
      INITIALIZE_PATIENT: isRemote ? (env.API_INITIALIZE_PATIENT_ENDPOINT || "/patient") : "/mock/initialise-patient",
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
    "SADNESS",
    "RAGE",
    "SEEKING",
    "CARE",
    "FEAR",
    "PLAY",
    "LUST",
    "base",
  ] as PatientEmotion[],
} as const;

// Enhanced ANSI color codes with better contrast
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
  // Enhanced colors with better visibility
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
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

// Optimized Logger class with improved formatting and colors
class PatientResponseLogger {
  private static readonly EMOTION_COLORS: Record<PatientEmotion, keyof typeof COLORS> = {
    SEEKING: "brightCyan",
    RAGE: "brightRed",
    FEAR: "magenta",
    CARE: "brightGreen",
    LUST: "brightMagenta",
    SADNESS: "blue",
    PLAY: "brightYellow",
    base: "gray",
  };

  // Centralized log output - allows easy switching to different logger in future
  private static log(message: string): void {
    // Using console.log for formatted ANSI output
    // The formatting is already applied to the message string
    console.log(message);
  }

  private static formatTime(date: Date = new Date()): string {
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  private static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private static colorize(text: string, color: keyof typeof COLORS): string {
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  private static truncateMessage(
    message: string,
    maxLength: number = LOG_CONFIG.MAX_MESSAGE_LENGTH,
  ): string {
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  }

  private static shortenRequestId(requestId: string): string {
    return requestId.split("_").pop()?.substring(0, 8) || requestId;
  }

  private static getDurationColor(duration: number, thresholds: { slow: number; medium: number }): keyof typeof COLORS {
    if (duration > thresholds.slow) return "brightYellow";
    if (duration > thresholds.medium) return "white";
    return "brightGreen";
  }

  private static createBadge(text: string, color: keyof typeof COLORS): string {
    return `${this.colorize("▌", color)}${this.colorize(` ${text} `, "bright")}${this.colorize("▌", color)}`;
  }

  private static createSeparator(char: string = "─", length: number = 50): string {
    return this.colorize(char.repeat(length), "gray");
  }

  // Service call logging
  static logServiceCall(
    prefix: string,
    method: string,
    requestId: string,
    data: {
      patientInfo?: { id?: string; name?: string; age?: number; gender?: string };
      sessionInfo?: { sessionId?: string; stepId?: number; userMessage?: string };
      url?: string;
    },
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    
    // Header line
    this.log(
      `${this.colorize(prefix, "brightCyan")} ${this.colorize("▶", "brightBlue")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Details section
    const details: string[] = [];
    
    if (data.patientInfo) {
      const { name, id, age, gender } = data.patientInfo;
      const patientInfo = age && gender 
        ? `${this.colorize(name || id || "N/A", "white")} ${this.colorize(`(${age}yo, ${gender})`, "gray")}`
        : this.colorize(name || id || "N/A", "white");
      details.push(`  ${this.colorize("👤", "dim")} ${this.colorize("Patient:", "dim")} ${patientInfo}`);
    }
    
    if (data.sessionInfo) {
      const { sessionId, stepId, userMessage } = data.sessionInfo;
      const sessionInfo = stepId 
        ? `${this.colorize(sessionId?.substring(0, 8) || "N/A", "white")} ${this.colorize(`│ Step: ${stepId}`, "gray")}`
        : this.colorize(sessionId?.substring(0, 8) || "N/A", "white");
      details.push(`  ${this.colorize("💬", "dim")} ${this.colorize("Session:", "dim")} ${sessionInfo}`);
      
      if (userMessage) {
        details.push(`  ${this.colorize("📝", "dim")} ${this.colorize("Message:", "dim")} ${this.colorize(this.truncateMessage(userMessage, 75), "white")}`);
      }
    }
    
    if (data.url) {
      details.push(`  ${this.colorize("🔗", "dim")} ${this.colorize("URL:", "dim")} ${this.colorize(data.url, "brightBlue")}`);
    }

    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Service response logging
  static logServiceResponse(
    prefix: string,
    method: string,
    requestId: string,
    duration: number,
    response: {
      message?: string;
      emotion?: PatientEmotion;
      topic?: string;
      reasoning_time?: number;
      status?: string;
      code?: string;
      external_patient_id?: string;
    },
    status: "success" | "error" | "warning" = "success",
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const statusIcon = status === "success" ? "✓" : status === "error" ? "✗" : "⚠";
    const statusColor = status === "success" ? "brightGreen" : status === "error" ? "brightRed" : "brightYellow";
    const durationColor = this.getDurationColor(duration, { slow: 3000, medium: 1000 });
    const durationBadge = this.createBadge(this.formatDuration(duration), durationColor);
    
    // Header line with status and duration
    this.log(
      `${this.colorize(prefix, "brightCyan")} ${this.colorize(statusIcon, statusColor)} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Response details
    const details: string[] = [];
    
    if (response.message) {
      details.push(`  ${this.colorize("💭", "dim")} ${this.colorize("Response:", "dim")} ${this.colorize(this.truncateMessage(response.message, 75), "white")}`);
    }
    
    if (response.emotion) {
      const emotionColor = this.EMOTION_COLORS[response.emotion] || "white";
      const emotionBadge = this.createBadge(response.emotion, emotionColor);
      const extraInfo: string[] = [];
      
      if (response.topic) {
        extraInfo.push(this.colorize(`Topic: ${response.topic}`, "brightCyan"));
      }
      if (response.reasoning_time !== undefined) {
        extraInfo.push(this.colorize(`Reasoning: ${response.reasoning_time}s`, "gray"));
      }
      
      const extraInfoStr = extraInfo.length > 0 ? ` ${this.colorize("│", "gray")} ${extraInfo.join(` ${this.colorize("│", "gray")} `)}` : "";
      details.push(`  ${this.colorize("😊", "dim")} ${this.colorize("Emotion:", "dim")} ${emotionBadge}${extraInfoStr}`);
    } else {
      // If no emotion, show topic and reasoning separately
      if (response.topic) {
        details.push(`  ${this.colorize("🏷️", "dim")} ${this.colorize("Topic:", "dim")} ${this.colorize(response.topic, "brightCyan")}`);
      }
      if (response.reasoning_time !== undefined) {
        details.push(`  ${this.colorize("⏱️", "dim")} ${this.colorize("Reasoning:", "dim")} ${this.colorize(`${response.reasoning_time}s`, "gray")}`);
      }
    }

    if (response.status) {
      const statusColor = response.status === "success" ? "brightGreen" : "brightRed";
      const statusBadge = this.createBadge(response.status.toUpperCase(), statusColor);
      const codeInfo = response.code ? ` ${this.colorize(`(${response.code})`, "gray")}` : "";
      details.push(`  ${this.colorize("📊", "dim")} ${this.colorize("Status:", "dim")} ${statusBadge}${codeInfo}`);
    }

    if (response.external_patient_id) {
      details.push(`  ${this.colorize("🆔", "dim")} ${this.colorize("External ID:", "dim")} ${this.colorize(response.external_patient_id, "brightCyan")}`);
    }

    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Service error logging
  static logServiceError(
    prefix: string,
    method: string,
    requestId: string,
    duration: number,
    error: unknown,
    url?: string,
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const durationBadge = this.createBadge(this.formatDuration(duration), "brightRed");
    
    // Header line
    this.log(
      `${this.colorize(prefix, "brightCyan")} ${this.colorize("✗", "brightRed")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Error details
    this.log(
      `  ${this.colorize("❌", "brightRed")} ${this.colorize("Error:", "brightRed")} ${this.colorize(errorMessage, "white")}`
    );
    
    if (url) {
      this.log(
        `  ${this.colorize("🔗", "dim")} ${this.colorize("URL:", "dim")} ${this.colorize(url, "brightRed")}`
      );
    }
    
    if (error instanceof Error && error.stack && process.env.NODE_ENV === "development") {
      const stackLines = error.stack.split("\n").slice(1, 3);
      stackLines.forEach((line) => {
        this.log(`  ${this.colorize("  └─", "gray")} ${this.colorize(line.trim(), "gray")}`);
      });
    }
  }

  // Generator method call logging
  static logGeneratorCall(
    method: string,
    requestId: string,
    serviceType: "REAL" | "MOCK",
    data: {
      patientInfo?: { name?: string; age?: number; gender?: string };
      sessionId?: string;
      stepId?: number;
      userMessage?: string;
      conversationHistoryLength?: number;
      externalPatientId?: string;
    },
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const serviceColor = serviceType === "REAL" ? "brightGreen" : "brightYellow";
    const serviceBadge = this.createBadge(serviceType, serviceColor);
    
    // Header line
    this.log(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${this.colorize("▶", "brightBlue")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${serviceBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Details section
    const details: string[] = [];
    
    if (data.patientInfo) {
      const { name, age, gender } = data.patientInfo;
      const patientInfo = age && gender 
        ? `${this.colorize(name || "N/A", "white")} ${this.colorize(`(${age}yo, ${gender})`, "gray")}`
        : this.colorize(name || "N/A", "white");
      details.push(`  ${this.colorize("👤", "dim")} ${this.colorize("Patient:", "dim")} ${patientInfo}`);
    }
    
    if (data.sessionId) {
      const sessionInfo = data.stepId 
        ? `${this.colorize(data.sessionId.substring(0, 8), "white")} ${this.colorize(`│ Step: ${data.stepId}`, "gray")}`
        : this.colorize(data.sessionId.substring(0, 8), "white");
      details.push(`  ${this.colorize("💬", "dim")} ${this.colorize("Session:", "dim")} ${sessionInfo}`);
    }
    
    if (data.userMessage) {
      details.push(`  ${this.colorize("📝", "dim")} ${this.colorize("Message:", "dim")} ${this.colorize(this.truncateMessage(data.userMessage, 75), "white")}`);
    }
    
    if (data.conversationHistoryLength && data.conversationHistoryLength > 0) {
      details.push(`  ${this.colorize("📚", "dim")} ${this.colorize("History:", "dim")} ${this.colorize(`${data.conversationHistoryLength} messages`, "gray")}`);
    }

    if (data.externalPatientId) {
      details.push(`  ${this.colorize("🆔", "dim")} ${this.colorize("External ID:", "dim")} ${this.colorize(data.externalPatientId.substring(0, 16), "white")}`);
    }

    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Generator method response logging
  static logGeneratorResponse(
    method: string,
    requestId: string,
    duration: number,
    response: {
      message?: string;
      emotion?: PatientEmotion;
      topic?: string;
      reasoning_time?: number;
      status?: string;
      code?: string;
      external_patient_id?: string;
    },
    status: "success" | "error" | "warning" = "success",
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const statusIcon = status === "success" ? "✓" : status === "error" ? "✗" : "⚠";
    const statusColor = status === "success" ? "brightGreen" : status === "error" ? "brightRed" : "brightYellow";
    const durationColor = this.getDurationColor(duration, { slow: 3000, medium: 1000 });
    const durationBadge = this.createBadge(this.formatDuration(duration), durationColor);
    
    // Header line with status and duration
    this.log(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${this.colorize(statusIcon, statusColor)} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Response details
    const details: string[] = [];
    
    if (response.message) {
      details.push(`  ${this.colorize("💭", "dim")} ${this.colorize("Response:", "dim")} ${this.colorize(this.truncateMessage(response.message, 75), "white")}`);
    }
    
    if (response.emotion) {
      const emotionColor = this.EMOTION_COLORS[response.emotion] || "white";
      const emotionBadge = this.createBadge(response.emotion, emotionColor);
      const extraInfo: string[] = [];
      
      if (response.topic) {
        extraInfo.push(this.colorize(`Topic: ${response.topic}`, "brightCyan"));
      }
      if (response.reasoning_time !== undefined) {
        extraInfo.push(this.colorize(`Reasoning: ${response.reasoning_time}s`, "gray"));
      }
      
      const extraInfoStr = extraInfo.length > 0 ? ` ${this.colorize("│", "gray")} ${extraInfo.join(` ${this.colorize("│", "gray")} `)}` : "";
      details.push(`  ${this.colorize("😊", "dim")} ${this.colorize("Emotion:", "dim")} ${emotionBadge}${extraInfoStr}`);
    } else {
      // If no emotion, show topic and reasoning separately
      if (response.topic) {
        details.push(`  ${this.colorize("🏷️", "dim")} ${this.colorize("Topic:", "dim")} ${this.colorize(response.topic, "brightCyan")}`);
      }
      if (response.reasoning_time !== undefined) {
        details.push(`  ${this.colorize("⏱️", "dim")} ${this.colorize("Reasoning:", "dim")} ${this.colorize(`${response.reasoning_time}s`, "gray")}`);
      }
    }
    
    if (response.status) {
      const statusColor = response.status === "success" ? "brightGreen" : "brightRed";
      const statusBadge = this.createBadge(response.status.toUpperCase(), statusColor);
      const codeInfo = response.code ? ` ${this.colorize(`(${response.code})`, "gray")}` : "";
      details.push(`  ${this.colorize("📊", "dim")} ${this.colorize("Status:", "dim")} ${statusBadge}${codeInfo}`);
    }

    if (response.external_patient_id) {
      details.push(`  ${this.colorize("🆔", "dim")} ${this.colorize("External ID:", "dim")} ${this.colorize(response.external_patient_id, "brightCyan")}`);
    }

    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Generator error logging with fallback info
  static logGeneratorError(
    method: string,
    requestId: string,
    duration: number,
    error: unknown,
    fallbackType?: string,
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const durationBadge = this.createBadge(this.formatDuration(duration), "brightYellow");
    const fallbackBadge = fallbackType ? ` ${this.createBadge("FALLBACK", "brightYellow")}` : "";
    
    // Header line
    this.log(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${this.colorize("⚠", "brightYellow")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge}${fallbackBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );

    // Error details
    this.log(
      `  ${this.colorize("❌", "brightRed")} ${this.colorize("Error:", "brightRed")} ${this.colorize(errorMessage, "white")}`
    );

    if (fallbackType) {
      this.log(
        `  ${this.colorize("🔄", "brightYellow")} ${this.colorize("Fallback:", "brightYellow")} ${this.colorize(fallbackType, "white")}`
      );
    }
  }

  // Specialized logging methods
  static logRandomization(
    patientName: string,
    responseCount: number,
    selectedIndex: number,
    emotion?: PatientEmotion,
    topic?: string,
  ): void {
    const emotionBadge = emotion ? ` ${this.createBadge(emotion, this.EMOTION_COLORS[emotion] || "white")}` : "";
    const topicBadge = topic ? ` ${this.createBadge(topic, "brightBlue")}` : "";
    const countBadge = this.createBadge(`${responseCount} responses`, "gray");
    const indexBadge = this.createBadge(`#${selectedIndex}`, "brightCyan");
    
    this.log(
      `${this.colorize("🎲", "brightMagenta")} ${this.colorize("[RANDOMIZATION]", "brightMagenta")} ${this.colorize(patientName, "white")} ${countBadge} ${this.colorize("→", "gray")} ${indexBadge}${emotionBadge}${topicBadge}`
    );
  }

  static logCacheCleanup(message: string): void {
    this.log(
      `${this.colorize("🧹", "brightYellow")} ${this.colorize("[CACHE]", "brightYellow")} ${this.colorize(message, "dim")}`
    );
  }

  static logWarning(message: string): void {
    const warningBadge = this.createBadge("WARNING", "brightYellow");
    this.log(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${warningBadge} ${this.colorize(message, "white")}`
    );
  }
}

// Helper functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function truncateMessage(
  message: string,
  maxLength: number = LOG_CONFIG.MAX_MESSAGE_LENGTH,
): string {
  return message.length > maxLength
    ? `${message.substring(0, maxLength)}...`
    : message;
}

function simulateDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Helper for API calls with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;
  let isTimeout = false;

  timeoutId = setTimeout(() => {
    isTimeout = true;
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (timeoutId) clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Distinguish between timeout and other abort errors
    if (isTimeout || (error instanceof Error && error.name === 'AbortError')) {
      const timeoutError = new Error(
        `Request timeout after ${timeout}ms: ${url}`
      );
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    
    // Re-throw other errors as-is
    throw error;
  }
}

// Helper for creating request body based on API mode
function createGenerateResponseBody(
  input: GenerateResponseInput,
  isRemote: boolean,
) {
  return isRemote
    ? {
        session_id: input.sessionId,
        user_input: input.userMessage,
      }
    : {
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
}

// Helper to normalize emotion string to PatientEmotion type
function normalizeEmotion(emotion: unknown): PatientEmotion {
  if (!emotion || typeof emotion !== "string") {
    return "base";
  }
  
  // Convert to uppercase to match PatientEmotion type
  const emotionUpper = emotion.toUpperCase();
  
  // Map valid emotions
  const validEmotions: PatientEmotion[] = [
    "SEEKING",
    "RAGE",
    "FEAR",
    "CARE",
    "LUST",
    "SADNESS",
    "PLAY",
    "base",
  ];
  
  // Check if it's a valid emotion (case-insensitive)
  const matchedEmotion = validEmotions.find(
    (e) => e.toUpperCase() === emotionUpper
  );
  
  return matchedEmotion ?? "base";
}

// Helper for parsing response based on API mode
function parseGenerateResponse(
  data: unknown,
  isRemote: boolean,
): PatientResponse {
  const response = data as Record<string, unknown>;
  return isRemote
    ? {
        message: response.message as string,
        emotion: normalizeEmotion(response.emotion),
        timestamp: new Date((response.timestamp as string) || new Date()),
      }
    : {
        message: (response.response as { message: string }).message,
        emotion: normalizeEmotion((response.response as { emotion: unknown }).emotion),
        timestamp: new Date(
          ((response.response as { timestamp?: string }).timestamp ||
            new Date()) as string,
        ),
      };
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
      emotion: "SADNESS",
    },
    {
      message:
        "I miei genitori non capiscono davvero perché ho scelto questa università. Mi sento solo in questo.",
      emotion: "SADNESS",
    },
    {
      message:
        "Dopo la rottura con la mia ragazza, continuo a pensare ai soldi, ai voti, al futuro... Non riesco a smettere.",
      emotion: "SEEKING",
    },
    {
      message:
        "A volte mi sento come se volessi mollare tutto. Non è che voglia farmi del male, ma... è tutto così difficile.",
      emotion: "SADNESS",
    },
    {
      message:
        "Grazie per ascoltarmi. Mia cugina aveva ragione a dirmi di venire qui. Non è stato facile per me fare questo passo.",
      emotion: "CARE",
    },
    {
      message:
        "Quando ho un giorno libero, sto bene con i miei amici. È solo che... tutto il resto è troppo pesante.",
      emotion: "base",
    },
    {
      message:
        "Lei mi sta aiutando a vedere le cose in modo diverso. Non avevo mai pensato che potessi avere dei punti di forza.",
      emotion: "PLAY",
    },
    {
      message:
        "Essere il primo della mia famiglia ad andare al college dovrebbe essere un orgoglio, ma a volte sembra solo un peso.",
      emotion: "SADNESS",
    },
    {
      message:
        "Sul campus ho vissuto episodi di discriminazione razziale. Mi fa arrabbiare e mi fa sentire ancora più fuori posto.",
      emotion: "RAGE",
    },
    {
      message:
        "I miei voti stanno calando e questo mi scoraggia. Non sono mai stato così.",
      emotion: "SADNESS",
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
      emotion: "CARE",
    },
    {
      message:
        "A volte mi sento così arrabbiata con tutto. Non so come gestire questa rabbia.",
      emotion: "RAGE",
    },
    {
      message:
        "È strano, ma quando parlo con lei mi sento meno sola. Non so perché.",
      emotion: "CARE",
    },
    {
      message:
        "Tutto sembra così complicato. A volte vorrei solo scappare da tutto.",
      emotion: "SADNESS",
    },
    {
      message:
        "Lei mi fa delle domande che non mi sono mai posta. È... interessante.",
      emotion: "PLAY",
    },
    {
      message: "La rabbia mi divora dall'interno. Non so come fermarla.",
      emotion: "RAGE",
    },
    {
      message:
        "Forse c'è speranza. Non lo so, ma per la prima volta non mi sento completamente persa.",
      emotion: "CARE",
    },
    {
      message:
        "I miei capi sembrano sempre fantastici all'inizio, ma poi si rivelano tutti degli idioti. È sempre la stessa storia.",
      emotion: "RAGE",
    },
    {
      message:
        "Mi vergogno così tanto di me stessa. Non riesco nemmeno a lavorare come impiegata.",
      emotion: "SADNESS",
    },
    {
      message:
        "Mio padre voleva che fossi un successo. Invece guarda dove sono finita.",
      emotion: "SADNESS",
    },
    {
      message:
        "A volte penso di essere qui per fare qualcosa di grande. Poi mi guardo allo specchio e... niente.",
      emotion: "SADNESS",
    },
  ],
};

const responseCache = new Map<string, PatientResponse[]>();
const contextCache = new Map<string, PatientResponse[]>();

const CACHE_CONFIG = {
  MAX_CONTEXT_CACHE_SIZE: 100, 
  CACHE_CLEANUP_INTERVAL: 300000, // 5 minutes
} as const;

let lastCacheCleanup = Date.now();

function cleanupCache(): void {
  const now = Date.now();
  if (now - lastCacheCleanup < CACHE_CONFIG.CACHE_CLEANUP_INTERVAL) {
    return;
  }

  if (contextCache.size > CACHE_CONFIG.MAX_CONTEXT_CACHE_SIZE) {
    // Clear oldest entries (simple FIFO approach)
    const entriesToDelete = contextCache.size - CACHE_CONFIG.MAX_CONTEXT_CACHE_SIZE;
    const keysToDelete = Array.from(contextCache.keys()).slice(0, entriesToDelete);
    keysToDelete.forEach((key) => contextCache.delete(key));
    
    if (keysToDelete.length > 0) {
      PatientResponseLogger.logCacheCleanup(`Cleared ${keysToDelete.length} entries from contextual response cache`);
    }
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
  if (responses.length === 0) {
    return {
      message: "I'm sorry, I'm not sure how to respond. Could you repeat that?",
      emotion: "base",
      timestamp: new Date(),
    };
  }

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
    if (filteredResponses.length > 0) {
      setCachedContextualResponses(cacheKey, filteredResponses);
    }
  }

  if (filteredResponses.length === 0) {
    filteredResponses = responses;
  }

  const selectedIndex = Math.floor(Math.random() * filteredResponses.length);
  const selectedResponse = filteredResponses[selectedIndex]!;
  
  PatientResponseLogger.logRandomization(
    patientInfo.name,
    filteredResponses.length,
    selectedIndex,
  );

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
  const contextText = `${userMessage.toLowerCase()} ${recentMessages}`;

  // Pre-compile keyword patterns for better performance
  const keywordPatterns = [
    {
      keywords: ["famiglia", "moglie", "familiare", "marito", "figli", "parenti"],
      responseKeywords: ["moglie", "famiglia", "papà", "mamma"],
    },
    {
      keywords: ["lavoro", "ufficio", "carriera", "professione"],
      responseKeywords: ["lavoro", "competente", "ufficio"],
    },
    {
      keywords: ["ansia", "paura", "nervoso", "preoccupato", "tensione"],
      responseKeywords: ["ansioso", "paura", "battito", "nervoso"],
    },
    {
      keywords: ["rabbia", "arrabbiato", "frustrato", "irritato", "furioso"],
      responseKeywords: ["rabbia", "arrabbiata", "furioso"],
    },
    {
      keywords: ["speranza", "migliorare", "aiuto", "guarire", "bene"],
      responseKeywords: ["speranza", "aiuto", "migliore", "bene"],
    },
  ] as const;

  // Check patterns and filter responses
  for (const pattern of keywordPatterns) {
    if (pattern.keywords.some((keyword) => contextText.includes(keyword))) {
      const messageLowerCache = new Map<string, string>();
      const filtered = responses.filter((r) => {
        const messageLower = messageLowerCache.get(r.message) ?? r.message.toLowerCase();
        if (!messageLowerCache.has(r.message)) {
          messageLowerCache.set(r.message, messageLower);
        }
        return pattern.responseKeywords.some((keyword) => messageLower.includes(keyword));
      });
      
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

    
    PatientResponseLogger.logServiceCall(
      LOG_CONFIG.PREFIXES.MOCK_AI,
      "generateResponse",
      requestId,
      {
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_RESPONSE}`,
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
        endpoint: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_RESPONSE}`,
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
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INITIALIZE_PATIENT}`,
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
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_RESPONSE}`,
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

    const selectedResponse =
      sampleResponses[responseIndex] ||
      "I'm sorry, I'm not sure how to respond.";
    const selectedEmotion =
      emotions[emotionIndex] || "base";
    const selectedTopic =
      topics[topicIndex] || "generale";
    
    PatientResponseLogger.logRandomization(
      `Chat (${sampleResponses.length} responses)`,
      sampleResponses.length,
      responseIndex,
      selectedEmotion as PatientEmotion,
      selectedTopic,
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    const mockResponseData = {
      message: selectedResponse,
      reasoning_time: Math.floor(Math.random() * 3) + 1,
      emotion: selectedEmotion as
        | "SEEKING"
        | "RAGE"
        | "FEAR"
        | "CARE"
        | "LUST"
        | "SADNESS"
        | "PLAY"
        | "base",
      topic: selectedTopic,
      timestamp: new Date().toISOString(),
    };
    const mockResponseJson = JSON.stringify(mockResponseData, null, 2);

    const response = {
      ...mockResponseData,
      metadata: {
        apiType: "MOCK" as const,
        endpoint: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_RESPONSE}`,
        requestData: {
          externalPatientId: input.external_patient_id,
          userMessage: input.user_message,
          sessionId: input.session_id,
          stepId: input.step_id,
          therapistId: input.therapist_id,
        },
        responseData: {
          message: selectedResponse,
          emotion: selectedEmotion as PatientEmotion,
          topic: selectedTopic,
          reasoningTime: Math.floor(Math.random() * 3) + 1,
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
}

class RealExternalAIService implements ExternalAIService {
  private readonly apiKey = env.EXTERNAL_AI_API_KEY;

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new APIConfigurationError("External AI API key not configured");
    }
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
    const apiUrl = `${API_CONFIG.BASE_URL}${endpoint}`;

    PatientResponseLogger.logServiceCall(
      LOG_CONFIG.PREFIXES.REAL_AI,
      method,
      requestId,
      {
        url: apiUrl,
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
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        },
        timeout,
      );

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        PatientResponseLogger.logServiceError(
          LOG_CONFIG.PREFIXES.REAL_AI,
          method,
          requestId,
          duration,
          error,
          apiUrl,
        );
        throw new ExternalAIServiceError(
          `External AI API error: ${response.status} ${response.statusText}`,
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
    this.ensureApiKey();

    const requestId = generateRequestId();
    const requestBody = createGenerateResponseBody(input, API_CONFIG.IS_REMOTE);
    const startTime = Date.now();
    const apiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_RESPONSE}`;

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
    this.ensureApiKey();

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
    this.ensureApiKey();

    const requestId = generateRequestId();
    const startTime = Date.now();
    const apiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_RESPONSE}`;

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
        const response = data as ChatResponse;
        return {
          message: response.message,
          reasoning_time: response.reasoning_time,
          emotion: normalizeEmotion(response.emotion),
          topic: response.topic,
          timestamp: response.timestamp,
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
        },
        rawResponseJson: rawJson,
        duration,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class PatientResponseGenerator {
  private externalAI: ExternalAIService;
  private useExternalAI: boolean;

  constructor(useExternalAI?: boolean) {
    // Use environment variable if not explicitly provided
    const shouldUseExternal = useExternalAI ?? env.API === "remote";
    
    // Fallback to MOCK AI if REAL AI is requested but API key is not configured
    this.useExternalAI = shouldUseExternal && !!env.EXTERNAL_AI_API_KEY;
    
    if (shouldUseExternal && !this.useExternalAI) {
      PatientResponseLogger.logWarning("EXTERNAL_AI_API_KEY not configured. Falling back to MOCK AI.");
    }
    
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
    if (use && env.EXTERNAL_AI_API_KEY) {
      this.externalAI = new RealExternalAIService();
    } else if (!use) {
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
      () => ({
        message: "I'm sorry, I'm not sure how to respond. Could you repeat that?",
        reasoning_time: 0,
        emotion: "base" as const,
        topic: "generale",
        timestamp: new Date().toISOString(),
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
          },
          timestamp: new Date().toISOString(),
        },
      }),
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
}


export const patientResponseGenerator = new PatientResponseGenerator(); 
