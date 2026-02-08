// ============================================================================
// BUDGET DASHBOARD COMPONENT
// ============================================================================
// Main orchestrating component combining all budget UI elements.
// ============================================================================

import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { rulesApi } from '@/lib/api-client';
import { parseMonthInput, toMonthString } from '@/lib/date-utils';
import { useBudgetStore } from '@/store/budget-store';
import type { BudgetRule } from '@/types/budget';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BudgetHeader } from './BudgetHeader';
import { ProfileSelector } from './ProfileSelector';
import { TransactionRuleForm } from './TransactionRuleForm';
import { TransactionRuleTable } from './TransactionRuleTable';

export function BudgetDashboard() {
    const initialize = useBudgetStore((s) => s.initialize);
    const isLoading = useBudgetStore((s) => s.isLoading);
    const isInitialized = useBudgetStore((s) => s.isInitialized);
    const activeProfile = useBudgetStore((s) => s.getActiveProfile());

    const monthIso = useMemo(() => toMonthString(parseMonthInput(new Date())), []);
    const [monthlySummary, setMonthlySummary] = useState<{
        totalIncome: number;
        totalPlannedExpense: number;
    } | null>(null);

    // Form dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<BudgetRule | null>(null);

    // Initialize store on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        const fetchSummary = async () => {
            if (!activeProfile) return;
            try {
                const summary = await rulesApi.getSummary(activeProfile.id, monthIso);
                setMonthlySummary(summary);
            } catch (error) {
                console.error('Failed to fetch month summary:', error);
            }
        };

        fetchSummary();
    }, [activeProfile, monthIso]);

    const handleAddRule = () => {
        setEditingRule(null);
        setFormOpen(true);
    };

    const handleEditRule = (rule: BudgetRule) => {
        setEditingRule(rule);
        setFormOpen(true);
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
                    title={activeProfile?.name ?? 'Budget'}
                    description={
                        <span>
                            Manage your monthly budget, income, and expenses.
                            <span className="hidden sm:inline"> • Generated {new Date().toLocaleDateString()}</span>
                        </span>
                    }
                    actions={
                        <div className="flex items-center gap-3">
                            <ProfileSelector />
                            <Button onClick={handleAddRule} size="sm" className="h-9 px-4 shadow-sm" data-no-print>
                                <Plus className="size-4 mr-1.5" />
                                Add Rule
                            </Button>
                        </div>
                    }
                />

                <main className="space-y-8 print:space-y-4">
                    {/* Budget Overview */}
                    <BudgetHeader
                        totalIncome={monthlySummary?.totalIncome ?? 0}
                        totalExpenses={monthlySummary?.totalPlannedExpense ?? 0}
                        amountLeftToAllocate={(monthlySummary?.totalIncome ?? 0) - (monthlySummary?.totalPlannedExpense ?? 0)}
                    />

                    {/* Income Section */}
                    <section className="space-y-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <h2 className="text-sm font-semibold">Income</h2>
                        </div>
                        <TransactionRuleTable
                            type="income"
                            monthlyTotal={monthlySummary?.totalIncome}
                            onEdit={handleEditRule}
                        />
                    </section>

                    {/* Expenses Section */}
                    <section className="space-y-2">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="size-4 text-rose-600 dark:text-rose-400" />
                            <h2 className="text-sm font-semibold">Expenses</h2>
                        </div>
                        <TransactionRuleTable
                            type="expense"
                            monthlyTotal={monthlySummary?.totalPlannedExpense}
                            onEdit={handleEditRule}
                        />
                    </section>
                </main>

                {/* Transaction Rule Form Dialog */}
                <TransactionRuleForm
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    editingRule={editingRule}
                />
            </div>
        </div>
    );
}
