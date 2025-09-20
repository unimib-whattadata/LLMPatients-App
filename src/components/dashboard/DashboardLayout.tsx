/**
 * Dashboard Layout Component
 * 
 * Optimized shared layout for dashboard pages with:
 * - Memoized navigation
 * - Optimized section switching
 * - Better performance
 */

"use client";

import React, { useMemo, useCallback } from "react";

interface NavItem {
  key: string;
  label: string;
}

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  selectedSection: string;
  onSectionChange: (section: string) => void;
  children: React.ReactNode;
  meta?: React.ReactNode;
}

/**
 * Optimized dashboard layout with memoized components
 */
export const DashboardLayout = React.memo(function DashboardLayout({
  title,
  subtitle,
  navItems,
  selectedSection,
  onSectionChange,
  children,
  meta,
}: DashboardLayoutProps) {
  // Memoize navigation items to prevent unnecessary re-renders
  const memoizedNavItems = useMemo(() => navItems, [navItems]);

  // Memoize section change handler
  const handleSectionChange = useCallback((section: string) => {
    onSectionChange(section);
  }, [onSectionChange]);

  return (
    <div className="dashboard-panel-stack">
        <div className="dashboard-pill-nav" role="tablist" aria-label="Dashboard sections">
          {memoizedNavItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selectedSection === item.key}
              className={`dashboard-pill-nav__button ${selectedSection === item.key ? "is-active" : ""}`}
              onClick={() => handleSectionChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {children}
    </div>
  );
});

/**
 * Optimized section component for dashboard content
 */
export const DashboardSection = React.memo(function DashboardSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`dashboard-section ${className}`}>
      <div className="dashboard-section__header">
        <div>
          <h2 className="dashboard-section__title">{title}</h2>
          {description && (
            <p className="dashboard-section__description">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
});

/**
 * Optimized metric grid component
 */
export const MetricGrid = React.memo(function MetricGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`dashboard-metric-grid ${className}`}>
      {children}
    </div>
  );
});

/**
 * Optimized action grid component
 */
export const ActionGrid = React.memo(function ActionGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`dashboard-action-grid ${className}`}>
      {children}
    </div>
  );
});
