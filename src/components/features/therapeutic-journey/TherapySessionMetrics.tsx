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
        <div className="dashboard-metric-card__label">In Corso</div>
      </div>
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value">{completed}</div>
        <div className="dashboard-metric-card__label">Completate</div>
      </div>
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value">{averageProgress}%</div>
        <div className="dashboard-metric-card__label">Progresso Medio</div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const TherapySessionMetrics = memo(TherapySessionMetricsComponent);
