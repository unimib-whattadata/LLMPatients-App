"use client";

import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

import { Breadcrumb } from "~/components/ui";
import { Button } from "~/components/ui/button";
import { KnowledgePhaseCard } from "~/app/(app)/dashboard/therapeutic-journey/_components/KnowledgePhaseCard";
import { InterventionPhaseCard } from "~/app/(app)/dashboard/therapeutic-journey/_components/InterventionPhaseCard";
import { ConclusionPhaseCard } from "~/app/(app)/dashboard/therapeutic-journey/_components/ConclusionPhaseCard";
import {
  getDifficultyAccessibleText,
  getDifficultyIconClass,
  getDifficultyIcon,
  type DifficultyLevel,
} from "~/lib/constants/difficulty";

import {
  TIMELINE_CONFIG,
  TIMELINE_STEPS,
  getStepDetails,
} from "./timelineConfig";
import { MobileTimelineStep, TimelineStep } from "./SessionTimelineSteps";
import type { PatientData, TherapySessionData } from "./session-timeline-types";

export function SessionTimelineErrorState({
  breadcrumbs,
  title,
  description,
  children,
}: {
  breadcrumbs: Array<{ label: string; href?: string; isActive?: boolean }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="dashboard-panel-stack">
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <Breadcrumb items={breadcrumbs} />

            <h1 className="dashboard-section__title">{title}</h1>
            <p className="dashboard-section__description">{description}</p>
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}

interface SessionTimelineHeroProps {
  patient: PatientData | undefined;
  therapySession: TherapySessionData | undefined;
  lastStepId: number;
  isAdvancing: boolean;
  onAdvanceSession: () => void;
}

export function SessionTimelineHero({
  patient,
  therapySession,
  lastStepId,
  isAdvancing,
  onAdvanceSession,
}: SessionTimelineHeroProps) {
  return (
    <div className="dashboard-section__header">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb
              items={[
                { label: "Dashboard", href: "/dashboard" },
                {
                  label: "Therapeutic Journey",
                  href: "/dashboard/therapeutic-journey",
                },
                {
                  label: patient ? patient.name : "Session",
                  isActive: true,
                },
              ]}
            />

            <h1 className="dashboard-section__title">
              {patient
                ? `Your journey with ${patient.name}`
                : "Your therapeutic journey"}
            </h1>
          </div>
        </div>
        <p className="dashboard-section__description">
          Start your therapeutic journey step by step. Each milestone represents a
          session with your &quot;virtual patient&quot;. Take your time: each
          session helps you build new skills, reflect on what you learned, and
          feel increasingly confident in your role. Just like a journey, each
          point is a small goal. Ready? Let&apos;s begin!
        </p>
        {patient && (
          <div className="mt-4 max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Difficulty:</span>
              <div className="patient-card-difficulty">
                <span
                  className={getDifficultyIconClass(
                    patient.difficulty as DifficultyLevel,
                  )}
                  aria-label={getDifficultyAccessibleText(
                    patient.difficulty as DifficultyLevel,
                  )}
                  role="img"
                >
                  {getDifficultyIcon(patient.difficulty as DifficultyLevel)}
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
                  {patient.estimatedDuration} min
                </span>
              </div>
            </div>
          </div>
        )}
        {therapySession && (
          <div className="mt-4 flex items-center gap-4">
            <div className="text-text-secondary text-sm">
              Current session:{" "}
              <span className="text-text-primary font-semibold">
                {therapySession.sessionNumber}/{lastStepId}
              </span>
            </div>
            {therapySession.sessionNumber < lastStepId && (
              <Button
                onClick={onAdvanceSession}
                isLoading={isAdvancing}
                disabled={isAdvancing}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white"
              >
                Advance to next session
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SessionTimelineDesktopProps {
  timelinePathD: string;
  stepPositions: Array<{
    id: number;
    color: string;
    top: number;
    left: number;
    scaledTop: number;
    scaledLeft: number;
  }>;
  circleSize: number;
  circleFontSize: number;
  onStepClick: (stepId: number) => void;
  isStepUnlocked: (stepId: number) => boolean;
  isStepCompleted: (stepId: number) => boolean;
}

export function SessionTimelineDesktop({
  timelinePathD,
  stepPositions,
  circleSize,
  circleFontSize,
  onStepClick,
  isStepUnlocked,
  isStepCompleted,
}: SessionTimelineDesktopProps) {
  return (
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
              style={{ top: "8%", left: "60%" }}
            />
            <InterventionPhaseCard
              className="absolute w-[32%]"
              style={{ top: "38%", left: "1%" }}
            />
            <ConclusionPhaseCard
              className="absolute w-[32%]"
              style={{ top: "86%", left: "60%" }}
            />
            {stepPositions.map((step) => (
              <TimelineStep
                key={step.id}
                step={step}
                circleSize={circleSize}
                circleFontSize={circleFontSize}
                onStepClick={onStepClick}
                isUnlocked={isStepUnlocked(step.id)}
                isCurrent={false}
                isCompleted={isStepCompleted(step.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SessionTimelineMobile({
  onStepClick,
  isStepUnlocked,
  isStepCompleted,
}: {
  onStepClick: (stepId: number) => void;
  isStepUnlocked: (stepId: number) => boolean;
  isStepCompleted: (stepId: number) => boolean;
}) {
  return (
    <div className="mt-10 md:hidden">
      <div className="relative pl-8">
        <span
          className="stroke-timeline-path pointer-events-none absolute left-3 top-0 h-full w-px"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        />
        <div className="space-y-5">
          <KnowledgePhaseCard className="my-6 w-full" />
          {TIMELINE_STEPS.map((step, index) => {
            const details = getStepDetails(step.id);

            return (
              <React.Fragment key={`mobile-step-fragment-${step.id}`}>
                <MobileTimelineStep
                  step={step}
                  details={details}
                  isOpen={false}
                  onStepClick={onStepClick}
                  isUnlocked={isStepUnlocked(step.id)}
                  isCurrent={false}
                  isCompleted={isStepCompleted(step.id)}
                />
                {index === 1 && <InterventionPhaseCard className="my-6 w-full" />}
                {index === TIMELINE_STEPS.length - 1 && (
                  <ConclusionPhaseCard className="my-6 w-full" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TimelineBackLink() {
  return (
    <div className="mt-6">
      <Link
        href="/dashboard/therapeutic-journey"
        className="bg-primary-600 hover:bg-primary-700 inline-block rounded-md px-6 py-3 font-medium text-white transition-colors"
      >
        Back to Therapeutic Journey
      </Link>
    </div>
  );
}
