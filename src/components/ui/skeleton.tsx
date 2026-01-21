import { cn } from "~/lib/utils"
import { forwardRef } from "react"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  visible?: boolean
  shimmer?: boolean
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button' | 'heading' | 'badge' | 'progress'
  /** Intensity of the shimmer effect: subtle, normal, vibrant */
  intensity?: 'subtle' | 'normal' | 'vibrant'
  /** Animation delay in ms for staggered loading effects */
  delay?: number
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    className,
    visible = true,
    shimmer = true,
    variant = 'default',
    intensity = 'normal',
    delay = 0,
    style,
    ...props
  }, ref) => {
    if (!visible) return null

    const variantClasses: Record<string, string> = {
      default: 'bg-[color:var(--color-skeleton-base)] rounded-lg',
      card: 'bg-[color:var(--color-skeleton-base)] rounded-xl border border-[color:var(--color-border-primary)]/30',
      text: 'bg-[color:var(--color-skeleton-accent)] rounded-md',
      avatar: 'bg-[color:var(--color-skeleton-accent)] rounded-full ring-2 ring-[color:var(--color-border-primary)]/20',
      button: 'bg-[color:var(--color-skeleton-accent)] rounded-lg',
      heading: 'bg-[color:var(--color-skeleton-base)] rounded-md',
      badge: 'bg-[color:var(--color-skeleton-accent)] rounded-full',
      progress: 'bg-[color:var(--color-skeleton-base)] rounded-full overflow-hidden'
    }

    const intensityClasses: Record<string, string> = {
      subtle: 'skeleton--shimmer-subtle',
      normal: 'skeleton--shimmer',
      vibrant: 'skeleton--shimmer-vibrant'
    }

    const shimmerClass = shimmer ? intensityClasses[intensity] : ''

    const animationStyle = delay > 0
      ? { ...style, animationDelay: `${delay}ms` }
      : style

    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse transition-opacity duration-200",
          shimmerClass,
          variantClasses[variant],
          className
        )}
        style={animationStyle}
        aria-hidden="true"
        role="presentation"
        {...props}
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

// Compound components for common patterns
const SkeletonText = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'> & { lines?: number; widths?: string[] }>(
  ({ lines = 1, widths = [], className, ...props }, ref) => {
    const defaultWidths = ['100%', '85%', '70%', '90%', '60%']

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className="h-4"
            style={{ width: widths[i] || defaultWidths[i % defaultWidths.length] }}
            delay={i * 50}
            {...props}
          />
        ))}
      </div>
    )
  }
)

SkeletonText.displayName = "SkeletonText"

const SkeletonAvatar = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'> & { size?: 'sm' | 'md' | 'lg' | 'xl' }>(
  ({ size = 'md', className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16',
      xl: 'h-24 w-24'
    }

    return (
      <Skeleton
        ref={ref}
        variant="avatar"
        className={cn(sizeClasses[size], className)}
        {...props}
      />
    )
  }
)

SkeletonAvatar.displayName = "SkeletonAvatar"

const SkeletonButton = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'> & { size?: 'sm' | 'md' | 'lg' }>(
  ({ size = 'md', className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-20',
      md: 'h-10 w-28',
      lg: 'h-12 w-36'
    }

    return (
      <Skeleton
        ref={ref}
        variant="button"
        className={cn(sizeClasses[size], className)}
        {...props}
      />
    )
  }
)

SkeletonButton.displayName = "SkeletonButton"

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton }
