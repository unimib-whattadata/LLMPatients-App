import * as React from "react"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const inputVariants = cva(
  "block w-full rounded-[var(--radius-lg)] border-2 border-transparent bg-[color:var(--color-input-background)] px-4 text-base text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] placeholder:text-[color:var(--color-text-placeholder)] focus-visible:border-[var(--color-primary-green)] focus-visible:bg-[color:var(--color-input-background-focus)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] hover:bg-[color:var(--color-input-background-hover)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[color:var(--color-input-background-disabled)] disabled:opacity-50",
  {
    variants: {
      state: {
        default: "",
        error:
          "border-[var(--color-error)] bg-[color:rgba(239,68,68,0.05)] focus-visible:border-[var(--color-error)] focus-visible:ring-[var(--color-error)]",
        success:
          "border-[var(--color-success)] bg-[color:rgba(16,185,129,0.05)] focus-visible:border-[var(--color-success)] focus-visible:ring-[var(--color-success)]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-base",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      state: "default",
      size: "md",
    },
  }
)

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof inputVariants> & {
    leadingIcon?: React.ReactNode
    trailingIcon?: React.ReactNode
    wrapperClassName?: string
    isLoading?: boolean
  }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      leadingIcon,
      trailingIcon,
      state,
      size,
      isLoading = false,
      name,
      ...props
    },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    const showLeadingIcon = Boolean(leadingIcon)
    const showTrailingContent = Boolean(trailingIcon) || isLoading

    return (
      <div className={cn("relative flex w-full items-center", wrapperClassName)}>
        {showLeadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--color-text-secondary)]">
            {leadingIcon}
          </span>
        ) : null}

        <input
          ref={innerRef}
          name={name}
          data-slot="input"
          aria-invalid={state === "error" ? true : undefined}
          className={cn(
            inputVariants({ state, size }),
            showLeadingIcon && "pl-11",
            showTrailingContent && "pr-11",
            className,
          )}
          {...props}
        />

        {trailingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--color-text-secondary)]">
            {trailingIcon}
          </span>
        ) : null}

        {isLoading ? (
          <Loader2
            aria-hidden="true"
            className="absolute right-4 size-4 animate-spin text-[var(--color-text-secondary)]"
          />
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
