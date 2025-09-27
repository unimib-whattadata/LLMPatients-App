/**
 * Therapy Session Filters Component
 *
 * Optimized filter component with memoization for therapy sessions
 */

"use client";

import { memo } from "react";
import { Button } from "~/components/ui/button";

interface TherapySessionFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FILTER_OPTIONS = [
  { key: "all", label: "Tutti" },
  { key: "started", label: "Iniziato" },
  { key: "in-progress", label: "In corso" },
  { key: "completed", label: "Completato" },
] as const;

function TherapySessionFiltersComponent({
  activeFilter,
  onFilterChange,
}: TherapySessionFiltersProps) {
  return (
    <div
      className="dashboard-pill-nav mb-6"
      role="tablist"
      aria-label="Filtri percorsi terapeutici"
    >
      {FILTER_OPTIONS.map((tab) => {
        const getButtonClass = (key: string, isActive: boolean) => {
          if (!isActive) return "filter-button-inactive";
          
          switch (key) {
            case "started":
              return "filter-button-started";
            case "in-progress":
              return "filter-button-in-progress";
            case "completed":
              return "filter-button-completed";
            default:
              return "filter-button-started";
          }
        };

        return (
          <Button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            role="tab"
            aria-selected={activeFilter === tab.key}
            variant="default"
            size="sm"
            className={`pill pill--interactive dashboard-pill-nav__button ${getButtonClass(tab.key, activeFilter === tab.key)}`}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const TherapySessionFilters = memo(TherapySessionFiltersComponent);
