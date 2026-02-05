// ============================================================================
// TYPE DEFINITIONS - Shared between frontend and backend
// ============================================================================

export type Frequency = 'weekly' | 'bi-weekly' | 'monthly' | 'yearly';
export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'loan' | 'investment';

/** Account types that are considered assets (positive contribution to net worth) */
export const ASSET_ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'investment'];

/** Account types that are considered liabilities (negative contribution to net worth) */
export const LIABILITY_ACCOUNT_TYPES: AccountType[] = ['credit_card', 'loan'];

// ----------------------------------------------------------------------------
// Domain Models
// ----------------------------------------------------------------------------

export interface User {
  id: string;
  createdAt: string;
}

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

export interface UserRow {
  id: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AccountRow {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  type: AccountType;
  starting_balance: number;
  created_at: string;
}

export interface BudgetRuleRow {
  id: string;
  user_id: string;
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

// Authentication
export interface RegisterResponse {
  accessKey: string;
}

export interface LoginRequest {
  accessKey: string;
}

export interface LoginResponse {
  success: boolean;
}

// Profiles
export interface CreateProfileRequest {
  name: string;
}

export interface UpdateProfileRequest {
  name: string;
}

// Accounts
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

// Budget Rules
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
