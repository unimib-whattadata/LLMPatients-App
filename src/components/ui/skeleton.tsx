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
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, visible = true, speed = 'normal', shimmer = true, ...props }, ref) => {
    if (!visible) return null

    const speedClasses = {
      slow: 'animate-pulse',
      normal: 'animate-pulse',
      fast: 'animate-pulse'
    }

    const shimmerClasses = shimmer ? 'relative overflow-hidden' : ''

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md",
          speedClasses[speed],
          shimmerClasses,
          className
        )}
        style={{ 
          backgroundColor: 'rgba(139, 151, 105, 0.2)',
          ...(shimmer && {
            background: 'linear-gradient(90deg, rgba(139, 151, 105, 0.2) 25%, rgba(139, 151, 105, 0.3) 50%, rgba(139, 151, 105, 0.2) 75%)',
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
