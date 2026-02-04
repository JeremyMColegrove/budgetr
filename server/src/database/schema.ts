// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const SCHEMA = `
-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit_card', 'loan', 'investment')),
  starting_balance REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Budget rules table
CREATE TABLE IF NOT EXISTS budget_rules (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  account_id TEXT,
  to_account_id TEXT,
  category TEXT NOT NULL,
  notes TEXT NOT NULL,
  is_recurring INTEGER NOT NULL CHECK(is_recurring IN (0, 1)),
  frequency TEXT CHECK(frequency IN ('weekly', 'bi-weekly', 'monthly', 'yearly')),
  start_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accounts_profile_id ON accounts(profile_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_profile_id ON budget_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_account_id ON budget_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_to_account_id ON budget_rules(to_account_id);
`;
