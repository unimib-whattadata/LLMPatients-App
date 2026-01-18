import { cn } from "~/lib/utils";

interface DashboardSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
    title?: React.ReactNode;
    description?: React.ReactNode;
    headerSlot?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}

export function DashboardSection({
    title,
    description,
    headerSlot,
    action,
    children,
    className,
    ...props
}: DashboardSectionProps) {
    return (
        <section className={cn("space-y-6", className)} {...props}>
            {(title || description || headerSlot || action) && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {(title || description) && (
                        <div className="space-y-1">
                            {title && (
                                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    )}
                    {headerSlot}
                    {action && <div className="flex-shrink-0">{action}</div>}
                </div>
            )}
            <div className="space-y-4">
                {children}
            </div>
        </section>
    );
}
