import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { Account } from '@/types/budget';

export type CategorySnapshot = {
  id: string;
  name: string;
  icon?: ReactNode;
  planned: number;
  spent: number;
  month?: string; // YYYY-MM
};

export type Transaction = {
  id: string;
  categoryId: string;
  amount: number;
  merchant?: string;
  date: string; // YYYY-MM-DD
  accountId?: string;
};

export type TransactionSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  category: CategorySnapshot;
  existingTransactions: Transaction[];
  accounts?: Account[];
  onAddTransaction?: (payload: {
    categoryId: string;
    amount: number;
    merchant: string;
    date: string;
    accountId: string;
  }) => Promise<void> | void;
  onDeleteTransaction?: (transactionId: string) => Promise<void> | void;
};

const transactionSchema = z.object({
  amount: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().positive('Amount must be greater than 0')
  ),
  merchant: z.string().min(1, 'Merchant is required'),
  date: z.string().min(1, 'Date is required'),
  accountId: z.string().min(1, 'Account is required'),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMonthLabel(month?: string) {
  if (!month) {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
  }
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
  }
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function formatDayLabel(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionSheet({
  isOpen,
  onClose,
  category,
  existingTransactions,
  accounts = [],
  onAddTransaction,
  onDeleteTransaction,
}: TransactionSheetProps) {
  const [optimisticSpent, setOptimisticSpent] = useState(category.spent);
  const [optimisticEntries, setOptimisticEntries] = useState<Transaction[]>([]);
  const [lastAccountId, setLastAccountId] = useState<string>(() => accounts[0]?.id ?? '');

  useEffect(() => {
    setOptimisticSpent(category.spent);
    setOptimisticEntries([]);
  }, [category.id, category.spent]);

  useEffect(() => {
    if (!lastAccountId && accounts.length > 0) {
      setLastAccountId(accounts[0].id);
    }
  }, [accounts, lastAccountId]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: undefined,
      merchant: '',
      date: todayISO(),
      accountId: lastAccountId || accounts[0]?.id || '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      amount: undefined,
      merchant: '',
      date: todayISO(),
      accountId: lastAccountId || accounts[0]?.id || '',
    });
    const timer = setTimeout(() => form.setFocus('amount'), 120);
    return () => clearTimeout(timer);
  }, [isOpen, form, accounts, lastAccountId]);

  const remaining = category.planned - optimisticSpent;
  const isHealthy = remaining >= 0;

  const history = useMemo(() => {
    const merged = [...optimisticEntries, ...existingTransactions];
    return merged
      .filter((entry) => entry.categoryId === category.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [optimisticEntries, existingTransactions, category.id]);
  const accountValue = form.watch('accountId') || undefined;

  const onSubmit = form.handleSubmit(async (values) => {
    setOptimisticSpent((prev) => prev + values.amount);
    setOptimisticEntries((prev) => [
      {
        id: `optimistic-${Date.now()}`,
        categoryId: category.id,
        amount: values.amount,
        merchant: values.merchant,
        date: values.date,
        accountId: values.accountId,
      },
      ...prev,
    ]);
    setLastAccountId(values.accountId);

    await onAddTransaction?.({
      categoryId: category.id,
      amount: values.amount,
      merchant: values.merchant,
      date: values.date,
      accountId: values.accountId,
    });

    form.reset({
      amount: undefined,
      merchant: '',
      date: todayISO(),
      accountId: values.accountId,
    });
    form.setFocus('amount');
  });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="gap-3 border-b pb-4">
          <SheetTitle className="text-lg font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="text-xl">{category.icon ?? '▦'}</span>
              {category.name}
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {formatMonthLabel(category.month)}
          </SheetDescription>

          <div className="space-y-2">
            <div className={cn("text-4xl font-semibold tracking-tight", isHealthy ? 'text-emerald-600' : 'text-rose-600')}>
              You have {formatCurrency(remaining)} left.
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(category.planned)} Planned • {formatCurrency(optimisticSpent)} Spent
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <InputGroup className="h-10 rounded-xl">
                <InputGroupAddon align="inline-start" className="text-sm">
                  $
                </InputGroupAddon>
                <InputGroupInput
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="text-lg font-semibold"
                  aria-invalid={!!form.formState.errors.amount}
                  {...form.register('amount')}
                />
              </InputGroup>
              {form.formState.errors.amount && (
                <p className="text-xs text-rose-500">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant / Description</Label>
              <Input
                id="merchant"
                placeholder="e.g., Starbucks"
                aria-invalid={!!form.formState.errors.merchant}
                {...form.register('merchant')}
              />
              {form.formState.errors.merchant && (
                <p className="text-xs text-rose-500">{form.formState.errors.merchant.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  aria-invalid={!!form.formState.errors.date}
                  {...form.register('date')}
                />
                {form.formState.errors.date && (
                  <p className="text-xs text-rose-500">{form.formState.errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Account</Label>
                <Select
                  value={accountValue}
                  onValueChange={(value) => form.setValue('accountId', value, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full" disabled={accounts.length === 0}>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.length === 0 ? (
                      <SelectItem value="no-accounts" disabled>
                        No accounts available
                      </SelectItem>
                    ) : (
                      accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.accountId && (
                  <p className="text-xs text-rose-500">{form.formState.errors.accountId.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="h-9 w-full">
              Log Expense
            </Button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Recent Activity
              </span>
              <Separator className="flex-1" />
            </div>

            <ScrollArea className="max-h-[280px] pr-2">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                  No recent activity yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border bg-card/60 p-3"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">{formatDayLabel(entry.date)}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {entry.merchant || 'Expense'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-rose-600">
                          -{formatCurrency(entry.amount)}
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-muted-foreground hover:text-rose-500"
                          onClick={() => onDeleteTransaction?.(entry.id)}
                          aria-label="Delete transaction"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
