"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface PatientAvatarProps {
  name: string;
  avatarUrl?: string | null;
  avatarType: "photo" | "illustration" | "avatar";
  isDetailPage?: boolean;
}

const COLOR_SWATCHES: ReadonlyArray<string> = [
  "#E91E63", // Pink
  "#9C27B0", // Purple
  "#673AB7", // Deep Purple
  "#3F51B5", // Indigo
  "#2196F3", // Blue
  "#03A9F4", // Light Blue
  "#00BCD4", // Cyan
  "#009688", // Teal
  "#4CAF50", // Green
  "#8BC34A", // Light Green
  "#CDDC39", // Lime
  "#FFEB3B", // Yellow
  "#FFC107", // Amber
  "#FF9800", // Orange
  "#FF5722", // Deep Orange
  "#795548", // Brown
  "#607D8B", // Blue Grey
  "#9E9E9E", // Grey
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
  // Use a better hash function for better distribution
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and ensure we get a good distribution
  return Math.abs(hash) % COLOR_SWATCHES.length;
}

function buildPlaceholder(name: string) {
  const initials = initialsFromName(name) || "?";
  const background = COLOR_SWATCHES[colorIndexFor(name)] ?? COLOR_SWATCHES[0]!;

  const svg = `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" fill="${background}" />
      <text x="96" y="96" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function PatientAvatar({ name, avatarUrl, avatarType, isDetailPage = false }: PatientAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const placeholder = useMemo(() => buildPlaceholder(name), [name]);
  const showPlaceholder = !avatarUrl || hasError;

  return (
    <div className={`patient-avatar-container ${isDetailPage ? 'patient-avatar-container--detail' : ''}`}>
      <Image
        src={showPlaceholder ? placeholder : avatarUrl}
        alt={`Avatar di ${name}`}
        width={400}
        height={400}
        className="patient-avatar-image"
        onLoad={() => setHasError(false)}
        onError={() => setHasError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized={showPlaceholder}
      />

      {hasError && avatarUrl && (
        <div className="patient-avatar-error">
          <ExclamationTriangleIcon className="w-8 h-8 mb-2" />
          <span className="text-xs text-center">Immagine non disponibile</span>
        </div>
      )}

    </div>
  );
}
