// ============================================================================
// TRACKING PAGE
// ============================================================================
// Month-based budget tracking view with temporal state locks.
// ============================================================================

import { MonthControlBar, MonthDashboard, TransactionSheet } from '@/components/tracking';
import { useTemporalState } from '@/hooks/useTemporalState';
import { ledgerApi, rulesApi } from '@/lib/api-client';
import { parseMonthInput, toMonthString } from '@/lib/date-utils';
import { useBudgetStore } from '@/store/budget-store';
import type { MonthSummary, MonthlyState } from '@/types/engine';
import { useEffect, useMemo, useState } from 'react';

import { type PageId } from '@/components/layout/AppSidebar';

interface TrackingPageProps {
  onNavigate?: (page: PageId) => void;
}

export function TrackingPage({ onNavigate }: TrackingPageProps) {
  const initialize = useBudgetStore((s) => s.initialize);
  const isLoading = useBudgetStore((s) => s.isLoading);
  const isInitialized = useBudgetStore((s) => s.isInitialized);
  const activeProfile = useBudgetStore((s) => s.getActiveProfile());

  const currentRealMonth = useMemo(() => toMonthString(parseMonthInput(new Date())), []);
  const [currentViewMonth, setCurrentViewMonth] = useState(currentRealMonth);
  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0,
    totalPlannedExpense: 0,
    totalActualExpense: 0,
  });
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [monthlyState, setMonthlyState] = useState<MonthlyState | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<Array<{
    id: string;
    rule_id: string;
    month_iso: string;
    amount: number;
    date: string;
    notes: string;
  }>>([]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const fetchMonthlyState = async () => {
      if (!activeProfile) return;
      try {
        const state = await rulesApi.getMonthlyState(activeProfile.id, currentViewMonth);
        setMonthlyState(state);
        setSummary({
          totalIncome: state.summary.income,
          totalPlannedExpense: state.summary.totalPlannedExpenses,
          totalActualExpense: state.summary.totalActualSpent,
        });
        const entries = await ledgerApi.list(activeProfile.id, currentViewMonth);
        setLedgerEntries(entries);
      } catch (error) {
        console.error('Failed to fetch monthly state:', error);
      }
    };

    fetchMonthlyState();
  }, [activeProfile, currentViewMonth]);

  const { isFuture } = useTemporalState(currentViewMonth);
  const accounts = activeProfile?.accounts ?? [];

  const mergedView = useMemo(() => {
    if (!monthlyState) {
      return { fixedBills: [], variableCategories: [], ruleCount: 0 };
    }

    const fixedBills = monthlyState.bills.map((bill) => ({
      ...(() => {
        const entry = ledgerEntries.find((row) => row.rule_id === bill.ruleId);
        return {
          paidOn: entry?.date,
        };
      })(),
      id: bill.ruleId,
      name: bill.label,
      amount: bill.planned,
      category: 'Fixed Bill',
      dueDate: bill.dueDate
        ? `${monthlyState.monthIso}-${String(bill.dueDate).padStart(2, '0')}`
        : undefined,
      isPaid: bill.isPaid,
    }));

    const variableCategories = monthlyState.spending.map((item) => ({
      id: item.ruleId,
      name: item.label,
      budgeted: item.planned,
      spent: item.spent,
    }));

    return {
      fixedBills,
      variableCategories,
      ruleCount: monthlyState.bills.length + monthlyState.spending.length,
    };
  }, [monthlyState, ledgerEntries]);

  const activeCategory = useMemo(() => {
    if (!activeCategoryId) return null;
    return mergedView.variableCategories.find((category) => category.id === activeCategoryId) ?? null;
  }, [activeCategoryId, mergedView.variableCategories]);

  const refreshMonth = async () => {
    if (!activeProfile) return;
    const state = await rulesApi.getMonthlyState(activeProfile.id, currentViewMonth);
    setMonthlyState(state);
    setSummary({
      totalIncome: state.summary.income,
      totalPlannedExpense: state.summary.totalPlannedExpenses,
      totalActualExpense: state.summary.totalActualSpent,
    });
    const entries = await ledgerApi.list(activeProfile.id, currentViewMonth);
    setLedgerEntries(entries);
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
      <MonthControlBar
        currentViewMonth={currentViewMonth}
        onChangeMonth={setCurrentViewMonth}
        summary={summary}
      />

      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {isReadOnly ? (
            <p>
              This month is read-only. Adjust projections in <span className="font-medium text-foreground">Edit Global Rules</span>.
            </p>
          ) : (
            <p>
              This month is active. Ledger entries and checks are enabled.
            </p>
          )}
        </div> */}

        <MonthDashboard
          mergedView={mergedView}
          onOpenCategory={(categoryId) => setActiveCategoryId(categoryId)}
          onMarkPaid={async (billId) => {
            if (!activeProfile) return;
            await ledgerApi.markBillPaid(activeProfile.id, {
              ruleId: billId,
              monthIso: currentViewMonth,
            });
            await refreshMonth();
          }}
          onUndoPaid={async (billId) => {
            if (!activeProfile) return;
            await ledgerApi.unmarkBillPaid(activeProfile.id, {
              ruleId: billId,
              monthIso: currentViewMonth,
            });
            await refreshMonth();
          }}
          onStartFresh={() => {
            onNavigate?.('budget');
          }}
          readOnly={isFuture}
        />
      </div>

      {activeCategory && (
        <TransactionSheet
          isOpen={!!activeCategoryId}
          onClose={() => setActiveCategoryId(null)}
          category={{
            id: activeCategory.id,
            name: activeCategory.name,
            planned: activeCategory.budgeted,
            spent: activeCategory.spent,
            month: currentViewMonth,
          }}
          existingTransactions={ledgerEntries
            .filter((entry) => entry.rule_id === activeCategory.id)
            .map((entry) => ({
              id: entry.id,
              categoryId: entry.rule_id,
              amount: entry.amount,
              merchant: entry.notes,
              date: entry.date,
              accountId: undefined,
            }))}
          accounts={accounts}
          onAddTransaction={async (payload) => {
            if (!activeProfile) return;
            await ledgerApi.addTransaction(activeProfile.id, {
              ruleId: payload.categoryId,
              monthIso: currentViewMonth,
              amount: payload.amount,
              date: payload.date,
              notes: payload.merchant,
            });
            await refreshMonth();
          }}
          onDeleteTransaction={async (transactionId) => {
            await ledgerApi.deleteEntry(transactionId);
            await refreshMonth();
          }}
        />
      )}
    </div>
  );
}
