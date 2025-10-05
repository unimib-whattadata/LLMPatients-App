/**
 * Chat Constants
 * 
 * Contains all constant values used in the chat interface
 */

// Emotion types for patient avatars
export type PatientEmotion = 
  | "anger" 
  | "anticipation" 
  | "disgust" 
  | "joy" 
  | "sadness" 
  | "surprise" 
  | "trust" 
  | "base";

export const EMOTION_LABELS: Record<PatientEmotion, string> = {
  anger: "Rabbia",
  anticipation: "Attesa",
  disgust: "Disgusto",
  joy: "Gioia",
  sadness: "Tristezza",
  surprise: "Sorpresa",
  trust: "Fiducia",
  base: "Neutro",
};

export const EMOTION_COLORS: Record<PatientEmotion, string> = {
  joy: "rgb(250 204 21)", // yellow-400
  anger: "rgb(239 68 68)", // red-500
  sadness: "rgb(59 130 246)", // blue-500
  disgust: "rgb(132 204 22)", // lime-500
  trust: "rgb(16 185 129)", // emerald-500
  anticipation: "rgb(251 146 60)", // orange-400
  surprise: "rgb(192 132 252)", // purple-400
  base: "rgb(156 163 175)", // gray-400
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

