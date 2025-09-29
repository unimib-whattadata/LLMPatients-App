import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "~/lib/utils"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  ),
)
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("text-sm", className)} {...props} />
  ),
)
PaginationItem.displayName = "PaginationItem"

const paginationLinkStyles =
  "inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-secondary)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-primary-green)]/15 focus-visible:outline-none    focus-visible: disabled:pointer-events-none disabled:opacity-50"

const PaginationLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    isActive?: boolean
  }
>(({ className, isActive, ...props }, ref) => (
  <a
    ref={ref}
    aria-current={isActive ? "page" : undefined}
    className={cn(
      paginationLinkStyles,
      isActive && "border-[var(--color-primary-green)] bg-[var(--color-primary-green)] text-[var(--color-text-primary)]",
      className,
    )}
    {...props}
  />
))
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof PaginationLink>
>(({ className, children, ...props }, ref) => (
  <PaginationLink ref={ref} className={cn("gap-1 pr-2", className)} {...props}>
    <ChevronLeft className="size-4" aria-hidden="true" />
    <span className="hidden sm:block">{children ?? "Prec"}</span>
  </PaginationLink>
))
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof PaginationLink>
>(({ className, children, ...props }, ref) => (
  <PaginationLink ref={ref} className={cn("gap-1 pl-2", className)} {...props}>
    <span className="hidden sm:block">{children ?? "Succ"}</span>
    <ChevronRight className="size-4" aria-hidden="true" />
  </PaginationLink>
))
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--color-text-secondary)]", className)}
    {...props}
  >
    <MoreHorizontal className="size-4" />
    <span className="sr-only">Più pagine</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
