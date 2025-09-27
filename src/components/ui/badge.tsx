import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: 
          "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
        admin:
          "border-transparent text-white shadow-sm hover:shadow-md badge-admin",
        user:
          "border-transparent text-white shadow-sm hover:shadow-md badge-user",
        success:
          "border-transparent bg-green-500 text-white shadow-sm hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white shadow-sm hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white shadow-sm hover:bg-blue-600",
        started:
          "border-transparent bg-[var(--color-primary-green)] text-white shadow-sm hover:bg-[#7a8560]",
        "in-progress":
          "border-transparent bg-[var(--color-primary-yellow)] text-white shadow-sm hover:bg-[#b08832]",
        completed:
          "border-transparent bg-[var(--color-primary-violet)] text-white shadow-sm hover:bg-[#857fa3]",
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
