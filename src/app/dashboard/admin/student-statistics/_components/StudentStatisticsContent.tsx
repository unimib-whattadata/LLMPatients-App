/**
 * Student Statistics Content Component
 * 
 * Interface for viewing aggregate student performance statistics
 * and analytics across all clinical simulations
 */

"use client";

import { useState } from "react";

export function StudentStatisticsContent() {
  const [timeRange, setTimeRange] = useState<string>("month");

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Statistiche Studenti
        </h1>
        <p className="text-gray-600">
          Analisi delle performance e dei progressi degli studenti
        </p>
      </div>

      {/* Time Range Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Periodo di riferimento:
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Ultima settimana</option>
            <option value="month">Ultimo mese</option>
            <option value="quarter">Ultimo trimestre</option>
            <option value="year">Ultimo anno</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1">156</div>
              <div className="text-sm text-gray-600">Studenti Attivi</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              👥
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600">
            +12% rispetto al mese scorso
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600 mb-1">89%</div>
              <div className="text-sm text-gray-600">Tasso Completamento</div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              ✅
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600">
            +5% rispetto al mese scorso
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600 mb-1">76</div>
              <div className="text-sm text-gray-600">Score Medio</div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600">
            +3% rispetto al mese scorso
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600 mb-1">234</div>
              <div className="text-sm text-gray-600">Simulazioni Totali</div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600">
            +18% rispetto al mese scorso
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Trend Performance
          </h3>
          <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div>Grafico delle performance nel tempo</div>
              <div className="text-sm mt-1">(Da implementare con chart library)</div>
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuzione Punteggi
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">90-100</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '25%'}}></div>
                </div>
                <span className="text-sm font-medium">25%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">80-89</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '35%'}}></div>
                </div>
                <span className="text-sm font-medium">35%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">70-79</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{width: '25%'}}></div>
                </div>
                <span className="text-sm font-medium">25%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">60-69</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{width: '10%'}}></div>
                </div>
                <span className="text-sm font-medium">10%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">60</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{width: '5%'}}></div>
                </div>
                <span className="text-sm font-medium">5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers and Areas for Improvement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Migliori Performance
          </h3>
          <div className="space-y-3">
            {[
              { name: "Maria Neri", score: 95, improvement: "+8%" },
              { name: "Luca Rossi", score: 92, improvement: "+5%" },
              { name: "Anna Verde", score: 90, improvement: "+12%" },
              { name: "Paolo Blu", score: 88, improvement: "+3%" },
            ].map((student, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-600">Score: {student.score}/100</div>
                  </div>
                </div>
                <div className="text-sm text-green-600 font-medium">
                  {student.improvement}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Areas Needing Attention */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aree di Miglioramento
          </h3>
          <div className="space-y-3">
            {[
              { topic: "Diagnosi Differenziale", avgScore: 65, trend: "down" },
              { topic: "Gestione Emergenze", avgScore: 72, trend: "up" },
              { topic: "Comunicazione Paziente", avgScore: 68, trend: "stable" },
              { topic: "Procedure Invasive", avgScore: 70, trend: "up" },
            ].map((area, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="font-medium text-gray-900">{area.topic}</div>
                  <div className="text-sm text-gray-600">Score medio: {area.avgScore}/100</div>
                </div>
                <div className="text-sm">
                  {area.trend === "up" && <span className="text-green-600">↗ +2%</span>}
                  {area.trend === "down" && <span className="text-red-600">↘ -3%</span>}
                  {area.trend === "stable" && <span className="text-gray-600">→ 0%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}