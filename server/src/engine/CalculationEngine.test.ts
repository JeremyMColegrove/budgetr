import { describe, expect, it } from 'vitest';
import type { BudgetRule } from '../types/index.js';
import { CalculationEngine } from './CalculationEngine.js';

const baseRule: BudgetRule = {
  id: 'rule-1',
  label: 'Test',
  amount: 100,
  type: 'expense',
  accountId: 'acc-1',
  category: 'Test',
  notes: '',
  isRecurring: true,
  frequency: 'weekly',
  startDate: '2026-01-15',
  startMonth: '2026-01',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('CalculationEngine.plannedAmountForMonth', () => {
  it('calculates weekly occurrences for 28/30/31-day months', () => {
    const rule = { ...baseRule, amount: 100, frequency: 'weekly' as const };

    // Anchored 2026-01-15
    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-02')).toBe(400); // 4 occurrences
    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-04')).toBe(500); // 5 occurrences
    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-05')).toBe(400); // 4 occurrences
  });

  it('calculates bi-weekly with 3 occurrences in a month', () => {
    const rule = {
      ...baseRule,
      amount: 50,
      frequency: 'bi-weekly' as const,
      startDate: '2026-01-03',
      startMonth: '2026-01',
    };

    // 2026-01 has 3 occurrences: 01-03, 01-17, 01-31
    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-01')).toBe(150);
  });

  it('applies non-recurring rules only in the start month', () => {
    const rule = {
      ...baseRule,
      amount: 250,
      isRecurring: false,
      frequency: undefined,
      startDate: undefined,
      startMonth: '2026-02',
    };

    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-02')).toBe(250);
    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-03')).toBe(0);
  });

  it('applies yearly rules only in the anchor month', () => {
    const rule = {
      ...baseRule,
      amount: 1200,
      frequency: 'yearly' as const,
      startDate: '2026-04-10',
      startMonth: '2026-04',
    };

    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-04')).toBe(1200);
    expect(CalculationEngine.plannedAmountForMonth(rule, '2026-05')).toBe(0);
  });
});
