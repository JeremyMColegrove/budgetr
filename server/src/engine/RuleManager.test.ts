import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbModule = typeof import('../database/db.js');

describe('RuleManager.getMonthSummary', () => {
  let db: DbModule['db'];
  let initializeDatabase: DbModule['initializeDatabase'];
  let RuleManager: typeof import('./RuleManager.js').RuleManager;

  beforeEach(async () => {
    vi.resetModules();
    process.env.DB_PATH = ':memory:';

    const dbModule = await import('../database/db.js');
    db = dbModule.db;
    initializeDatabase = dbModule.initializeDatabase;
    initializeDatabase();

    ({ RuleManager } = await import('./RuleManager.js'));

    const timestamp = new Date('2026-02-01T00:00:00.000Z').toISOString();
    db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run('user-1', timestamp);
    db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run('user-2', timestamp);

    db.prepare(
      'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run('profile-1', 'user-1', 'Primary', timestamp, timestamp);

    db.prepare(
      'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run('profile-2', 'user-2', 'Other', timestamp, timestamp);

    db.prepare(
      'INSERT INTO accounts (id, user_id, profile_id, name, type, starting_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('acc-1', 'user-1', 'profile-1', 'Checking', 'checking', 0, timestamp);

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
      'Salary',
      1000,
      'income',
      'acc-1',
      null,
      'Salary',
      'spending',
      '',
      1,
      'monthly',
      '2026-02-01',
      '2026-02',
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
      'rule-weekly-expense',
      'user-1',
      'profile-1',
      'Weekly Expense',
      100,
      'expense',
      'acc-1',
      null,
      'Groceries',
      'spending',
      '',
      1,
      'weekly',
      '2026-01-15',
      '2026-01',
      null,
      0,
      timestamp,
      timestamp
    );

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-exp', 'user-1', 'profile-1', '2026-02', 'rule-weekly-expense', 200, '2026-02-05', '', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-inc', 'user-1', 'profile-1', '2026-02', 'rule-income', 1000, '2026-02-15', '', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-other', 'user-2', 'profile-2', '2026-02', 'rule-weekly-expense', 999, '2026-02-20', '', timestamp);
  });

  it('computes planned totals using calendar-accurate amounts and sums actual expenses', () => {
    const manager = new RuleManager('profile-1');
    const summary = manager.getMonthSummary('2026-02');

    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalPlannedExpense).toBe(400); // weekly rule has 4 occurrences in Feb 2026
    expect(summary.totalActualExpense).toBe(200); // expense ledger only
  });
});
