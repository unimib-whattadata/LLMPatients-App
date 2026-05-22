import { env } from "~/env";
import type {
  GenerateResponseInput,
  PatientEmotion,
  EmotionSnapshot,
  EmotionTimelinePoint,
  PatientResponse,
} from "./types";
import { LOG_CONFIG } from "./logger";

// API Configuration based on mode
export const getApiConfig = () => {
  const isRemote = env.API === "remote";
  
  return {
    BASE_URL: isRemote ? (env.API_BASE_URL || "https://e-patients-api.whattadata.it") : "local",
    ENDPOINTS: {
      GENERATE_RESPONSE: isRemote ? (env.API_GENERATE_RESPONSE_ENDPOINT || "/api/message") : "/mock/generate-response",
      INITIALIZE_PATIENT: isRemote ? (env.API_INITIALIZE_PATIENT_ENDPOINT || "/patient") : "/mock/initialise-patient",
      CHAT_RESPONSE: isRemote ? (env.API_CHAT_RESPONSE_ENDPOINT || "/chat-response") : "/mock/chat-response",
      SESSION_END: isRemote ? (env.API_SESSION_END_ENDPOINT || "/session-end") : "/mock/session-end",
    },
    HEADERS: {
      "Content-Type": "application/json",
      "X-API-Version": "1.0",
    },
    TIMEOUTS: {
      GENERATE_RESPONSE: parseInt(env.API_TIMEOUT_GENERATE_RESPONSE || "120000"),
      INITIALIZE_PATIENT: parseInt(env.API_TIMEOUT_INITIALIZE_PATIENT || "120000"),
      CHAT_RESPONSE: parseInt(env.API_TIMEOUT_CHAT_RESPONSE || "120000"),
      SESSION_END: parseInt(env.API_TIMEOUT_SESSION_END || "120000"),
    },
    IS_REMOTE: isRemote,
  } as const;
};

export const API_CONFIG = getApiConfig();

export const MOCK_CONFIG = {
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

// Helper functions
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function truncateMessage(
  message: string,
  maxLength: number = LOG_CONFIG.MAX_MESSAGE_LENGTH,
): string {
  return message.length > maxLength
    ? `${message.substring(0, maxLength)}...`
    : message;
}

export function simulateDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Helper for API calls with timeout
export async function fetchWithTimeout(
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
export function createGenerateResponseBody(
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
export function normalizeEmotion(emotion: unknown): PatientEmotion {
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
    "PANIC_GRIEF",
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

export function clampUnitValue(value: unknown, fallback: number = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

export function normalizeEmotionToken(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "base";
  }
  return value.trim().toUpperCase();
}

export function parseEmotionVector(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const parsedVector: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    parsedVector[key] = clampUnitValue(entry);
  }

  return parsedVector;
}

export function parseEmotionSnapshot(value: unknown): EmotionSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  const dominant = normalizeEmotionToken(snapshot.dominant);
  const intensity = clampUnitValue(snapshot.intensity);
  const description =
    typeof snapshot.description === "string" && snapshot.description.trim()
      ? snapshot.description
      : `Dominant emotion: ${dominant}`;

  return {
    dominant,
    intensity,
    vector: parseEmotionVector(snapshot.vector),
    event:
      typeof snapshot.event === "string"
        ? snapshot.event
        : snapshot.event === null
          ? null
          : undefined,
    salience:
      (typeof snapshot.salience === "number" && Number.isFinite(snapshot.salience)) ||
      snapshot.salience === null
        ? (snapshot.salience as number | null)
        : undefined,
    description,
  };
}

export function parseEmotionTimeline(value: unknown): EmotionTimelinePoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const point = entry as Record<string, unknown>;
      if (
        typeof point.turn_index !== "number" ||
        !Number.isFinite(point.turn_index)
      ) {
        return null;
      }

      return {
        turn_index: Number(point.turn_index),
        timestamp:
          typeof point.timestamp === "string" && point.timestamp.trim()
            ? point.timestamp
            : new Date().toISOString(),
        emotion: normalizeEmotionToken(point.emotion),
        intensity: clampUnitValue(point.intensity),
      } satisfies EmotionTimelinePoint;
    })
    .filter((point): point is EmotionTimelinePoint => Boolean(point))
    .sort((a, b) => a.turn_index - b.turn_index);
}

export function createEmotionVector(
  dominantEmotion: string,
  dominantIntensity: number,
): Record<string, number> {
  const vectorKeys = [
    "SEEKING",
    "FEAR",
    "RAGE",
    "LUST",
    "CARE",
    "PANIC_GRIEF",
    "PLAY",
  ] as const;
  const normalizedDominant = normalizeEmotionToken(dominantEmotion);
  const normalizedIntensity = clampUnitValue(dominantIntensity, 0.25);

  const vector: Record<string, number> = {};
  vectorKeys.forEach((key) => {
    const baseline = Math.max(0.02, Math.random() * 0.2);
    vector[key] = key === normalizedDominant ? normalizedIntensity : baseline;
  });

  return vector;
}

export function mergeEmotionTimeline(
  previousTimeline: EmotionTimelinePoint[],
  incomingTimeline: EmotionTimelinePoint[],
): EmotionTimelinePoint[] {
  const mergedByTurn = new Map<number, EmotionTimelinePoint>();

  previousTimeline.forEach((point) => {
    mergedByTurn.set(point.turn_index, {
      ...point,
      intensity: clampUnitValue(point.intensity),
      emotion: normalizeEmotionToken(point.emotion),
    });
  });

  incomingTimeline.forEach((point) => {
    mergedByTurn.set(point.turn_index, {
      ...point,
      intensity: clampUnitValue(point.intensity),
      emotion: normalizeEmotionToken(point.emotion),
    });
  });

  return [...mergedByTurn.values()].sort((a, b) => a.turn_index - b.turn_index);
}

// Helper for parsing response based on API mode
export function parseGenerateResponse(
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
