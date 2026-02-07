import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../budget.db');
const db = new Database(DB_PATH);

db.pragma('foreign_keys = ON');

db.exec('BEGIN');

try {
  const candidates = db
    .prepare(
      `SELECT id, start_month, end_month, start_date, created_at, updated_at, is_default_paid
       FROM budget_rules
       WHERE start_month LIKE '____-__-__'
         AND (end_month LIKE '____-__' OR end_month IS NULL)`
    )
    .all();

  const updates = db.prepare(
    `UPDATE budget_rules
     SET start_month = ?,
         end_month = ?,
         start_date = ?,
         is_default_paid = COALESCE(is_default_paid, 0),
         created_at = COALESCE(created_at, updated_at)
     WHERE id = ?`
  );

  let fixed = 0;

  candidates.forEach((row) => {
    const { id, start_month, end_month } = row;

    // Heuristic: if start_month is YYYY-MM-DD and end_month is YYYY-MM, swap.
    const newStartMonth = end_month ?? start_month.slice(0, 7);
    const newStartDate = start_month;

    // Only fix if newStartMonth is YYYY-MM format.
    if (!/^\d{4}-\d{2}$/.test(newStartMonth)) {
      return;
    }

    updates.run(newStartMonth, null, newStartDate, id);
    fixed += 1;
  });

  db.exec('COMMIT');
  console.log(`Fixed ${fixed} corrupted rule(s).`);
} catch (error) {
  db.exec('ROLLBACK');
  console.error('Repair failed:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
