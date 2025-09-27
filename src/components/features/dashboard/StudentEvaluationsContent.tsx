"use client";

import { useState } from "react";
import {
  DIFFICULTY_LEVELS,
  getDifficultyAccessibleText,
  getDifficultyIconClass,
  getDifficultyIcon,
} from "~/lib/constants/difficulty";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

interface Evaluation {
  id: string;
  studentName: string;
  patientCase: string;
  score: number;
  completedAt: string;
  status: "completed" | "in-progress" | "failed";
  feedback: string;
  strengths: string[];
  improvements: string[];
  difficulty: 1 | 2 | 3;
  duration: number; // in minutes
}

export function StudentEvaluationsContent() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(
    null,
  );

  // Fetch evaluation statistics from API
  const { data: evaluationStats, isLoading: statsLoading } =
    api.dashboard.getStudentEvaluationStats.useQuery(undefined, {
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 3,
    });

  // Mock data - in real app this would come from API
  const evaluations: Evaluation[] = [
    {
      id: "1",
      studentName: "Giovanni Verdi",
      patientCase: "Mario Rossi - Ipertensione",
      score: 85,
      completedAt: "2024-09-03",
      status: "completed",
      feedback:
        "Buona gestione del caso clinico. Lo studente ha dimostrato competenze solide nella diagnosi e nel trattamento dell'ipertensione.",
      strengths: [
        "Anamnesi dettagliata e sistematica",
        "Corretta interpretazione dei parametri vitali",
        "Scelta terapeutica appropriata",
        "Comunicazione efficace con il paziente",
      ],
      improvements: [
        "Velocità nella gestione dell'emergenza",
        "Documentazione clinica più dettagliata",
      ],
      difficulty: DIFFICULTY_LEVELS.MEDIO,
      duration: 45,
    },
    {
      id: "2",
      studentName: "Maria Neri",
      patientCase: "Laura Bianchi - Diabete",
      score: 92,
      completedAt: "2024-09-02",
      status: "completed",
      feedback:
        "Eccellente performance. La studentessa ha gestito il caso con sicurezza e competenza, dimostrando una comprensione approfondita del diabete.",
      strengths: [
        "Diagnosi rapida e precisa",
        "Protocollo terapeutico seguito correttamente",
        "Monitoraggio continuo del paziente",
        "Comunicazione empatica e professionale",
        "Gestione delle complicanze acute",
      ],
      improvements: ["Documentazione clinica più dettagliata"],
      difficulty: DIFFICULTY_LEVELS.FACILE,
      duration: 38,
    },
    {
      id: "3",
      studentName: "Paolo Blu",
      patientCase: "Giuseppe Verde - Asma",
      score: 78,
      completedAt: "2024-09-01",
      status: "completed",
      feedback:
        "Performance soddisfacente con alcuni aspetti da migliorare nella gestione dell'asma acuto.",
      strengths: [
        "Riconoscimento dei sintomi respiratori",
        "Uso corretto dei dispositivi di somministrazione",
        "Monitoraggio della saturazione",
      ],
      improvements: [
        "Gestione delle vie aeree",
        "Protocolli di emergenza",
        "Comunicazione con il paziente in crisi",
        "Velocità di intervento",
      ],
      difficulty: DIFFICULTY_LEVELS.DIFFICILE,
      duration: 52,
    },
  ];

  const getStatusBadge = (status: string, score: number) => {
    if (status === "completed") {
      const statusClass =
        score >= 80
          ? "pill pill--sm status-tag status-tag--excellent bg-[var(--color-primary-violet)] text-white"
          : score >= 60
            ? "pill pill--sm status-tag status-tag--good bg-[var(--color-primary-yellow)] text-white"
            : "pill pill--sm status-tag status-tag--needs-improvement bg-[var(--color-primary-green)] text-white";
      return (
        <span className={statusClass}>
          {score >= 80 ? "Eccellente" : score >= 60 ? "Buono" : "Da migliorare"}
        </span>
      );
    }
    return (
      <span className="pill pill--sm status-tag status-tag--in-progress bg-[var(--color-primary-yellow)] text-white">
        In corso
      </span>
    );
  };


  return (
    <div className="dashboard-panel-stack">
      <section className="dashboard-section" aria-labelledby="evaluation-stats">
        <div className="dashboard-section__header">
          <div>
            <h2 id="evaluation-stats" className="dashboard-section__title">
              Statistiche Valutazioni
            </h2>
            <p className="dashboard-section__description">
              Panoramica delle performance degli studenti nelle simulazioni
            </p>
          </div>
        </div>

        {statsLoading ? (
          <div className="dashboard-metric-grid" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-metric-card">
                <div className="bg-background-tertiary mb-2 h-4 w-20 animate-pulse rounded-md" />
                <div className="bg-background-tertiary h-8 w-16 animate-pulse rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-metric-grid">
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.totalEvaluations ?? 0}
              </span>
              <span className="dashboard-metric-card__label">
                Valutazioni Totali
              </span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.completedEvaluations ?? 0}
              </span>
              <span className="dashboard-metric-card__label">Completate</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.inProgressEvaluations ?? 0}
              </span>
              <span className="dashboard-metric-card__label">In Corso</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.successRate ?? 0}%
              </span>
              <span className="dashboard-metric-card__label">
                Tasso Successo
              </span>
            </div>
          </div>
        )}
      </section>

      <section
        className="dashboard-section"
        aria-labelledby="evaluation-filters"
      >
        <div className="dashboard-section__header">
          <div>
            <h2 id="evaluation-filters" className="dashboard-section__title">
              Filtri e Ricerca
            </h2>
            <p className="dashboard-section__description">
              Filtra le valutazioni per stato e cerca studenti specifici
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="status-filter">
                Filtra per stato
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="auth-input"
              >
                <option value="all">Tutti</option>
                <option value="completed">Completate</option>
                <option value="in-progress">In corso</option>
                <option value="failed">Fallite</option>
              </select>
            </div>
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="student-search">
                Cerca studente
              </label>
              <input
                id="student-search"
                type="text"
                placeholder="Nome studente..."
                className="auth-input"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="evaluations-list">
        <div className="dashboard-section__header">
          <div>
            <h2 id="evaluations-list" className="dashboard-section__title">
              Elenco Valutazioni
            </h2>
            <p className="dashboard-section__description">
              Dettaglio delle valutazioni degli studenti
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Studente</th>
                  <th>Caso Clinico</th>
                  <th>Punteggio</th>
                  <th>Stato</th>
                  <th>Data</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td className="font-medium">{evaluation.studentName}</td>
                    <td>{evaluation.patientCase}</td>
                    <td className="font-semibold">{evaluation.score}/100</td>
                    <td>
                      {getStatusBadge(evaluation.status, evaluation.score)}
                    </td>
                    <td className="text-text-tertiary">
                      {evaluation.completedAt}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setSelectedEvaluation(evaluation.id)}
                        >
                          Visualizza
                        </Button>
                        <Button variant="ghost" size="sm">Report</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed View Modal */}
      {selectedEvaluation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvaluation(null)}
        >
          <div
            className="bg-background-tertiary pointer-events-auto max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const evaluation = evaluations.find(
                (e) => e.id === selectedEvaluation,
              );
              if (!evaluation) return null;

              return (
                <>
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-text-primary mb-2 text-xl font-semibold">
                        {evaluation.patientCase}
                      </h3>
                      <div className="text-text-secondary flex items-center gap-4 text-sm">
                        <span>Studente: {evaluation.studentName}</span>
                        <span>•</span>
                        <span>{evaluation.completedAt}</span>
                        <span>•</span>
                        <span>{evaluation.duration} min</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedEvaluation(null)}
                      variant="ghost"
                      size="icon"
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      ✕
                    </Button>
                  </div>

                  <div className="mb-6">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="patient-card-difficulty">
                        <span
                          className={getDifficultyIconClass(evaluation.difficulty)}
                          aria-label={getDifficultyAccessibleText(
                            evaluation.difficulty,
                          )}
                          role="img"
                        >
                          {getDifficultyIcon(evaluation.difficulty)}
                        </span>
                      </div>
                      <div
                        className={`pill pill--sm status-tag text-sm font-bold ${
                          evaluation.score >= 80
                            ? "status-tag--excellent"
                            : evaluation.score >= 60
                              ? "status-tag--good"
                              : "status-tag--needs-improvement"
                        }`}
                      >
                        {evaluation.score}/100
                      </div>
                      {getStatusBadge(evaluation.status, evaluation.score)}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-text-primary mb-2 font-semibold">
                      Feedback Generale
                    </h4>
                    <p className="text-text-secondary leading-relaxed">
                      {evaluation.feedback}
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-text-primary mb-3 font-semibold">
                      Punti di Forza
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-success-500 mt-1">✓</span>
                          <span className="text-text-secondary">
                            {strength}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-text-primary mb-3 font-semibold">
                      Aree di Miglioramento
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-warning-500 mt-1">!</span>
                          <span className="text-text-secondary">
                            {improvement}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline-primary" size="default" className="flex-1">
                      Genera Report
                    </Button>
                    <Button
                      variant="primary"
                      size="default"
                      className="flex-1"
                      onClick={() => setSelectedEvaluation(null)}
                    >
                      Chiudi
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
