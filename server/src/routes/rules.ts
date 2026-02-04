// ============================================================================
// BUDGET RULE ROUTES
// ============================================================================

import { Router } from 'express';
import { db, generateId, now } from '../database/db.js';
import type {
    BudgetRule,
    BudgetRuleRow,
    CreateBudgetRuleRequest,
    UpdateBudgetRuleRequest,
} from '../types/index.js';

export const rulesRouter = Router();

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

function mapBudgetRuleRow(row: BudgetRuleRow): BudgetRule {
  return {
    id: row.id,
    label: row.label,
    amount: row.amount,
    type: row.type,
    accountId: row.account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    category: row.category,
    notes: row.notes,
    isRecurring: row.is_recurring === 1,
    frequency: row.frequency ?? undefined,
    startDate: row.start_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// GET /api/profiles/:profileId/rules - List rules for profile
rulesRouter.get('/profiles/:profileId/rules', (req, res) => {
  const rules = db.prepare('SELECT * FROM budget_rules WHERE profile_id = ? ORDER BY created_at ASC')
    .all(req.params.profileId) as BudgetRuleRow[];
  
  res.json(rules.map(mapBudgetRuleRow));
});

// POST /api/profiles/:profileId/rules - Create rule
rulesRouter.post('/profiles/:profileId/rules', (req, res) => {
  const {
    label,
    amount,
    type,
    accountId,
    toAccountId,
    category,
    notes,
    isRecurring,
    frequency,
    startDate,
  } = req.body as CreateBudgetRuleRequest;
  
  // Validation
  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    return res.status(400).json({ error: 'Label is required' });
  }
  
  if (typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ error: 'Amount must be a non-negative number' });
  }
  
  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type must be either "income" or "expense"' });
  }
  
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    return res.status(400).json({ error: 'Category is required' });
  }
  
  if (typeof isRecurring !== 'boolean') {
    return res.status(400).json({ error: 'isRecurring must be a boolean' });
  }
  
  if (isRecurring && (!frequency || !['weekly', 'bi-weekly', 'monthly', 'yearly'].includes(frequency))) {
    return res.status(400).json({ error: 'Valid frequency is required for recurring rules' });
  }

  // Check if profile exists
  const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(req.params.profileId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(
    `INSERT INTO budget_rules (
      id, profile_id, label, amount, type, account_id, to_account_id,
      category, notes, is_recurring, frequency, start_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.params.profileId,
    label.trim(),
    amount,
    type,
    accountId ?? null,
    toAccountId ?? null,
    category.trim(),
    notes ?? '',
    isRecurring ? 1 : 0,
    frequency ?? null,
    startDate ?? null,
    timestamp,
    timestamp
  );

  const rule = db.prepare('SELECT * FROM budget_rules WHERE id = ?').get(id) as BudgetRuleRow;
  res.status(201).json(mapBudgetRuleRow(rule));
});

// PUT /api/rules/:id - Update rule
rulesRouter.put('/rules/:id', (req, res) => {
  const data = req.body as UpdateBudgetRuleRequest;
  
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.label !== undefined) {
    if (typeof data.label !== 'string' || data.label.trim().length === 0) {
      return res.status(400).json({ error: 'Label must be a non-empty string' });
    }
    updates.push('label = ?');
    values.push(data.label.trim());
  }

  if (data.amount !== undefined) {
    if (typeof data.amount !== 'number' || data.amount < 0) {
      return res.status(400).json({ error: 'Amount must be a non-negative number' });
    }
    updates.push('amount = ?');
    values.push(data.amount);
  }

  if (data.type !== undefined) {
    if (!['income', 'expense'].includes(data.type)) {
      return res.status(400).json({ error: 'Type must be either "income" or "expense"' });
    }
    updates.push('type = ?');
    values.push(data.type);
  }

  if (data.accountId !== undefined) {
    updates.push('account_id = ?');
    values.push(data.accountId ?? null);
  }

  if (data.toAccountId !== undefined) {
    updates.push('to_account_id = ?');
    values.push(data.toAccountId ?? null);
  }

  if (data.category !== undefined) {
    if (typeof data.category !== 'string' || data.category.trim().length === 0) {
      return res.status(400).json({ error: 'Category must be a non-empty string' });
    }
    updates.push('category = ?');
    values.push(data.category.trim());
  }

  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes ?? '');
  }

  if (data.isRecurring !== undefined) {
    if (typeof data.isRecurring !== 'boolean') {
      return res.status(400).json({ error: 'isRecurring must be a boolean' });
    }
    updates.push('is_recurring = ?');
    values.push(data.isRecurring ? 1 : 0);
  }

  if (data.frequency !== undefined) {
    if (data.frequency && !['weekly', 'bi-weekly', 'monthly', 'yearly'].includes(data.frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }
    updates.push('frequency = ?');
    values.push(data.frequency ?? null);
  }

  if (data.startDate !== undefined) {
    updates.push('start_date = ?');
    values.push(data.startDate ?? null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Always update the updated_at timestamp
  updates.push('updated_at = ?');
  values.push(now());

  values.push(req.params.id);

  const result = db.prepare(
    `UPDATE budget_rules SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  const rule = db.prepare('SELECT * FROM budget_rules WHERE id = ?').get(req.params.id) as BudgetRuleRow;
  res.json(mapBudgetRuleRow(rule));
});

// DELETE /api/rules/:id - Delete rule
rulesRouter.delete('/rules/:id', (req, res) => {
  const result = db.prepare('DELETE FROM budget_rules WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.status(204).send();
});
