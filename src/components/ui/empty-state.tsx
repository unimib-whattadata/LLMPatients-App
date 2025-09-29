import * as React from "react"

import { cn } from "~/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-secondary)] bg-[color:var(--color-surface-secondary)] px-6 py-12 text-center text-[var(--color-text-primary)]",
        className,
      )}
      role="status"
      {...props}
    >
      {icon ? <div className="text-[var(--color-primary-green)]">{icon}</div> : null}
      <div className="max-w-xl space-y-2">
        <h3 className="text-h4 font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2 flex items-center gap-3">{action}</div> : null}
    </div>
  )
}
