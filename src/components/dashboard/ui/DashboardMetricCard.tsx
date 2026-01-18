import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

interface DashboardMetricCardProps {
    value: React.ReactNode;
    label: string | React.ReactNode;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        label: string;
        direction: "up" | "down" | "neutral";
    };
    isLoading?: boolean;
    className?: string;
    onClick?: () => void;
}

export function DashboardMetricCard({
    value,
    label,
    icon,
    trend,
    isLoading,
    className,
    onClick,
}: DashboardMetricCardProps) {
    if (isLoading) {
        return (
            <div className={cn("dashboard-metric-card p-6 rounded-2xl bg-card border border-border/50", className)}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex flex-col p-6 rounded-2xl bg-card border border-border/50 shadow-sm transition-all hover:shadow-md",
                onClick && "cursor-pointer hover:border-primary/50",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                {icon && <span className="text-primary/70">{icon}</span>}
            </div>

            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
                {trend && (
                    <span className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded-full",
                        trend.direction === "up" && "bg-green-500/10 text-green-600",
                        trend.direction === "down" && "bg-red-500/10 text-red-600",
                        trend.direction === "neutral" && "bg-gray-500/10 text-gray-600",
                    )}>
                        {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
                    </span>
                )}
            </div>
        </div>
    );
}
