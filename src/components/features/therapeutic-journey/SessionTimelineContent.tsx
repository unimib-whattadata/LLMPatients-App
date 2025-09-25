"use client";

import { SharedLayout } from "@/components/layout/SharedLayout";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type PathPoint = {
  x: number;
  y: number;
};

type TimelineStep = {
  id: number;
  top: number;
  left: number;
  color: string;
  textColor?: string;
};

import type { User, ImpersonationContext } from "~/types";
import { api } from "~/trpc/react";
import { extractPatientIdFromSlug, createPatientSlug } from "~/lib/utils/slugify";

type Session = {
  user?: User;
  impersonation?: ImpersonationContext | undefined;
};

const timelineSteps: TimelineStep[] = [
  { id: 1, top: 150, left: 533, color: "#B9C87C" },
  { id: 2, top: 340, left: 333, color: "#B9C87C" },
  { id: 3, top: 460, left: 533, color: "#E3B23C" },
  { id: 4, top: 560, left: 713, color: "#E3B23C" },
  { id: 5, top: 680, left: 533, color: "#E3B23C" },
  { id: 6, top: 780, left: 373, color: "#E3B23C" },
  { id: 7, top: 900, left: 533, color: "#E3B23C" },
  { id: 8, top: 1000, left: 713, color: "#E3B23C" },
  { id: 9, top: 1120, left: 533, color: "#E3B23C" },
  { id: 10, top: 1210, left: 353, color: "#E3B23C" },
  { id: 11, top: 1400, left: 533, color: "#B4A7E6" },
];

const timelinePathPoints: PathPoint[] = [
  { x: 520, y: 100 },
  { x: 520, y: 240 },
  { x: 320, y: 240 },
  { x: 320, y: 460 },
  { x: 700, y: 460 },
  { x: 700, y: 680 },
  { x: 360, y: 680 },
  { x: 360, y: 900 },
  { x: 700, y: 900 },
  { x: 700, y: 1120 },
  { x: 340, y: 1120 },
  { x: 340, y: 1300 },
  { x: 520, y: 1300 },
  { x: 520, y: 1460 },
];

// Timeline configuration constants
const TIMELINE_CONFIG = {
  BASE_WIDTH: 960,
  BASE_HEIGHT: 1450,
  TOOLTIP_OFFSET_X: 100,
  NODE_OFFSET_X: -14,
  PATH_RADIUS: 60,
  MIN_CIRCLE_SIZE: 40,
  MAX_CIRCLE_SIZE: 62,
  MIN_FONT_SIZE: 14,
  MAX_FONT_SIZE: 18,
} as const;

// Tips configuration
const TIPS_CONFIG = {
  KNOWLEDGE: [
    "Ascolta attivamente il paziente senza interrompere.",
    "Mantieni un atteggiamento empatico e non giudicante.",
    "Fai domande aperte per approfondire la comprensione.",
    "Osserva il linguaggio del corpo e le emozioni.",
  ],
  INTERVENTION: [
    "Utilizza tecniche di riformulazione per chiarire i concetti.",
    "Proponi strategie concrete e personalizzate per il paziente.",
    "Mantieni un approccio collaborativo e coinvolgente.",
    "Monitora i progressi e adatta l'intervento di conseguenza.",
    "Fornisci feedback costruttivo e incoraggiante.",
    "Documenta accuratamente le osservazioni e i progressi.",
  ],
  CONCLUSION: [
    "Riassumi i punti chiave emersi durante il percorso.",
    "Valuta l'efficacia delle strategie implementate.",
    "Pianifica eventuali follow-up o approfondimenti.",
    "Celebra i progressi e i successi ottenuti.",
  ],
} as const;

const timelinePathD = buildRoundedOrthogonalPath(
  timelinePathPoints,
  TIMELINE_CONFIG.PATH_RADIUS,
);

