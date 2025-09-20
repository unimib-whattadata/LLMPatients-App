"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface PatientAvatarProps {
  name: string;
  avatarUrl?: string | null;
  avatarType: "photo" | "illustration" | "avatar";
}

const COLOR_SWATCHES: ReadonlyArray<[string, string]> = [
  ["#1f2937", "#3b82f6"],
  ["#374151", "#10b981"],
  ["#4b5563", "#f59e0b"],
  ["#6b7280", "#ef4444"],
  ["#374151", "#8b5cf6"],
  ["#1f2937", "#06b6d4"],
];

const BADGE_VARIANTS: Record<PatientAvatarProps["avatarType"], string> = {
  photo: "patient-avatar-badge patient-avatar-badge--photo",
  illustration: "patient-avatar-badge patient-avatar-badge--illustration",
  avatar: "patient-avatar-badge patient-avatar-badge--avatar",
};

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function colorIndexFor(name: string) {
  const hash = name.split("").reduce((acc, char) => {
    const next = (acc << 5) - acc + char.charCodeAt(0);
    return next & next;
  }, 0);

  return Math.abs(hash) % COLOR_SWATCHES.length;
}

function buildPlaceholder(name: string) {
  const initials = initialsFromName(name) || "?";
  const [background, accent] = COLOR_SWATCHES[colorIndexFor(name)] ?? COLOR_SWATCHES[0]!;

  const svg = `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" fill="${background}" />
      <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
      <text x="96" y="110" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="52" font-weight="600" text-anchor="middle" fill="#ffffff">${initials}</text>
      <circle cx="96" cy="96" r="85" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <circle cx="156" cy="40" r="18" fill="${accent}" opacity="0.45" />
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function PatientAvatar({ name, avatarUrl, avatarType }: PatientAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const placeholder = useMemo(() => buildPlaceholder(name), [name]);
  const showPlaceholder = !avatarUrl || hasError;
  const badgeClass = BADGE_VARIANTS[avatarType] ?? "patient-avatar-badge";

  return (
    <div className="patient-avatar-container">
      <Image
        src={showPlaceholder ? placeholder : avatarUrl}
        alt={`Avatar di ${name}`}
        fill
        className="patient-avatar-image"
        onLoad={() => setHasError(false)}
        onError={() => setHasError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized={showPlaceholder}
      />

      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {hasError && avatarUrl && (
        <div className="patient-avatar-error">
          <ExclamationTriangleIcon className="w-8 h-8 mb-2" />
          <span className="text-xs text-center">Immagine non disponibile</span>
        </div>
      )}

      {avatarType !== "illustration" && (
        <div className="patient-avatar-badge-wrapper">
          <div className={badgeClass}>{avatarType === "photo" ? "[PHOTO]" : ""}</div>
        </div>
      )}
    </div>
  );
}
