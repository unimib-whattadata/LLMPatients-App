"use client";

import { SharedLayout } from "~/components/layout/SharedLayout";
import { useState, useEffect, useRef } from "react";

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
  { id: 1, top: 150, left: 700, color: "#B9C87C" },
  { id: 2, top: 340, left: 500, color: "#B9C87C" },
  { id: 3, top: 460, left: 700, color: "#E3B23C" },
  { id: 4, top: 560, left: 880, color: "#E3B23C" },
  { id: 5, top: 680, left: 700, color: "#E3B23C" },
  { id: 6, top: 780, left: 540, color: "#E3B23C" },
  { id: 7, top: 900, left: 700, color: "#E3B23C" },
  { id: 8, top: 1000, left: 880, color: "#E3B23C" },
  { id: 9, top: 1120, left: 700, color: "#E3B23C" },
  { id: 10, top: 1210, left: 520, color: "#E3B23C" },
  { id: 11, top: 1400, left: 700, color: "#B4A7E6" },
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

const TIMELINE_BASE_WIDTH = 960;
const TIMELINE_BASE_HEIGHT = 1450;
const TIMELINE_TOOLTIP_OFFSET_X = 100;
const TIMELINE_NODE_OFFSET_X = -14;

const knowledgeTips = [
  "Ascolta attivamente il paziente senza interrompere.",
  "Mantieni un atteggiamento empatico e non giudicante.",
  "Fai domande aperte per approfondire la comprensione.",
  "Osserva il linguaggio del corpo e le emozioni.",
];

const interventionTips = [
  "Utilizza tecniche di riformulazione per chiarire i concetti.",
  "Proponi strategie concrete e personalizzate per il paziente.",
  "Mantieni un approccio collaborativo e coinvolgente.",
  "Monitora i progressi e adatta l'intervento di conseguenza.",
  "Fornisci feedback costruttivo e incoraggiante.",
  "Documenta accuratamente le osservazioni e i progressi.",
];

const conclusionTips = [
  "Riassumi i punti chiave emersi durante il percorso.",
  "Valuta l'efficacia delle strategie implementate.",
  "Pianifica eventuali follow-up o approfondimenti.",
  "Celebra i progressi e i successi ottenuti.",
];

const timelinePathD = buildRoundedOrthogonalPath(timelinePathPoints, 60);

type StepDetails = {
  phaseTitle: string;
  sessionLabel: string;
  tips: string[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  bodyColor: string;
};

const getStepDetails = (stepId: number): StepDetails => {
  if (stepId === 11) {
    return {
      phaseTitle: "Conclusione",
      sessionLabel: "Seduta 11",
      tips: conclusionTips,
      backgroundColor: "#2a2548",
      textColor: "#EEE9FF",
      accentColor: "#B8A7F4",
      bodyColor: "#E4DEFF",
    };
  }

  if (stepId >= 3) {
    return {
      phaseTitle: "Fase di Intervento",
      sessionLabel: "Sedute 3-10",
      tips: interventionTips,
      backgroundColor: "#1a2720",
      textColor: "#E8F4E3",
      accentColor: "#9BD0A8",
      bodyColor: "#DAE7D8",
    };
  }

  return {
    phaseTitle: "Fase di Conoscenza",
    sessionLabel: "Sedute 1-2",
    tips: knowledgeTips,
    backgroundColor: "#1a2720",
    textColor: "#E8F4E3",
    accentColor: "#9BD0A8",
    bodyColor: "#DAE7D8",
  };
};

function buildRoundedOrthogonalPath(points: PathPoint[], radius: number): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const [point] = points;
    return `M ${point.x} ${point.y}`;
  }

  const pathCommands: string[] = [`M ${points[0].x} ${points[0].y}`];
  let currentX = points[0].x;
  let currentY = points[0].y;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
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


