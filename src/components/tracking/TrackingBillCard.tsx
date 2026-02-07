import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency } from '@/lib/utils';
import { Check, Undo2 } from 'lucide-react';

type TrackingBillCardProps = {
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    paidOn?: string;
    monthIso?: string;
    readOnly?: boolean;
    onMarkPaid?: (id: string) => void;
    onUndoPaid?: (id: string) => void;
};

export function TrackingBillCard({
    id,
    name,
    amount,
    dueDate,
    isPaid,
    paidOn,
    monthIso,
    readOnly,
    onMarkPaid,
    onUndoPaid
}: TrackingBillCardProps) {
    const formattedAmount = formatCurrency(amount);
    const paidDate = paidOn ?? (monthIso ? `${monthIso}-01` : dueDate);
    const displayDate = isPaid ? paidDate : dueDate;
    const displayLabel = isPaid ? 'Paid' : 'Due';
    const formattedDate = new Date(displayDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return (
        <div className="shrink-0 w-[160px] md:w-[200px] snap-start bg-card border rounded-2xl p-4 shadow-sm space-y-3 relative hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
                <div className="font-semibold text-sm truncate w-full pr-6" title={name}>{name}</div>
                {isPaid && (
                    <div className="absolute top-4 right-4 text-emerald-500">
                        <Check size={16} strokeWidth={3} />
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <div className="flex items-baseline gap-1 text-sm">
                    <span className="font-bold">
                        {formattedAmount}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        / {formattedAmount}
                    </span>
                </div>

                <Progress
                    value={isPaid ? 100 : 0}
                    className="h-2"
                    indicatorClassName={cn(
                        isPaid ? "bg-emerald-500" : "bg-muted"
                    )}
                />
            </div>

            <div className="pt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{displayLabel} {formattedDate}</span>
            </div>

            {!readOnly && (
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-background/80 flex items-center justify-center backdrop-blur-sm rounded-2xl">
                    {isPaid ? (
                        <Button size="sm" variant="secondary" onClick={() => onUndoPaid?.(id)}>
                            <Undo2 className="size-4 mr-1" /> Undo
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => onMarkPaid?.(id)}>
                            <Check className="size-4 mr-1" /> Pay
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
