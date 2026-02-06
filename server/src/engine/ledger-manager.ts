// ============================================================================
// LEDGER MANAGER
// ============================================================================
// Handles bill payments and variable spending entries.

import { db, generateId, now } from '../database/db.js';

export function markBillPaid(
  userId: string,
  profileId: string,
  ruleId: string,
  monthIso: string,
  amount?: number,
  date?: string,
  notes?: string
) {
  const rule = db.prepare(
    `SELECT id, amount FROM budget_rules WHERE id = ? AND profile_id = ? AND user_id = ?`
  ).get(ruleId, profileId, userId) as { id: string; amount: number } | undefined;

  if (!rule) {
    throw new Error('Rule not found');
  }

  const entryAmount = typeof amount === 'number' ? amount : rule.amount;
  const entryDate = date ?? `${monthIso}-01`;
  const entryNotes = notes ?? 'Bill paid';
  const timestamp = now();

  const existing = db.prepare(
    `SELECT id FROM ledger_entries WHERE rule_id = ? AND month_iso = ? AND profile_id = ? AND user_id = ?`
  ).get(ruleId, monthIso, profileId, userId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE ledger_entries SET amount = ?, date = ?, notes = ?, created_at = ? WHERE id = ?`
    ).run(entryAmount, entryDate, entryNotes, timestamp, existing.id);

    return { id: existing.id, ruleId, monthIso, amount: entryAmount, date: entryDate, notes: entryNotes };
  }

  const id = generateId();
  db.prepare(
    `INSERT INTO ledger_entries (id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, profileId, monthIso, ruleId, entryAmount, entryDate, entryNotes, timestamp);

  return { id, ruleId, monthIso, amount: entryAmount, date: entryDate, notes: entryNotes };
}

export function addTransaction(
  userId: string,
  profileId: string,
  ruleId: string,
  monthIso: string,
  amount: number,
  date: string,
  notes?: string
) {
  const rule = db.prepare(
    `SELECT id FROM budget_rules WHERE id = ? AND profile_id = ? AND user_id = ?`
  ).get(ruleId, profileId, userId) as { id: string } | undefined;

  if (!rule) {
    throw new Error('Rule not found');
  }

  const id = generateId();
  const timestamp = now();
  db.prepare(
    `INSERT INTO ledger_entries (id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, profileId, monthIso, ruleId, amount, date, notes ?? '', timestamp);

  return { id, ruleId, monthIso, amount, date, notes: notes ?? '' };
}
