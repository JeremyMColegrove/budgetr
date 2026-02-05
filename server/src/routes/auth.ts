// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

import { Router } from 'express';
import { db, generateId, now } from '../database/db.js';
import type {
    LoginRequest,
    LoginResponse,
    RegisterResponse,
    UserRow,
} from '../types/index.js';

export const authRouter = Router();

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// POST /api/auth/register - Generate new access key
authRouter.post('/register', (_req, res) => {
  const accessKey = generateId();
  const timestamp = now();

  // Create new user
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(
    accessKey,
    timestamp
  );

  const response: RegisterResponse = { accessKey };
  res.status(201).json(response);
});

// POST /api/auth/login - Validate access key
authRouter.post('/login', (req, res) => {
  const { accessKey } = req.body as LoginRequest;

  if (!accessKey || typeof accessKey !== 'string') {
    return res.status(400).json({ error: 'Access key is required' });
  }

  // Check if user exists
  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(accessKey) as UserRow | undefined;

  if (!user) {
    return res.status(401).json({ error: 'Invalid access key' });
  }

  const response: LoginResponse = { success: true };
  res.json(response);
});
