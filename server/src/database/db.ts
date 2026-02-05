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
  
  // Run migration for existing data
  migrateExistingData();
  
  console.log('✓ Database initialized');
}

// Migration: Add default user for existing data
function migrateExistingData(): void {
  // Check if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    // Check if there's existing data that needs migration
    const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
    
    if (profileCount.count > 0) {
      console.log('⚠ Migrating existing data to new authentication schema...');
      
      const defaultUserId = generateId();
      const timestamp = now();
      
      // Create default user
      db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(defaultUserId, timestamp);
      
      // Update all existing profiles, accounts, and rules with the default user_id
      // Note: SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS in a clean way
      // The schema already defines these columns, so we just need to update NULL values
      
      try {
        db.prepare('UPDATE profiles SET user_id = ? WHERE user_id IS NULL OR user_id = ""').run(defaultUserId);
        db.prepare('UPDATE accounts SET user_id = ? WHERE user_id IS NULL OR user_id = ""').run(defaultUserId);
        db.prepare('UPDATE budget_rules SET user_id = ? WHERE user_id IS NULL OR user_id = ""').run(defaultUserId);
        
        console.log('✓ Migration complete');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠  IMPORTANT: Default Access Key Generated');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Access Key: ${defaultUserId}`);
        console.log('   Save this key - it\'s your only way to access existing data!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (error) {
        // If columns don't exist yet (fresh install), this is fine
        console.log('✓ Fresh installation - no migration needed');
      }
    }
  }
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
