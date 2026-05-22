import type {
  PatientResponse,
  PatientEmotion,
  EmotionTimelinePoint,
  EmotionSnapshot,
  PatientInfo,
  GenerateResponseInput,
  ChatRequest,
} from "./types";
import { PatientResponseLogger, LOG_CONFIG } from "./logger";
import {
  MOCK_CONFIG,
  truncateMessage,
  clampUnitValue,
  normalizeEmotionToken,
  mergeEmotionTimeline,
  createEmotionVector,
} from "./utils";

export const ENHANCED_PATIENT_RESPONSES: Record<string, PatientResponse[]> = {
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
        "Non so se ha senso parlare di questo. But forse... forse può aiutare.",
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
export const mockTimelineCache = new Map<string, EmotionTimelinePoint[]>();

const CACHE_CONFIG = {
  MAX_CONTEXT_CACHE_SIZE: 100, 
  MAX_MOCK_TIMELINE_CACHE_SIZE: 100,
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

  if (mockTimelineCache.size > CACHE_CONFIG.MAX_MOCK_TIMELINE_CACHE_SIZE) {
    const entriesToDelete =
      mockTimelineCache.size - CACHE_CONFIG.MAX_MOCK_TIMELINE_CACHE_SIZE;
    const keysToDelete = Array.from(mockTimelineCache.keys()).slice(
      0,
      entriesToDelete,
    );
    keysToDelete.forEach((key) => mockTimelineCache.delete(key));
  }

  lastCacheCleanup = now;
}

export const GENERIC_RESPONSES: PatientResponse[] = [
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

export function selectContextualResponse(
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

function resolveTrendEmotionToken(emotion: unknown): string {
  const normalized = normalizeEmotionToken(emotion);
  if (normalized === "SADNESS") return "PANIC_GRIEF";
  if (normalized === "BASE") return "SEEKING";
  return normalized;
}

export function buildEmotionSnapshot(
  dominantEmotion: unknown,
  intensity: number,
): EmotionSnapshot {
  const trendEmotion = resolveTrendEmotionToken(dominantEmotion);
  const safeIntensity = clampUnitValue(intensity, 0.35);

  return {
    dominant: trendEmotion,
    intensity: safeIntensity,
    vector: createEmotionVector(trendEmotion, safeIntensity),
    description: `${trendEmotion.replace(/_/g, " ")} is currently dominant.`,
  };
}

export function getMockTimelineKey(input: ChatRequest): string {
  return `${input.session_id}:${input.external_patient_id}`;
}

export function appendMockTimelinePoint(
  input: ChatRequest,
  point: EmotionTimelinePoint,
): EmotionTimelinePoint[] {
  cleanupCache();

  const timelineKey = getMockTimelineKey(input);
  const existingTimeline = mockTimelineCache.get(timelineKey) ?? [];
  const mergedTimeline = mergeEmotionTimeline(existingTimeline, [point]);
  mockTimelineCache.set(timelineKey, mergedTimeline);
  return mergedTimeline;
}
