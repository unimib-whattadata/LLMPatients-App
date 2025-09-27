import * as React from "react"

import { cn } from "~/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  variant?: "default" | "error" | "success"
  icon?: React.ReactNode
}

function Input({ className, type, variant = "default", icon, ...props }: InputProps) {
  const inputClasses = cn(
    "input-field",
    {
      "input-field-error": variant === "error",
      "input-field-success": variant === "success",
    },
    className
  )

  if (icon) {
    return (
      <div className="input-with-icon">
        <div className="input-icon">{icon}</div>
        <input
          type={type}
          data-slot="input"
          className={inputClasses}
          {...props}
        />
      </div>
    )
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={inputClasses}
      {...props}
    />
  )
}

export { Input }
