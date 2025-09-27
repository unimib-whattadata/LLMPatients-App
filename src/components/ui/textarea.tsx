import * as React from "react"

import { cn } from "~/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  variant?: "default" | "error" | "success"
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "textarea-field",
          {
            "input-field-error": variant === "error",
            "input-field-success": variant === "success",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
