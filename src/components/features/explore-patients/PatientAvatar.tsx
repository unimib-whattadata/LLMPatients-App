"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface PatientAvatarProps {
  name: string;
  avatarUrl?: string | null;
  avatarType: string;
  isDetailPage?: boolean;
}

const COLOR_SWATCHES: ReadonlyArray<string> = [
  "", // Pink
  "", // Purple
  "", // Deep Purple
  "", // Indigo
  "", // Blue
  "", // Light Blue
  "", // Cyan
  "", // Teal
  "", // Green
  "", // Light Green
  "", // Lime
  "", // Yellow
  "", // Amber
  "", // Orange
  "", // Deep Orange
  "", // Brown
  "", // Blue Grey
  "", // Grey
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
    hash = (hash << 5) - hash + char;
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

export function PatientAvatar({
  name,
  avatarUrl,
  avatarType: _avatarType,
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
        className="patient-avatar-image"
        onLoad={() => setHasError(false)}
        onError={() => setHasError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized={showPlaceholder}
      />

      {hasError && avatarUrl && (
        <div className="patient-avatar-error">
          <ExclamationTriangleIcon className="mb-2 h-8 w-8" />
          <span className="text-center text-xs">Immagine non disponibile</span>
        </div>
      )}
    </div>
  );
}
