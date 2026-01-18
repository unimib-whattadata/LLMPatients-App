import { Clock } from "lucide-react";
import { cn } from "~/lib/utils";

interface PatientDurationProps {
    duration: number;
    className?: string;
}

export function PatientDuration({ duration, className }: PatientDurationProps) {
    return (
        <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
            <Clock className="h-4 w-4" />
            <span>{duration} min</span>
        </div>
    );
}
