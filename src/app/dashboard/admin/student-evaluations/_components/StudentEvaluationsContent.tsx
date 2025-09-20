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
      const bgColor = score >= 80 ? "bg-green-100 text-green-800" : score >= 60 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
          {score >= 80 ? "Eccellente" : score >= 60 ? "Buono" : "Da migliorare"}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        In corso
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Valutazioni Studenti
        </h1>
        <p className="text-gray-600">
          Monitora e gestisci le valutazioni delle simulazioni cliniche
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600 mb-1">24</div>
          <div className="text-sm text-gray-600">Valutazioni Totali</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600 mb-1">18</div>
          <div className="text-sm text-gray-600">Completate</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600 mb-1">4</div>
          <div className="text-sm text-gray-600">In Corso</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900 mb-1">82%</div>
          <div className="text-sm text-gray-600">Tasso Successo</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtra per stato
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="completed">Completate</option>
              <option value="in-progress">In corso</option>
              <option value="failed">Fallite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cerca studente
            </label>
            <input
              type="text"
              placeholder="Nome studente..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Elenco Valutazioni
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Studente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caso Clinico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Punteggio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {evaluation.studentName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{evaluation.patientCase}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {evaluation.score}/100
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(evaluation.status, evaluation.score)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {evaluation.completedAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">
                      Visualizza
                    </button>
                    <button className="text-gray-600 hover:text-gray-800">
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