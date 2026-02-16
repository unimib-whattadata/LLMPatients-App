"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "~/trpc/react";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { Button } from "~/components/ui/button";
import { DashboardPanel } from "~/components/dashboard/ui";
import { Input } from "~/components/ui/input";
import { ChatPageSkeleton } from "~/components/ui/skeleton-variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  ArrowLeft,
  Check,
  Loader2,
  Send,
  Mic,
  X,
  CheckCircle2,
  Maximize2,
  Info,
  Code2,
  FileDown,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { createPatientSlug } from "~/lib/utils/slugify";
import type {
  ChatMessage,
  PatientData,
  TherapySessionData,
  ChatStepData,
  ChatContentProps,
  EmotionSnapshot,
  EmotionTimelinePoint,
  EmotionVectorTimelinePoint,
} from "./chat-types";
import type { PatientEmotion } from "./chat-constants";
import { EmotionTrendPanel } from "./EmotionTrendPanel";
import {
  EMOTION_COLORS,
  EMOTION_LABELS,
  AVATAR_TRANSITION_DURATION_MS,
} from "./chat-constants";
import {
  formatSessionTime,
  getPatientAvatarPath,
  generatePatientAvatar,
  sanitizePatientAvatarUrl,
} from "./chat-utils";
import { useAudioPlayer } from "~/hooks/useAudioPlayer";
import { useTTSStatus } from "~/hooks/useTTSStatus";

type ChatResponseEmotionPayload = {
  patient_name?: string | null;
  avatar_url?: string | null;
  emotion_snapshot?: EmotionSnapshot | null;
  emotion_timeline?: EmotionTimelinePoint[] | null;
};

function clampTimelineIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeEmotionToken(value: string): string {
  const token = value.trim();
  if (!token) return "BASE";
  return token.replace(/\s+/g, "_").toUpperCase();
}

