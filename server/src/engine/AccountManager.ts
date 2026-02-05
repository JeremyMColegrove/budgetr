// ============================================================================
// ACCOUNT MANAGER
// ============================================================================
// Handles all account-related operations and calculations

import { db } from '../database/db.js';
import type { Account, AccountRow } from '../types/index.js';
import { ASSET_ACCOUNT_TYPES, LIABILITY_ACCOUNT_TYPES } from '../types/index.js';

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

function mapAccountRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startingBalance: row.starting_balance,
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------------
// AccountManager Class
// ----------------------------------------------------------------------------

export class AccountManager {
  private profileId: string;

  constructor(profileId: string) {
    this.profileId = profileId;
  }

  /**
   * Get all accounts for the profile
   */
  getAccounts(): Account[] {
    const rows = db
      .prepare('SELECT * FROM accounts WHERE profile_id = ? ORDER BY created_at ASC')
      .all(this.profileId) as AccountRow[];

    return rows.map(mapAccountRow);
  }

  /**
   * Get a single account by ID
   */
  getAccountById(accountId: string): Account | null {
    const row = db
      .prepare('SELECT * FROM accounts WHERE id = ? AND profile_id = ?')
      .get(accountId, this.profileId) as AccountRow | undefined;

    return row ? mapAccountRow(row) : null;
  }

  /**
   * Get all asset accounts (checking, savings, investment)
   */
  getAssetAccounts(): Account[] {
    return this.getAccounts().filter((a) => ASSET_ACCOUNT_TYPES.includes(a.type));
  }

  /**
   * Get all liability accounts (credit_card, loan)
   */
  getLiabilityAccounts(): Account[] {
    return this.getAccounts().filter((a) => LIABILITY_ACCOUNT_TYPES.includes(a.type));
  }

  /**
   * Calculate total assets
   * Assets have positive balances
   */
  getTotalAssets(): number {
    return this.getAssetAccounts().reduce((sum, a) => sum + a.startingBalance, 0);
  }

  /**
   * Calculate total liabilities
   * Liabilities are stored as negative balances
   */
  getTotalLiabilities(): number {
    return this.getLiabilityAccounts().reduce((sum, a) => sum + a.startingBalance, 0);
  }

  /**
   * Calculate net worth
   * Net Worth = Total Assets + Total Liabilities (liabilities are negative)
   */
  getNetWorth(): number {
    return this.getAccounts().reduce((sum, a) => sum + a.startingBalance, 0);
  }

  /**
   * Check if an account exists
   */
  accountExists(accountId: string): boolean {
    return this.getAccountById(accountId) !== null;
  }

  /**
   * Get account count
   */
  getAccountCount(): number {
    return this.getAccounts().length;
  }
}
