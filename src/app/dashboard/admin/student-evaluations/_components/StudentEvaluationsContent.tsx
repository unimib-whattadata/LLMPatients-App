"use client";

import { useState } from "react";

interface Evaluation {
  id: string;
  studentName: string;
  patientCase: string;
  score: number;
  completedAt: string;
  status: "completed" | "in-progress" | "failed";
}

export function StudentEvaluationsContent() {
  const [filter, setFilter] = useState<string>("all");
  
  // Mock data - in real app this would come from API
  const evaluations: Evaluation[] = [
    {
      id: "1",
      studentName: "Giovanni Verdi",
      patientCase: "Mario Rossi - Ipertensione",
      score: 85,
      completedAt: "2024-09-03",
      status: "completed"
    },
    {
      id: "2", 
      studentName: "Maria Neri",
      patientCase: "Laura Bianchi - Diabete",
      score: 92,
      completedAt: "2024-09-02",
      status: "completed"
    },
    {
      id: "3",
      studentName: "Paolo Blu",
      patientCase: "Giuseppe Verde - Asma",
      score: 78,
      completedAt: "2024-09-01",
      status: "completed"
    }
  ];

  const getStatusBadge = (status: string, score: number) => {
    if (status === "completed") {
      const bgColor = score >= 80 ? "bg-success-50 text-success-700" : score >= 60 ? "bg-secondary-100 text-secondary-800" : "bg-red-100 text-red-800";
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
          {score >= 80 ? "Eccellente" : score >= 60 ? "Buono" : "Da migliorare"}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent-100 text-blue-800">
        In corso
      </span>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-stack">
        <section className="dashboard-section" aria-labelledby="evaluation-stats">
          <div className="dashboard-section__header">
            <div>
              <h2 id="evaluation-stats" className="dashboard-section__title">Statistiche Valutazioni</h2>
              <p className="dashboard-section__description">
                Panoramica delle performance degli studenti nelle simulazioni
              </p>
            </div>
          </div>

          <div className="dashboard-metric-grid">
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">24</span>
              <span className="dashboard-metric-card__label">Valutazioni Totali</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">18</span>
              <span className="dashboard-metric-card__label">Completate</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">4</span>
              <span className="dashboard-metric-card__label">In Corso</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">82%</span>
              <span className="dashboard-metric-card__label">Tasso Successo</span>
            </div>
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="evaluation-filters">
          <div className="dashboard-section__header">
            <div>
              <h2 id="evaluation-filters" className="dashboard-section__title">Filtri e Ricerca</h2>
              <p className="dashboard-section__description">
                Filtra le valutazioni per stato e cerca studenti specifici
              </p>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="label" htmlFor="status-filter">
                  Filtra per stato
                </label>
                <select
                  id="status-filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">Tutti</option>
                  <option value="completed">Completate</option>
                  <option value="in-progress">In corso</option>
                  <option value="failed">Fallite</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label" htmlFor="student-search">
                  Cerca studente
                </label>
                <input
                  id="student-search"
                  type="text"
                  placeholder="Nome studente..."
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="evaluations-list">
          <div className="dashboard-section__header">
            <div>
              <h2 id="evaluations-list" className="dashboard-section__title">Elenco Valutazioni</h2>
              <p className="dashboard-section__description">
                Dettaglio delle valutazioni degli studenti
              </p>
            </div>
          </div>

          <div className="overflow-hidden border border-border-primary rounded-xl">
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
                      <td>{getStatusBadge(evaluation.status, evaluation.score)}</td>
                      <td className="text-text-tertiary">{evaluation.completedAt}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-outline">
                            Visualizza
                          </button>
                          <button className="btn btn-sm btn-ghost">
                            Report
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}