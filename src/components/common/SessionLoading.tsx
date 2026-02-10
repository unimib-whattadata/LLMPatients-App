import { Skeleton } from "~/components/ui/skeleton";
import { SessionCardSkeleton } from "~/components/ui/skeleton-variants";

export function SessionLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-4 w-44" />
        <Skeleton variant="heading" className="h-8 w-72" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SessionCardSkeleton />
        <SessionCardSkeleton />
        <SessionCardSkeleton className="hidden xl:block" />
      </div>
    </div>
  );
}
