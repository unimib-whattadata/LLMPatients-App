import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton } from "./skeleton"
import { cn } from "~/lib/utils"

/**
 * Premium Patient Card Skeleton
 * Matches the PatientCard design with animated loading states
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
    <div
      className={cn(
        "relative bg-[var(--color-surface-secondary)] p-5 sm:p-6 h-full flex flex-col",
        "border border-[var(--color-border-primary)]/40",
        "transition-all duration-300",
        className
      )}
      style={{ borderRadius: "1.1rem" }}
    >
      {/* Decorative top gradient line */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full overflow-hidden"
        style={{ background: 'linear-gradient(90deg, transparent, var(--color-skeleton-accent), transparent)' }}
      />

      {/* Avatar Section */}
      {showAvatar && (
        <div className="flex flex-col items-center mb-5">
          <SkeletonAvatar size="lg" intensity="subtle" />
        </div>
      )}

      {/* Name and Status Section */}
      <div className="text-center mb-5">
        <Skeleton variant="heading" className="h-6 w-3/4 mx-auto mb-3" delay={50} />
        <Skeleton variant="badge" className="h-5 w-24 mx-auto mb-4" delay={100} />
        <SkeletonText lines={2} widths={['100%', '80%']} className="items-center [&>div]:mx-auto" />
      </div>

      {/* Symptoms Section */}
      <div className="flex-1 mb-5">
        <Skeleton variant="text" className="h-4 w-20 mb-3" delay={200} />
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Skeleton variant="badge" className="h-2 w-2 flex-shrink-0" />
            <Skeleton variant="text" className="h-4 w-4/5" delay={250} />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="badge" className="h-2 w-2 flex-shrink-0" />
            <Skeleton variant="text" className="h-4 w-3/4" delay={300} />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="badge" className="h-2 w-2 flex-shrink-0" />
            <Skeleton variant="text" className="h-4 w-2/3" delay={350} />
          </div>
        </div>
      </div>

      {/* Difficulty and Duration Row */}
      <div className="flex items-center justify-between mb-5 py-3 border-t border-[var(--color-border-primary)]/30">
        <div className="flex items-center gap-2">
          <Skeleton variant="badge" className="h-6 w-20" delay={400} />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton variant="text" className="h-4 w-4 rounded-full" delay={450} />
          <Skeleton variant="text" className="h-4 w-14" delay={450} />
        </div>
      </div>

      {/* CTA Button */}
      {showButton && (
        <Skeleton
          variant="button"
          className="h-11 w-full bg-[var(--color-primary-green)]/10 border border-[var(--color-primary-green)]/20"
          delay={500}
        />
      )}
    </div>
  )
}

/**
 * Patient Detail Page Skeleton
 * Full page skeleton for patient detail view
 */
export function PatientDetailSkeleton() {
  return (
    <div className="bg-[var(--color-page-background)] min-h-screen">
      {/* Breadcrumb Header */}
      <header className="bg-[var(--color-surface-secondary)] border-b border-[var(--color-border-primary)]/40">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton variant="text" className="h-4 w-16" />
            <Skeleton variant="text" className="h-4 w-2" />
            <Skeleton variant="text" className="h-4 w-32" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

          {/* Sidebar - Patient Info Card */}
          <aside className="lg:col-span-1">
            <div
              className="bg-[var(--color-surface-secondary)] overflow-hidden border border-[var(--color-border-primary)]/40"
              style={{ borderRadius: "1.1rem" }}
            >
              <div className="flex flex-col items-center p-5 sm:p-6">
                <SkeletonAvatar size="xl" intensity="subtle" />
                <div className="mt-5 w-full space-y-3">
                  <Skeleton variant="heading" className="h-7 w-3/4 mx-auto" />
                  <Skeleton variant="badge" className="h-5 w-24 mx-auto" />

                  <div className="pt-4 border-t border-[var(--color-border-primary)]/30 mt-4">
                    <SkeletonText lines={3} widths={['100%', '90%', '75%']} />
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-4">
                    <Skeleton variant="badge" className="h-6 w-20" />
                    <Skeleton variant="text" className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Section */}
          <section className="space-y-5 sm:space-y-6 lg:col-span-2">

            {/* Medical History Card */}
            <article
              className="bg-[var(--color-surface-secondary)] p-5 sm:p-6 border border-[var(--color-border-primary)]/40"
              style={{ borderRadius: "1.1rem" }}
            >
              <Skeleton variant="heading" className="h-6 w-48 mb-5" />
              <SkeletonText lines={4} widths={['100%', '95%', '88%', '70%']} />
            </article>

            {/* Symptoms Card */}
            <article
              className="bg-[var(--color-surface-secondary)] p-5 sm:p-6 border border-[var(--color-border-primary)]/40"
              style={{ borderRadius: "1.1rem" }}
            >
              <Skeleton variant="heading" className="h-6 w-36 mb-5" />
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton variant="badge" className="h-2 w-2 flex-shrink-0" />
                    <Skeleton variant="text" className="h-4" style={{ width: `${85 - i * 10}%` }} delay={i * 50} />
                  </div>
                ))}
              </div>
            </article>

            {/* Conversation Card */}
            <article
              className="bg-[var(--color-surface-secondary)] p-5 sm:p-6 border border-[var(--color-border-primary)]/40"
              style={{ borderRadius: "1.1rem" }}
            >
              <Skeleton variant="heading" className="h-6 w-44 mb-5" />
              <SkeletonText lines={3} className="mb-6" />
              <Skeleton
                variant="button"
                className="h-11 w-full bg-[var(--color-primary-green)]/10 border border-[var(--color-primary-green)]/20"
              />
            </article>
          </section>
        </div>
      </main>
    </div>
  )
}

