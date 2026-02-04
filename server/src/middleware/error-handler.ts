// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // SQLite constraint errors
  if (err.message.includes('FOREIGN KEY constraint failed')) {
    res.status(400).json({
      error: 'Invalid reference: The referenced resource does not exist',
    });
    return;
  }

  if (err.message.includes('UNIQUE constraint failed')) {
    res.status(409).json({
      error: 'A resource with this identifier already exists',
    });
    return;
  }

  // JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON in request body',
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
}
