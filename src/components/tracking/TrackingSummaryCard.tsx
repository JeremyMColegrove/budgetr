import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

type TrackingSummaryCardProps = {
    totalBudget: number;
    totalSpent: number;
    monthName?: string;
};

export function TrackingSummaryCard({ totalBudget, totalSpent, monthName = 'Budget' }: TrackingSummaryCardProps) {
    const remaining = totalBudget - totalSpent;
    const isOver = remaining < 0;

    const formattedTotal = useMemo(() => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(totalBudget);
    }, [totalBudget]);

    const formattedRemaining = useMemo(() => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(Math.abs(remaining));
    }, [remaining]);

    return (
        <div className="space-y-2 w-full max-w-full">
            <h2 className="text-lg font-semibold tracking-tight">{monthName}</h2>
            <Card className="flex flex-col items-center justify-center p-6 bg-card border shadow-sm w-full max-w-full">
                <div className="flex flex-col items-center gap-1">
                    <p className="text-xl font-bold tracking-tight text-foreground">
                        Total Budget: {formattedTotal}
                    </p>
                    <p className={cn(
                        "text-sm font-medium",
                        isOver ? "text-rose-600" : "text-emerald-600"
                    )}>
                        {isOver ? 'Over by ' : 'Left to Spend: '}
                        <span className="font-bold">{formattedRemaining}</span>
                    </p>
                </div>
            </Card>
        </div>
    );
}
