/**
 * Loading Skeleton Component
 * 
 * Reusable loading skeleton component for better UX
 */

"use client";

import { memo } from "react";
import { cn } from "~/lib/utils/cn";
import { Skeleton } from "./Skeleton";

interface LoadingSkeletonProps {
  className?: string;
  lineClassName?: string;
  lines?: number;
  height?: string | number;
  width?: string | number;
  radius?: string | number;
  spacingClass?: string;
}

function LoadingSkeletonComponent({ 
  className = "", 
  lineClassName = "",
  lines = 1, 
  height = "h-4",
  width = "w-full",
  radius,
  spacingClass = "gap-2"
}: LoadingSkeletonProps) {
  return (
    <div className={cn("flex flex-col", spacingClass, className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            typeof height === "string" ? height : undefined,
            typeof width === "string" ? width : undefined,
            lineClassName,
          )}
          height={typeof height === "number" ? height : undefined}
          width={typeof width === "number" ? width : undefined}
          radius={radius}
        />
      ))}
    </div>
  );
}

export const LoadingSkeleton = memo(LoadingSkeletonComponent);
