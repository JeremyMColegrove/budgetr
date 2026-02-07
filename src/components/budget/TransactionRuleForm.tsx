// ============================================================================
// TRANSACTION RULE FORM COMPONENT
// ============================================================================
// Dialog-based form for creating and editing budget rules.
// ============================================================================

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { categoriesApi } from '@/lib/api-client';
import { useBudgetStore } from '@/store/budget-store';
import type { BudgetRule, BudgetRuleFormData, Frequency, TransactionType } from '@/types/budget';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/types/budget';
import { useEffect, useState } from 'react';

interface TransactionRuleFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingRule?: BudgetRule | null;
}

const FREQUENCIES: { value: Frequency; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
];

export function TransactionRuleForm({
    open,
    onOpenChange,
    editingRule,
}: TransactionRuleFormProps) {
    const addRule = useBudgetStore((s) => s.addRule);
    const updateRule = useBudgetStore((s) => s.updateRule);
    const accounts = useBudgetStore((s) => s.getAccounts());

    // Form state
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [accountId, setAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [category, setCategory] = useState('');
    const [categoryKind, setCategoryKind] = useState<'bill' | 'spending'>('spending');
    const [expenseCategories, setExpenseCategories] = useState<string[]>([...DEFAULT_EXPENSE_CATEGORIES]);
    const [expenseCategoryKinds, setExpenseCategoryKinds] = useState<Record<string, 'bill' | 'spending'>>({});
    const [notes, setNotes] = useState('');
    const [isRecurring, setIsRecurring] = useState(true);
    const [frequency, setFrequency] = useState<Frequency>('monthly');
    const [startDate, setStartDate] = useState('');
    const [isDefaultPaid, setIsDefaultPaid] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when dialog opens/closes or editing rule changes
    useEffect(() => {
        if (open && editingRule) {
            setLabel(editingRule.label);
            setAmount(editingRule.amount.toString());
            setType(editingRule.type);
            setAccountId(editingRule.accountId ?? '');
            setToAccountId(editingRule.toAccountId ?? '');
            setCategory(editingRule.category);
            setCategoryKind(editingRule.categoryKind ?? expenseCategoryKinds[editingRule.category] ?? 'spending');
            setNotes(editingRule.notes);
            setIsRecurring(editingRule.isRecurring);
            setFrequency(editingRule.frequency ?? 'monthly');
            setStartDate(editingRule.startDate ?? '');
            setIsDefaultPaid(editingRule.isDefaultPaid ?? false);
        } else if (open) {
            // Reset for new rule
            setLabel('');
            setAmount('');
            setType('expense');
            setAccountId('');
            setToAccountId('');
            setCategory('');
            setCategoryKind('spending');
            setNotes('');
            setIsRecurring(true);
            setFrequency('monthly');
            setStartDate('');
            setIsDefaultPaid(false);
        }
    }, [open, editingRule, expenseCategoryKinds]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await categoriesApi.list();
                const kinds: Record<string, 'bill' | 'spending'> = {};
                data.forEach((item) => {
                    kinds[item.name] = item.kind;
                });
                const merged = Array.from(new Set([...data.map((item) => item.name), ...DEFAULT_EXPENSE_CATEGORIES]));
                setExpenseCategories(merged);
                setExpenseCategoryKinds(kinds);
            } catch (error) {
                console.error('Failed to load categories:', error);
                setExpenseCategories([...DEFAULT_EXPENSE_CATEGORIES]);
                setExpenseCategoryKinds({});
            }
        };

        if (open) {
            loadCategories();
        }
    }, [open]);

    useEffect(() => {
        if (type !== 'expense') return;
        if (!category) return;
        setCategoryKind(expenseCategoryKinds[category] ?? 'spending');
    }, [category, expenseCategoryKinds, type]);

    const categories = type === 'income' ? DEFAULT_INCOME_CATEGORIES : expenseCategories;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim() || !amount || !category) return;

        setIsSubmitting(true);

        const formData: BudgetRuleFormData = {
            label: label.trim(),
            amount: parseFloat(amount),
            type,
            accountId: accountId || undefined,
            toAccountId: toAccountId || undefined,
            category,
            categoryKind: type === 'expense' ? categoryKind : undefined,
            notes: notes.trim(),
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: isRecurring && startDate ? startDate : undefined,
            isDefaultPaid: type === 'expense' ? isDefaultPaid : undefined,
            startMonth: editingRule?.startMonth ?? new Date().toISOString().slice(0, 7),
        };

        try {
            if (type === 'expense' && category) {
                await categoriesApi.upsert(category, categoryKind);
            }
            if (editingRule) {
                await updateRule(editingRule.id, formData);
            } else {
                await addRule(formData);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save rule:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Rule'}</DialogTitle>
                    <DialogDescription>
                        {editingRule
                            ? 'Update the details of this budget rule.'
                            : 'Create a new income or expense rule for your budget.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Type Toggle */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={type === 'income' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 h-8"
                            onClick={() => {
                                setType('income');
                                setCategory('');
                            }}
                        >
                            Income
                        </Button>
                        <Button
                            type="button"
                            variant={type === 'expense' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 h-8"
                            onClick={() => {
                                setType('expense');
                                setCategory('');
                            }}
                        >
                            Expense
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Label */}
                        <div className="space-y-1">
                            <Label htmlFor="label" className="text-xs">Label</Label>
                            <Input
                                id="label"
                                className="h-8"
                                placeholder="e.g., Rent"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                required
                            />
                        </div>

                        {/* Amount */}
                        <div className="space-y-1">
                            <Label htmlFor="amount" className="text-xs">Amount</Label>
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-8 pl-6"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Category */}
                        <div className="space-y-1">
                            <Label htmlFor="category" className="text-xs">Category</Label>
                            <Select value={category} onValueChange={setCategory} required>
                                <SelectTrigger id="category" className="h-8">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category Kind (Expense Only) */}
                        {type === 'expense' && (
                            <div className="space-y-1">
                                <Label className="text-xs">Type</Label>
                                <div className="flex h-8 items-center rounded-md border p-1 bg-muted/20">
                                    <button
                                        type="button"
                                        onClick={() => setCategoryKind('bill')}
                                        className={`flex-1 rounded-sm text-xs font-medium transition-all ${categoryKind === 'bill'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        Fixed
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryKind('spending')}
                                        className={`flex-1 rounded-sm text-xs font-medium transition-all ${categoryKind === 'spending'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        Variable
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Account Links */}
                    {accounts.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="account" className="text-xs">
                                    {type === 'expense' ? 'Pay From' : 'Deposit To'}
                                </Label>
                                <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
                                    <SelectTrigger id="account" className="h-8">
                                        <SelectValue placeholder="Optional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {accounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {type === 'expense' && (
                                <div className="space-y-1">
                                    <Label htmlFor="toAccount" className="text-xs">Transfer To</Label>
                                    <Select value={toAccountId || 'none'} onValueChange={(v) => setToAccountId(v === 'none' ? '' : v)}>
                                        <SelectTrigger id="toAccount" className="h-8">
                                            <SelectValue placeholder="Optional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {accounts
                                                .filter((a) => a.id !== accountId)
                                                .map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Options Row */}
                    <div className="flex items-center justify-between gap-4 py-1">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={setIsRecurring}
                                className="scale-75"
                            />
                            <Label htmlFor="recurring" className="text-sm cursor-pointer">Recurring</Label>
                        </div>

                        {type === 'expense' && (
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="defaultPaid"
                                    checked={isDefaultPaid}
                                    onCheckedChange={setIsDefaultPaid}
                                    className="scale-75"
                                />
                                <Label htmlFor="defaultPaid" className="text-sm cursor-pointer">Default Paid</Label>
                            </div>
                        )}
                    </div>

                    {/* Recurring Options */}
                    {isRecurring && (
                        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-2">
                            <div className="space-y-1">
                                <Label htmlFor="frequency" className="text-xs">Frequency</Label>
                                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                                    <SelectTrigger id="frequency" className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FREQUENCIES.map((freq) => (
                                            <SelectItem key={freq.value} value={freq.value}>
                                                {freq.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    className="h-8"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1">
                        <Label htmlFor="notes" className="text-xs">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Optional notes..."
                            className="min-h-[60px] resize-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Add Rule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
