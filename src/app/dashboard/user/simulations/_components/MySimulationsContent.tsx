/**
 * My Simulations Content Component
 * 
 * Interface for accessing and managing personal clinical simulations
 * Shows available simulations, in-progress cases, and completed scenarios
 */

"use client";

import { useState } from "react";

interface Simulation {
  id: string;
  title: string;
  patientName: string;
  difficulty: "Facile" | "Medio" | "Difficile";
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
      difficulty: "Medio",
      status: "completed",
      progress: 100,
      lastAccessed: "2024-09-03",
      score: 85
    },
    {
      id: "2",
      title: "Crisi Diabetica",
      patientName: "Laura Bianchi", 
      difficulty: "Difficile",
      status: "in-progress",
      progress: 65,
      lastAccessed: "2024-09-03"
    },
    {
      id: "3",
      title: "Attacco Asmatico",
      patientName: "Giuseppe Verde",
      difficulty: "Facile",
      status: "available",
      progress: 0
    },
    {
      id: "4",
      title: "Trauma Cranico",
      patientName: "Anna Neri",
      difficulty: "Difficile", 
      status: "available",
      progress: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { bg: "bg-blue-100 text-blue-800", text: "Disponibile" },
      "in-progress": { bg: "bg-yellow-100 text-yellow-800", text: "In corso" },
      completed: { bg: "bg-green-100 text-green-800", text: "Completata" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg}`}>
        {config.text}
      </span>
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      "Facile": "text-green-600",
      "Medio": "text-yellow-600", 
      "Difficile": "text-red-600"
    };
    return colors[difficulty as keyof typeof colors] || "text-gray-600";
  };

  const filteredSimulations = simulations.filter(sim => {
    if (filter === "all") return true;
    return sim.status === filter;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Le Mie Simulazioni
        </h1>
        <p className="text-gray-600">
          Accedi alle simulazioni cliniche e monitora i tuoi progressi
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {simulations.filter(s => s.status === "completed").length}
          </div>
          <div className="text-sm text-gray-600">Simulazioni Completate</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            {simulations.filter(s => s.status === "in-progress").length}
          </div>
          <div className="text-sm text-gray-600">In Corso</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {simulations.filter(s => s.score).length > 0 
              ? Math.round(simulations.filter(s => s.score).reduce((acc, s) => acc + (s.score || 0), 0) / simulations.filter(s => s.score).length)
              : 0}
          </div>
          <div className="text-sm text-gray-600">Score Medio</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Tutte" },
            { key: "available", label: "Disponibili" },
            { key: "in-progress", label: "In Corso" },
            { key: "completed", label: "Completate" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                filter === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSimulations.map((simulation) => (
          <div key={simulation.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {simulation.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Paziente: {simulation.patientName}
                  </p>
                </div>
                {getStatusBadge(simulation.status)}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Difficoltà:</span>
                  <span className={`text-sm font-medium ${getDifficultyColor(simulation.difficulty)}`}>
                    {simulation.difficulty}
                  </span>
                </div>

                {simulation.progress > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Progresso:</span>
                      <span className="text-sm font-medium">{simulation.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${simulation.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {simulation.score && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Punteggio:</span>
                    <span className="text-sm font-bold text-green-600">
                      {simulation.score}/100
                    </span>
                  </div>
                )}

                {simulation.lastAccessed && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ultimo accesso:</span>
                    <span className="text-sm text-gray-500">
                      {simulation.lastAccessed}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                {simulation.status === "available" && (
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
                    Inizia Simulazione
                  </button>
                )}
                {simulation.status === "in-progress" && (
                  <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-200">
                    Continua
                  </button>
                )}
                {simulation.status === "completed" && (
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200">
                      Rivedi
                    </button>
                    <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200">
                      Ripeti
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSimulations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nessuna simulazione trovata
          </h3>
          <p className="text-gray-600">
            Modifica i filtri per vedere più simulazioni
          </p>
        </div>
      )}
    </div>
  );
}