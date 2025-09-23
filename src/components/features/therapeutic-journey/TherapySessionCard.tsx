/**
 * Therapy Session Card Component
 *
 * Optimized card component for displaying therapy session information
 * with memoization and performance optimizations
 */

"use client";

import { memo } from "react";
import Link from "next/link";

type TherapySessionWithPatient = {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  createdAt: Date;
  updatedAt: Date | null;
  patient: {
    id: string;
    name: string;
    smallDescription: string;
    difficulty: number;
    estimatedDuration: number;
  };
};

interface TherapySessionCardProps {
  therapySession: TherapySessionWithPatient;
  getSessionStatus: (sessionNumber: number) => string;
}

function TherapySessionCardComponent({
  therapySession,
  getSessionStatus,
}: TherapySessionCardProps) {
  const sessionStatus = getSessionStatus(therapySession.sessionNumber);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      started: {
        class: "pill pill--sm status-tag status-tag--available",
        text: "Iniziato",
      },
      "in-progress": {
        class: "pill pill--sm status-tag status-tag--in-progress",
        text: "In corso",
      },
      completed: {
        class: "pill pill--sm status-tag status-tag--completed",
        text: "Completato",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <span className={config.class}>{config.text}</span>;
  };

  const getDifficultyClass = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "patient-card-difficulty-icon patient-card-difficulty-icon--easy";
      case 2:
        return "patient-card-difficulty-icon patient-card-difficulty-icon--medium";
      case 3:
        return "patient-card-difficulty-icon patient-card-difficulty-icon--hard";
      default:
        return "patient-card-difficulty-icon";
    }
  };

  const getDifficultyIcon = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "•";
      case 2:
        return "••";
      case 3:
        return "•••";
      default:
        return "•";
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "Facile";
      case 2:
        return "Medio";
      case 3:
        return "Difficile";
      default:
        return "Sconosciuto";
    }
  };

  const progressPercentage = Math.round(
    (therapySession.sessionNumber / 11) * 100,
  );

  return (
    <article
      className="dashboard-action-card"
      role="listitem"
      itemScope
      itemType="https://schema.org/MedicalProcedure"
    >
      <div className="dashboard-action-card-content">
        <div className="dashboard-action-card-main">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="dashboard-action-card__title mb-1" itemProp="name">
                {therapySession.patient.name}
              </h3>
              <p
                className="dashboard-action-card__description"
                itemProp="description"
              >
                {therapySession.patient.smallDescription}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(sessionStatus)}
              <span className="text-text-tertiary text-xs">
                Sessione {therapySession.sessionNumber}/11
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Difficoltà:</span>
              <div className="patient-card-difficulty">
                <span
                  className={getDifficultyClass(
                    therapySession.patient.difficulty,
                  )}
                  aria-label={getDifficultyLabel(
                    therapySession.patient.difficulty,
                  )}
                  role="img"
                >
                  {getDifficultyIcon(therapySession.patient.difficulty)}
                </span>
                <span className="text-sm font-medium">
                  {getDifficultyLabel(therapySession.patient.difficulty)}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-text-secondary text-sm">Progresso:</span>
                <span className="text-sm font-medium">
                  {progressPercentage}%
                </span>
              </div>
              <div
                className="bg-background-tertiary h-2 w-full rounded-full"
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso sessione: ${progressPercentage}%`}
              >
                <div
                  className="bg-accent-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">
                Durata stimata:
              </span>
              <span className="text-text-tertiary text-sm">
                {therapySession.patient.estimatedDuration} min
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={`/dashboard/therapeutic-journey/${therapySession.patientId}`}
              className="btn btn-primary w-full"
            >
              {sessionStatus === "completed"
                ? "Rivedi Sessione"
                : "Continua Sessione"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const TherapySessionCard = memo(TherapySessionCardComponent);
