import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string; // Additional classes for the container
}

export function PageHeader({
    title,
    description,
    actions,
    children,
    className
}: PageHeaderProps) {
    return (
        <div className={cn("space-y-6 pb-6", className)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
                    {description && (
                        <div className="text-muted-foreground">
                            {description}
                        </div>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}
