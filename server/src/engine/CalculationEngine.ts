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
   * Calculate a calendar-accurate planned amount for a specific month.
   * Uses startDate if present; otherwise uses startMonth + '-01' as anchor.
   */
  static plannedAmountForMonth(rule: BudgetRule, monthIso: string): number {
    if (!rule.isRecurring || !rule.frequency) {
      return rule.amount;
    }

    const anchorDate = rule.startDate ?? `${rule.startMonth}-01`;
    const [yearStr, monthStr] = monthIso.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return rule.amount;
    }

    if (rule.frequency === 'monthly') {
      return rule.amount;
    }

    if (rule.frequency === 'yearly') {
      const anchorMonth = Number(anchorDate.slice(5, 7));
      return anchorMonth === month ? rule.amount : 0;
    }

    const intervalDays = rule.frequency === 'weekly' ? 7 : 14;
    const occurrences = this.countOccurrencesInMonth(anchorDate, year, month, intervalDays);
    return rule.amount * occurrences;
  }

  private static countOccurrencesInMonth(
    anchorDateIso: string,
    year: number,
    month: number,
    intervalDays: number
  ): number {
    const [aYear, aMonth, aDay] = anchorDateIso.split('-').map(Number);
    if (!Number.isFinite(aYear) || !Number.isFinite(aMonth) || !Number.isFinite(aDay)) {
      return 0;
    }

    const toDayNumber = (y: number, m: number, d: number) =>
      Math.floor(Date.UTC(y, m - 1, d) / 86400000);

    const startDay = toDayNumber(aYear, aMonth, aDay);
    const monthStart = toDayNumber(year, month, 1);
    const monthEnd = toDayNumber(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());

    if (startDay > monthEnd) return 0;

    const diff = monthStart - startDay;
    const offset = diff <= 0 ? 0 : Math.ceil(diff / intervalDays);
    const firstOccurrence = startDay + offset * intervalDays;

    if (firstOccurrence > monthEnd) return 0;

    return Math.floor((monthEnd - firstOccurrence) / intervalDays) + 1;
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
