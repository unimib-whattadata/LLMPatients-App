/**
 * LoadingGrid Component
 * Enhanced loading component for patient cards
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
          <div className="loading-card-avatar bg-background-tertiary animate-pulse rounded-none" />

          <div className="loading-card-content">
            <div className="loading-card-title bg-background-tertiary animate-pulse rounded-md h-6 w-3/4 mb-2" />
            <div className="space-y-3">
              <div className="loading-card-text bg-background-tertiary animate-pulse rounded-md h-4 w-full" />
              <div className="loading-card-text bg-background-tertiary animate-pulse rounded-md h-4 w-5/6" />
              <div className="loading-card-text bg-background-tertiary animate-pulse rounded-md h-4 w-4/5" />
            </div>
            <div className="loading-card-button bg-background-tertiary animate-pulse rounded-md h-10 w-full" />
          </div>
        </div>
      ))}

      <span className="sr-only">Caricamento pazienti virtuali in corso...</span>
    </div>
  );
}
