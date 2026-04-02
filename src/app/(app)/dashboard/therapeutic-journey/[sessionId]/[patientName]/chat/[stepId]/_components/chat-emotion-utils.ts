import type {
  ChatMessage,
  EmotionSnapshot,
  EmotionTimelinePoint,
  EmotionVectorTimelinePoint,
} from "./chat-types";
import type { PatientEmotion } from "./chat-constants";

export type ChatResponseEmotionPayload = {
  patient_name?: string | null;
  avatar_url?: string | null;
  emotion_snapshot?: EmotionSnapshot | null;
  emotion_timeline?: EmotionTimelinePoint[] | null;
};

type PdfRgb = [number, number, number];

export interface PdfEmotionChartPoint {
  turnIndex: number;
  dominant: string;
  values: Record<string, number>;
  dominantIntensity: number;
}

const PDF_VECTOR_ORDER = [
  "SEEKING",
  "CARE",
  "PLAY",
  "FEAR",
  "RAGE",
  "PANIC_GRIEF",
  "SADNESS",
  "LUST",
  "BASE",
] as const;

const PDF_SERIES_META: Record<string, { label: string; color: PdfRgb }> = {
  SEEKING: { label: "Seeking", color: [249, 115, 22] },
  CARE: { label: "Care", color: [16, 185, 129] },
  PLAY: { label: "Play", color: [234, 179, 8] },
  FEAR: { label: "Fear", color: [167, 139, 250] },
  RAGE: { label: "Rage", color: [248, 113, 113] },
  PANIC_GRIEF: { label: "Panic/Grief", color: [96, 165, 250] },
  SADNESS: { label: "Sadness", color: [96, 165, 250] },
  LUST: { label: "Desire", color: [244, 114, 182] },
  BASE: { label: "Neutral", color: [163, 163, 163] },
};

export function clampTimelineIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeEmotionToken(value: string): string {
  const token = value.trim();
  if (!token) return "BASE";
  return token.replace(/\s+/g, "_").toUpperCase();
}

export function normalizePatientEmotion(value: unknown): PatientEmotion | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const token = normalizeEmotionToken(value).replace(/-/g, "_");
  switch (token) {
    case "SEEKING":
    case "RAGE":
    case "FEAR":
    case "CARE":
    case "LUST":
    case "PANIC_GRIEF":
    case "SADNESS":
    case "PLAY":
      return token;
    case "BASE":
      return "base";
    default:
      return null;
  }
}

export function resolveEmotionForDisplay(
  payload: ChatResponseEmotionPayload,
  fallbackEmotion?: PatientEmotion,
): PatientEmotion {
  const snapshotEmotion = payload.emotion_snapshot
    ? normalizePatientEmotion(payload.emotion_snapshot.dominant)
    : null;
  if (snapshotEmotion) {
    return snapshotEmotion;
  }

  const latestTimelinePoint = Array.isArray(payload.emotion_timeline)
    ? payload.emotion_timeline[payload.emotion_timeline.length - 1]
    : null;
  const timelineEmotion = latestTimelinePoint
    ? normalizePatientEmotion(latestTimelinePoint.emotion)
    : null;

  return timelineEmotion ?? fallbackEmotion ?? "base";
}

export function normalizeEmotionVector(
  vector: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!vector || typeof vector !== "object") {
    return {};
  }

  const normalized: Record<string, number> = {};
  Object.entries(vector).forEach(([key, rawValue]) => {
    const normalizedKey = normalizeEmotionToken(key);
    const numericValue =
      typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!Number.isFinite(numericValue)) return;
    normalized[normalizedKey] = clampTimelineIntensity(numericValue);
  });

  return normalized;
}

export function normalizeSnapshot(snapshot: EmotionSnapshot): EmotionSnapshot {
  const dominant = normalizeEmotionToken(snapshot.dominant);
  const intensity = clampTimelineIntensity(snapshot.intensity);
  const vector = normalizeEmotionVector(snapshot.vector);

  if (!(dominant in vector)) {
    vector[dominant] = intensity;
  }

  return {
    ...snapshot,
    dominant,
    intensity,
    vector,
  };
}

