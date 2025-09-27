/**
 * Loading Card Component
 *
 * Optimized skeleton loading states for card-based content with consistent styling
 */

import { cn } from "~/lib/utils";
import { PatientCardSkeleton } from "~/components/ui/skeleton-variants";

interface LoadingCardProps {
  /**
   * Number of skeleton cards to display
   */
  count?: number;

  /**
   * Whether to show avatar placeholder
   */
  showAvatar?: boolean;

  /**
   * Whether to show button placeholder
   */
  showButton?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function LoadingCard({
  count = 1,
  showAvatar = true,
  showButton = true,
  className,
}: LoadingCardProps) {
  return (
    <div
      className={cn("grid gap-6 grid-cols-1 sm:grid-cols-2", className)}
      role="status"
      aria-live="polite"
      aria-label="Caricamento contenuto in corso"
    >
      {Array.from({ length: count }).map((_, index) => (
        <PatientCardSkeleton
          key={index}
          showAvatar={showAvatar}
          showButton={showButton}
        />
      ))}

      <span className="sr-only">Caricamento contenuto in corso...</span>
    </div>
  );
}
