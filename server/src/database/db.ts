// ============================================================================
// DATABASE CONNECTION AND INITIALIZATION
// ============================================================================

import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SCHEMA } from './schema.js';
import { DEFAULT_CATEGORIES } from './seed.js';

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

// Migration: Add default user for existing data and migrate to month-grain schema
function migrateExistingData(): void {
  // Migration 1: Add default user for existing data
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
    
    if (profileCount.count > 0) {
      console.log('⚠ Migrating existing data to new authentication schema...');
      
      const defaultUserId = generateId();
      const timestamp = now();
      
      db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(defaultUserId, timestamp);
      
      try {
        db.prepare('UPDATE profiles SET user_id = ? WHERE user_id IS NULL OR user_id = ""').run(defaultUserId);
        db.prepare('UPDATE accounts SET user_id = ? WHERE user_id IS NULL OR user_id = ""').run(defaultUserId);
        db.prepare('UPDATE budget_rules SET user_id = ? WHERE user_id IS NULL OR user_id = ""').run(defaultUserId);
        
        console.log('✓ Authentication migration complete');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠  IMPORTANT: Default Access Key Generated');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Access Key: ${defaultUserId}`);
        console.log('   Save this key - it\'s your only way to access existing data!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (error) {
        console.log('✓ Fresh installation - no migration needed');
      }
    }
  }

  // Migration 2: Migrate to month-grain schema
  migrateToMonthGrainSchema();

  // Migration 3: Initialize categories + ledger tables if missing
  migrateToCategorySchema();
  migrateToLedgerSchema();
  migrateToAddDefaultPaidColumn();

  // Migration 4: Add is_default_paid column if missing
  migrateToAddDefaultPaidColumn();

  // Seed categories for any existing users
  seedDefaultCategories();
}

function seedDefaultCategories(): void {
  const users = db.prepare('SELECT id FROM users').all() as Array<{ id: string }>;
  if (users.length === 0) return;

  const timestamp = now();
  const categories = DEFAULT_CATEGORIES;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO categories (id, user_id, name, kind, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction((userId: string) => {
    categories.forEach((category) => {
      insert.run(generateId(), userId, category.name, category.kind, timestamp, timestamp);
    });
  });

  users.forEach((user) => transaction(user.id));
}

// Migration: Convert old frequency-based rules to month-grain versioning
function migrateToMonthGrainSchema(): void {
  try {
    // If start_month doesn't exist, we need to migrate
    const checkQuery = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='budget_rules'
    `);
    const tableInfo = checkQuery.get() as { sql: string } | undefined;
    
    if (!tableInfo) {
      // Table doesn't exist yet, will be created by schema
      return;
    }

    const hasStartMonth = tableInfo.sql.includes('start_month');
    const hasFrequency = tableInfo.sql.includes('frequency');

    if (hasStartMonth && hasFrequency) {
      // Already migrated and has frequency columns
      return;
    }

    // Need to migrate
    console.log('⚠ Migrating budget rules to month-grain schema...');

    const currentMonth = '2026-02'; // Current month for migration

    // Create new table with correct schema (including frequency columns)
    db.exec(`
      CREATE TABLE IF NOT EXISTS budget_rules_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        label TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        account_id TEXT,
        to_account_id TEXT,
        category TEXT NOT NULL,
        notes TEXT NOT NULL,
        is_recurring INTEGER DEFAULT 0,
        frequency TEXT,
        start_date TEXT,
        start_month TEXT NOT NULL,
        end_month TEXT,
        is_default_paid INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK(start_month <= end_month OR end_month IS NULL),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
      )
    `);

    // Check if source table has frequency columns
    const sourceHasFrequency = tableInfo.sql.includes('frequency');
    const sourceHasDefaultPaid = tableInfo.sql.includes('is_default_paid');

    if (sourceHasFrequency) {
      // Copy data keeping frequency info
      if (sourceHasDefaultPaid) {
          db.exec(`
            INSERT INTO budget_rules_new (
              id, user_id, profile_id, label, amount, type, account_id, to_account_id,
              category, notes, is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
            )
            SELECT 
              id, user_id, profile_id, label, amount, type, account_id, to_account_id,
              category, notes, is_recurring, frequency, start_date, '${currentMonth}', NULL, is_default_paid, created_at, updated_at
            FROM budget_rules
          `);
      } else {
          db.exec(`
            INSERT INTO budget_rules_new (
              id, user_id, profile_id, label, amount, type, account_id, to_account_id,
              category, notes, is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
            )
            SELECT 
              id, user_id, profile_id, label, amount, type, account_id, to_account_id,
              category, notes, is_recurring, frequency, start_date, '${currentMonth}', NULL, 0, created_at, updated_at
            FROM budget_rules
          `);
      }
    } else {
      // Source table lost frequency info (from previous bad migration), set defaults
      db.exec(`
        INSERT INTO budget_rules_new (
          id, user_id, profile_id, label, amount, type, account_id, to_account_id,
          category, notes, is_recurring, frequency, start_date, start_month, end_month, is_default_paid, created_at, updated_at
        )
        SELECT 
          id, user_id, profile_id, label, amount, type, account_id, to_account_id,
          category, notes, 0, NULL, NULL, '${currentMonth}', NULL, 0, created_at, updated_at
        FROM budget_rules
      `);
    }

    // Drop old table and rename new table
    db.exec('DROP TABLE budget_rules');
    db.exec('ALTER TABLE budget_rules_new RENAME TO budget_rules');

    // Recreate indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_budget_rules_profile ON budget_rules(profile_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_budget_rules_user ON budget_rules(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_budget_rules_month_range ON budget_rules(profile_id, start_month, end_month)');

    console.log('✓ Month-grain schema migration complete');
    console.log(`   All existing rules set to start in ${currentMonth} with no end date`);

  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Migration: Add categories table (if missing)
function migrateToCategorySchema(): void {
  try {
    const tableInfo = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='categories'
    `).get() as { name?: string } | undefined;

    if (tableInfo?.name) {
      return;
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('bill', 'spending')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name)');
  } catch (error) {
    console.error('Category migration error:', error);
    throw error;
  }
}

// Migration: Add ledger entries table (if missing)
function migrateToLedgerSchema(): void {
  try {
    const tableInfo = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='ledger_entries'
    `).get() as { name?: string } | undefined;

    if (tableInfo?.name) {
      return;
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        month_iso TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (rule_id) REFERENCES budget_rules(id) ON DELETE CASCADE
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_ledger_profile_month ON ledger_entries(profile_id, month_iso)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ledger_rule_month ON ledger_entries(rule_id, month_iso)');
  } catch (error) {
    console.error('Ledger migration error:', error);
    throw error;
  }
}


// Migration: Add is_default_paid column (if missing)
function migrateToAddDefaultPaidColumn(): void {
  try {
    const tableInfo = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='budget_rules'
    `).get() as { sql: string } | undefined;
    
    if (!tableInfo) return; // Should not happen if previous migrations ran, but safe check

    const hasDefaultPaid = tableInfo.sql.includes('is_default_paid');
    
    if (hasDefaultPaid) {
      return;
    }

    console.log('⚠ Adding is_default_paid column to budget_rules...');
    db.exec('ALTER TABLE budget_rules ADD COLUMN is_default_paid INTEGER DEFAULT 0');
    console.log('✓ Added is_default_paid column');

  } catch (error) {
    console.error('Migration error (is_default_paid):', error);
    throw error;
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
