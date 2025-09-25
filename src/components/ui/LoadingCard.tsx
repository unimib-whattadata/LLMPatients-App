/**
 * Loading Card Component
 * 
 * Provides skeleton loading states for card-based content with consistent styling
 */

import { cn } from "~/lib/utils/cn";

interface LoadingCardProps {
  /**
   * Number of skeleton cards to display
   */
  count?: number;
  
  /**
   * Whether to show avatar placeholder
   */
  showAvatar?: boolean;
  
  /**
   * Number of text lines to show
   */
  textLines?: number;
  
  /**
   * Whether to show button placeholder
   */
  showButton?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function LoadingCard({
  count = 1,
  showAvatar = true,
  textLines = 3,
  showButton = true,
  className
}: LoadingCardProps) {
  return (
    <div className={cn("loading-grid", className)} role="status" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="loading-card">
          {showAvatar && (
            <div className="loading-card-avatar bg-background-tertiary animate-pulse rounded-none" />
          )}
          
          <div className="loading-card-content">
            <div className="loading-card-title bg-background-tertiary animate-pulse rounded-md h-6 w-3/4 mb-2" />
            <div className="space-y-3">
              {Array.from({ length: textLines }).map((_, lineIndex) => (
                <div 
                  key={lineIndex}
                  className={cn(
                    "loading-card-text bg-background-tertiary animate-pulse rounded-md h-4",
                    lineIndex === 0 && "w-full",
                    lineIndex === 1 && "w-5/6", 
                    lineIndex === 2 && "w-4/5"
                  )}
                />
              ))}
            </div>
            {showButton && (
              <div className="loading-card-button bg-background-tertiary animate-pulse rounded-md h-10 w-full" />
            )}
          </div>
        </div>
      ))}
      
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
