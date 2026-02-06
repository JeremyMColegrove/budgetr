// ============================================================================
// CATEGORY ROUTES
// ============================================================================

import { Router } from 'express';
import { db, generateId, now } from '../database/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';

export const categoriesRouter = Router();

categoriesRouter.use(authMiddleware);

// GET /api/categories
categoriesRouter.get('/categories', (req, res) => {
  const { userId } = req as AuthRequest;
  const rows = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC').all(userId);
  res.json(rows);
});

// POST /api/categories - upsert category kind by name
categoriesRouter.post('/categories', (req, res) => {
  const { userId } = req as AuthRequest;
  const { name, kind } = req.body as { name: string; kind: 'bill' | 'spending' };

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!kind || (kind !== 'bill' && kind !== 'spending')) {
    return res.status(400).json({ error: 'kind must be bill or spending' });
  }

  const existing = db
    .prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?')
    .get(userId, name.trim()) as { id: string } | undefined;

  const timestamp = now();

  if (existing) {
    db.prepare('UPDATE categories SET kind = ?, updated_at = ? WHERE id = ?')
      .run(kind, timestamp, existing.id);
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(existing.id);
    return res.json(row);
  }

  const id = generateId();
  db.prepare(
    'INSERT INTO categories (id, user_id, name, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userId, name.trim(), kind, timestamp, timestamp);

  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return res.status(201).json(row);
});
