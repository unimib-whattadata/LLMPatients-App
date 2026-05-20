"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "~/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-[var(--color-border-secondary)] bg-[color:var(--color-input-background)] transition-[border-color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring-strong)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--color-primary-green)] data-[state=checked]:bg-[var(--color-primary-green)]",
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block size-4 translate-x-0 rounded-full bg-[var(--color-text-primary)] transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] data-[state=checked]:translate-x-5",
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
