/**
 * Therapy Session Metrics Component
 *
 * Optimized metrics component with memoization for therapy session statistics
 */

"use client";

import { memo } from "react";

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
    <div className="dashboard-metric-grid">
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value">{startedOrInProgress}</div>
        <div className="dashboard-metric-card__label">Iniziate o In corso</div>
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
