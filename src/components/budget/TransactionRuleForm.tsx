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
    const [notes, setNotes] = useState('');
    const [isRecurring, setIsRecurring] = useState(true);
    const [frequency, setFrequency] = useState<Frequency>('monthly');
    const [startDate, setStartDate] = useState('');
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
            setNotes(editingRule.notes);
            setIsRecurring(editingRule.isRecurring);
            setFrequency(editingRule.frequency ?? 'monthly');
            setStartDate(editingRule.startDate ?? '');
        } else if (open) {
            // Reset for new rule
            setLabel('');
            setAmount('');
            setType('expense');
            setAccountId('');
            setToAccountId('');
            setCategory('');
            setNotes('');
            setIsRecurring(true);
            setFrequency('monthly');
            setStartDate('');
        }
    }, [open, editingRule]);

    const categories = type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

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
            notes: notes.trim(),
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: isRecurring && startDate ? startDate : undefined,
        };

        try {
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Toggle */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={type === 'income' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
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
                            className="flex-1"
                            onClick={() => {
                                setType('expense');
                                setCategory('');
                            }}
                        >
                            Expense
                        </Button>
                    </div>

                    {/* Label */}
                    <div className="space-y-1.5">
                        <Label htmlFor="label">Label</Label>
                        <Input
                            id="label"
                            placeholder="e.g., Rent, Groceries, Paycheck"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            required
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory} required>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select a category" />
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

                    {/* Account - Smart Pay From / Deposit To */}
                    {accounts.length > 0 && (
                        <div className="space-y-1.5">
                            <Label htmlFor="account">
                                {type === 'expense' ? 'Pay From Account' : 'Deposit To Account'}
                            </Label>
                            <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
                                <SelectTrigger id="account">
                                    <SelectValue placeholder="Select an account (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No account link</SelectItem>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {type === 'expense'
                                    ? 'Optional: The account this expense is paid from.'
                                    : 'Optional: The account this income is deposited to.'}
                            </p>
                        </div>
                    )}

                    {/* Pay To Account (for loan payments) - expenses only */}
                    {type === 'expense' && accounts.length > 0 && (
                        <div className="space-y-1.5">
                            <Label htmlFor="toAccount">Transfer To Account</Label>
                            <Select value={toAccountId || 'none'} onValueChange={(v) => setToAccountId(v === 'none' ? '' : v)}>
                                <SelectTrigger id="toAccount">
                                    <SelectValue placeholder="Select destination account (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No transfer</SelectItem>
                                    {accounts
                                        .filter((a) => a.id !== accountId) // Exclude source account
                                        .map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                For transfers/payments: moves money to another account (savings, loan, etc.)
                            </p>
                        </div>
                    )}

                    {/* Is Recurring */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="recurring" className="cursor-pointer">
                            Recurring
                        </Label>
                        <Switch
                            id="recurring"
                            checked={isRecurring}
                            onCheckedChange={setIsRecurring}
                        />
                    </div>

                    {/* Recurring Options */}
                    {isRecurring && (
                        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="frequency">Frequency</Label>
                                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                                    <SelectTrigger id="frequency">
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

                            <div className="space-y-1.5">
                                <Label htmlFor="startDate">Start Date (optional)</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Additional details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editingRule ? 'Update' : 'Add Rule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
