/**
 * Page Skeleton Components
 * 
 * Reusable skeleton components for common page layouts
 */

"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

/**
 * Dashboard page skeleton - for main dashboard layout
 */
export function DashboardPageSkeleton() {
  return (
    <div className="dashboard-panel-stack">
      {/* Header skeleton */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="dashboard-metrics-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-metric-card">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content sections skeleton */}
      <div className="space-y-6">
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
      </div>
    </div>
  );
}

/**
 * Patient detail page skeleton
 */
export function PatientDetailSkeleton() {
  return (
    <div className="patient-detail-container">
      {/* Header skeleton */}
      <div className="patient-detail-header">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex space-x-3">
          <Skeleton className="h-10 w-24 rounded" />
          <Skeleton className="h-10 w-20 rounded" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="patient-detail-content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Therapy session timeline skeleton
 */
export function TherapySessionTimelineSkeleton() {
  return (
    <div className="therapy-session-timeline">
      {/* Header skeleton */}
      <div className="therapy-session-header">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="therapy-timeline">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="therapy-timeline-item">
            <div className="therapy-timeline-marker">
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="therapy-timeline-content">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Admin page skeleton
 */
export function AdminPageSkeleton() {
  return (
    <div className="admin-page-container">
      {/* Header skeleton */}
      <div className="admin-page-header">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex space-x-3">
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-24 rounded" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="admin-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-stat-card">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="admin-table-container">
        <Skeleton className="h-10 w-full mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="admin-table-row">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Generic page skeleton with customizable sections
 */
export function GenericPageSkeleton({ 
  showHeader = true, 
  showMetrics = false, 
  showContent = true,
  showTable = false 
}: {
  showHeader?: boolean;
  showMetrics?: boolean;
  showContent?: boolean;
  showTable?: boolean;
}) {
  return (
    <div className="generic-page-container">
      {/* Header skeleton */}
      {showHeader && (
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-32 rounded" />
              <Skeleton className="h-10 w-24 rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Metrics skeleton */}
      {showMetrics && (
        <div className="metrics-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metric-card">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Content skeleton */}
      {showContent && (
        <div className="page-content">
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      )}

      {/* Table skeleton */}
      {showTable && (
        <div className="table-container">
          <Skeleton className="h-10 w-full mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="table-row">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
