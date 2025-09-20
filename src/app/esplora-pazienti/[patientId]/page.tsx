"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { PatientAvatar } from "../_components/PatientAvatar";
import { PatientTags } from "../_components/PatientTags";

/**
 * Individual Patient Detail Page
 * Shows detailed information about a specific virtual patient
 */
export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;

  const { data: patient, isLoading, error } = api.patients.getPatientById.useQuery(
    { id: patientId },
    { enabled: !!patientId }
  );

  if (isLoading) {
    return <PatientDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl"></span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Paziente non trovato</h1>
          <p className="text-gray-400 mb-6">
            Il paziente richiesto non è disponibile o non esiste.
          </p>
          <Link
            href="/esplora-pazienti"
            className="btn btn-primary"
          >
            Torna all'esplorazione
          </Link>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Facile":
        return "text-green-400 bg-green-900/30 border-green-700";
      case "Medio":
        return "text-yellow-400 bg-yellow-900/30 border-yellow-700";
      case "Difficile":
        return "text-red-400 bg-red-900/30 border-red-700";
      default:
        return "text-gray-400 bg-gray-900/30 border-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span>→</span>
            <Link href="/esplora-pazienti" className="hover:text-white">
              Esplora Pazienti
            </Link>
            <span>→</span>
            <span className="text-white">{patient.name}</span>
          </nav>
          
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">
              {patient.name}
            </h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getDifficultyColor(patient.difficulty)}`}>
              {patient.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Image and Basic Info */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <PatientAvatar
                name={patient.name}
                avatarUrl={patient.avatarUrl}
                avatarType={patient.avatarType}
              />
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Età</p>
                    <p className="text-white font-medium">{patient.age} anni</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Genere</p>
                    <p className="text-white font-medium capitalize">{patient.gender}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Condizione</p>
                    <p className="text-white font-medium">{patient.condition}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Durata stimata</p>
                    <p className="text-white font-medium">{patient.estimatedDuration} minuti</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Background */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Storia del paziente
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {patient.background}
              </p>
            </div>

            {/* Objectives */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Obiettivi di apprendimento
              </h2>
              <ul className="space-y-3">
                {patient.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-400 mr-3 mt-1">✓</span>
                    <span className="text-gray-300">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            {patient.tags.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Caratteristiche cliniche
                </h2>
                <PatientTags tags={patient.tags} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Inizia la simulazione
              </h2>
              <p className="text-gray-300 mb-6">
                Sei pronto a iniziare l'interazione con {patient.name}? 
                La simulazione ti permetterà di mettere in pratica le tue competenze cliniche 
                in un ambiente sicuro e controllato.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200">
                  Inizia simulazione
                </button>
                <Link
                  href="/esplora-pazienti"
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 text-center"
                >
                  ← Torna all'esplorazione
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for patient detail page
 */
function PatientDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header Skeleton */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-4 bg-gray-700 rounded w-64 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-48"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-700"></div>
              <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-700 rounded w-20"></div>
                <div className="h-6 bg-gray-700 rounded w-32"></div>
                <div className="h-4 bg-gray-700 rounded w-20"></div>
                <div className="h-6 bg-gray-700 rounded w-24"></div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-700 rounded w-4/5"></div>
                <div className="h-4 bg-gray-700 rounded w-3/5"></div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-56 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-700 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}