// ============================================================================
// RULE MANAGER
// ============================================================================
// Manages budget rules and their calculations

import { db } from '../database/db.js';
import type { RuleSummary } from '../types/engine.js';
import type { BudgetRule, BudgetRuleRow } from '../types/index.js';
import { getCurrentMonth } from '../utils/date-utils.js';
import { CalculationEngine } from './CalculationEngine.js';

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
// RuleManager Class
// ----------------------------------------------------------------------------

export class RuleManager {
  private profileId: string;

  constructor(profileId: string) {
    this.profileId = profileId;
  }

  /**
   * Get budget rules for a specific month
   * @param targetMonthISO - Month in "YYYY-MM" format
   */
  getBudgetRulesForMonth(targetMonthISO: string): BudgetRule[] {
    const rows = db
      .prepare(
        `SELECT * FROM budget_rules 
         WHERE profile_id = ? 
         AND start_month <= ? 
         AND (end_month IS NULL OR end_month >= ?)
         ORDER BY created_at ASC`
      )
      .all(this.profileId, targetMonthISO, targetMonthISO) as BudgetRuleRow[];

    return rows.map(mapBudgetRuleRow);
  }

  /**
   * Get all rules for the profile (defaults to current month)
   */
  getRules(): BudgetRule[] {
    return this.getBudgetRulesForMonth(getCurrentMonth());
  }

  /**
   * Get all income rules
   */
  getIncomeRules(): BudgetRule[] {
    return this.getRules().filter((r) => r.type === 'income');
  }

  /**
   * Get all expense rules
   */
  getExpenseRules(): BudgetRule[] {
    return this.getRules().filter((r) => r.type === 'expense');
  }

  /**
   * Get rules for a specific account
   * Includes rules where accountId OR toAccountId matches
   */
  getRulesForAccount(accountId: string): BudgetRule[] {
    return this.getRules().filter(
      (r) => r.accountId === accountId || r.toAccountId === accountId
    );
  }

  /**
   * Calculate total monthly income
   */
  getTotalIncome(): number {
    return this.getIncomeRules().reduce(
      (sum, r) => sum + CalculationEngine.normalizeToMonthly(r),
      0
    );
  }

  /**
   * Calculate total monthly expenses
   */
  getTotalExpenses(): number {
    return this.getExpenseRules().reduce(
      (sum, r) => sum + CalculationEngine.normalizeToMonthly(r),
      0
    );
  }

  /**
   * Calculate amount left to allocate (income - expenses)
   */
  getAmountLeftToAllocate(): number {
    return this.getTotalIncome() - this.getTotalExpenses();
  }

  /**
   * Get a complete summary of rules
   */
  getSummary(): RuleSummary {
    return {
      totalIncome: this.getTotalIncome(),
      totalExpenses: this.getTotalExpenses(),
      amountLeftToAllocate: this.getAmountLeftToAllocate(),
      incomeRules: this.getIncomeRules(),
      expenseRules: this.getExpenseRules(),
    };
  }

  /**
   * Get rule count
   */
  getRuleCount(): number {
    return this.getRules().length;
  }
}
