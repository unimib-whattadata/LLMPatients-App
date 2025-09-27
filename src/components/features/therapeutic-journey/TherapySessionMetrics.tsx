/**
 * Therapy Session Metrics Component
 *
 * Optimized metrics component with memoization for therapy session statistics
 */

"use client";

import { memo } from "react";
import { Badge } from "~/components/ui/badge";

interface TherapySessionMetricsProps {
  inProgress: number;
  completed: number;
  averageProgress: number;
}

function TherapySessionMetricsComponent({
  inProgress,
  completed,
  averageProgress,
}: TherapySessionMetricsProps) {
  return (
    <div className="dashboard-metric-grid">
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value">{inProgress}</div>
        <Badge variant="secondary" className="bg-[#8B9769] text-white">In Corso</Badge>
      </div>
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value">{completed}</div>
        <Badge variant="secondary" className="bg-[#C69A39] text-white">Completate</Badge>
      </div>
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value">{averageProgress}%</div>
        <Badge variant="secondary" className="bg-[#9690B6] text-white">Progresso Medio</Badge>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const TherapySessionMetrics = memo(TherapySessionMetricsComponent);
