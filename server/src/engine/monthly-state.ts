// ============================================================================
// MONTHLY STATE RESOLVER
// ============================================================================
// Combines budget rules + ledger entries into a UI-ready monthly state.

import { db } from '../database/db.js';
import type {
  BudgetRule,
  BudgetRuleRow,
  CategoryKind,
  CategoryRow,
  LedgerEntryRow,
} from '../types/index.js';
import { CalculationEngine } from './CalculationEngine.js';

export interface MonthlyState {
  monthIso: string;
  summary: {
    income: number;
    totalPlannedExpenses: number;
    totalActualSpent: number;
    safeToSpend: number;
  };
  bills: Array<{
    ruleId: string;
    label: string;
    planned: number;
    actual: number | null;
    isPaid: boolean;
    dueDate?: number;
  }>;
  spending: Array<{
    ruleId: string;
    label: string;
    planned: number;
    spent: number;
    remaining: number;
    transactionCount: number;
  }>;
}

function mapBudgetRuleRow(row: BudgetRuleRow): BudgetRule {
  return {
    id: row.id,
    label: row.label,
    amount: row.amount,
    type: row.type,
    accountId: row.account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    category: row.category,
    categoryKind: row.category_kind ?? undefined,
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

function getCategoryKindMap(userId: string): Map<string, CategoryKind> {
  const rows = db
    .prepare('SELECT * FROM categories WHERE user_id = ?')
    .all(userId) as CategoryRow[];

  const map = new Map<string, CategoryKind>();
  rows.forEach((row) => {
    map.set(row.name, row.kind);
  });

  return map;
}

export function getMonthlyState(profileId: string, monthIso: string, userId: string): MonthlyState {
  const ruleRows = db
    .prepare(
      `SELECT * FROM budget_rules
       WHERE profile_id = ?
       AND user_id = ?
       AND start_month <= ?
       AND (end_month IS NULL OR end_month >= ?)
       ORDER BY created_at ASC`
    )
    .all(profileId, userId, monthIso, monthIso) as BudgetRuleRow[];

  const ledgerRows = db
    .prepare(
      `SELECT * FROM ledger_entries
       WHERE profile_id = ?
       AND user_id = ?
       AND month_iso = ?`
    )
    .all(profileId, userId, monthIso) as LedgerEntryRow[];

  const rules = ruleRows.map(mapBudgetRuleRow);
  const categoryKinds = getCategoryKindMap(userId);

  const rulePlanned = new Map<string, number>();
  const incomePlanned = rules
    .filter((rule) => rule.type === 'income')
    .reduce((sum, rule) => {
      const planned = CalculationEngine.plannedAmountForMonth(rule, monthIso);
      rulePlanned.set(rule.id, planned);
      return sum + planned;
    }, 0);

  const expenseRules = rules.filter((rule) => rule.type === 'expense');
  expenseRules.forEach((rule) => {
    rulePlanned.set(rule.id, CalculationEngine.plannedAmountForMonth(rule, monthIso));
  });

  const ledgerByRule = new Map<string, LedgerEntryRow[]>();
  ledgerRows.forEach((entry) => {
    const list = ledgerByRule.get(entry.rule_id) ?? [];
    list.push(entry);
    ledgerByRule.set(entry.rule_id, list);
  });

  const bills: MonthlyState['bills'] = [];
  const spending: MonthlyState['spending'] = [];

  expenseRules.forEach((rule) => {
    const kind = rule.categoryKind ?? categoryKinds.get(rule.category) ?? 'spending';
    const planned = rulePlanned.get(rule.id) ?? rule.amount;
    const entries = ledgerByRule.get(rule.id) ?? [];
    const totalSpent = entries.reduce((sum, entry) => sum + entry.amount, 0);

    if (kind === 'bill') {
      const firstEntry = entries[0];
      bills.push({
        ruleId: rule.id,
        label: rule.label,
        planned,
        actual: entries.length > 0 ? firstEntry.amount : null,
        isPaid: entries.length > 0,
        dueDate: rule.startDate ? new Date(rule.startDate).getDate() : undefined,
      });
      return;
    }

    spending.push({
      ruleId: rule.id,
      label: rule.label,
      planned,
      spent: totalSpent,
      remaining: planned - totalSpent,
      transactionCount: entries.length,
    });
  });

  const totalPlannedExpenses = expenseRules.reduce((sum, rule) => sum + (rulePlanned.get(rule.id) ?? rule.amount), 0);
  const totalActualSpent = ledgerRows.reduce((sum, entry) => sum + entry.amount, 0);
  const remainingBills = bills.reduce((sum, bill) => sum + (bill.isPaid ? 0 : bill.planned), 0);

  return {
    monthIso,
    summary: {
      income: incomePlanned,
      totalPlannedExpenses,
      totalActualSpent,
      safeToSpend: incomePlanned - (totalActualSpent + remainingBills),
    },
    bills,
    spending,
  };
}
