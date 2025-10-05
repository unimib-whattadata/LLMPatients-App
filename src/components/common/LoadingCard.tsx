
import { cn } from "~/lib/utils";
import { PatientCardSkeleton } from "~/components/ui/skeleton-variants";

interface LoadingCardProps {
    count?: number;

    showAvatar?: boolean;

    showButton?: boolean;

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