type StepDetails = {
  phaseTitle: string;
  sessionLabel: string;
  tips: readonly string[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  bodyColor: string;
};

// Step details configuration
const STEP_DETAILS_CONFIG = {
  CONCLUSION: {
    phaseTitle: "Conclusione",
    sessionLabel: "Seduta 11",
    tips: TIPS_CONFIG.CONCLUSION,
    backgroundColor: "#2a2548",
    textColor: "#EEE9FF",
    accentColor: "#B8A7F4",
    bodyColor: "#E4DEFF",
  },
  INTERVENTION: {
    phaseTitle: "Fase di Intervento",
    sessionLabel: "Sedute 3-10",
    tips: TIPS_CONFIG.INTERVENTION,
    backgroundColor: "#2a1f0f",
    textColor: "#FFF4E6",
    accentColor: "#E3B23C",
    bodyColor: "#F5E6D3",
  },
  KNOWLEDGE: {
    phaseTitle: "Fase di Conoscenza",
    sessionLabel: "Sedute 1-2",
    tips: TIPS_CONFIG.KNOWLEDGE,
    backgroundColor: "#1a2720",
    textColor: "#E8F4E3",
    accentColor: "#9BD0A8",
    bodyColor: "#DAE7D8",
  },
} as const;

const getStepDetails = (stepId: number): StepDetails => {
  if (stepId === 11) return STEP_DETAILS_CONFIG.CONCLUSION;
  if (stepId >= 3) return STEP_DETAILS_CONFIG.INTERVENTION;
  return STEP_DETAILS_CONFIG.KNOWLEDGE;
};

function buildRoundedOrthogonalPath(
  points: PathPoint[],
  radius: number,
): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const [point] = points;
    if (!point) return "";
    return `M ${point.x} ${point.y}`;
  }

  const firstPoint = points[0];
  if (!firstPoint) return "";

  const pathCommands: string[] = [`M ${firstPoint.x} ${firstPoint.y}`];
  let currentX = firstPoint.x;
  let currentY = firstPoint.y;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (!current || !previous) continue;

    const deltaX = current.x - previous.x;
    const deltaY = current.y - previous.y;

    if (deltaX === 0 && deltaY === 0) {
      continue;
    }

    const directionX = Math.sign(deltaX);
    const directionY = Math.sign(deltaY);

    let endX = current.x;
    let endY = current.y;
    let cornerRadius = 0;

    if (index < points.length - 1) {
      const next = points[index + 1];
      if (!next) continue;

      const nextDeltaX = next.x - current.x;
      const nextDeltaY = next.y - current.y;
      const nextDirectionX = Math.sign(nextDeltaX);
      const nextDirectionY = Math.sign(nextDeltaY);
      const isCorner =
        directionX !== nextDirectionX || directionY !== nextDirectionY;

      if (isCorner) {
        const previousLength = Math.abs(deltaX !== 0 ? deltaX : deltaY);
        const nextLength = Math.abs(nextDeltaX !== 0 ? nextDeltaX : nextDeltaY);
        cornerRadius = Math.min(radius, previousLength / 2, nextLength / 2);
        endX = current.x - directionX * cornerRadius;
        endY = current.y - directionY * cornerRadius;
      }
    }

    if (currentX !== endX || currentY !== endY) {
      pathCommands.push(`L ${endX} ${endY}`);
      currentX = endX;
      currentY = endY;
    }

    if (cornerRadius > 0 && index < points.length - 1) {
      const next = points[index + 1];
      if (!next) continue;

      const nextDeltaX = next.x - current.x;
      const nextDeltaY = next.y - current.y;
      const nextDirectionX = Math.sign(nextDeltaX);
      const nextDirectionY = Math.sign(nextDeltaY);

      const arcEndX = current.x + nextDirectionX * cornerRadius;
      const arcEndY = current.y + nextDirectionY * cornerRadius;
      const sweepFlag =
        directionX * nextDirectionY - directionY * nextDirectionX > 0 ? 1 : 0;

      pathCommands.push(
        `A ${cornerRadius} ${cornerRadius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`,
      );

      currentX = arcEndX;
      currentY = arcEndY;
    }
  }

  return pathCommands.join(" ");
}

