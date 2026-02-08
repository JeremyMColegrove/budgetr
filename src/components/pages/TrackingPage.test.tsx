import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw-server';
import { TrackingPage } from './TrackingPage';
import { useBudgetStore } from '@/store/budget-store';

const API_BASE = 'http://localhost:3001/api';

const profile = {
  id: 'profile-1',
  name: 'Primary',
  accounts: [],
  rules: [],
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

describe('TrackingPage', () => {
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
      http.get(`${API_BASE}/profiles/${profile.id}/rules/monthly-state`, () => {
        return HttpResponse.json({
          monthIso: '2026-02',
          summary: {
            income: 5000,
            totalPlannedExpenses: 3200,
            totalActualSpent: 1800,
            safeToSpend: 2000,
          },
          bills: [
            {
              ruleId: 'rule-rent',
              label: 'Rent',
              planned: 1200,
              actual: 1200,
              isPaid: true,
              dueDate: 1,
            },
          ],
          spending: [
            {
              ruleId: 'rule-groceries',
              label: 'Groceries',
              planned: 400,
              spent: 200,
              remaining: 200,
              transactionCount: 2,
            },
          ],
        });
      }),
      http.get(`${API_BASE}/profiles/${profile.id}/ledger`, () => {
        return HttpResponse.json([
          {
            id: 'led-1',
            rule_id: 'rule-rent',
            month_iso: '2026-02',
            amount: 1200,
            date: '2026-02-01',
            notes: 'Paid',
          },
          {
            id: 'led-2',
            rule_id: 'rule-groceries',
            month_iso: '2026-02',
            amount: 120,
            date: '2026-02-03',
            notes: 'Market',
          },
          {
            id: 'led-3',
            rule_id: 'rule-groceries',
            month_iso: '2026-02',
            amount: 80,
            date: '2026-02-10',
            notes: 'Store',
          },
        ]);
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the monthly summary values from API data', async () => {
    render(<TrackingPage />);

    expect(await screen.findByText('Income')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    expect(screen.getByText('$1,800.00 / $3,200.00')).toBeInTheDocument();
    expect(screen.getByText('$1,800.00')).toBeInTheDocument();
  });

  it('renders tracking cards based on monthly state', async () => {
    render(<TrackingPage />);

    expect(await screen.findByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Total Budget: $1,600')).toBeInTheDocument();
    expect(screen.getByText('Left to Spend:')).toBeInTheDocument();
    expect(screen.getAllByText('$200').length).toBeGreaterThan(0);
  });
});
