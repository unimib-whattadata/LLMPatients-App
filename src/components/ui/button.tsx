import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] border border-transparent px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] hover:-translate-y-[1px] active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 data-[state=loading]:cursor-progress [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-green)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] hover:opacity-90 focus-visible:ring-offset-[var(--color-page-background)]",
        secondary:
          "border border-[var(--color-border-secondary)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface-muted)]",
        destructive:
          "bg-[var(--color-error)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-error-dark)] focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-[var(--color-page-background)]",
        outline:
          "border border-[var(--color-primary-green)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-primary-green)] hover:text-[var(--color-text-primary)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]/60",
        link:
          "border-transparent bg-transparent text-[var(--color-primary-yellow)] underline-offset-4 hover:text-[var(--color-primary-yellow)] hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    isLoading?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button"
    const computedDisabled = Boolean(disabled) || isLoading
    const buttonType = type ?? "button"

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-state={isLoading ? "loading" : undefined}
        data-disabled={computedDisabled ? "true" : undefined}
        aria-busy={isLoading}
        aria-disabled={computedDisabled}
        className={cn(buttonVariants({ variant, size }), className)}
        {...(!asChild ? { disabled: computedDisabled, type: buttonType } : {})}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
