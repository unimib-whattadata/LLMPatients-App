import type { PatientEmotion } from "./chat-constants";
import { AVATAR_COLOR_CLASSES } from "./chat-constants";

const FALLBACK_AVATAR_URL = "/images/patients/alex_carter/base.png";
const AVATAR_FILENAME_PATTERN =
  /(base|listening|seeking|rage|fear|care|lust|sadness|panic_grief|panic-grief|pain-grief|play)\.(png|jpe?g|webp)$/i;
const LOCAL_PATIENT_AVATAR_PATH_PATTERN =
  /^\/images\/patients\/[a-z0-9_-]+\/(base|listening|seeking|rage|fear|care|lust|sadness|panic_grief|panic-grief|pain-grief|play)\.(png|jpe?g|webp)([?#].*)?$/i;

function resolveFallbackAvatarUrl(
  fallbackAvatarUrl: string | null | undefined,
): string {
  if (typeof fallbackAvatarUrl !== "string" || !fallbackAvatarUrl.trim()) {
    return FALLBACK_AVATAR_URL;
  }

  const normalized =
    fallbackAvatarUrl.trim().startsWith("/")
      ? fallbackAvatarUrl.trim()
      : `/${fallbackAvatarUrl.trim()}`;

  return LOCAL_PATIENT_AVATAR_PATH_PATTERN.test(normalized)
    ? normalized
    : FALLBACK_AVATAR_URL;
}

function extractAvatarDirectory(avatarUrl: string): string | null {
  const withoutSuffix = avatarUrl.split(/[?#]/)[0] ?? avatarUrl;
  const match = withoutSuffix.match(/^(.+\/)[^/]+\.(png|jpe?g|webp)$/i);
  return match?.[1] ?? null;
}

export function sanitizePatientAvatarUrl(
  avatarUrl: string | null | undefined,
  fallbackAvatarUrl?: string | null,
): string {
  const safeFallback = resolveFallbackAvatarUrl(fallbackAvatarUrl);

  if (typeof avatarUrl !== "string" || !avatarUrl.trim()) {
    return safeFallback;
  }

  const raw = avatarUrl.trim();
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (
    LOCAL_PATIENT_AVATAR_PATH_PATTERN.test(normalized) &&
    !normalized.includes("/images/patients/old/")
  ) {
    return normalized;
  }

  const fallbackDirectory = extractAvatarDirectory(safeFallback);
  if (!fallbackDirectory) {
    return safeFallback;
  }

  const fileCandidate = normalized.replace(/^\/+/, "");
  if (
    normalized.includes("/images/patients/old/") &&
    AVATAR_FILENAME_PATTERN.test(normalized)
  ) {
    const oldPathFilename = normalized.split("/").pop();
    if (oldPathFilename && AVATAR_FILENAME_PATTERN.test(oldPathFilename)) {
      return `${fallbackDirectory}${oldPathFilename}`;
    }
  }

  if (AVATAR_FILENAME_PATTERN.test(fileCandidate)) {
    return `${fallbackDirectory}${fileCandidate}`;
  }

  return safeFallback;
}

export function formatSessionTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Get the avatar path for a patient with a specific emotion
 * Uses avatarUrl from database and replaces the emotion part
 */
export function getPatientAvatarPath(
  avatarUrl: string | null | undefined,
  emotion: PatientEmotion = "base",
): string {
  // Convert emotion to lowercase for file path (assets are lowercase).
  const emotionLower = emotion.toLowerCase();
  const resolvedAvatarUrl = sanitizePatientAvatarUrl(avatarUrl, FALLBACK_AVATAR_URL);

  const isDanielSet = resolvedAvatarUrl.includes("/daniel_isherwood/");
  const prefersHyphenPanicGrief =
    resolvedAvatarUrl.includes("/jason_smith/") ||
    resolvedAvatarUrl.includes("/juanita_delgado/");
  const requestedEmotion = emotionLower === "base" ? "listening" : emotionLower;
  const isPanicGriefEmotion =
    requestedEmotion === "sadness" ||
    requestedEmotion === "panic_grief" ||
    requestedEmotion === "panic-grief" ||
    requestedEmotion === "pain-grief";
  const mappedEmotion =
    isPanicGriefEmotion
      ? isDanielSet
        ? "pain-grief"
        : prefersHyphenPanicGrief
          ? "panic-grief"
          : "panic_grief"
      : requestedEmotion;

  // Replace emotion + extension keeping original directory and extension.
  // Example:
  // "/images/patients/crystal_smith/base.png" -> "/images/patients/crystal_smith/seeking.png"
  const emotionWithExtensionPattern = AVATAR_FILENAME_PATTERN;
  if (emotionWithExtensionPattern.test(resolvedAvatarUrl)) {
    return resolvedAvatarUrl.replace(
      emotionWithExtensionPattern,
      `${mappedEmotion}.$2`,
    );
  }

  // If filename doesn't contain an emotion token, replace only the final segment.
  const extensionMatch = resolvedAvatarUrl.match(/\.(png|jpe?g|webp)$/i);
  if (extensionMatch?.[1]) {
    const extension = extensionMatch[1].toLowerCase();
    return resolvedAvatarUrl.replace(/[^/]+\.(png|jpe?g|webp)$/i, `${mappedEmotion}.${extension}`);
  }

  // If extension cannot be inferred, keep original path.
  return resolvedAvatarUrl;
}

export function generatePatientAvatar(name: string): {
  colorClass: string;
  initials: string;
} {
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const finalInitials = initials.length > 0 ? initials : "P";

  const colorIndex =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    AVATAR_COLOR_CLASSES.length;
  const colorClass = AVATAR_COLOR_CLASSES[colorIndex] ?? "avatar-color-default";

  return { colorClass, initials: finalInitials };
}
