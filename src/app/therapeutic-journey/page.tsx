"use client";

import { SharedLayout } from "@/components/layout/SharedLayout";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";

type PathPoint = {
  x: number;
  y: number;
};

type TimelineStep = {
  id: number;
  top: number;
  left: number;
  color: string;
  textColor?: string;
};

const timelineSteps: TimelineStep[] = [
  { id: 1, top: 150, left: 533, color: "#B9C87C" },
  { id: 2, top: 340, left: 333, color: "#B9C87C" },
  { id: 3, top: 460, left: 533, color: "#E3B23C" },
  { id: 4, top: 560, left: 713, color: "#E3B23C" },
  { id: 5, top: 680, left: 533, color: "#E3B23C" },
  { id: 6, top: 780, left: 373, color: "#E3B23C" },
  { id: 7, top: 900, left: 533, color: "#E3B23C" },
  { id: 8, top: 1000, left: 713, color: "#E3B23C" },
  { id: 9, top: 1120, left: 533, color: "#E3B23C" },
  { id: 10, top: 1210, left: 353, color: "#E3B23C" },
  { id: 11, top: 1400, left: 533, color: "#B4A7E6" },
];

const timelinePathPoints: PathPoint[] = [
  { x: 520, y: 100 },
  { x: 520, y: 240 },
  { x: 320, y: 240 },
  { x: 320, y: 460 },
  { x: 700, y: 460 },
  { x: 700, y: 680 },
  { x: 360, y: 680 },
  { x: 360, y: 900 },
  { x: 700, y: 900 },
  { x: 700, y: 1120 },
  { x: 340, y: 1120 },
  { x: 340, y: 1300 },
  { x: 520, y: 1300 },
  { x: 520, y: 1460 },
];

// Timeline configuration constants
const TIMELINE_CONFIG = {
  BASE_WIDTH: 960,
  BASE_HEIGHT: 1450,
  TOOLTIP_OFFSET_X: 100,
  NODE_OFFSET_X: -14,
  PATH_RADIUS: 60,
  MIN_CIRCLE_SIZE: 40,
  MAX_CIRCLE_SIZE: 62,
  MIN_FONT_SIZE: 14,
  MAX_FONT_SIZE: 18,
} as const;

// Tips configuration
const TIPS_CONFIG = {
  KNOWLEDGE: [
    "Ascolta attivamente il paziente senza interrompere.",
    "Mantieni un atteggiamento empatico e non giudicante.",
    "Fai domande aperte per approfondire la comprensione.",
    "Osserva il linguaggio del corpo e le emozioni.",
  ],
  INTERVENTION: [
    "Utilizza tecniche di riformulazione per chiarire i concetti.",
    "Proponi strategie concrete e personalizzate per il paziente.",
    "Mantieni un approccio collaborativo e coinvolgente.",
    "Monitora i progressi e adatta l'intervento di conseguenza.",
    "Fornisci feedback costruttivo e incoraggiante.",
    "Documenta accuratamente le osservazioni e i progressi.",
  ],
  CONCLUSION: [
    "Riassumi i punti chiave emersi durante il percorso.",
    "Valuta l'efficacia delle strategie implementate.",
    "Pianifica eventuali follow-up o approfondimenti.",
    "Celebra i progressi e i successi ottenuti.",
  ],
} as const;

const timelinePathD = buildRoundedOrthogonalPath(timelinePathPoints, TIMELINE_CONFIG.PATH_RADIUS);

