"use client";

import { SharedLayout } from "~/components/layout/SharedLayout";
import React, { useCallback, useMemo, memo, useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SessionLoading } from "~/components/common";
import { Breadcrumb } from "~/components/ui";
import { Button } from "~/components/ui/button";

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
import { KnowledgePhaseCard } from "~/app/(app)/dashboard/therapeutic-journey/_components/KnowledgePhaseCard";
import { InterventionPhaseCard } from "~/app/(app)/dashboard/therapeutic-journey/_components/InterventionPhaseCard";
import { ConclusionPhaseCard } from "~/app/(app)/dashboard/therapeutic-journey/_components/ConclusionPhaseCard";
import {
  getDifficultyAccessibleText,
  getDifficultyIconClass,
  getDifficultyIcon,
  type DifficultyLevel,
} from "~/lib/constants/difficulty";


type PatientData = {
  id: string;
  name: string;
  smallDescription: string;
  details: string;
  background: string;
  objectives: string[];
  avatarUrl: string | null;
  difficulty: number;
  estimatedDuration: number;
  isActive: boolean;
  externalPatientId?: string | null;
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
          position: "absolute",
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          fontWeight: 600,
          cursor: isUnlocked ? "pointer" : "not-allowed",
          opacity: isUnlocked ? 1 : 0.35,
          filter: isUnlocked ? "none" : "grayscale(60%)",
          backgroundColor: step.color,
          top: `${(step.scaledTop / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
          left: `${(step.scaledLeft / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
          width: `${(circleSize / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
          height: `${(circleSize / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
          fontSize: `${circleFontSize}px`,
          color: "var(--color-text-inverse)",
        }}
        className={`timeline-step-positioned timeline-desktop-step ${!isUnlocked ? "timeline-step-positioned--locked" : ""
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
        aria-label={`Open session ${step.id}${isUnlocked ? "" : " not available"}${isCompleted ? " - Completed" : ""}`}
      >
        {step.id}
      </div>
    );
  },
);
TimelineStep.displayName = "TimelineStep";


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
          style={{ color: "var(--color-text-inverse)", backgroundColor: step.color }}
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
        className={`w-full rounded-2xl border border-white/5 p-4 text-left transition-colors duration-200 focus:outline-none ${isUnlocked ? "" : "cursor-not-allowed opacity-40"
          } ${isCurrent ? "ring-2 ring-white/70" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-muted-foreground uppercase">
              Session {step.id}
              {isCompleted ? (
                <Check className="ml-1 inline h-3 w-3 align-text-top" aria-hidden="true" />
              ) : null}
            </p>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              {details.phaseTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isCompleted
                ? "Session completed"
                : "Click to open session"}
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
  });


  const unlockedSteps = useMemo(() => {
    if (!typedCompletedSteps) return [FIRST_STEP_ID];

    const completedStepNumbers = typedCompletedSteps
      .filter((step) => step.done)
      .map((step) => step.stepNumber)
      .sort((a, b) => a - b);

    const unlocked = [FIRST_STEP_ID];


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


  const handleStepClick = useCallback(
    (stepId: number) => {
      if (!isStepUnlocked(stepId)) return;


      if (typedSelectedPatient) {
        const patientSlug = createPatientSlug(typedSelectedPatient.name);
        router.push(
          `/dashboard/therapeutic-journey/${sessionId}/${patientSlug}/chat/${stepId}`,
        );
      } else {

        router.push(`/dashboard/therapeutic-journey`);
      }
    },
    [isStepUnlocked, router, sessionId, typedSelectedPatient],
  );




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
                      label: "Therapeutic Journey",
                      href: "/dashboard/therapeutic-journey",
                    },
                    { label: "Session not found", isActive: true },
                  ]}
                />

                <h1 className="dashboard-section__title">
                  Session not found
                </h1>
                <p className="dashboard-section__description">
                  The requested session does not exist or is not available.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/therapeutic-journey"
                    className="bg-primary-600 hover:bg-primary-700 inline-block rounded-md px-6 py-3 font-medium text-white transition-colors"
                  >
                    Back to Therapeutic Journey
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
                      label: "Therapeutic Journey",
                      href: "/dashboard/therapeutic-journey",
                    },
                    { label: "Journey unavailable", isActive: true },
                  ]}
                />

                <h1 className="dashboard-section__title">
                  Journey unavailable
                </h1>
                <p className="dashboard-section__description">
                  We did not find a therapeutic session for this patient.
                  Start a new simulation from the patient page to begin
                  the journey.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/therapeutic-journey"
                    className="bg-primary-600 hover:bg-primary-700 inline-block rounded-md px-6 py-3 font-medium text-white transition-colors"
                  >
                    Back to Therapeutic Journey
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </SharedLayout>
    );
  }

  // Check whether the patient has been initialized in the external API
  if (typedSelectedPatient && !typedSelectedPatient.externalPatientId) {
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
                      label: "Therapeutic Journey",
                      href: "/dashboard/therapeutic-journey",
                    },
                    {
                      label: typedSelectedPatient.name,
                      isActive: true,
                    },
                  ]}
                />

                <h1 className="dashboard-section__title">
                  Therapeutic Journey unavailable
                </h1>
                <p className="dashboard-section__description">
                  The patient was not initialized correctly in the external system.
                  Initialization is required to start the therapeutic journey.
                </p>
                <div className="mt-6">
                  <article className="dashboard-action-card">
                    <div className="dashboard-action-card-content">
                      <div className="dashboard-action-card-main">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <svg
                              className="h-5 w-5 text-red-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="dashboard-action-card__title mb-1.5 text-red-400 text-base">
                              Initialization error
                            </h3>
                            <p className="dashboard-action-card__description text-sm leading-snug">
                              An error occurred while calling the external API for patient initialization.
                              The therapeutic journey cannot start until this issue is resolved.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <Button
                            onClick={() => {
                              if (typedSelectedPatient) {
                                const patientSlug = createPatientSlug(typedSelectedPatient.name);
                                router.push(
                                  `/explore-patients/${typedSelectedPatient.id}/${patientSlug}`
                                );
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Back to patient page
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Link href="/dashboard/therapeutic-journey">
                              Back to Therapeutic Journey
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
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
      currentPage="/dashboard/therapeutic-journey"
    >
      <div className="dashboard-panel-stack">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  { }
                  <Breadcrumb
                    items={[
                      { label: "Dashboard", href: "/dashboard" },
                      {
                        label: "Therapeutic Journey",
                        href: "/dashboard/therapeutic-journey",
                      },
                      {
                        label: typedSelectedPatient
                          ? typedSelectedPatient.name
                          : "Session",
                        isActive: true,
                      },
                    ]}
                  />

                  <h1 className="dashboard-section__title">
                    {typedSelectedPatient
                      ? `Your journey with ${typedSelectedPatient.name}`
                      : "Your therapeutic journey"}
                  </h1>
                </div>
              </div>
              <p className="dashboard-section__description">
                Start your therapeutic journey step by step. Each milestone
                represents a session with your &quot;virtual patient&quot;.
                Take your time: each session helps you build new skills,
                reflect on what you learned, and feel increasingly confident
                in your role. Just like a journey, each point is a small goal.
                Ready? Let&apos;s begin!
              </p>
              {typedSelectedPatient && (
                <div className="mt-4 max-w-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">
                      Difficulty:
                    </span>
                    <div className="patient-card-difficulty">
                      <span
                        className={getDifficultyIconClass(
                          typedSelectedPatient.difficulty as DifficultyLevel,
                        )}
                        aria-label={getDifficultyAccessibleText(
                          typedSelectedPatient.difficulty as DifficultyLevel,
                        )}
                        role="img"
                      >
                        {getDifficultyIcon(
                          typedSelectedPatient.difficulty as DifficultyLevel,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">
                      Estimated duration:
                    </span>
                    <div className="flex items-center space-x-1 text-sm text-primary-yellow">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      <span className="text-text-tertiary text-sm">
                        {typedSelectedPatient.estimatedDuration} min
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {typedTherapySession && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-text-secondary text-sm">
                    Current session:{" "}
                    <span className="text-text-primary font-semibold">
                      {typedTherapySession.sessionNumber}/{LAST_STEP_ID}
                    </span>
                  </div>
                  {typedTherapySession.sessionNumber < LAST_STEP_ID && (
                    <Button
                      onClick={() => {
                        if (!sessionId) return;
                        void advanceSession.mutate({ patientId: sessionId });
                      }}
                      isLoading={advanceSession.isPending}
                      disabled={advanceSession.isPending}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white"
                    >
                      Advance to next session
                    </Button>
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
                    stroke="var(--color-surface-secondary)"
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>

                <div className="absolute inset-0 z-10">
                  <KnowledgePhaseCard
                    className="absolute w-[32%]"
                    style={{
                      top: '8%',
                      left: '60%'
                    }}
                  />
                  <InterventionPhaseCard
                    className="absolute w-[32%]"
                    style={{
                      top: '38%',
                      left: '1%'
                    }}
                  />
                  <ConclusionPhaseCard
                    className="absolute w-[32%]"
                    style={{
                      top: '86%',
                      left: '60%'
                    }}
                  />
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
              <span
                className="stroke-timeline-path pointer-events-none absolute top-0 left-3 h-full w-px"
                style={{ backgroundColor: "var(--color-surface-secondary)" }}
              />
              <div className="space-y-5">
                <KnowledgePhaseCard className="w-full my-6" />
                {TIMELINE_STEPS.map((step, index) => {
                  const details = getStepDetails(step.id);

                  return (
                    <React.Fragment key={`mobile-step-fragment-${step.id}`}>
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
                      {index === 1 && (
                        <InterventionPhaseCard className="w-full my-6" />
                      )}
                      {index === TIMELINE_STEPS.length - 1 && (
                        <ConclusionPhaseCard className="w-full my-6" />
                      )}
                    </React.Fragment>
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