/**
 * Dashboard Card Skeleton
 * Generic card skeleton for dashboard sections
 */
export function DashboardCardSkeleton({
  title = true,
  content = true,
  footer = true,
  contentLines = 3,
  className
}: {
  title?: boolean
  content?: boolean
  footer?: boolean
  contentLines?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface-secondary)] p-5 sm:p-6",
        "border border-[var(--color-border-primary)]/40",
        className
      )}
      style={{ borderRadius: "1.1rem" }}
    >
      {title && (
        <div className="mb-5">
          <Skeleton variant="heading" className="h-6 w-36 mb-2" />
          <Skeleton variant="text" className="h-4 w-56" delay={50} />
        </div>
      )}

      {content && (
        <SkeletonText lines={contentLines} className="mb-4" />
      )}

      {footer && (
        <div className="mt-5 pt-4 border-t border-[var(--color-border-primary)]/30">
          <SkeletonButton size="sm" />
        </div>
      )}
    </div>
  )
}

/**
 * Dashboard Metric Card Skeleton
 * For stat/metric display cards
 */
export function DashboardMetricCardSkeleton({
  className
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface-secondary)] p-6",
        "border border-[var(--color-border-primary)]/40",
        "flex flex-col items-center justify-center text-center",
        className
      )}
      style={{ borderRadius: "1.1rem" }}
    >
      <Skeleton variant="text" className="h-10 w-20 mb-3" intensity="vibrant" />
      <Skeleton variant="text" className="h-3 w-24 uppercase" intensity="subtle" />
    </div>
  )
}

/**
 * Table Row Skeleton
 * For loading states in data tables
 */
export function TableRowSkeleton({
  columns = 4,
  className
}: {
  columns?: number
  className?: string
}) {
  return (
    <tr className={cn("border-b border-[var(--color-border-primary)]/20", className)}>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-4">
          <Skeleton
            variant="text"
            className="h-4"
            style={{ width: index === 0 ? '70%' : index === columns - 1 ? '50%' : '85%' }}
            delay={index * 30}
          />
        </td>
      ))}
    </tr>
  )
}

/**
 * Table Skeleton
 * Full table loading state
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className
}: {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--color-border-primary)]/40", className)}>
      <table className="w-full">
        {showHeader && (
          <thead className="bg-[var(--color-surface-tertiary)]/30">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <Skeleton
                    variant="text"
                    className="h-3 w-20"
                    intensity="subtle"
                  />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-[var(--color-surface-secondary)]">
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * List Item Skeleton
 * For list/feed loading states
 */
export function ListItemSkeleton({
  showAvatar = false,
  showIcon = false,
  showAction = false,
  className
}: {
  showAvatar?: boolean
  showIcon?: boolean
  showAction?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4",
        "border-b border-[var(--color-border-primary)]/20 last:border-b-0",
        className
      )}
    >
      {showAvatar && <SkeletonAvatar size="md" />}
      {showIcon && <Skeleton variant="text" className="h-5 w-5 flex-shrink-0" />}

      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="h-4 w-3/4" />
        <Skeleton variant="text" className="h-3 w-1/2" intensity="subtle" />
      </div>

      {showAction && <SkeletonButton size="sm" />}
    </div>
  )
}

/**
 * Session Card Skeleton
 * For therapy session cards
 */
export function SessionCardSkeleton({
  className
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative bg-[var(--color-surface-secondary)] p-5",
        "border border-[var(--color-border-primary)]/40",
        className
      )}
      style={{ borderRadius: "1.1rem" }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <Skeleton variant="heading" className="h-5 w-40 mb-2" />
          <Skeleton variant="badge" className="h-5 w-20" />
        </div>
      </div>

      {/* Description */}
      <SkeletonText lines={2} className="mb-4" />

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <Skeleton variant="text" className="h-3 w-16" />
          <Skeleton variant="text" className="h-3 w-8" />
        </div>
        <Skeleton variant="progress" className="h-2 w-full" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-primary)]/30">
        <div className="flex items-center gap-3">
          <Skeleton variant="badge" className="h-6 w-20" />
          <Skeleton variant="text" className="h-4 w-16" />
        </div>
        <SkeletonButton size="sm" />
      </div>
    </div>
  )
}

/**
 * Chat Message Skeleton
 * For chat/conversation loading states
 */
