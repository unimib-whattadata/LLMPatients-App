/**
 * Skeleton Variants Component
 * 
 * Specialized skeleton components for different content types
 * Optimized for performance and realistic loading states
 */

import { Skeleton } from "./skeleton"
import { cn } from "~/lib/utils"

/**
 * Patient Card Skeleton
 * Optimized for patient card loading states
 */
export function PatientCardSkeleton({ 
  showAvatar = true, 
  showButton = true,
  className 
}: { 
  showAvatar?: boolean
  showButton?: boolean
  className?: string 
}) {
  return (
    <div className={cn("bg-background-secondary rounded-lg p-4 sm:p-6 h-full flex flex-col", className)}>
      {/* Patient Avatar */}
      {showAvatar && (
        <div className="flex flex-col items-center mb-4">
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      )}
      
      {/* Patient Info */}
      <div className="text-center mb-4">
        <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
        <Skeleton className="h-4 w-1/2 mx-auto mb-3" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
      </div>

      {/* Objectives */}
      <div className="flex-1 mb-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <div className="space-y-2">
          <div className="flex items-start">
            <Skeleton className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="flex items-start">
            <Skeleton className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-20" />
        <div className="flex items-center space-x-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      {/* Button */}
      {showButton && (
        <Skeleton className="h-10 w-full" />
      )}
    </div>
  )
}

/**
 * Patient Detail Skeleton
 * Optimized for patient detail page loading
 */
export function PatientDetailSkeleton() {
  return (
    <div className="bg-background-primary min-h-screen">
      {/* Header skeleton */}
      <header className="bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-48" />
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Aside skeleton */}
          <aside className="lg:col-span-1">
            <div className="bg-background-secondary overflow-hidden rounded-lg">
              <div className="flex flex-col items-center p-4 sm:p-6">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="mt-4 w-full space-y-2">
                  <Skeleton className="h-6 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="flex items-center justify-center mt-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-12 ml-2" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main section skeleton */}
          <section className="space-y-4 sm:space-y-6 lg:col-span-2">
            {/* Patient history article skeleton */}
            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </article>

            {/* Learning objectives article skeleton */}
            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                <div className="flex items-start">
                  <Skeleton className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <div className="flex items-start">
                  <Skeleton className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-start">
                  <Skeleton className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </article>

            {/* Start simulation article skeleton */}
            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-2 mb-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <Skeleton className="h-10 w-full" />
            </article>
          </section>
        </div>
      </main>
    </div>
  )
}

/**
 * Dashboard Card Skeleton
 * Optimized for dashboard card loading
 */
export function DashboardCardSkeleton({ 
  title = true,
  content = true,
  footer = true,
  className 
}: { 
  title?: boolean
  content?: boolean
  footer?: boolean
  className?: string 
}) {
  return (
    <div className={cn("bg-background-secondary rounded-lg p-4 sm:p-6", className)}>
      {title && (
        <div className="mb-4">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      )}
      
      {content && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      )}
      
      {footer && (
        <div className="mt-4 pt-4">
          <Skeleton className="h-8 w-24" />
        </div>
      )}
    </div>
  )
}

/**
 * Table Row Skeleton
 * Optimized for table loading states
 */
export function TableRowSkeleton({ 
  columns = 4,
  className 
}: { 
  columns?: number
  className?: string 
}) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * List Item Skeleton
 * Optimized for list loading states
 */
export function ListItemSkeleton({ 
  showAvatar = false,
  showIcon = false,
  className 
}: { 
  showAvatar?: boolean
  showIcon?: boolean
  className?: string 
}) {
  return (
    <div className={cn("flex items-center space-x-3 p-3", className)}>
      {showAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
      {showIcon && <Skeleton className="h-4 w-4" />}
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