type StepDetails = {
  phaseTitle: string;
  sessionLabel: string;
  tips: readonly string[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  bodyColor: string;
};

// Step details configuration
const STEP_DETAILS_CONFIG = {
  CONCLUSION: {
    phaseTitle: "Conclusione",
    sessionLabel: "Seduta 11",
    tips: TIPS_CONFIG.CONCLUSION,
    backgroundColor: "#2a2548",
    textColor: "#EEE9FF",
    accentColor: "#B8A7F4",
    bodyColor: "#E4DEFF",
  },
  INTERVENTION: {
    phaseTitle: "Fase di Intervento",
    sessionLabel: "Sedute 3-10",
    tips: TIPS_CONFIG.INTERVENTION,
    backgroundColor: "#2a1f0f",
    textColor: "#FFF4E6",
    accentColor: "#E3B23C",
    bodyColor: "#F5E6D3",
  },
  KNOWLEDGE: {
    phaseTitle: "Fase di Conoscenza",
    sessionLabel: "Sedute 1-2",
    tips: TIPS_CONFIG.KNOWLEDGE,
    backgroundColor: "#1a2720",
    textColor: "#E8F4E3",
    accentColor: "#9BD0A8",
    bodyColor: "#DAE7D8",
  },
} as const;

const getStepDetails = (stepId: number): StepDetails => {
  if (stepId === 11) return STEP_DETAILS_CONFIG.CONCLUSION;
  if (stepId >= 3) return STEP_DETAILS_CONFIG.INTERVENTION;
  return STEP_DETAILS_CONFIG.KNOWLEDGE;
};

function buildRoundedOrthogonalPath(points: PathPoint[], radius: number): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const [point] = points;
    if (!point) return "";
    return `M ${point.x} ${point.y}`;
  }

  const firstPoint = points[0];
  if (!firstPoint) return "";
  
  const pathCommands: string[] = [`M ${firstPoint.x} ${firstPoint.y}`];
  let currentX = firstPoint.x;
  let currentY = firstPoint.y;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    
    if (!current || !previous) continue;
    
    const deltaX = current.x - previous.x;
    const deltaY = current.y - previous.y;

    if (deltaX === 0 && deltaY === 0) {
      continue;
    }

    const directionX = Math.sign(deltaX);
    const directionY = Math.sign(deltaY);

    let endX = current.x;
    let endY = current.y;
    let cornerRadius = 0;

    if (index < points.length - 1) {
      const next = points[index + 1];
      if (!next) continue;
      
      const nextDeltaX = next.x - current.x;
      const nextDeltaY = next.y - current.y;
      const nextDirectionX = Math.sign(nextDeltaX);
      const nextDirectionY = Math.sign(nextDeltaY);
      const isCorner = directionX !== nextDirectionX || directionY !== nextDirectionY;

      if (isCorner) {
        const previousLength = Math.abs(deltaX !== 0 ? deltaX : deltaY);
        const nextLength = Math.abs(nextDeltaX !== 0 ? nextDeltaX : nextDeltaY);
        cornerRadius = Math.min(radius, previousLength / 2, nextLength / 2);
        endX = current.x - directionX * cornerRadius;
        endY = current.y - directionY * cornerRadius;
      }
    }

    if (currentX !== endX || currentY !== endY) {
      pathCommands.push(`L ${endX} ${endY}`);
      currentX = endX;
      currentY = endY;
    }

    if (cornerRadius > 0 && index < points.length - 1) {
      const next = points[index + 1];
      if (!next) continue;
      
      const nextDeltaX = next.x - current.x;
      const nextDeltaY = next.y - current.y;
      const nextDirectionX = Math.sign(nextDeltaX);
      const nextDirectionY = Math.sign(nextDeltaY);

      const arcEndX = current.x + nextDirectionX * cornerRadius;
      const arcEndY = current.y + nextDirectionY * cornerRadius;
      const sweepFlag = directionX * nextDirectionY - directionY * nextDirectionX > 0 ? 1 : 0;

      pathCommands.push(
        `A ${cornerRadius} ${cornerRadius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`,
      );

      currentX = arcEndX;
      currentY = arcEndY;
    }
  }

  return pathCommands.join(" ");
}


// Close button component
const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <button
    onClick={onClose}
    className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
    aria-label="Close"
  >
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
);

// Mobile close button component
const MobileCloseButton = ({ onClose }: { onClose: () => void }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onClose();
    }}
    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
    role="button"
    tabIndex={0}
    aria-label="Close"
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }}
  >
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </div>
);

