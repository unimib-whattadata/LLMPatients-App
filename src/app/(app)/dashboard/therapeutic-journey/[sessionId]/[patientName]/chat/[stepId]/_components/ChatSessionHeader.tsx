"use client";

import { ArrowLeft, Info } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface ChatSessionHeaderProps {
  effectivePatientName: string;
  stepId: number;
  currentDateString: string;
  sessionTimeLabel: string;
  patientId?: string | null;
  therapySessionId?: string | null;
  externalPatientId?: string | null;
  isStepCompleted: boolean;
  isCompleting: boolean;
  onBack: () => void;
  onCompleteStep: () => void;
}

export function ChatSessionHeader({
  effectivePatientName,
  stepId,
  currentDateString,
  sessionTimeLabel,
  patientId,
  therapySessionId,
  externalPatientId,
  isStepCompleted,
  isCompleting,
  onBack,
  onCompleteStep,
}: ChatSessionHeaderProps) {
  return (
    <header
      className="flex-shrink-0 border-b border-border bg-card px-4 py-4 sm:px-6"
      role="banner"
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex-shrink-0 hover:bg-primary/10"
            aria-label="Back to timeline"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground">
              <span className="hidden sm:inline">{effectivePatientName} - </span>
              Session {stepId}
            </h1>
            <p className="text-sm text-muted-foreground">{currentDateString}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center space-x-2 sm:space-x-4">
          <div className="w-16 rounded-md bg-muted px-2 py-1 text-center text-foreground sm:px-3">
            <span className="text-sm font-medium">{sessionTimeLabel}</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 hover:bg-primary/10"
                aria-label="Session information"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">
                  Session Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient ID (internal):</span>
                    <span className="font-mono text-xs text-foreground">
                      {patientId || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Therapy Session ID:</span>
                    <span className="font-mono text-xs text-foreground">
                      {therapySessionId || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">External Patient ID:</span>
                    <span className="font-mono text-xs text-foreground">
                      {externalPatientId || "Not initialized"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Step ID:</span>
                    <span className="font-mono text-xs text-foreground">{stepId}</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {!isStepCompleted && (
            <Button
              onClick={onCompleteStep}
              disabled={isCompleting}
              isLoading={isCompleting}
              size="sm"
              className="px-2 text-xs sm:px-4 sm:text-sm"
              aria-label="Complete session"
            >
              <span className="hidden sm:inline">
                {isCompleting ? "Completing..." : "Complete"}
              </span>
              <span className="sm:hidden">{isCompleting ? "..." : "Done"}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
