import { Skeleton } from "@/components/ui/Skeleton";

/**
 * LoadingGrid Component
 * Enhanced loading skeleton for patient cards
 */
export function LoadingGrid() {
  return (
    <div
      className="loading-grid"
      role="status"
      aria-live="polite"
      aria-label="Caricamento pazienti in corso"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="loading-card">
          <Skeleton className="loading-card-avatar" radius="rounded-none" />

          <div className="loading-card-content">
            <Skeleton className="loading-card-title" />
            <div className="space-y-3">
              <Skeleton className="loading-card-text" />
              <Skeleton className="loading-card-text" />
              <Skeleton className="loading-card-text" />
            </div>
            <Skeleton className="loading-card-button" />
          </div>
        </div>
      ))}

      <span className="sr-only">Caricamento pazienti virtuali in corso...</span>
    </div>
  );
}
