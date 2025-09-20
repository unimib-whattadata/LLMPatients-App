/**
 * Skeleton Loading Components
 * 
 * Reusable skeleton components for better loading states
 */

import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Base skeleton component
 */
export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-300 rounded ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * Dashboard metric card skeleton
 */
export function MetricCardSkeleton() {
  return (
    <div className="dashboard-metric-card">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

/**
 * Dashboard section skeleton
 */
export function SectionSkeleton() {
  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

/**
 * Dashboard list item skeleton
 */
export function ListItemSkeleton() {
  return (
    <div className="dashboard-list__item">
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

/**
 * Dashboard action card skeleton
 */
export function ActionCardSkeleton() {
  return (
    <div className="dashboard-action-card">
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

/**
 * Dashboard table skeleton
 */
export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th><Skeleton className="h-4 w-8" /></th>
            <th><Skeleton className="h-4 w-16" /></th>
            <th><Skeleton className="h-4 w-20" /></th>
            <th><Skeleton className="h-4 w-12" /></th>
            <th><Skeleton className="h-4 w-16" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><Skeleton className="h-4 w-8" /></td>
              <td><Skeleton className="h-4 w-20" /></td>
              <td><Skeleton className="h-4 w-24" /></td>
              <td><Skeleton className="h-4 w-12" /></td>
              <td><Skeleton className="h-8 w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
