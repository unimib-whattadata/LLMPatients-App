"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import {
  type StepMisstepEvaluationResult,
  type StepMisstepEvaluationStatus,
} from "~/lib/missteps";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { SessionLoading } from "~/components/common";
import { Breadcrumb, Badge } from "~/components/ui";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { DashboardPanel } from "~/components/dashboard/ui";
import { api } from "~/trpc/react";
import type { ImpersonationContext, User } from "~/types";

type TherapySessionData = {
  id: string;
  patientId: string;
};

type PatientData = {
  id: string;
  name: string;
};

type ChatStepData = {
  done: boolean;
};

type StepEvaluationData = {
  id: string;
  status: StepMisstepEvaluationStatus;
  analysisMode: "hybrid" | "heuristic";
  modelName: string | null;
  detectorVersion: string;
  errorMessage: string | null;
  analyzedAt: Date | string | null;
  result: StepMisstepEvaluationResult | null;
};

interface StepMisstepReportContentProps {
  user: User;
  impersonation?: ImpersonationContext | undefined;
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getSeverityVariant(severity: number) {
  if (severity >= 3) return "destructive";
  if (severity === 2) return "warning";
  return "secondary";
}

function formatAnalysisMode(value: "hybrid" | "heuristic") {
  return value === "hybrid" ? "Hybrid" : "Heuristic";
}

export function StepMisstepReportContent({
  user,
  impersonation,
}: StepMisstepReportContentProps) {
  const params = useParams();
  const router = useRouter();
  const utils = api.useUtils();

  const therapySessionId = params.sessionId as string;
  const patientSlug = params.patientName as string;
  const stepId = Number.parseInt(params.stepId as string, 10);

  const [autoQueued, setAutoQueued] = useState(false);

  const { data: therapySession, isLoading: therapySessionLoading } =
    api.therapySessions.getById.useQuery(
      { therapySessionId },
      { enabled: Boolean(therapySessionId) },
    );

  const typedTherapySession = therapySession as TherapySessionData | undefined;

  const {
    data: patient,
    isLoading: patientLoading,
  } = api.patients.getPatientById.useQuery(
    { id: typedTherapySession?.patientId ?? "" },
    { enabled: Boolean(typedTherapySession?.patientId) },
  );

  const { data: chatStep, isLoading: chatStepLoading } =
    api.chat.getChatStep.useQuery(
      {
        therapySessionId,
        stepNumber: stepId,
      },
      { enabled: Boolean(therapySessionId && stepId) },
    );

  const typedPatient = patient as PatientData | undefined;
  const typedChatStep = chatStep as ChatStepData | undefined;
  const isStepCompleted = typedChatStep?.done === true;

  const retryMutation = api.stepEvaluations.retryByStep.useMutation({
    onSuccess: async () => {
      await utils.stepEvaluations.getByStep.invalidate({
        therapySessionId,
        stepNumber: stepId,
      });
    },
  });

  const { data: evaluation, isLoading: evaluationLoading } =
    api.stepEvaluations.getByStep.useQuery(
      {
        therapySessionId,
        stepNumber: stepId,
      },
      {
        enabled: Boolean(therapySessionId && stepId && isStepCompleted),
        refetchInterval: (query) => {
          const data = query.state.data as StepEvaluationData | null | undefined;
          return data?.status === "processing" ? 2500 : false;
        },
      },
    );

  const typedEvaluation = evaluation as StepEvaluationData | null | undefined;

  useEffect(() => {
    if (!therapySessionId || !stepId || !isStepCompleted || autoQueued) {
      return;
    }

    if (typedEvaluation !== null) {
      return;
    }

    setAutoQueued(true);
    retryMutation.mutate({
      therapySessionId,
      stepNumber: stepId,
    });
  }, [
    autoQueued,
    isStepCompleted,
    retryMutation,
    stepId,
    therapySessionId,
    typedEvaluation,
  ]);

  const backToChatHref = useMemo(
    () =>
      `/dashboard/therapeutic-journey/${therapySessionId}/${patientSlug}/chat/${stepId}`,
    [patientSlug, stepId, therapySessionId],
  );

  const backToTimelineHref = useMemo(
    () => `/dashboard/therapeutic-journey/${therapySessionId}/${patientSlug}`,
    [patientSlug, therapySessionId],
  );

  const isLoading =
    therapySessionLoading ||
    patientLoading ||
    chatStepLoading ||
    (isStepCompleted && evaluationLoading);

  if (isLoading) {
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

  if (!typedTherapySession || !typedPatient) {
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
                    { label: "Unavailable", isActive: true },
                  ]}
                />
                <h1 className="dashboard-section__title">Report unavailable</h1>
                <p className="dashboard-section__description">
                  The requested step or patient could not be loaded.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/dashboard/therapeutic-journey">
                <ArrowLeft className="h-4 w-4" />
                Back to Therapeutic Journey
              </Link>
            </Button>
          </section>
        </div>
      </SharedLayout>
    );
  }

  if (!isStepCompleted) {
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
                    { label: typedPatient.name, href: backToTimelineHref },
                    { label: `Session ${stepId}`, href: backToChatHref },
                    { label: "Misstep analysis", isActive: true },
                  ]}
                />
                <h1 className="dashboard-section__title">
                  Step analysis not available yet
                </h1>
                <p className="dashboard-section__description">
                  This page is available only after the current chat step has been
                  marked as completed.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={backToChatHref}>
                <ArrowLeft className="h-4 w-4" />
                Back to Chat
              </Link>
            </Button>
          </section>
        </div>
      </SharedLayout>
    );
  }

  const isProcessing =
    retryMutation.isPending ||
    typedEvaluation?.status === "processing" ||
    (!typedEvaluation && autoQueued);

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
                  { label: typedPatient.name, href: backToTimelineHref },
                  { label: `Session ${stepId}`, href: backToChatHref },
                  { label: "Misstep analysis", isActive: true },
                ]}
              />
              <h1 className="dashboard-section__title">
                Misstep analysis for Session {stepId}
              </h1>
              <p className="dashboard-section__description">
                Review automatic therapist misstep detection for this completed
                step. The report is based on the step transcript and patient
                profile only.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href={backToChatHref}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Chat
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={backToTimelineHref}>Back to Timeline</Link>
              </Button>
            </div>
          </div>

          {isProcessing ? (
            <DashboardPanel className="p-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Analysis in progress
                  </h2>
                  <p className="mt-2 max-w-2xl text-muted-foreground">
                    The step has already been completed. We are generating the
                    misstep report and this page will refresh automatically.
                  </p>
                </div>
              </div>
            </DashboardPanel>
          ) : null}

          {typedEvaluation?.status === "failed" ? (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-400" />
                  <div>
                    <CardTitle>Analysis failed</CardTitle>
                    <CardDescription>
                      The step is completed, but the misstep report could not be
                      generated.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {typedEvaluation.errorMessage ??
                    "An unexpected error interrupted the analysis pipeline."}
                </p>
                <Button
                  onClick={() =>
                    retryMutation.mutate({
                      therapySessionId,
                      stepNumber: stepId,
                    })
                  }
                  disabled={retryMutation.isPending}
                >
                  {retryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Retry analysis
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {typedEvaluation?.status === "completed" && typedEvaluation.result ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Detected missteps</CardDescription>
                    <CardTitle className="text-3xl">
                      {typedEvaluation.result.summary.detectedCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>High severity</CardDescription>
                    <CardTitle className="text-3xl">
                      {typedEvaluation.result.summary.highSeverityDetectedCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Analysis mode</CardDescription>
                    <CardTitle className="text-2xl">
                      {formatAnalysisMode(typedEvaluation.result.analysisMode)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Question style</CardDescription>
                    <CardTitle className="text-2xl">
                      {Math.round(
                        typedEvaluation.result.summary.openQuestionRatio * 100,
                      )}
                      %
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Step-level summary</CardTitle>
                  <CardDescription>
                    Therapist turns:{" "}
                    {typedEvaluation.result.summary.therapistTurnCount} | Patient
                    turns: {typedEvaluation.result.summary.patientTurnCount} |
                    Therapist talk share:{" "}
                    {Math.round(
                      typedEvaluation.result.summary.therapistTalkShare * 100,
                    )}
                    %
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                {typedEvaluation.result.categories.map((category) => (
                  <Card key={category.id}>
                    <CardHeader className="gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">
                            {category.label}
                          </CardTitle>
                          <CardDescription>{category.definition}</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              category.present ? "destructive" : "success"
                            }
                          >
                            {category.present ? "Detected" : "Not detected"}
                          </Badge>
                          <Badge variant={getSeverityVariant(category.severity)}>
                            Severity {category.severity}
                          </Badge>
                          <Badge variant="outline">
                            Confidence {formatConfidence(category.confidence)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {category.evidence.length > 0 ? (
                        <details className="rounded-lg border border-border/60 bg-muted/20 p-4">
                          <summary className="cursor-pointer list-none font-medium text-foreground">
                            Evidence ({category.evidence.length})
                          </summary>
                          <div className="mt-4 space-y-3">
                            {category.evidence.map((evidence, index) => (
                              <div
                                key={`${category.id}-${index}`}
                                className="rounded-md border border-border/50 bg-background/80 p-3"
                              >
                                <p className="text-sm font-medium text-foreground">
                                  {evidence.reason}
                                </p>
                                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
                                  {evidence.excerpt}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                          {category.present
                            ? "The detector flagged this category without a compact evidence excerpt."
                            : "No supporting evidence was retained for this category."}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Brain className="h-4 w-4" />
                <span>
                  Detector version: {typedEvaluation.detectorVersion}
                  {typedEvaluation.result.modelName
                    ? ` | Model: ${typedEvaluation.result.modelName}`
                    : ""}
                </span>
              </div>
            </>
          ) : null}

          {!isProcessing &&
          !typedEvaluation &&
          !retryMutation.isPending ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary-yellow" />
                  <div>
                    <CardTitle>No analysis found yet</CardTitle>
                    <CardDescription>
                      This completed step does not have a stored misstep report.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() =>
                    retryMutation.mutate({
                      therapySessionId,
                      stepNumber: stepId,
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  Generate analysis
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </SharedLayout>
  );
}
