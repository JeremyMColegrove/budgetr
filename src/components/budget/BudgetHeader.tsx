// ============================================================================
// BUDGET HEADER COMPONENT
// ============================================================================
// Displays the "Amount Left to Allocate" with color-coded visual feedback.
// ============================================================================

import { cn } from '@/lib/utils';
import { useBudgetStore } from '@/store/budget-store';

export function BudgetHeader() {
    const totalIncome = useBudgetStore((s) => s.getTotalIncome());
    const totalExpenses = useBudgetStore((s) => s.getTotalExpenses());
    const amountLeft = useBudgetStore((s) => s.getAmountLeftToAllocate());

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Main Status Bar */}
            <div className={cn(
                "p-6 flex flex-col items-center justify-center border-b text-center relative overflow-hidden transition-colors",
                amountLeft > 0 && "bg-emerald-50/50 dark:bg-emerald-950/20",
                amountLeft < 0 && "bg-rose-50/50 dark:bg-rose-950/20",
                amountLeft === 0 && "bg-muted/30"
            )}>
                <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-widest text-[10px]">Amount Left to Allocate</p>
                <div className={cn(
                    "text-5xl font-bold tracking-tighter mb-2 font-mono transition-all",
                    amountLeft > 0 && "text-emerald-600 dark:text-emerald-400 scale-100",
                    amountLeft < 0 && "text-rose-600 dark:text-rose-400 scale-100",
                    amountLeft === 0 && "text-muted-foreground/40 scale-95"
                )}>
                    {formatCurrency(amountLeft)}
                </div>
                {amountLeft === 0 ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                        <span className="text-xs font-semibold">Zero-Based Budget Achieved</span>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        {amountLeft > 0 ? "You have money left to budget!" : "You are over budget!"}
                    </p>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4 text-center hover:bg-muted/50 transition-colors">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Income</p>
                    <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(totalIncome)}
                    </p>
                </div>
                <div className="p-4 text-center hover:bg-muted/50 transition-colors">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Expenses</p>
                    <p className="text-xl font-semibold text-rose-600 dark:text-rose-400 font-mono">
                        {formatCurrency(totalExpenses)}
                    </p>
                </div>
            </div>
        </div>
    );
}
