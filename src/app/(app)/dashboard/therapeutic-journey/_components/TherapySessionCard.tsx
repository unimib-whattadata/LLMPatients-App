"use client";

import { memo } from "react";
import Link from "next/link";
import { createPatientSlug } from "~/lib/utils/slugify";
import { PatientAvatar } from "~/components/features/explore-patients/PatientAvatar";
import { getBasePatientAvatarUrl } from "~/lib/utils/patient-avatar";
import {
  getDifficultyAccessibleText,
  getDifficultyIconClass,
  getDifficultyIcon,
  type DifficultyLevel,
} from "~/lib/constants/difficulty";
import { Clock } from "lucide-react";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";

type TherapySessionWithPatient = {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  completedStepsCount: number;
  patient: {
    id: string;
    name: string;
    smallDescription: string;
    difficulty: number;
    estimatedDuration: number;
    avatarUrl: string | null;
  };
};

interface TherapySessionCardProps {
  therapySession: TherapySessionWithPatient;
  getSessionStatus: (therapySession: TherapySessionWithPatient) => string;
}

function TherapySessionCardComponent({
  therapySession,
  getSessionStatus,
}: TherapySessionCardProps) {
  const sessionStatus = getSessionStatus(therapySession);

  const getStatusBadgeConfig = (status: string) => {
    const statusConfig = {
      started: {
        className: "bg-primary-green text-text-inverse",
        text: "Started",
      },
      "in-progress": {
        className: "bg-primary-yellow text-text-inverse",
        text: "In progress",
      },
      completed: {
        className: "bg-primary-violet text-text-inverse",
        text: "Completed",
      },
    };
    return statusConfig[status as keyof typeof statusConfig];
  };

  const statusConfig = getStatusBadgeConfig(sessionStatus);

  const progressPercentage = therapySession.isCompleted
    ? 100
    : Math.max(0, Math.min(100, Math.round((therapySession.completedStepsCount / 11) * 100)));

  return (
    <Card
      className="patient-card flex h-full flex-col !bg-surface-primary"
      role="listitem"
      itemScope
      itemType="https://schema.org/MedicalProcedure"
    >
      {/* Header: Avatar + Name + Status Badge */}
      <CardHeader className="flex flex-col items-center space-y-4 pb-4">
        <PatientAvatar
          name={therapySession.patient.name}
          avatarUrl={getBasePatientAvatarUrl(therapySession.patient.avatarUrl)}
        />

        {/* Name and Status */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <CardTitle
              id={`session-${therapySession.id}-title`}
              className="text-xl text-foreground"
              itemProp="name"
            >
              {therapySession.patient.name}
            </CardTitle>
            <Badge variant="secondary" className={statusConfig.className}>
              {statusConfig.text}
            </Badge>
          </div>

          {/* Description */}
          <CardDescription className="text-left text-muted-foreground" itemProp="description">
            {therapySession.patient.smallDescription}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {/* Progress Section */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary-green">
            Progress: {therapySession.completedStepsCount}/11 sessions
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium text-foreground">{progressPercentage}%</span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2"
              aria-label={
                therapySession.isCompleted
                  ? "Session completed at 100%"
                  : `Session progress: ${therapySession.completedStepsCount} of 11 sessions completed (${progressPercentage}%)`
              }
            />
          </div>
        </div>

        {/* Difficulty and Duration */}
        <div className="mt-4 space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Difficulty:</span>
            <div className="patient-card-difficulty">
              <span
                className={getDifficultyIconClass(
                  therapySession.patient.difficulty as DifficultyLevel,
                )}
                aria-label={getDifficultyAccessibleText(
                  therapySession.patient.difficulty as DifficultyLevel,
                )}
                role="img"
              >
                {getDifficultyIcon(therapySession.patient.difficulty as DifficultyLevel)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">
              {therapySession.isCompleted ? "Completed on:" : "Estimated duration:"}
            </span>
            <div className="flex items-center space-x-1 text-sm text-primary-yellow">
              {!therapySession.isCompleted && (
                <Clock className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="text-text-tertiary text-sm">
                {therapySession.isCompleted
                  ? new Date(
                    therapySession.updatedAt || therapySession.createdAt,
                  ).toLocaleDateString("en-US")
                  : `${therapySession.patient.estimatedDuration} min`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full">
          <Link
            href={`/dashboard/therapeutic-journey/${therapySession.patientId}/${createPatientSlug(therapySession.patient.name)}`}
            aria-label={
              therapySession.isCompleted
                ? `Review the completed journey with ${therapySession.patient.name}`
                : `Continue the session with ${therapySession.patient.name}`
            }
          >
            {therapySession.isCompleted
              ? "Review Journey"
              : sessionStatus === "started"
                ? "Start Session"
                : "Continue Session"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export const TherapySessionCard = memo(TherapySessionCardComponent);
