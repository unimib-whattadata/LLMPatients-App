
"use client";

import { memo } from "react";
import { DashboardMetricCard } from "~/components/dashboard/ui";

interface TherapySessionMetricsProps {
  startedOrInProgress: number;
  completed: number;
  averageProgress: number;
}

function TherapySessionMetricsComponent({
  startedOrInProgress,
  completed,
  averageProgress,
}: TherapySessionMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <DashboardMetricCard
        value={startedOrInProgress}
        label="Started or In Progress"
      />
      <DashboardMetricCard
        value={completed}
        label="Completed"
      />
      <DashboardMetricCard
        value={`${averageProgress}%`}
        label="Average Progress"
      />
    </div>
  );
}


export const TherapySessionMetrics = memo(TherapySessionMetricsComponent);
