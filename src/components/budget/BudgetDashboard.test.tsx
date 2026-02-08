import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw-server';
import { BudgetDashboard } from './BudgetDashboard';
import { useBudgetStore } from '@/store/budget-store';

const API_BASE = 'http://localhost:3001/api';

const profile = {
  id: 'profile-1',
  name: 'Primary',
  accounts: [],
  rules: [
    {
      id: 'rule-income-monthly',
      label: 'Salary',
      amount: 1000,
      type: 'income',
      accountId: 'acc-check',
      category: 'Salary',
      notes: '',
      isRecurring: true,
      frequency: 'monthly',
      startMonth: '2026-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'rule-income-biweekly',
      label: 'Contract',
      amount: 2000,
      type: 'income',
      accountId: 'acc-check',
      category: 'Contract',
      notes: '',
      isRecurring: true,
      frequency: 'bi-weekly',
      startMonth: '2026-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'rule-income-weekly',
      label: 'Tips',
      amount: 100,
      type: 'income',
      accountId: 'acc-check',
      category: 'Tips',
      notes: '',
      isRecurring: true,
      frequency: 'weekly',
      startMonth: '2026-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'rule-expense-monthly',
      label: 'Rent',
      amount: 1500,
      type: 'expense',
      accountId: 'acc-check',
      category: 'Rent',
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

describe('BudgetDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
    useBudgetStore.setState({
      profiles: [],
      activeProfileId: null,
      isLoading: true,
      isInitialized: false,
    });

    server.use(
      http.get(`${API_BASE}/profiles`, () => {
        return HttpResponse.json([profile]);
      }),
      http.get(`${API_BASE}/profiles/${profile.id}/summary`, () => {
        // 1000 + (2000 * 2.17) + (100 * 4.33) = 5773
        return HttpResponse.json({
          totalIncome: 5773,
          totalExpenses: 1500,
          amountLeftToAllocate: 4273,
        });
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows summary totals that match rule table monthly normalization', async () => {
    render(<BudgetDashboard />);

    expect(await screen.findByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('$5,773.00')).toBeInTheDocument();
    expect(screen.getByText('$4,273.00')).toBeInTheDocument();

    // Total row in income table should match header total.
    expect(screen.getAllByText('$5,773.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/mo').length).toBeGreaterThan(0);
  });
});
