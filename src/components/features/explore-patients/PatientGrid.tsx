import type { Patient } from "~/server/api/routers/patients";
import { PatientCard } from "./PatientCard";
import { PatientGridLoading } from "~/components/ui";

interface PatientGridProps {
  patients: Patient[];
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
        <div className="patients-feedback" role="alert">
          <div className="patients-feedback-icon" aria-hidden="true"></div>
          <h3 className="patients-feedback-title">Errore nel caricamento</h3>
          <p className="patients-feedback-text">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="patient-card-button patients-feedback-button"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <PatientGridLoading />;
  }

  // Empty state
  if (patients.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="patients-feedback" role="status">
          <div className="patients-feedback-icon" aria-hidden="true">[SEARCH]</div>
          <h3 className="patients-feedback-title">Nessun paziente trovato</h3>
          <p className="patients-feedback-text">
            Non ci sono pazienti virtuali disponibili al momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="patient-grid"
      aria-label={`Griglia di ${patients.length} pazienti virtuali`}
      role="list"
    >
      {patients.map((patient) => (
        <PatientCard 
          key={patient.id} 
          patient={patient}
        />
      ))}
    </div>
  );
}