// Timeline step component
const TimelineStep = memo(({ 
  step, 
  circleSize, 
  circleFontSize, 
  onStepClick 
}: { 
  step: TimelineStep & { scaledTop: number; scaledLeft: number }; 
  circleSize: number; 
  circleFontSize: number; 
  onStepClick: (stepId: number) => void; 
}) => (
  <div
    key={step.id}
    style={{
      top: `${step.scaledTop}px`,
      left: `${step.scaledLeft}px`,
      backgroundColor: step.color,
      color: step.textColor ?? "#0b0d06",
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      fontSize: `${circleFontSize}px`,
    }}
    className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full font-semibold shadow-[0_18px_34px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-110"
    onClick={() => onStepClick(step.id)}
  >
    {step.id}
  </div>
));

// Desktop tooltip component
const DesktopTooltip = memo(({ 
  activeDetails, 
  tooltipPosition, 
  onClose 
}: { 
  activeDetails: StepDetails; 
  tooltipPosition: { top: number; left: number }; 
  onClose: () => void; 
}) => (
  <div
    className="absolute z-20 w-80 -translate-x-1/2 -translate-y-1/2 rounded-[28px] p-8"
    style={{
      top: `${tooltipPosition.top}px`,
      left: `${tooltipPosition.left}px`,
      backgroundColor: activeDetails.backgroundColor,
      color: activeDetails.textColor,
    }}
    onClick={(e) => e.stopPropagation()}
  >
    <div className="flex items-start justify-between">
      <h2 className="text-heading-3 font-semibold text-white">
        {activeDetails.phaseTitle}
      </h2>
      <CloseButton onClose={onClose} />
    </div>
    <h3 className="mt-6 text-base font-semibold text-white">
      Consigli per essere un buon terapeuta
    </h3>
    <ul
      className="mt-4 space-y-3 text-sm leading-relaxed"
      style={{ color: activeDetails.bodyColor }}
    >
      {activeDetails.tips.map((tip, index) => (
        <li
          key={`tip-${index}`}
          className="list-inside list-disc"
          style={{ '--marker-color': activeDetails.accentColor } as React.CSSProperties}
        >
          {tip}
        </li>
      ))}
    </ul>
  </div>
));

// Mobile timeline step component
const MobileTimelineStep = memo(({ 
  step, 
  details, 
  isOpen, 
  onStepClick, 
  onClose 
}: { 
  step: TimelineStep; 
  details: StepDetails; 
  isOpen: boolean; 
  onStepClick: (stepId: number) => void; 
  onClose: () => void; 
}) => (
  <div key={`mobile-step-${step.id}`} className="relative">
    <span
      className="absolute -left-6.5 top-4 flex h-3 w-3 items-center justify-center"
      aria-hidden
    >
      <span
        className="block h-3 w-3 rounded-full"
        style={{ backgroundColor: step.color }}
      />
    </span>

    <button
      type="button"
      onClick={() => onStepClick(step.id)}
      aria-expanded={isOpen}
      className="w-full rounded-2xl border border-white/5 p-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F9D69]"
      style={{ backgroundColor: details.backgroundColor, color: details.textColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
            Step {step.id}
          </p>
          <h2 className="mt-2 text-base font-semibold text-white">
            {details.phaseTitle}
          </h2>
        </div>
        {isOpen && <MobileCloseButton onClose={onClose} />}
      </div>

      {isOpen && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-white">
            Consigli per essere un buon terapeuta
          </h3>
          <ul
            className="mt-3 space-y-2 text-sm leading-relaxed"
            style={{ color: details.bodyColor }}
          >
            {details.tips.map((tip, index) => (
              <li
                key={`mobile-tip-${step.id}-${index}`}
                className="list-inside list-disc"
                style={{ '--marker-color': details.accentColor } as React.CSSProperties}
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </button>
  </div>
));

export default function TherapeuticJourneyPage() {
  const [session, setSession] = useState<any>(null);
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const [timelineScale, setTimelineScale] = useState(1);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Session management
  useEffect(() => {
    const getSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.user) {
          setSession(data);
        } else {
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        window.location.href = '/login';
      }
    };
    getSession();
  }, []);

  // Timeline scaling
  useEffect(() => {
    const element = timelineContainerRef.current;
    if (!element) return;

    const updateScale = () => {
      const width = element.clientWidth;
      if (width === 0) return;
      setTimelineScale(width / TIMELINE_CONFIG.BASE_WIDTH);
    };

    updateScale();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateScale);
    observer.observe(element);

    return () => observer.disconnect();
  }, [session?.user]);

  // User data - must be before early return to maintain hook order
  const user = useMemo((): {
    id: string;
    name: string | null;
    email: string;
    role: "admin" | "user";
    image: string | null | undefined;
  } | null => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email!,
      role: (session.user.role as "admin" | "user") || "user",
      image: session.user.image,
    };
  }, [session?.user]);

  const impersonation = session?.impersonation ?? undefined;

  // Event handlers - must be before early return to maintain hook order
  const handleStepClick = useCallback((stepId: number) => {
    setActiveBox(prev => prev === stepId ? null : stepId);
  }, []);

  const handleCloseBox = useCallback(() => {
    setActiveBox(null);
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setActiveBox(null);
    }
  }, []);

  // Computed values - must be before early return to maintain hook order
  const activeStep = useMemo(() => 
    activeBox ? timelineSteps.find((step) => step.id === activeBox) : null, 
    [activeBox]
  );
  
  const activeDetails = useMemo(() => 
    activeBox ? getStepDetails(activeBox) : null, 
    [activeBox]
  );

  const scaledStepPositions = useMemo(() => 
    timelineSteps.map((step) => ({
      ...step,
      scaledTop: step.top * timelineScale,
      scaledLeft: (step.left + TIMELINE_CONFIG.NODE_OFFSET_X) * timelineScale,
    })), 
    [timelineScale]
  );

  const circleSize = useMemo(() => 
    Math.max(TIMELINE_CONFIG.MIN_CIRCLE_SIZE, TIMELINE_CONFIG.MAX_CIRCLE_SIZE * timelineScale), 
    [timelineScale]
  );
  
  const circleFontSize = useMemo(() => 
    Math.max(TIMELINE_CONFIG.MIN_FONT_SIZE, TIMELINE_CONFIG.MAX_FONT_SIZE * timelineScale), 
    [timelineScale]
  );
  
  const activePosition = useMemo(() => {
    if (!activeStep || !activeDetails) return null;
    return {
      top: activeStep.top * timelineScale,
      left: (activeStep.left + TIMELINE_CONFIG.NODE_OFFSET_X) * timelineScale,
    };
  }, [activeStep, activeDetails, timelineScale]);
  
  const tooltipPosition = useMemo(() => {
    if (!activePosition) return { left: 0, top: 0 };
    return {
      left: activePosition.left + TIMELINE_CONFIG.TOOLTIP_OFFSET_X * timelineScale,
      top: activePosition.top,
    };
  }, [activePosition, timelineScale]);

  // Loading state
  if (!session?.user || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SharedLayout
      user={user}
      impersonation={impersonation}
      layoutType="dashboard"
      currentPage="/therapeutic-journey"
    >
      <div className="dashboard-panel-stack">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h1 className="dashboard-section__title">
                Il tuo percorso con Juanita Delgado
              </h1>
              <p className="dashboard-section__description">
                Inizia il tuo percorso terapeutico passo dopo passo. Ogni tappa rappresenta una seduta con il tuo "paziente virtuale". Procedi con calma: ogni sessione ti aiuterà a sviluppare nuove competenze, riflettere su ciò che hai appreso e sentirti sempre più sicura nel tuo ruolo. Proprio come in un viaggio, ogni punto è un piccolo traguardo. Sei pronto? Iniziamo!
              </p>
            </div>
          </div>

          <div className="hidden md:block">
            <div
              ref={timelineContainerRef}
              className="relative mx-auto w-full"
              style={{ maxWidth: `${TIMELINE_CONFIG.BASE_WIDTH}px` }}
            >
              <div
                className="relative w-full"
                style={{ paddingTop: `${(TIMELINE_CONFIG.BASE_HEIGHT / TIMELINE_CONFIG.BASE_WIDTH) * 100}%` }}
              >
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 960 1450"
                  fill="none"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="timelineGradient" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox">
                      <stop offset="0%" stopColor="#2D3231" />
                      <stop offset="40%" stopColor="#343937" />
                      <stop offset="100%" stopColor="#262C2B" />
                    </linearGradient>
                    <filter id="timelineGlow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="18" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d={timelinePathD}
                    stroke="#1f2423"
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div
                  className="absolute inset-0 z-10"
                  onClick={handleContainerClick}
                >
                  {scaledStepPositions.map((step) => (
                    <TimelineStep
                      key={step.id}
                      step={step}
                      circleSize={circleSize}
                      circleFontSize={circleFontSize}
                      onStepClick={handleStepClick}
                    />
                  ))}

                  {activeStep && activeDetails && (
                    <DesktopTooltip
                      activeDetails={activeDetails}
                      tooltipPosition={tooltipPosition}
                      onClose={handleCloseBox}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 md:hidden">
            <div className="relative pl-8">
              <span className="pointer-events-none absolute left-3 top-0 h-full w-px bg-[#1f2423]" />
              <div className="space-y-5">
                {timelineSteps.map((step) => {
                  const details = getStepDetails(step.id);
                  const isOpen = activeBox === step.id;

                  return (
                    <MobileTimelineStep
                      key={`mobile-step-${step.id}`}
                      step={step}
                      details={details}
                      isOpen={isOpen}
                      onStepClick={handleStepClick}
                      onClose={handleCloseBox}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </SharedLayout>
  );
}
