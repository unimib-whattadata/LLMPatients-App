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

export function PatientGrid({
  patients,
  isLoading = false,
  error = null,
}: PatientGridProps) {
  
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold">Loading error</h3>
              <p>{error}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  
  if (isLoading) {
    return <LoadingCard count={6} />;
  }

  
  if (patients.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <h3 className="text-lg font-semibold">No patient found</h3>
          <p className="text-muted-foreground">
            There are no virtual patients available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-6 grid-cols-1 sm:grid-cols-2"
      aria-label={`Grid of ${patients.length} virtual patients`}
      role="list"
    >
      {patients.map((patient) => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
