

export type PatientEmotion = 
  | "SEEKING" 
  | "RAGE" 
  | "FEAR" 
  | "CARE" 
  | "LUST" 
  | "SADNESS" 
  | "PLAY" 
  | "base";

export const EMOTION_LABELS: Record<PatientEmotion, string> = {
  SEEKING: "Ricerca",
  RAGE: "Rabbia",
  FEAR: "Paura",
  CARE: "Cura",
  LUST: "Desiderio",
  SADNESS: "Tristezza",
  PLAY: "Gioco",
  base: "Neutro",
};

export const EMOTION_COLORS: Record<PatientEmotion, string> = {
  SEEKING: "rgb(251 146 60)", 
  RAGE: "rgb(239 68 68)", 
  FEAR: "rgb(139 92 246)", 
  CARE: "rgb(16 185 129)", 
  LUST: "rgb(236 72 153)", 
  SADNESS: "rgb(59 130 246)", 
  PLAY: "rgb(250 204 21)", 
  base: "rgb(156 163 175)", 
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

