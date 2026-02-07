import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type TrackingCategoryCardProps = {
    name: string;
    budgeted: number;
    spent: number;
    icon?: React.ReactNode;
    onOpen?: () => void;
};

export function TrackingCategoryCard({ name, budgeted, spent, icon, onOpen }: TrackingCategoryCardProps) {
    const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
    const isOver = percentage > 100;

    // Format currency helper if not imported
    const format = (value: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);

    return (
        <div
            onClick={onOpen}
            className="shrink-0 w-[160px] md:w-[200px] snap-start bg-card border rounded-2xl p-4 shadow-sm space-y-3 cursor-pointer hover:shadow-md transition-all active:scale-95"
        >
            <div className="flex items-start justify-between">
                <div className="font-semibold text-sm truncate w-full" title={name}>{name}</div>
                <div className="text-muted-foreground">{icon}</div>
            </div>

            <div className="space-y-1">
                <div className="flex items-baseline gap-1 text-sm">
                    <span className={cn("font-bold", isOver ? "text-rose-600" : "text-foreground")}>
                        {format(spent)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        / {format(budgeted)}
                    </span>
                </div>

                <Progress
                    value={clampedPercentage}
                    className="h-2"
                    indicatorClassName={cn(
                        isOver ? "bg-rose-500" : "bg-emerald-500"
                    )}
                />
            </div>
        </div>
    );
}
