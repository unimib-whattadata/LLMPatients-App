/**
 * My Simulations Content Component
 * 
 * Interface for accessing and managing personal clinical simulations
 * Shows available simulations, in-progress cases, and completed scenarios
 */

"use client";

import { useState } from "react";
import { DIFFICULTY_LEVELS, getDifficultyLabel, getDifficultyIconClass, getDifficultyAccessibleText } from "~/lib/constants/difficulty";

interface Simulation {
  id: string;
  title: string;
  patientName: string;
  difficulty: 1 | 2 | 3;
  status: "available" | "in-progress" | "completed";
  progress: number;
  lastAccessed?: string;
  score?: number;
}

export function MySimulationsContent() {
  const [filter, setFilter] = useState<string>("all");

  // Mock data - in real app this would come from API
  const simulations: Simulation[] = [
    {
      id: "1",
      title: "Gestione Ipertensione Acuta",
      patientName: "Mario Rossi",
      difficulty: DIFFICULTY_LEVELS.MEDIO,
      status: "completed",
      progress: 100,
      lastAccessed: "2024-09-03",
      score: 85
    },
    {
      id: "2",
      title: "Crisi Diabetica",
      patientName: "Laura Bianchi", 
      difficulty: DIFFICULTY_LEVELS.DIFFICILE,
      status: "in-progress",
      progress: 65,
      lastAccessed: "2024-09-03"
    },
    {
      id: "3",
      title: "Attacco Asmatico",
      patientName: "Giuseppe Verde",
      difficulty: DIFFICULTY_LEVELS.FACILE,
      status: "available",
      progress: 0
    },
    {
      id: "4",
      title: "Trauma Cranico",
      patientName: "Anna Neri",
      difficulty: DIFFICULTY_LEVELS.DIFFICILE, 
      status: "available",
      progress: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { class: "pill pill--sm status-tag status-tag--available", text: "Disponibile" },
      "in-progress": { class: "pill pill--sm status-tag status-tag--in-progress", text: "In corso" },
      completed: { class: "pill pill--sm status-tag status-tag--completed", text: "Completata" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={config.class}>
        {config.text}
      </span>
    );
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

  const filteredSimulations = simulations.filter(sim => {
    if (filter === "all") return true;
    return sim.status === filter;
  });

  return (
    <div className="dashboard-panel-stack">
      {/* Progress Overview Section */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h1 className="dashboard-section__title">Le Mie Simulazioni</h1>
            <p className="dashboard-section__description">
              Accedi alle simulazioni cliniche e monitora i tuoi progressi
            </p>
          </div>
        </div>

        <div className="dashboard-metric-grid">
          <div className="dashboard-metric-card">
            <div className="dashboard-metric-card__value" style={{ color: 'white' }}>
              {simulations.filter(s => s.status === "completed").length}
            </div>
            <div className="dashboard-metric-card__label">Simulazioni Completate</div>
          </div>
          <div className="dashboard-metric-card">
            <div className="dashboard-metric-card__value" style={{ color: 'white' }}>
              {simulations.filter(s => s.status === "in-progress").length}
            </div>
            <div className="dashboard-metric-card__label">In corso</div>
          </div>
          <div className="dashboard-metric-card">
            <div className="dashboard-metric-card__value" style={{ color: 'white' }}>
              {simulations.filter(s => s.score).length > 0 
                ? Math.round(simulations.filter(s => s.score).reduce((acc, s) => acc + (s.score || 0), 0) / simulations.filter(s => s.score).length)
                : 0}
            </div>
            <div className="dashboard-metric-card__label">Score Medio</div>
          </div>
        </div>
      </section>

      {/* Simulations Grid Section */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h2 className="dashboard-section__title">Simulazioni</h2>
            <p className="dashboard-section__description">
              Le tue simulazioni cliniche disponibili
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="dashboard-pill-nav mb-6" role="tablist" aria-label="Filtri simulazioni">
          {[
            { key: "all", label: "Tutte" },
            { key: "available", label: "Disponibili" },
            { key: "in-progress", label: "In corso" },
            { key: "completed", label: "Completate" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              role="tab"
              aria-selected={filter === tab.key}
              className={`pill pill--interactive dashboard-pill-nav__button ${filter === tab.key ? "is-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="dashboard-action-grid">
        {filteredSimulations.map((simulation) => (
          <div key={simulation.id} className="dashboard-action-card">
            <div className="dashboard-action-card-content">
              <div className="dashboard-action-card-main">
                <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="dashboard-action-card__title mb-1">
                  {simulation.title}
                </h3>
                <p className="dashboard-action-card__description">
                  Paziente: {simulation.patientName}
                </p>
              </div>
              {getStatusBadge(simulation.status)}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Difficolta:</span>
                <div className="patient-card-difficulty">
                  <span 
                    className={getDifficultyClass(simulation.difficulty)}
                    aria-label={getDifficultyAccessibleText(simulation.difficulty)}
                    role="img"
                  >
                    {getDifficultyIcon(simulation.difficulty)}
                  </span>
                  <span className="text-sm font-medium">{getDifficultyLabel(simulation.difficulty)}</span>
                </div>
              </div>

              {simulation.progress > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-text-secondary">Progresso:</span>
                    <span className="text-sm font-medium">{simulation.progress}%</span>
                  </div>
                  <div className="w-full bg-background-tertiary rounded-full h-2">
                    <div 
                      className="bg-accent-600 h-2 rounded-full"
                      style={{ width: `${simulation.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {simulation.score && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Punteggio:</span>
                  <span className="text-sm font-bold text-success-600">
                    {simulation.score}/100
                  </span>
                </div>
              )}

              {simulation.lastAccessed && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Ultimo accesso:</span>
                  <span className="text-sm text-text-tertiary">
                    {simulation.lastAccessed}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6">
              {simulation.status === "available" && (
                <button className="btn btn-primary w-full">
                  Inizia Simulazione
                </button>
              )}
              {simulation.status === "in-progress" && (
                <button className="btn btn-secondary w-full">
                  Continua
                </button>
              )}
              {simulation.status === "completed" && (
                <div className="flex gap-2">
                  <button className="btn btn-outline flex-1">
                    Rivedi
                  </button>
                  <button className="btn btn-success flex-1">
                    Ripeti
                  </button>
                </div>
              )}
            </div>
              </div>
            </div>
          </div>
        ))}
        </div>

        {filteredSimulations.length === 0 && (
          <div className="dashboard-empty-state">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Nessuna simulazione trovata
            </h3>
            <p className="text-text-secondary">
              Modifica i filtri per vedere piu simulazioni
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
