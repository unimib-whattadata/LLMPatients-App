"use client";

import { useMemo } from "react";
import { Badge } from "~/components/ui/badge";
import { EMOTION_COLORS } from "./chat-constants";
import type {
  EmotionSnapshot,
  EmotionTimelinePoint,
  EmotionVectorTimelinePoint,
} from "./chat-types";

interface EmotionalTrendPanelProps {
  snapshot: EmotionSnapshot | null;
  timeline: EmotionTimelinePoint[];
  vectorTimeline?: EmotionVectorTimelinePoint[];
  compact?: boolean;
}

interface NormalizedSnapshot {
  dominant: string;
  intensity: number;
  vector: Record<string, number>;
  description: string | null;
}

interface RadarAxisPoint {
  key: string;
  label: string;
  value: number;
  angleRadians: number;
  axisX: number;
  axisY: number;
  labelX: number;
  labelY: number;
}

const VECTOR_ORDER = [
  "SEEKING",
  "CARE",
  "PLAY",
  "FEAR",
  "RAGE",
  "PANIC_GRIEF",
  "SADNESS",
  "LUST",
  "BASE",
] as const;

const SERIES_META: Record<string, { label: string; color: string }> = {
  SEEKING: { label: "Seeking", color: EMOTION_COLORS.SEEKING },
  CARE: { label: "Care", color: EMOTION_COLORS.CARE },
  PLAY: { label: "Play", color: EMOTION_COLORS.PLAY },
  FEAR: { label: "Fear", color: EMOTION_COLORS.FEAR },
  RAGE: { label: "Rage", color: EMOTION_COLORS.RAGE },
  PANIC_GRIEF: { label: "Panic/Grief", color: EMOTION_COLORS.PANIC_GRIEF },
  SADNESS: { label: "Sadness", color: EMOTION_COLORS.SADNESS },
  LUST: { label: "Desire", color: EMOTION_COLORS.LUST },
  BASE: { label: "Neutral", color: EMOTION_COLORS.base },
};

const RADAR_LEVELS = [0.25, 0.5, 0.75, 1] as const;
const FULL_RADAR_SIZE = 232;
const COMPACT_RADAR_SIZE = 196;
const FULL_OUTER_PADDING = 40;
const COMPACT_OUTER_PADDING = 34;
const RADAR_LEVEL_LABEL_X_OFFSET = 7;

function clampIntensity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeEmotionToken(value: string): string {
  const token = value.trim();
  if (!token) return "BASE";
  return token.replace(/\s+/g, "_").toUpperCase();
}

function normalizeVector(
  vector: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!vector || typeof vector !== "object") return {};

  const normalized: Record<string, number> = {};
  Object.entries(vector).forEach(([key, rawValue]) => {
    const numericValue =
      typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!Number.isFinite(numericValue)) return;
    normalized[normalizeEmotionToken(key)] = clampIntensity(numericValue);
  });

  return normalized;
}

