"use client";

import { memo } from "react";
import { Check } from "lucide-react";

import {
  TIMELINE_CONFIG,
  type StepDetails,
  type TimelineStep as TimelineStepDefinition,
} from "./timelineConfig";

export const TimelineStep = memo(
  ({
    step,
    circleSize,
    circleFontSize,
    onStepClick,
    isUnlocked,
    isCurrent,
    isCompleted,
  }: {
    step: TimelineStepDefinition & { scaledTop: number; scaledLeft: number };
    circleSize: number;
    circleFontSize: number;
    onStepClick: (stepId: number) => void;
    isUnlocked: boolean;
    isCurrent: boolean;
    isCompleted: boolean;
  }) => {
    return (
      <div
        key={step.id}
        data-step-id={step.id}
        data-step-color={step.color}
        style={{
          position: "absolute",
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          fontWeight: 600,
          cursor: isUnlocked ? "pointer" : "not-allowed",
          opacity: isUnlocked ? 1 : 0.35,
          filter: isUnlocked ? "none" : "grayscale(60%)",
          backgroundColor: step.color,
          top: `${(step.scaledTop / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
          left: `${(step.scaledLeft / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
          width: `${(circleSize / TIMELINE_CONFIG.BASE_WIDTH) * 100}%`,
          height: `${(circleSize / TIMELINE_CONFIG.BASE_HEIGHT) * 100}%`,
          fontSize: `${circleFontSize}px`,
          color: "var(--color-text-inverse)",
        }}
        className={`timeline-step-positioned timeline-desktop-step ${!isUnlocked ? "timeline-step-positioned--locked" : ""} ${isCurrent ? "timeline-step-positioned--current" : ""} ${isCompleted ? "timeline-step-positioned--completed" : ""}`}
        onClick={() => {
          if (!isUnlocked) return;
          onStepClick(step.id);
        }}
        onKeyDown={(event) => {
          if (!isUnlocked) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onStepClick(step.id);
          }
        }}
        role="button"
        tabIndex={isUnlocked ? 0 : -1}
        aria-disabled={!isUnlocked}
        aria-label={`Open session ${step.id}${isUnlocked ? "" : " not available"}${isCompleted ? " - Completed" : ""}`}
      >
        {step.id}
      </div>
    );
  },
);
TimelineStep.displayName = "TimelineStep";

export const MobileTimelineStep = memo(
  ({
    step,
    details,
    isOpen,
    onStepClick,
    isUnlocked,
    isCurrent,
    isCompleted,
  }: {
    step: TimelineStepDefinition;
    details: StepDetails;
    isOpen: boolean;
    onStepClick: (stepId: number) => void;
    isUnlocked: boolean;
    isCurrent: boolean;
    isCompleted: boolean;
  }) => (
    <div key={`mobile-step-${step.id}`} className="relative">
      <span
        className="absolute top-4 -left-6.5 flex h-3 w-3 items-center justify-center"
        aria-hidden
      >
        <span
          data-step-id={step.id}
          data-step-color={step.color}
          className="timeline-mobile-step flex h-3 w-3 items-center justify-center rounded-full text-xs font-bold"
          style={{
            color: "var(--color-text-inverse)",
            backgroundColor: step.color,
          }}
        >
          {isCompleted ? <Check className="h-2 w-2" aria-hidden="true" /> : null}
        </span>
      </span>

      <button
        type="button"
        onClick={() => {
          if (!isUnlocked) return;
          onStepClick(step.id);
        }}
        aria-expanded={isOpen}
        disabled={!isUnlocked}
        className={`w-full rounded-2xl border border-white/5 p-4 text-left transition-colors duration-200 focus:outline-none ${isUnlocked ? "" : "cursor-not-allowed opacity-40"} ${isCurrent ? "ring-2 ring-white/70" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Session {step.id}
              {isCompleted ? (
                <Check className="ml-1 inline h-3 w-3 align-text-top" aria-hidden="true" />
              ) : null}
            </p>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              {details.phaseTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isCompleted ? "Session completed" : "Click to open session"}
            </p>
          </div>
        </div>
      </button>
    </div>
  ),
);
MobileTimelineStep.displayName = "MobileTimelineStep";
