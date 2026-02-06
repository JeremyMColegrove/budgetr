import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Sparkles, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type FixedBill = {
  id: string;
  name: string;
  amount: number;
  category?: string;
  dueDate?: string;
  isPaid?: boolean;
  paidOn?: string;
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

type GaugeTone = 'good' | 'warning' | 'over';

type GaugeToneClasses = {
  ring: string;
  text: string;
  badge: string;
};

const toneClasses: Record<GaugeTone, GaugeToneClasses> = {
  good: {
    ring: 'stroke-emerald-500',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  warning: {
    ring: 'stroke-amber-500',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  over: {
    ring: 'stroke-rose-500',
    text: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
  },
};

export function getGaugeTone(percentSpent: number): GaugeTone {
  if (percentSpent > 1) return 'over';
  if (percentSpent >= 0.75) return 'warning';
  return 'good';
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateLabel(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function MonthDashboard({
  mergedView,
  onMarkPaid,
  onUndoPaid,
  onOpenCategory,
  onCopyPrevious,
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
            {/* <Button size="lg" className="h-9 px-5" onClick={onCopyPrevious}>
              Copy Budget from Previous Month
            </Button> */}
            <Button size="lg" variant="outline" className="h-9 px-5" onClick={onStartFresh}>
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const orderedBills = [...mergedView.fixedBills].sort((a, b) => Number(!!a.isPaid) - Number(!!b.isPaid));
  const paidCount = orderedBills.filter((bill) => bill.isPaid).length;
  const totalRemaining =
    mergedView.totalRemaining ??
    mergedView.variableCategories.reduce((sum, category) => sum + (category.budgeted - category.spent), 0);

  return (
    <section className="flex flex-col gap-8 xl:grid xl:grid-cols-[2fr_3fr] xl:gap-6">
      <div className="space-y-5 order-2 xl:order-1">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Commitments</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Fixed Bills &amp; Subscriptions</h2>
          </div>
          <div className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {paidCount} of {orderedBills.length} Paid
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
          {orderedBills.map((bill) => (
            <BillTicket
              key={bill.id}
              bill={bill}
              onMarkPaid={onMarkPaid}
              onUndoPaid={onUndoPaid}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      <div className="space-y-5 order-1 xl:order-2">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Spending</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Discretionary Spending</h2>
          </div>
          <div className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
            Remaining {formatCurrency(totalRemaining)}
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-4">
          {mergedView.variableCategories.map((category) => (
            <CategoryGauge
              key={category.id}
              category={category}
              onOpen={() => onOpenCategory?.(category.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export type BillTicketProps = {
  bill: FixedBill;
  onMarkPaid?: (billId: string) => void;
  onUndoPaid?: (billId: string) => void;
  readOnly?: boolean;
};

export function BillTicket({ bill, onMarkPaid, onUndoPaid, readOnly }: BillTicketProps) {
  const isPaid = !!bill.isPaid;

  return (
    <article
      data-paid={isPaid}
      className={cn(
        "relative rounded-2xl border bg-card p-4 transition-all overflow-hidden",
        "mask-ticket", // We will style this with inline styles or Tailwind arbitrary values if supported better
        isPaid && "border-solid border-emerald-200 bg-emerald-50/70"
      )}
      style={{
        // CSS Mask for ticket notches
        maskImage: `radial-gradient(circle at left center, transparent 0.75rem, black 0.76rem), radial-gradient(circle at right center, transparent 0.75rem, black 0.76rem)`,
        maskComposite: 'intersect',
        WebkitMaskImage: `radial-gradient(circle at left center, transparent 0.75rem, black 0.76rem), radial-gradient(circle at right center, transparent 0.75rem, black 0.76rem)`,
        WebkitMaskComposite: 'source-in', // 'source-in' is often equivalent to intersect logic for masks in some browsers, but 'destination-in' etc. 
        // Actually, to PUNCH HOLES, we usually use composite: exclude with swapped layers or just multiple radial gradients as 'transparent' and background color.
        // But mask-image works on the element's visibility. 
        // Correct standard way for holes:
        // mask-image: radial-gradient(circle at left center, transparent 12px, black 12.5px), radial-gradient(circle at right center, transparent 12px, black 12.5px);
        // mask-composite: add; (default). Wait, transparent means hidden. Black means visible.
        // If we list multiple gradients that are mostly black, they OVERLAP and result in black (visible). The transparent parts are holes.
        // So standard comma-separated gradients work as AND if they cover the whole area? No, they define partial images.
        // For a "hole", we need the transparent part to win.
        // Actually, simple radial gradient with transparent center creates a hole IF it's the only one.
        // With multiple, we need to be careful.
        // Let's stick to the pseudo-element approach but FIX the background assumption by using a mask on the container? 
        // Or just use the SVG-based border?
        // Let's try the pseudo-element approach again but make it robust.
        // If I can't guarantee background, I shouldn't use "bg-background".
        // But the page background IS "bg-background" (white/black).
        // The user said "circles don't work". Maybe size issues.
        // I'll stick to a border-dashed style but clearer.
        // "border-style": "dashed",
        // Actually let's use a simpler clean card design with a visual notch indicator instead of a real hole if it's causing issues.
        // But the requested "ticket" look implies holes.
        // "mask" approach is best if I can get it right.
      }}
    >
      {/* Ticket Notches using Mask - re-attempting with cleaner CSS logic or fallback. */}
      {/* Fallback: using pseudos but positioned carefully. */}
      <div
        className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border border-border z-10"
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border border-border z-10"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{bill.category ?? 'Fixed Bill'}</p>
          <h3 className="text-lg font-semibold tracking-tight text-foreground truncate max-w-[120px] sm:max-w-none">{bill.name}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(bill.amount)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          <span className="mr-1">Due</span>
          <span className="font-medium text-foreground">{formatDateLabel(bill.dueDate)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {isPaid ? (
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <Check className="size-3" /> Paid {formatDateLabel(bill.paidOn)}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Not yet paid</div>
        )}
        {!readOnly && (
          isPaid ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/50"
              onClick={() => onUndoPaid?.(bill.id)}
            >
              <Undo2 className="size-3.5 mr-1" />
              Undo
            </Button>
          ) : (
            <Button size="sm" className="h-7 px-3" onClick={() => onMarkPaid?.(bill.id)}>
              <Check className="size-3.5 mr-1" />
              Mark Paid
            </Button>
          )
        )}
      </div>
    </article>
  );
}

export type CategoryGaugeProps = {
  category: VariableCategory;
  onOpen?: () => void;
  readOnly?: boolean;
};

export function CategoryGauge({ category, onOpen, readOnly }: CategoryGaugeProps) {
  const percentSpent = category.budgeted > 0 ? category.spent / category.budgeted : 0;
  const ringPercent = Math.min(percentSpent, 1);
  const remaining = category.budgeted - category.spent;
  const tone = getGaugeTone(percentSpent);
  const toneClass = toneClasses[tone];

  // Increased radius for better visibility
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringPercent);

  if (readOnly) {
    return (
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm",
          "opacity-80"
        )}
      >
        <div className="absolute right-4 top-4 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {Math.round(percentSpent * 100)}% used
        </div>

        <div className="flex items-center justify-center py-2">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg className="absolute inset-0 size-full" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-muted/20"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={cn("transition-all duration-500", toneClass.ring)}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="text-center z-10">
              <div className={cn("text-2xl font-bold tabular-nums tracking-tight", toneClass.text)}>
                {formatCurrency(remaining)}
              </div>
              <div className="text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground font-medium">left</div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
              {category.icon ?? '▦'}
            </span>
            <div className="truncate">
              <p className="text-sm font-semibold text-foreground truncate">{category.name}</p>
              <p className="text-xs text-muted-foreground truncate">of {formatCurrency(category.budgeted)}</p>
            </div>
          </div>
          <span className={cn("rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold shrink-0", toneClass.badge)}>
            {tone === 'over' ? 'Over' : tone === 'warning' ? 'Watch' : 'On Track'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
      )}
    >
      <div className="absolute right-4 top-4 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {Math.round(percentSpent * 100)}% used
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg className="absolute inset-0 size-full" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-muted/20"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={cn("transition-all duration-500", toneClass.ring)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="text-center z-10">
            <div className={cn("text-2xl font-bold tabular-nums tracking-tight", toneClass.text)}>
              {formatCurrency(remaining)}
            </div>
            <div className="text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground font-medium">left</div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
            {category.icon ?? '▦'}
          </span>
          <div className="truncate">
            <p className="text-sm font-semibold text-foreground truncate">{category.name}</p>
            <p className="text-xs text-muted-foreground truncate">of {formatCurrency(category.budgeted)}</p>
          </div>
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold shrink-0", toneClass.badge)}>
          {tone === 'over' ? 'Over' : tone === 'warning' ? 'Watch' : 'On Track'}
        </span>
      </div>
    </button>
  );
}
