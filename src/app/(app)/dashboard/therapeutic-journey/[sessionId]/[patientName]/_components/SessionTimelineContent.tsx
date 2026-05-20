"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { SessionLoading } from "~/components/common/SessionLoading";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import type { ImpersonationContext, User } from "~/types";
import { normalizeParam } from "~/lib/utils";
import { createPatientSlug } from "~/lib/utils/slugify";

import {
  buildRoundedOrthogonalPath,
  TIMELINE_CONFIG,
  TIMELINE_STEPS,
} from "./timelineConfig";
import {
  SessionTimelineDesktop,
  SessionTimelineErrorState,
  SessionTimelineHero,
  SessionTimelineMobile,
  TimelineBackLink,
} from "./SessionTimelineSections";
import type {
  CompletedStepData,
  PatientData,
  TherapySessionData,
} from "./session-timeline-types";

const STEP_IDS = TIMELINE_STEPS.map((step) => step.id);
const FIRST_STEP_ID = STEP_IDS[0] ?? 1;
const LAST_STEP_ID = STEP_IDS[STEP_IDS.length - 1] ?? FIRST_STEP_ID;

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
  const therapySessionId = normalizeParam(params.sessionId);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: therapySession,
    isLoading: therapySessionLoading,
    error: therapySessionError,
  } = api.therapySessions.getById.useQuery(
    { therapySessionId: therapySessionId ?? "" },
    { enabled: Boolean(therapySessionId) },
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
    { id: therapySession?.patientId ?? "" },
    { enabled: Boolean(therapySession?.patientId) },
  );

  const typedTherapySession = therapySession as TherapySessionData | undefined;
  const typedCompletedSteps = completedSteps as CompletedStepData[] | undefined;
  const typedSelectedPatient = selectedPatient as PatientData | undefined;

  const utils = api.useUtils();

  const advanceSession = api.therapySessions.advanceSession.useMutation({
    onSuccess: async (updatedSession) => {
      if (!therapySessionId || !updatedSession) return;

      await Promise.allSettled([
        utils.therapySessions.getById.invalidate({
          therapySessionId: updatedSession.id,
        }),
        utils.chat.getSessionChats.invalidate({
          therapySessionId: updatedSession.id,
        }),
      ]);

      const targetStep = Math.min(updatedSession.sessionNumber, LAST_STEP_ID);
      if (typedSelectedPatient) {
        const patientSlug = createPatientSlug(typedSelectedPatient.name);
        router.push(
          `/dashboard/therapeutic-journey/${updatedSession.id}/${patientSlug}/chat/${targetStep}`,
        );
        return;
      }

      router.push("/dashboard/therapeutic-journey");
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
    (stepId: number) => unlockedSteps.includes(stepId),
    [unlockedSteps],
  );

  const isStepCompleted = useCallback(
    (stepId: number) =>
      typedCompletedSteps?.some(
        (completedStep) => completedStep.stepNumber === stepId && completedStep.done,
      ) ?? false,
    [typedCompletedSteps],
  );

  const handleStepClick = useCallback(
    (stepId: number) => {
      if (!isStepUnlocked(stepId)) return;

      if (typedSelectedPatient) {
        const patientSlug = createPatientSlug(typedSelectedPatient.name);
        router.push(
          `/dashboard/therapeutic-journey/${therapySessionId}/${patientSlug}/chat/${stepId}`,
        );
        return;
      }

      router.push("/dashboard/therapeutic-journey");
    },
    [isStepUnlocked, router, therapySessionId, typedSelectedPatient],
  );

  const stepPositions = useMemo(
    () =>
      TIMELINE_STEPS.map((step) => ({
        ...step,
        scaledTop: step.top,
        scaledLeft: step.left + TIMELINE_CONFIG.NODE_OFFSET_X,
      })),
    [],
  );

  const timelinePathD = useMemo(() => {
    if (!isMounted) return "";

    return buildRoundedOrthogonalPath(
      [
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
      ],
      TIMELINE_CONFIG.PATH_RADIUS,
    );
  }, [isMounted]);

  if (!therapySessionId) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <SessionTimelineErrorState
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            {
              label: "Therapeutic Journey",
              href: "/dashboard/therapeutic-journey",
            },
            { label: "Session not found", isActive: true },
          ]}
          title="Session not found"
          description="The requested session does not exist or is not available."
        >
          <TimelineBackLink />
        </SessionTimelineErrorState>
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
        <SessionTimelineErrorState
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            {
              label: "Therapeutic Journey",
              href: "/dashboard/therapeutic-journey",
            },
            { label: "Journey unavailable", isActive: true },
          ]}
          title="Journey unavailable"
          description="We did not find a therapeutic session for this patient. Start a new simulation from the patient page to begin the journey."
        >
          <TimelineBackLink />
        </SessionTimelineErrorState>
      </SharedLayout>
    );
  }

  if (typedTherapySession && !typedTherapySession.externalPatientId) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <SessionTimelineErrorState
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            {
              label: "Therapeutic Journey",
              href: "/dashboard/therapeutic-journey",
            },
            {
              label: typedSelectedPatient?.name ?? "Session",
              isActive: true,
            },
          ]}
          title="Therapeutic Journey unavailable"
          description="The patient was not initialized correctly in the external system. Initialization is required to start the therapeutic journey."
        >
          <div className="mt-6">
            <article className="dashboard-action-card">
              <div className="dashboard-action-card-content">
                <div className="dashboard-action-card-main">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
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
                      <h3 className="mb-1.5 text-base text-red-400 dashboard-action-card__title">
                        Initialization error
                      </h3>
                      <p className="dashboard-action-card__description text-sm leading-snug">
                        An error occurred while calling the external API for
                        patient initialization. The therapeutic journey cannot
                        start until this issue is resolved.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={() => {
                        if (!typedSelectedPatient) return;
                        const patientSlug = createPatientSlug(typedSelectedPatient.name);
                        router.push(
                          `/explore-patients/${typedSelectedPatient.id}/${patientSlug}`,
                        );
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Back to patient page
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href="/dashboard/therapeutic-journey">
                        Back to Therapeutic Journey
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </SessionTimelineErrorState>
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
          <SessionTimelineHero
            patient={typedSelectedPatient}
            therapySession={typedTherapySession}
            lastStepId={LAST_STEP_ID}
            isAdvancing={advanceSession.isPending}
            onAdvanceSession={() => {
              if (!therapySessionId) return;
              void advanceSession.mutate({ therapySessionId });
            }}
          />

          <SessionTimelineDesktop
            timelinePathD={timelinePathD}
            stepPositions={stepPositions}
            circleSize={TIMELINE_CONFIG.MAX_CIRCLE_SIZE}
            circleFontSize={TIMELINE_CONFIG.MAX_FONT_SIZE}
            onStepClick={handleStepClick}
            isStepUnlocked={isStepUnlocked}
            isStepCompleted={isStepCompleted}
          />

          <SessionTimelineMobile
            onStepClick={handleStepClick}
            isStepUnlocked={isStepUnlocked}
            isStepCompleted={isStepCompleted}
          />
        </section>
      </div>
    </SharedLayout>
  );
}
