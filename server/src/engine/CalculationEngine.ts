// ============================================================================
// CALCULATION ENGINE
// ============================================================================
// Core calculation utilities used by other engine classes

import type { BudgetRule, Frequency } from '../types/index.js';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

/** Monthly multipliers for frequency normalization */
const FREQUENCY_TO_MONTHLY: Record<Frequency, number> = {
  weekly: 4.33,
  'bi-weekly': 2.17,
  monthly: 1,
  yearly: 1 / 12,
};

// ----------------------------------------------------------------------------
// CalculationEngine Class
// ----------------------------------------------------------------------------

export class CalculationEngine {
  /**
   * Normalize a rule's amount to a monthly value based on its frequency
   */
  static normalizeToMonthly(rule: BudgetRule): number {
    if (!rule.isRecurring || !rule.frequency) {
      return rule.amount; // Non-recurring = one-time, treat as monthly
    }
    return rule.amount * FREQUENCY_TO_MONTHLY[rule.frequency];
  }

  /**
   * Calculate monthly net (income - expenses) for a set of rules
   */
  static calculateMonthlyNet(rules: BudgetRule[]): number {
    const income = rules
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + this.normalizeToMonthly(r), 0);

    const expenses = rules
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + this.normalizeToMonthly(r), 0);

    return income - expenses;
  }

  /**
   * Apply a projection calculation
   * Formula: Starting Balance + (Monthly Net * Months)
   */
  static applyProjection(
    startingBalance: number,
    monthlyNet: number,
    months: number
  ): number {
    return startingBalance + monthlyNet * months;
  }

  /**
   * Format a number as currency (USD)
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Round to 2 decimal places for currency precision
   */
  static roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
