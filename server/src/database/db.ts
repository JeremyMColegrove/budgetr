// ============================================================================
// DATABASE CONNECTION AND INITIALIZATION
// ============================================================================

import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SCHEMA } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path - configurable via environment variable for Docker
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../budget.db');

// Initialize database connection
export const db: Database.Database = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
export function initializeDatabase(): void {
  db.exec(SCHEMA);
  console.log('✓ Database initialized');
}

// Helper to generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Helper to get current ISO timestamp
export function now(): string {
  return new Date().toISOString();
}

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  console.log('\n✓ Database connection closed');
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  console.log('\n✓ Database connection closed');
  process.exit(0);
});
