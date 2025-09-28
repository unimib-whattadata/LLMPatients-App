import { cn } from "~/lib/utils"
import { forwardRef } from "react"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the skeleton should be visible
   */
  visible?: boolean
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
    shimmer = true, 
    variant = 'default',
    ...props 
  }, ref) => {
    if (!visible) return null

    const variantClasses = {
      default: 'bg-[var(--color-surface-secondary)]',
      card: 'bg-[var(--color-surface-secondary)]',
      text: 'bg-[#6B7A4A]', // Darker green for text elements
      avatar: 'bg-[#6B7A4A] rounded-full', // Darker green for avatar
      button: 'bg-[#6B7A4A] rounded-md' // Darker green for button
    }

    const shimmerClasses = shimmer ? 'skeleton--shimmer' : ''

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md animate-pulse",
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
