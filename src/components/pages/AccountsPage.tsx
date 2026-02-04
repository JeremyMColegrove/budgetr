// ============================================================================
// ACCOUNTS PAGE COMPONENT
// ============================================================================
// Main accounts management view with Net Worth header, account cards,
// and balance projection functionality.
// ============================================================================

import { AccountCard, AccountForm } from '@/components/accounts';
import { PageHeader } from '@/components/layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateAllProjections } from '@/lib/projections';
import { cn } from '@/lib/utils';
import { useBudgetStore } from '@/store/budget-store';
import type { Account } from '@/types/budget';
import { ASSET_ACCOUNT_TYPES } from '@/types/budget';
import { Plus, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function AccountsPage() {
    const initialize = useBudgetStore((s) => s.initialize);
    const isLoading = useBudgetStore((s) => s.isLoading);
    const isInitialized = useBudgetStore((s) => s.isInitialized);
    const accounts = useBudgetStore((s) => s.getAccounts());
    const activeProfile = useBudgetStore((s) => s.getActiveProfile());
    const netWorth = useBudgetStore((s) => s.getNetWorth());
    const deleteAccount = useBudgetStore((s) => s.deleteAccount);

    // Form dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    // Delete confirmation state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Projection state
    const [projectionMonths, setProjectionMonths] = useState(6);

    // Initialize store on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Calculate projections for all accounts
    const projections = activeProfile
        ? calculateAllProjections(accounts, activeProfile.rules, projectionMonths)
        : new Map();

    // Calculate current assets and liabilities totals
    const totalAssets = accounts
        .filter((a) => ASSET_ACCOUNT_TYPES.includes(a.type))
        .reduce((sum, a) => sum + a.startingBalance, 0);
    const totalLiabilities = accounts
        .filter((a) => !ASSET_ACCOUNT_TYPES.includes(a.type))
        .reduce((sum, a) => sum + a.startingBalance, 0);

    // Calculate projected totals
    const projectedAssets = accounts
        .filter((a) => ASSET_ACCOUNT_TYPES.includes(a.type))
        .reduce((sum, a) => sum + (projections.get(a.id)?.projectedBalance ?? a.startingBalance), 0);
    const projectedLiabilities = accounts
        .filter((a) => !ASSET_ACCOUNT_TYPES.includes(a.type))
        .reduce((sum, a) => sum + (projections.get(a.id)?.projectedBalance ?? a.startingBalance), 0);
    const projectedNetWorth = projectedAssets + projectedLiabilities;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const handleAddAccount = () => {
        setEditingAccount(null);
        setFormOpen(true);
    };

    const handleEditAccount = (account: Account) => {
        setEditingAccount(account);
        setFormOpen(true);
    };

    const handleDeleteAccount = (account: Account) => {
        setAccountToDelete(account);
        setDeleteError(null);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!accountToDelete) return;
        try {
            await deleteAccount(accountToDelete.id);
            setDeleteDialogOpen(false);
            setAccountToDelete(null);
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
        }
    };

    if (isLoading || !isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl print:px-0 print:py-4">
                <PageHeader
                    title="Accounts"
                    description="Track your net worth and manage asset & liability accounts."
                    actions={
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 mr-2 bg-muted/50 px-3 py-1.5 rounded-md border border-border/50">
                                <Label htmlFor="months" className="text-xs font-medium text-muted-foreground whitespace-nowrap print:hidden">
                                    Projection
                                </Label>
                                <Input
                                    id="months"
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={projectionMonths}
                                    onChange={(e) => setProjectionMonths(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-14 h-7 text-center text-xs print:hidden bg-background border-border/50 shadow-none focus-visible:ring-1"
                                />
                                <span className="text-xs text-muted-foreground print:hidden">mo</span>
                            </div>
                            <Button onClick={handleAddAccount} size="sm" className="h-9 px-4 shadow-sm" data-no-print>
                                <Plus className="size-4 mr-1.5" />
                                Add Account
                            </Button>
                        </div>
                    }
                />

                {/* Net Worth Hero Section */}
                <div className="relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm mb-8">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="size-48 -mr-12 -mt-12" />
                    </div>

                    <div className="p-6 md:p-8 relative z-10">
                        <div className="flex flex-col md:flex-row gap-8 md:items-center md:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Net Worth</h2>
                                <div className={cn(
                                    "text-4xl md:text-5xl font-bold tracking-tight font-mono",
                                    netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                )}>
                                    {formatCurrency(netWorth)}
                                </div>
                                <div className={cn(
                                    "text-sm font-mono flex items-center gap-2",
                                    projectedNetWorth >= netWorth ? 'text-emerald-600/80' : 'text-rose-600/80'
                                )}>
                                    <span>Projection ({projectionMonths}mo): {formatCurrency(projectedNetWorth)}</span>
                                    {projectedNetWorth > netWorth && <TrendingUp className="size-3" />}
                                </div>
                            </div>

                            <div className="flex gap-8 md:gap-12">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Assets</p>
                                    <p className="text-xl md:text-2xl font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(totalAssets)}
                                    </p>
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5 opacity-80">
                                        → {formatCurrency(projectedAssets)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Liabilities</p>
                                    <p className="text-xl md:text-2xl font-semibold font-mono text-rose-600 dark:text-rose-400">
                                        {formatCurrency(totalLiabilities)}
                                    </p>
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5 opacity-80">
                                        → {formatCurrency(projectedLiabilities)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accounts Section */}
                <main className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <h2 className="text-lg font-semibold tracking-tight">Active Accounts</h2>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {accounts.length}
                        </span>
                    </div>

                    {accounts.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-12 text-center bg-muted/20">
                            <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm">
                                <Wallet className="size-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-semibold mb-1">No accounts added</h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                                Start tracking your finances by adding your first asset or liability account.
                            </p>
                            <Button onClick={handleAddAccount} size="sm" variant="outline">
                                <Plus className="size-4 mr-1.5" />
                                Add Account
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {accounts.map((account) => (
                                <AccountCard
                                    key={account.id}
                                    account={account}
                                    projection={projections.get(account.id) ?? null}
                                    onEdit={handleEditAccount}
                                    onDelete={handleDeleteAccount}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Account Form Dialog */}
            <AccountForm
                open={formOpen}
                onOpenChange={setFormOpen}
                editingAccount={editingAccount}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteError ? (
                                <span className="text-destructive">{deleteError}</span>
                            ) : (
                                <>
                                    Are you sure you want to delete <span className="font-semibold text-foreground">"{accountToDelete?.name}"</span>?
                                    <br />
                                    This action cannot be undone and will remove all associated history.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {!deleteError && (
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Account
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
