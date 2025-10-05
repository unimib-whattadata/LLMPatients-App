
import { Skeleton } from "./skeleton"
import { cn } from "~/lib/utils"

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
    <div className={cn("bg-[var(--color-surface-secondary)] rounded-lg p-4 sm:p-6 h-full flex flex-col", className)}>
      {}
      {showAvatar && (
        <div className="flex flex-col items-center mb-4">
          <Skeleton variant="avatar" className="h-16 w-16" />
        </div>
      )}
      
      {}
      <div className="text-center mb-4">
        <Skeleton variant="text" className="h-6 w-3/4 mx-auto mb-2" />
        <Skeleton variant="text" className="h-4 w-1/2 mx-auto mb-3" />
        <Skeleton variant="text" className="h-4 w-full mb-1" />
        <Skeleton variant="text" className="h-4 w-5/6 mx-auto" />
      </div>

      {}
      <div className="flex-1 mb-4">
        <Skeleton variant="text" className="h-4 w-20 mb-2" />
        <div className="space-y-2">
          <div className="flex items-start">
            <Skeleton variant="text" className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
            <Skeleton variant="text" className="h-4 w-4/5" />
          </div>
          <div className="flex items-start">
            <Skeleton variant="text" className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
            <Skeleton variant="text" className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {}
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" className="h-6 w-20" />
        <div className="flex items-center space-x-1">
          <Skeleton variant="text" className="h-4 w-4" />
          <Skeleton variant="text" className="h-4 w-12" />
        </div>
      </div>

      {}
      {showButton && (
        <Skeleton variant="button" className="h-10 w-full" />
      )}
    </div>
  )
}

export function PatientDetailSkeleton() {
  return (
    <div className="bg-[var(--color-page-background)] min-h-screen">
      {}
      <header className="bg-[var(--color-surface-secondary)]">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton variant="text" className="h-4 w-48" />
        </div>
      </header>

      {}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {}
          <aside className="lg:col-span-1">
            <div className="bg-[var(--color-surface-secondary)] overflow-hidden rounded-lg">
              <div className="flex flex-col items-center p-4 sm:p-6">
                <Skeleton variant="avatar" className="h-16 w-16" />
                <div className="mt-4 w-full space-y-2">
                  <Skeleton variant="text" className="h-6 w-3/4 mx-auto" />
                  <Skeleton variant="text" className="h-4 w-1/2 mx-auto" />
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-5/6" />
                  <div className="flex items-center justify-center mt-4">
                    <Skeleton variant="text" className="h-4 w-4" />
                    <Skeleton variant="text" className="h-4 w-12 ml-2" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {}
          <section className="space-y-4 sm:space-y-6 lg:col-span-2">
            {}
            <article className="bg-[var(--color-surface-secondary)] rounded-lg p-4 sm:p-6">
              <Skeleton variant="text" className="h-6 w-48 mb-4" />
              <div className="space-y-2">
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-5/6" />
                <Skeleton variant="text" className="h-4 w-4/5" />
              </div>
            </article>

            {}
            <article className="bg-[var(--color-surface-secondary)] rounded-lg p-4 sm:p-6">
              <Skeleton variant="text" className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                <div className="flex items-start">
                  <Skeleton variant="text" className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton variant="text" className="h-4 w-4/5" />
                </div>
                <div className="flex items-start">
                  <Skeleton variant="text" className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton variant="text" className="h-4 w-3/4" />
                </div>
                <div className="flex items-start">
                  <Skeleton variant="text" className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton variant="text" className="h-4 w-5/6" />
                </div>
              </div>
            </article>

            {}
            <article className="bg-[var(--color-surface-secondary)] rounded-lg p-4 sm:p-6">
              <Skeleton variant="text" className="h-6 w-48 mb-4" />
              <div className="space-y-2 mb-6">
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-5/6" />
              </div>
              <Skeleton variant="button" className="h-10 w-full" />
            </article>
          </section>
        </div>
      </main>
    </div>
  )
}

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
    <div className={cn("bg-[var(--color-surface-secondary)] rounded-lg p-4 sm:p-6", className)}>
      {title && (
        <div className="mb-4">
          <Skeleton variant="text" className="h-6 w-32 mb-2" />
          <Skeleton variant="text" className="h-4 w-48" />
        </div>
      )}
      
      {content && (
        <div className="space-y-3">
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-5/6" />
          <Skeleton variant="text" className="h-4 w-4/5" />
        </div>
      )}
      
      {footer && (
        <div className="mt-4 pt-4">
          <Skeleton variant="button" className="h-8 w-24" />
        </div>
      )}
    </div>
  )
}

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
          <Skeleton variant="text" className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

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
      {showAvatar && <Skeleton variant="avatar" className="h-8 w-8" />}
      {showIcon && <Skeleton variant="text" className="h-4 w-4" />}
      <div className="flex-1 space-y-1">
        <Skeleton variant="text" className="h-4 w-3/4" />
        <Skeleton variant="text" className="h-3 w-1/2" />
      </div>
    </div>
  )
}
