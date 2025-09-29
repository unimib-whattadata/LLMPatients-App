/**
 * Therapy Session Filters Component
 *
 * Optimized filter component with memoization for therapy sessions
 */

"use client";

import { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

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

const triggerBase =
  "min-w-[100px] rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:text-[var(--color-text-secondary)] data-[state=inactive]:bg-transparent";

const triggerVariants: Record<(typeof FILTER_OPTIONS)[number]["key"], string> = {
  all:
    "data-[state=active]:bg-[var(--color-primary-green)] data-[state=active]:text-[var(--color-text-primary)] hover:bg-[var(--color-primary-green)]/15",
  started:
    "data-[state=active]:bg-[var(--color-primary-green)] data-[state=active]:text-[var(--color-text-primary)] hover:bg-[var(--color-primary-green)]/15",
  "in-progress":
    "data-[state=active]:bg-[var(--color-primary-yellow)] data-[state=active]:text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-yellow)]/20",
  completed:
    "data-[state=active]:bg-[var(--color-primary-violet)] data-[state=active]:text-[var(--color-text-primary)] hover:bg-[var(--color-primary-violet)]/20",
};

function TherapySessionFiltersComponent({
  activeFilter,
  onFilterChange,
}: TherapySessionFiltersProps) {
  return (
    <Tabs
      value={activeFilter}
      onValueChange={onFilterChange}
      className="mb-6"
    >
      <TabsList className="grid grid-cols-2 gap-2 md:flex md:gap-3" aria-label="Filtri percorsi terapeutici">
        {FILTER_OPTIONS.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className={`${triggerBase} ${triggerVariants[tab.key]}`}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const TherapySessionFilters = memo(TherapySessionFiltersComponent);
