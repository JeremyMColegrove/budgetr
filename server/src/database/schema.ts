// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const SCHEMA = `
-- Users table (Authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit_card', 'loan', 'investment')),
  starting_balance REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Budget rules table (Month-Grain Versioning)
CREATE TABLE IF NOT EXISTS budget_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  account_id TEXT,
  to_account_id TEXT,
  category TEXT NOT NULL,
  notes TEXT NOT NULL,
  is_recurring INTEGER DEFAULT 0,
  frequency TEXT,
  start_date TEXT,
  start_month TEXT NOT NULL,
  end_month TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(start_month <= end_month OR end_month IS NULL),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_profile_id ON accounts(profile_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_user_id ON budget_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_profile_id ON budget_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_account_id ON budget_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_to_account_id ON budget_rules(to_account_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_month_range ON budget_rules(profile_id, start_month, end_month);
`;

