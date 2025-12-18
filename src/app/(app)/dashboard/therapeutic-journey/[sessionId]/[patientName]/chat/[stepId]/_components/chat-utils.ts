
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
  emotion: PatientEmotion = "base"
): string {
  // If no avatarUrl is provided, return a default placeholder
  if (!avatarUrl) {
    return `/images/patients/default/${emotion}.png`;
  }
  
  // If avatarUrl contains an emotion keyword, replace it
  // Example: "/images/patients/franklin/base.png" -> "/images/patients/franklin/SEEKING.png"
  const emotionPattern = /\/(base|SEEKING|RAGE|FEAR|CARE|LUST|SADNESS|PLAY)\.png$/i;
  
  if (emotionPattern.test(avatarUrl)) {
    return avatarUrl.replace(emotionPattern, `/${emotion}.png`);
  }
  
  // If avatarUrl doesn't follow the emotion pattern, return as is
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

