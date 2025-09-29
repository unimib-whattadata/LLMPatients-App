import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: 
          "border-border text-foreground",
        admin:
          "border-transparent text-white badge-admin",
        user:
          "border-transparent text-white badge-user",
        success:
          "border-transparent bg-green-500 text-white",
        warning:
          "border-transparent bg-yellow-500 text-white",
        info:
          "border-transparent bg-blue-500 text-white",
        started:
          "border-transparent bg-[var(--color-primary-green)] text-white",
        "in-progress":
          "border-transparent bg-[var(--color-primary-yellow)] text-white",
        completed:
          "border-transparent bg-[var(--color-primary-violet)] text-white",
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
