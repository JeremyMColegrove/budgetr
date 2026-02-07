import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { HorizontalScrollList } from './HorizontalScrollList';
import { TrackingBillCard } from './TrackingBillCard';
import { TrackingCategoryCard } from './TrackingCategoryCard';
import { TrackingGauges } from './TrackingGauges';
import { TrackingSummaryCard } from './TrackingSummaryCard';

export type FixedBill = {
  id: string;
  name: string;
  amount: number;
  category?: string;
  dueDate?: string;
  isPaid?: boolean;
  paidOn?: string;
  monthIso?: string;
};

export type VariableCategory = {
  id: string;
  name: string;
  icon?: ReactNode;
  budgeted: number;
  spent: number;
};

export type MergedMonthView = {
  fixedBills: FixedBill[];
  variableCategories: VariableCategory[];
  ruleCount?: number;
  totalRemaining?: number;
};

export type MonthDashboardProps = {
  mergedView: MergedMonthView;
  onMarkPaid?: (billId: string) => void;
  onUndoPaid?: (billId: string) => void;
  onOpenCategory?: (categoryId: string) => void;
  onCopyPrevious?: () => void;
  onStartFresh?: () => void;
  readOnly?: boolean;
};

export function MonthDashboard({
  mergedView,
  onMarkPaid,
  onUndoPaid,
  onOpenCategory,
  onStartFresh,
  readOnly = false,
}: MonthDashboardProps) {
  const totalRules = mergedView.ruleCount ?? mergedView.fixedBills.length + mergedView.variableCategories.length;
  const isEmpty = totalRules === 0;

  if (isEmpty) {
    return (
      <div className="rounded-3xl border border-dashed bg-card/40 p-8 md:p-12 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-[36px] bg-linear-to-br from-emerald-100 via-amber-100 to-rose-100 opacity-70" />
            <div className="absolute inset-4 rounded-[32px] border border-dashed border-muted-foreground/30 bg-card/80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="size-10 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Start your Command Center</h2>
            <p className="text-sm text-muted-foreground">
              This month doesn&apos;t have any budgets yet. Start by building a fresh one.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" variant="outline" className="h-9 px-5" onClick={onStartFresh}>
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate aggregates
  const {
    totalFixedBudget,
    totalFixedSpent,
    totalDiscretionaryBudget,
    totalDiscretionarySpent
  } = useMemo(() => {
    let fixedBudget = 0;
    let fixedSpent = 0;
    mergedView.fixedBills.forEach(bill => {
      fixedBudget += bill.amount;
      if (bill.isPaid) fixedSpent += bill.amount;
    });

    let discBudget = 0;
    let discSpent = 0;
    mergedView.variableCategories.forEach(cat => {
      discBudget += cat.budgeted;
      discSpent += cat.spent;
    });

    return {
      totalFixedBudget: fixedBudget,
      totalFixedSpent: fixedSpent,
      totalDiscretionaryBudget: discBudget,
      totalDiscretionarySpent: discSpent
    };
  }, [mergedView]);

  const totalBudget = totalFixedBudget + totalDiscretionaryBudget;
  const totalSpent = totalFixedSpent + totalDiscretionarySpent;

  const orderedBills = [...mergedView.fixedBills].sort((a, b) => Number(!!a.isPaid) - Number(!!b.isPaid));

  return (
    <div className="space-y-6 pb-24"> {/* Added padding bottom for mobile scrolling */}
      {/* Header Summary */}
      <section>
        {/* You might want to pass the actual month Name if available, hardcoded for now or derived */}
        <TrackingSummaryCard
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          monthName="Current Budget"
        />
      </section>

      {/* Gauges */}
      <section className="bg-card/50 rounded-2xl border p-2">
        <TrackingGauges
          fixed={{ spent: totalFixedSpent, total: totalFixedBudget }}
          discretionary={{ spent: totalDiscretionarySpent, total: totalDiscretionaryBudget }}
        />
      </section>

      {/* Fixed Expenses List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-lg">Fixed Expenses</h3>
          <Button variant="link" className="text-muted-foreground h-auto p-0 hover:no-underline">View All</Button>
        </div>
        <HorizontalScrollList>
          {orderedBills.map(bill => (
            <TrackingBillCard
              key={bill.id}
              id={bill.id}
              name={bill.name}
              amount={bill.amount}
              dueDate={bill.dueDate ?? new Date().toISOString()} // Fallback if missing
              isPaid={!!bill.isPaid}
              paidOn={bill.paidOn}
              monthIso={bill.monthIso}
              readOnly={readOnly}
              onMarkPaid={onMarkPaid}
              onUndoPaid={onUndoPaid}
            />
          ))}
          {orderedBills.length === 0 && (
            <div className="w-full text-sm text-muted-foreground p-4 text-center border border-dashed rounded-xl">
              No fixed bills set up.
            </div>
          )}
        </HorizontalScrollList>
      </section>

      {/* Discretionary Spending List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-lg">Discretionary Spending</h3>
          <Button variant="link" className="text-muted-foreground h-auto p-0 hover:no-underline">View All</Button>
        </div>
        <HorizontalScrollList>
          {mergedView.variableCategories.length > 0 ? (
            mergedView.variableCategories.map(cat => (
              <TrackingCategoryCard
                key={cat.id}
                name={cat.name}
                budgeted={cat.budgeted}
                spent={cat.spent}
                icon={cat.icon}
                onOpen={() => onOpenCategory?.(cat.id)}
              />
            ))
          ) : (
            <div className="w-full text-sm text-muted-foreground p-4 text-center border border-dashed rounded-xl">
              No discretionary categories set up.
            </div>
          )}
        </HorizontalScrollList>
      </section>
    </div>
  );
}
