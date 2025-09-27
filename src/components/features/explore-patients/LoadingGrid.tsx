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
        <div key={index} className="loading-card" style={{ backgroundColor: '#2E322B' }}>
          <div className="loading-card-avatar bg-gray-600 animate-pulse rounded-full h-16 w-16 mx-auto mb-4" />

          <div className="loading-card-content">
            <div className="loading-card-title bg-gray-600 mb-2 h-6 w-3/4 mx-auto animate-pulse rounded-md" />
            <div className="loading-card-badge bg-gray-600 h-6 w-20 mx-auto mb-4 animate-pulse rounded-md" />
            <div className="space-y-3">
              <div className="loading-card-text bg-gray-600 h-4 w-full animate-pulse rounded-md" />
              <div className="loading-card-text bg-gray-600 h-4 w-5/6 animate-pulse rounded-md" />
              <div className="loading-card-text bg-gray-600 h-4 w-4/5 animate-pulse rounded-md" />
            </div>
            <div className="loading-card-button bg-gray-600 h-10 w-full animate-pulse rounded-md" />
          </div>
        </div>
      ))}

      <span className="sr-only">Caricamento pazienti virtuali in corso...</span>
    </div>
  );
}
