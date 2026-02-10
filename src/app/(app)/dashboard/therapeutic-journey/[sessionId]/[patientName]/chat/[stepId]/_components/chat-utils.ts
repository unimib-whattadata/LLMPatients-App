import type { PatientEmotion } from "./chat-constants";
import { AVATAR_COLOR_CLASSES } from "./chat-constants";

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

  // If no avatarUrl is provided, use a safe local fallback.
  if (!avatarUrl) {
    return "/images/patients/old/base.png";
  }

  const isRealisticSet = avatarUrl.includes("/realistic/");
  const mappedEmotion =
    emotionLower === "sadness" && isRealisticSet ? "panic_grief" : emotionLower;

  // Replace emotion + extension keeping original directory and extension.
  // Example:
  // "/images/patients/crystal/realistic/base.jpeg" -> "/images/patients/crystal/realistic/seeking.jpeg"
  const emotionWithExtensionPattern =
    /(base|seeking|rage|fear|care|lust|sadness|panic_grief|play)\.(png|jpe?g|webp)$/i;
  if (emotionWithExtensionPattern.test(avatarUrl)) {
    return avatarUrl.replace(
      emotionWithExtensionPattern,
      `${mappedEmotion}.$2`,
    );
  }

  // If filename doesn't contain an emotion token, replace only the final segment.
  const extensionMatch = avatarUrl.match(/\.(png|jpe?g|webp)$/i);
  if (extensionMatch?.[1]) {
    const extension = extensionMatch[1].toLowerCase();
    return avatarUrl.replace(/[^/]+\.(png|jpe?g|webp)$/i, `${mappedEmotion}.${extension}`);
  }

  // If extension cannot be inferred, keep original path.
  return avatarUrl;
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
