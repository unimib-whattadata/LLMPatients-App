export const DIFFICULTY_LEVELS = {
  FACILE: 1,
  MEDIO: 2,
  DIFFICILE: 3,
} as const;

export type DifficultyLevel =
  (typeof DIFFICULTY_LEVELS)[keyof typeof DIFFICULTY_LEVELS];


const DIFFICULTY_LABELS = {
  [DIFFICULTY_LEVELS.FACILE]: "Facile",
  [DIFFICULTY_LEVELS.MEDIO]: "Medio",
  [DIFFICULTY_LEVELS.DIFFICILE]: "Difficile",
} as const;

const DIFFICULTY_ICON_CLASSES = {
  [DIFFICULTY_LEVELS.FACILE]: "difficulty-dots difficulty-easy",
  [DIFFICULTY_LEVELS.MEDIO]: "difficulty-dots difficulty-medium", 
  [DIFFICULTY_LEVELS.DIFFICILE]: "difficulty-dots difficulty-hard",
} as const;

const DIFFICULTY_ACCESSIBLE_TEXT = {
  [DIFFICULTY_LEVELS.FACILE]: "Livello facile",
  [DIFFICULTY_LEVELS.MEDIO]: "Livello medio",
  [DIFFICULTY_LEVELS.DIFFICILE]: "Livello difficile",
} as const;

export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  return DIFFICULTY_LABELS[difficulty] || "Sconosciuto";
}

export function getDifficultyIconClass(difficulty: DifficultyLevel): string {
  return DIFFICULTY_ICON_CLASSES[difficulty] || "";
}


export function getDifficultyIcon(difficulty: DifficultyLevel): string {
  switch (difficulty) {
    case DIFFICULTY_LEVELS.FACILE:
      return "•";
    case DIFFICULTY_LEVELS.MEDIO:
      return "••";
    case DIFFICULTY_LEVELS.DIFFICILE:
      return "•••";
    default:
      return "•";
  }
}


export function getDifficultyAccessibleText(
  difficulty: DifficultyLevel,
): string {
  return DIFFICULTY_ACCESSIBLE_TEXT[difficulty] || "Livello non specificato";
}