export function normalizeTimeline(
  timeline: EmotionTimelinePoint[],
): EmotionTimelinePoint[] {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return [];
  }

  const pointsByTurn = new Map<number, EmotionTimelinePoint>();
  timeline.forEach((point) => {
    if (!Number.isFinite(point.turn_index)) return;

    pointsByTurn.set(point.turn_index, {
      ...point,
      intensity: clampTimelineIntensity(point.intensity),
    });
  });

  return [...pointsByTurn.values()].sort((a, b) => a.turn_index - b.turn_index);
}

export function normalizeVectorTimeline(
  timeline: EmotionVectorTimelinePoint[],
): EmotionVectorTimelinePoint[] {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return [];
  }

  const pointsByTurn = new Map<number, EmotionVectorTimelinePoint>();
  timeline.forEach((point) => {
    if (!point || !Number.isFinite(point.turn_index)) return;

    const dominant = normalizeEmotionToken(point.dominant);
    const vector = normalizeEmotionVector(point.vector);
    if (!(dominant in vector)) {
      vector[dominant] = 0;
    }

    pointsByTurn.set(point.turn_index, {
      turn_index: point.turn_index,
      timestamp:
        typeof point.timestamp === "string" && point.timestamp.trim()
          ? point.timestamp
          : new Date().toISOString(),
      dominant,
      vector,
    });
  });

  return [...pointsByTurn.values()].sort((a, b) => a.turn_index - b.turn_index);
}

export function mergeTimelineState(
  currentTimeline: EmotionTimelinePoint[],
  incomingTimeline: EmotionTimelinePoint[],
): EmotionTimelinePoint[] {
  if (incomingTimeline.length === 0) {
    return currentTimeline;
  }

  return normalizeTimeline([...currentTimeline, ...incomingTimeline]);
}

export function mergeVectorTimelineState(
  currentTimeline: EmotionVectorTimelinePoint[],
  incomingTimeline: EmotionVectorTimelinePoint[],
): EmotionVectorTimelinePoint[] {
  if (incomingTimeline.length === 0) {
    return currentTimeline;
  }

  return normalizeVectorTimeline([...currentTimeline, ...incomingTimeline]);
}

export function appendSnapshotToTimeline(
  currentTimeline: EmotionTimelinePoint[],
  snapshot: EmotionSnapshot,
): EmotionTimelinePoint[] {
  const lastTurnIndex =
    currentTimeline.length > 0
      ? currentTimeline[currentTimeline.length - 1]!.turn_index
      : 0;

  const fallbackPoint: EmotionTimelinePoint = {
    turn_index: lastTurnIndex + 1,
    timestamp: new Date().toISOString(),
    emotion: snapshot.dominant,
    intensity: clampTimelineIntensity(snapshot.intensity),
  };

  return mergeTimelineState(currentTimeline, [fallbackPoint]);
}

export function appendSnapshotToVectorTimeline(
  currentTimeline: EmotionVectorTimelinePoint[],
  snapshot: EmotionSnapshot,
  turnIndexHint?: number,
  timestampHint?: string,
): EmotionVectorTimelinePoint[] {
  const normalizedSnapshot = normalizeSnapshot(snapshot);
  const lastTurnIndex =
    currentTimeline.length > 0
      ? currentTimeline[currentTimeline.length - 1]!.turn_index
      : 0;

  const fallbackPoint: EmotionVectorTimelinePoint = {
    turn_index:
      typeof turnIndexHint === "number" && Number.isFinite(turnIndexHint)
        ? turnIndexHint
        : lastTurnIndex + 1,
    timestamp:
      typeof timestampHint === "string" && timestampHint.trim()
        ? timestampHint
        : new Date().toISOString(),
    dominant: normalizedSnapshot.dominant,
    vector: normalizedSnapshot.vector,
  };

  return mergeVectorTimelineState(currentTimeline, [fallbackPoint]);
}

