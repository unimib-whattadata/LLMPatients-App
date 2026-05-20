import { cn } from "~/lib/utils";

interface DashboardPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: "default" | "ghost" | "bordered";
}

export function DashboardPanel({
    children,
    className,
    variant = "default",
    ...props
}: DashboardPanelProps) {
    const variants = {
        default: "bg-card border border-border/50 shadow-sm",
        ghost: "bg-transparent border-0 shadow-none p-0",
        bordered: "bg-transparent border border-dashed border-border p-4",
    };

    return (
        <div
            className={cn(
                "min-w-0 rounded-2xl transition-all",
                variants[variant],
                variant !== "ghost" && "p-6",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
