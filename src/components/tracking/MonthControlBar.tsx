// ============================================================================
// MONTH CONTROL BAR
// ============================================================================
// Sticky header for month navigation and tracking summary.
// ============================================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTemporalState } from '@/hooks/useTemporalState';
import type { MonthSummary } from '@/types/engine';
import { addMonths, formatMonthLabel, parseMonthInput, toMonthString } from '@/lib/date-utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface MonthControlBarProps {
  currentViewMonth: string; // YYYY-MM
  onChangeMonth: (month: string) => void;
  summary: MonthSummary;
  className?: string;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function MonthControlBar({ currentViewMonth, onChangeMonth, summary, className }: MonthControlBarProps) {
  const { isPast, isFuture, isCurrent } = useTemporalState(currentViewMonth);
  const viewParts = useMemo(() => parseMonthInput(currentViewMonth), [currentViewMonth]);
  const viewLabel = useMemo(() => formatMonthLabel(viewParts), [viewParts]);
  const realMonth = useMemo(() => toMonthString(parseMonthInput(new Date())), []);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(viewParts.year);

  const income = summary.totalIncome ?? 0;
  const planned = summary.totalPlannedExpense ?? 0;
  const actual = summary.totalActualExpense ?? 0;
  const leftToBudget = income - planned;

  const handleOpenChange = (open: boolean) => {
    setPickerOpen(open);
    if (open) {
      setPickerYear(viewParts.year);
    }
  };

  const handleJumpToToday = () => {
    onChangeMonth(realMonth);
  };

  const handleMonthPick = (monthIndex: number) => {
    const next = toMonthString({ year: pickerYear, month: monthIndex + 1 });
    onChangeMonth(next);
    setPickerOpen(false);
  };

  return (
    <div className={cn(
      'sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
      className
    )}>
      <div className="flex flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => onChangeMonth(addMonths(currentViewMonth, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>

            <Popover open={pickerOpen} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 font-semibold">
                  <span className="tracking-tight">{viewLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                <div className="flex items-center justify-between pb-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Previous year"
                    onClick={() => setPickerYear((prev) => prev - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="text-xs font-semibold tracking-widest text-muted-foreground">
                    {pickerYear}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Next year"
                    onClick={() => setPickerYear((prev) => prev + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {MONTH_LABELS.map((label, index) => {
                    const isSelected = viewParts.year === pickerYear && viewParts.month === index + 1;
                    return (
                      <Button
                        key={`${pickerYear}-${label}`}
                        variant={isSelected ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 justify-center"
                        onClick={() => handleMonthPick(index)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => onChangeMonth(addMonths(currentViewMonth, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {currentViewMonth !== realMonth && (
            <Button variant="outline" size="xs" onClick={handleJumpToToday}>
              Jump to Today
            </Button>
          )}

          {isPast && (
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
              History
            </Badge>
          )}
          {isCurrent && (
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </Badge>
          )}
          {isFuture && (
            <Badge variant="outline" className="border-dashed border-blue-300 text-blue-600">
              Projection
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Income</span>
            <span className="font-semibold tabular-nums">{formatCurrency(income)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Expenses</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(actual)} / {formatCurrency(planned)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Left to Budget</span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                leftToBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {formatCurrency(leftToBudget)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
