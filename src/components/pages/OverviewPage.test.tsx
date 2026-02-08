import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw-server';
import { OverviewPage } from './OverviewPage';
import { useBudgetStore } from '@/store/budget-store';

const API_BASE = 'http://localhost:3001/api';

const profileBase = {
    id: 'profile-1',
    name: 'Primary',
    accounts: [
        {
            id: 'acc-1',
            name: 'Main Checking',
            type: 'checking',
            startingBalance: 4200,
            createdAt: '2026-01-01T00:00:00.000Z',
        },
    ],
    rules: [
        {
            id: 'rule-income',
            label: 'Salary',
            amount: 5200,
            type: 'income',
            accountId: 'acc-1',
            category: 'Salary',
            notes: '',
            isRecurring: true,
            frequency: 'monthly',
            startMonth: '2026-01',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
        },
    ],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
};

const monthlyStateBase = {
    monthIso: '2026-02',
    summary: {
        income: 5200,
        totalPlannedExpenses: 3200,
        totalActualSpent: 1800,
        safeToSpend: 2000,
    },
    bills: [
        {
            ruleId: 'bill-rent',
            label: 'Rent',
            planned: 1400,
            actual: null,
            isPaid: false,
            dueDate: 1,
        },
    ],
    spending: [],
};

const projectionsBase = {
    accounts: [
        {
            account: profileBase.accounts[0],
            projection: {
                accountId: 'acc-1',
                startingBalance: 4200,
                monthlyIncome: 5200,
                monthlyExpenses: 3200,
                monthlyNet: 2000,
                projectedBalance: 6200,
                months: 6,
            },
        },
    ],
    netWorthAnalysis: {
        currentNetWorth: 4200,
        currentAssets: 4200,
        currentLiabilities: 0,
        projectedNetWorth: 6200,
        projectedAssets: 6200,
        projectedLiabilities: 0,
        projectionMonths: 6,
    },
    budgetId: 'profile-1',
    budgetName: 'Primary',
};

describe('OverviewPage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
        useBudgetStore.setState({
            profiles: [],
            activeProfileId: null,
            isLoading: true,
            isInitialized: false,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders hero metrics and unpaid bills', async () => {
        server.use(
            http.get(`${API_BASE}/profiles`, () => HttpResponse.json([profileBase])),
            http.get(`${API_BASE}/profiles/${profileBase.id}/rules/monthly-state`, () => HttpResponse.json(monthlyStateBase)),
            http.get(`${API_BASE}/profiles/${profileBase.id}/accounts/projections`, () => HttpResponse.json(projectionsBase))
        );

        render(<OverviewPage />);

        expect(await screen.findByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('$4,200')).toBeInTheDocument();
        expect(screen.getByText('Rent')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Review in Tracking' })).toBeInTheDocument();
    });

    it('shows all-caught-up state when no unpaid bills exist', async () => {
        server.use(
            http.get(`${API_BASE}/profiles`, () => HttpResponse.json([profileBase])),
            http.get(`${API_BASE}/profiles/${profileBase.id}/rules/monthly-state`, () => HttpResponse.json({
                ...monthlyStateBase,
                bills: [{ ...monthlyStateBase.bills[0], isPaid: true }],
            })),
            http.get(`${API_BASE}/profiles/${profileBase.id}/accounts/projections`, () => HttpResponse.json(projectionsBase))
        );

        render(<OverviewPage />);

        expect(await screen.findByText('All caught up. No unpaid bills right now.')).toBeInTheDocument();
    });

    it('shows empty accounts state when there are no accounts', async () => {
        const noAccountsProfile = { ...profileBase, accounts: [] };
        server.use(
            http.get(`${API_BASE}/profiles`, () => HttpResponse.json([noAccountsProfile])),
            http.get(`${API_BASE}/profiles/${noAccountsProfile.id}/rules/monthly-state`, () => HttpResponse.json(monthlyStateBase)),
            http.get(`${API_BASE}/profiles/${noAccountsProfile.id}/accounts/projections`, () => HttpResponse.json({
                ...projectionsBase,
                accounts: [],
                netWorthAnalysis: {
                    ...projectionsBase.netWorthAnalysis,
                    currentNetWorth: 0,
                    currentAssets: 0,
                    currentLiabilities: 0,
                },
            }))
        );

        render(<OverviewPage />);

        expect(await screen.findByText('No accounts yet. Add one to see your balances here.')).toBeInTheDocument();
    });

    it('shows next step to add rules when profile has no rules', async () => {
        const noRulesProfile = { ...profileBase, rules: [] };
        server.use(
            http.get(`${API_BASE}/profiles`, () => HttpResponse.json([noRulesProfile])),
            http.get(`${API_BASE}/profiles/${noRulesProfile.id}/rules/monthly-state`, () => HttpResponse.json(monthlyStateBase)),
            http.get(`${API_BASE}/profiles/${noRulesProfile.id}/accounts/projections`, () => HttpResponse.json(projectionsBase))
        );

        render(<OverviewPage />);

        expect(await screen.findByText('Add income and expense rules')).toBeInTheDocument();
    });
});
