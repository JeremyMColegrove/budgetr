import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CalendarClock } from 'lucide-react';

interface OverviewTodo {
    id: string;
    label: string;
    planned: number;
    dueDate?: number;
    monthIso: string;
}

interface OverviewTodosProps {
    unpaidBills: OverviewTodo[];
    onReviewTracking?: () => void;
}

function formatDueDate(monthIso: string, day?: number) {
    if (!day) return 'No due date';
    const [year, month] = monthIso.split('-').map((value) => Number(value));
    if (!year || !month) return 'No due date';
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function OverviewTodos({ unpaidBills, onReviewTracking }: OverviewTodosProps) {
    return (
        <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">To-Do</p>
                    <p className="text-sm text-muted-foreground">Unpaid bills this month</p>
                </div>
                <CalendarClock className="size-5 text-muted-foreground" />
            </div>

            <div className="mt-4 space-y-3">
                {unpaidBills.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                        All caught up. No unpaid bills right now.
                    </div>
                ) : (
                    unpaidBills.map((bill) => (
                        <div
                            key={bill.id}
                            className="flex items-center justify-between rounded-xl border border-border/70 bg-background/40 px-4 py-3"
                        >
                            <div>
                                <p className="text-sm font-medium">{bill.label}</p>
                                <p className="text-xs text-muted-foreground">
                                    Due {formatDueDate(bill.monthIso, bill.dueDate)}
                                </p>
                            </div>
                            <p className="text-sm font-semibold">{formatCurrency(bill.planned)}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4">
                <Button
                    variant="secondary"
                    className="w-full"
                    onClick={onReviewTracking}
                >
                    Review in Tracking
                </Button>
            </div>
        </Card>
    );
}
