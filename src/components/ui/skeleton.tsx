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

    const shimmerClasses = shimmer ? 'relative overflow-hidden' : ''

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
        style={{ 
          ...(shimmer && {
            background: 'linear-gradient(90deg, transparent 25%, rgba(255, 255, 255, 0.1) 50%, transparent 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          })
        }}
        {...props}
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

export { Skeleton }
