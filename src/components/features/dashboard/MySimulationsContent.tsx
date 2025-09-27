/**
 * My Simulations Content Component
 *
 * Interface for accessing and managing personal clinical simulations
 * Shows available simulations, in-progress cases, and completed scenarios
 */

"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  DIFFICULTY_LEVELS,
  getDifficultyLabel,
  getDifficultyAccessibleText,
} from "~/lib/constants/difficulty";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

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

function MySimulationsContentComponent() {
  const [filter, setFilter] = useState<string>("all");

  // Mock data - in real app this would come from API
  const simulations: Simulation[] = useMemo(() => [
    {
      id: "1",
      title: "Gestione Ipertensione Acuta",
      patientName: "Mario Rossi",
      difficulty: DIFFICULTY_LEVELS.MEDIO,
      status: "completed",
      progress: 100,
      lastAccessed: "2024-09-03",
      score: 85,
    },
    {
      id: "2",
      title: "Crisi Diabetica",
      patientName: "Laura Bianchi",
      difficulty: DIFFICULTY_LEVELS.DIFFICILE,
      status: "in-progress",
      progress: 65,
      lastAccessed: "2024-09-03",
    },
    {
      id: "3",
      title: "Attacco Asmatico",
      patientName: "Giuseppe Verde",
      difficulty: DIFFICULTY_LEVELS.FACILE,
      status: "available",
      progress: 0,
    },
    {
      id: "4",
      title: "Trauma Cranico",
      patientName: "Anna Neri",
      difficulty: DIFFICULTY_LEVELS.DIFFICILE,
      status: "available",
      progress: 0,
    },
  ], []);

  // Memoized functions
  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      available: {
        class: "pill pill--sm status-tag status-tag--available bg-[#8B9769] text-white",
        text: "Disponibile",
      },
      "in-progress": {
        class: "pill pill--sm status-tag status-tag--in-progress bg-[#C69A39] text-white",
        text: "In corso",
      },
      completed: {
        class: "pill pill--sm status-tag status-tag--completed bg-[#9690B6] text-white",
        text: "Completata",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <span className={config.class}>{config.text}</span>;
  }, []);

  const getDifficultyClass = useCallback((difficulty: number) => {
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
  }, []);

  const getDifficultyIcon = useCallback((difficulty: number) => {
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
  }, []);

  // Memoized filtered simulations
  const filteredSimulations = useMemo(() => {
    if (filter === "all") return simulations;
    return simulations.filter((sim) => sim.status === filter);
  }, [simulations, filter]);

  // Memoized metrics calculation
  const metrics = useMemo(() => {
    const completed = simulations.filter(
      (s) => s.status === "completed",
    ).length;
    const inProgress = simulations.filter(
      (s) => s.status === "in-progress",
    ).length;
    const scoredSimulations = simulations.filter((s) => s.score);
    const averageScore =
      scoredSimulations.length > 0
        ? Math.round(
            scoredSimulations.reduce((acc, s) => acc + (s.score || 0), 0) /
              scoredSimulations.length,
          )
        : 0;

    return { completed, inProgress, averageScore };
  }, [simulations]);

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
            <h1 className="dashboard-section__title">Le Mie Simulazioni</h1>
            <p className="dashboard-section__description">
              Accedi alle simulazioni cliniche e monitora i tuoi progressi
            </p>
          </div>
        </div>

        <div className="dashboard-metric-grid">
          <div className="dashboard-metric-card">
            <div className="dashboard-metric-card__value">
              {metrics.completed}
            </div>
            <Badge variant="secondary" className="bg-[#C69A39] text-white">
              Simulazioni Completate
            </Badge>
          </div>
          <div className="dashboard-metric-card">
            <div className="dashboard-metric-card__value">
              {metrics.inProgress}
            </div>
            <Badge variant="secondary" className="bg-[#8B9769] text-white">In corso</Badge>
          </div>
          <div className="dashboard-metric-card">
            <div className="dashboard-metric-card__value">
              {metrics.averageScore}
            </div>
            <Badge variant="secondary" className="bg-[#9690B6] text-white">Score Medio</Badge>
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
        <div
          className="dashboard-pill-nav mb-6"
          role="tablist"
          aria-label="Filtri simulazioni"
        >
          {[
            { key: "all", label: "Tutte" },
            { key: "available", label: "Disponibili" },
            { key: "in-progress", label: "In corso" },
            { key: "completed", label: "Completate" },
          ].map((tab) => (
            <Button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              role="tab"
              aria-selected={filter === tab.key}
              variant={filter === tab.key ? "primary" : "outline-primary"}
              size="sm"
              className={`pill pill--interactive dashboard-pill-nav__button ${filter === tab.key ? "is-active" : ""}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="dashboard-action-grid">
          {filteredSimulations.map((simulation) => (
            <div key={simulation.id} className="dashboard-action-card">
              <div className="dashboard-action-card-content">
                <div className="dashboard-action-card-main">
                  <div className="mb-4 flex items-start justify-between">
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
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary text-sm">
                        Difficolta:
                      </span>
                      <div className="patient-card-difficulty">
                        <span
                          className={getDifficultyClass(simulation.difficulty)}
                          aria-label={getDifficultyAccessibleText(
                            simulation.difficulty,
                          )}
                          role="img"
                        >
                          {getDifficultyIcon(simulation.difficulty)}
                        </span>
                        <span className="text-sm font-medium">
                          {getDifficultyLabel(simulation.difficulty)}
                        </span>
                      </div>
                    </div>

                    {simulation.progress > 0 && (
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-text-secondary text-sm">
                            Progresso:
                          </span>
                          <span className="text-sm font-medium">
                            {simulation.progress}%
                          </span>
                        </div>
                        <div className="bg-background-tertiary h-2 w-full rounded-full">
                          <div
                            className="bg-accent-600 progress-bar-dynamic h-2 rounded-full"
                            style={{ width: `${simulation.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {simulation.score && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary text-sm">
                          Punteggio:
                        </span>
                        <span className="text-success-600 text-sm font-bold">
                          {simulation.score}/100
                        </span>
                      </div>
                    )}

                    {simulation.lastAccessed && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary text-sm">
                          Ultimo accesso:
                        </span>
                        <span className="text-text-tertiary text-sm">
                          {simulation.lastAccessed}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    {simulation.status === "available" && (
                      <Button variant="primary" size="default" className="w-full">
                        Inizia Simulazione
                      </Button>
                    )}
                    {simulation.status === "in-progress" && (
                      <Button variant="secondary" size="default" className="w-full">
                        Continua
                      </Button>
                    )}
                    {simulation.status === "completed" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="default" className="flex-1">
                          Rivedi
                        </Button>
                        <Button variant="primary" size="default" className="flex-1">
                          Ripeti
                        </Button>
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
            <h3 className="text-text-primary mb-2 text-lg font-medium">
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

// Memoize the component to prevent unnecessary re-renders
export const MySimulationsContent = memo(MySimulationsContentComponent);
