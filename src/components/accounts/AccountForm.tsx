// ============================================================================
// ACCOUNT FORM COMPONENT
// ============================================================================
// Dialog-based form for creating and editing accounts.
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
import { useBudgetStore } from '@/store/budget-store';
import type { Account, AccountType } from '@/types/budget';
import { ACCOUNT_TYPE_LABELS, LIABILITY_ACCOUNT_TYPES } from '@/types/budget';
import { useEffect, useState } from 'react';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface AccountFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingAccount?: Account | null;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
    { value: 'checking', label: ACCOUNT_TYPE_LABELS.checking },
    { value: 'savings', label: ACCOUNT_TYPE_LABELS.savings },
    { value: 'credit_card', label: ACCOUNT_TYPE_LABELS.credit_card },
    { value: 'loan', label: ACCOUNT_TYPE_LABELS.loan },
    { value: 'investment', label: ACCOUNT_TYPE_LABELS.investment },
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function AccountForm({
    open,
    onOpenChange,
    editingAccount,
}: AccountFormProps) {
    const addAccount = useBudgetStore((s) => s.addAccount);
    const updateAccount = useBudgetStore((s) => s.updateAccount);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>('checking');
    const [startingBalance, setStartingBalance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when dialog opens/closes or editing account changes
    useEffect(() => {
        if (open && editingAccount) {
            setName(editingAccount.name);
            setType(editingAccount.type);
            // Show absolute value for display (liabilities stored as negative internally)
            setStartingBalance(Math.abs(editingAccount.startingBalance).toString());
        } else if (open) {
            // Reset for new account
            setName('');
            setType('checking');
            setStartingBalance('');
        }
    }, [open, editingAccount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !startingBalance) return;

        setIsSubmitting(true);

        // Liabilities are stored as negative values internally
        const isLiability = LIABILITY_ACCOUNT_TYPES.includes(type);
        const rawBalance = parseFloat(startingBalance);
        const adjustedBalance = isLiability ? -Math.abs(rawBalance) : Math.abs(rawBalance);

        const formData = {
            name: name.trim(),
            type,
            startingBalance: adjustedBalance,
        };

        try {
            if (editingAccount) {
                await updateAccount(editingAccount.id, formData);
            } else {
                await addAccount(formData);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save account:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
                    <DialogDescription>
                        {editingAccount
                            ? 'Update the details of this account.'
                            : 'Create a new financial account to track.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Account Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Main Checking, Chase Sapphire"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-1.5">
                        <Label htmlFor="type">Account Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                            <SelectTrigger id="type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ACCOUNT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Starting Balance */}
                    <div className="space-y-1.5">
                        <Label htmlFor="startingBalance">Starting Balance</Label>
                        <Input
                            id="startingBalance"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={startingBalance}
                            onChange={(e) => setStartingBalance(e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            For loans/credit cards, enter the amount you owe (we'll track it as debt).
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editingAccount ? 'Update' : 'Add Account'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
