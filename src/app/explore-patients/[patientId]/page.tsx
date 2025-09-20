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
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-accent-300 text-2xl"></span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Paziente non trovato</h1>
          <p className="text-text-tertiary mb-6">
            Il paziente richiesto non e disponibile o non esiste.
          </p>
          <Link
            href="/explore-patients"
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
        return "text-primary-200 bg-primary-800/20 border-primary-500";
      case "Medio":
        return "text-secondary-200 bg-secondary-800/20 border-secondary-500";
      case "Difficile":
        return "text-accent-200 bg-accent-800/20 border-accent-500";
      default:
        return "text-text-tertiary bg-background-primary/30 border-border-secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <div className="bg-background-secondary border-b border-border-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-text-tertiary mb-4">
            <Link href="/" className="hover:text-text-primary">
              Home
            </Link>
            <span>-&gt;</span>
            <Link href="/explore-patients" className="hover:text-text-primary">
              Esplora Pazienti
            </Link>
            <span>-&gt;</span>
            <span className="text-text-primary">{patient.name}</span>
          </nav>
          
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-text-primary">
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
            <div className="bg-background-secondary rounded-lg border border-border-secondary overflow-hidden">
              <PatientAvatar
                name={patient.name}
                avatarUrl={patient.avatarUrl}
                avatarType={patient.avatarType}
              />
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Eta</p>
                    <p className="text-text-primary font-medium">{patient.age} anni</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Genere</p>
                    <p className="text-text-primary font-medium capitalize">{patient.gender}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Condizione</p>
                    <p className="text-text-primary font-medium">{patient.condition}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Durata stimata</p>
                    <p className="text-text-primary font-medium">{patient.estimatedDuration} minuti</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Background */}
            <div className="bg-background-secondary rounded-lg border border-border-secondary p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Storia del paziente
              </h2>
              <p className="text-text-secondary leading-relaxed">
                {patient.background}
              </p>
            </div>

            {/* Objectives */}
            <div className="bg-background-secondary rounded-lg border border-border-secondary p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Obiettivi di apprendimento
              </h2>
              <ul className="space-y-3">
                {patient.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary-300 mr-3 mt-1">[OK]</span>
                    <span className="text-text-secondary">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            {patient.tags.length > 0 && (
              <div className="bg-background-secondary rounded-lg border border-border-secondary p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Caratteristiche cliniche
                </h2>
                <PatientTags tags={patient.tags} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-background-secondary rounded-lg border border-border-secondary p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Inizia la simulazione
              </h2>
              <p className="text-text-secondary mb-6">
                Sei pronto a iniziare l'interazione con {patient.name}? 
                La simulazione ti permettera di mettere in pratica le tue competenze cliniche 
                in un ambiente sicuro e controllato.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-text-primary font-medium py-3 px-6 rounded-md transition-colors duration-200">
                  Inizia simulazione
                </button>
                <Link
                  href="/explore-patients"
                  className="flex-1 bg-background-tertiary hover:bg-background-secondary text-text-primary font-medium py-3 px-6 rounded-md transition-colors duration-200 text-center"
                >
                  &lt;- Torna all'esplorazione
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
    <div className="min-h-screen bg-background-primary">
      {/* Header Skeleton */}
      <div className="bg-background-secondary border-b border-border-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-4 bg-background-tertiary rounded w-64 mb-4"></div>
          <div className="h-8 bg-background-tertiary rounded w-48"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-background-secondary rounded-lg border border-border-secondary overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-background-tertiary"></div>
              <div className="p-6 space-y-4">
                <div className="h-4 bg-background-tertiary rounded w-20"></div>
                <div className="h-6 bg-background-tertiary rounded w-32"></div>
                <div className="h-4 bg-background-tertiary rounded w-20"></div>
                <div className="h-6 bg-background-tertiary rounded w-24"></div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-background-secondary rounded-lg border border-border-secondary p-6 animate-pulse">
              <div className="h-6 bg-background-tertiary rounded w-48 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-background-tertiary rounded w-full"></div>
                <div className="h-4 bg-background-tertiary rounded w-4/5"></div>
                <div className="h-4 bg-background-tertiary rounded w-3/5"></div>
              </div>
            </div>
            
            <div className="bg-background-secondary rounded-lg border border-border-secondary p-6 animate-pulse">
              <div className="h-6 bg-background-tertiary rounded w-56 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-background-tertiary rounded w-full"></div>
                <div className="h-4 bg-background-tertiary rounded w-5/6"></div>
                <div className="h-4 bg-background-tertiary rounded w-4/5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
