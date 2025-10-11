"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface PatientAvatarProps {
  name: string;
  avatarUrl?: string | null;
  isDetailPage?: boolean;
}

const COLOR_SWATCHES: ReadonlyArray<string> = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F43F5E", // Rose
  "#A855F7", // Purple
  "#22C55E", // Green
  "#EAB308", // Yellow
  "#DC2626", // Red-600
  "#2563EB", // Blue-600
  "#059669", // Emerald-600
  "#D97706", // Amber-600
  "#7C3AED", // Violet-600
  "#0891B2", // Cyan-600
  "#65A30D", // Lime-600
  "#EA580C", // Orange-600
  "#DB2777", // Pink-600
  "#4F46E5", // Indigo-600
  "#0D9488", // Teal-600
  "#E11D48", // Rose-600
  "#9333EA", // Purple-600
  "#16A34A", // Green-600
  "#CA8A04", // Yellow-600
  "#B91C1C", // Red-700
  "#1D4ED8", // Blue-700
  "#047857", // Emerald-700
  "#B45309", // Amber-700
  "#6D28D9", // Violet-700
];

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function colorIndexFor(name: string) {
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; 
  }

  
  return Math.abs(hash) % COLOR_SWATCHES.length;
}

function buildPlaceholder(name: string) {
  const initials = initialsFromName(name) || "?";
  const background = COLOR_SWATCHES[colorIndexFor(name)] ?? COLOR_SWATCHES[0]!;

  const svg = `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" fill="${background}" />
      <text x="96" y="96" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function PatientAvatar({
  name,
  avatarUrl,
  isDetailPage = false,
}: PatientAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const placeholder = useMemo(() => buildPlaceholder(name), [name]);
  const showPlaceholder = !avatarUrl || hasError;

  return (
    <div
      className={`patient-avatar-container ${isDetailPage ? "patient-avatar-container--detail" : ""}`}
    >
      <Image
        src={showPlaceholder ? placeholder : avatarUrl}
        alt={`Avatar di ${name}`}
        width={400}
        height={400}
        className="patient-avatar-image image-auto-size"
        onLoad={() => setHasError(false)}
        onError={() => setHasError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized={showPlaceholder}
        priority={isDetailPage}
      />

      {hasError && avatarUrl && (
        <div className="patient-avatar-error">
          <AlertTriangle className="mb-2 h-8 w-8" />
          <span className="text-center text-xs">Immagine non disponibile</span>
        </div>
      )}
    </div>
  );
}