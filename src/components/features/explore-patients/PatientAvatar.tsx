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
  "oklch(0.623 0.214 259.815)", // blue-500
  "oklch(0.765 0.177 163.223)", // emerald-400
  "oklch(0.769 0.188 70.08)", // amber-500
  "oklch(0.704 0.191 22.216)", // red-400
  "oklch(0.714 0.203 305.504)", // violet-400
  "oklch(0.789 0.154 211.53)", // cyan-400
  "oklch(0.768 0.233 130.85)", // lime-400
  "oklch(0.75 0.183 55.934)", // orange-400
  "oklch(0.718 0.202 349.761)", // pink-400
  "oklch(0.673 0.182 276.935)", // indigo-500
  "oklch(0.777 0.152 181.912)", // teal-400
  "oklch(0.712 0.194 13.428)", // rose-400
  "oklch(0.714 0.203 305.504)", // purple-400
  "oklch(0.792 0.209 151.711)", // green-400
  "oklch(0.852 0.199 91.936)", // yellow-400
  "oklch(0.577 0.245 27.325)", // red-600
  "oklch(0.546 0.245 262.881)", // blue-600
  "oklch(0.596 0.145 163.225)", // emerald-600
  "oklch(0.666 0.179 58.318)", // amber-600
  "oklch(0.541 0.281 293.009)", // violet-600
  "oklch(0.609 0.126 221.723)", // cyan-600
  "oklch(0.648 0.2 131.684)", // lime-600
  "oklch(0.646 0.222 41.116)", // orange-600
  "oklch(0.592 0.249 354.308)", // pink-600
  "oklch(0.511 0.262 276.966)", // indigo-600
  "oklch(0.6 0.118 184.704)", // teal-600
  "oklch(0.586 0.225 17.18)", // rose-600
  "oklch(0.558 0.288 302.321)", // purple-600
  "oklch(0.627 0.194 149.214)", // green-600
  "oklch(0.728 0.183 95.782)", // yellow-600
  "oklch(0.505 0.213 27.518)", // red-700
  "oklch(0.488 0.243 264.376)", // blue-700
  "oklch(0.545 0.134 163.79)", // emerald-700
  "oklch(0.555 0.163 48.998)", // amber-700
  "oklch(0.491 0.27 292.581)", // violet-700
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
        alt={`Avatar of ${name}`}
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
          <span className="text-center text-xs">Image unavailable</span>
        </div>
      )}
    </div>
  );
}
