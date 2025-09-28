import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: 
          "border-border text-foreground",
        admin:
          "border-transparent text-white shadow-sm badge-admin",
        user:
          "border-transparent text-white shadow-sm badge-user",
        success:
          "border-transparent bg-green-500 text-white shadow-sm",
        warning:
          "border-transparent bg-yellow-500 text-white shadow-sm",
        info:
          "border-transparent bg-blue-500 text-white shadow-sm",
        started:
          "border-transparent bg-[var(--color-primary-green)] text-white shadow-sm",
        "in-progress":
          "border-transparent bg-[var(--color-primary-yellow)] text-white shadow-sm",
        completed:
          "border-transparent bg-[var(--color-primary-violet)] text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
