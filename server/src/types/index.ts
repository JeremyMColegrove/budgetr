// ============================================================================
// TYPE DEFINITIONS - Shared between frontend and backend
// ============================================================================

export type Frequency = 'weekly' | 'bi-weekly' | 'monthly' | 'yearly';
export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'loan' | 'investment';

// ----------------------------------------------------------------------------
// Domain Models
// ----------------------------------------------------------------------------

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  startingBalance: number;
  createdAt: string;
}

export interface BudgetRule {
  id: string;
  label: string;
  amount: number;
  type: TransactionType;
  accountId?: string;
  toAccountId?: string;
  category: string;
  notes: string;
  isRecurring: boolean;
  frequency?: Frequency;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetProfile {
  id: string;
  name: string;
  accounts: Account[];
  rules: BudgetRule[];
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Database Row Types
// ----------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AccountRow {
  id: string;
  profile_id: string;
  name: string;
  type: AccountType;
  starting_balance: number;
  created_at: string;
}

export interface BudgetRuleRow {
  id: string;
  profile_id: string;
  label: string;
  amount: number;
  type: TransactionType;
  account_id: string | null;
  to_account_id: string | null;
  category: string;
  notes: string;
  is_recurring: number;
  frequency: Frequency | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// API Request/Response Types
// ----------------------------------------------------------------------------

export interface CreateProfileRequest {
  name: string;
}

export interface UpdateProfileRequest {
  name: string;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  startingBalance: number;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: AccountType;
  startingBalance?: number;
}

export interface CreateBudgetRuleRequest {
  label: string;
  amount: number;
  type: TransactionType;
  accountId?: string;
  toAccountId?: string;
  category: string;
  notes: string;
  isRecurring: boolean;
  frequency?: Frequency;
  startDate?: string;
}

export interface UpdateBudgetRuleRequest {
  label?: string;
  amount?: number;
  type?: TransactionType;
  accountId?: string;
  toAccountId?: string;
  category?: string;
  notes?: string;
  isRecurring?: boolean;
  frequency?: Frequency;
  startDate?: string;
}
