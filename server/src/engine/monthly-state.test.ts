import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbModule = typeof import('../database/db.js');

describe('getMonthlyState', () => {
  let db: DbModule['db'];
  let initializeDatabase: DbModule['initializeDatabase'];
  let getMonthlyState: typeof import('./monthly-state.js').getMonthlyState;

  beforeEach(async () => {
    vi.resetModules();
    process.env.DB_PATH = ':memory:';

    const dbModule = await import('../database/db.js');
    db = dbModule.db;
    initializeDatabase = dbModule.initializeDatabase;
    initializeDatabase();

    ({ getMonthlyState } = await import('./monthly-state.js'));

    const timestamp = new Date('2026-02-01T00:00:00.000Z').toISOString();
    db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run('user-1', timestamp);
    db.prepare(
      'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run('profile-1', 'user-1', 'Test', timestamp, timestamp);

    db.prepare(
      'INSERT INTO categories (id, user_id, name, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('cat-1', 'user-1', 'Rent', 'bill', timestamp, timestamp);
    db.prepare(
      'INSERT INTO categories (id, user_id, name, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('cat-2', 'user-1', 'Groceries', 'spending', timestamp, timestamp);

    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, category, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-bill',
      'user-1',
      'profile-1',
      'Rent',
      1200,
      'expense',
      'Rent',
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
        id, user_id, profile_id, label, amount, type, category, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-spend',
      'user-1',
      'profile-1',
      'Groceries',
      200,
      'expense',
      'Groceries',
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
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-1', 'user-1', 'profile-1', '2026-02', 'rule-spend', 50, '2026-02-03', 'Target', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-2', 'user-1', 'profile-1', '2026-02', 'rule-spend', 25, '2026-02-10', 'Trader Joe', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-3', 'user-1', 'profile-1', '2026-02', 'rule-bill', 1200, '2026-02-01', 'Paid', timestamp);
  });

  it('calculates remaining spending per rule from ledger totals', () => {
    const state = getMonthlyState('profile-1', '2026-02', 'user-1');

    const groceries = state.spending.find((item) => item.ruleId === 'rule-spend');
    expect(groceries).toBeTruthy();
    expect(groceries?.planned).toBe(200);
    expect(groceries?.spent).toBe(75);
    expect(groceries?.remaining).toBe(125);
    expect(groceries?.transactionCount).toBe(2);
  });

  it('marks bills paid when a ledger entry exists', () => {
    const state = getMonthlyState('profile-1', '2026-02', 'user-1');
    const rent = state.bills.find((item) => item.ruleId === 'rule-bill');
    expect(rent?.isPaid).toBe(true);
    expect(rent?.actual).toBe(1200);
  });
});
