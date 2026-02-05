// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

import type { NextFunction, Request, Response } from 'express';
import { db } from '../database/db.js';
import type { UserRow } from '../types/index.js';

// Extend Express Request to include userId
export interface AuthRequest extends Request {
  userId: string;
}

/**
 * Authentication middleware
 * Validates the x-access-key header and attaches userId to request
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const accessKey = req.headers['x-access-key'] as string | undefined;

  if (!accessKey) {
    res.status(401).json({ error: 'Access key required' });
    return;
  }

  // Validate access key exists in database
  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(accessKey) as UserRow | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid access key' });
    return;
  }

  // Attach userId to request
  (req as AuthRequest).userId = user.id;
  next();
}
