/**
 * LoadingGrid Component
 * Enhanced loading component for patient cards using consistent skeleton system
 */

import { PatientCardSkeleton } from "~/components/ui/skeleton-variants";

export function LoadingGrid() {
  return (
    <div
      className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-label="Caricamento pazienti in corso"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <PatientCardSkeleton
          key={index}
          showAvatar={true}
          showButton={true}
        />
      ))}

      <span className="sr-only">Caricamento pazienti virtuali in corso...</span>
    </div>
  );
}
