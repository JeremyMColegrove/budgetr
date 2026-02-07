import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type HorizontalScrollListProps = {
    children: ReactNode;
    className?: string;
};

export function HorizontalScrollList({ children, className }: HorizontalScrollListProps) {
    return (
        <div className="grid w-full min-w-0">
            <div className={cn(
                "flex overflow-x-auto gap-4 py-4 w-full snap-x snap-mandatory scrollbar-hide",
                // "mask-scroll-fade", // Removed as it might not be defined or needed and simplifies debugging
                className
            )}>
                {children}
            </div>
        </div>
    );
}
