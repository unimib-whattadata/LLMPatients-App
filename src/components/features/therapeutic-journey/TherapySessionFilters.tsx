/**
 * Therapy Session Filters Component
 * 
 * Optimized filter component with memoization for therapy sessions
 */

"use client";

import { memo } from "react";

interface TherapySessionFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FILTER_OPTIONS = [
  { key: "all", label: "Tutti" },
  { key: "started", label: "Iniziato" },
  { key: "in-progress", label: "In corso" },
  { key: "completed", label: "Completato" }
] as const;

function TherapySessionFiltersComponent({ activeFilter, onFilterChange }: TherapySessionFiltersProps) {
  return (
    <div className="dashboard-pill-nav mb-6" role="tablist" aria-label="Filtri percorsi terapeutici">
      {FILTER_OPTIONS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          role="tab"
          aria-selected={activeFilter === tab.key}
          className={`pill pill--interactive dashboard-pill-nav__button ${
            activeFilter === tab.key ? "is-active" : ""
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const TherapySessionFilters = memo(TherapySessionFiltersComponent);
