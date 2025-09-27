/**
 * Session Loading Component
 *
 * Provides loading state for session timeline content
 */

import { Loader2 } from "lucide-react";
import { Skeleton } from "./skeleton";

export function SessionLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Caricamento sessione...</p>
        </div>
      </div>
    </div>
  );
}
