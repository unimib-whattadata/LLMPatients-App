import type { VirtualPatient } from "~/server/api/routers/patients";
import { PatientCard } from "./PatientCard";
import { LoadingGrid } from "./LoadingGrid";

interface PatientGridProps {
  patients: VirtualPatient[];
  isLoading?: boolean;
  error?: string | null;
}

/**
 * PatientGrid Component
 * Enhanced responsive grid with loading states and error handling
 */
export function PatientGrid({ patients, isLoading = false, error = null }: PatientGridProps) {
  // Error state
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            Errore nel caricamento
          </h3>
          <p className="text-gray-400 mb-4">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="patient-card-button max-w-xs"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingGrid />;
  }

  // Empty state
  if (patients.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            Nessun paziente trovato
          </h3>
          <p className="text-gray-400">
            Non ci sono pazienti virtuali disponibili al momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section 
      className="patient-grid"
      aria-label={`Griglia di ${patients.length} pazienti virtuali`}
      role="region"
    >
      {patients.map((patient, index) => (
        <PatientCard 
          key={patient.id} 
          patient={patient}
        />
      ))}
    </section>
  );
}