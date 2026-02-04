// ============================================================================
// BUDGET BLUEPRINT - TYPE DEFINITIONS
// ============================================================================
// Future-proof data model distinguishing between:
// - BudgetRule: The PLAN (what we're building now)
// - Transaction: The EXECUTION (for future implementation)
// ============================================================================

// ----------------------------------------------------------------------------
// Enums & Literal Types
// ----------------------------------------------------------------------------

/** Frequency options for recurring rules */
export type Frequency = 'weekly' | 'bi-weekly' | 'monthly' | 'yearly';

/** Transaction direction */
export type TransactionType = 'income' | 'expense';

// ----------------------------------------------------------------------------
// Account Model
// ----------------------------------------------------------------------------

/** Account type options */
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'loan' | 'investment';

/** Account type labels for display */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  loan: 'Loan',
  investment: 'Investment',
};

/** Account types that are considered assets (positive contribution to net worth) */
export const ASSET_ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'investment'];

/** Account types that are considered liabilities (negative contribution to net worth) */
export const LIABILITY_ACCOUNT_TYPES: AccountType[] = ['credit_card', 'loan'];

/** Represents a financial account */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  startingBalance: number;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Budget Rule - THE PLAN (current implementation)
// ----------------------------------------------------------------------------

/** 
 * A Budget Rule defines a planned income or expense.
 * This is the template that will be instantiated into actual Transactions.
 */
export interface BudgetRule {
  id: string;
  label: string;
  amount: number;
  type: TransactionType;
  accountId?: string; // Primary account: funding source (expense) or destination (income)
  toAccountId?: string; // Secondary account: e.g., loan account being paid down
  category: string;
  notes: string;
  isRecurring: boolean;
  frequency?: Frequency;
  startDate?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Transaction - THE EXECUTION (future implementation)
// ----------------------------------------------------------------------------

/**
 * Transaction interface will be defined here in the future.
 */


// ----------------------------------------------------------------------------
// Budget Profile - Container for Rules
// ----------------------------------------------------------------------------

/** 
 * A Budget Profile is a complete budget blueprint.
 * Users can have multiple profiles (e.g., "Conservative", "Aggressive").
 */
export interface BudgetProfile {
  id: string;
  name: string;
  accounts: Account[];
  rules: BudgetRule[];
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Default Categories
// ----------------------------------------------------------------------------

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Rental Income',
  'Side Hustle',
  'Other Income',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Groceries',
  'Transportation',
  'Insurance',
  'Healthcare',
  'Debt Payments',
  'Savings',
  'Entertainment',
  'Dining Out',
  'Shopping',
  'Subscriptions',
  'Personal Care',
  'Education',
  'Gifts',
  'Travel',
  'Other Expenses',
] as const;

// ----------------------------------------------------------------------------
// Helper Types
// ----------------------------------------------------------------------------

/** Form data for creating/editing a rule */
export type BudgetRuleFormData = Omit<BudgetRule, 'id' | 'createdAt' | 'updatedAt'>;

/** Partial update for a rule */
export type BudgetRuleUpdate = Partial<Omit<BudgetRule, 'id' | 'createdAt'>>;

/** Form data for creating/editing an account */
export type AccountFormData = Omit<Account, 'id' | 'createdAt'>;
