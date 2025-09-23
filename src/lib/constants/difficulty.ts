/**
 * Difficulty levels for virtual patients
 * 
 * Defines the three difficulty levels available for patient cases.
 * Used throughout the application for filtering, display, and categorization.
 * 
 * Internal values: 1, 2, 3
 * Display values: "Facile", "Medio", "Difficile"
 */
export const DIFFICULTY_LEVELS = {
  FACILE: 1,
  MEDIO: 2,
  DIFFICILE: 3,
} as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

// These constants are used internally by the functions below
const DIFFICULTY_LABELS = {
  [DIFFICULTY_LEVELS.FACILE]: "Facile",
  [DIFFICULTY_LEVELS.MEDIO]: "Medio", 
  [DIFFICULTY_LEVELS.DIFFICILE]: "Difficile",
} as const;

const DIFFICULTY_ICON_CLASSES = {
  [DIFFICULTY_LEVELS.FACILE]: "patient-card-difficulty-icon patient-card-difficulty-icon--easy",
  [DIFFICULTY_LEVELS.MEDIO]: "patient-card-difficulty-icon patient-card-difficulty-icon--medium", 
  [DIFFICULTY_LEVELS.DIFFICILE]: "patient-card-difficulty-icon patient-card-difficulty-icon--hard",
} as const;

const DIFFICULTY_ACCESSIBLE_TEXT = {
  [DIFFICULTY_LEVELS.FACILE]: "Livello facile",
  [DIFFICULTY_LEVELS.MEDIO]: "Livello medio",
  [DIFFICULTY_LEVELS.DIFFICILE]: "Livello difficile",
} as const;

/**
 * Get difficulty label from internal value
 * 
 * Converts the internal difficulty number to a human-readable label.
 * Used for display purposes in the UI.
 * 
 * @param difficulty - The internal difficulty level (1, 2, or 3)
 * @returns Human-readable difficulty label or "Sconosciuto" if invalid
 */
export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  return DIFFICULTY_LABELS[difficulty] || "Sconosciuto";
}


/**
 * Get difficulty icon class from internal value
 * 
 * Returns the CSS class for difficulty icons based on the difficulty level.
 * Used for styling difficulty indicators in the UI.
 * 
 * @param difficulty - The internal difficulty level (1, 2, or 3)
 * @returns CSS class name for the difficulty icon
 */
export function getDifficultyIconClass(difficulty: DifficultyLevel): string {
  return DIFFICULTY_ICON_CLASSES[difficulty] || "";
}

/**
 * Get accessible text for difficulty from internal value
 * 
 * Returns accessibility-friendly text for screen readers and assistive technologies.
 * Provides descriptive text for difficulty levels.
 * 
 * @param difficulty - The internal difficulty level (1, 2, or 3)
 * @returns Accessible text description for the difficulty level
 */
export function getDifficultyAccessibleText(difficulty: DifficultyLevel): string {
  return DIFFICULTY_ACCESSIBLE_TEXT[difficulty] || "Livello non specificato";
}
