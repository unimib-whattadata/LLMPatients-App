"use client";

import { useState } from "react";
import {
  DIFFICULTY_LEVELS,
  getDifficultyAccessibleText,
  getDifficultyIconClass,
  getDifficultyIcon,
} from "~/lib/constants/difficulty";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { AlertTriangle, Check } from "lucide-react";

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
  difficulty: 1 | 2 | 3;
}

export function MyEvaluationsContent() {
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(
    null,
  );

  const evaluations: Evaluation[] = [
    {
      id: "1",
      simulationTitle: "Gestione Ipertensione Acuta",
      patientName: "Mario Rossi",
      completedAt: "2024-09-03",
      score: 85,
      maxScore: 100,
      difficulty: DIFFICULTY_LEVELS.MEDIO,
      feedback:
        "Ottima gestione della situazione clinica. Hai dimostrato buone competenze diagnostiche e terapeutiche.",
      strengths: [
        "Anamnesi completa e accurata",
        "Corretta interpretazione dei parametri vitali",
        "Scelta terapeutica appropriata",
      ],
      improvements: [
        "Comunicazione con il paziente da migliorare",
        "Velocità nella gestione dell'emergenza",
      ],
    },
    {
      id: "2",
      simulationTitle: "Attacco Asmatico",
      patientName: "Giuseppe Verde",
      completedAt: "2024-09-01",
      score: 92,
      maxScore: 100,
      difficulty: DIFFICULTY_LEVELS.FACILE,
      feedback:
        "Eccellente performance. Hai gestito il caso con sicurezza e competenza.",
      strengths: [
        "Diagnosi rapida e precisa",
        "Protocollo terapeutico seguito correttamente",
        "Monitoraggio continuo del paziente",
        "Comunicazione empatica",
      ],
      improvements: ["Documentazione clinica più dettagliata"],
    },
    {
      id: "3",
      simulationTitle: "Trauma Cranico",
      patientName: "Anna Neri",
      completedAt: "2024-08-28",
      score: 72,
      maxScore: 100,
      difficulty: DIFFICULTY_LEVELS.DIFFICILE,
      feedback:
        "Buon lavoro complessivo, ma ci sono alcuni aspetti da migliorare nella gestione delle emergenze neurologiche.",
      strengths: [
        "Valutazione neurologica sistematica",
        "Riconoscimento dei segni di allarme",
      ],
      improvements: [
        "Gestione delle vie aeree",
        "Protocolli di neuroprotezione",
        "Tempistica degli interventi",
        "Coordinamento con il team",
      ],
    },
  ];

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90)
      return "pill pill--sm status-tag status-tag--excellent";
    if (percentage >= 80) return "pill pill--sm status-tag status-tag--good";
    if (percentage >= 70)
      return "pill pill--sm status-tag status-tag--needs-improvement";
    return "pill pill--sm status-tag status-tag--needs-improvement";
  };


  const averageScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0) /
            evaluations.length,
        )
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
            <span className="dashboard-metric-card__value">
              {evaluations.length}
            </span>
            <span className="dashboard-metric-card__label">
              Valutazioni Totali
            </span>
          </div>
          <div className="dashboard-metric-card">
            <span className="dashboard-metric-card__value">{averageScore}</span>
            <span className="dashboard-metric-card__label">Score Medio</span>
          </div>
          <div className="dashboard-metric-card">
            <span className="dashboard-metric-card__value">
              {Math.max(...evaluations.map((e) => e.score), 0)}
            </span>
            <span className="dashboard-metric-card__label">Miglior Score</span>
          </div>
          <div className="dashboard-metric-card">
            <span className="dashboard-metric-card__value">
              {evaluations.filter((e) => e.score >= 80).length}
            </span>
            <span className="dashboard-metric-card__label">
              Eccellenti (80+)
            </span>
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
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="patient-card-difficulty mb-2">
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
                      <h3 className="dashboard-action-card__title mb-2">
                        {evaluation.simulationTitle}
                      </h3>
                      <p className="dashboard-action-card__description">
                        Paziente: {evaluation.patientName}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <div
                        className={`${getScoreColor(evaluation.score, evaluation.maxScore)} text-sm font-bold`}
                      >
                        {evaluation.score}/{evaluation.maxScore}
                      </div>
                      <span className="text-text-tertiary text-xs">
                        {evaluation.completedAt}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-text-secondary text-sm">
                          Punteggio:
                        </span>
                        <span className="text-sm font-medium">
                          {evaluation.score}%
                        </span>
                      </div>
                      <Progress
                        value={(evaluation.score / evaluation.maxScore) * 100}
                        className="h-2 bg-gray-700 [&>div]:!bg-[var(--color-primary-green)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background-secondary rounded-lg p-3 text-center">
                        <div className="text-success-600 text-lg font-semibold">
                          {evaluation.strengths.length}
                        </div>
                        <div className="text-text-secondary text-xs">
                          Punti di forza
                        </div>
                      </div>
                      <div className="bg-background-secondary rounded-lg p-3 text-center">
                        <div className="text-warning-600 text-lg font-semibold">
                          {evaluation.improvements.length}
                        </div>
                        <div className="text-text-secondary text-xs">
                          Aree di miglioramento
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <Button
                    className="w-full"
                    onClick={() => setSelectedEvaluation(evaluation)}
                  >
                    Visualizza Dettagli
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed View Modal */}
      <Dialog
        open={Boolean(selectedEvaluation)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvaluation(null);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] w-full max-w-2xl overflow-y-auto bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
          {selectedEvaluation ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvaluation.simulationTitle}</DialogTitle>
                <DialogDescription>
                  Paziente: {selectedEvaluation.patientName} • {selectedEvaluation.completedAt}
                </DialogDescription>
              </DialogHeader>

              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div
                  className={`${getScoreColor(selectedEvaluation.score, selectedEvaluation.maxScore)} text-sm font-semibold`}
                >
                  {selectedEvaluation.score}/{selectedEvaluation.maxScore}
                </div>
                <div className="patient-card-difficulty">
                  <span
                    className={getDifficultyIconClass(selectedEvaluation.difficulty)}
                    aria-label={getDifficultyAccessibleText(selectedEvaluation.difficulty)}
                    role="img"
                  >
                    {getDifficultyIcon(selectedEvaluation.difficulty)}
                  </span>
                </div>
              </div>

              <div className="mb-6 space-y-2">
                <h4 className="text-lg font-semibold">Feedback Generale</h4>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {selectedEvaluation.feedback}
                </p>
              </div>

              <div className="mb-6 space-y-3">
                <h4 className="text-lg font-semibold">Punti di Forza</h4>
                <ul className="space-y-2">
                  {selectedEvaluation.strengths.map((strength, index) => (
                    <li
                      key={`personal-strength-${index}`}
                      className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                    >
                      <Check className="mt-0.5 h-4 w-4 text-success-500" aria-hidden="true" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6 space-y-3">
                <h4 className="text-lg font-semibold">Aree di Miglioramento</h4>
                <ul className="space-y-2">
                  {selectedEvaluation.improvements.map((improvement, index) => (
                    <li
                      key={`personal-improvement-${index}`}
                      className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-500" aria-hidden="true" />
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
                <Button variant="outline" className="flex-1">
                  Ripeti Simulazione
                </Button>
                <Button className="flex-1" onClick={() => setSelectedEvaluation(null)}>
                  Chiudi
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
