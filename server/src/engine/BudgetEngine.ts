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
import { AccountManager } from './AccountManager.js';
import { ProjectionEngine } from './ProjectionEngine.js';
import { RuleManager } from './RuleManager.js';

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
    const projections = ProjectionEngine.calculateAllProjections(accounts, rules, months);

    // Build response with accounts and their projections
    const accountsWithProjections: AccountWithProjection[] = accounts.map((account) => ({
      account,
      projection: projections.get(account.id)!,
    }));

    // Calculate net worth analysis
    const netWorthAnalysis: NetWorthAnalysis = {
      currentNetWorth: this.accountManager.getNetWorth(),
      currentAssets: this.accountManager.getTotalAssets(),
      currentLiabilities: this.accountManager.getTotalLiabilities(),
      projectedNetWorth: ProjectionEngine.getProjectedNetWorth(projections),
      projectedAssets: ProjectionEngine.getProjectedAssets(accounts, projections),
      projectedLiabilities: ProjectionEngine.getProjectedLiabilities(accounts, projections),
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
    const rules = this.ruleManager.getRules();
    const projections = ProjectionEngine.calculateAllProjections(accounts, rules, months);

    return {
      currentNetWorth: this.accountManager.getNetWorth(),
      currentAssets: this.accountManager.getTotalAssets(),
      currentLiabilities: this.accountManager.getTotalLiabilities(),
      projectedNetWorth: ProjectionEngine.getProjectedNetWorth(projections),
      projectedAssets: ProjectionEngine.getProjectedAssets(accounts, projections),
      projectedLiabilities: ProjectionEngine.getProjectedLiabilities(accounts, projections),
      projectionMonths: months,
    };
  }

  /**
   * Static method to create a BudgetEngine instance
   */
  static forProfile(profileId: string): BudgetEngine {
    return new BudgetEngine(profileId);
  }
}
