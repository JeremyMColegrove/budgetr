import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbModule = typeof import('../database/db.js');

describe('RuleVersioning', () => {
  let db: DbModule['db'];
  let initializeDatabase: DbModule['initializeDatabase'];
  let upsertRule: typeof import('./RuleVersioning.js').upsertRule;

  beforeEach(async () => {
    vi.resetModules();
    process.env.DB_PATH = ':memory:';

    const dbModule = await import('../database/db.js');
    db = dbModule.db;
    initializeDatabase = dbModule.initializeDatabase;
    initializeDatabase();

    ({ upsertRule } = await import('./RuleVersioning.js'));

    const timestamp = new Date('2026-02-01T00:00:00.000Z').toISOString();
    db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run('user-1', timestamp);
    db.prepare(
      'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run('profile-1', 'user-1', 'Test', timestamp, timestamp);

    db.prepare(
      `INSERT INTO budget_rules (
        id, user_id, profile_id, label, amount, type, category, notes,
        is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'rule-1',
      'user-1',
      'profile-1',
      'Internet',
      100,
      'expense',
      'Internet',
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
  });

  it('splits rules correctly without corrupting start_month', () => {
    const updated = upsertRule(
      'rule-1',
      { amount: 120 },
      '2026-02',
      'user-1'
    );

    const rows = db.prepare('SELECT * FROM budget_rules ORDER BY start_month ASC').all() as Array<{ id: string; start_month: string; end_month: string | null; amount: number }>;

    expect(rows.length).toBe(2);
    expect(rows[0].start_month).toBe('2026-01');
    expect(rows[0].end_month).toBe('2026-01');
    expect(rows[1].start_month).toBe('2026-02');
    expect(rows[1].end_month).toBe(null);
    expect(updated.amount).toBe(120);
  });
});
