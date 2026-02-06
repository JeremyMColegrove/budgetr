// ============================================================================
// LEDGER ROUTES
// ============================================================================

import { Router } from 'express';
import { db, generateId, now } from '../database/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';

export const ledgerRouter = Router();

ledgerRouter.use(authMiddleware);

// POST /api/profiles/:profileId/ledger/mark-paid
ledgerRouter.post('/profiles/:profileId/ledger/mark-paid', (req, res) => {
  const { userId } = req as AuthRequest;
  const { ruleId, monthIso, amount, date, notes } = req.body as {
    ruleId: string;
    monthIso: string;
    amount?: number;
    date?: string;
    notes?: string;
  };

  if (!ruleId || !monthIso) {
    return res.status(400).json({ error: 'ruleId and monthIso are required' });
  }

  const rule = db.prepare(
    `SELECT id, amount FROM budget_rules WHERE id = ? AND profile_id = ? AND user_id = ?`
  ).get(ruleId, req.params.profileId, userId) as { id: string; amount: number } | undefined;

  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  const entryAmount = typeof amount === 'number' ? amount : rule.amount;
  const entryDate = date ?? `${monthIso}-01`;
  const entryNotes = notes ?? 'Bill paid';

  const existing = db.prepare(
    `SELECT id FROM ledger_entries WHERE rule_id = ? AND month_iso = ? AND profile_id = ? AND user_id = ?`
  ).get(ruleId, monthIso, req.params.profileId, userId) as { id: string } | undefined;

  const timestamp = now();

  if (existing) {
    db.prepare(
      `UPDATE ledger_entries SET amount = ?, date = ?, notes = ?, created_at = ? WHERE id = ?`
    ).run(entryAmount, entryDate, entryNotes, timestamp, existing.id);

    return res.json({ id: existing.id, ruleId, monthIso, amount: entryAmount, date: entryDate, notes: entryNotes });
  }

  const id = generateId();
  db.prepare(
    `INSERT INTO ledger_entries (id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, req.params.profileId, monthIso, ruleId, entryAmount, entryDate, entryNotes, timestamp);

  return res.status(201).json({ id, ruleId, monthIso, amount: entryAmount, date: entryDate, notes: entryNotes });
});

// DELETE /api/profiles/:profileId/ledger/mark-paid
ledgerRouter.delete('/profiles/:profileId/ledger/mark-paid', (req, res) => {
  const { userId } = req as AuthRequest;
  const { ruleId, monthIso } = req.body as { ruleId: string; monthIso: string };

  if (!ruleId || !monthIso) {
    return res.status(400).json({ error: 'ruleId and monthIso are required' });
  }

  const entry = db.prepare(
    `SELECT id FROM ledger_entries WHERE rule_id = ? AND month_iso = ? AND profile_id = ? AND user_id = ?`
  ).get(ruleId, monthIso, req.params.profileId, userId) as { id: string } | undefined;

  if (!entry) {
    return res.status(404).json({ error: 'Ledger entry not found' });
  }

  db.prepare('DELETE FROM ledger_entries WHERE id = ?').run(entry.id);
  return res.status(204).send();
});

// POST /api/profiles/:profileId/ledger/transactions
ledgerRouter.post('/profiles/:profileId/ledger/transactions', (req, res) => {
  const { userId } = req as AuthRequest;
  const { ruleId, monthIso, amount, date, notes } = req.body as {
    ruleId: string;
    monthIso: string;
    amount: number;
    date: string;
    notes?: string;
  };

  if (!ruleId || !monthIso || typeof amount !== 'number' || !date) {
    return res.status(400).json({ error: 'ruleId, monthIso, amount, and date are required' });
  }

  const rule = db.prepare(
    `SELECT id FROM budget_rules WHERE id = ? AND profile_id = ? AND user_id = ?`
  ).get(ruleId, req.params.profileId, userId) as { id: string } | undefined;

  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  const id = generateId();
  const timestamp = now();
  db.prepare(
    `INSERT INTO ledger_entries (id, user_id, profile_id, month_iso, rule_id, amount, date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, req.params.profileId, monthIso, ruleId, amount, date, notes ?? '', timestamp);

  return res.status(201).json({ id, ruleId, monthIso, amount, date, notes: notes ?? '' });
});

// GET /api/profiles/:profileId/ledger
ledgerRouter.get('/profiles/:profileId/ledger', (req, res) => {
  const { userId } = req as AuthRequest;
  const monthIso = req.query.month as string | undefined;

  if (!monthIso) {
    return res.status(400).json({ error: 'month query param is required' });
  }

  const entries = db.prepare(
    `SELECT * FROM ledger_entries WHERE profile_id = ? AND user_id = ? AND month_iso = ? ORDER BY date DESC`
  ).all(req.params.profileId, userId, monthIso);

  res.json(entries);
});

// DELETE /api/ledger/:id
ledgerRouter.delete('/ledger/:id', (req, res) => {
  const { userId } = req as AuthRequest;

  const entry = db.prepare('SELECT id FROM ledger_entries WHERE id = ? AND user_id = ?')
    .get(req.params.id, userId) as { id: string } | undefined;

  if (!entry) {
    return res.status(404).json({ error: 'Ledger entry not found' });
  }

  db.prepare('DELETE FROM ledger_entries WHERE id = ?').run(entry.id);
  res.status(204).send();
});
