"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import {
  type MisstepCategoryResult,
  type StepMisstepEvaluationResult,
  type StepMisstepEvaluationStatus,
} from "~/lib/missteps";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { Breadcrumb, Badge } from "~/components/ui";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { MisstepReportSkeleton } from "~/components/ui/skeleton-variants";
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
  analysisMode: "vertex";
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

interface CompactMetricProps {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}

type EvidenceSpeaker = "user" | "patient" | "transcript";

type EvidenceTurn = {
  speaker: EvidenceSpeaker;
  content: string;
};

const HIDDEN_MISSTEP_CATEGORY_IDS = new Set([
  "therapist_seductiveness",
  "inappropriate_self_disclosure",
  "unmanaged_countertransference",
]);

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getSeverityVariant(severity: number) {
  if (severity >= 3) return "destructive";
  if (severity === 2) return "warning";
  return "secondary";
}

function getSeverityLabel(severity: number) {
  if (severity >= 3) return "Critical";
  if (severity === 2) return "Elevated";
  return "Baseline";
}

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) return "Unavailable";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getQuestionStyleLabel(openQuestionRatio: number) {
  if (openQuestionRatio >= 0.7) return "Exploratory";
  if (openQuestionRatio >= 0.45) return "Mixed";
  return "Directive";
}

function getTalkShareLabel(therapistTalkShare: number) {
  if (therapistTalkShare >= 0.62) return "Therapist-heavy";
  if (therapistTalkShare <= 0.38) return "Patient-led";
  return "Balanced";
}

function getDetectedCategoryAccent(category: MisstepCategoryResult) {
  if (category.severity >= 3) {
    return {
      panelClass:
        "border border-rose-500/30 bg-rose-500/5 shadow-sm shadow-rose-500/10",
    };
  }

  if (category.severity === 2) {
    return {
      panelClass:
        "border border-amber-500/30 bg-amber-500/5 shadow-sm shadow-amber-500/10",
    };
  }

  return {
    panelClass:
      "border border-yellow-500/25 bg-yellow-500/5 shadow-sm shadow-yellow-500/10",
  };
}

function CompactMetric({
  label,
  value,
  hint,
  valueClassName,
}: CompactMetricProps) {
  return (
    <div className="border-border/60 bg-background/45 rounded-2xl border p-4">
      <p className="text-muted-foreground text-[0.72rem] font-medium tracking-[0.18em] uppercase">
        {label}
      </p>
      <p
        className={`mt-3 text-2xl font-semibold ${valueClassName ?? "text-foreground"}`}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">{hint}</p>
    </div>
  );
}

function parseEvidenceTurns(
  excerpt: string,
  speaker?: "user" | "patient",
): EvidenceTurn[] {
  const normalizedLines = excerpt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const turns: EvidenceTurn[] = [];
  let currentTurn: EvidenceTurn | null = null;

  for (const line of normalizedLines) {
    const therapistMatch = line.match(/^Therapist:\s*(.*)$/i);
    if (therapistMatch) {
      if (currentTurn) {
        turns.push(currentTurn);
      }

      currentTurn = {
        speaker: "user",
        content: therapistMatch[1]?.trim() ?? "",
      };
      continue;
    }

    const patientMatch = line.match(/^Patient:\s*(.*)$/i);
    if (patientMatch) {
      if (currentTurn) {
        turns.push(currentTurn);
      }

      currentTurn = {
        speaker: "patient",
        content: patientMatch[1]?.trim() ?? "",
      };
      continue;
    }

    if (currentTurn) {
      currentTurn.content = `${currentTurn.content}\n${line}`.trim();
      continue;
    }

    currentTurn = {
      speaker: speaker ?? "transcript",
      content: line,
    };
  }

  if (currentTurn) {
    turns.push(currentTurn);
  }

  return turns.filter((turn) => turn.content.trim().length > 0);
}

