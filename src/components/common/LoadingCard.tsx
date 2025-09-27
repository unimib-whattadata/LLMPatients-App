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
      className={cn("grid gap-6 grid-cols-1 sm:grid-cols-2", className)}
      role="status"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="h-full flex flex-col" style={{ backgroundColor: '#2E322B' }}>
          {/* Patient Avatar at the top - matching PatientCard structure */}
          <CardHeader className="flex flex-col items-center space-y-4 pb-4">
            {showAvatar && (
              <Skeleton className="h-16 w-16 rounded-full" />
            )}
            
            {/* Patient Name and Age Badge */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-16" />
              </div>
              
              {/* Small Description */}
              <Skeleton className="h-4 w-full" />
            </div>
          </CardHeader>

          <CardContent className="flex-1 pt-0">
            {/* Background Description */}
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Objectives Section */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <div className="space-y-1">
                <div className="flex items-start">
                  <Skeleton className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <div className="flex items-start">
                  <Skeleton className="h-1 w-1 rounded-full mt-1 mr-2 flex-shrink-0" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>

            {/* Metadata - Difficulty and Duration */}
            <div className="flex items-center justify-between mt-4 pt-4">
              <Skeleton className="h-6 w-20" />
              <div className="flex items-center space-x-1">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-12" />
              </div>
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
