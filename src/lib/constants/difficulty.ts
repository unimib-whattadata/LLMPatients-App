/**
 * Difficulty levels for patients
 * Internal values: 1, 2, 3
 * Display values: "Facile", "Medio", "Difficile"
 */

export const DIFFICULTY_LEVELS = {
  FACILE: 1,
  MEDIO: 2,
  DIFFICILE: 3,
} as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

export const DIFFICULTY_LABELS = {
  [DIFFICULTY_LEVELS.FACILE]: "Facile",
  [DIFFICULTY_LEVELS.MEDIO]: "Medio", 
  [DIFFICULTY_LEVELS.DIFFICILE]: "Difficile",
} as const;

export const DIFFICULTY_CLASSES = {
  [DIFFICULTY_LEVELS.FACILE]: "pill pill--lg pill--primary",
  [DIFFICULTY_LEVELS.MEDIO]: "pill pill--lg pill--secondary",
  [DIFFICULTY_LEVELS.DIFFICILE]: "pill pill--lg pill--accent",
} as const;

export const DIFFICULTY_ICON_CLASSES = {
  [DIFFICULTY_LEVELS.FACILE]: "patient-card-difficulty-icon patient-card-difficulty-icon--easy",
  [DIFFICULTY_LEVELS.MEDIO]: "patient-card-difficulty-icon patient-card-difficulty-icon--medium", 
  [DIFFICULTY_LEVELS.DIFFICILE]: "patient-card-difficulty-icon patient-card-difficulty-icon--hard",
} as const;

export const DIFFICULTY_ACCESSIBLE_TEXT = {
  [DIFFICULTY_LEVELS.FACILE]: "Livello facile",
  [DIFFICULTY_LEVELS.MEDIO]: "Livello medio",
  [DIFFICULTY_LEVELS.DIFFICILE]: "Livello difficile",
} as const;

/**
 * Get difficulty label from internal value
 */
export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  return DIFFICULTY_LABELS[difficulty] || "Sconosciuto";
}

/**
 * Get difficulty CSS class from internal value
 */
export function getDifficultyClass(difficulty: DifficultyLevel): string {
  return DIFFICULTY_CLASSES[difficulty] || "";
}

/**
 * Get difficulty icon class from internal value
 */
export function getDifficultyIconClass(difficulty: DifficultyLevel): string {
  return DIFFICULTY_ICON_CLASSES[difficulty] || "";
}

/**
 * Get accessible text for difficulty from internal value
 */
export function getDifficultyAccessibleText(difficulty: DifficultyLevel): string {
  return DIFFICULTY_ACCESSIBLE_TEXT[difficulty] || "Livello non specificato";
}
