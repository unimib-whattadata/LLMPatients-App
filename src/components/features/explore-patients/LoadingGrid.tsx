
import { PatientCardSkeleton } from "~/components/ui/skeleton-variants";

export function LoadingGrid() {
  return (
    <div
      className="grid gap-6 grid-cols-1 sm:grid-cols-2"
      role="status"
      aria-live="polite"
      aria-label="Loading patients"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <PatientCardSkeleton
          key={index}
          showAvatar={true}
          showButton={true}
        />
      ))}

      <span className="sr-only">Loading virtual patients...</span>
    </div>
  );
}
