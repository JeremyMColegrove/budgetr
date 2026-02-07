import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DbModule = typeof import('../database/db.js');

describe('BudgetEngine account balances with ledger actuals', () => {
  let db: DbModule['db'];
  let initializeDatabase: DbModule['initializeDatabase'];
  let BudgetEngine: typeof import('./BudgetEngine.js').BudgetEngine;

  const timestamp = new Date('2026-01-01T00:00:00.000Z').toISOString();

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

    vi.resetModules();
    process.env.DB_PATH = ':memory:';

    const dbModule = await import('../database/db.js');
    db = dbModule.db;
    initializeDatabase = dbModule.initializeDatabase;
    initializeDatabase();

    ({ BudgetEngine } = await import('./BudgetEngine.js'));

    // Users + profiles
    db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run('user-1', timestamp);
    db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run('user-2', timestamp);

    db.prepare(
      'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run('profile-1', 'user-1', 'Primary', timestamp, timestamp);

    db.prepare(
      'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run('profile-2', 'user-2', 'Other', timestamp, timestamp);

    // Accounts
    db.prepare(
      'INSERT INTO accounts (id, user_id, profile_id, name, type, starting_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('acc-check', 'user-1', 'profile-1', 'Checking', 'checking', 1000, timestamp);

    db.prepare(
      'INSERT INTO accounts (id, user_id, profile_id, name, type, starting_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('acc-save', 'user-1', 'profile-1', 'Savings', 'savings', 500, timestamp);

    db.prepare(
      'INSERT INTO accounts (id, user_id, profile_id, name, type, starting_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('acc-loan', 'user-1', 'profile-1', 'Loan', 'loan', -2000, timestamp);

    // Rules (profile-1)
    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, account_id, to_account_id,
        category, category_kind, notes, is_recurring, frequency, start_date, start_month,
        end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-transfer',
      'user-1',
      'profile-1',
      'Checking to Savings',
      200,
      'expense',
      'acc-check',
      'acc-save',
      'Savings',
      'spending',
      '',
      1,
      'monthly',
      '2026-01-01',
      '2026-01',
      null,
      0,
      timestamp,
      timestamp
    );

    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, account_id, to_account_id,
        category, category_kind, notes, is_recurring, frequency, start_date, start_month,
        end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-loan',
      'user-1',
      'profile-1',
      'Loan Payment',
      300,
      'expense',
      'acc-check',
      'acc-loan',
      'Debt',
      'bill',
      '',
      1,
      'monthly',
      '2026-01-01',
      '2026-01',
      null,
      0,
      timestamp,
      timestamp
    );

    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, account_id, to_account_id,
        category, category_kind, notes, is_recurring, frequency, start_date, start_month,
        end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-income',
      'user-1',
      'profile-1',
      'Paycheck',
      400,
      'income',
      'acc-check',
      null,
      'Salary',
      'spending',
      '',
      1,
      'monthly',
      '2026-01-01',
      '2026-01',
      null,
      0,
      timestamp,
      timestamp
    );

    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, account_id, to_account_id,
        category, category_kind, notes, is_recurring, frequency, start_date, start_month,
        end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-spend',
      'user-1',
      'profile-1',
      'Spending',
      100,
      'expense',
      'acc-check',
      null,
      'Groceries',
      'spending',
      '',
      1,
      'monthly',
      '2026-01-01',
      '2026-01',
      null,
      0,
      timestamp,
      timestamp
    );

    // Rules (profile-2) to ensure cross-profile ledger is ignored
    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, account_id, to_account_id,
        category, category_kind, notes, is_recurring, frequency, start_date, start_month,
        end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-other',
      'user-2',
      'profile-2',
      'Other Rule',
      999,
      'expense',
      null,
      null,
      'Other',
      'spending',
      '',
      1,
      'monthly',
      '2026-01-01',
      '2026-01',
      null,
      0,
      timestamp,
      timestamp
    );

    // Ledger entries (profile-1)
    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-1', 'user-1', 'profile-1', '2026-01', 'rule-transfer', 150, '2026-01-05', '', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-2', 'user-1', 'profile-1', '2026-02', 'rule-transfer', 50, '2026-02-05', '', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-3', 'user-1', 'profile-1', '2026-01', 'rule-loan', 300, '2026-01-10', '', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-4', 'user-1', 'profile-1', '2026-02', 'rule-loan', 300, '2026-02-10', '', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-5', 'user-1', 'profile-1', '2026-01', 'rule-income', 400, '2026-01-15', '', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-6', 'user-1', 'profile-1', '2026-02', 'rule-income', 400, '2026-02-15', '', timestamp);

    // Future entry should be ignored by current balances
    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-future', 'user-1', 'profile-1', '2026-03', 'rule-transfer', 999, '2026-03-01', '', timestamp);

    // Cross-profile rule for same profile should be ignored by join
    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-other', 'user-1', 'profile-1', '2026-02', 'rule-other', 999, '2026-02-20', '', timestamp);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes current balances using ledger entries through current month', () => {
    const engine = BudgetEngine.forProfile('profile-1');
    const data = engine.getAccountsWithProjections(1);

    const checking = data.accounts.find((a) => a.account.id === 'acc-check');
    const savings = data.accounts.find((a) => a.account.id === 'acc-save');
    const loan = data.accounts.find((a) => a.account.id === 'acc-loan');

    expect(checking?.projection.startingBalance).toBe(1000);
    expect(savings?.projection.startingBalance).toBe(700);
    expect(loan?.projection.startingBalance).toBe(-1400);
  });

  it('excludes future ledger entries from current balances', () => {
    const engine = BudgetEngine.forProfile('profile-1');
    const data = engine.getAccountsWithProjections(1);
    const savings = data.accounts.find((a) => a.account.id === 'acc-save');

    expect(savings?.projection.startingBalance).toBe(700);
  });

  it('ignores ledger entries whose rules belong to other profiles', () => {
    const engine = BudgetEngine.forProfile('profile-1');
    const data = engine.getAccountsWithProjections(1);
    const checking = data.accounts.find((a) => a.account.id === 'acc-check');

    expect(checking?.projection.startingBalance).toBe(1000);
  });

  it('derives net worth analysis from current balances', () => {
    const engine = BudgetEngine.forProfile('profile-1');
    const data = engine.getAccountsWithProjections(1);

    expect(data.netWorthAnalysis.currentAssets).toBe(1700);
    expect(data.netWorthAnalysis.currentLiabilities).toBe(-1400);
    expect(data.netWorthAnalysis.currentNetWorth).toBe(300);
  });

  it('projects forward from computed current balance', () => {
    const engine = BudgetEngine.forProfile('profile-1');
    const data = engine.getAccountsWithProjections(1);
    const checking = data.accounts.find((a) => a.account.id === 'acc-check');

    // Monthly net: income 400 - expenses (transfer 200 + loan 300 + spend 100) = -200
    expect(checking?.projection.monthlyNet).toBe(-200);
    expect(checking?.projection.projectedBalance).toBe(800);
  });

  it('falls back to account starting balance when no ledger rows exist', () => {
    const engine = BudgetEngine.forProfile('profile-1');

    db.prepare('DELETE FROM ledger_entries WHERE profile_id = ?').run('profile-1');

    const data = engine.getAccountsWithProjections(1);
    const checking = data.accounts.find((a) => a.account.id === 'acc-check');
    const savings = data.accounts.find((a) => a.account.id === 'acc-save');
    const loan = data.accounts.find((a) => a.account.id === 'acc-loan');

    expect(checking?.projection.startingBalance).toBe(1000);
    expect(savings?.projection.startingBalance).toBe(500);
    expect(loan?.projection.startingBalance).toBe(-2000);
  });
});
