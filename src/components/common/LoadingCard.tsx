/**
 * Loading Card Component
 *
 * Provides skeleton loading states for card-based content with consistent styling
 */

import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardFooter } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

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
  className,
}: LoadingCardProps) {
  return (
    <div
      className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}
      role="status"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-start space-y-0 pb-4">
            {showAvatar && (
              <Skeleton className="h-16 w-16 rounded-full" />
            )}
            
            <div className="flex-1 ml-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardHeader>

          <CardContent className="flex-1 pt-0 space-y-3">
            <Skeleton className="h-4 w-full" />
            {Array.from({ length: textLines }).map((_, lineIndex) => (
              <Skeleton
                key={lineIndex}
                className={cn(
                  "h-4",
                  lineIndex === 0 && "w-full",
                  lineIndex === 1 && "w-5/6",
                  lineIndex === 2 && "w-4/5",
                )}
              />
            ))}
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>

          {showButton && (
            <CardFooter className="pt-0">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          )}
        </Card>
      ))}

      <span className="sr-only">Loading content...</span>
    </div>
  );
}
