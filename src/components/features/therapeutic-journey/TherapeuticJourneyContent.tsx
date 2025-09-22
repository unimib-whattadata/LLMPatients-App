"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { TherapySessionCard, TherapySessionFilters, TherapySessionMetrics, TherapySessionCardSkeleton } from "./index";
import { api } from "~/trpc/react";

/**
 * Therapeutic Journey Content Component
 * Client-side component for managing therapy sessions
 */
export function TherapeuticJourneyContent() {
  const [filter, setFilter] = useState<string>("all");

  const {
    data: allTherapySessions,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = api.therapySessions.getAllForUser.useQuery();

  // Memoized function to get session status
  const getSessionStatus = useCallback((sessionNumber: number) => {
    if (sessionNumber === 1) return "started";
    if (sessionNumber >= 11) return "completed";
    return "in-progress";
  }, []);

  // Memoized filtered sessions
  const filteredSessions = useMemo(() => {
    if (!allTherapySessions) return [];
    if (filter === "all") return allTherapySessions;
    
    return allTherapySessions.filter(session => {
      const status = getSessionStatus(session.sessionNumber);
      return status === filter;
    });
  }, [allTherapySessions, filter, getSessionStatus]);

  // Memoized metrics calculation
  const metrics = useMemo(() => {
    if (!allTherapySessions) return { inProgress: 0, completed: 0, averageProgress: 0 };
    
    const inProgress = allTherapySessions.filter(s => getSessionStatus(s.sessionNumber) === "in-progress").length;
    const completed = allTherapySessions.filter(s => getSessionStatus(s.sessionNumber) === "completed").length;
    const averageProgress = Math.round(
      allTherapySessions.reduce((acc, session) => acc + (session.sessionNumber / 11) * 100, 0) / allTherapySessions.length
    );
    
    return { inProgress, completed, averageProgress };
  }, [allTherapySessions, getSessionStatus]);

  // Memoized filter change handler
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  return (
    <div className="dashboard-panel-stack">
      {/* Progress Overview Section */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h1 className="dashboard-section__title">I tuoi percorsi terapeutici</h1>
            <p className="dashboard-section__description">
              Seleziona un paziente per continuare il tuo percorso terapeutico o inizia una nuova simulazione.
            </p>
          </div>
        </div>

        {allTherapySessions && allTherapySessions.length > 0 && (
          <TherapySessionMetrics
            inProgress={metrics.inProgress}
            completed={metrics.completed}
            averageProgress={metrics.averageProgress}
          />
        )}
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

        {sessionsLoading ? (
          <div className="dashboard-action-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <TherapySessionCardSkeleton key={index} />
            ))}
          </div>
        ) : sessionsError ? (
          <div className="dashboard-empty-state">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Errore nel caricamento
            </h3>
            <p className="text-text-secondary">
              Non è stato possibile caricare le tue sessioni terapeutiche.
            </p>
          </div>
        ) : !allTherapySessions || allTherapySessions.length === 0 ? (
          <div className="dashboard-empty-state">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Nessuna sessione avviata
            </h3>
            <p className="text-text-secondary">
              Non hai ancora avviato nessuna sessione terapeutica. Vai alla pagina "Esplora Pazienti" per iniziare.
            </p>
            <div className="mt-6">
              <Link
                href="/explore-patients"
                className="btn btn-primary"
              >
                Esplora Pazienti
              </Link>
            </div>
          </div>
        ) : (
          <div className="dashboard-action-grid" role="list" aria-label={`Griglia di ${filteredSessions.length} sessioni terapeutiche`}>
            {filteredSessions.map((therapySession) => (
              <TherapySessionCard
                key={therapySession.id}
                therapySession={therapySession}
                getSessionStatus={getSessionStatus}
              />
            ))}
          </div>
        )}

        {filteredSessions.length === 0 && allTherapySessions && allTherapySessions.length > 0 && (
          <div className="dashboard-empty-state">
            <h3 className="text-lg font-medium text-text-primary mb-2">
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
