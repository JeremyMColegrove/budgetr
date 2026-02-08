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
        id, user_id, profile_id, label, amount, type, category, category_kind, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-bill',
      'user-1',
      'profile-1',
      'Rent',
      1200,
      'expense',
      'Rent',
      'bill',
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
        id, user_id, profile_id, label, amount, type, category, category_kind, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-spend',
      'user-1',
      'profile-1',
      'Groceries',
      75,
      'expense',
      'Groceries',
      'spending',
      '',
      1,
      'bi-weekly',
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
    expect(groceries?.planned).toBe(150);
    expect(groceries?.spent).toBe(75);
    expect(groceries?.remaining).toBe(75);
    expect(groceries?.transactionCount).toBe(2);
  });

  it('marks bills paid when a ledger entry exists', () => {
    const state = getMonthlyState('profile-1', '2026-02', 'user-1');
    const rent = state.bills.find((item) => item.ruleId === 'rule-bill');
    expect(rent?.isPaid).toBe(true);
    expect(rent?.actual).toBe(1200);
  });

  it('keeps fixed vs variable classification per rule even when categories differ', () => {
    const timestamp = new Date('2026-02-01T00:00:00.000Z').toISOString();

    db.prepare(
      'INSERT INTO categories (id, user_id, name, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('cat-3', 'user-1', 'Utilities', 'bill', timestamp, timestamp);

    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, category, category_kind, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-fixed-utilities',
      'user-1',
      'profile-1',
      'Utilities - Fixed',
      90,
      'expense',
      'Utilities',
      'bill',
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
        id, user_id, profile_id, label, amount, type, category, category_kind, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-variable-utilities',
      'user-1',
      'profile-1',
      'Utilities - Variable',
      120,
      'expense',
      'Utilities',
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

    const state = getMonthlyState('profile-1', '2026-02', 'user-1');

    const fixed = state.bills.find((item) => item.ruleId === 'rule-fixed-utilities');
    const variable = state.spending.find((item) => item.ruleId === 'rule-variable-utilities');

    expect(fixed).toBeTruthy();
    expect(variable).toBeTruthy();
  });

  it('sums bill entries and marks paid only when planned is met', () => {
    const timestamp = new Date('2026-02-01T00:00:00.000Z').toISOString();

    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, category, category_kind, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-bill-split',
      'user-1',
      'profile-1',
      'Insurance',
      1000,
      'expense',
      'Insurance',
      'bill',
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
    ).run('led-split-1', 'user-1', 'profile-1', '2026-02', 'rule-bill-split', 400, '2026-02-03', 'Part 1', timestamp);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-split-2', 'user-1', 'profile-1', '2026-02', 'rule-bill-split', 500, '2026-02-10', 'Part 2', timestamp);

    let state = getMonthlyState('profile-1', '2026-02', 'user-1');
    let bill = state.bills.find((item) => item.ruleId === 'rule-bill-split');

    expect(bill?.actual).toBe(900);
    expect(bill?.isPaid).toBe(false);

    db.prepare(
      `INSERT INTO ledger_entries (
        id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('led-split-3', 'user-1', 'profile-1', '2026-02', 'rule-bill-split', 200, '2026-02-20', 'Part 3', timestamp);

    state = getMonthlyState('profile-1', '2026-02', 'user-1');
    bill = state.bills.find((item) => item.ruleId === 'rule-bill-split');

    expect(bill?.actual).toBe(1100);
    expect(bill?.isPaid).toBe(true);
  });
});