function EvidenceSnippetChat({
  excerpt,
  reason,
  speaker,
}: {
  excerpt: string;
  reason: string;
  speaker?: "user" | "patient";
}) {
  const turns = parseEvidenceTurns(excerpt, speaker);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">{reason}</p>

      <div className="space-y-3">
        {turns.map((turn, index) => {
          const isTherapist = turn.speaker === "user";
          const isPatient = turn.speaker === "patient";
          const alignmentClass = isTherapist ? "justify-end" : "justify-start";
          const rowDirectionClass = isTherapist
            ? "flex-row-reverse space-x-reverse"
            : "flex-row";
          const bubbleToneClass = isPatient
            ? "chat-bubble--patient text-white"
            : isTherapist
              ? "chat-bubble--user text-white"
              : "border border-border bg-card text-foreground";

          return (
            <div
              key={`${turn.speaker}-${index}`}
              className={`flex ${alignmentClass}`}
            >
              <div className={`flex max-w-2xl space-x-3 ${rowDirectionClass}`}>
                <div className="max-w-xs min-w-0 space-y-2 sm:max-w-sm">
                  <div
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 sm:px-4 sm:py-3 ${bubbleToneClass}`}
                  >
                    <p className="text-body flex-1 text-sm break-words whitespace-pre-wrap sm:text-base">
                      {turn.content}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MisstepCategoryCard({
  category,
}: {
  category: MisstepCategoryResult;
}) {
  const accent = getDetectedCategoryAccent(category);

  return (
    <Card className={accent.panelClass}>
      <CardHeader className="gap-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-base leading-6">
              {category.label}
            </CardTitle>
            <CardDescription className="max-w-2xl leading-6">
              {category.definition}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={getSeverityVariant(category.severity)}
              className="px-3 py-1"
            >
              {getSeverityLabel(category.severity)}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              Confidence {formatConfidence(category.confidence)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {category.evidence.length > 0 ? (
          <details className="group border-border/60 bg-background/65 rounded-2xl border p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <span className="text-foreground text-sm font-medium">
                  Evidence snippets
                </span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {category.evidence.length} retained
                </span>
              </div>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-5 space-y-5">
              {category.evidence.map((evidence, index) => (
                <EvidenceSnippetChat
                  key={`${category.id}-${index}`}
                  excerpt={evidence.excerpt}
                  reason={evidence.reason}
                  speaker={evidence.speaker}
                />
              ))}
            </div>
          </details>
        ) : (
          <div className="border-border/60 bg-background/40 text-muted-foreground rounded-2xl border border-dashed p-4 text-sm leading-6">
            The detector flagged this category, but it did not retain a compact
            excerpt.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StepMisstepReportContent({
  user,
  impersonation,
}: StepMisstepReportContentProps) {
  const params = useParams();
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

  const { data: patient, isLoading: patientLoading } =
    api.patients.getPatientById.useQuery(
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

  const {
    data: evaluation,
    isLoading: evaluationLoading,
    error: evaluationError,
  } = api.stepEvaluations.getByStep.useQuery(
    {
      therapySessionId,
      stepNumber: stepId,
    },
    {
      enabled: Boolean(therapySessionId && stepId && isStepCompleted),
      retry: (failureCount, error) => {
        if (error.message.toLowerCase().includes("latest database migration")) {
          return false;
        }

        return failureCount < 3;
      },
      refetchInterval: (query) => {
        const data = query.state.data as StepEvaluationData | null | undefined;
        return data?.status === "processing" ? 2500 : false;
      },
    },
  );

  const typedEvaluation = evaluation as StepEvaluationData | null | undefined;
  const loadErrorMessage =
    evaluationError?.message ?? retryMutation.error?.message ?? null;

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

  const triggerReanalysis = () =>
    retryMutation.mutate({
      therapySessionId,
      stepNumber: stepId,
    });

  const isLoading =
    therapySessionLoading ||
    patientLoading ||
    chatStepLoading ||
    (isStepCompleted && evaluationLoading);

  const isProcessing =
    retryMutation.isPending ||
    typedEvaluation?.status === "processing" ||
    (!typedEvaluation && autoQueued && !retryMutation.isError);

  const completedResult =
    typedEvaluation?.status === "completed" ? typedEvaluation.result : null;

  const sortedCategories = useMemo(() => {
    if (!completedResult) {
      return [];
    }

    return [...completedResult.categories]
      .filter((category) => !HIDDEN_MISSTEP_CATEGORY_IDS.has(category.id))
      .sort((left, right) => {
        if (left.present !== right.present) {
          return Number(right.present) - Number(left.present);
        }

        if (left.severity !== right.severity) {
          return right.severity - left.severity;
        }

        if (left.confidence !== right.confidence) {
          return right.confidence - left.confidence;
        }

        return left.label.localeCompare(right.label);
      });
  }, [completedResult]);

  const detectedCategories = useMemo(
    () => sortedCategories.filter((category) => category.present),
    [sortedCategories],
  );

  const clearCategories = useMemo(
    () => sortedCategories.filter((category) => !category.present),
    [sortedCategories],
  );

  const detectedCount = detectedCategories.length;
  const highSeverityDetectedCount = detectedCategories.filter(
    (category) => category.severity === 3,
  ).length;

  if (isLoading) {
    return (
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="dashboard"
        currentPage="/dashboard/therapeutic-journey"
      >
        <MisstepReportSkeleton />
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
                  This page is available only after the current chat step has
                  been marked as completed.
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
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={backToChatHref}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Chat
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={backToTimelineHref}>Back to Timeline</Link>
              </Button>
              <Button
                variant="outline"
                onClick={triggerReanalysis}
                disabled={retryMutation.isPending || isProcessing}
              >
                {retryMutation.isPending || isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Re-run analysis
              </Button>
            </div>
          </div>

          {isProcessing ? (
            <DashboardPanel className="p-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
                <div>
                  <h2 className="text-foreground text-xl font-semibold">
                    Analysis in progress
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-2xl">
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
                <p className="text-muted-foreground text-sm">
                  {typedEvaluation.errorMessage ??
                    "An unexpected error interrupted the analysis pipeline."}
                </p>
                <Button
                  onClick={triggerReanalysis}
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

          {loadErrorMessage ? (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-400" />
                  <div>
                    <CardTitle>Unable to load analysis</CardTitle>
                    <CardDescription>
                      The report request did not complete successfully.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {loadErrorMessage}
                </p>
                <Button
                  onClick={triggerReanalysis}
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

          {typedEvaluation?.status === "completed" && completedResult ? (
            <>
              <Card className="border-border/60 border shadow-sm">
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-2"></div>

                  <div className="space-y-2">
                    <CardTitle className="text-2xl">Step summary</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <CompactMetric
                      label="Flagged"
                      value={`${detectedCount}`}
                      hint="Needs review"
                      valueClassName={
                        detectedCount > 0
                          ? "text-foreground"
                          : "text-emerald-300"
                      }
                    />
                    <CompactMetric
                      label="Critical"
                      value={`${highSeverityDetectedCount}`}
                      hint="Safety or boundary risk"
                      valueClassName={
                        highSeverityDetectedCount > 0
                          ? "text-rose-200"
                          : "text-foreground"
                      }
                    />
                    <CompactMetric
                      label="Open questions"
                      value={formatPercent(
                        completedResult.summary.openQuestionRatio,
                      )}
                      hint={getQuestionStyleLabel(
                        completedResult.summary.openQuestionRatio,
                      )}
                    />
                    <CompactMetric
                      label="Talk share"
                      value={formatPercent(
                        completedResult.summary.therapistTalkShare,
                      )}
                      hint={getTalkShareLabel(
                        completedResult.summary.therapistTalkShare,
                      )}
                    />
                  </div>

                  <div className="border-border/60 bg-background/40 text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-sm">
                    <span>
                      Analyzed{" "}
                      {formatTimestamp(
                        typedEvaluation.analyzedAt ??
                          completedResult.computedAt,
                      )}
                    </span>
                    <span>
                      {completedResult.summary.therapistTurnCount} therapist
                      turns
                    </span>
                    <span>
                      {completedResult.summary.patientTurnCount} patient turns
                    </span>
                    <span>
                      {completedResult.modelName
                        ? completedResult.modelName
                        : "Vertex AI"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-foreground text-xl font-semibold">
                      Detected missteps
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Showing only the categories that were flagged.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-border/60 px-3 py-1"
                  >
                    {detectedCategories.length} flagged
                  </Badge>
                </div>

                {detectedCategories.length > 0 ? (
                  <div className="space-y-4">
                    {detectedCategories.map((category) => (
                      <MisstepCategoryCard
                        key={category.id}
                        category={category}
                      />
                    ))}
                  </div>
                ) : (
                  <DashboardPanel className="border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
                    <div className="mx-auto max-w-2xl space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <h3 className="text-foreground text-lg font-semibold">
                        No detected missteps
                      </h3>
                      <p className="text-muted-foreground text-sm leading-6">
                        The detector did not flag any category in this step.
                      </p>
                    </div>
                  </DashboardPanel>
                )}
              </div>

              {clearCategories.length > 0 ? (
                <details className="group border-border/60 bg-card/70 mt-4 rounded-2xl border p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                      <span className="text-foreground text-sm font-medium">
                        Clear categories
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {clearCategories.length} screened with no issue
                      </span>
                    </div>
                    <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {clearCategories.map((category) => (
                      <Badge
                        key={category.id}
                        variant="outline"
                        className="border-border/60 bg-background/40 px-3 py-1"
                      >
                        {category.label}
                      </Badge>
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          ) : null}

          {!isProcessing &&
          !typedEvaluation &&
          !retryMutation.isPending &&
          !loadErrorMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-primary-yellow h-5 w-5" />
                  <div>
                    <CardTitle>No analysis found yet</CardTitle>
                    <CardDescription>
                      This completed step does not have a stored misstep report.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button onClick={triggerReanalysis}>
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
