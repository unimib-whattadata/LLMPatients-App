import type { Patient } from "~/server/api/routers/patients";
import { PatientCard } from "./PatientCard";
import { LoadingCard } from "~/components/common/LoadingCard";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

interface PatientGridProps {
  patients: Patient[];
  isLoading?: boolean;
  error?: string | null;
}

/**
 * PatientGrid Component
 * Enhanced responsive grid with loading states and error handling
 */
export function PatientGrid({
  patients,
  isLoading = false,
  error = null,
}: PatientGridProps) {
  // Error state
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold">Errore nel caricamento</h3>
              <p>{error}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Riprova
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingCard count={6} />;
  }

  // Empty state
  if (patients.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <h3 className="text-lg font-semibold">Nessun paziente trovato</h3>
          <p className="text-muted-foreground">
            Non ci sono pazienti virtuali disponibili al momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-6 grid-cols-1 sm:grid-cols-2"
      aria-label={`Griglia di ${patients.length} pazienti virtuali`}
      role="list"
    >
      {patients.map((patient) => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
