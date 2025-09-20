"use client";

import { useState } from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

interface Evaluation {
  id: string;
  simulationTitle: string;
  patientName: string;
  completedAt: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  difficulty: "Facile" | "Medio" | "Difficile";
}

export function MyEvaluationsContent() {
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);

  const evaluations: Evaluation[] = [
    {
      id: "1",
      simulationTitle: "Gestione Ipertensione Acuta",
      patientName: "Mario Rossi",
      completedAt: "2024-09-03",
      score: 85,
      maxScore: 100,
      difficulty: "Medio",
      feedback: "Ottima gestione della situazione clinica. Hai dimostrato buone competenze diagnostiche e terapeutiche.",
      strengths: [
        "Anamnesi completa e accurata",
        "Corretta interpretazione dei parametri vitali",
        "Scelta terapeutica appropriata"
      ],
      improvements: [
        "Comunicazione con il paziente da migliorare",
        "Velocità nella gestione dell'emergenza"
      ]
    },
    {
      id: "2",
      simulationTitle: "Attacco Asmatico",
      patientName: "Giuseppe Verde",
      completedAt: "2024-09-01",
      score: 92,
      maxScore: 100,
      difficulty: "Facile",
      feedback: "Eccellente performance. Hai gestito il caso con sicurezza e competenza.",
      strengths: [
        "Diagnosi rapida e precisa",
        "Protocollo terapeutico seguito correttamente",
        "Monitoraggio continuo del paziente",
        "Comunicazione empatica"
      ],
      improvements: [
        "Documentazione clinica più dettagliata"
      ]
    },
    {
      id: "3", 
      simulationTitle: "Trauma Cranico",
      patientName: "Anna Neri",
      completedAt: "2024-08-28",
      score: 72,
      maxScore: 100,
      difficulty: "Difficile",
      feedback: "Buon lavoro complessivo, ma ci sono alcuni aspetti da migliorare nella gestione delle emergenze neurologiche.",
      strengths: [
        "Valutazione neurologica sistematica",
        "Riconoscimento dei segni di allarme"
      ],
      improvements: [
        "Gestione delle vie aeree",
        "Protocolli di neuroprotezione",
        "Tempistica degli interventi",
        "Coordinamento con il team"
      ]
    }
  ];

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return "text-success-600 bg-success-50";
    if (percentage >= 80) return "text-accent-600 bg-accent-100";
    if (percentage >= 70) return "text-secondary-600 bg-secondary-100";
    return "text-error-600 bg-red-100";
  };

  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case "Facile":
        return "patient-card-difficulty-icon patient-card-difficulty-icon--easy";
      case "Medio":
        return "patient-card-difficulty-icon patient-card-difficulty-icon--medium";
      case "Difficile":
        return "patient-card-difficulty-icon patient-card-difficulty-icon--hard";
      default:
        return "patient-card-difficulty-icon";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "Facile":
        return "*";
      case "Medio":
        return "**";
      case "Difficile":
        return "***";
      default:
        return "*";
    }
  };

  const getDifficultyAccessibleText = (difficulty: string) => {
    switch (difficulty) {
      case "Facile":
        return "Livello facile";
      case "Medio":
        return "Livello medio";
      case "Difficile":
        return "Livello difficile";
      default:
        return "Livello non specificato";
    }
  };

  const averageScore = evaluations.length > 0 
    ? Math.round(evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0) / evaluations.length)
    : 0;

  return (
    <div className="dashboard-panel-stack">
        {/* Summary Stats */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h2 className="dashboard-section__title">Statistiche Generali</h2>
              <p className="dashboard-section__description">
                Panoramica delle tue performance nelle simulazioni completate
              </p>
            </div>
          </div>

          <div className="dashboard-metric-grid">
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">{evaluations.length}</span>
              <span className="dashboard-metric-card__label">Valutazioni Totali</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">{averageScore}</span>
              <span className="dashboard-metric-card__label">Score Medio</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">{Math.max(...evaluations.map(e => e.score), 0)}</span>
              <span className="dashboard-metric-card__label">Miglior Score</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">{evaluations.filter(e => e.score >= 80).length}</span>
              <span className="dashboard-metric-card__label">Eccellenti (80+)</span>
            </div>
          </div>
        </section>

        {/* Evaluations Grid */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h2 className="dashboard-section__title">Cronologia Valutazioni</h2>
              <p className="dashboard-section__description">
                Dettagli completi di ogni simulazione con feedback personalizzato
              </p>
            </div>
          </div>

          <div className="dashboard-action-grid">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="patient-card-difficulty mb-2">
                          <span 
                            className={getDifficultyClass(evaluation.difficulty)}
                            aria-label={getDifficultyAccessibleText(evaluation.difficulty)}
                            role="img"
                          >
                            {getDifficultyIcon(evaluation.difficulty)}
                          </span>
                          <span className="text-sm font-medium">{evaluation.difficulty}</span>
                        </div>
                        <h3 className="dashboard-action-card__title mb-2">
                          {evaluation.simulationTitle}
                        </h3>
                        <p className="dashboard-action-card__description">
                          Paziente: {evaluation.patientName}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className={`px-3 py-1 rounded-full font-bold text-sm ${getScoreColor(evaluation.score, evaluation.maxScore)}`}>
                          {evaluation.score}/{evaluation.maxScore}
                        </div>
                        <span className="text-xs text-text-tertiary">
                          {evaluation.completedAt}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-text-secondary">Punteggio:</span>
                          <span className="text-sm font-medium">{evaluation.score}%</span>
                        </div>
                        <div className="w-full bg-background-tertiary rounded-full h-2">
                          <div 
                            className="bg-accent-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(evaluation.score / evaluation.maxScore) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-background-secondary rounded-lg">
                          <div className="text-lg font-semibold text-success-600">{evaluation.strengths.length}</div>
                          <div className="text-xs text-text-secondary">Punti di forza</div>
                        </div>
                        <div className="text-center p-3 bg-background-secondary rounded-lg">
                          <div className="text-lg font-semibold text-warning-600">{evaluation.improvements.length}</div>
                          <div className="text-xs text-text-secondary">Aree di miglioramento</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      className="btn btn-primary w-full"
                      onClick={() => setSelectedEvaluation(evaluation.id)}
                    >
                      Visualizza Dettagli
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed View Modal */}
        {selectedEvaluation && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setSelectedEvaluation(null)}
          >
            <div 
              className="bg-background-tertiary rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const evaluation = evaluations.find(e => e.id === selectedEvaluation);
                if (!evaluation) return null;
                
                return (
                  <>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-text-primary mb-2">
                          {evaluation.simulationTitle}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                          <span>Paziente: {evaluation.patientName}</span>
                          <span>•</span>
                          <span>{evaluation.completedAt}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedEvaluation(null)}
                        className="text-text-tertiary hover:text-text-primary"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold text-text-primary mb-2">Feedback Generale</h4>
                      <p className="text-text-secondary leading-relaxed">
                        {evaluation.feedback}
                      </p>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold text-text-primary mb-3">Punti di Forza</h4>
                      <ul className="space-y-2">
                        {evaluation.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-success-500 mt-1">✓</span>
                            <span className="text-text-secondary">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold text-text-primary mb-3">Aree di Miglioramento</h4>
                      <ul className="space-y-2">
                        {evaluation.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-warning-500 mt-1">!</span>
                            <span className="text-text-secondary">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button className="btn btn-outline flex-1">
                        Ripeti Simulazione
                      </button>
                      <button 
                        className="btn btn-primary flex-1"
                        onClick={() => setSelectedEvaluation(null)}
                      >
                        Chiudi
                      </button>
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