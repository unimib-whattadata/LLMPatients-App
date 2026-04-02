"use client";

import Image from "next/image";
import {
  Brain,
  Check,
  CheckCircle2,
  FileDown,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import type { PatientEmotion } from "./chat-constants";
import { getPatientAvatarPath } from "./chat-utils";

interface ChatCompletionFooterProps {
  isStepCompleted: boolean;
  stepId: number;
  isExportingPdf: boolean;
  onDownloadPdf: () => void;
  onOpenMisstepAnalysis: () => void;
}

export function ChatCompletionFooter({
  isStepCompleted,
  stepId,
  isExportingPdf,
  onDownloadPdf,
  onOpenMisstepAnalysis,
}: ChatCompletionFooterProps) {
  if (!isStepCompleted) {
    return null;
  }

  return (
    <div className="navbar-background sticky bottom-0 left-0 right-0 z-20 p-6">
      <div className="mx-auto max-w-4xl text-center">
        <div className="pill bg-primary-green px-4 py-3 text-text-inverse">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between">
            <p className="flex items-center justify-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>
                Session {stepId} completed - Conversation is in read-only mode
              </span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Button
                type="button"
                onClick={onOpenMisstepAnalysis}
                variant="secondary"
                size="sm"
                className="min-w-[164px] shrink-0"
              >
                <Brain className="h-4 w-4" />
                <span>Missteps</span>
              </Button>
              <Button
                type="button"
                onClick={onDownloadPdf}
                disabled={isExportingPdf}
                variant="secondary"
                size="sm"
                className="min-w-[96px] shrink-0"
                aria-label="Download session PDF report"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                <span>PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatSuccessDialogProps {
  open: boolean;
  stepId: number;
  effectivePatientName: string;
  onOpenChange: (value: boolean) => void;
  onBackToTimeline: () => void;
  onOpenMisstepAnalysis: () => void;
}

export function ChatSuccessDialog({
  open,
  stepId,
  effectivePatientName,
  onOpenChange,
  onBackToTimeline,
  onOpenMisstepAnalysis,
}: ChatSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>div]:!animate-none !animate-none">
        <DialogHeader>
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-full bg-[var(--color-primary-green)]/10 p-3">
              <CheckCircle2 className="h-8 w-8 text-[var(--color-primary-green)]" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Session Completed!
          </DialogTitle>
          <DialogDescription className="pt-2 text-center">
            You successfully completed Session {stepId} with{" "}
            {effectivePatientName}.
            <br />
            <span className="mt-2 block text-sm text-[var(--color-text-primary)]/60">
              Your notes have been saved and the misstep analysis is now being
              prepared for review.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={onOpenMisstepAnalysis}
            className="w-full sm:w-auto"
            size="lg"
            variant="outline"
          >
            <Brain className="h-4 w-4" />
            Open Misstep Analysis
          </Button>
          <Button
            onClick={onBackToTimeline}
            className="w-full sm:w-auto"
            size="lg"
          >
            Back to Timeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExpandedAvatarDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  hasPatientAvatar: boolean;
  selectedPatientAvatarUrl: string | null;
  currentEmotion: PatientEmotion;
  effectivePatientName: string;
  patientAvatarColorClass: string;
  patientAvatarInitials: string;
}

export function ExpandedAvatarDialog({
  open,
  onOpenChange,
  hasPatientAvatar,
  selectedPatientAvatarUrl,
  currentEmotion,
  effectivePatientName,
  patientAvatarColorClass,
  patientAvatarInitials,
}: ExpandedAvatarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Patient avatar {effectivePatientName}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          {hasPatientAvatar ? (
            <Image
              src={getPatientAvatarPath(selectedPatientAvatarUrl, currentEmotion)}
              alt={`Avatar of ${effectivePatientName} - ${currentEmotion}`}
              width={600}
              height={600}
              className="h-auto w-full object-cover"
            />
          ) : (
            <div
              className={`avatar-color-default flex aspect-square w-full items-center justify-center text-9xl font-bold text-white ${patientAvatarColorClass}`}
            >
              {patientAvatarInitials}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 h-8 w-8 bg-black/40 p-0 hover:bg-black/60"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
