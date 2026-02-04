// ============================================================================
// PROJECTION UTILITIES
// ============================================================================
// Clean, separated logic for calculating projected account balances.
// Formula: Starting Balance + (Monthly Income - Monthly Expenses) * Months
// ============================================================================

import { getMonthlyNormalizedAmount } from '@/store/budget-store';
import type { Account, BudgetRule } from '@/types/budget';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface ProjectionResult {
  startingBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  projectedBalance: number;
  months: number;
}

// ----------------------------------------------------------------------------
// Projection Functions
// ----------------------------------------------------------------------------

/**
 * Calculates the monthly income for a specific account from budget rules.
 * Includes:
 * - Rules where accountId matches and type is 'income' (direct deposits)
 * - Rules where toAccountId matches and type is 'expense' (debt paydown reduces liability)
 */
export function getMonthlyIncomeForAccount(
  accountId: string,
  rules: BudgetRule[]
): number {
  // Direct income to this account
  const directIncome = rules
    .filter((r) => r.accountId === accountId && r.type === 'income')
    .reduce((sum, r) => sum + getMonthlyNormalizedAmount(r), 0);

  // Debt paydown: expenses with toAccountId reduce liability (treated as "income" for the loan)
  const debtPaydown = rules
    .filter((r) => r.toAccountId === accountId && r.type === 'expense')
    .reduce((sum, r) => sum + getMonthlyNormalizedAmount(r), 0);

  return directIncome + debtPaydown;
}

/**
 * Calculates the monthly expenses for a specific account from budget rules.
 * Only includes rules where the accountId matches and type is 'expense'.
 */
export function getMonthlyExpensesForAccount(
  accountId: string,
  rules: BudgetRule[]
): number {
  return rules
    .filter((r) => r.accountId === accountId && r.type === 'expense')
    .reduce((sum, r) => sum + getMonthlyNormalizedAmount(r), 0);
}

/**
 * Calculates the projected balance for an account over X months.
 * 
 * Liabilities are stored as NEGATIVE values, so all math works naturally:
 * - Assets: positive balance + income - expenses
 * - Liabilities: negative balance + payments (which are treated as income)
 * 
 * @param account - The account to calculate projections for
 * @param rules - All budget rules for the profile
 * @param months - Number of months to project forward
 * @returns A ProjectionResult object with all intermediate values
 */
export function calculateProjectedBalance(
  account: Account,
  rules: BudgetRule[],
  months: number
): ProjectionResult {
  const monthlyIncome = getMonthlyIncomeForAccount(account.id, rules);
  const monthlyExpenses = getMonthlyExpensesForAccount(account.id, rules);
  const monthlyNet = monthlyIncome - monthlyExpenses;
  const projectedBalance = account.startingBalance + (monthlyNet * months);

  return {
    startingBalance: account.startingBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    projectedBalance,
    months,
  };
}

/**
 * Calculates projected balances for all accounts.
 * 
 * @param accounts - All accounts in the profile
 * @param rules - All budget rules for the profile
 * @param months - Number of months to project forward
 * @returns A Map of accountId to ProjectionResult
 */
export function calculateAllProjections(
  accounts: Account[],
  rules: BudgetRule[],
  months: number
): Map<string, ProjectionResult> {
  const projections = new Map<string, ProjectionResult>();
  
  for (const account of accounts) {
    projections.set(account.id, calculateProjectedBalance(account, rules, months));
  }
  
  return projections;
}
