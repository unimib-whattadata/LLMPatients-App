import type { PatientEmotion } from "./chat-constants";
import { AVATAR_COLOR_CLASSES } from "./chat-constants";

const FALLBACK_AVATAR_URL = "/images/patients/alex_carter/base.png";

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
  const resolvedAvatarUrl = avatarUrl ?? FALLBACK_AVATAR_URL;

  const isRealisticSet = resolvedAvatarUrl.includes("/realistic/");
  const isDanielSet = resolvedAvatarUrl.includes("/daniel_isherwood/");
  const requestedEmotion = emotionLower === "base" ? "listening" : emotionLower;
  const mappedEmotion =
    requestedEmotion === "sadness"
      ? isDanielSet
        ? "pain-grief"
        : isRealisticSet
          ? "panic_grief"
          : "sadness"
      : requestedEmotion;

  // Replace emotion + extension keeping original directory and extension.
  // Example:
  // "/images/patients/crystal_smith/realistic/base.png" -> "/images/patients/crystal_smith/realistic/seeking.png"
  const emotionWithExtensionPattern =
    /(base|listening|seeking|rage|fear|care|lust|sadness|panic_grief|pain-grief|play)\.(png|jpe?g|webp)$/i;
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
