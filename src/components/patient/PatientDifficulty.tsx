import {
    getDifficultyAccessibleText,
    getDifficultyIconClass,
    getDifficultyIcon,
    type DifficultyLevel,
} from "~/lib/constants/difficulty";
import { cn } from "~/lib/utils";

interface PatientDifficultyProps {
    difficulty: number;
    showLabel?: boolean;
    className?: string;
}

export function PatientDifficulty({ difficulty, showLabel = false, className }: PatientDifficultyProps) {
    const diffLevel = difficulty as DifficultyLevel;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {showLabel && <span className="text-sm text-muted-foreground">Difficoltà:</span>}
            <div
                className={cn("flex items-center", getDifficultyIconClass(diffLevel))}
                aria-label={getDifficultyAccessibleText(diffLevel)}
                title={getDifficultyAccessibleText(diffLevel)}
            >
                <span className="text-lg leading-none tracking-widest font-bold">
                    {getDifficultyIcon(diffLevel)}
                </span>
            </div>
        </div>
    );
}