export function buildVectorTimelineFromMessages(
  messages: ChatMessage[],
): EmotionVectorTimelinePoint[] {
  const restoredTimeline: EmotionVectorTimelinePoint[] = [];
  let nextTurnIndex = 1;

  messages.forEach((message) => {
    if (message.sender !== "patient") return;
    const responseData = message.metadata?.responseData;
    const snapshot = responseData?.emotionSnapshot;
    if (!snapshot) return;

    const lastTimelinePoint = Array.isArray(responseData?.emotionTimeline)
      ? responseData.emotionTimeline[responseData.emotionTimeline.length - 1]
      : null;
    const turnIndex =
      typeof lastTimelinePoint?.turn_index === "number" &&
      Number.isFinite(lastTimelinePoint.turn_index)
        ? lastTimelinePoint.turn_index
        : nextTurnIndex;
    const normalizedSnapshot = normalizeSnapshot(snapshot);

    restoredTimeline.push({
      turn_index: turnIndex,
      timestamp:
        message.timestamp instanceof Date
          ? message.timestamp.toISOString()
          : typeof message.timestamp === "string" && message.timestamp.trim()
            ? message.timestamp
            : new Date().toISOString(),
      dominant: normalizedSnapshot.dominant,
      vector: normalizedSnapshot.vector,
    });

    nextTurnIndex = Math.max(nextTurnIndex, turnIndex + 1);
  });

  return normalizeVectorTimeline(restoredTimeline);
}

export function prettifyEmotionLabel(value: string): string {
  return value
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPdfSeriesLabel(key: string): string {
  return PDF_SERIES_META[key]?.label ?? prettifyEmotionLabel(key);
}

export function getPdfSeriesColor(key: string): PdfRgb {
  return PDF_SERIES_META[key]?.color ?? [120, 113, 108];
}

export function getPdfSeriesKeys(
  points: EmotionVectorTimelinePoint[],
): string[] {
  if (points.length === 0) return [];

  const keys = new Set<string>();
  points.forEach((point) => {
    keys.add(normalizeEmotionToken(point.dominant));
    Object.keys(point.vector).forEach((key) => {
      keys.add(normalizeEmotionToken(key));
    });
  });

  const ordered = PDF_VECTOR_ORDER.filter((key) => keys.has(key));
  const orderedSet = new Set<string>(PDF_VECTOR_ORDER);
  const extras = [...keys]
    .filter((key) => !orderedSet.has(key))
    .sort((a, b) => a.localeCompare(b));

  return [...ordered, ...extras];
}

export function buildPdfStepScopedVectorTimeline(
  messages: ChatMessage[],
  currentStepId: number,
): EmotionVectorTimelinePoint[] {
  const points: EmotionVectorTimelinePoint[] = [];
  let localTurn = 1;

  messages.forEach((message) => {
    if (message.sender !== "patient") return;
    if (message.stepId !== currentStepId) return;

    const responseData = message.metadata?.responseData;
    const timestamp =
      message.timestamp instanceof Date
        ? message.timestamp.toISOString()
        : typeof message.timestamp === "string" && message.timestamp.trim()
          ? message.timestamp
          : new Date().toISOString();

    const snapshot = responseData?.emotionSnapshot;
    if (snapshot) {
      const normalizedSnapshot = normalizeSnapshot(snapshot);
      points.push({
        turn_index: localTurn,
        timestamp,
        dominant: normalizedSnapshot.dominant,
        vector: normalizedSnapshot.vector,
      });
      localTurn += 1;
      return;
    }

    const timeline = Array.isArray(responseData?.emotionTimeline)
      ? normalizeTimeline(responseData.emotionTimeline)
      : [];
    const lastPoint = timeline[timeline.length - 1];
    if (!lastPoint) return;

    const dominant = normalizeEmotionToken(lastPoint.emotion);
    points.push({
      turn_index: localTurn,
      timestamp,
      dominant,
      vector: {
        [dominant]: clampTimelineIntensity(lastPoint.intensity),
      },
    });
    localTurn += 1;
  });

  return normalizeVectorTimeline(points);
}
