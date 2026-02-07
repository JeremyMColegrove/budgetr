// ============================================================================
// BUDGET ENGINE
// ============================================================================
// Main orchestrator class that coordinates all budget operations

import { db } from '../database/db.js';
import type {
    AccountsWithProjectionsResponse,
    AccountWithProjection,
    NetWorthAnalysis,
    ProfileSummary,
} from '../types/engine.js';
import type { ProfileRow } from '../types/index.js';
import { ASSET_ACCOUNT_TYPES } from '../types/index.js';
import { AccountManager } from './AccountManager.js';
import { ProjectionEngine } from './ProjectionEngine.js';
import { RuleManager } from './RuleManager.js';
import { getCurrentMonth } from '../utils/date-utils.js';

// ----------------------------------------------------------------------------
// BudgetEngine Class
// ----------------------------------------------------------------------------

export class BudgetEngine {
  private profileId: string;
  private accountManager: AccountManager;
  private ruleManager: RuleManager;

  constructor(profileId: string) {
    this.profileId = profileId;
    this.accountManager = new AccountManager(profileId);
    this.ruleManager = new RuleManager(profileId);
  }

  /**
   * Get a complete profile summary with all calculated values
   */
  getProfileSummary(): ProfileSummary {
    // Get profile name
    const profile = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(this.profileId) as ProfileRow | undefined;

    if (!profile) {
      throw new Error('Profile not found');
    }

    return {
      profileId: this.profileId,
      profileName: profile.name,
      netWorth: this.accountManager.getNetWorth(),
      totalIncome: this.ruleManager.getTotalIncome(),
      totalExpenses: this.ruleManager.getTotalExpenses(),
      amountLeftToAllocate: this.ruleManager.getAmountLeftToAllocate(),
      accountCount: this.accountManager.getAccountCount(),
      ruleCount: this.ruleManager.getRuleCount(),
    };
  }

  /**
   * Get accounts with projections
   * Supports cross-budget projections by allowing a different budgetId for rules
   */
  getAccountsWithProjections(
    months: number,
    budgetId?: string
  ): AccountsWithProjectionsResponse {
    // Use specified budget for projections, or default to current profile
    const projectionBudgetId = budgetId ?? this.profileId;

    // Get accounts from current profile
    const accounts = this.accountManager.getAccounts();

    // Calculate current balances using ledger entries (actuals)
    const currentBalances = this.getCurrentBalances(accounts);

    // Get rules from the specified budget profile
    const ruleManager = new RuleManager(projectionBudgetId);
    const rules = ruleManager.getRules();

    // Get budget name
    const budgetProfile = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(projectionBudgetId) as ProfileRow | undefined;

    if (!budgetProfile) {
      throw new Error('Budget profile not found');
    }

    // Calculate projections
    const projectionAccounts = accounts.map((account) => ({
      ...account,
      startingBalance: currentBalances.get(account.id) ?? account.startingBalance,
    }));

    const projections = ProjectionEngine.calculateAllProjections(projectionAccounts, rules, months);

    // Build response with accounts and their projections
    const accountsWithProjections: AccountWithProjection[] = accounts.map((account) => ({
      account,
      projection: projections.get(account.id)!,
    }));

    // Calculate net worth analysis
    const netWorthAnalysis: NetWorthAnalysis = {
      currentNetWorth: this.sumBalances(accounts, currentBalances),
      currentAssets: this.sumBalances(accounts, currentBalances, true),
      currentLiabilities: this.sumBalances(accounts, currentBalances, false),
      projectedNetWorth: ProjectionEngine.getProjectedNetWorth(projections),
      projectedAssets: ProjectionEngine.getProjectedAssets(projectionAccounts, projections),
      projectedLiabilities: ProjectionEngine.getProjectedLiabilities(projectionAccounts, projections),
      projectionMonths: months,
    };

    return {
      accounts: accountsWithProjections,
      netWorthAnalysis,
      budgetId: projectionBudgetId,
      budgetName: budgetProfile.name,
    };
  }

  /**
   * Get net worth analysis with projections
   */
  getNetWorthAnalysis(months: number): NetWorthAnalysis {
    const accounts = this.accountManager.getAccounts();
    const currentBalances = this.getCurrentBalances(accounts);
    const rules = this.ruleManager.getRules();
    const projectionAccounts = accounts.map((account) => ({
      ...account,
      startingBalance: currentBalances.get(account.id) ?? account.startingBalance,
    }));
    const projections = ProjectionEngine.calculateAllProjections(projectionAccounts, rules, months);

    return {
      currentNetWorth: this.sumBalances(accounts, currentBalances),
      currentAssets: this.sumBalances(accounts, currentBalances, true),
      currentLiabilities: this.sumBalances(accounts, currentBalances, false),
      projectedNetWorth: ProjectionEngine.getProjectedNetWorth(projections),
      projectedAssets: ProjectionEngine.getProjectedAssets(projectionAccounts, projections),
      projectedLiabilities: ProjectionEngine.getProjectedLiabilities(projectionAccounts, projections),
      projectionMonths: months,
    };
  }

  private getCurrentBalances(accounts: { id: string; startingBalance: number }[]): Map<string, number> {
    const balances = new Map<string, number>();
    accounts.forEach((account) => balances.set(account.id, account.startingBalance));

    const ledgerRows = db.prepare(
      `SELECT le.amount, br.type, br.account_id, br.to_account_id
       FROM ledger_entries le
       JOIN budget_rules br ON br.id = le.rule_id AND br.profile_id = le.profile_id
       WHERE le.profile_id = ?
       AND le.month_iso <= ?`
    ).all(this.profileId, getCurrentMonth()) as Array<{
      amount: number;
      type: 'income' | 'expense';
      account_id: string | null;
      to_account_id: string | null;
    }>;

    ledgerRows.forEach((row) => {
      if (row.type === 'expense') {
        if (row.account_id && balances.has(row.account_id)) {
          balances.set(row.account_id, (balances.get(row.account_id) ?? 0) - row.amount);
        }
        if (row.to_account_id && balances.has(row.to_account_id)) {
          balances.set(row.to_account_id, (balances.get(row.to_account_id) ?? 0) + row.amount);
        }
        return;
      }

      if (row.type === 'income') {
        if (row.account_id && balances.has(row.account_id)) {
          balances.set(row.account_id, (balances.get(row.account_id) ?? 0) + row.amount);
        }
        if (row.to_account_id && balances.has(row.to_account_id)) {
          balances.set(row.to_account_id, (balances.get(row.to_account_id) ?? 0) - row.amount);
        }
      }
    });

    return balances;
  }

  private sumBalances(
    accounts: { id: string; type: string; startingBalance: number }[],
    balances: Map<string, number>,
    assetsOnly?: boolean
  ): number {
    return accounts.reduce((sum, account) => {
      if (assetsOnly === true && !ASSET_ACCOUNT_TYPES.includes(account.type as typeof ASSET_ACCOUNT_TYPES[number])) {
        return sum;
      }
      if (assetsOnly === false && ASSET_ACCOUNT_TYPES.includes(account.type as typeof ASSET_ACCOUNT_TYPES[number])) {
        return sum;
      }
      return sum + (balances.get(account.id) ?? account.startingBalance);
    }, 0);
  }

  /**
   * Static method to create a BudgetEngine instance
   */
  static forProfile(profileId: string): BudgetEngine {
    return new BudgetEngine(profileId);
  }
}
