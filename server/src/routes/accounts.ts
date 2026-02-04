// ============================================================================
// ACCOUNT ROUTES
// ============================================================================

import { Router } from 'express';
import { db, generateId, now } from '../database/db.js';
import type {
    Account,
    AccountRow,
    CreateAccountRequest,
    UpdateAccountRequest,
} from '../types/index.js';

export const accountsRouter = Router();

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

function mapAccountRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startingBalance: row.starting_balance,
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// GET /api/profiles/:profileId/accounts - List accounts for profile
accountsRouter.get('/profiles/:profileId/accounts', (req, res) => {
  const accounts = db.prepare('SELECT * FROM accounts WHERE profile_id = ? ORDER BY created_at ASC')
    .all(req.params.profileId) as AccountRow[];
  
  res.json(accounts.map(mapAccountRow));
});

// POST /api/profiles/:profileId/accounts - Create account
accountsRouter.post('/profiles/:profileId/accounts', (req, res) => {
  const { name, type, startingBalance } = req.body as CreateAccountRequest;
  
  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Account name is required' });
  }
  
  if (!type || !['checking', 'savings', 'credit_card', 'loan', 'investment'].includes(type)) {
    return res.status(400).json({ error: 'Valid account type is required' });
  }
  
  if (typeof startingBalance !== 'number') {
    return res.status(400).json({ error: 'Starting balance must be a number' });
  }

  // Check if profile exists
  const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(req.params.profileId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(
    'INSERT INTO accounts (id, profile_id, name, type, starting_balance, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.profileId, name.trim(), type, startingBalance, timestamp);

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow;
  res.status(201).json(mapAccountRow(account));
});

// PUT /api/accounts/:id - Update account
accountsRouter.put('/accounts/:id', (req, res) => {
  const { name, type, startingBalance } = req.body as UpdateAccountRequest;
  
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Account name must be a non-empty string' });
    }
    updates.push('name = ?');
    values.push(name.trim());
  }

  if (type !== undefined) {
    if (!['checking', 'savings', 'credit_card', 'loan', 'investment'].includes(type)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }
    updates.push('type = ?');
    values.push(type);
  }

  if (startingBalance !== undefined) {
    if (typeof startingBalance !== 'number') {
      return res.status(400).json({ error: 'Starting balance must be a number' });
    }
    updates.push('starting_balance = ?');
    values.push(startingBalance);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(req.params.id);

  const result = db.prepare(
    `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as AccountRow;
  res.json(mapAccountRow(account));
});

// DELETE /api/accounts/:id - Delete account
accountsRouter.delete('/accounts/:id', (req, res) => {
  // Check if any rules are linked to this account
  const linkedRules = db.prepare(
    'SELECT COUNT(*) as count FROM budget_rules WHERE account_id = ? OR to_account_id = ?'
  ).get(req.params.id, req.params.id) as { count: number };

  if (linkedRules.count > 0) {
    return res.status(400).json({
      error: `Cannot delete account: ${linkedRules.count} budget rule(s) are linked to this account. Please unlink or delete those rules first.`
    });
  }

  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.status(204).send();
});
