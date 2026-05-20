import { cn } from "~/lib/utils";

interface DashboardSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
    title?: React.ReactNode;
    description?: React.ReactNode;
    headerSlot?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}

function isTextNode(value: React.ReactNode): value is string | number {
    return typeof value === "string" || typeof value === "number";
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
        <section className={cn("min-w-0 space-y-6", className)} {...props}>
            {(title || description || headerSlot || action) && (
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {(title || description) && (
                        <div className="min-w-0 space-y-1">
                            {title && isTextNode(title) && (
                                <h2 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                                    {title}
                                </h2>
                            )}
                            {title && !isTextNode(title) && (
                                <div className="break-words text-2xl font-semibold tracking-tight text-foreground">
                                    {title}
                                </div>
                            )}
                            {description && isTextNode(description) && (
                                <p className="break-words text-muted-foreground">
                                    {description}
                                </p>
                            )}
                            {description && !isTextNode(description) && (
                                <div className="break-words text-muted-foreground">
                                    {description}
                                </div>
                            )}
                        </div>
                    )}
                    {headerSlot}
                    {action && <div className="min-w-0 flex-shrink-0">{action}</div>}
                </div>
            )}
            <div className="space-y-4">
                {children}
            </div>
        </section>
    );
}
