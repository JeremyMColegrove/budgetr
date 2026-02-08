// ============================================================================
// RULE MANAGER
// ============================================================================
// Manages budget rules and their calculations

import { db } from '../database/db.js';
import type { MonthSummary, RuleSummary } from '../types/engine.js';
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
    return this.sumRulesByType(this.getRules(), 'income');
  }

  /**
   * Calculate total monthly expenses
   */
  getTotalExpenses(): number {
    return this.sumRulesByType(this.getRules(), 'expense');
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
   * Get a summary for a specific month (projected + actuals)
   * @param targetMonthISO - Month in "YYYY-MM" format
   */
  getMonthSummary(targetMonthISO: string): MonthSummary {
    const rules = this.getBudgetRulesForMonth(targetMonthISO);
    const totalActualExpenseRow = db
      .prepare(
        `SELECT COALESCE(SUM(le.amount), 0) as total
         FROM ledger_entries le
         JOIN budget_rules br ON br.id = le.rule_id
         WHERE le.profile_id = ?
         AND le.month_iso = ?
         AND br.type = 'expense'`
      )
      .get(this.profileId, targetMonthISO) as { total: number } | undefined;
    const totalActualExpense = totalActualExpenseRow?.total ?? 0;

    return {
      totalIncome: CalculationEngine.roundCurrency(
        this.sumRulesByTypeForMonth(rules, 'income', targetMonthISO)
      ),
      totalPlannedExpense: CalculationEngine.roundCurrency(
        this.sumRulesByTypeForMonth(rules, 'expense', targetMonthISO)
      ),
      totalActualExpense: CalculationEngine.roundCurrency(totalActualExpense),
    };
  }

  /**
   * Get rule count
   */
  getRuleCount(): number {
    return this.getRules().length;
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private sumRulesByType(rules: BudgetRule[], type: 'income' | 'expense'): number {
    return rules
      .filter((r) => r.type === type)
      .reduce((sum, r) => sum + CalculationEngine.normalizeToMonthly(r), 0);
  }

  private sumRulesByTypeForMonth(
    rules: BudgetRule[],
    type: 'income' | 'expense',
    monthIso: string
  ): number {
    return rules
      .filter((r) => r.type === type)
      .reduce((sum, r) => sum + CalculationEngine.plannedAmountForMonth(r, monthIso), 0);
  }
}
