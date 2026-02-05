// ============================================================================
// PROJECTION ENGINE
// ============================================================================
// Handles all projection calculations for accounts

import type { ProjectionResult } from '../types/engine.js';
import type { Account, BudgetRule } from '../types/index.js';
import { ASSET_ACCOUNT_TYPES } from '../types/index.js';
import { CalculationEngine } from './CalculationEngine.js';

// ----------------------------------------------------------------------------
// ProjectionEngine Class
// ----------------------------------------------------------------------------

export class ProjectionEngine {
  /**
   * Calculate monthly income for a specific account from budget rules
   * Includes:
   * - Rules where accountId matches and type is 'income' (direct deposits)
   * - Rules where toAccountId matches and type is 'expense' (debt paydown reduces liability)
   */
  private static getMonthlyIncomeForAccount(
    accountId: string,
    rules: BudgetRule[]
  ): number {
    // Direct income to this account
    const directIncome = rules
      .filter((r) => r.accountId === accountId && r.type === 'income')
      .reduce((sum, r) => sum + CalculationEngine.normalizeToMonthly(r), 0);

    // Debt paydown: expenses with toAccountId reduce liability (treated as "income" for the loan)
    const debtPaydown = rules
      .filter((r) => r.toAccountId === accountId && r.type === 'expense')
      .reduce((sum, r) => sum + CalculationEngine.normalizeToMonthly(r), 0);

    return directIncome + debtPaydown;
  }

  /**
   * Calculate monthly expenses for a specific account from budget rules
   * Only includes rules where the accountId matches and type is 'expense'
   */
  private static getMonthlyExpensesForAccount(
    accountId: string,
    rules: BudgetRule[]
  ): number {
    return rules
      .filter((r) => r.accountId === accountId && r.type === 'expense')
      .reduce((sum, r) => sum + CalculationEngine.normalizeToMonthly(r), 0);
  }

  /**
   * Calculate the projected balance for an account over X months
   * 
   * Liabilities are stored as NEGATIVE values, so all math works naturally:
   * - Assets: positive balance + income - expenses
   * - Liabilities: negative balance + payments (which are treated as income)
   */
  static calculateAccountProjection(
    account: Account,
    rules: BudgetRule[],
    months: number
  ): ProjectionResult {
    const monthlyIncome = this.getMonthlyIncomeForAccount(account.id, rules);
    const monthlyExpenses = this.getMonthlyExpensesForAccount(account.id, rules);
    const monthlyNet = monthlyIncome - monthlyExpenses;
    const projectedBalance = CalculationEngine.applyProjection(
      account.startingBalance,
      monthlyNet,
      months
    );

    return {
      accountId: account.id,
      startingBalance: account.startingBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet,
      projectedBalance,
      months,
    };
  }

  /**
   * Calculate projected balances for all accounts
   */
  static calculateAllProjections(
    accounts: Account[],
    rules: BudgetRule[],
    months: number
  ): Map<string, ProjectionResult> {
    const projections = new Map<string, ProjectionResult>();

    for (const account of accounts) {
      projections.set(
        account.id,
        this.calculateAccountProjection(account, rules, months)
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
