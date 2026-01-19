export type PathPoint = {
  x: number;
  y: number;
};

export type TimelineStep = {
  id: number;
  top: number;
  left: number;
  color: string;
  textColor?: string;
};

export const TIMELINE_CONFIG = {
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

const timelineSteps: TimelineStep[] = [
  { id: 1, top: 150, left: 533, color: "var(--color-primary-green)" },
  { id: 2, top: 340, left: 333, color: "var(--color-primary-green)" },
  { id: 3, top: 460, left: 533, color: "var(--color-primary-yellow)" },
  { id: 4, top: 560, left: 713, color: "var(--color-primary-yellow)" },
  { id: 5, top: 680, left: 533, color: "var(--color-primary-yellow)" },
  { id: 6, top: 780, left: 373, color: "var(--color-primary-yellow)" },
  { id: 7, top: 900, left: 533, color: "var(--color-primary-yellow)" },
  { id: 8, top: 1000, left: 713, color: "var(--color-primary-yellow)" },
  { id: 9, top: 1120, left: 533, color: "var(--color-primary-yellow)" },
  { id: 10, top: 1210, left: 353, color: "var(--color-primary-yellow)" },
  { id: 11, top: 1400, left: 533, color: "var(--color-primary-violet)" },
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

export const TIMELINE_STEPS = timelineSteps;

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

export type StepDetails = {
  phaseTitle: string;
  sessionLabel: string;
  tips: readonly string[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  bodyColor: string;
};

const STEP_DETAILS_CONFIG = {
  CONCLUSION: {
    phaseTitle: "Conclusione",
    sessionLabel: "Seduta 11",
    tips: TIPS_CONFIG.CONCLUSION,
    backgroundColor: "",
    textColor: "",
    accentColor: "",
    bodyColor: "",
  },
  INTERVENTION: {
    phaseTitle: "Fase di Intervento",
    sessionLabel: "Sedute 3-10",
    tips: TIPS_CONFIG.INTERVENTION,
    backgroundColor: "",
    textColor: "",
    accentColor: "",
    bodyColor: "",
  },
  KNOWLEDGE: {
    phaseTitle: "Fase di Conoscenza",
    sessionLabel: "Sedute 1-2",
    tips: TIPS_CONFIG.KNOWLEDGE,
    backgroundColor: "",
    textColor: "",
    accentColor: "",
    bodyColor: "",
  },
} as const;

export const getStepDetails = (stepId: number): StepDetails => {
  if (stepId === 11) return STEP_DETAILS_CONFIG.CONCLUSION;
  if (stepId >= 3) return STEP_DETAILS_CONFIG.INTERVENTION;
  return STEP_DETAILS_CONFIG.KNOWLEDGE;
};

export const buildRoundedOrthogonalPath = (
  points: PathPoint[],
  radius: number,
): string => {
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
      const isCorner =
        directionX !== nextDirectionX || directionY !== nextDirectionY;

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
      const sweepFlag =
        directionX * nextDirectionY - directionY * nextDirectionX > 0 ? 1 : 0;

      pathCommands.push(
        `A ${cornerRadius} ${cornerRadius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`,
      );

      currentX = arcEndX;
      currentY = arcEndY;
    }
  }

  return pathCommands.join(" ");
};

export const timelinePathD = buildRoundedOrthogonalPath(
  timelinePathPoints,
  TIMELINE_CONFIG.PATH_RADIUS,
);
