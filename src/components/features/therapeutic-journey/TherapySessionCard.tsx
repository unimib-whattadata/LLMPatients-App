/**
 * Therapy Session Card Component
 *
 * Optimized card component for displaying therapy session information
 * with memoization and performance optimizations
 */

"use client";

import { memo } from "react";
import Link from "next/link";
import { createPatientSlug } from "~/lib/utils/slugify";
import { PatientAvatar } from "../explore-patients/PatientAvatar";

type TherapySessionWithPatient = {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  patient: {
    id: string;
    name: string;
    smallDescription: string;
    difficulty: number;
    estimatedDuration: number;
    avatarUrl: string | null;
    avatarType: string;
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

  const progressPercentage = therapySession.isCompleted 
    ? 100 
    : Math.round((therapySession.sessionNumber / 11) * 100);

  return (
    <article
      className="dashboard-action-card"
      role="listitem"
      itemScope
      itemType="https://schema.org/MedicalProcedure"
    >
      <div className="dashboard-action-card-content">
        <div className="dashboard-action-card-main">
          {/* Header with avatar and status */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="therapy-session-avatar">
                <PatientAvatar
                  name={therapySession.patient.name}
                  avatarUrl={therapySession.patient.avatarUrl}
                  avatarType={therapySession.patient.avatarType}
                />
              </div>
              <div>
                <h3 className="dashboard-action-card__title mb-1" itemProp="name">
                  {therapySession.patient.name}
                </h3>
                <p
                  className="dashboard-action-card__description text-sm"
                  itemProp="description"
                >
                  {therapySession.patient.smallDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(sessionStatus)}
              <span className="text-text-tertiary text-xs">
                {therapySession.isCompleted 
                  ? "Completato (11/11)" 
                  : `Sessione ${therapySession.sessionNumber}/11`}
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
                <span className="text-text-secondary text-sm">
                  {therapySession.isCompleted ? "Stato:" : "Progresso:"}
                </span>
                <span className="text-sm font-medium">
                  {therapySession.isCompleted ? "Completato" : `${progressPercentage}%`}
                </span>
              </div>
              <div
                className="bg-background-tertiary h-2 w-full rounded-full"
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={therapySession.isCompleted 
                  ? "Sessione completata al 100%" 
                  : `Progresso sessione: ${progressPercentage}%`}
              >
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    therapySession.isCompleted 
                      ? "bg-green-500" 
                      : "bg-accent-600"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">
                {therapySession.isCompleted ? "Completato il:" : "Durata stimata:"}
              </span>
              <span className="text-text-tertiary text-sm">
                {therapySession.isCompleted 
                  ? new Date(therapySession.updatedAt || therapySession.createdAt).toLocaleDateString('it-IT')
                  : `${therapySession.patient.estimatedDuration} min`}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={`/dashboard/therapeutic-journey/${therapySession.patientId}/${createPatientSlug(therapySession.patient.name)}`}
              className="btn btn-primary w-full"
            >
              {therapySession.isCompleted
                ? "Rivedi Percorso Completato"
                : sessionStatus === "started"
                ? "Inizia Sessione"
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
