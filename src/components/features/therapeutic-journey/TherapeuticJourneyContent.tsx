"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  TherapySessionCard,
  TherapySessionFilters,
  TherapySessionMetrics,
} from "./index";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";

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
    avatarType: string;
  };
};

/**
 * Therapeutic Journey Content Component
 *
 * Main component for displaying and managing therapy sessions for users.
 * Provides filtering, metrics, and session management functionality.
 *
 * Features:
 * - Session filtering by status (all, started, in-progress, completed)
 * - Real-time metrics calculation (progress, completion rates)
 * - Responsive grid layout with loading states
 * - Integration with tRPC for data fetching
 *
 * @returns JSX element containing the therapeutic journey interface
 */
export function TherapeuticJourneyContent() {
  // Current filter state for session status
  const [filter, setFilter] = useState<string>("all");
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side rendering to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    data: allTherapySessions,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = api.therapySessions.getAllForUser.useQuery();

  // Type assertion for API response
  const typedAllTherapySessions = allTherapySessions as
    | TherapySessionWithPatient[]
    | undefined;

  /**
   * Determines the status of a therapy session based on completion status and session number
   * @param therapySession - The therapy session object with isCompleted field
   * @returns Session status: "started", "in-progress", or "completed"
   */
  const getSessionStatus = useCallback(
    (therapySession: TherapySessionWithPatient) => {
      // If the session is marked as completed in the database, it's completed
      if (therapySession.isCompleted) return "completed";

      // Otherwise, determine status based on session number
      if (therapySession.sessionNumber === 1) return "started";
      return "in-progress";
    },
    [],
  );

  /**
   * Filters therapy sessions based on the current filter state
   * @returns Array of filtered therapy sessions
   */
  const filteredSessions = useMemo(() => {
    if (!typedAllTherapySessions) return [];
    if (filter === "all") return typedAllTherapySessions;

    return typedAllTherapySessions.filter((session) => {
      const status = getSessionStatus(session);
      return status === filter;
    });
  }, [typedAllTherapySessions, filter, getSessionStatus]);

  /**
   * Calculates session metrics for display in the metrics component
   * @returns Object containing startedOrInProgress count, completed count, and average progress percentage
   */
  const metrics = useMemo(() => {
    if (!typedAllTherapySessions)
      return { startedOrInProgress: 0, completed: 0, averageProgress: 0 };

    const startedOrInProgress = typedAllTherapySessions.filter(
      (s) => {
        const status = getSessionStatus(s);
        return status === "started" || status === "in-progress";
      },
    ).length;
    const completed = typedAllTherapySessions.filter(
      (s) => getSessionStatus(s) === "completed",
    ).length;
    const averageProgress = Math.max(0, Math.min(100, Math.round(
      typedAllTherapySessions.reduce(
        (acc, session) => acc + (session.completedStepsCount / 11) * 100,
        0,
      ) / typedAllTherapySessions.length,
    )));

    return { startedOrInProgress, completed, averageProgress };
  }, [typedAllTherapySessions, getSessionStatus]);

  /**
   * Handles filter changes from the filter component
   * @param newFilter - The new filter value to apply
   */
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  return (
    <div className="dashboard-panel-stack">
      {/* Progress Overview Section */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h1 className="dashboard-section__title">
              I tuoi percorsi terapeutici
            </h1>
            <p className="dashboard-section__description">
              Seleziona un paziente per continuare il tuo percorso terapeutico o
              inizia una nuova simulazione.
            </p>
          </div>
        </div>

        {!isClient ? (
          <div className="dashboard-metric-grid" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-metric-card">
                <Skeleton variant="text" className="mb-2 h-4 w-20" />
                <Skeleton variant="text" className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : sessionsLoading ? (
          <div className="dashboard-metric-grid" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-metric-card">
                <Skeleton variant="text" className="mb-2 h-4 w-20" />
                <Skeleton variant="text" className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : typedAllTherapySessions && typedAllTherapySessions.length > 0 ? (
          <TherapySessionMetrics
            startedOrInProgress={metrics.startedOrInProgress}
            completed={metrics.completed}
            averageProgress={metrics.averageProgress}
          />
        ) : null}
      </section>

      {/* Therapy Sessions Grid Section */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h2 className="dashboard-section__title">Percorsi Terapeutici</h2>
            <p className="dashboard-section__description">
              Le tue sessioni terapeutiche in corso
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <TherapySessionFilters
          activeFilter={filter}
          onFilterChange={handleFilterChange}
        />

        {!isClient ? (
          <div className="dashboard-action-grid" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <Skeleton variant="text" className="mb-2 h-5 w-3/4" />
                        <Skeleton variant="text" className="mb-1 h-4 w-1/2" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton variant="avatar" className="h-6 w-20" />
                        <Skeleton variant="text" className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton variant="text" className="h-4 w-16" />
                        <div className="flex items-center gap-2">
                          <Skeleton variant="avatar" className="h-4 w-4" />
                          <Skeleton variant="text" className="h-4 w-12" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <Skeleton variant="text" className="h-4 w-16" />
                          <Skeleton variant="text" className="h-4 w-8" />
                        </div>
                        <Skeleton variant="text" className="h-2 w-full" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton variant="text" className="h-4 w-20" />
                        <Skeleton variant="text" className="h-4 w-12" />
                      </div>
                    </div>
                    <div className="mt-6">
                      <Skeleton variant="button" className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sessionsLoading ? (
          <div className="dashboard-action-grid" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <Skeleton variant="text" className="mb-2 h-5 w-3/4" />
                        <Skeleton variant="text" className="mb-1 h-4 w-1/2" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton variant="avatar" className="h-6 w-20" />
                        <Skeleton variant="text" className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton variant="text" className="h-4 w-16" />
                        <div className="flex items-center gap-2">
                          <Skeleton variant="avatar" className="h-4 w-4" />
                          <Skeleton variant="text" className="h-4 w-12" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <Skeleton variant="text" className="h-4 w-16" />
                          <Skeleton variant="text" className="h-4 w-8" />
                        </div>
                        <Skeleton variant="text" className="h-2 w-full" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton variant="text" className="h-4 w-20" />
                        <Skeleton variant="text" className="h-4 w-12" />
                      </div>
                    </div>
                    <div className="mt-6">
                      <Skeleton variant="button" className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sessionsError ? (
          <div className="dashboard-empty-state">
            <h3 className="text-text-primary mb-2 text-lg font-medium">
              Errore nel caricamento
            </h3>
            <p className="text-text-secondary">
              Non è stato possibile caricare le tue sessioni terapeutiche.
            </p>
          </div>
        ) : !typedAllTherapySessions || typedAllTherapySessions.length === 0 ? (
          <div className="dashboard-empty-state">
            <h3 className="text-text-primary mb-2 text-lg font-medium">
              Nessuna sessione avviata
            </h3>
            <p className="text-text-secondary">
              Non hai ancora avviato nessuna sessione terapeutica. Vai alla
              pagina &quot;Esplora Pazienti&quot; per iniziare.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link href="/explore-patients">Esplora Pazienti</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="dashboard-action-grid"
            role="list"
            aria-label={`Griglia di ${filteredSessions.length} sessioni terapeutiche`}
          >
            {filteredSessions.map((therapySession) => (
              <TherapySessionCard
                key={therapySession.id}
                therapySession={therapySession}
                getSessionStatus={getSessionStatus}
              />
            ))}
          </div>
        )}

        {filteredSessions.length === 0 &&
          typedAllTherapySessions &&
          typedAllTherapySessions.length > 0 && (
            <div className="dashboard-empty-state">
              <h3 className="text-text-primary mb-2 text-lg font-medium">
                Nessuna sessione trovata
              </h3>
              <p className="text-text-secondary">
                Modifica i filtri per vedere più sessioni
              </p>
            </div>
          )}
      </section>
    </div>
  );
}
