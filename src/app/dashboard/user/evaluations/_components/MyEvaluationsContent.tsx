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

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      "Facile": "bg-success-50 text-success-700",
      "Medio": "bg-secondary-100 text-secondary-800",
      "Difficile": "bg-red-100 text-red-800"
    };
    return colors[difficulty as keyof typeof colors] || "bg-background-tertiary text-text-primary";
  };

  const averageScore = evaluations.length > 0 
    ? Math.round(evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0) / evaluations.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Le Mie Valutazioni
        </h1>
        <p className="text-text-secondary">
          Visualizza i risultati delle tue simulazioni e i feedback ricevuti
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {evaluations.length}
          </div>
          <div className="text-sm text-text-secondary">Valutazioni Totali</div>
        </div>
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-success-600 mb-1">
            {averageScore}
          </div>
          <div className="text-sm text-text-secondary">Score Medio</div>
        </div>
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {Math.max(...evaluations.map(e => e.score), 0)}
          </div>
          <div className="text-sm text-text-secondary">Miglior Score</div>
        </div>
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {evaluations.filter(e => e.score >= 80).length}
          </div>
          <div className="text-sm text-text-secondary">Eccellenti (80+)</div>
        </div>
      </div>

      {/* Evaluations List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Cronologia Valutazioni
          </h3>
          {evaluations.map((evaluation) => (
            <div 
              key={evaluation.id}
              className={`bg-background-secondary rounded-lg border border-border-primary p-4 cursor-pointer transition-all duration-200 ${
                selectedEvaluation === evaluation.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedEvaluation(evaluation.id)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-text-primary">
                    {evaluation.simulationTitle}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Paziente: {evaluation.patientName}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {evaluation.completedAt}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full font-bold ${getScoreColor(evaluation.score, evaluation.maxScore)}`}>
                    {evaluation.score}/{evaluation.maxScore}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(evaluation.difficulty)}`}>
                    {evaluation.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-background-tertiary rounded-full h-2">
                <div 
                  className="bg-accent-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(evaluation.score / evaluation.maxScore) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed View */}
        <div className="lg:sticky lg:top-6">
          {selectedEvaluation ? (
            (() => {
              const evaluation = evaluations.find(e => e.id === selectedEvaluation);
              if (!evaluation) return null;
              
              return (
                <div className="bg-background-secondary rounded-lg border border-border-primary p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      {evaluation.simulationTitle}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span>Paziente: {evaluation.patientName}</span>
                      <span>•</span>
                      <span>{evaluation.completedAt}</span>
                    </div>
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
                          <span className="text-orange-500 mt-1">!</span>
                          <span className="text-text-secondary">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-border-primary">
                    <button className="w-full px-4 py-2 bg-accent-600 text-text-primary rounded-md hover:bg-accent-700 transition-colors duration-200">
                      Ripeti Simulazione
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-background-secondary rounded-lg p-8 text-center">
              <ClipboardDocumentIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Seleziona una valutazione
              </h3>
              <p className="text-text-secondary">
                Clicca su una valutazione per vedere i dettagli e il feedback
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}