// ============================================================================
// PROJECTION ENGINE
// ============================================================================
// Handles all projection calculations for accounts

import type { ProjectionResult } from '../types/engine.js';
import type { Account, BudgetRule } from '../types/index.js';
import { ASSET_ACCOUNT_TYPES } from '../types/index.js';
import { getCurrentMonth, getNextMonth } from '../utils/date-utils.js';
import { CalculationEngine } from './CalculationEngine.js';

// ----------------------------------------------------------------------------
// ProjectionEngine Class
// ----------------------------------------------------------------------------

export class ProjectionEngine {
  /**
   * Calculate monthly income for a specific account from budget rules
   * identifying which rules are active in the target month
   */
  private static getMonthlyIncomeForAccount(
    accountId: string,
    rules: BudgetRule[],
    targetMonth: string
  ): number {
    // Direct income to this account
    const directIncome = rules
      .filter((r) => 
        r.accountId === accountId && 
        r.type === 'income' &&
        ProjectionEngine.isRuleActiveInMonth(r, targetMonth)
      )
      .reduce((sum, r) => sum + CalculationEngine.plannedAmountForMonth(r, targetMonth), 0);

    // Debt paydown: expenses with toAccountId reduce liability (treated as "income" for the loan)
    const debtPaydown = rules
      .filter((r) => 
        r.toAccountId === accountId && 
        r.type === 'expense' &&
        ProjectionEngine.isRuleActiveInMonth(r, targetMonth)
      )
      .reduce((sum, r) => sum + CalculationEngine.plannedAmountForMonth(r, targetMonth), 0);

    return directIncome + debtPaydown;
  }

  /**
   * Calculate monthly expenses for a specific account from budget rules
   * identifying which rules are active in the target month
   */
  private static getMonthlyExpensesForAccount(
    accountId: string,
    rules: BudgetRule[],
    targetMonth: string
  ): number {
    return rules
      .filter((r) => 
        r.accountId === accountId && 
        r.type === 'expense' &&
        ProjectionEngine.isRuleActiveInMonth(r, targetMonth)
      )
      .reduce((sum, r) => sum + CalculationEngine.plannedAmountForMonth(r, targetMonth), 0);
  }

  /**
   * Check if a rule is active in a specific month
   */
  private static isRuleActiveInMonth(rule: BudgetRule, month: string): boolean {
    // Start month check: rule must start on or before this month
    if (rule.startMonth > month) {
      return false;
    }

    // End month check: if rule has end month, it must be on or after this month
    // Note: If endMonth is null/undefined, it means "forever"
    if (rule.endMonth && rule.endMonth < month) {
      return false;
    }

    return true;
  }

  /**
   * Calculate the projected balance for an account over X months
   * 
   * Liabilities are stored as NEGATIVE values, so all math works naturally:
   * - Assets: positive balance + income - expenses
   * - Liabilities: negative balance + payments (which are treated as income)
   * 
   * REFRACTORED for Versioning:
   * Iterate month by month to account for rules starting/ending at different times.
   */
  static calculateAccountProjection(
    account: Account,
    rules: BudgetRule[],
    months: number,
    startMonth: string = getCurrentMonth()
  ): ProjectionResult {
    // Calculate "current" monthly stats for the starting month (snapshot for UI)
    const currentMonthlyIncome = this.getMonthlyIncomeForAccount(account.id, rules, startMonth);
    const currentMonthlyExpenses = this.getMonthlyExpensesForAccount(account.id, rules, startMonth);
    const currentMonthlyNet = currentMonthlyIncome - currentMonthlyExpenses;

    // Calculate accumulation over time
    let projectedBalance = account.startingBalance;
    let iterMonth = startMonth;

    for (let i = 0; i < months; i++) {
      const monthIncome = this.getMonthlyIncomeForAccount(account.id, rules, iterMonth);
      const monthExpenses = this.getMonthlyExpensesForAccount(account.id, rules, iterMonth);
      const monthNet = monthIncome - monthExpenses;
      
      projectedBalance += monthNet;
      
      // Advance to next month
      iterMonth = getNextMonth(iterMonth);
    }

    return {
      accountId: account.id,
      startingBalance: account.startingBalance,
      monthlyIncome: CalculationEngine.roundCurrency(currentMonthlyIncome),
      monthlyExpenses: CalculationEngine.roundCurrency(currentMonthlyExpenses),
      monthlyNet: CalculationEngine.roundCurrency(currentMonthlyNet),
      projectedBalance: CalculationEngine.roundCurrency(projectedBalance),
      months,
    };
  }

  /**
   * Calculate projected balances for all accounts
   */
  static calculateAllProjections(
    accounts: Account[],
    rules: BudgetRule[],
    months: number,
    startMonth: string = getCurrentMonth()
  ): Map<string, ProjectionResult> {
    const projections = new Map<string, ProjectionResult>();

    for (const account of accounts) {
      projections.set(
        account.id,
        this.calculateAccountProjection(account, rules, months, startMonth)
      );
    }

    return projections;
  }

  /**
   * Calculate projected net worth from projections
   */
  static getProjectedNetWorth(projections: Map<string, ProjectionResult>): number {
    let total = 0;
    for (const projection of projections.values()) {
      total += projection.projectedBalance;
    }
    return total;
  }

  /**
   * Calculate projected assets from projections
   */
  static getProjectedAssets(
    accounts: Account[],
    projections: Map<string, ProjectionResult>
  ): number {
    return accounts
      .filter((a) => ASSET_ACCOUNT_TYPES.includes(a.type))
      .reduce((sum, a) => sum + (projections.get(a.id)?.projectedBalance ?? a.startingBalance), 0);
  }

  /**
   * Calculate projected liabilities from projections
   */
  static getProjectedLiabilities(
    accounts: Account[],
    projections: Map<string, ProjectionResult>
  ): number {
    return accounts
      .filter((a) => !ASSET_ACCOUNT_TYPES.includes(a.type))
      .reduce((sum, a) => sum + (projections.get(a.id)?.projectedBalance ?? a.startingBalance), 0);
  }
}
