import { cn } from "~/lib/utils";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";

export type PhaseType = "available" | "locked" | "completed" | "knowledge" | "intervention" | "conclusion";

interface PhaseCardProps {
    phase?: number;
    variant?: PhaseType;
    title: string;
    subtitle: string;
    sectionTitle?: string;
    items?: string[];
    footer?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

const PHASE_ACCENT_COLORS = {
    knowledge: {
        base: "var(--color-primary-green)",
        background: "color-mix(in srgb, var(--color-primary-green), transparent 84%)",
        border: "color-mix(in srgb, var(--color-primary-green), transparent 65%)",
    },
    intervention: {
        base: "var(--color-primary-yellow)",
        background: "color-mix(in srgb, var(--color-primary-yellow), transparent 84%)",
        border: "color-mix(in srgb, var(--color-primary-yellow), transparent 65%)",
    },
    conclusion: {
        base: "var(--color-primary-violet)",
        background: "color-mix(in srgb, var(--color-primary-violet), transparent 84%)",
        border: "color-mix(in srgb, var(--color-primary-violet), transparent 65%)",
    },
} as const;

export function PhaseCard({
    phase,
    variant = "locked",
    title,
    subtitle,
    sectionTitle,
    items = [],
    footer,
    className,
    style,
    onClick,
}: PhaseCardProps) {
    const isKnowledge = variant === "knowledge";
    const isIntervention = variant === "intervention";
    const isConclusion = variant === "conclusion";
    const phaseAccent = isKnowledge
        ? PHASE_ACCENT_COLORS.knowledge
        : isIntervention
            ? PHASE_ACCENT_COLORS.intervention
            : isConclusion
                ? PHASE_ACCENT_COLORS.conclusion
                : null;
    const showPhaseNumber = !(isKnowledge || isIntervention || isConclusion);
    const showHeaderBadge = showPhaseNumber;
    const showHeaderRow = showHeaderBadge;

    return (
        <div
            onClick={onClick}
            style={
                phaseAccent
                    ? {
                        backgroundColor: phaseAccent.background,
                        borderColor: phaseAccent.border,
                        ...style,
                    }
                    : style
            }
            className={cn(
                "relative flex flex-col gap-5 overflow-hidden rounded-2xl border p-5 transition-all duration-300 sm:gap-6 sm:p-6 md:p-7",
                // Variants
                variant === "available" && "bg-card border-border hover:shadow-lg hover:border-primary/50 cursor-pointer group",
                variant === "locked" && "bg-muted/50 border-border/50 opacity-80",
                variant === "completed" && "bg-primary/5 border-primary/20",
                className
            )}
        >
            {/* Background Decor */}
            {variant === "available" && (
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
            )}

            {/* Header */}
            <div className="relative z-10">
                {showHeaderRow && (
                    <div className="mb-3 flex items-center justify-between sm:mb-4">
                        {showHeaderBadge && (
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                                    variant === "available" && "bg-primary text-primary-foreground",
                                    variant === "locked" && "bg-muted text-muted-foreground",
                                    variant === "completed" && "bg-primary-green text-text-inverse",
                                    phaseAccent && "text-text-inverse"
                                )}
                                style={phaseAccent ? { backgroundColor: phaseAccent.base } : undefined}
                            >
                                {variant === "completed" ? <CheckCircle2 className="h-4 w-4" /> :
                                    variant === "locked" ? <Lock className="h-3 w-3" /> :
                                        showPhaseNumber ? (phase || "i") : null}
                            </div>
                        )}
                        {variant === "available" && (
                            <PlayCircle className="h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                    </div>
                )}

                <h3 className="mb-2 text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
                    {title}
                </h3>
                <p className="text-sm leading-snug text-muted-foreground sm:text-base">
                    {subtitle}
                </p>
            </div>

            {/* Content */}
            {(items.length > 0 || sectionTitle) && (
                <div className="relative z-10 sm:mt-1">
                    {sectionTitle && (
                        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {sectionTitle}
                        </h4>
                    )}
                    <ul className="space-y-2.5 sm:space-y-3">
                        {items.map((item, i) => (
                            <li key={i} className="flex items-start text-sm leading-snug text-muted-foreground sm:text-base">
                                <span
                                    className="mr-2 mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50"
                                    style={phaseAccent ? { backgroundColor: phaseAccent.base } : undefined}
                                />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Footer */}
            {footer && (
                <div className="relative z-10 mt-6 pt-4 border-t border-border/50">
                    {footer}
                </div>
            )}
        </div>
    );
}
