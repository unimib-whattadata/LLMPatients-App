/**
 * Unified Loading Spinner Component
 *
 * Provides consistent loading states across the application with different variants
 * and customizable messages.
 */

import { cn } from "~/lib/utils/cn";

interface LoadingSpinnerProps {
  /**
   * Loading message to display below the spinner
   */
  message?: string;

  /**
   * Size variant for the spinner
   */
  size?: "sm" | "md" | "lg" | "xl";

  /**
   * Whether to center the spinner in a full screen container
   */
  fullScreen?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessibility label for screen readers
   */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const variantClasses = {
  primary: "",
  secondary: "",
  accent: "",
};

export function LoadingSpinner({
  message = "Loading...",
  size = "lg",
  variant = "primary",
  fullScreen = false,
  className,
  ariaLabel = "Loading content",
}: LoadingSpinnerProps) {
  const spinnerClasses = cn(
    "animate-spin rounded-full border-b-2",
    sizeClasses[size],
    variantClasses[variant],
    className,
  );

  const containerClasses = cn(
    "text-center",
    fullScreen && "flex items-center justify-center min-h-screen",
  );

  return (
    <div className={containerClasses} role="status" aria-label={ariaLabel}>
      <div className={spinnerClasses}></div>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
