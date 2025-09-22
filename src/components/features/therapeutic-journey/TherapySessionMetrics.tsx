/**
 * Therapy Session Metrics Component
 * 
 * Optimized metrics component with memoization for therapy session statistics
 */

"use client";

import { memo } from "react";

interface TherapySessionMetricsProps {
  inProgress: number;
  completed: number;
  averageProgress: number;
}

function TherapySessionMetricsComponent({ inProgress, completed, averageProgress }: TherapySessionMetricsProps) {
  return (
    <div className="dashboard-metric-grid">
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value" style={{ color: 'white' }}>
          {inProgress}
        </div>
        <div className="dashboard-metric-card__label">In Corso</div>
      </div>
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value" style={{ color: 'white' }}>
          {completed}
        </div>
        <div className="dashboard-metric-card__label">Completate</div>
      </div>
      <div className="dashboard-metric-card">
        <div className="dashboard-metric-card__value" style={{ color: 'white' }}>
          {averageProgress}%
        </div>
        <div className="dashboard-metric-card__label">Progresso Medio</div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const TherapySessionMetrics = memo(TherapySessionMetricsComponent);
