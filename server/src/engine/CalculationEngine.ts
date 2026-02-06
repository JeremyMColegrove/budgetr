// ============================================================================
// CALCULATION ENGINE
// ============================================================================
// Core calculation utilities used by other engine classes

import type { BudgetRule } from '../types/index.js';

// ----------------------------------------------------------------------------
// CalculationEngine Class
// ----------------------------------------------------------------------------

export class CalculationEngine {
  // Frequency multipliers for monthly normalization
  private static readonly FREQUENCY_MULTIPLIERS: Record<string, number> = {
    weekly: 4.33,
    'bi-weekly': 2.17,
    monthly: 1,
    yearly: 1 / 12,
  };

  /**
   * Normalize a rule amount to its monthly equivalent based on frequency
   */
  static normalizeToMonthly(rule: BudgetRule): number {
    if (!rule.isRecurring || !rule.frequency) {
      return rule.amount;
    }
    
    const multiplier = this.FREQUENCY_MULTIPLIERS[rule.frequency] || 1;
    return rule.amount * multiplier;
  }

  /**
   * Calculate monthly net (income - expenses) for a set of rules
   */
  static calculateMonthlyNet(rules: BudgetRule[]): number {
    const income = rules
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const expenses = rules
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

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
