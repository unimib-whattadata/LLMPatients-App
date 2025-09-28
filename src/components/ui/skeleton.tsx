import { cn } from "~/lib/utils"
import { forwardRef } from "react"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the skeleton should be visible
   */
  visible?: boolean
  /**
   * Animation speed - 'slow', 'normal', or 'fast'
   */
  speed?: 'slow' | 'normal' | 'fast'
  /**
   * Whether to show a shimmer effect
   */
  shimmer?: boolean
  /**
   * Skeleton variant for different content types
   */
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button'
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    visible = true, 
    speed = 'normal', 
    shimmer = true, 
    variant = 'default',
    ...props 
  }, ref) => {
    if (!visible) return null

    const speedClasses = {
      slow: 'animate-pulse',
      normal: 'animate-pulse',
      fast: 'animate-pulse'
    }

    const variantClasses = {
      default: 'bg-muted',
      card: 'bg-background-secondary',
      text: 'bg-muted-foreground/20',
      avatar: 'bg-muted rounded-full',
      button: 'bg-muted rounded-md'
    }

    const shimmerClasses = shimmer ? 'skeleton--shimmer' : ''

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md",
          speedClasses[speed],
          shimmerClasses,
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

export { Skeleton }
