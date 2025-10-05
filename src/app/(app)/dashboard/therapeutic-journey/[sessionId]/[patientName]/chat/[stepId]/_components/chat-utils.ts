/**
 * Chat Utility Functions
 * 
 * Reusable utility functions for chat functionality
 */

import type { PatientEmotion } from "./chat-constants";
import { AVATAR_COLOR_CLASSES } from "./chat-constants";

/**
 * Formats session time in MM:SS format
 */
export function formatSessionTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Gets the avatar path based on patient name and emotion
 */
export function getPatientAvatarPath(
  patientName: string, 
  emotion: PatientEmotion = "base"
): string {
  // Normalize patient name for file path
  const normalizedName = patientName.toLowerCase().replace(/\s+/g, "-");
  
  // Map patient names to their folder names
  const patientFolderMap: Record<string, string> = {
    "john": "john",
    "juanita": "juanita",
    "todd": "todd",
  };
  
  const folderName = patientFolderMap[normalizedName] || normalizedName;
  
  // Check if emotion image exists (Todd has all emotions, others only have base)
  if (folderName === "todd" || emotion === "base") {
    return `/images/patients/${folderName}/${emotion}.png`;
  }
  
  // Fallback to base for patients without emotion avatars
  return `/images/patients/${folderName}/base.png`;
}

/**
 * Generates a consistent avatar placeholder for patients based on their name
 */
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