// Timeline step component
const TimelineStep = memo(
  ({
    step,
    circleSize,
    circleFontSize,
    onStepClick,
    isUnlocked,
    isCurrent,
    isCompleted,
  }: {
    step: TimelineStep & { scaledTop: number; scaledLeft: number };
    circleSize: number;
    circleFontSize: number;
    onStepClick: (stepId: number) => void;
    isUnlocked: boolean;
    isCurrent: boolean;
    isCompleted: boolean;
  }) => (
    <div
      key={step.id}
      style={{
        top: `${(step.scaledTop / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
        left: `${(step.scaledLeft / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
        backgroundColor: isCompleted ? "#22C55E" : step.color, // Green for completed steps
        color: isCompleted ? "white" : (step.textColor ?? "#0b0d06"),
        width: `${(circleSize / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
        height: `${(circleSize / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
        fontSize: `${circleFontSize}px`,
        opacity: isUnlocked ? 1 : 0.35,
        filter: isUnlocked ? undefined : "grayscale(60%)",
      }}
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
        isUnlocked
          ? "cursor-pointer shadow-[0_18px_34px_rgba(0,0,0,0.45)] hover:scale-110 focus-visible:scale-110"
          : "cursor-not-allowed shadow-none"
      } ${isCurrent ? "ring-4 ring-white/70" : ""} ${isCompleted ? "ring-2 ring-green-400" : ""}`}
      onClick={() => {
        if (!isUnlocked) return;
        onStepClick(step.id);
      }}
      onKeyDown={(event) => {
        if (!isUnlocked) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStepClick(step.id);
        }
      }}
      role="button"
      tabIndex={isUnlocked ? 0 : -1}
      aria-disabled={!isUnlocked}
      aria-label={`Apri sessione ${step.id}${isUnlocked ? "" : " non disponibile"}${isCompleted ? " - Completata" : ""}`}
    >
      {isCompleted ? "✓" : step.id}
    </div>
  ),
);
TimelineStep.displayName = "TimelineStep";

// Mobile timeline step component
const MobileTimelineStep = memo(
  ({
    step,
    details,
    isOpen,
    onStepClick,
    onClose,
    isUnlocked,
    isCurrent,
    isCompleted,
  }: {
    step: TimelineStep;
    details: StepDetails;
    isOpen: boolean;
    onStepClick: (stepId: number) => void;
    onClose: () => void;
    isUnlocked: boolean;
    isCurrent: boolean;
    isCompleted: boolean;
  }) => (
    <div key={`mobile-step-${step.id}`} className="relative">
      <span
        className="absolute top-4 -left-6.5 flex h-3 w-3 items-center justify-center"
        aria-hidden
      >
        <span
          className="block flex h-3 w-3 items-center justify-center rounded-full text-xs font-bold"
          style={{
            backgroundColor: isCompleted ? "#22C55E" : step.color,
            color: isCompleted ? "white" : "inherit",
          }}
        >
          {isCompleted ? "✓" : ""}
        </span>
      </span>

      <button
        type="button"
        onClick={() => {
          if (!isUnlocked) return;
          onStepClick(step.id);
        }}
        aria-expanded={isOpen}
        disabled={!isUnlocked}
        className={`w-full rounded-2xl border border-white/5 p-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-colors duration-200 focus:ring-2 focus:ring-[#4F9D69] focus:outline-none ${
          isUnlocked ? "" : "cursor-not-allowed opacity-40"
        } ${isCurrent ? "ring-2 ring-white/70" : ""}`}
        style={{
          backgroundColor: details.backgroundColor,
          color: details.textColor,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-white/70 uppercase">
              Step {step.id} {isCompleted && "✓"}
            </p>
            <h2 className="mt-2 text-base font-semibold text-white">
              {details.phaseTitle}
            </h2>
            <p className="mt-1 text-xs text-white/60">
              {isCompleted
                ? "Sessione completata"
                : "Clicca per aprire la sessione"}
            </p>
          </div>
        </div>
      </button>
    </div>
  ),
);
MobileTimelineStep.displayName = "MobileTimelineStep";

function normalizeParam(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return (value[0] as string) ?? null;
  }
  return null;
}

interface SessionTimelineContentProps {
  user: User;
  impersonation?: ImpersonationContext | undefined;
}

export function SessionTimelineContent({
  user,
  impersonation,
}: SessionTimelineContentProps) {
  const params = useParams();
  const router = useRouter();
  const sessionId = normalizeParam(params.sessionId);

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Timeline scaling - removed JavaScript scaling in favor of CSS-based scaling

  const {
    data: therapySession,
    isLoading: therapySessionLoading,
    error: therapySessionError,
  } = api.therapySessions.getByPatient.useQuery(
    { patientId: sessionId ?? "" },
    { enabled: Boolean(sessionId) },
  );

  // Get all completed chat steps for this therapy session
  const { data: completedSteps, isLoading: completedStepsLoading } =
    api.chat.getSessionChats.useQuery(
      { therapySessionId: therapySession?.id ?? "" },
      { enabled: Boolean(therapySession?.id) },
    );

  const {
    data: selectedPatient,
    isLoading: patientLoading,
    error: patientError,
  } = api.patients.getPatientById.useQuery(
    { id: sessionId ?? "" },
    { enabled: Boolean(sessionId) },
  );

  const advanceSession = api.therapySessions.advanceSession.useMutation({
    onSuccess: () => {
      // Find the next unlocked step and navigate to its chat
      const nextUnlockedStep = unlockedSteps.find(stepId => !isStepCompleted(stepId));
      if (nextUnlockedStep && sessionId && selectedPatient) {
        const patientSlug = createPatientSlug(selectedPatient.name);
        router.push(`/dashboard/therapeutic-journey/${sessionId}/${patientSlug}/chat/${nextUnlockedStep}`);
      } else if (nextUnlockedStep && sessionId) {
        router.push(`/dashboard/therapeutic-journey/${sessionId}/chat/${nextUnlockedStep}`);
      } else {
        // If no unlocked step found, just reload to update the UI
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error("Error advancing session:", error);
    },
  });

  // Calculate which steps are unlocked based on completed steps
  const unlockedSteps = useMemo(() => {
    if (!completedSteps) return [1]; // First step is always unlocked

    const completedStepNumbers = completedSteps
      .filter((step) => step.done)
      .map((step) => step.stepNumber)
      .sort((a, b) => a - b);

    // Always include step 1
    const unlocked = [1];

    // Add next step after each completed step
    completedStepNumbers.forEach((completedStep) => {
      const nextStep = completedStep + 1;
      if (nextStep <= timelineSteps.length && !unlocked.includes(nextStep)) {
        unlocked.push(nextStep);
      }
    });

    return unlocked.sort((a, b) => a - b);
  }, [completedSteps]);

  const isStepUnlocked = useCallback(
    (stepId: number) => {
      return unlockedSteps.includes(stepId);
    },
    [unlockedSteps],
  );

  const isStepCompleted = useCallback(
    (stepId: number) => {
      if (!completedSteps) return false;
      return completedSteps.some(
        (step) => step.stepNumber === stepId && step.done,
      );
    },
    [completedSteps],
  );

  // Event handlers - must be before early return to maintain hook order
  const handleStepClick = useCallback(
    (stepId: number) => {
      if (!isStepUnlocked(stepId)) return;

      // Navigate to chat page for the selected step with patient name
      if (selectedPatient) {
        const patientSlug = createPatientSlug(selectedPatient.name);
        router.push(`/dashboard/therapeutic-journey/${sessionId}/${patientSlug}/chat/${stepId}`);
      } else {
        router.push(`/dashboard/therapeutic-journey/${sessionId}/chat/${stepId}`);
      }
    },
    [isStepUnlocked, router, sessionId, selectedPatient],
  );

  // Computed values - must be before early return to maintain hook order

  // Use original positions and sizes - CSS will handle scaling
  const stepPositions = useMemo(
    () =>
      timelineSteps.map((step) => ({
        ...step,
        scaledTop: step.top,
        scaledLeft: step.left + TIMELINE_CONFIG.NODE_OFFSET_X,
      })),
    [],
  );

  const circleSize = TIMELINE_CONFIG.MAX_CIRCLE_SIZE;
  const circleFontSize = TIMELINE_CONFIG.MAX_FONT_SIZE;

  if (!sessionId) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <div className="dashboard-panel-stack">
          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <div>
                <h1 className="dashboard-section__title">
                  Sessione non trovata
                </h1>
                <p className="dashboard-section__description">
                  La sessione richiesta non esiste o non è disponibile.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/therapeutic-journey"
                    className="bg-primary-600 hover:bg-primary-700 inline-block rounded-md px-6 py-3 font-medium text-white transition-colors"
                  >
                    Torna alle sessioni
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </SharedLayout>
    );
  }

  if (therapySessionLoading || patientLoading || completedStepsLoading) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-text-secondary text-lg">
            Caricamento del percorso...
          </p>
        </div>
      </SharedLayout>
    );
  }

  if (therapySessionError || patientError || !therapySession) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <div className="dashboard-panel-stack">
          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <div>
                <h1 className="dashboard-section__title">
                  Percorso non disponibile
                </h1>
                <p className="dashboard-section__description">
                  Non abbiamo trovato una sessione terapeutica per questo
                  paziente. Avvia una nuova simulazione dalla pagina del
                  paziente per iniziare il percorso.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/therapeutic-journey"
                    className="bg-primary-600 hover:bg-primary-700 inline-block rounded-md px-6 py-3 font-medium text-white transition-colors"
                  >
                    Torna alle sessioni
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      user={user}
      impersonation={impersonation}
      layoutType="dashboard"
      currentPage="/therapeutic-journey"
    >
      <div className="dashboard-panel-stack">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <div className="flex items-center justify-between">
                <h1 className="dashboard-section__title">
                  {selectedPatient
                    ? `Il tuo percorso con ${selectedPatient.name}`
                    : "Il tuo percorso terapeutico"}
                </h1>
                <Link
                  href="/dashboard/therapeutic-journey"
                  className="bg-background-tertiary hover:bg-background-secondary text-text-primary rounded-md px-4 py-2 text-sm font-medium transition-colors"
                >
                  ← Torna alle sessioni
                </Link>
              </div>
              <p className="dashboard-section__description">
                Inizia il tuo percorso terapeutico passo dopo passo. Ogni tappa
                rappresenta una seduta con il tuo &quot;paziente virtuale&quot;.
                Procedi con calma: ogni sessione ti aiuterà a sviluppare nuove
                competenze, riflettere su ciò che hai appreso e sentirti sempre
                più sicura nel tuo ruolo. Proprio come in un viaggio, ogni punto
                è un piccolo traguardo. Sei pronto? Iniziamo!
              </p>
              {therapySession && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-text-secondary text-sm">
                    Sessione corrente:{" "}
                    <span className="text-text-primary font-semibold">
                      {therapySession.sessionNumber}/11
                    </span>
                  </div>
                  {therapySession.sessionNumber < 11 && (
                    <button
                      onClick={() => {
                        if (!sessionId) return;
                        void advanceSession.mutate({ patientId: sessionId });
                      }}
                      disabled={advanceSession.isPending}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
                    >
                      {advanceSession.isPending
                        ? "Avanzamento..."
                        : "Avanza alla prossima sessione"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:block">
            <div
              ref={timelineContainerRef}
              className="relative mx-auto w-full"
              style={{ maxWidth: `${TIMELINE_CONFIG.BASE_WIDTH}px` }}
            >
              <div
                className="relative w-full"
                style={{
                  paddingTop: `${(TIMELINE_CONFIG.BASE_HEIGHT / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
                }}
              >
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 960 1450"
                  fill="none"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient
                      id="timelineGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                      gradientUnits="objectBoundingBox"
                    >
                      <stop offset="0%" stopColor="#2D3231" />
                      <stop offset="40%" stopColor="#343937" />
                      <stop offset="100%" stopColor="#262C2B" />
                    </linearGradient>
                    <filter
                      id="timelineGlow"
                      x="-40%"
                      y="-40%"
                      width="180%"
                      height="180%"
                    >
                      <feGaussianBlur stdDeviation="18" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d={timelinePathD}
                    stroke="#1f2423"
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div className="absolute inset-0 z-10">
                  {stepPositions.map((step) => (
                    <TimelineStep
                      key={step.id}
                      step={step}
                      circleSize={circleSize}
                      circleFontSize={circleFontSize}
                      onStepClick={handleStepClick}
                      isUnlocked={isStepUnlocked(step.id)}
                      isCurrent={false}
                      isCompleted={isStepCompleted(step.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 md:hidden">
            <div className="relative pl-8">
              <span className="pointer-events-none absolute top-0 left-3 h-full w-px bg-[#1f2423]" />
              <div className="space-y-5">
                {timelineSteps.map((step) => {
                  const details = getStepDetails(step.id);

                  return (
                    <MobileTimelineStep
                      key={`mobile-step-${step.id}`}
                      step={step}
                      details={details}
                      isOpen={false}
                      onStepClick={handleStepClick}
                      onClose={() => {}}
                      isUnlocked={isStepUnlocked(step.id)}
                      isCurrent={false}
                      isCompleted={isStepCompleted(step.id)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </SharedLayout>
  );
}
