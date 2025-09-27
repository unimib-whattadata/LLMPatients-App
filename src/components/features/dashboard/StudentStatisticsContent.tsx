"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

export function StudentStatisticsContent() {
  const [timeRange, setTimeRange] = useState<string>("month");

  // Fetch student statistics from API
  const { data: studentStats, isLoading: statsLoading } =
    api.dashboard.getStudentStats.useQuery(undefined, {
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 3,
    });

  return (
    <div className="dashboard-panel-stack">
      <section
        className="dashboard-section"
        aria-labelledby="time-range-filter"
      >
        <div className="dashboard-section__header">
          <div>
            <h2 id="time-range-filter" className="dashboard-section__title">
              Filtro Periodo
            </h2>
            <p className="dashboard-section__description">
              Seleziona il periodo di riferimento per le statistiche
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="auth-input-group">
            <label className="auth-label" htmlFor="time-range-select">
              Periodo di riferimento
            </label>
            <select
              id="time-range-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="auth-input"
            >
              <option value="week">Ultima settimana</option>
              <option value="month">Ultimo mese</option>
              <option value="quarter">Ultimo trimestre</option>
              <option value="year">Ultimo anno</option>
            </select>
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="overview-stats">
        <div className="dashboard-section__header">
          <div>
            <h2 id="overview-stats" className="dashboard-section__title">
              Panoramica Statistiche
            </h2>
            <p className="dashboard-section__description">
              Indicatori chiave delle performance degli studenti
            </p>
          </div>
        </div>

        {statsLoading ? (
          <div className="dashboard-metric-grid" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-metric-card">
                <Skeleton variant="text" className="mb-2 h-4 w-20" />
                <Skeleton variant="text" className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-metric-grid">
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {studentStats?.activeStudents ?? 0}
              </span>
              <span className="dashboard-metric-card__label">
                Studenti Attivi
              </span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {studentStats?.completionRate ?? 0}%
              </span>
              <span className="dashboard-metric-card__label">
                Tasso Completamento
              </span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {studentStats?.averageScore ?? 0}
              </span>
              <span className="dashboard-metric-card__label">Score Medio</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {studentStats?.totalSimulations ?? 0}
              </span>
              <span className="dashboard-metric-card__label">
                Simulazioni Totali
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-section" aria-labelledby="charts-analytics">
        <div className="dashboard-section__header">
          <div>
            <h2 id="charts-analytics" className="dashboard-section__title">
              Analisi e Grafici
            </h2>
            <p className="dashboard-section__description">
              Visualizzazione delle tendenze e distribuzioni delle performance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="dashboard-panel">
            <h3 className="text-text-primary mb-4 text-lg font-semibold">
              Trend Performance
            </h3>
            <div className="bg-background-secondary flex h-64 items-center justify-center rounded-md">
              <div className="text-text-tertiary text-center">
                <div>Grafico delle performance nel tempo</div>
                <div className="mt-1 text-sm">
                  (Da implementare con chart library)
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h3 className="text-text-primary mb-4 text-lg font-semibold">
              Distribuzione Punteggi
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">90-100</span>
                <div className="flex items-center gap-2">
                  <div className="bg-background-tertiary h-2 w-32 rounded-full">
                    <div className="bg-success-500 progress-bar--25 h-2 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">25%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">80-89</span>
                <div className="flex items-center gap-2">
                  <div className="bg-background-tertiary h-2 w-32 rounded-full">
                    <div className="bg-accent-500 progress-bar--35 h-2 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">35%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">70-79</span>
                <div className="flex items-center gap-2">
                  <div className="bg-background-tertiary h-2 w-32 rounded-full">
                    <div className="bg-warning-500 progress-bar--25 h-2 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">25%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">60-69</span>
                <div className="flex items-center gap-2">
                  <div className="bg-background-tertiary h-2 w-32 rounded-full">
                    <div className="bg-secondary-500 progress-bar--10 h-2 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">10%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">60</span>
                <div className="flex items-center gap-2">
                  <div className="bg-background-tertiary h-2 w-32 rounded-full">
                    <div className="bg-error-500 progress-bar--5 h-2 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="dashboard-section"
        aria-labelledby="performance-details"
      >
        <div className="dashboard-section__header">
          <div>
            <h2 id="performance-details" className="dashboard-section__title">
              Dettagli Performance
            </h2>
            <p className="dashboard-section__description">
              Migliori performance e aree di miglioramento
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="dashboard-panel">
            <h3 className="text-text-primary mb-4 text-lg font-semibold">
              Migliori Performance
            </h3>
            <div className="dashboard-list" role="list">
              {[
                { name: "Maria Neri", score: 95, improvement: "+8%" },
                { name: "Luca Rossi", score: 92, improvement: "+5%" },
                { name: "Anna Verde", score: 90, improvement: "+12%" },
                { name: "Paolo Blu", score: 88, improvement: "+3%" },
              ].map((student, index) => (
                <div
                  key={index}
                  className="dashboard-list__item"
                  role="listitem"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-accent-100 text-accent-600 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="dashboard-activity-title">
                        {student.name}
                      </div>
                      <div className="dashboard-activity-meta">
                        Score: {student.score}/100
                      </div>
                    </div>
                  </div>
                  <div className="text-success-600 text-sm font-medium">
                    {student.improvement}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-panel">
            <h3 className="text-text-primary mb-4 text-lg font-semibold">
              Aree di Miglioramento
            </h3>
            <div className="dashboard-list" role="list">
              {[
                {
                  topic: "Diagnosi Differenziale",
                  avgScore: 65,
                  trend: "down",
                },
                { topic: "Gestione Emergenze", avgScore: 72, trend: "up" },
                {
                  topic: "Comunicazione Paziente",
                  avgScore: 68,
                  trend: "stable",
                },
                { topic: "Procedure Invasive", avgScore: 70, trend: "up" },
              ].map((area, index) => (
                <div
                  key={index}
                  className="dashboard-list__item"
                  role="listitem"
                >
                  <div>
                    <div className="dashboard-activity-title">{area.topic}</div>
                    <div className="dashboard-activity-meta">
                      Score medio: {area.avgScore}/100
                    </div>
                  </div>
                  <div className="text-sm">
                    {area.trend === "up" && (
                      <span className="text-success-600">↗ +2%</span>
                    )}
                    {area.trend === "down" && (
                      <span className="text-error-600">↘ -3%</span>
                    )}
                    {area.trend === "stable" && (
                      <span className="text-text-secondary">→ 0%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
