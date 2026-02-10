import { Suspense } from "react";

import { PatientList } from "./_components/PatientList";
import { DashboardSection, DashboardPanel } from "~/components/dashboard/ui";
import { Skeleton } from "~/components/ui/skeleton";
import { TableSkeleton } from "~/components/ui/skeleton-variants";

function PatientIndexFallback() {
  return (
    <DashboardSection
      title={<Skeleton variant="heading" className="h-8 w-56" />}
      description={<Skeleton variant="text" className="h-4 w-full max-w-xl" />}
      action={<Skeleton variant="button" className="h-10 w-36" />}
    >
      <DashboardPanel>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton variant="text" className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton variant="text" className="h-10 w-full max-w-md" />
              <Skeleton variant="button" className="h-10 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton variant="text" className="h-6 w-11 rounded-full" />
            <Skeleton variant="text" className="h-4 w-44" />
          </div>
        </div>
        <TableSkeleton columns={6} rows={10} />
      </DashboardPanel>
    </DashboardSection>
  );
}

export default function PatientIndexPage() {
  return (
    <Suspense fallback={<PatientIndexFallback />}>
      <PatientList />
    </Suspense>
  );
}