export function ChatMessageSkeleton({
  isPatient = true,
  className
}: {
  isPatient?: boolean
  className?: string
}) {
  const textWidths = isPatient ? ['95%', '78%', '56%'] : ['88%', '72%', '50%']

  return (
    <div
      className={cn(
        "flex px-2 py-1 sm:px-3",
        isPatient ? "justify-start" : "justify-end",
        className
      )}
    >
      <div
        className={cn(
          "flex max-w-2xl items-end gap-3",
          isPatient ? "flex-row" : "flex-row-reverse"
        )}
      >
        {isPatient && (
          <div className="flex flex-col items-center gap-2 pb-1">
            <SkeletonAvatar size="sm" className="h-9 w-9" />
            <Skeleton
              variant="badge"
              className="h-1.5 w-1.5 bg-[var(--color-primary-green)]/40"
              intensity="subtle"
            />
          </div>
        )}

        <div
          className={cn(
            "space-y-3 rounded-lg px-3 py-3.5 sm:px-4",
            isPatient
              ? "bg-[var(--color-chat-bubble-patient)]/45 rounded-bl-md"
              : "bg-[var(--color-chat-bubble-user)]/90 rounded-br-md"
          )}
        >
          <div className="space-y-2.5">
            <Skeleton
              variant="text"
              className="h-3.5 bg-white/20"
              style={{ width: textWidths[0] }}
              intensity="subtle"
            />
            <Skeleton
              variant="text"
              className="h-3.5 bg-white/20"
              style={{ width: textWidths[1] }}
              intensity="subtle"
            />
            <Skeleton
              variant="text"
              className="h-3.5 bg-white/20"
              style={{ width: textWidths[2] }}
              intensity="subtle"
            />
          </div>

          <div className={cn("flex", isPatient ? "justify-start" : "justify-end")}>
            <Skeleton
              variant="text"
              className="h-2.5 w-14 rounded-full bg-white/15"
              intensity="subtle"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Chat Page Skeleton
 * Full-page loading state that mirrors the chat layout
 */
export function ChatPageSkeleton({
  className
}: {
  className?: string
}) {
  return (
    <div className={cn("flex h-[calc(100vh-4rem)] flex-col bg-background", className)}>
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Skeleton variant="button" className="h-9 w-9 rounded-md" />
            <div className="min-w-0 space-y-2">
              <Skeleton variant="heading" className="h-6 w-56 sm:w-72" />
              <Skeleton variant="text" className="h-4 w-24" />
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <Skeleton variant="badge" className="h-8 w-16 rounded-md" />
            <Skeleton variant="button" className="h-9 w-9 rounded-md" />
            <Skeleton variant="button" className="hidden h-9 w-24 rounded-md sm:block" />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="page-background hidden w-48 flex-shrink-0 p-4 lg:flex" aria-hidden="true">
          <div className="flex w-full flex-col items-center gap-3 pt-4">
            <div className="rounded-[1.1rem] bg-[var(--color-primary-green)]/40 p-[3px]">
              <SkeletonAvatar size="xl" className="h-24 w-24 rounded-[calc(1.1rem-3px)] ring-0" />
            </div>
            <Skeleton variant="text" className="h-3 w-24" intensity="subtle" />
            <Skeleton variant="badge" className="h-7 w-28 rounded-full" />
          </div>
        </aside>

        <div className="page-background relative flex flex-1 flex-col">
          <div className="flex-1 overflow-hidden">
            <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:space-y-6 sm:p-6">
              <ChatMessageSkeleton />
              <ChatMessageSkeleton isPatient={false} />
              <ChatMessageSkeleton />

              <div className="flex justify-start pl-3">
                <div className="rounded-lg bg-[var(--color-chat-bubble-patient)]/45 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Skeleton variant="badge" className="h-2 w-2 bg-white/70" />
                    <Skeleton variant="badge" className="h-2 w-2 bg-white/70" />
                    <Skeleton variant="badge" className="h-2 w-2 bg-white/70" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 z-20 bg-transparent p-4 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-3">
              <div className="rounded-lg border border-[var(--color-border-primary)]/35 bg-[var(--color-surface-primary)]/35 px-4 py-3">
                <Skeleton variant="text" className="h-3 w-60" intensity="subtle" />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Skeleton
                  variant="text"
                  className="h-11 flex-1 rounded-lg bg-[var(--color-surface-primary)]/70"
                />
                <Skeleton variant="button" className="h-11 w-11 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        <div className="page-background hidden w-48 flex-shrink-0 lg:block" aria-hidden="true" />
      </div>
    </div>
  )
}

/**
 * Navigation Skeleton
 * For sidebar/navigation loading states
 */
export function NavigationSkeleton({
  items = 5,
  className
}: {
  items?: number
  className?: string
}) {
  return (
    <nav className={cn("space-y-1 p-3", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
        >
          <Skeleton variant="text" className="h-5 w-5 flex-shrink-0" delay={index * 40} />
          <Skeleton
            variant="text"
            className="h-4 flex-1"
            style={{ width: `${70 + (index % 3) * 10}%` }}
            delay={index * 40 + 20}
          />
        </div>
      ))}
    </nav>
  )
}
