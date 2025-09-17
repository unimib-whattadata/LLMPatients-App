"use client";

import { api } from "~/trpc/react";
import { PatientGrid } from "./_components/PatientGrid";

/**
 * Esplora Pazienti Page
 * Enhanced main page for exploring virtual patients with improved styling
 */
export default function EsploraPazientiPage() {
  const { data: patients, isLoading, error } = api.patients.getExplorationPatients.useQuery();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Page Header */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border-b border-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <header className="text-center">
            <h1 className="text-5xl font-bold text-white mb-6 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Esplora Pazienti
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Scopri scenari clinici interattivi progettati per migliorare le tue competenze mediche. 
              Ogni paziente virtuale presenta sfide uniche e obiettivi di apprendimento specifici.
            </p>
          </header>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8">
        <PatientGrid 
          patients={patients || []} 
          isLoading={isLoading} 
          error={error?.message || null} 
        />
      </div>
    </div>
  );
}