function normalizePatientEmotion(value: unknown): PatientEmotion | null {
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

function resolveEmotionForDisplay(
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

function normalizeEmotionVector(
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

function normalizeSnapshot(snapshot: EmotionSnapshot): EmotionSnapshot {
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

function normalizeTimeline(
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

function normalizeVectorTimeline(
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

function mergeTimelineState(
  currentTimeline: EmotionTimelinePoint[],
  incomingTimeline: EmotionTimelinePoint[],
): EmotionTimelinePoint[] {
  if (incomingTimeline.length === 0) {
    return currentTimeline;
  }

  return normalizeTimeline([...currentTimeline, ...incomingTimeline]);
}

function mergeVectorTimelineState(
  currentTimeline: EmotionVectorTimelinePoint[],
  incomingTimeline: EmotionVectorTimelinePoint[],
): EmotionVectorTimelinePoint[] {
  if (incomingTimeline.length === 0) {
    return currentTimeline;
  }

  return normalizeVectorTimeline([...currentTimeline, ...incomingTimeline]);
}

function appendSnapshotToTimeline(
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

function appendSnapshotToVectorTimeline(
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

function buildVectorTimelineFromMessages(
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

type PdfRgb = [number, number, number];

interface PdfEmotionChartPoint {
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
  SEEKING: { label: "Ricerca", color: [249, 115, 22] },
  CARE: { label: "Cura", color: [16, 185, 129] },
  PLAY: { label: "Gioco", color: [234, 179, 8] },
  FEAR: { label: "Paura", color: [167, 139, 250] },
  RAGE: { label: "Rabbia", color: [248, 113, 113] },
  PANIC_GRIEF: { label: "Panico/Lutto", color: [96, 165, 250] },
  SADNESS: { label: "Tristezza", color: [96, 165, 250] },
  LUST: { label: "Desiderio", color: [244, 114, 182] },
  BASE: { label: "Neutro", color: [163, 163, 163] },
};

function prettifyEmotionLabel(value: string): string {
  return value
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPdfSeriesLabel(key: string): string {
  return PDF_SERIES_META[key]?.label ?? prettifyEmotionLabel(key);
}

function getPdfSeriesColor(key: string): PdfRgb {
  return PDF_SERIES_META[key]?.color ?? [120, 113, 108];
}

function getPdfSeriesKeys(points: EmotionVectorTimelinePoint[]): string[] {
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

function buildPdfStepScopedVectorTimeline(
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

export function ChatContent({ user, impersonation }: ChatContentProps) {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const stepId = parseInt(params.stepId as string);


  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<PatientEmotion>("base");
  const [nextEmotion, setNextEmotion] = useState<PatientEmotion | null>(null);
  const [isAvatarTransitioning, setIsAvatarTransitioning] = useState(false);
  const [showAudioWaveform, setShowAudioWaveform] = useState(true);
  const [showTTSWarning, setShowTTSWarning] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [stepCompletionOverride, setStepCompletionOverride] = useState(false);
  const [pdfHeaderAvatarDataUrl, setPdfHeaderAvatarDataUrl] = useState<string | null>(null);
  const [emotionSnapshot, setEmotionSnapshot] = useState<EmotionSnapshot | null>(null);
  const [emotionTimeline, setEmotionTimeline] = useState<EmotionTimelinePoint[]>([]);
  const [emotionVectorTimeline, setEmotionVectorTimeline] = useState<EmotionVectorTimelinePoint[]>([]);
  const [responsePatientName, setResponsePatientName] = useState<string | null>(null);
  const [responseAvatarUrl, setResponseAvatarUrl] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const avatarTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const timerStorageKey = useMemo(
    () => `llmpatients:chat-timer:${user.id}:${sessionId}:${stepId}`,
    [user.id, sessionId, stepId],
  );


  // TTS status management
  const { isTTSEnabled, ttsStatus } = useTTSStatus(true);

  const audioPlayer = useAudioPlayer({
    autoPlay: true,
  });

  // Update warning visibility based on TTS availability
  useEffect(() => {
    if (audioPlayer.isTTSAvailable) {
      setShowTTSWarning(true);
    }
  }, [audioPlayer.isTTSAvailable]);


  const {
    data: selectedPatient,
    isLoading: patientLoading,
    error: patientError,
  } = api.patients.getPatientById.useQuery(
    { id: sessionId },
    { enabled: Boolean(sessionId) },
  );


  const { data: therapySession, isLoading: therapySessionLoading } =
    api.therapySessions.getByPatient.useQuery(
      { patientId: sessionId },
      { enabled: Boolean(sessionId) },
    );


  const { data: existingChat, isLoading: chatLoading } =
    api.chat.getChatStep.useQuery(
      {
        therapySessionId: therapySession?.id ?? "",
        stepNumber: stepId,
      },
      { enabled: Boolean(therapySession?.id) },
    );


  const { data: completedSteps, isLoading: completedStepsLoading } =
    api.chat.getSessionChats.useQuery(
      { therapySessionId: therapySession?.id ?? "" },
      { enabled: Boolean(therapySession?.id) },
    );


  const typedSelectedPatient = selectedPatient as PatientData | undefined;
  const typedTherapySession = therapySession as TherapySessionData | undefined;
  const typedExistingChat = existingChat as ChatStepData | undefined;
  const typedCompletedSteps = completedSteps as ChatStepData[] | undefined;
  const selectedPatientId = typedSelectedPatient?.id;
  const basePatientAvatarUrl = typedSelectedPatient?.avatarUrl ?? null;
  const effectivePatientName = responsePatientName ?? typedSelectedPatient?.name ?? "Paziente";
  const selectedPatientAvatarUrl = sanitizePatientAvatarUrl(
    responseAvatarUrl ?? basePatientAvatarUrl,
    basePatientAvatarUrl,
  );
  const shouldShowEmotionTrend =
    Boolean(emotionSnapshot) ||
    emotionTimeline.length > 0 ||
    emotionVectorTimeline.length > 0;


  const saveChatMutation = api.chat.saveChatStep.useMutation();
  const markStepDoneMutation = api.chat.markStepDone.useMutation();
  const generateResponseMutation = api.chat.generatePatientResponse.useMutation();
  const generateChatResponseMutation = api.chat.generateChatResponse.useMutation();





  const utils = api.useUtils();


  const patientAvatar = useMemo(
    () =>
      typedSelectedPatient
        ? generatePatientAvatar(typedSelectedPatient.name)
        : { colorClass: "avatar-color-default", initials: "P" },
    [typedSelectedPatient],
  );

  useEffect(() => {
    if (!selectedPatientId) {
      setPdfHeaderAvatarDataUrl(null);
      return;
    }

    const rawAvatarPath = selectedPatientAvatarUrl ?? "/images/patients/alex_carter/base.png";
    if (!rawAvatarPath) {
      setPdfHeaderAvatarDataUrl(null);
      return;
    }

    const avatarUrl = rawAvatarPath.startsWith("http")
      ? rawAvatarPath
      : rawAvatarPath.startsWith("/")
        ? `${window.location.origin}${rawAvatarPath}`
        : `${window.location.origin}/${rawAvatarPath}`;

    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (cancelled) return;

      const minSide = Math.min(image.naturalWidth, image.naturalHeight);
      if (!minSide) {
        setPdfHeaderAvatarDataUrl(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = minSide;
      canvas.height = minSide;
      const context = canvas.getContext("2d");

      if (!context) {
        setPdfHeaderAvatarDataUrl(null);
        return;
      }

      const sourceX = Math.max((image.naturalWidth - minSide) / 2, 0);
      const sourceY = Math.max((image.naturalHeight - minSide) / 2, 0);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        minSide,
        minSide,
        0,
        0,
        minSide,
        minSide,
      );

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        if (!cancelled) {
          setPdfHeaderAvatarDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setPdfHeaderAvatarDataUrl(null);
        }
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setPdfHeaderAvatarDataUrl(null);
      }
    };

    image.src = avatarUrl;

    return () => {
      cancelled = true;
    };
  }, [selectedPatientId, selectedPatientAvatarUrl]);


  const isStepCompleted = useMemo(() => {
    if (stepCompletionOverride) return true;

    if (typedExistingChat?.done) return true;

    if (!typedCompletedSteps) return false;

    return typedCompletedSteps.some(
      (step) => step.stepNumber === stepId && step.done,
    );
  }, [stepCompletionOverride, typedExistingChat?.done, typedCompletedSteps, stepId]);

  const questionAnswerRows = useMemo(() => {
    const rows: Array<{ question: string; answer: string }> = [];
    let pendingQuestion: string | null = null;

    messages.forEach((message) => {
      const normalizedContent = message.content.trim();
      if (!normalizedContent) return;

      if (message.sender === "user") {
        if (pendingQuestion) {
          rows.push({
            question: pendingQuestion,
            answer: "",
          });
        }
        pendingQuestion = normalizedContent;
        return;
      }

      if (pendingQuestion) {
        rows.push({
          question: pendingQuestion,
          answer: normalizedContent,
        });
        pendingQuestion = null;
        return;
      }

      rows.push({
        question: "",
        answer: normalizedContent,
      });
    });

    if (pendingQuestion) {
      rows.push({
        question: pendingQuestion,
        answer: "",
      });
    }

    return rows;
  }, [messages]);

  // Helper function to extract and remove text in parentheses
  const extractAndRemoveParentheses = useCallback((text: string): { cleanedText: string; extractedText: string | null } => {
    const parenthesesRegex = /\(([^)]+)\)/g;
    const matches: string[] = [];
    let match;

    // Extract all text in parentheses
    while ((match = parenthesesRegex.exec(text)) !== null) {
      matches.push(match[1]!);
    }

    // Remove all text in parentheses from the original text
    const cleanedText = text.replace(parenthesesRegex, '').trim();

    // Join all extracted texts
    const extractedText = matches.length > 0 ? matches.join(' ') : null;

    return { cleanedText, extractedText };
  }, []);


  const scrollToBottom = useCallback((delay = 100) => {
    setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container) {

        const extraSpace = audioPlayer.currentAudioUrl ? 120 : 0;
        container.scrollTo({
          top: container.scrollHeight + extraSpace,
          behavior: 'smooth'
        });
      }
    }, delay);
  }, [audioPlayer.currentAudioUrl]);


  useEffect(() => {
    if (
      messages.length === 0 ||
      !hasUserInteracted ||
      isTTSEnabled === false ||
      !audioPlayer.isTTSAvailable
    ) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.sender === "patient" &&
      lastMessage.id !== lastProcessedMessageIdRef.current
    ) {
      lastProcessedMessageIdRef.current = lastMessage.id;

      // Use provider-specific voice IDs from database for TTS
      void audioPlayer.playText(
        lastMessage.content,
        undefined,
        lastMessage.emotion,
        typedSelectedPatient?.name || undefined,
        {
          elevenlabsVoiceId: typedSelectedPatient?.elevenlabsVoiceId || undefined,
          vibevoiceVoiceId: typedSelectedPatient?.vibevoiceVoiceId || undefined,
          chatterboxVoiceId: typedSelectedPatient?.chatterboxVoiceId || undefined,
          gender: typedSelectedPatient?.gender || undefined,
        },
      );
    }
  }, [messages, audioPlayer, typedSelectedPatient?.elevenlabsVoiceId, typedSelectedPatient?.vibevoiceVoiceId, typedSelectedPatient?.chatterboxVoiceId, typedSelectedPatient?.gender, typedSelectedPatient?.name, hasUserInteracted, isTTSEnabled]);


  useEffect(() => {
    if (audioPlayer.isPlaying || audioPlayer.currentAudioUrl) {

      scrollToBottom(100);
    }
  }, [audioPlayer.isPlaying, audioPlayer.currentAudioUrl, scrollToBottom]);




  useEffect(() => {
    try {
      const storedTimer = window.localStorage.getItem(timerStorageKey);
      if (!storedTimer) {
        setSessionTime(0);
        return;
      }

      const parsedTimer = Number.parseInt(storedTimer, 10);
      if (Number.isFinite(parsedTimer) && parsedTimer >= 0) {
        setSessionTime(parsedTimer);
      } else {
        setSessionTime(0);
      }
    } catch {
      setSessionTime(0);
    }
  }, [timerStorageKey]);


  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (avatarTransitionTimeoutRef.current) {
        clearTimeout(avatarTransitionTimeoutRef.current);
        avatarTransitionTimeoutRef.current = null;
      }
    };
  }, []);


  useEffect(() => {
    try {
      window.localStorage.setItem(timerStorageKey, String(sessionTime));
    } catch {
      // Ignore storage write failures and keep timer in memory.
    }
  }, [sessionTime, timerStorageKey]);



  useEffect(() => {
    if (typedExistingChat && typedExistingChat.messages.length > 0) {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;

        const messagesWithDates = typedExistingChat.messages.map((msg) => {
          // Extract and remove text in parentheses for patient messages
          if (msg.sender === "patient") {
            const { cleanedText, extractedText } = extractAndRemoveParentheses(msg.content);
            if (extractedText) {
              setExtractedText(extractedText);
            }
            return {
              ...msg,
              content: cleanedText,
              timestamp:
                typeof msg.timestamp === "string"
                  ? new Date(msg.timestamp)
                  : msg.timestamp,
            };
          }
          return {
            ...msg,
            timestamp:
              typeof msg.timestamp === "string"
                ? new Date(msg.timestamp)
                : msg.timestamp,
          };
        });
        setMessages(messagesWithDates);


        const lastPatientMessage = [...messagesWithDates]
          .reverse()
          .find((msg) => msg.sender === "patient" && msg.emotion);

        const lastPatientWithMetadata = [...messagesWithDates]
          .reverse()
          .find((msg) => msg.sender === "patient" && msg.metadata?.responseData);
        const restoredSnapshot = lastPatientWithMetadata?.metadata?.responseData?.emotionSnapshot
          ? normalizeSnapshot(lastPatientWithMetadata.metadata.responseData.emotionSnapshot)
          : null;
        const restoredTimeline = Array.isArray(
          lastPatientWithMetadata?.metadata?.responseData?.emotionTimeline,
        )
          ? normalizeTimeline(lastPatientWithMetadata.metadata.responseData.emotionTimeline)
          : [];
        const restoredVectorTimeline = buildVectorTimelineFromMessages(messagesWithDates);
        const restoredDisplayEmotion =
          normalizePatientEmotion(restoredSnapshot?.dominant) ??
          (restoredTimeline.length > 0
            ? normalizePatientEmotion(
                restoredTimeline[restoredTimeline.length - 1]?.emotion,
              )
            : null) ??
          lastPatientMessage?.emotion ??
          null;

        setEmotionSnapshot(restoredSnapshot);
        setEmotionVectorTimeline(restoredVectorTimeline);
        if (restoredDisplayEmotion) {
          setCurrentEmotion(restoredDisplayEmotion);
          setNextEmotion(null);
          setIsAvatarTransitioning(false);
        }
        if (restoredTimeline.length > 0) {
          setEmotionTimeline(restoredTimeline);
        } else if (restoredVectorTimeline.length > 0) {
          setEmotionTimeline(
            restoredVectorTimeline.map((point) => ({
              turn_index: point.turn_index,
              timestamp: point.timestamp,
              emotion: point.dominant,
              intensity: clampTimelineIntensity(point.vector[point.dominant] ?? 0),
            })),
          );
        } else {
          setEmotionTimeline([]);
        }


        setTimeout(() => {
          scrollToBottom(100);
        }, 200);
      }
    } else if (typedSelectedPatient && !chatLoading && !typedExistingChat) {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        // Use welcome message from database, or generate a default one
        const welcomeContent = typedSelectedPatient.welcomeMessage ||
          `Ciao! Sono ${typedSelectedPatient.name}. Sono qui per aiutarti a esplorare la sessione ${stepId} del nostro percorso terapeutico.`;

        // Extract and remove text in parentheses from welcome message
        const { cleanedText, extractedText } = extractAndRemoveParentheses(welcomeContent);
        if (extractedText) {
          setExtractedText(extractedText);
        }

        const welcomeMessage: ChatMessage = {
          id: `welcome-${Date.now()}`,
          content: cleanedText,
          sender: "patient",
          timestamp: new Date(),
          stepId,
          emotion: "base",
        };
        setMessages([welcomeMessage]);
        setCurrentEmotion("base");
        setNextEmotion(null);
        setIsAvatarTransitioning(false);
        setEmotionSnapshot(null);
        setEmotionTimeline([]);
        setEmotionVectorTimeline([]);


        setTimeout(() => {
          scrollToBottom(100);
        }, 200);
      }
    }
  }, [typedExistingChat, typedSelectedPatient, stepId, chatLoading, scrollToBottom, extractAndRemoveParentheses]);


  const triggerAvatarEmotionChange = useCallback(
    (emotion: PatientEmotion) => {
      if (emotion === currentEmotion || emotion === nextEmotion) return;

      if (avatarTransitionTimeoutRef.current) {
        clearTimeout(avatarTransitionTimeoutRef.current);
      }

      setNextEmotion(emotion);


      requestAnimationFrame(() => {
        setIsAvatarTransitioning(true);


        avatarTransitionTimeoutRef.current = setTimeout(() => {
          setCurrentEmotion(emotion);
          setNextEmotion(null);
          setIsAvatarTransitioning(false);
        }, AVATAR_TRANSITION_DURATION_MS);
      });
    },
    [currentEmotion, nextEmotion],
  );


  useEffect(() => {
    if (!messages.length) {
      setCurrentEmotion("base");
      setNextEmotion(null);
      setIsAvatarTransitioning(false);
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender === "patient" && lastMessage.emotion) {
      triggerAvatarEmotionChange(lastMessage.emotion);
    }
  }, [messages, triggerAvatarEmotionChange]);

  const applyEmotionPayload = useCallback(
    (payload: ChatResponseEmotionPayload) => {
      if (typeof payload.patient_name === "string" && payload.patient_name.trim()) {
        setResponsePatientName(payload.patient_name);
      }

      if (typeof payload.avatar_url === "string" && payload.avatar_url.trim()) {
        setResponseAvatarUrl(
          sanitizePatientAvatarUrl(payload.avatar_url, basePatientAvatarUrl),
        );
      } else if (payload.avatar_url === null) {
        setResponseAvatarUrl(null);
      }

      const normalizedIncomingTimeline = Array.isArray(payload.emotion_timeline)
        ? normalizeTimeline(payload.emotion_timeline)
        : [];

      if (normalizedIncomingTimeline.length > 0) {
        setEmotionTimeline((currentTimeline) =>
          mergeTimelineState(currentTimeline, normalizedIncomingTimeline),
        );
      }

      if (payload.emotion_snapshot) {
        const normalizedSnapshot = normalizeSnapshot(payload.emotion_snapshot);
        const latestIncomingPoint =
          normalizedIncomingTimeline.length > 0
            ? normalizedIncomingTimeline[normalizedIncomingTimeline.length - 1]
            : null;

        setEmotionSnapshot(normalizedSnapshot);
        setEmotionVectorTimeline((currentTimeline) =>
          appendSnapshotToVectorTimeline(
            currentTimeline,
            normalizedSnapshot,
            latestIncomingPoint?.turn_index,
            latestIncomingPoint?.timestamp,
          ),
        );

        if (normalizedIncomingTimeline.length === 0) {
          setEmotionTimeline((currentTimeline) =>
            appendSnapshotToTimeline(currentTimeline, normalizedSnapshot),
          );
        }
      }
    },
    [basePatientAvatarUrl],
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isTyping || !typedTherapySession) return;


    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    const messageText = inputMessage.trim();
    setInputMessage("");


    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: messageText,
      sender: "user",
      timestamp: new Date(),
      stepId,
    };


    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);


    scrollToBottom(50);


    setTimeout(() => {
      setIsTyping(true);
      scrollToBottom(50);
    }, 200);


    try {
      await saveChatMutation.mutateAsync({
        therapySessionId: typedTherapySession.id,
        stepNumber: stepId,
        messages: updatedMessages.map((msg) => ({
          ...msg,
          timestamp:
            msg.timestamp instanceof Date
              ? msg.timestamp
              : new Date(msg.timestamp),
        })),
      });
    } catch (error) {
      // Silent catch
    }


    try {

      if (typedSelectedPatient?.externalPatientId) {

        const response = await generateChatResponseMutation.mutateAsync({
          external_patient_id: typedSelectedPatient.externalPatientId,
          user_message: messageText,
          session_id: typedTherapySession?.id || "",
          step_id: stepId,
          therapist_id: user.id,
        });

        const responseEmotion = resolveEmotionForDisplay(response, response.emotion);
        applyEmotionPayload(response);
        triggerAvatarEmotionChange(responseEmotion);

        // Extract and remove text in parentheses
        const { cleanedText, extractedText } = extractAndRemoveParentheses(response.message);
        if (extractedText) {
          setExtractedText(extractedText);
        }

        const patientMessage: ChatMessage = {
          id: `patient-${Date.now()}`,
          content: cleanedText,
          sender: "patient",
          timestamp: new Date(response.timestamp),
          stepId,
          emotion: responseEmotion,
          metadata: response.metadata,
        };


        const finalMessages = [...updatedMessages, patientMessage];
        setMessages(finalMessages);
        setIsTyping(false);

        scrollToBottom(100);


        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);


        saveChatMutation.mutate({
          therapySessionId: typedTherapySession.id,
          stepNumber: stepId,
          messages: finalMessages.map((msg) => ({
            ...msg,
            timestamp:
              msg.timestamp instanceof Date
                ? msg.timestamp
                : new Date(msg.timestamp),
          })),
        });
      } else {

        const response = await generateResponseMutation.mutateAsync({
          patientInfo: {
            id: typedSelectedPatient?.id || "",
            name: typedSelectedPatient?.name || "",
            age: 45,
            gender: "male",
            diagnosis: "Disturbo d'ansia generalizzato",
            difficulty: typedSelectedPatient?.difficulty || 1,
            psychologicalProfile: typedSelectedPatient?.background || "Profilo psicologico standard",
            background: typedSelectedPatient?.background || "",
            currentMedications: [],
            therapyGoals: typedSelectedPatient?.objectives || [],
            previousSessions: 0,
          },
          userMessage: messageText,
          stepId,
          sessionId: typedTherapySession?.id || "",
          conversationHistory: messages.slice(-5).map(msg => ({
            content: msg.content,
            sender: msg.sender,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          })),
        });

        const responseEmotion = normalizePatientEmotion(response.emotion) ?? "base";
        triggerAvatarEmotionChange(responseEmotion);

        // Extract and remove text in parentheses
        const { cleanedText, extractedText } = extractAndRemoveParentheses(response.message);
        if (extractedText) {
          setExtractedText(extractedText);
        }

        const patientMessage: ChatMessage = {
          id: `patient-${Date.now()}`,
          content: cleanedText,
          sender: "patient",
          timestamp: response.timestamp || new Date(),
          stepId,
          emotion: responseEmotion,
          metadata: response.metadata,
        };


        const finalMessages = [...updatedMessages, patientMessage];
        setMessages(finalMessages);
        setIsTyping(false);

        scrollToBottom(100);


        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);


        saveChatMutation.mutate({
          therapySessionId: typedTherapySession.id,
          stepNumber: stepId,
          messages: finalMessages.map((msg) => ({
            ...msg,
            timestamp:
              msg.timestamp instanceof Date
                ? msg.timestamp
                : new Date(msg.timestamp),
          })),
        });
      }
    } catch (error) {
      setIsTyping(false);
      alert("Errore nella generazione della risposta. Riprova.");


      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [
    inputMessage,
    isTyping,
    typedTherapySession,
    stepId,
    user.id,
    messages,
    scrollToBottom,
    typedSelectedPatient,
    saveChatMutation,
    generateResponseMutation,
    generateChatResponseMutation,
    triggerAvatarEmotionChange,
    applyEmotionPayload,
    hasUserInteracted,
    extractAndRemoveParentheses,
  ]);

  const goBack = useCallback(() => {
    if (typedSelectedPatient) {
      const patientSlug = createPatientSlug(typedSelectedPatient.name);
      router.push(`/dashboard/therapeutic-journey/${sessionId}/${patientSlug}`);
    } else {
      router.push(`/dashboard/therapeutic-journey`);
    }
  }, [typedSelectedPatient, sessionId, router]);

  const handleCompleteStep = useCallback(async () => {
    if (!typedTherapySession) return;

    try {
      await markStepDoneMutation.mutateAsync({
        therapySessionId: typedTherapySession.id,
        stepNumber: stepId,
      });

      setStepCompletionOverride(true);


      await utils.chat.getSessionChats.invalidate({
        therapySessionId: typedTherapySession.id,
      });


      setIsSuccessDialogOpen(true);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("not found") ||
          error.message.includes("access denied")
        ) {
          alert(
            "Sessione non trovata o accesso negato. Ricarica la pagina e riprova.",
          );
        } else {
          alert(`Errore nel completare la sessione: ${error.message}`);
        }
      } else {
        alert("Errore nel completare la sessione. Riprova.");
      }
    }
  }, [typedTherapySession, stepId, markStepDoneMutation, utils]);

  const handleDownloadSessionPdf = useCallback(() => {
    if (!typedSelectedPatient) return;
    setIsExportingPdf(true);

    const normalizeText = (value: string | null | undefined): string => {
      if (!value?.trim()) return "N/A";
      return value
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 14;
      const exportDateTime = new Date().toLocaleString("en-US");

      const metadataRows: RowInput[] = [
        ["Patient Name", normalizeText(typedSelectedPatient.name)],
        ["Internal Patient ID", normalizeText(typedSelectedPatient.id)],
        [
          "External Patient ID",
          normalizeText(typedSelectedPatient.externalPatientId),
        ],
        ["Therapy Session ID", normalizeText(typedTherapySession?.id)],
        ["Session Number", String(typedTherapySession?.sessionNumber ?? "N/A")],
        ["Session Step", `Session ${stepId}`],
        ["Therapist", normalizeText(user.name ?? user.email)],
        ["Duration", formatSessionTime(sessionTime)],
        ["Total Messages", String(messages.length)],
        ["Status", isStepCompleted ? "Completed" : "In Progress"],
        ["Export Date", exportDateTime],
      ];

      doc.setFillColor(28, 25, 23);
      doc.rect(0, 0, pageWidth, 36, "F");
      doc.setFillColor(132, 204, 22);
      doc.rect(0, 34, pageWidth, 2, "F");

      const headerAvatarSize = 20;
      const headerAvatarX = pageWidth - marginX - headerAvatarSize;
      const headerAvatarY = 8;
      const headerTextMaxWidth = headerAvatarX - marginX - 5;

      doc.setDrawColor(132, 204, 22);
      doc.setLineWidth(0.8);
      doc.rect(
        headerAvatarX - 1,
        headerAvatarY - 1,
        headerAvatarSize + 2,
        headerAvatarSize + 2,
        "S",
      );

      if (pdfHeaderAvatarDataUrl) {
        const imageFormat = pdfHeaderAvatarDataUrl.startsWith("data:image/png")
          ? "PNG"
          : "JPEG";
        doc.addImage(
          pdfHeaderAvatarDataUrl,
          imageFormat,
          headerAvatarX,
          headerAvatarY,
          headerAvatarSize,
          headerAvatarSize,
        );
      } else {
        doc.setFillColor(68, 64, 60);
        doc.rect(
          headerAvatarX,
          headerAvatarY,
          headerAvatarSize,
          headerAvatarSize,
          "F",
        );
        doc.setTextColor(245, 245, 244);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(
          patientAvatar.initials,
          headerAvatarX + headerAvatarSize / 2,
          headerAvatarY + headerAvatarSize / 2 + 1,
          { align: "center" },
        );
      }

      doc.setTextColor(245, 245, 244);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Therapy Conversation Report", marginX, 14, {
        maxWidth: headerTextMaxWidth,
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `${normalizeText(typedSelectedPatient.name)} · Session ${stepId}`,
        marginX,
        21,
        { maxWidth: headerTextMaxWidth },
      );
      doc.text(`Generated on ${exportDateTime}`, marginX, 27, {
        maxWidth: headerTextMaxWidth,
      });

      autoTable(doc, {
        startY: 42,
        margin: { left: marginX, right: marginX },
        theme: "grid",
        head: [["Field", "Value"]],
        body: metadataRows,
        styles: {
          fontSize: 8.5,
          cellPadding: 2.8,
          textColor: [41, 37, 36],
          lineColor: [214, 211, 209],
          lineWidth: 0.2,
          valign: "middle",
        },
        headStyles: {
          fillColor: [54, 83, 20],
          textColor: [245, 245, 244],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 249],
        },
        columnStyles: {
          0: {
            cellWidth: 48,
            fontStyle: "bold",
            fillColor: [245, 245, 244],
          },
          1: {
            cellWidth: pageWidth - marginX * 2 - 48,
          },
        },
      });

      const docWithTableState = doc as typeof doc & {
        lastAutoTable?: { finalY?: number };
      };
      let contentY = (docWithTableState.lastAutoTable?.finalY ?? 94) + 8;

      const addTextSection = (title: string, rawText: string | null | undefined) => {
        const sectionText = normalizeText(rawText);
        if (sectionText === "N/A") return;

        const maxWidth = pageWidth - marginX * 2;
        const titleLines = doc.splitTextToSize(title, maxWidth) as string[];
        const bodyLines = doc.splitTextToSize(sectionText, maxWidth) as string[];
        const requiredHeight = titleLines.length * 5 + bodyLines.length * 4.8 + 5;

        if (contentY + requiredHeight > pageHeight - 24) {
          doc.addPage();
          contentY = 18;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(28, 25, 23);
        doc.text(titleLines, marginX, contentY);
        contentY += titleLines.length * 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(68, 64, 60);
        doc.text(bodyLines, marginX, contentY);
        contentY += bodyLines.length * 4.8 + 4;
      };

      const addBulletListSection = (title: string, items: string[]) => {
        const normalizedItems = items
          .map((item) => normalizeText(item))
          .filter((item) => item !== "N/A");
        if (normalizedItems.length === 0) return;

        const maxWidth = pageWidth - marginX * 2;
        const bulletIndent = 4;
        const bulletTextWidth = maxWidth - bulletIndent;
        const titleLines = doc.splitTextToSize(title, maxWidth) as string[];
        const bulletLineGroups = normalizedItems.map(
          (item) => doc.splitTextToSize(item, bulletTextWidth) as string[],
        );
        const bulletContentHeight = bulletLineGroups.reduce(
          (height, lines) => height + lines.length * 4.8 + 1,
          0,
        );
        const requiredHeight = titleLines.length * 5 + bulletContentHeight + 4;

        if (contentY + requiredHeight > pageHeight - 24) {
          doc.addPage();
          contentY = 18;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(28, 25, 23);
        doc.text(titleLines, marginX, contentY);
        contentY += titleLines.length * 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(68, 64, 60);

        bulletLineGroups.forEach((lines) => {
          const bulletHeight = lines.length * 4.8 + 1;
          if (contentY + bulletHeight > pageHeight - 24) {
            doc.addPage();
            contentY = 18;
          }
          doc.text("•", marginX, contentY);
          doc.text(lines, marginX + bulletIndent, contentY);
          contentY += bulletHeight;
        });

        contentY += 3;
      };

      addTextSection("Patient Description", typedSelectedPatient.smallDescription);
      addTextSection("Background", typedSelectedPatient.background);
      addBulletListSection(
        "Therapeutic Goals",
        typedSelectedPatient.objectives,
      );

      const addEmotionTrendSection = () => {
        const normalizedVectorTimeline = buildPdfStepScopedVectorTimeline(
          messages,
          stepId,
        );
        if (normalizedVectorTimeline.length === 0) return;

        const seriesKeys = getPdfSeriesKeys(normalizedVectorTimeline);
        if (seriesKeys.length === 0) return;

        const chartPoints: PdfEmotionChartPoint[] = normalizedVectorTimeline.map((point) => {
          const values: Record<string, number> = {};
          seriesKeys.forEach((seriesKey) => {
            values[seriesKey] = clampTimelineIntensity(point.vector[seriesKey] ?? 0);
          });

          const dominant = normalizeEmotionToken(point.dominant);
          const dominantIntensity =
            values[dominant] ?? Math.max(0, ...Object.values(values));

          return {
            turnIndex: point.turn_index,
            dominant,
            values,
            dominantIntensity,
          };
        });

        if (chartPoints.length === 0) return;

        const chartWidth = pageWidth - marginX * 2;
        const chartHeight = 46;
        const chartPadding = { top: 4, right: 6, bottom: 9, left: 14 };
        const legendLineHeight = 4.6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);

        let legendRows = 1;
        let occupiedLegendWidth = 0;
        seriesKeys.forEach((seriesKey) => {
          const label = getPdfSeriesLabel(seriesKey);
          const itemWidth = 8 + doc.getTextWidth(label);
          if (
            occupiedLegendWidth > 0 &&
            occupiedLegendWidth + itemWidth > chartWidth
          ) {
            legendRows += 1;
            occupiedLegendWidth = itemWidth;
            return;
          }

          occupiedLegendWidth += itemWidth;
        });

        const latestPoint = chartPoints[chartPoints.length - 1]!;
        const requiredHeight =
          6 + chartHeight + 4 + legendRows * legendLineHeight + 6.5;

        if (contentY + requiredHeight > pageHeight - 24) {
          doc.addPage();
          contentY = 18;
        }

        doc.setFillColor(54, 83, 20);
        doc.rect(marginX, contentY - 4.5, pageWidth - marginX * 2, 9, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(245, 245, 244);
        doc.text("Emotion Trend", marginX + 3, contentY + 1.2);
        contentY += 8;

        const chartX = marginX;
        const chartY = contentY;
        const chartInnerX = chartX + chartPadding.left;
        const chartInnerY = chartY + chartPadding.top;
        const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
        const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

        doc.setFillColor(250, 250, 249);
        doc.rect(chartX, chartY, chartWidth, chartHeight, "F");
        doc.setDrawColor(214, 211, 209);
        doc.setLineWidth(0.25);
        doc.rect(chartX, chartY, chartWidth, chartHeight, "S");

        const yGridValues = [1, 0.5, 0];
        yGridValues.forEach((value) => {
          const y = chartInnerY + (1 - value) * chartInnerHeight;
          doc.setDrawColor(231, 229, 228);
          doc.setLineWidth(0.2);
          doc.line(chartInnerX, y, chartInnerX + chartInnerWidth, y);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(120, 113, 108);
          doc.text(value.toFixed(1), chartInnerX - 1.8, y + 1.2, {
            align: "right",
          });
        });

        doc.setDrawColor(168, 162, 158);
        doc.setLineWidth(0.3);
        doc.line(
          chartInnerX,
          chartInnerY + chartInnerHeight,
          chartInnerX + chartInnerWidth,
          chartInnerY + chartInnerHeight,
        );

        const minTurn = chartPoints[0]!.turnIndex;
        const maxTurn = chartPoints[chartPoints.length - 1]!.turnIndex;
        const turnRange = maxTurn - minTurn;
        const dominantSnapshotKey = latestPoint.dominant;
        const getPointX = (turnIndex: number) =>
          turnRange === 0
            ? chartInnerX + chartInnerWidth / 2
            : chartInnerX + ((turnIndex - minTurn) / turnRange) * chartInnerWidth;
        const getPointY = (value: number) =>
          chartInnerY + (1 - clampTimelineIntensity(value)) * chartInnerHeight;

        seriesKeys.forEach((seriesKey) => {
          const [r, g, b] = getPdfSeriesColor(seriesKey);
          doc.setDrawColor(r, g, b);
          doc.setLineWidth(seriesKey === dominantSnapshotKey ? 0.9 : 0.55);

          for (let index = 1; index < chartPoints.length; index += 1) {
            const previousPoint = chartPoints[index - 1]!;
            const currentPoint = chartPoints[index]!;
            doc.line(
              getPointX(previousPoint.turnIndex),
              getPointY(previousPoint.values[seriesKey] ?? 0),
              getPointX(currentPoint.turnIndex),
              getPointY(currentPoint.values[seriesKey] ?? 0),
            );
          }
        });

        const [dominantR, dominantG, dominantB] = getPdfSeriesColor(
          latestPoint.dominant,
        );
        doc.setFillColor(dominantR, dominantG, dominantB);
        doc.circle(
          getPointX(latestPoint.turnIndex),
          getPointY(latestPoint.dominantIntensity),
          1.1,
          "F",
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(120, 113, 108);
        if (turnRange === 0) {
          doc.text(`Turn ${minTurn}`, chartInnerX + chartInnerWidth / 2, chartY + chartHeight - 1.5, {
            align: "center",
          });
        } else {
          doc.text(`Turn ${minTurn}`, chartInnerX, chartY + chartHeight - 1.5);
          doc.text(
            `Turn ${maxTurn}`,
            chartInnerX + chartInnerWidth,
            chartY + chartHeight - 1.5,
            {
              align: "right",
            },
          );
        }

        contentY += chartHeight + 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        let legendX = marginX;
        let legendY = contentY;

        seriesKeys.forEach((seriesKey) => {
          const label = getPdfSeriesLabel(seriesKey);
          const labelWidth = doc.getTextWidth(label);
          const itemWidth = 8 + labelWidth;

          if (legendX > marginX && legendX + itemWidth > marginX + chartWidth) {
            legendX = marginX;
            legendY += legendLineHeight;
          }

          const [r, g, b] = getPdfSeriesColor(seriesKey);
          doc.setFillColor(r, g, b);
          doc.rect(legendX, legendY - 1.6, 2.2, 2.2, "F");
          doc.setTextColor(68, 64, 60);
          doc.text(label, legendX + 3.2, legendY);
          legendX += itemWidth;
        });

        contentY = legendY + 4.5;
        const latestDominantLabel = getPdfSeriesLabel(latestPoint.dominant);
        const latestDominantIntensity = Math.round(
          clampTimelineIntensity(latestPoint.dominantIntensity) * 100,
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(68, 64, 60);
        doc.text(
          `Latest dominant emotion: ${latestDominantLabel} (${latestDominantIntensity}%)`,
          marginX,
          contentY,
        );
        contentY += 6;
      };

      addEmotionTrendSection();

      if (contentY > pageHeight - 90) {
        doc.addPage();
        contentY = 18;
      }

      doc.setFillColor(54, 83, 20);
      doc.rect(marginX, contentY - 4.5, pageWidth - marginX * 2, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(245, 245, 244);
      doc.text("Session Transcript", marginX + 3, contentY + 1.2);

      const tableBody: RowInput[] =
        questionAnswerRows.length > 0
          ? questionAnswerRows.map((row, index) => [
            String(index),
            row.question || " ",
            row.answer || " ",
            " ",
          ])
          : [["0", "No questions recorded", "No responses recorded", " "]];
      const tableContentWidth = pageWidth - marginX * 2;
      const indexColumnWidth = tableContentWidth * 0.08;
      const questionColumnWidth = tableContentWidth * 0.31;
      const answerColumnWidth = tableContentWidth * 0.31;
      const analysisColumnWidth =
        tableContentWidth - indexColumnWidth - questionColumnWidth - answerColumnWidth;

      autoTable(doc, {
        startY: contentY + 8,
        margin: { left: marginX, right: marginX },
        theme: "grid",
        tableWidth: tableContentWidth,
        head: [["#", "Question", "Answer", "Therapist Analysis"]],
        body: tableBody,
        styles: {
          fontSize: 8.2,
          cellPadding: 2.5,
          valign: "top",
          overflow: "linebreak",
          textColor: [28, 25, 23],
          minCellHeight: 12,
          lineColor: [214, 211, 209],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [132, 204, 22],
          textColor: [12, 10, 9],
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 249],
        },
        columnStyles: {
          0: { cellWidth: indexColumnWidth, halign: "center" },
          1: { cellWidth: questionColumnWidth },
          2: { cellWidth: answerColumnWidth },
          3: { cellWidth: analysisColumnWidth, minCellHeight: 20 },
        },
      });

      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(214, 211, 209);
        doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 113, 108);
        doc.text(
          `LLMPatients App · ${normalizeText(typedSelectedPatient.name)}`,
          marginX,
          pageHeight - 7,
        );
        doc.text(`Page ${page}/${totalPages}`, pageWidth - marginX, pageHeight - 7, {
          align: "right",
        });
      }

      const safePatientName = normalizeText(typedSelectedPatient.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const filename = `report-${safePatientName || "patient"}-session-${stepId}.pdf`;
      const pdfBlob = doc.output("blob");
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    } catch (error) {
      alert("Errore durante l'esportazione PDF. Riprova.");
    } finally {
      setIsExportingPdf(false);
    }
  }, [
    typedSelectedPatient,
    typedTherapySession,
    stepId,
    user.name,
    user.email,
    sessionTime,
    messages,
    isStepCompleted,
    questionAnswerRows,
    pdfHeaderAvatarDataUrl,
    patientAvatar.initials,
  ]);

  const handleCloseSuccessDialog = useCallback(() => {
    setIsSuccessDialogOpen(false);
    goBack();
  }, [goBack]);

  const handleKeyPress = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await handleSendMessage();
      }
    },
    [handleSendMessage],
  );


  const isLoading = useMemo(
    () =>
      patientLoading ||
      therapySessionLoading ||
      chatLoading ||
      completedStepsLoading,
    [patientLoading, therapySessionLoading, chatLoading, completedStepsLoading],
  );


  const currentDateString = useMemo(
    () => new Date().toLocaleDateString("it-IT"),
    [],
  );

  if (isLoading) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
        disablePadding={true}
      >
        <ChatPageSkeleton />
      </SharedLayout>
    );
  }

  if (patientError || !typedSelectedPatient) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <div className="flex min-h-screen items-center justify-center bg-background">
          <DashboardPanel className="dashboard-section text-center p-8 max-w-md">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              Paziente non trovato
            </h2>
            <p className="mb-6 text-muted-foreground">
              Il paziente richiesto non è disponibile.
            </p>
            <Button onClick={goBack} size="lg" className="gap-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla Timeline
            </Button>
          </DashboardPanel>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      user={user}
      impersonation={impersonation}
      layoutType="dashboard"
      currentPage="/dashboard/therapeutic-journey"
      disablePadding={true}
    >
      <div
        className="flex h-[calc(100vh-4rem)] flex-col bg-background"
        role="main"
        aria-label="Chat con paziente virtuale"
      >
        { }
        <header
          className="flex-shrink-0 px-4 py-4 sm:px-6 bg-card border-b border-border"
          role="banner"
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="flex-shrink-0 hover:bg-primary/10"
                aria-label="Torna alla timeline"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate text-foreground">
                  <span className="hidden sm:inline">
                    {effectivePatientName} -{" "}
                  </span>
                  Sessione {stepId}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentDateString}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center space-x-2 sm:space-x-4">
              <div className="bg-muted text-foreground px-2 py-1 sm:px-3 w-16 text-center rounded-md">
                <span className="text-sm font-medium">
                  {formatSessionTime(sessionTime)}
                </span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 hover:bg-primary/10"
                    aria-label="Informazioni sessione"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-foreground">
                      Informazioni Sessione
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Patient ID (interno):</span>
                        <span className="font-mono text-xs text-foreground">
                          {typedSelectedPatient?.id || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Therapy Session ID:</span>
                        <span className="font-mono text-xs text-foreground">
                          {typedTherapySession?.id || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">External Patient ID:</span>
                        <span className="font-mono text-xs text-foreground">
                          {typedSelectedPatient?.externalPatientId || "Non inizializzato"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Step ID:</span>
                        <span className="font-mono text-xs text-foreground">
                          {stepId}
                        </span>
                      </div>
                    </div>




                  </div>
                </PopoverContent>
              </Popover>
              {!isStepCompleted && (
                <Button
                  onClick={handleCompleteStep}
                  disabled={markStepDoneMutation.isPending}
                  isLoading={markStepDoneMutation.isPending}
                  size="sm"
                  className="px-2 text-xs sm:px-4 sm:text-sm"
                  aria-label="Completa sessione"
                >
                  <span className="hidden sm:inline">
                    {markStepDoneMutation.isPending ? "Completando..." : "Fine"}
                  </span>
                  <span className="sm:hidden">
                    {markStepDoneMutation.isPending ? "..." : "Fine"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </header>

        { }
        <div className="flex-1 flex min-h-0 overflow-hidden">
          { }
          <div className="hidden lg:flex flex-col items-center justify-start w-64 flex-shrink-0 p-4 page-background">
            <div className="flex flex-col items-center w-full space-y-3 pt-4">
              <div
                className="relative rounded-[1.1rem]"
                style={{
                  padding: isAvatarTransitioning ? '4px' : '3px',
                  background: EMOTION_COLORS[nextEmotion ?? currentEmotion],
                  boxShadow: isAvatarTransitioning
                    ? `0 0 35px ${EMOTION_COLORS[nextEmotion ?? currentEmotion]}90, 0 0 70px ${EMOTION_COLORS[nextEmotion ?? currentEmotion]}50`
                    : `0 0 20px ${EMOTION_COLORS[nextEmotion ?? currentEmotion]}40`,
                  transition: `all ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              >
                <div className="therapy-session-avatar-large relative group rounded-[calc(1.1rem-3px)] overflow-hidden">
                  {typedSelectedPatient ? (
                    <div className="relative w-full h-full">
                      { }
                      <Image
                        key={`current-${currentEmotion}`}
                        src={getPatientAvatarPath(selectedPatientAvatarUrl, currentEmotion)}
                        alt={`Avatar di ${effectivePatientName} - ${currentEmotion}`}
                        width={100}
                        height={100}
                        className="rounded-[calc(1.1rem-3px)] object-cover shadow-lg w-full h-full"
                        priority
                        style={{
                          opacity:
                            nextEmotion && nextEmotion !== currentEmotion
                              ? isAvatarTransitioning
                                ? 0
                                : 1
                              : 1,
                          transition: `opacity ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                        }}
                      />
                      {nextEmotion && nextEmotion !== currentEmotion && (
                        <Image
                          key={`next-${nextEmotion}`}
                          src={getPatientAvatarPath(selectedPatientAvatarUrl, nextEmotion)}
                          alt={`Avatar di ${effectivePatientName} - ${nextEmotion}`}
                          width={100}
                          height={100}
                          className="rounded-[calc(1.1rem-3px)] object-cover shadow-lg w-full h-full absolute inset-0"
                          style={{
                            opacity: isAvatarTransitioning ? 1 : 0,
                            transition: `opacity ${AVATAR_TRANSITION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                          }}
                          priority
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`flex h-25 w-25 items-center justify-center rounded-[calc(1.1rem-3px)] font-bold text-white text-3xl shadow-lg ${patientAvatar?.colorClass || "avatar-color-default"}`}
                    >
                      {patientAvatar?.initials}
                    </div>
                  )}
                  { }
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAvatarExpanded(true)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/40 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                    style={{ zIndex: 3 }}
                    aria-label="Espandi avatar"
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)] text-center break-words">
                {effectivePatientName}
              </p>
              { }
              {extractedText && (
                <div className="flex flex-col items-center w-full mt-2 px-2">
                  <div
                    className="text-xs text-[var(--color-text-secondary)] text-center break-words max-w-full italic"
                    style={{
                      animation: 'fadeIn 0.5s ease-in-out',
                    }}
                  >
                    {extractedText}
                  </div>
                </div>
              )}
              { }
              <div className="flex flex-col items-center w-full mt-2">
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-300"
                  style={{
                    backgroundColor: EMOTION_COLORS[nextEmotion ?? currentEmotion],
                    boxShadow: `0 2px 8px ${EMOTION_COLORS[nextEmotion ?? currentEmotion]}60`,
                  }}
                >
                  {EMOTION_LABELS[nextEmotion ?? currentEmotion]}
                </div>
              </div>
            </div>
          </div>

          { }
          <div
            ref={messagesContainerRef}
            className="flex-1 flex overflow-y-auto chat-scrollbar"
          >
            <div className="flex flex-1 min-h-full items-stretch">
              { }
              <div className="flex-1 flex min-h-full flex-col page-background relative">
                { }
                <div className={`flex-1 p-4 sm:p-6 ${audioPlayer.currentAudioUrl ? 'pb-40' : 'pb-24'}`}>
                  <div className="w-full max-w-4xl mx-auto">
                    {shouldShowEmotionTrend && (
                      <div className="sticky top-2 z-20 mb-4 rounded-xl border border-[var(--color-border-secondary)] bg-[var(--color-surface-primary)]/80 p-3 backdrop-blur-sm lg:hidden">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[var(--color-border-secondary)]">
                            <Image
                              src={getPatientAvatarPath(selectedPatientAvatarUrl, currentEmotion)}
                              alt={`Avatar di ${effectivePatientName}`}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                              {effectivePatientName}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {EMOTION_LABELS[nextEmotion ?? currentEmotion]}
                            </p>
                          </div>
                        </div>
                        <EmotionTrendPanel
                          snapshot={emotionSnapshot}
                          timeline={emotionTimeline}
                          vectorTimeline={emotionVectorTimeline}
                          compact={true}
                        />
                      </div>
                    )}
                    <div className="space-y-4 sm:space-y-6">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                          <div
                            className={`flex max-w-2xl space-x-3 ${message.sender === "user"
                              ? "flex-row-reverse space-x-reverse"
                              : "flex-row"
                              }`}
                          >
                            { }
                            <div
                              className={`flex items-start gap-2 max-w-xs rounded-lg px-3 py-2 text-white sm:max-w-sm sm:px-4 sm:py-3 ${message.sender === "patient"
                                ? "chat-bubble--patient"
                                : message.sender === "user"
                                  ? "chat-bubble--user"
                                  : ""
                                }`}
                            >
                              <p className="text-body text-sm sm:text-base flex-1">
                                {message.content}
                              </p>
                              {message.sender === "patient" && message.metadata && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-all mt-0.5 p-1 rounded hover:bg-white/20 hover:scale-110"
                                        aria-label="Informazioni tecniche risposta"
                                        type="button"
                                      >
                                        <Code2 className="h-4 w-4 text-white" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side={message.sender === "patient" ? "right" : "left"}
                                      className="max-w-xs w-full rounded-[var(--radius-lg)] border border-[var(--color-border-secondary)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-primary)] max-h-[70vh] overflow-y-auto"
                                      sideOffset={8}
                                    >
                                      <div className="space-y-3 max-w-full">
                                        <div>
                                          <h4 className="font-medium text-xs text-[var(--color-text-primary)] mb-2">
                                            Informazioni Tecniche
                                          </h4>
                                          <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-[var(--color-text-secondary)]">API Type:</span>
                                              <span className={`font-mono text-[10px] text-[var(--color-text-primary)] ${message.metadata.apiType === "REAL"
                                                ? "text-green-400"
                                                : "text-yellow-400"
                                                }`}>
                                                {message.metadata.apiType}
                                              </span>
                                            </div>
                                            {message.metadata.endpoint && (
                                              <div className="flex flex-col gap-1.5">
                                                <span className="text-[var(--color-text-secondary)]">Endpoint:</span>
                                                <span className="font-mono text-[10px] text-[var(--color-text-primary)] break-all">
                                                  {message.metadata.endpoint.length > 30
                                                    ? `${message.metadata.endpoint.substring(0, 30)}...`
                                                    : message.metadata.endpoint}
                                                </span>
                                              </div>
                                            )}
                                            {message.metadata.duration !== undefined && (
                                              <div className="flex justify-between">
                                                <span className="text-[var(--color-text-secondary)]">Durata:</span>
                                                <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                                                  {message.metadata.duration < 1000
                                                    ? `${message.metadata.duration}ms`
                                                    : `${(message.metadata.duration / 1000).toFixed(2)}s`}
                                                </span>
                                              </div>
                                            )}
                                            {message.metadata.timestamp && (
                                              <div className="flex justify-between">
                                                <span className="text-[var(--color-text-secondary)]">Timestamp:</span>
                                                <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                                                  {new Date(message.metadata.timestamp).toLocaleTimeString("it-IT")}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {message.metadata.requestData && (
                                          <div className="border-t border-[var(--color-border-secondary)] pt-3">
                                            <h4 className="font-medium text-xs text-[var(--color-text-primary)] mb-2">
                                              Dati Inviati
                                            </h4>
                                            <div className="space-y-2 text-xs">
                                              {message.metadata.requestData.patientId && (
                                                <div className="flex flex-col gap-1.5">
                                                  <span className="text-[var(--color-text-secondary)]">Patient ID:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)] break-all">
                                                    {message.metadata.requestData.patientId.substring(0, 20)}...
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.requestData.patientName && (
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--color-text-secondary)]">Patient Name:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                                                    {message.metadata.requestData.patientName}
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.requestData.externalPatientId && (
                                                <div className="flex flex-col gap-1.5">
                                                  <span className="text-[var(--color-text-secondary)]">External ID:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)] break-all">
                                                    {message.metadata.requestData.externalPatientId.substring(0, 20)}...
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.requestData.userMessage && (
                                                <div className="flex flex-col gap-1.5">
                                                  <span className="text-[var(--color-text-secondary)]">User Message:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)] break-words leading-tight">
                                                    {message.metadata.requestData.userMessage.length > 50
                                                      ? `${message.metadata.requestData.userMessage.substring(0, 50)}...`
                                                      : message.metadata.requestData.userMessage}
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.requestData.sessionId && (
                                                <div className="flex flex-col gap-1.5">
                                                  <span className="text-[var(--color-text-secondary)]">Session ID:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)] break-all">
                                                    {message.metadata.requestData.sessionId.substring(0, 20)}...
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.requestData.stepId !== undefined && (
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--color-text-secondary)]">Step ID:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                                                    {message.metadata.requestData.stepId}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {message.metadata.responseData && (
                                          <div className="border-t border-[var(--color-border-secondary)] pt-3">
                                            <h4 className="font-medium text-xs text-[var(--color-text-primary)] mb-2">
                                              Dati Ricevuti
                                            </h4>
                                            <div className="space-y-2 text-xs">
                                              {message.metadata.responseData.emotion && (
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--color-text-secondary)]">Emotion:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)] capitalize">
                                                    {message.metadata.responseData.emotion}
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.responseData.topic && (
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--color-text-secondary)]">Topic:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                                                    {message.metadata.responseData.topic}
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.responseData.reasoningTime !== undefined && (
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--color-text-secondary)]">Reasoning Time:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                                                    {message.metadata.responseData.reasoningTime}s
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.responseData.status && (
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--color-text-secondary)]">Status:</span>
                                                  <span className={`font-mono text-[10px] ${message.metadata.responseData.status === "success"
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                                    }`}>
                                                    {message.metadata.responseData.status}
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.responseData.code && (
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--color-text-secondary)]">Code:</span>
                                                  <span className="font-mono text-[10px] text-[var(--color-text-primary)]">
                                                    {message.metadata.responseData.code}
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            {message.metadata.rawResponseJson && (
                                              <div className="mt-3 border-t border-[var(--color-border-secondary)] pt-3">
                                                <h4 className="font-medium text-xs text-[var(--color-text-primary)] mb-2">
                                                  JSON Risposta
                                                </h4>
                                                <pre className="text-[10px] font-mono text-[var(--color-text-primary)] bg-[var(--color-surface-primary)] p-2 rounded border border-[var(--color-border-secondary)] overflow-auto max-h-32">
                                                  {message.metadata.rawResponseJson}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="mb-4 flex justify-start">
                          <div className="chat-typing-indicator rounded-lg px-4 py-3">
                            <div className="flex space-x-1">
                              <div className="chat-typing-dot h-2 w-2 animate-bounce rounded-full bg-white/80"></div>
                              <div className="chat-typing-dot--delay-1 h-2 w-2 animate-bounce rounded-full bg-white/80"></div>
                              <div className="chat-typing-dot--delay-2 h-2 w-2 animate-bounce rounded-full bg-white/80"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                { }
                {!isStepCompleted && (
                  <div className="sticky bottom-0 left-0 right-0 z-20 p-4 sm:p-6 bg-transparent">
                    <div className="mx-auto max-w-4xl bg-transparent">
                      { }
                      {!audioPlayer.isTTSAvailable && showTTSWarning && isTTSEnabled !== false && (
                        <div className="mb-4">
                          <div className="message message-warning">
                            <div className="message-icon">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="message-content">
                              <div className="message-title">Audio non disponibile</div>
                              <div className="message-text">
                                Il servizio di sintesi vocale non è disponibile al momento. I messaggi del paziente verranno mostrati solo come testo.
                              </div>
                            </div>
                            <Button
                              onClick={() => setShowTTSWarning(false)}
                              variant="ghost"
                              size="icon"
                              className="message-dismiss"
                              aria-label="Chiudi avviso"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      { }
                      {!hasUserInteracted && audioPlayer.isTTSAvailable && isTTSEnabled !== false && (
                        <div className="mb-4">
                          <div className="message message-info">
                            <div className="message-icon">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="message-content">
                              <div className="message-title">Riproduzione audio automatica</div>
                              <div className="message-text">
                                Invia un messaggio o clicca play per abilitare la riproduzione automatica dell&apos;audio dei messaggi del paziente.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      { }
                      {(audioPlayer.isLoading || audioPlayer.currentAudioUrl) && (
                        <div className="mb-4 p-4 bg-transparent">
                          <div className="flex space-x-2 sm:space-x-3">
                            <div className="flex-1 flex items-center rounded-lg px-3 py-2 bg-[var(--color-surface-primary)]/50 backdrop-blur-sm">
                              {audioPlayer.isLoading ? (
                                <div className="flex items-center justify-center flex-1 h-20">
                                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary-green)]" />
                                  <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                                    Generazione audio...
                                  </span>
                                </div>
                              ) : (
                                <>
                                  { }
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {

                                      if (!hasUserInteracted) {
                                        setHasUserInteracted(true);
                                      }
                                      audioPlayer.togglePlayPause();
                                    }}
                                    className="h-16 w-16 p-0 hover:bg-[var(--color-primary-green)]/10 flex-shrink-0"
                                    aria-label={audioPlayer.isPlaying ? "Pausa" : "Play"}
                                  >
                                    {audioPlayer.isPlaying ? (
                                      <X className="h-6 w-6 text-[var(--color-primary-green)]" />
                                    ) : (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="h-6 w-6 text-[var(--color-primary-green)]"
                                      >
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    )}
                                  </Button>

                                  { }
                                  {audioPlayer.isPlaying && showAudioWaveform && (
                                    <div className="flex items-center justify-between flex-1 space-x-1 h-20 px-4">
                                      {Array.from({ length: 60 }, (_, i) => {

                                        const progress = audioPlayer.duration > 0
                                          ? (audioPlayer.currentTime / audioPlayer.duration)
                                          : 0;
                                        const barProgress = i / 60;
                                        const isPast = barProgress < progress;
                                        const baseHeight = 6;
                                        const animatedHeight = isPast
                                          ? baseHeight + (Math.sin(i * 0.5) * 15)
                                          : baseHeight + (Math.sin(i * 0.3 + Date.now() * 0.002) * 20);

                                        return (
                                          <div
                                            key={i}
                                            className="w-1 rounded-full transition-all duration-200"
                                            style={{
                                              height: `${animatedHeight}px`,
                                              background: isPast
                                                ? "linear-gradient(135deg, var(--color-primary-green), var(--color-chat-bubble-patient))"
                                                : "linear-gradient(135deg, var(--color-chat-bubble-patient), var(--color-primary-green))",
                                              animation: !isPast ? `audioWave 1.2s ease-in-out infinite ${i * 0.02}s` : "none",
                                              transformOrigin: "center",
                                              opacity: isPast ? 0.5 : 0.8 + (Math.sin(i * 0.2) * 0.2),
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}

                                  { }
                                  {(!audioPlayer.isPlaying || !showAudioWaveform) && audioPlayer.currentAudioUrl && (
                                    <div className="flex items-center justify-center flex-1 h-20">
                                      <span className="text-sm text-[var(--color-text-secondary)]">
                                        {audioPlayer.isPlaying
                                          ? "Riproduzione in corso..."
                                          : "Audio pronto - Clicca play per ascoltare"
                                        }
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={audioPlayer.clear}
                              className="h-20 w-11 p-0 hover:bg-[var(--color-primary-green)]/10 flex-shrink-0"
                              aria-label="Chiudi audio player"
                              disabled={audioPlayer.isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 sm:space-x-3 bg-transparent">
                        <div className="relative flex-1">
                          <Input
                            ref={inputRef}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Inizia la conversazione"
                            disabled={isTyping}
                            className="flex-1 text-sm sm:text-base h-11"
                            aria-label="Messaggio da inviare"
                          />
                        </div>
                        <Button
                          onClick={() => void handleSendMessage()}
                          disabled={!inputMessage.trim() || isTyping}
                          className="chat-send-button h-11 w-11"
                          aria-label="Invia messaggio"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                { }
              {isStepCompleted && (
                  <div className="sticky bottom-0 left-0 right-0 z-20 navbar-background p-6">
                    <div className="mx-auto max-w-4xl text-center">
                      <div className="pill bg-primary-green text-text-inverse px-4 py-3">
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between">
                          <p className="flex items-center justify-center gap-2 text-sm font-medium">
                            <Check className="h-4 w-4" aria-hidden="true" />
                            <span>
                              Sessione {stepId} completata - La conversazione è in modalità sola lettura
                            </span>
                          </p>
                          <Button
                            type="button"
                            onClick={() => void handleDownloadSessionPdf()}
                            disabled={isExportingPdf}
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-2 border border-stone-800 bg-white/90 px-3 text-xs font-semibold text-stone-900 hover:bg-white"
                            aria-label="Scarica report PDF della sessione"
                          >
                            {isExportingPdf ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileDown className="h-4 w-4" />
                            )}
                            <span>PDF</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          { }
          <div className="hidden lg:flex w-64 flex-shrink-0 self-start flex-col page-background p-4">
            <div className="sticky top-4 w-full max-h-[calc(100vh-7rem)] overflow-y-auto chat-scrollbar pr-1 pt-4">
              {shouldShowEmotionTrend && (
                <EmotionTrendPanel
                  snapshot={emotionSnapshot}
                  timeline={emotionTimeline}
                  vectorTimeline={emotionVectorTimeline}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      { }
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md [&>div]:!animate-none !animate-none">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-[var(--color-primary-green)]/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-[var(--color-primary-green)]" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Sessione Completata!
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Hai completato con successo la Sessione {stepId} con{" "}
              {effectivePatientName}.
              <br />
              <span className="text-sm text-[var(--color-text-primary)]/60 mt-2 block">
                Le tue note sono state salvate e puoi rivederle in qualsiasi momento.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseSuccessDialog}
              className="w-full sm:w-auto"
              size="lg"
            >
              Torna alla Timeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      { }
      <Dialog open={isAvatarExpanded} onOpenChange={setIsAvatarExpanded}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Avatar del paziente {effectivePatientName}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {typedSelectedPatient ? (
              <Image
                src={getPatientAvatarPath(selectedPatientAvatarUrl, currentEmotion)}
                alt={`Avatar di ${effectivePatientName} - ${currentEmotion}`}
                width={600}
                height={600}
                className="w-full h-auto object-cover"
              />
            ) : (
              <div
                className={`flex w-full aspect-square items-center justify-center font-bold text-white text-9xl ${patientAvatar?.colorClass || "avatar-color-default"}`}
              >
                {patientAvatar?.initials}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAvatarExpanded(false)}
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/40 hover:bg-black/60"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SharedLayout>
  );
}
