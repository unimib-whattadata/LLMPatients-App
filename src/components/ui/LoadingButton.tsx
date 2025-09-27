/**
 * Loading Button Component
 *
 * Provides loading states for buttons with consistent styling and behavior
 */

import { cn } from "~/lib/utils/cn";

interface LoadingButtonProps {
  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;

  /**
   * Loading text to display when loading
   */
  loadingText?: string;

  /**
   * Normal text to display when not loading
   */
  children: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Button type
   */
  type?: "button" | "submit" | "reset";

  /**
   * Click handler
   */
  onClick?: () => void;
}

export function LoadingButton({
  isLoading = false,
  loadingText = "Loading...",
  children,
  className,
  disabled = false,
  type = "button",
  onClick,
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn("btn", isLoading && "btn-loading", className)}
      aria-disabled={disabled || isLoading}
    >
      <span className={cn("btn-content", isLoading && "opacity-0")}>
        {children}
      </span>
      {isLoading && (
        <div className="loading-spinner">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2"></div>
        </div>
      )}
      {isLoading && <span className="sr-only">{loadingText}</span>}
    </button>
  );
}
