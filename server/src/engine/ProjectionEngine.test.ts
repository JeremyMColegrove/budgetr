import { describe, expect, it } from 'vitest';
import type { Account, BudgetRule } from '../types/index.js';
import { ProjectionEngine } from './ProjectionEngine.js';

describe('ProjectionEngine', () => {
  const baseAccount: Account = {
    id: 'acc1',
    name: 'Checking',
    type: 'checking',
    startingBalance: 1000,
    createdAt: '2023-01-01',
  };

  const createRule = (overrides: Partial<BudgetRule>): BudgetRule => ({
    id: 'rule-' + Math.random().toString(36).substr(2, 9),
    label: 'Test Rule',
    amount: 100,
    type: 'income',
    accountId: 'acc1',
    category: 'Test',
    notes: '',
    isRecurring: true,
    frequency: 'monthly',
    startMonth: '2023-01', // Default start
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    ...overrides,
  });

  it('should calculate basic projection correctly', () => {
    const rules: BudgetRule[] = [
      createRule({ amount: 5000, type: 'income' }),
      createRule({ amount: 1500, type: 'expense' }),
    ];

    // 5000 - 1500 = 3500 net
    // 1000 + (3500 * 12) = 43000
    const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 12, '2023-01');
    
    expect(result.monthlyNet).toBe(3500);
    expect(result.projectedBalance).toBe(43000);
  });

  it('should handle split rules (versioning)', () => {
    // Scenario: Salary increases in July
    // Jan-Jun: 5000 (6 months)
    // Jul-Dec: 6000 (6 months)
    const rules: BudgetRule[] = [
      createRule({ 
        amount: 5000, 
        startMonth: '2023-01', 
        endMonth: '2023-06' 
      }),
      createRule({ 
        amount: 6000, 
        startMonth: '2023-07' 
        // endMonth null (forever)
      }),
    ];

    // Calculation:
    // Jan-Jun: 1000 + (5000 * 6) = 31000
    // Jul-Dec: 31000 + (6000 * 6) = 67000
    const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 12, '2023-01');

    expect(result.projectedBalance).toBe(67000);
  });

  it('should handle future start dates', () => {
    // Rule starts in month 4 (April)
    const rules: BudgetRule[] = [
      createRule({ 
        amount: 1000, 
        startMonth: '2023-04' 
      }),
    ];

    // Jan, Feb, Mar: 0 income
    // Apr-Dec: 1000 * 9 = 9000
    // Starting balance 1000
    // Total: 10000
    const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 12, '2023-01');

    expect(result.projectedBalance).toBe(10000);
  });

  it('should handle past end dates', () => {
    // Rule ended in Dec 2022
    const rules: BudgetRule[] = [
      createRule({ 
        amount: 1000, 
        startMonth: '2022-01',
        endMonth: '2022-12'
      }),
    ];

    // Should have 0 impact on 2023 projection
    const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 12, '2023-01');

    expect(result.projectedBalance).toBe(1000);
    expect(result.monthlyIncome).toBe(0);
  });

  it('should correctly aggregate active rules for a specific month', () => {
    // Overlapping rules
    // Rule A: Jan-Dec (100)
    // Rule B: Mar-Apr (200)
    const rules: BudgetRule[] = [
      createRule({ amount: 100, startMonth: '2023-01' }),
      createRule({ amount: 200, startMonth: '2023-03', endMonth: '2023-04' }),
    ];

    // Jan: 100
    // Feb: 100
    // Mar: 300
    // Apr: 300
    // May-Dec: 100 * 8 = 800
    // Total income: 100 + 100 + 300 + 300 + 800 = 1600
    // + Starting balance 1000 = 2600
    const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 12, '2023-01');

    expect(result.projectedBalance).toBe(2600);
  });

  it('should calculate from a future start month correctly', () => {
     // If we start projection from future (e.g. June), passed rules shouldn't matter
     const rules: BudgetRule[] = [
        createRule({ amount: 1000, startMonth: '2023-01', endMonth: '2023-05' }), // Ended before June
        createRule({ amount: 2000, startMonth: '2023-06' }), // Active from June
     ];

     // Start projection at 2023-06 for 6 months
     // Should see 2000 * 6 = 12000 income
     // Adjusted Result assumes account balance is AS IS provided (1000)
     // Total: 13000
     const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 6, '2023-06');

     expect(result.projectedBalance).toBe(13000);
     expect(result.monthlyIncome).toBe(2000);
  });

  it('uses calendar-accurate weekly and bi-weekly occurrences', () => {
    const rules: BudgetRule[] = [
      createRule({
        amount: 100,
        type: 'income',
        frequency: 'weekly',
        startDate: '2026-01-15',
        startMonth: '2026-01',
      }),
      createRule({
        amount: 50,
        type: 'expense',
        frequency: 'bi-weekly',
        startDate: '2026-01-03',
        startMonth: '2026-01',
      }),
    ];

    const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 1, '2026-02');

    // Feb 2026: weekly 4 occurrences (400 income), bi-weekly 2 occurrences (100 expense)
    expect(result.monthlyIncome).toBe(400);
    expect(result.monthlyExpenses).toBe(100);
    expect(result.projectedBalance).toBe(1300); // 1000 + 300
  });

  it('applies non-recurring rules only in the start month', () => {
    const rules: BudgetRule[] = [
      createRule({
        amount: 500,
        type: 'income',
        isRecurring: false,
        frequency: undefined,
        startMonth: '2026-03',
        startDate: undefined,
      }),
    ];

    const result = ProjectionEngine.calculateAccountProjection(baseAccount, rules, 2, '2026-02');

    // Feb: 0, Mar: 500
    expect(result.monthlyIncome).toBe(0);
    expect(result.projectedBalance).toBe(1500);
  });
});
