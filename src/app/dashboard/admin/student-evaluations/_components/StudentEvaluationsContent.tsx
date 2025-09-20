/**
 * Student Evaluations Content Component
 * 
 * Interface for viewing and managing student evaluation results
 * across all clinical simulations
 */

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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Valutazioni Studenti
        </h1>
        <p className="text-text-secondary">
          Monitora e gestisci le valutazioni delle simulazioni cliniche
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-accent-600 mb-1">24</div>
          <div className="text-sm text-text-secondary">Valutazioni Totali</div>
        </div>
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-success-600 mb-1">18</div>
          <div className="text-sm text-text-secondary">Completate</div>
        </div>
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-secondary-600 mb-1">4</div>
          <div className="text-sm text-text-secondary">In Corso</div>
        </div>
        <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-2xl font-bold text-text-primary mb-1">82%</div>
          <div className="text-sm text-text-secondary">Tasso Successo</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-background-secondary rounded-lg border border-border-primary p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Filtra per stato
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="completed">Completate</option>
              <option value="in-progress">In corso</option>
              <option value="failed">Fallite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Cerca studente
            </label>
            <input
              type="text"
              placeholder="Nome studente..."
              className="px-3 py-2 border border-border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-background-secondary rounded-lg border border-border-primary overflow-hidden">
        <div className="px-6 py-4 border-b border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary">
            Elenco Valutazioni
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-background-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Studente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Caso Clinico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Punteggio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-background-secondary divide-y divide-gray-200">
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-background-secondary">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-text-primary">
                      {evaluation.studentName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-primary">{evaluation.patientCase}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-text-primary">
                      {evaluation.score}/100
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(evaluation.status, evaluation.score)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-tertiary">
                    {evaluation.completedAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-accent-600 hover:text-blue-800 mr-3">
                      Visualizza
                    </button>
                    <button className="text-text-secondary hover:text-text-primary">
                      Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}