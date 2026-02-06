// ============================================================================
// RULE VERSIONING
// ============================================================================
// Handles budget rule versioning logic for month-grain updates

import { db, generateId, now } from '../database/db.js';
import type { BudgetRule, BudgetRuleRow } from '../types/index.js';
import { compareMonths, getPreviousMonth } from '../utils/date-utils.js';

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
// Rule Versioning Functions
// ----------------------------------------------------------------------------

/**
 * Upsert a budget rule with month-grain versioning logic
 * 
 * Implements three scenarios:
 * - Scenario A (New Standard): Rule started in past → Split (close old, create new)
 * - Scenario B (Immediate Correction): Rule started in current month → Update in-place
 * - Scenario C (Future Correction): Same as Scenario A
 * 
 * @param ruleId - ID of the rule to update
 * @param updates - Partial updates to apply
 * @param currentViewMonth - The month the user is currently viewing (YYYY-MM)
 * @param userId - User ID for authorization
 * @returns The updated or newly created rule
 */
export function upsertRule(
  ruleId: string,
  updates: Partial<Omit<BudgetRule, 'id' | 'createdAt' | 'updatedAt'>>,
  currentViewMonth: string,
  userId: string
): BudgetRule {
  // Get the existing rule
  const existingRow = db
    .prepare('SELECT * FROM budget_rules WHERE id = ? AND user_id = ?')
    .get(ruleId, userId) as BudgetRuleRow | undefined;

  if (!existingRow) {
    throw new Error('Rule not found');
  }

  const existingRule = mapBudgetRuleRow(existingRow);

  // Determine which scenario we're in
  const comparison = compareMonths(existingRule.startMonth, currentViewMonth);

  if (comparison === 0) {
    // Scenario B: Immediate Correction
    // The rule started in the current month, so just update it in-place
    return updateRuleInPlace(ruleId, updates, userId);
  } else {
    // Scenario A/C: New Standard / Future Correction
    // The rule started in the past, so we need to split it
    return splitRule(existingRule, updates, currentViewMonth, userId);
  }
}

/**
 * Update a rule in-place (Scenario B)
 */
function updateRuleInPlace(
  ruleId: string,
  updates: Partial<Omit<BudgetRule, 'id' | 'createdAt' | 'updatedAt'>>,
  userId: string
): BudgetRule {
  const updateFields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.label !== undefined) {
    updateFields.push('label = ?');
    values.push(updates.label);
  }

  if (updates.amount !== undefined) {
    updateFields.push('amount = ?');
    values.push(updates.amount);
  }

  if (updates.type !== undefined) {
    updateFields.push('type = ?');
    values.push(updates.type);
  }

  if (updates.accountId !== undefined) {
    updateFields.push('account_id = ?');
    values.push(updates.accountId ?? null);
  }

  if (updates.toAccountId !== undefined) {
    updateFields.push('to_account_id = ?');
    values.push(updates.toAccountId ?? null);
  }

  if (updates.category !== undefined) {
    updateFields.push('category = ?');
    values.push(updates.category);
  }

  if (updates.notes !== undefined) {
    updateFields.push('notes = ?');
    values.push(updates.notes);
  }

  if (updates.isRecurring !== undefined) {
    updateFields.push('is_recurring = ?');
    values.push(updates.isRecurring ? 1 : 0);
  }

  if (updates.frequency !== undefined) {
    updateFields.push('frequency = ?');
    values.push(updates.frequency ?? null);
  }

  if (updates.startDate !== undefined) {
    updateFields.push('start_date = ?');
    values.push(updates.startDate ?? null);
  }

  // Always update the updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(now());

  values.push(ruleId);
  values.push(userId);

  db.prepare(
    `UPDATE budget_rules SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...values);

  const updatedRow = db
    .prepare('SELECT * FROM budget_rules WHERE id = ?')
    .get(ruleId) as BudgetRuleRow;

  return mapBudgetRuleRow(updatedRow);
}

/**
 * Split a rule into old and new versions (Scenario A/C)
 */
function splitRule(
  existingRule: BudgetRule,
  updates: Partial<Omit<BudgetRule, 'id' | 'createdAt' | 'updatedAt'>>,
  currentViewMonth: string,
  userId: string
): BudgetRule {
  const previousMonth = getPreviousMonth(currentViewMonth);

  // Step 1: Close the existing rule at the previous month
  db.prepare(
    'UPDATE budget_rules SET end_month = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  ).run(previousMonth, now(), existingRule.id, userId);

  // Step 2: Create a new rule starting from the current month
  const newRuleId = generateId();
  const timestamp = now();

  // Get the profile_id from the existing rule
  const existingRow = db
    .prepare('SELECT profile_id FROM budget_rules WHERE id = ?')
    .get(existingRule.id) as { profile_id: string };

  db.prepare(
    `INSERT INTO budget_rules (
      id, user_id, profile_id, label, amount, type, account_id, to_account_id,
      category, notes, is_recurring, frequency, start_date, start_month, end_month, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newRuleId,
    userId,
    existingRow.profile_id,
    updates.label ?? existingRule.label,
    updates.amount ?? existingRule.amount,
    updates.type ?? existingRule.type,
    updates.accountId !== undefined ? (updates.accountId ?? null) : (existingRule.accountId ?? null),
    updates.toAccountId !== undefined ? (updates.toAccountId ?? null) : (existingRule.toAccountId ?? null),
    updates.category ?? existingRule.category,
    updates.notes ?? existingRule.notes,
    updates.isRecurring !== undefined ? (updates.isRecurring ? 1 : 0) : (existingRule.isRecurring ? 1 : 0),
    updates.frequency !== undefined ? (updates.frequency ?? null) : (existingRule.frequency ?? null),
    updates.startDate !== undefined ? (updates.startDate ?? null) : (existingRule.startDate ?? null),
    currentViewMonth,
    null, // end_month = NULL (forever)
    timestamp,
    timestamp
  );

  const newRow = db
    .prepare('SELECT * FROM budget_rules WHERE id = ?')
    .get(newRuleId) as BudgetRuleRow;

  return mapBudgetRuleRow(newRow);
}

/**
 * Soft delete a rule by setting its end_month
 * 
 * @param ruleId - ID of the rule to delete
 * @param currentViewMonth - The month the user is currently viewing (YYYY-MM)
 * @param userId - User ID for authorization
 */
export function softDeleteRule(
  ruleId: string,
  currentViewMonth: string,
  userId: string
): void {
  const previousMonth = getPreviousMonth(currentViewMonth);

  db.prepare(
    'UPDATE budget_rules SET end_month = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  ).run(previousMonth, now(), ruleId, userId);
}

/**
 * Hard delete a rule (for cleanup)
 * 
 * @param ruleId - ID of the rule to delete
 * @param userId - User ID for authorization
 */
export function hardDeleteRule(ruleId: string, userId: string): void {
  db.prepare('DELETE FROM budget_rules WHERE id = ? AND user_id = ?').run(ruleId, userId);
}
