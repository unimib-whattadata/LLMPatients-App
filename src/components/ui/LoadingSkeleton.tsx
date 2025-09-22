/**
 * Loading Skeleton Component
 * 
 * Reusable loading skeleton component for better UX
 */

"use client";

import { memo } from "react";

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
  width?: string;
}

function LoadingSkeletonComponent({ 
  className = "", 
  lines = 1, 
  height = "h-4",
  width = "w-full"
}: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-background-tertiary rounded ${height} ${width} ${
            index < lines - 1 ? "mb-2" : ""
          }`}
        />
      ))}
    </div>
  );
}

export const LoadingSkeleton = memo(LoadingSkeletonComponent);