function prettifyEmotionLabel(value: string): string {
  return value
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSeriesColor(key: string): string {
  return SERIES_META[key]?.color ?? "var(--color-text-secondary)";
}

function getSeriesLabel(key: string): string {
  return SERIES_META[key]?.label ?? prettifyEmotionLabel(key);
}

function getAxisLabel(key: string): string {
  if (key === "PANIC_GRIEF") return "Panic";
  return getSeriesLabel(key);
}

function normalizeSnapshotData(snapshot: EmotionSnapshot): NormalizedSnapshot {
  const dominant = normalizeEmotionToken(snapshot.dominant);
  const intensity = clampIntensity(snapshot.intensity);
  const vector = normalizeVector(snapshot.vector);

  if (!(dominant in vector)) {
    vector[dominant] = intensity;
  }

  return {
    dominant,
    intensity,
    vector,
    description: snapshot.description?.trim() || null,
  };
}

function polarToCartesian(
  center: number,
  radius: number,
  angleRadians: number,
): { xCoord: number; yCoord: number } {
  return {
    xCoord: center + Math.cos(angleRadians) * radius,
    yCoord: center + Math.sin(angleRadians) * radius,
  };
}

export function EmotionTrendPanel({
  snapshot,
  timeline,
  vectorTimeline = [],
  compact = false,
}: EmotionalTrendPanelProps) {
  const normalizedTimeline = useMemo(() => {
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return [] as EmotionTimelinePoint[];
    }

    const byTurn = new Map<number, EmotionTimelinePoint>();

    timeline.forEach((point) => {
      if (!point || !Number.isFinite(point.turn_index)) {
        return;
      }

      byTurn.set(point.turn_index, {
        turn_index: point.turn_index,
        timestamp: point.timestamp,
        emotion: point.emotion,
        intensity: clampIntensity(point.intensity),
      });
    });

    return [...byTurn.values()].sort((a, b) => a.turn_index - b.turn_index);
  }, [timeline]);

  const normalizedVectorTimeline = useMemo(() => {
    if (Array.isArray(vectorTimeline) && vectorTimeline.length > 0) {
      const byTurn = new Map<number, EmotionVectorTimelinePoint>();

      vectorTimeline.forEach((point) => {
        if (!point || !Number.isFinite(point.turn_index)) return;

        const dominant = normalizeEmotionToken(point.dominant);
        const vector = normalizeVector(point.vector);
        if (!(dominant in vector)) {
          vector[dominant] = 0;
        }

        byTurn.set(point.turn_index, {
          turn_index: point.turn_index,
          timestamp:
            typeof point.timestamp === "string" && point.timestamp.trim()
              ? point.timestamp
              : new Date().toISOString(),
          dominant,
          vector,
        });
      });

      return [...byTurn.values()].sort((a, b) => a.turn_index - b.turn_index);
    }

    return normalizedTimeline.map((point) => {
      const dominant = normalizeEmotionToken(point.emotion);
      return {
        turn_index: point.turn_index,
        timestamp: point.timestamp,
        dominant,
        vector: {
          [dominant]: clampIntensity(point.intensity),
        },
      } satisfies EmotionVectorTimelinePoint;
    });
  }, [normalizedTimeline, vectorTimeline]);

  const currentSnapshot = useMemo(() => {
    if (snapshot) {
      return normalizeSnapshotData(snapshot);
    }

    if (normalizedVectorTimeline.length > 0) {
      const latestPoint =
        normalizedVectorTimeline[normalizedVectorTimeline.length - 1];

      if (!latestPoint) {
        return null;
      }

      const dominant = normalizeEmotionToken(latestPoint.dominant);
      const vector = normalizeVector(latestPoint.vector);
      if (!(dominant in vector)) {
        vector[dominant] = 0;
      }

      return {
        dominant,
        intensity: clampIntensity(vector[dominant] ?? 0),
        vector,
        description: null,
      } satisfies NormalizedSnapshot;
    }

    if (normalizedTimeline.length > 0) {
      const latestPoint = normalizedTimeline[normalizedTimeline.length - 1];
      if (!latestPoint) {
        return null;
      }

      const dominant = normalizeEmotionToken(latestPoint.emotion);
      return {
        dominant,
        intensity: clampIntensity(latestPoint.intensity),
        vector: {
          [dominant]: clampIntensity(latestPoint.intensity),
        },
        description: null,
      } satisfies NormalizedSnapshot;
    }

    return null;
  }, [snapshot, normalizedVectorTimeline, normalizedTimeline]);

  const seriesKeys = useMemo(() => {
    if (!currentSnapshot) {
      return [] as string[];
    }

    const keys = new Set<string>();
    Object.entries(currentSnapshot.vector).forEach(([seriesKey, value]) => {
      const normalizedSeriesKey = normalizeEmotionToken(seriesKey);
      if (
        clampIntensity(value) > 0.01 ||
        normalizedSeriesKey === currentSnapshot.dominant
      ) {
        keys.add(normalizedSeriesKey);
      }
    });

    if (currentSnapshot.dominant) {
      keys.add(currentSnapshot.dominant);
    }

    const ordered = VECTOR_ORDER.filter((seriesKey) => keys.has(seriesKey));
    const orderedSet = new Set<string>(VECTOR_ORDER);
    const extras = [...keys]
      .filter((seriesKey) => !orderedSet.has(seriesKey))
      .sort((seriesKeyA, seriesKeyB) => seriesKeyA.localeCompare(seriesKeyB));

    const finalKeys = [...ordered, ...extras];

    if (finalKeys.length < 3) {
      VECTOR_ORDER.forEach((seriesKey) => {
        if (finalKeys.length >= 3) return;
        if (!finalKeys.includes(seriesKey)) {
          finalKeys.push(seriesKey);
        }
      });
    }

    return finalKeys;
  }, [currentSnapshot]);

  const radarSize = compact ? COMPACT_RADAR_SIZE : FULL_RADAR_SIZE;
  const radarCenter = radarSize / 2;
  const outerPadding = compact ? COMPACT_OUTER_PADDING : FULL_OUTER_PADDING;
  const radarRadius = radarCenter - outerPadding;
  const labelDistance = radarRadius + (compact ? 14 : 17);

  const axisPoints = useMemo(() => {
    if (seriesKeys.length === 0 || !currentSnapshot) {
      return [] as RadarAxisPoint[];
    }

    const angleStep = (Math.PI * 2) / seriesKeys.length;
    return seriesKeys.map((seriesKey, index) => {
      const angleRadians = -Math.PI / 2 + angleStep * index;
      const axisCoordinates = polarToCartesian(radarCenter, radarRadius, angleRadians);
      const labelCoordinates = polarToCartesian(
        radarCenter,
        labelDistance,
        angleRadians,
      );
      const label = getAxisLabel(seriesKey);
      const estimatedHalfLabelWidth = label.length * (compact ? 2.4 : 2.8);
      const safeLabelX = Math.min(
        radarSize - estimatedHalfLabelWidth - 4,
        Math.max(estimatedHalfLabelWidth + 4, labelCoordinates.xCoord),
      );
      const safeLabelY = Math.min(
        radarSize - 7,
        Math.max(7, labelCoordinates.yCoord),
      );

      return {
        key: seriesKey,
        label,
        value: clampIntensity(currentSnapshot.vector[seriesKey] ?? 0),
        angleRadians,
        axisX: axisCoordinates.xCoord,
        axisY: axisCoordinates.yCoord,
        labelX: safeLabelX,
        labelY: safeLabelY,
      };
    });
  }, [
    seriesKeys,
    currentSnapshot,
    radarCenter,
    radarRadius,
    labelDistance,
    compact,
    radarSize,
  ]);

  const levelPolygons = useMemo(() => {
    if (axisPoints.length === 0) {
      return [] as string[];
    }

    return RADAR_LEVELS.map((levelValue) => {
      const points = axisPoints
        .map((axisPoint) => {
          const levelCoordinates = polarToCartesian(
            radarCenter,
            radarRadius * levelValue,
            axisPoint.angleRadians,
          );
          return `${levelCoordinates.xCoord.toFixed(2)} ${levelCoordinates.yCoord.toFixed(2)}`;
        })
        .join(" ");
      return points;
    });
  }, [axisPoints, radarCenter, radarRadius]);

  const radarPath = useMemo(() => {
    if (axisPoints.length === 0) {
      return "";
    }

    const commands = axisPoints
      .map((axisPoint, index) => {
        const valueCoordinates = polarToCartesian(
          radarCenter,
          radarRadius * axisPoint.value,
          axisPoint.angleRadians,
        );
        const commandType = index === 0 ? "M" : "L";
        return `${commandType} ${valueCoordinates.xCoord.toFixed(2)} ${valueCoordinates.yCoord.toFixed(2)}`;
      })
      .join(" ");

    return `${commands} Z`;
  }, [axisPoints, radarCenter, radarRadius]);

  const dominantLabel = currentSnapshot?.dominant
    ? getSeriesLabel(currentSnapshot.dominant)
    : null;
  const dominantSnapshotKey = currentSnapshot?.dominant
    ? normalizeEmotionToken(currentSnapshot.dominant)
    : null;
  const dominantColor = dominantSnapshotKey
    ? getSeriesColor(dominantSnapshotKey)
    : "var(--color-primary-green)";
  const snapshotDescription = currentSnapshot?.description ?? null;

  return (
    <div className="w-full rounded-xl border border-[var(--color-border-secondary)] bg-[var(--color-surface-primary)]/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-[var(--color-text-primary)]">
          Emotional Trend
        </h3>
        {dominantLabel && (
          <Badge
            variant="outline"
            className="border-[var(--color-primary-green)]/40 bg-[var(--color-primary-green)]/10 text-[var(--color-primary-green)]"
          >
            {dominantLabel}
          </Badge>
        )}
      </div>

      {axisPoints.length > 0 ? (
        <div
          className="w-full rounded-lg border border-[var(--color-border-secondary)]/80 bg-[var(--color-surface-secondary)]/35 p-2"
          aria-label="Current emotional radar"
        >
          <svg
            viewBox={`0 0 ${radarSize} ${radarSize}`}
            className="mx-auto h-auto w-full max-w-[248px]"
            role="img"
            aria-label="Current emotions radar chart"
          >
            {levelPolygons.map((polygonPoints, index) => (
              <polygon
                key={`grid-level-${RADAR_LEVELS[index]}`}
                points={polygonPoints}
                fill="none"
                stroke="var(--color-border-secondary)"
                strokeWidth={0.85}
                opacity={0.85}
              />
            ))}

            {RADAR_LEVELS.map((levelValue) => {
              const y =
                radarCenter - radarRadius * levelValue;
              return (
                <text
                  key={`level-label-${levelValue}`}
                  x={radarCenter - radarRadius - RADAR_LEVEL_LABEL_X_OFFSET}
                  y={y + 3}
                  fontSize={compact ? "7" : "8"}
                  textAnchor="end"
                  fill="var(--color-text-secondary)"
                >
                  {Math.round(levelValue * 100)}%
                </text>
              );
            })}

            {axisPoints.map((axisPoint) => (
              <line
                key={`axis-${axisPoint.key}`}
                x1={radarCenter}
                y1={radarCenter}
                x2={axisPoint.axisX}
                y2={axisPoint.axisY}
                stroke="var(--color-border-secondary)"
                strokeWidth={0.9}
                opacity={0.78}
              />
            ))}

            <path
              d={radarPath}
              fill={dominantColor}
              fillOpacity={0.2}
              stroke={dominantColor}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {axisPoints.map((axisPoint) => {
              const valueCoordinates = polarToCartesian(
                radarCenter,
                radarRadius * axisPoint.value,
                axisPoint.angleRadians,
              );
              return (
                <circle
                  key={`value-${axisPoint.key}`}
                  cx={valueCoordinates.xCoord}
                  cy={valueCoordinates.yCoord}
                  r={2.6}
                  fill={getSeriesColor(axisPoint.key)}
                  stroke="var(--color-surface-primary)"
                  strokeWidth={1.1}
                />
              );
            })}

            {axisPoints.map((axisPoint) => (
              <text
                key={`label-${axisPoint.key}`}
                x={axisPoint.labelX}
                y={axisPoint.labelY}
                fontSize={compact ? "8" : "9"}
                fill="var(--color-text-primary)"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight={600}
                paintOrder="stroke"
                stroke="var(--color-surface-primary)"
                strokeWidth={2}
              >
                {axisPoint.label}
              </text>
            ))}
          </svg>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Emotional data unavailable.
        </p>
      )}

      {axisPoints.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {axisPoints.map((axisPoint) => (
            <div
              key={`legend-${axisPoint.key}`}
              className={`inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-secondary)]/65 bg-[var(--color-surface-secondary)]/45 px-2 py-1 ${compact ? "text-[9px]" : "text-[10px]"}`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: getSeriesColor(axisPoint.key) }}
              />
              <span className="text-[var(--color-text-primary)]">
                {getSeriesLabel(axisPoint.key)}:
              </span>
              <span className="tabular-nums text-[var(--color-text-secondary)]">
                {(axisPoint.value * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {snapshotDescription && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          {snapshotDescription}
        </p>
      )}
    </div>
  );
}
