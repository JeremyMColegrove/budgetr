// ============================================================================
// PROFILE ROUTES
// ============================================================================

import { Router } from 'express';
import { db, generateId, now } from '../database/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import type {
    Account,
    AccountRow,
    BudgetProfile,
    BudgetRule,
    BudgetRuleRow,
    CreateProfileRequest,
    ProfileRow,
    UpdateProfileRequest,
} from '../types/index.js';

export const profilesRouter = Router();

// Apply authentication middleware to all routes
profilesRouter.use(authMiddleware);

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

function getProfileWithData(profileId: string, userId: string): BudgetProfile | null {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(profileId, userId) as ProfileRow | undefined;
  
  if (!profile) {
    return null;
  }

  const accounts = db.prepare('SELECT * FROM accounts WHERE profile_id = ? AND user_id = ?').all(profileId, userId) as AccountRow[];
  const rules = db.prepare('SELECT * FROM budget_rules WHERE profile_id = ? AND user_id = ?').all(profileId, userId) as BudgetRuleRow[];

  return {
    id: profile.id,
    name: profile.name,
    accounts: accounts.map(mapAccountRow),
    rules: rules.map(mapBudgetRuleRow),
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// GET /api/profiles - List all profiles
profilesRouter.get('/', (req, res) => {
  const { userId } = req as AuthRequest;
  const profiles = db.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at DESC').all(userId) as ProfileRow[];
  
  const profilesWithData = profiles.map(p => getProfileWithData(p.id, userId)).filter(Boolean) as BudgetProfile[];
  
  res.json(profilesWithData);
});

// GET /api/profiles/:id - Get single profile
profilesRouter.get('/:id', (req, res) => {
  const { userId } = req as AuthRequest;
  const profile = getProfileWithData(req.params.id, userId);
  
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  
  res.json(profile);
});

// GET /api/profiles/:id/summary - Get profile summary with calculated values
profilesRouter.get('/:id/summary', async (req, res) => {
  try {
    const { BudgetEngine } = await import('../engine/BudgetEngine.js');
    const engine = BudgetEngine.forProfile(req.params.id);
    const summary = engine.getProfileSummary();
    res.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === 'Profile not found') {
      return res.status(404).json({ error: 'Profile not found' });
    }
    throw error;
  }
});

// GET /api/profiles/:id/accounts/projections - Get accounts with projections
profilesRouter.get('/:id/accounts/projections', async (req, res) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const budgetId = req.query.budgetId as string | undefined;

    const { BudgetEngine } = await import('../engine/BudgetEngine.js');
    const engine = BudgetEngine.forProfile(req.params.id);
    const data = engine.getAccountsWithProjections(months, budgetId);
    res.json(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
});

// POST /api/profiles - Create new profile
profilesRouter.post('/', (req, res) => {
  const { userId } = req as AuthRequest;
  const { name } = req.body as CreateProfileRequest;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Profile name is required' });
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(
    'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, userId, name.trim(), timestamp, timestamp);

  const profile = getProfileWithData(id, userId);
  res.status(201).json(profile);
});

// PUT /api/profiles/:id - Update profile
profilesRouter.put('/:id', (req, res) => {
  const { userId } = req as AuthRequest;
  const { name } = req.body as UpdateProfileRequest;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Profile name is required' });
  }

  const result = db.prepare(
    'UPDATE profiles SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  ).run(name.trim(), now(), req.params.id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const profile = getProfileWithData(req.params.id, userId);
  res.json(profile);
});

// DELETE /api/profiles/:id - Delete profile
profilesRouter.delete('/:id', (req, res) => {
  const { userId } = req as AuthRequest;
  
  // Check if this is the last profile for this user
  const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles WHERE user_id = ?').get(userId) as { count: number };
  
  if (profileCount.count <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last profile' });
  }

  const result = db.prepare('DELETE FROM profiles WHERE id = ? AND user_id = ?').run(req.params.id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.status(204).send();
});

// POST /api/profiles/:id/duplicate - Duplicate profile
profilesRouter.post('/:id/duplicate', (req, res) => {
  const { userId } = req as AuthRequest;
  const sourceProfile = getProfileWithData(req.params.id, userId);
  
  if (!sourceProfile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const newProfileId = generateId();
  const timestamp = now();

  // Start transaction
  const transaction = db.transaction(() => {
    // Create new profile
    db.prepare(
      'INSERT INTO profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(newProfileId, userId, `${sourceProfile.name} (Copy)`, timestamp, timestamp);

    // Duplicate accounts with ID mapping
    const accountIdMap = new Map<string, string>();
    for (const account of sourceProfile.accounts) {
      const newAccountId = generateId();
      accountIdMap.set(account.id, newAccountId);
      
      db.prepare(
        'INSERT INTO accounts (id, user_id, profile_id, name, type, starting_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(newAccountId, userId, newProfileId, account.name, account.type, account.startingBalance, timestamp);
    }

    // Duplicate rules with updated account references
    for (const rule of sourceProfile.rules) {
      const newRuleId = generateId();
      const newAccountId = rule.accountId ? accountIdMap.get(rule.accountId) : null;
      const newToAccountId = rule.toAccountId ? accountIdMap.get(rule.toAccountId) : null;
      
      db.prepare(
        `INSERT INTO budget_rules (
          id, user_id, profile_id, label, amount, type, account_id, to_account_id,
          category, notes, is_recurring, frequency, start_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newRuleId, userId, newProfileId, rule.label, rule.amount, rule.type,
        newAccountId ?? null, newToAccountId ?? null, rule.category, rule.notes,
        rule.isRecurring ? 1 : 0, rule.frequency ?? null, rule.startDate ?? null,
        timestamp, timestamp
      );
    }
  });

  transaction();

  const newProfile = getProfileWithData(newProfileId, userId);
  res.status(201).json(newProfile);
});
