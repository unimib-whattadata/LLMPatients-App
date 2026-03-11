

export type PatientEmotion =
  | "SEEKING"
  | "RAGE"
  | "FEAR"
  | "CARE"
  | "LUST"
  | "PANIC_GRIEF"
  | "SADNESS"
  | "PLAY"
  | "base";

export const EMOTION_LABELS: Record<PatientEmotion, string> = {
  SEEKING: "Seeking",
  RAGE: "Rage",
  FEAR: "Fear",
  CARE: "Care",
  LUST: "Desire",
  PANIC_GRIEF: "Panic/Grief",
  SADNESS: "Sadness",
  PLAY: "Play",
  base: "Neutral",
};

export const EMOTION_COLORS: Record<PatientEmotion, string> = {
  SEEKING: "oklch(0.75 0.183 55.934)", // orange-400
  RAGE: "oklch(0.704 0.191 22.216)", // red-400
  FEAR: "oklch(0.714 0.203 305.504)", // violet-400
  CARE: "oklch(0.765 0.177 163.223)", // emerald-400
  LUST: "oklch(0.718 0.202 349.761)", // pink-400
  PANIC_GRIEF: "oklch(0.707 0.165 254.624)", // blue-400
  SADNESS: "oklch(0.707 0.165 254.624)", // blue-400
  PLAY: "oklch(0.852 0.199 91.936)", // yellow-400
  base: "oklch(0.707 0.022 261.325)", // gray-400
};

export const AVATAR_TRANSITION_DURATION_MS = 800;

export const AVATAR_COLOR_CLASSES = [
  "avatar-color-olive",
  "avatar-color-mustard",
  "avatar-color-violet",
  "avatar-color-teal",
  "avatar-color-coral",
  "avatar-color-slate",
  "avatar-color-amber",
  "avatar-color-emerald",
  "avatar-color-indigo",
  "avatar-color-rose",
  "avatar-color-cyan",
  "avatar-color-lime",
  "avatar-color-purple",
  "avatar-color-pink",
  "avatar-color-orange",
];
