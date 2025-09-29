import * as React from "react"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const textareaVariants = cva(
  "block w-full rounded-[var(--radius-lg)] border-2 border-transparent bg-[color:var(--color-input-background)] px-4 py-3 text-base text-[var(--color-text-primary)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] placeholder:text-[color:var(--color-text-placeholder)] focus-visible:border-[var(--color-primary-green)] focus-visible:bg-[color:var(--color-input-background-focus)] focus-visible:outline-none    focus-visible: hover:bg-[color:var(--color-input-background-hover)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[color:var(--color-input-background-disabled)] disabled:opacity-50",
  {
    variants: {
      state: {
        default: "",
        error:
          "border-[var(--color-error)] bg-[color:rgba(239,68,68,0.05)] focus-visible:border-[var(--color-error)] ",
        success:
          "border-[var(--color-success)] bg-[color:rgba(16,185,129,0.05)] focus-visible:border-[var(--color-success)] ",
      },
      size: {
        sm: "min-h-[96px] px-3 py-2 text-sm",
        md: "min-h-[140px] px-4 py-3 text-base",
        lg: "min-h-[200px] px-5 py-4 text-base",
      },
    },
    defaultVariants: {
      state: "default",
      size: "md",
    },
  }
)

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> &
  VariantProps<typeof textareaVariants> & {
    isLoading?: boolean
    resize?: "none" | "vertical" | "horizontal" | "both"
  }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, state, size, isLoading = false, resize = "vertical", ...props },
    ref,
  ) => {
    const resizeClass =
      resize === "none"
        ? "resize-none"
        : resize === "both"
          ? "resize"
          : resize === "horizontal"
            ? "resize-x"
            : "resize-y"

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          data-slot="textarea"
          aria-invalid={state === "error" ? true : undefined}
          className={cn(textareaVariants({ state, size }), resizeClass, className)}
          {...props}
        />

        {isLoading ? (
          <Loader2
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-4 size-4 animate-spin text-[var(--color-text-secondary)]"
          />
        ) : null}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
