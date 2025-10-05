
import type { PatientEmotion } from "./chat-constants";
import { AVATAR_COLOR_CLASSES } from "./chat-constants";

export function formatSessionTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function getPatientAvatarPath(
  patientName: string, 
  emotion: PatientEmotion = "base"
): string {
  
  const normalizedName = patientName.toLowerCase().replace(/\s+/g, "-");
  
  
  const patientFolderMap: Record<string, string> = {
    "john": "john",
    "juanita": "juanita",
    "todd": "todd",
  };
  
  const folderName = patientFolderMap[normalizedName] || normalizedName;
  
  
  if (folderName === "todd" || emotion === "base") {
    return `/images/patients/${folderName}/${emotion}.png`;
  }
  
  
  return `/images/patients/${folderName}/base.png`;
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

