/**
 * Therapy Session Card Skeleton Component
 * 
 * Loading skeleton for therapy session cards
 */

"use client";

import { memo } from "react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

function TherapySessionCardSkeletonComponent() {
  return (
    <div className="dashboard-action-card">
      <div className="dashboard-action-card-content">
        <div className="dashboard-action-card-main">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <LoadingSkeleton className="mb-2" height="h-5" width="w-3/4" />
              <LoadingSkeleton className="mb-1" height="h-4" width="w-1/2" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <LoadingSkeleton className="rounded-full" height="h-6" width="w-20" />
              <LoadingSkeleton className="rounded" height="h-3" width="w-16" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <LoadingSkeleton className="rounded" height="h-4" width="w-16" />
              <div className="flex items-center gap-2">
                <LoadingSkeleton className="rounded-full" height="h-4" width="w-4" />
                <LoadingSkeleton className="rounded" height="h-4" width="w-12" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <LoadingSkeleton className="rounded" height="h-4" width="w-16" />
                <LoadingSkeleton className="rounded" height="h-4" width="w-8" />
              </div>
              <LoadingSkeleton className="rounded-full" height="h-2" width="w-full" />
            </div>

            <div className="flex justify-between items-center">
              <LoadingSkeleton className="rounded" height="h-4" width="w-20" />
              <LoadingSkeleton className="rounded" height="h-4" width="w-12" />
            </div>
          </div>

          <div className="mt-6">
            <LoadingSkeleton className="rounded" height="h-10" width="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const TherapySessionCardSkeleton = memo(TherapySessionCardSkeletonComponent);
