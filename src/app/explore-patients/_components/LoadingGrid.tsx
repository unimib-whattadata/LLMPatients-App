/**
 * LoadingGrid Component
 * Enhanced loading skeleton for patient cards with improved animations
 */
export function LoadingGrid() {
  return (
    <div className="loading-grid" role="status" aria-label="Caricamento pazienti in corso">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="loading-card"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Avatar skeleton */}
          <div className="loading-card-avatar"></div>
          
          {/* Content skeleton */}
          <div className="loading-card-content">
            {/* Name skeleton */}
            <div className="loading-card-title"></div>
            
            {/* Description skeleton */}
            <div className="loading-card-text"></div>
            <div className="loading-card-text"></div>
            <div className="loading-card-text"></div>
            
            {/* Button skeleton */}
            <div className="loading-card-button"></div>
          </div>
        </div>
      ))}
      
      {/* Screen reader text */}
      <span className="sr-only">Caricamento pazienti virtuali in corso...</span>
    </div>
  );
}