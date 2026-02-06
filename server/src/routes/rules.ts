// ============================================================================
// BUDGET RULE ROUTES
// ============================================================================

import { Router } from 'express';
import { db, generateId, now } from '../database/db.js';
import { hardDeleteRule, softDeleteRule, upsertRule } from '../engine/RuleVersioning.js';
import type { AuthRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import type {
    BudgetRule,
    BudgetRuleRow,
    CreateBudgetRuleRequest,
    UpdateBudgetRuleRequest,
} from '../types/index.js';
import { getCurrentMonth } from '../utils/date-utils.js';

export const rulesRouter = Router();

// Apply authentication middleware to all routes
rulesRouter.use(authMiddleware);

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
    startMonth: row.start_month,
    endMonth: row.end_month ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// GET /api/profiles/:profileId/rules - List rules for profile (with optional month filter)
rulesRouter.get('/profiles/:profileId/rules', (req, res) => {
  const { userId } = req as AuthRequest;
  const month = (req.query.month as string) || getCurrentMonth();
  
  const rules = db.prepare(
    `SELECT * FROM budget_rules 
     WHERE profile_id = ? 
     AND user_id = ? 
     AND start_month <= ? 
     AND (end_month IS NULL OR end_month >= ?)
     ORDER BY created_at ASC`
  ).all(req.params.profileId, userId, month, month) as BudgetRuleRow[];
  
  res.json(rules.map(mapBudgetRuleRow));
});

// GET /api/profiles/:profileId/rules/summary - Get rules summary with calculated values
rulesRouter.get('/profiles/:profileId/rules/summary', async (req, res) => {
  try {
    const { RuleManager } = await import('../engine/RuleManager.js');
    const ruleManager = new RuleManager(req.params.profileId);
    const summary = ruleManager.getSummary();
    res.json(summary);
  } catch (error) {
    throw error;
  }
});

// POST /api/profiles/:profileId/rules - Create rule
rulesRouter.post('/profiles/:profileId/rules', (req, res) => {
  const { userId } = req as AuthRequest;
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
    startMonth,
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
  
  if (!startMonth || typeof startMonth !== 'string') {
    return res.status(400).json({ error: 'startMonth is required (YYYY-MM format)' });
  }

  if (isRecurring !== undefined && typeof isRecurring !== 'boolean') {
    return res.status(400).json({ error: 'isRecurring must be a boolean' });
  }
  
  if (isRecurring && (!frequency || !['weekly', 'bi-weekly', 'monthly', 'yearly'].includes(frequency))) {
    return res.status(400).json({ error: 'Valid frequency is required for recurring rules' });
  }

  // Check if profile exists and belongs to user
  const profile = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?').get(req.params.profileId, userId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(
    `INSERT INTO budget_rules (
      id, user_id, profile_id, label, amount, type, account_id, to_account_id,
      category, notes, is_recurring, frequency, start_date, start_month, end_month, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
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
    startMonth,
    null, // end_month = NULL (forever)
    timestamp,
    timestamp
  );

  const rule = db.prepare('SELECT * FROM budget_rules WHERE id = ?').get(id) as BudgetRuleRow;
  res.status(201).json(mapBudgetRuleRow(rule));
});

// PUT /api/rules/:id - Update rule (with versioning)
rulesRouter.put('/rules/:id', (req, res) => {
  const { userId } = req as AuthRequest;
  const { currentViewMonth, ...updates } = req.body as UpdateBudgetRuleRequest;
  
  if (!currentViewMonth) {
    return res.status(400).json({ error: 'currentViewMonth is required for versioning' });
  }
  
  try {
    const updatedRule = upsertRule(req.params.id, updates, currentViewMonth, userId);
    res.json(updatedRule);
  } catch (error) {
    if (error instanceof Error && error.message === 'Rule not found') {
      return res.status(404).json({ error: 'Rule not found' });
    }
    throw error;
  }
});

// DELETE /api/rules/:id - Delete rule (soft delete with optional month, hard delete if no month)
rulesRouter.delete('/rules/:id', (req, res) => {
  const { userId } = req as AuthRequest;
  const currentViewMonth = req.query.month as string | undefined;
  
  try {
    if (currentViewMonth) {
      // Soft delete: set end_month to previous month
      softDeleteRule(req.params.id, currentViewMonth, userId);
    } else {
      // Hard delete: remove completely
      hardDeleteRule(req.params.id, userId);
    }
    
    res.status(204).send();
  } catch (error) {
    return res.status(404).json({ error: 'Rule not found' });
  }
});
