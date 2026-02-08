import { profilesApi, rulesApi } from '@/lib/api-client';
import { formatMonthLabel, parseMonthInput, toMonthString } from '@/lib/date-utils';
import { useBudgetStore } from '@/store/budget-store';
import type { Account, AccountType } from '@/types/budget';
import { ASSET_ACCOUNT_TYPES, LIABILITY_ACCOUNT_TYPES } from '@/types/budget';
import type { AccountsWithProjectionsResponse, MonthlyState } from '@/types/engine';
import { useEffect, useMemo, useState } from 'react';

export interface OverviewBill {
    id: string;
    label: string;
    planned: number;
    dueDate?: number;
    isPaid: boolean;
    monthIso: string;
}

export interface OverviewAccountSummary {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    projectedBalance?: number;
    projectionMonths?: number;
}

export interface OverviewNextStep {
    id: string;
    title: string;
    description: string;
    action: 'accounts' | 'budget' | 'tracking';
}

export interface OverviewData {
    profileName: string;
    monthIso: string;
    monthLabel: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    totalIncome: number;
    plannedExpenses: number;
    actualExpenses: number;
    safeToSpend: number;
    unpaidBills: OverviewBill[];
    accounts: OverviewAccountSummary[];
    nextSteps: OverviewNextStep[];
}

interface OverviewState {
    data: OverviewData | null;
    isLoading: boolean;
    error: string | null;
}

const EMPTY_ACCOUNTS: Account[] = [];

function sumBalances(accounts: Account[], types: AccountType[]) {
    return accounts
        .filter((account) => types.includes(account.type))
        .reduce((total, account) => total + account.startingBalance, 0);
}

export function useOverviewData(): OverviewState {
    const initialize = useBudgetStore((s) => s.initialize);
    const isStoreLoading = useBudgetStore((s) => s.isLoading);
    const isStoreInitialized = useBudgetStore((s) => s.isInitialized);
    const profiles = useBudgetStore((s) => s.profiles);
    const activeProfileId = useBudgetStore((s) => s.activeProfileId);

    const [monthlyState, setMonthlyState] = useState<MonthlyState | null>(null);
    const [projections, setProjections] = useState<AccountsWithProjectionsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const monthIso = useMemo(() => toMonthString(parseMonthInput(new Date())), []);
    const monthLabel = useMemo(() => formatMonthLabel(parseMonthInput(new Date())), []);

    const activeProfile = useMemo(
        () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
        [profiles, activeProfileId]
    );
    const accounts = activeProfile?.accounts ?? EMPTY_ACCOUNTS;

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        let isActive = true;

        const fetchOverviewData = async () => {
            if (!activeProfile) {
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const [stateResult, projectionResult] = await Promise.allSettled([
                    rulesApi.getMonthlyState(activeProfile.id, monthIso),
                    profilesApi.getAccountsWithProjections(activeProfile.id, 6),
                ]);

                if (!isActive) return;

                if (stateResult.status === 'fulfilled') {
                    setMonthlyState(stateResult.value);
                } else {
                    setError(stateResult.reason instanceof Error ? stateResult.reason.message : 'Failed to load monthly state.');
                }

                if (projectionResult.status === 'fulfilled') {
                    setProjections(projectionResult.value);
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        fetchOverviewData();

        return () => {
            isActive = false;
        };
    }, [activeProfile, monthIso]);

    const data = useMemo<OverviewData | null>(() => {
        if (!activeProfile) return null;

        const profileName = activeProfile.name ?? 'Budget';

        const accountList = accounts ?? [];
        const projectionMap = new Map(
            projections?.accounts?.map((entry) => [entry.account.id, entry.projection]) ?? []
        );

        const accountSummaries: OverviewAccountSummary[] = accountList.map((account) => {
            const projection = projectionMap.get(account.id);
            return {
                id: account.id,
                name: account.name,
                type: account.type,
                balance: projection?.startingBalance ?? account.startingBalance,
                projectedBalance: projection?.projectedBalance,
                projectionMonths: projection?.months,
            };
        });

        let totalAssets = projections?.netWorthAnalysis.currentAssets ?? 0;
        let totalLiabilities = projections?.netWorthAnalysis.currentLiabilities ?? 0;
        let netWorth = projections?.netWorthAnalysis.currentNetWorth ?? 0;

        if (!projections) {
            const assetsFallback = sumBalances(accountList, ASSET_ACCOUNT_TYPES);
            const liabilitiesFallback = sumBalances(accountList, LIABILITY_ACCOUNT_TYPES);
            const normalizedLiabilities = liabilitiesFallback < 0
                ? Math.abs(liabilitiesFallback)
                : liabilitiesFallback;

            totalAssets = assetsFallback;
            totalLiabilities = normalizedLiabilities;
            netWorth = liabilitiesFallback < 0
                ? assetsFallback + liabilitiesFallback
                : assetsFallback - liabilitiesFallback;
        }

        const summary = monthlyState?.summary;
        const totalIncome = summary?.income ?? 0;
        const plannedExpenses = summary?.totalPlannedExpenses ?? 0;
        const actualExpenses = summary?.totalActualSpent ?? 0;
        const safeToSpend = summary?.safeToSpend ?? Math.max(totalIncome - actualExpenses, 0);

        const unpaidBills: OverviewBill[] = (monthlyState?.bills ?? [])
            .filter((bill) => !bill.isPaid)
            .sort((a, b) => (a.dueDate ?? 99) - (b.dueDate ?? 99))
            .map((bill) => ({
                id: bill.ruleId,
                label: bill.label,
                planned: bill.planned,
                dueDate: bill.dueDate,
                isPaid: bill.isPaid,
                monthIso,
            }));

        const nextSteps: OverviewNextStep[] = [];
        if (accountList.length === 0) {
            nextSteps.push({
                id: 'connect-accounts',
                title: 'Connect your first account',
                description: 'Add checking, savings, or credit cards to see real balances.',
                action: 'accounts',
            });
        }
        if ((activeProfile.rules ?? []).length === 0) {
            nextSteps.push({
                id: 'add-budget-rules',
                title: 'Add income and expense rules',
                description: 'Set up your recurring paycheck and monthly bills.',
                action: 'budget',
            });
        }
        if (unpaidBills.length > 0) {
            nextSteps.push({
                id: 'review-unpaid-bills',
                title: 'Review unpaid bills',
                description: 'Jump to Tracking to mark bills as paid.',
                action: 'tracking',
            });
        }
        if (monthlyState?.spending?.some((item) => item.remaining < 0)) {
            nextSteps.push({
                id: 'review-overspend',
                title: 'Triage overspent categories',
                description: 'See which categories are trending over budget.',
                action: 'tracking',
            });
        }

        return {
            profileName,
            monthIso,
            monthLabel,
            netWorth,
            totalAssets,
            totalLiabilities,
            totalIncome,
            plannedExpenses,
            actualExpenses,
            safeToSpend,
            unpaidBills,
            accounts: accountSummaries,
            nextSteps,
        };
    }, [accounts, activeProfile, monthIso, monthLabel, monthlyState, projections]);

    return {
        data,
        isLoading: isLoading || isStoreLoading || !isStoreInitialized,
        error,
    };
}
