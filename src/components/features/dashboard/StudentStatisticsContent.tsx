"use client";

import { useState } from "react";
import { UsersIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { api } from "~/trpc/react";

export function StudentStatisticsContent() {
  const [timeRange, setTimeRange] = useState<string>("month");

  // Fetch student statistics from API
  const { data: studentStats, isLoading: statsLoading } = api.dashboard.getStudentStats.useQuery(undefined, {
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
  });

  return (
    <div className="dashboard-panel-stack">
        <section className="dashboard-section" aria-labelledby="time-range-filter">
          <div className="dashboard-section__header">
            <div>
              <h2 id="time-range-filter" className="dashboard-section__title">Filtro Periodo</h2>
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
              <h2 id="overview-stats" className="dashboard-section__title">Panoramica Statistiche</h2>
              <p className="dashboard-section__description">
                Indicatori chiave delle performance degli studenti
              </p>
            </div>
          </div>

          {statsLoading ? (
            <div className="dashboard-metric-grid" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="dashboard-metric-card">
                  <div className="bg-background-tertiary animate-pulse rounded-md h-4 w-20 mb-2" />
                  <div className="bg-background-tertiary animate-pulse rounded-md h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-metric-grid">
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">{studentStats?.activeStudents ?? 0}</span>
                <span className="dashboard-metric-card__label">Studenti Attivi</span>
              </div>
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">{studentStats?.completionRate ?? 0}%</span>
                <span className="dashboard-metric-card__label">Tasso Completamento</span>
              </div>
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">{studentStats?.averageScore ?? 0}</span>
                <span className="dashboard-metric-card__label">Score Medio</span>
              </div>
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">{studentStats?.totalSimulations ?? 0}</span>
                <span className="dashboard-metric-card__label">Simulazioni Totali</span>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-section" aria-labelledby="charts-analytics">
          <div className="dashboard-section__header">
            <div>
              <h2 id="charts-analytics" className="dashboard-section__title">Analisi e Grafici</h2>
              <p className="dashboard-section__description">
                Visualizzazione delle tendenze e distribuzioni delle performance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Trend Performance
              </h3>
              <div className="h-64 bg-background-secondary rounded-md flex items-center justify-center">
                <div className="text-center text-text-tertiary">
                  <div>Grafico delle performance nel tempo</div>
                  <div className="text-sm mt-1">(Da implementare con chart library)</div>
                </div>
              </div>
            </div>

            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Distribuzione Punteggi
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">90-100</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-background-tertiary rounded-full h-2">
                      <div className="bg-success-500 h-2 rounded-full progress-bar--25"></div>
                    </div>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">80-89</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-background-tertiary rounded-full h-2">
                      <div className="bg-accent-500 h-2 rounded-full progress-bar--35"></div>
                    </div>
                    <span className="text-sm font-medium">35%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">70-79</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-background-tertiary rounded-full h-2">
                      <div className="bg-warning-500 h-2 rounded-full progress-bar--25"></div>
                    </div>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">60-69</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-background-tertiary rounded-full h-2">
                      <div className="bg-secondary-500 h-2 rounded-full progress-bar--10"></div>
                    </div>
                    <span className="text-sm font-medium">10%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">60</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-background-tertiary rounded-full h-2">
                      <div className="bg-error-500 h-2 rounded-full progress-bar--5"></div>
                    </div>
                    <span className="text-sm font-medium">5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="performance-details">
          <div className="dashboard-section__header">
            <div>
              <h2 id="performance-details" className="dashboard-section__title">Dettagli Performance</h2>
              <p className="dashboard-section__description">
                Migliori performance e aree di miglioramento
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Migliori Performance
              </h3>
              <div className="dashboard-list" role="list">
                {[
                  { name: "Maria Neri", score: 95, improvement: "+8%" },
                  { name: "Luca Rossi", score: 92, improvement: "+5%" },
                  { name: "Anna Verde", score: 90, improvement: "+12%" },
                  { name: "Paolo Blu", score: 88, improvement: "+3%" },
                ].map((student, index) => (
                  <div key={index} className="dashboard-list__item" role="listitem">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center text-sm font-semibold text-accent-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="dashboard-activity-title">{student.name}</div>
                        <div className="dashboard-activity-meta">Score: {student.score}/100</div>
                      </div>
                    </div>
                    <div className="text-sm text-success-600 font-medium">
                      {student.improvement}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Aree di Miglioramento
              </h3>
              <div className="dashboard-list" role="list">
                {[
                  { topic: "Diagnosi Differenziale", avgScore: 65, trend: "down" },
                  { topic: "Gestione Emergenze", avgScore: 72, trend: "up" },
                  { topic: "Comunicazione Paziente", avgScore: 68, trend: "stable" },
                  { topic: "Procedure Invasive", avgScore: 70, trend: "up" },
                ].map((area, index) => (
                  <div key={index} className="dashboard-list__item" role="listitem">
                    <div>
                      <div className="dashboard-activity-title">{area.topic}</div>
                      <div className="dashboard-activity-meta">Score medio: {area.avgScore}/100</div>
                    </div>
                    <div className="text-sm">
                      {area.trend === "up" && <span className="text-success-600">↗ +2%</span>}
                      {area.trend === "down" && <span className="text-error-600">↘ -3%</span>}
                      {area.trend === "stable" && <span className="text-text-secondary">→ 0%</span>}
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