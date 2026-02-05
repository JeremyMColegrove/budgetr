// ============================================================================
// ENGINE TYPE DEFINITIONS (Frontend)
// ============================================================================
// Mirrors backend engine types for API responses

import type { Account, BudgetRule } from './budget';

// ----------------------------------------------------------------------------
// Projection Types
// ----------------------------------------------------------------------------

/** Result of a projection calculation for a single account */
export interface ProjectionResult {
  accountId: string;
  startingBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  projectedBalance: number;
  months: number;
}

/** Account data with its projection result */
export interface AccountWithProjection {
  account: Account;
  projection: ProjectionResult;
}

// ----------------------------------------------------------------------------
// Summary Types
// ----------------------------------------------------------------------------

/** Summary of budget rules (income/expenses) */
export interface RuleSummary {
  totalIncome: number;
  totalExpenses: number;
  amountLeftToAllocate: number;
  incomeRules: BudgetRule[];
  expenseRules: BudgetRule[];
}

/** Net worth analysis with current and projected values */
export interface NetWorthAnalysis {
  // Current values
  currentNetWorth: number;
  currentAssets: number;
  currentLiabilities: number;
  
  // Projected values
  projectedNetWorth: number;
  projectedAssets: number;
  projectedLiabilities: number;
  
  // Metadata
  projectionMonths: number;
}

/** Complete profile summary with all calculated values */
export interface ProfileSummary {
  profileId: string;
  profileName: string;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  amountLeftToAllocate: number;
  accountCount: number;
  ruleCount: number;
}

/** Accounts with projections response */
export interface AccountsWithProjectionsResponse {
  accounts: AccountWithProjection[];
  netWorthAnalysis: NetWorthAnalysis;
  budgetId: string;
  budgetName: string;
}