export default function TherapeuticJourneyPage() {
  const [session, setSession] = useState<any>(null);
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const [timelineScale, setTimelineScale] = useState(1);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get session data
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

  useEffect(() => {
    const element = timelineContainerRef.current;
    if (!element) {
      return;
    }

    const updateScale = () => {
      const width = element.clientWidth;
      if (width === 0) {
        return;
      }

      setTimelineScale(width / TIMELINE_BASE_WIDTH);
    };

    updateScale();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateScale());
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [session?.user]);

  if (!session || !session.user) {
    return <div>Loading...</div>;
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email!,
    role: (session.user.role as "admin" | "user") || "user",
    image: session.user.image,
  };

  const impersonation = session.impersonation ?? undefined;

  const handleStepClick = (stepId: number) => {
    if (activeBox === stepId) {
      setActiveBox(null); // Hide if already active
    } else {
      setActiveBox(stepId); // Show the clicked step's box
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Only close if clicking on the container itself, not on child elements
    if (e.target === e.currentTarget) {
      setActiveBox(null);
    }
  };

  const activeStep = activeBox ? timelineSteps.find((step) => step.id === activeBox) : null;
  const activeDetails = activeBox ? getStepDetails(activeBox) : null;

  const scaledStepPositions = timelineSteps.map((step) => ({
    ...step,
    scaledTop: step.top * timelineScale,
    scaledLeft: (step.left + TIMELINE_NODE_OFFSET_X) * timelineScale,
  }));

  const circleSize = Math.max(40, 62 * timelineScale);
  const circleFontSize = Math.max(14, 18 * timelineScale);
  const activePosition =
    activeStep && activeDetails
      ? {
          top: activeStep.top * timelineScale,
          left: (activeStep.left + TIMELINE_NODE_OFFSET_X) * timelineScale,
        }
      : null;
  const tooltipLeft = activePosition
    ? activePosition.left + TIMELINE_TOOLTIP_OFFSET_X * timelineScale
    : 0;
  const tooltipTop = activePosition ? activePosition.top : 0;

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
              style={{ maxWidth: `${TIMELINE_BASE_WIDTH}px` }}
            >
              <div
                className="relative w-full"
                style={{ paddingTop: `${(TIMELINE_BASE_HEIGHT / TIMELINE_BASE_WIDTH) * 100}%` }}
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
                      onClick={() => handleStepClick(step.id)}
                    >
                      {step.id}
                    </div>
                  ))}

                  {activeStep && activeDetails && (
                    <div
                      className="absolute z-20 w-80 -translate-x-1/2 -translate-y-1/2 rounded-[28px] p-8"
                      style={{
                        top: `${tooltipTop}px`,
                        left: `${tooltipLeft}px`,
                        backgroundColor: activeDetails.backgroundColor,
                        color: activeDetails.textColor,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h2 className="text-heading-3 font-semibold text-white">
                        {activeDetails.phaseTitle}
                      </h2>
                      <p
                        className="mt-2 text-sm font-medium uppercase tracking-[0.18em]"
                        style={{ color: activeDetails.accentColor }}
                      >
                        {activeDetails.sessionLabel}
                      </p>
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
                            style={{ markerColor: activeDetails.accentColor }}
                          >
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
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
                    <div key={`mobile-step-${step.id}`} className="relative">
                      <span
                        className="absolute -left-5 top-4 flex h-3 w-3 items-center justify-center"
                        aria-hidden
                      >
                        <span
                          className="block h-3 w-3 rounded-full"
                          style={{ backgroundColor: step.color }}
                        />
                      </span>

                      <button
                        type="button"
                        onClick={() => handleStepClick(step.id)}
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
                          <span
                            className="text-xs font-semibold uppercase tracking-[0.3em]"
                            style={{ color: details.accentColor }}
                          >
                            {details.sessionLabel}
                          </span>
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
                                  style={{ markerColor: details.accentColor }}
                                >
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </button>
                    </div>
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
