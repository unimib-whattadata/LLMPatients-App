"use client";

import { SharedLayout } from "~/components/layout/SharedLayout";
import { useCallback, useMemo, memo, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SessionLoading } from "~/components/common";
import { Breadcrumb } from "~/components/ui";

import {
  TIMELINE_CONFIG,
  TIMELINE_STEPS,
  getStepDetails,
  buildRoundedOrthogonalPath,
  type StepDetails,
  type TimelineStep as TimelineStepDefinition,
} from "./timelineConfig";

import type { User, ImpersonationContext } from "~/types";
import { api } from "~/trpc/react";
import { createPatientSlug } from "~/lib/utils/slugify";

// API Response Types
type PatientData = {
  id: string;
  name: string;
  smallDescription: string;
  details: string;
  background: string;
  objectives: string[];
  avatarUrl: string | null;
  avatarType: string;
  difficulty: number;
  estimatedDuration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TherapySessionData = {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CompletedStepData = {
  id: string;
  therapySessionId: string;
  stepNumber: number;
  messages: {
    id: string;
    content: string;
    sender: "user" | "patient";
    timestamp: Date | string;
    stepId: number;
  }[];
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const STEP_IDS = TIMELINE_STEPS.map((step) => step.id);
const FIRST_STEP_ID = STEP_IDS[0] ?? 1;
const LAST_STEP_ID = STEP_IDS[STEP_IDS.length - 1] ?? FIRST_STEP_ID;

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
    step: TimelineStepDefinition & { scaledTop: number; scaledLeft: number };
    circleSize: number;
    circleFontSize: number;
    onStepClick: (stepId: number) => void;
    isUnlocked: boolean;
    isCurrent: boolean;
    isCompleted: boolean;
  }) => {
    return (
      <div
        key={step.id}
        data-step-id={step.id}
        data-step-color={step.color}
        style={{
          top: `${(step.scaledTop / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
          left: `${(step.scaledLeft / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
          width: `${(circleSize / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
          height: `${(circleSize / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
          fontSize: `${circleFontSize}px`,
          color: "white",
        }}
        className={`timeline-step-positioned timeline-desktop-step ${
          !isUnlocked ? "timeline-step-positioned--locked" : ""
        } ${isCurrent ? "timeline-step-positioned--current" : ""} ${isCompleted ? "timeline-step-positioned--completed" : ""}`}
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
        {isCompleted ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          step.id
        )}
      </div>
    );
  },
);
TimelineStep.displayName = "TimelineStep";

// Mobile timeline step component
const MobileTimelineStep = memo(
  ({
    step,
    details,
    isOpen,
    onStepClick,
    isUnlocked,
    isCurrent,
    isCompleted,
  }: {
    step: TimelineStepDefinition;
    details: StepDetails;
    isOpen: boolean;
    onStepClick: (stepId: number) => void;
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
          data-step-id={step.id}
          data-step-color={step.color}
          className="timeline-mobile-step flex h-3 w-3 items-center justify-center rounded-full text-xs font-bold"
          style={{ color: "white" }}
        >
          {isCompleted ? (
            <Check className="h-2 w-2" aria-hidden="true" />
          ) : null}
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
        className={`w-full rounded-2xl border border-white/5 p-4 text-left transition-colors duration-200 focus:outline-none ${
          isUnlocked ? "" : "cursor-not-allowed opacity-40"
        } ${isCurrent ? "ring-2 ring-white/70" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-white/70 uppercase">
              Sessione {step.id}
              {isCompleted ? (
                <Check className="ml-1 inline h-3 w-3 align-text-top" aria-hidden="true" />
              ) : null}
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Type assertions for API responses
  const typedTherapySession = therapySession as TherapySessionData | undefined;
  const typedCompletedSteps = completedSteps as CompletedStepData[] | undefined;
  const typedSelectedPatient = selectedPatient as PatientData | undefined;

  const utils = api.useUtils();

  const advanceSession = api.therapySessions.advanceSession.useMutation({
    onSuccess: async (updatedSession) => {
      if (!sessionId || !updatedSession) return;

      await Promise.allSettled([
        utils.therapySessions.getByPatient.invalidate({ patientId: sessionId }),
        utils.chat.getSessionChats.invalidate({
          therapySessionId: updatedSession.id,
        }),
      ]);

      const targetStep = Math.min(updatedSession.sessionNumber, LAST_STEP_ID);

      if (typedSelectedPatient) {
        const patientSlug = createPatientSlug(typedSelectedPatient.name);
        router.push(
          `/dashboard/therapeutic-journey/${sessionId}/${patientSlug}/chat/${targetStep}`,
        );
        return;
      }

      router.push(`/dashboard/therapeutic-journey`);
    },
    onError: (error) => {
      console.error("Error advancing session:", error);
    },
  });

  // Calculate which steps are unlocked based on completed steps
  const unlockedSteps = useMemo(() => {
    if (!typedCompletedSteps) return [FIRST_STEP_ID];

    const completedStepNumbers = typedCompletedSteps
      .filter((step) => step.done)
      .map((step) => step.stepNumber)
      .sort((a, b) => a - b);

    const unlocked = [FIRST_STEP_ID];

    // Add next step after each completed step
    completedStepNumbers.forEach((completedStep) => {
      const nextStep = completedStep + 1;
      if (nextStep <= LAST_STEP_ID && !unlocked.includes(nextStep)) {
        unlocked.push(nextStep);
      }
    });

    return unlocked.sort((a, b) => a - b);
  }, [typedCompletedSteps]);

  const isStepUnlocked = useCallback(
    (stepId: number) => {
      return unlockedSteps.includes(stepId);
    },
    [unlockedSteps],
  );

  const isStepCompleted = useCallback(
    (stepId: number) => {
      if (!typedCompletedSteps) return false;
      return typedCompletedSteps.some(
        (step) => step.stepNumber === stepId && step.done,
      );
    },
    [typedCompletedSteps],
  );

  // Event handlers - must be before early return to maintain hook order
  const handleStepClick = useCallback(
    (stepId: number) => {
      if (!isStepUnlocked(stepId)) return;

      // Navigate to chat page for the selected step with patient name
      if (typedSelectedPatient) {
        const patientSlug = createPatientSlug(typedSelectedPatient.name);
        router.push(
          `/dashboard/therapeutic-journey/${sessionId}/${patientSlug}/chat/${stepId}`,
        );
      } else {
        // Fallback without patient name - this should not happen in normal flow
        router.push(`/dashboard/therapeutic-journey`);
      }
    },
    [isStepUnlocked, router, sessionId, typedSelectedPatient],
  );

  // Computed values - must be before early return to maintain hook order

  // Use original positions and sizes - CSS will handle scaling
  const stepPositions = useMemo(() => {
    const steps = TIMELINE_STEPS.map((step) => ({
      ...step,
      scaledTop: step.top,
      scaledLeft: step.left + TIMELINE_CONFIG.NODE_OFFSET_X,
    }));
    return steps;
  }, []);

  const circleSize = TIMELINE_CONFIG.MAX_CIRCLE_SIZE;
  const circleFontSize = TIMELINE_CONFIG.MAX_FONT_SIZE;

  // Compute timeline path on client side to avoid hydration issues
  const timelinePathD = useMemo(() => {
    if (!isMounted) return "";

    const timelinePathPoints = [
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
    return buildRoundedOrthogonalPath(
      timelinePathPoints,
      TIMELINE_CONFIG.PATH_RADIUS,
    );
  }, [isMounted]);

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
                <Breadcrumb
                  items={[
                    { label: "Dashboard", href: "/dashboard" },
                    {
                      label: "Percorso Terapeutico",
                      href: "/dashboard/therapeutic-journey",
                    },
                    { label: "Sessione non trovata", isActive: true },
                  ]}
                />

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
                    Torna al Percorso Terapeutico
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
        <SessionLoading />
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
                <Breadcrumb
                  items={[
                    { label: "Dashboard", href: "/dashboard" },
                    {
                      label: "Percorso Terapeutico",
                      href: "/dashboard/therapeutic-journey",
                    },
                    { label: "Percorso non disponibile", isActive: true },
                  ]}
                />

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
                    Torna al Percorso Terapeutico
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
                <div>
                  {/* Breadcrumb Navigation */}
                  <Breadcrumb
                    items={[
                      { label: "Dashboard", href: "/dashboard" },
                      {
                        label: "Percorso Terapeutico",
                        href: "/dashboard/therapeutic-journey",
                      },
                      {
                        label: typedSelectedPatient
                          ? typedSelectedPatient.name
                          : "Sessione",
                        isActive: true,
                      },
                    ]}
                  />

                  <h1 className="dashboard-section__title">
                    {typedSelectedPatient
                      ? `Il tuo percorso con ${typedSelectedPatient.name}`
                      : "Il tuo percorso terapeutico"}
                  </h1>
                </div>
              </div>
              <p className="dashboard-section__description">
                Inizia il tuo percorso terapeutico passo dopo passo. Ogni tappa
                rappresenta una seduta con il tuo &quot;paziente virtuale&quot;.
                Procedi con calma: ogni sessione ti aiuterà a sviluppare nuove
                competenze, riflettere su ciò che hai appreso e sentirti sempre
                più sicura nel tuo ruolo. Proprio come in un viaggio, ogni punto
                è un piccolo traguardo. Sei pronto? Iniziamo!
              </p>
              {typedTherapySession && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-text-secondary text-sm">
                    Sessione corrente:{" "}
                    <span className="text-text-primary font-semibold">
                      {typedTherapySession.sessionNumber}/{LAST_STEP_ID}
                    </span>
                  </div>
                  {typedTherapySession.sessionNumber < LAST_STEP_ID && (
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
                      <stop offset="0%" stopColor="" />
                      <stop offset="40%" stopColor="" />
                      <stop offset="100%" stopColor="" />
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
                    d={timelinePathD || "M 520 100 L 520 1460"}
                    stroke="#3d413b"
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
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
              <span className="stroke-timeline-path pointer-events-none absolute top-0 left-3 h-full w-px" />
              <div className="space-y-5">
                {TIMELINE_STEPS.map((step) => {
                  const details = getStepDetails(step.id);

                  return (
                    <MobileTimelineStep
                      key={`mobile-step-${step.id}`}
                      step={step}
                      details={details}
                      isOpen={false}
                      onStepClick={handleStepClick}
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
