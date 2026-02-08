// ============================================================================
// TRANSACTION RULE TABLE COMPONENT
// ============================================================================
// Dense data table displaying all budget rules with edit/delete actions.
// ============================================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useBudgetStore } from '@/store/budget-store';
import type { BudgetRule, TransactionType } from '@/types/budget';
import { ArrowRight, Pencil, RefreshCw, Trash2 } from 'lucide-react';

interface TransactionRuleTableProps {
    type: TransactionType;
    monthlyTotal?: number;
    onEdit: (rule: BudgetRule) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    'bi-weekly': 'Bi-Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
};

export function TransactionRuleTable({ type, monthlyTotal, onEdit }: TransactionRuleTableProps) {
    const profile = useBudgetStore((s) => s.getActiveProfile());
    const deleteRule = useBudgetStore((s) => s.deleteRule);
    const getAccountById = useBudgetStore((s) => s.getAccountById);

    const rules = profile?.rules.filter((r) => r.type === type) ?? [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const total = monthlyTotal ?? 0;

    if (rules.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No {type === 'income' ? 'income' : 'expense'} rules yet. Add one to get started.
            </div>
        );
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="py-2 px-3 text-xs font-semibold">Label</TableHead>
                        <TableHead className="py-2 px-3 text-xs font-semibold w-24">Amount</TableHead>
                        <TableHead className="hidden sm:table-cell py-2 px-3 text-xs font-semibold w-28">Category</TableHead>
                        <TableHead className="hidden md:table-cell py-2 px-3 text-xs font-semibold w-24">Frequency</TableHead>
                        <TableHead className="py-2 px-3 text-xs font-semibold w-24 print:hidden">
                            Actions
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rules.map((rule) => (
                        <TableRow key={rule.id} className="group">
                            <TableCell className="py-1.5 px-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-medium">{rule.label}</span>
                                    {(rule.accountId || rule.toAccountId) && (() => {
                                        const fromAccount = rule.accountId ? getAccountById(rule.accountId) : null;
                                        const toAccount = rule.toAccountId ? getAccountById(rule.toAccountId) : null;

                                        if (fromAccount && toAccount) {
                                            // Both accounts - show flow
                                            return (
                                                <Badge variant="outline" className="text-xs font-normal gap-0.5">
                                                    {fromAccount.name} <ArrowRight className="size-2.5" /> {toAccount.name}
                                                </Badge>
                                            );
                                        } else if (fromAccount) {
                                            // Just from account
                                            return (
                                                <Badge variant="outline" className="text-xs font-normal gap-0.5">
                                                    {type === 'income' ? '→' : ''} {fromAccount.name}
                                                </Badge>
                                            );
                                        } else if (toAccount) {
                                            // Just to account (debt payment without source)
                                            return (
                                                <Badge variant="outline" className="text-xs font-normal gap-0.5">
                                                    → {toAccount.name}
                                                </Badge>
                                            );
                                        }
                                        return null;
                                    })()}
                                    {rule.notes && (
                                        <span className="text-xs text-muted-foreground truncate max-w-32" title={rule.notes}>
                                            — {rule.notes}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="py-1.5 px-3">
                                <span
                                    className={cn(
                                        'text-sm font-mono',
                                        type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    )}
                                >
                                    {formatCurrency(rule.amount)}
                                </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-1.5 px-3">
                                <Badge variant="secondary" className="text-xs font-normal">
                                    {rule.category}
                                </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-1.5 px-3">
                                {rule.isRecurring && rule.frequency ? (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <RefreshCw className="size-3" />
                                        {FREQUENCY_LABELS[rule.frequency]}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">One-time</span>
                                )}
                            </TableCell>
                            <TableCell className="py-1.5 px-3 print:hidden">
                                <div className="flex gap-1 justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="size-7 p-0"
                                        onClick={() => onEdit(rule)}
                                    >
                                        <Pencil className="size-3.5" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="size-7 p-0 text-destructive hover:text-destructive"
                                        onClick={() => deleteRule(rule.id)}
                                    >
                                        <Trash2 className="size-3.5" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/30 font-medium">
                        <TableCell className="py-2 px-3 text-sm">
                            Total ({rules.length} {rules.length === 1 ? 'rule' : 'rules'})
                        </TableCell>
                        <TableCell className="py-2 px-3">
                            <span
                                className={cn(
                                    'text-sm font-mono font-semibold',
                                    type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                )}
                            >
                                {formatCurrency(total)}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-1">/mo</span>
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
