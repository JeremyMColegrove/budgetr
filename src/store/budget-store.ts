// ============================================================================
// BUDGET STORE - Zustand State Management
// ============================================================================
// Manages Budget Profiles and Transaction Rules with localStorage persistence.
// ============================================================================

import { storage } from '@/lib/storage';
import type {
  Account,
  AccountFormData,
  BudgetProfile,
  BudgetRule,
  BudgetRuleFormData,
  Frequency,
} from '@/types/budget';
import { create } from 'zustand';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const STORAGE_KEY = 'profiles';
const ACTIVE_PROFILE_KEY = 'active_profile_id';

// Monthly multipliers for frequency normalization
const FREQUENCY_TO_MONTHLY: Record<Frequency, number> = {
  weekly: 4.33,
  'bi-weekly': 2.17,
  monthly: 1,
  yearly: 1 / 12,
};

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/** Generate a unique ID */
function generateId(): string {
  return crypto.randomUUID();
}

/** Get current ISO timestamp */
function now(): string {
  return new Date().toISOString();
}

/** Calculate monthly normalized amount for a rule */
export function getMonthlyNormalizedAmount(rule: BudgetRule): number {
  if (!rule.isRecurring || !rule.frequency) {
    return rule.amount; // Non-recurring = one-time, treat as monthly
  }
  return rule.amount * FREQUENCY_TO_MONTHLY[rule.frequency];
}

/** Create a default profile */
function createDefaultProfile(): BudgetProfile {
  return {
    id: generateId(),
    name: 'My Budget',
    accounts: [],
    rules: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

// ----------------------------------------------------------------------------
// Store Interface
// ----------------------------------------------------------------------------

interface BudgetStore {
  // State
  profiles: BudgetProfile[];
  activeProfileId: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Initialization
  initialize: () => Promise<void>;

  // Profile CRUD
  createProfile: (name: string) => Promise<BudgetProfile>;
  updateProfile: (id: string, name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (id: string) => void;
  duplicateProfile: (id: string) => Promise<BudgetProfile>;

  // Rule CRUD
  addRule: (data: BudgetRuleFormData) => Promise<BudgetRule>;
  updateRule: (ruleId: string, data: Partial<BudgetRuleFormData>) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;

  // Account CRUD
  addAccount: (data: AccountFormData) => Promise<Account>;
  updateAccount: (id: string, data: Partial<AccountFormData>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Computed Getters
  getActiveProfile: () => BudgetProfile | null;
  getAccounts: () => Account[];
  getAccountById: (id: string) => Account | undefined;
  getRulesForAccount: (accountId: string) => BudgetRule[];
  getNetWorth: () => number;
  getAmountLeftToAllocate: () => number;
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
}

// ----------------------------------------------------------------------------
// Store Implementation
// ----------------------------------------------------------------------------

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  // Initial State
  profiles: [],
  activeProfileId: null,
  isLoading: true,
  isInitialized: false,

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      // Load profiles from storage
      let profiles = await storage.get<BudgetProfile[]>(STORAGE_KEY);
      let activeProfileId = await storage.get<string>(ACTIVE_PROFILE_KEY);

      // Create default profile if none exist
      if (!profiles || profiles.length === 0) {
        const defaultProfile = createDefaultProfile();
        profiles = [defaultProfile];
        activeProfileId = defaultProfile.id;
        await storage.set(STORAGE_KEY, profiles);
        await storage.set(ACTIVE_PROFILE_KEY, activeProfileId);
      }

      // Validate active profile exists
      if (!activeProfileId || !profiles.find((p) => p.id === activeProfileId)) {
        activeProfileId = profiles[0].id;
        await storage.set(ACTIVE_PROFILE_KEY, activeProfileId);
      }

      set({
        profiles,
        activeProfileId,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to initialize budget store:', error);
      // Create default state on error
      const defaultProfile = createDefaultProfile();
      set({
        profiles: [defaultProfile],
        activeProfileId: defaultProfile.id,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  // --------------------------------------------------------------------------
  // Profile CRUD
  // --------------------------------------------------------------------------

  createProfile: async (name: string) => {
    const profile: BudgetProfile = {
      id: generateId(),
      name,
      accounts: [],
      rules: [],
      createdAt: now(),
      updatedAt: now(),
    };

    const profiles = [...get().profiles, profile];
    await storage.set(STORAGE_KEY, profiles);
    set({ profiles, activeProfileId: profile.id });
    await storage.set(ACTIVE_PROFILE_KEY, profile.id);

    return profile;
  },

  updateProfile: async (id: string, name: string) => {
    const profiles = get().profiles.map((p) =>
      p.id === id ? { ...p, name, updatedAt: now() } : p
    );
    await storage.set(STORAGE_KEY, profiles);
    set({ profiles });
  },

  deleteProfile: async (id: string) => {
    const currentProfiles = get().profiles;
    if (currentProfiles.length <= 1) {
      throw new Error('Cannot delete the last profile');
    }

    const profiles = currentProfiles.filter((p) => p.id !== id);
    await storage.set(STORAGE_KEY, profiles);

    // Update active profile if deleted
    let { activeProfileId } = get();
    if (activeProfileId === id) {
      activeProfileId = profiles[0].id;
      await storage.set(ACTIVE_PROFILE_KEY, activeProfileId);
    }

    set({ profiles, activeProfileId });
  },

  setActiveProfile: (id: string) => {
    set({ activeProfileId: id });
    storage.set(ACTIVE_PROFILE_KEY, id);
  },

  duplicateProfile: async (id: string) => {
    const source = get().profiles.find((p) => p.id === id);
    if (!source) throw new Error('Profile not found');

    const duplicate: BudgetProfile = {
      ...source,
      id: generateId(),
      name: `${source.name} (Copy)`,
      rules: source.rules.map((r) => ({
        ...r,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      })),
      createdAt: now(),
      updatedAt: now(),
    };

    const profiles = [...get().profiles, duplicate];
    await storage.set(STORAGE_KEY, profiles);
    set({ profiles, activeProfileId: duplicate.id });
    await storage.set(ACTIVE_PROFILE_KEY, duplicate.id);

    return duplicate;
  },

  // --------------------------------------------------------------------------
  // Rule CRUD
  // --------------------------------------------------------------------------

  addRule: async (data: BudgetRuleFormData) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const rule: BudgetRule = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? { ...p, rules: [...p.rules, rule], updatedAt: now() }
        : p
    );

    await storage.set(STORAGE_KEY, updatedProfiles);
    set({ profiles: updatedProfiles });

    return rule;
  },

  updateRule: async (ruleId: string, data: Partial<BudgetRuleFormData>) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            rules: p.rules.map((r) =>
              r.id === ruleId ? { ...r, ...data, updatedAt: now() } : r
            ),
            updatedAt: now(),
          }
        : p
    );

    await storage.set(STORAGE_KEY, updatedProfiles);
    set({ profiles: updatedProfiles });
  },

  deleteRule: async (ruleId: string) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            rules: p.rules.filter((r) => r.id !== ruleId),
            updatedAt: now(),
          }
        : p
    );

    await storage.set(STORAGE_KEY, updatedProfiles);
    set({ profiles: updatedProfiles });
  },

  // --------------------------------------------------------------------------
  // Account CRUD
  // --------------------------------------------------------------------------

  addAccount: async (data: AccountFormData) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const account: Account = {
      ...data,
      id: generateId(),
      createdAt: now(),
    };

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? { ...p, accounts: [...p.accounts, account], updatedAt: now() }
        : p
    );

    await storage.set(STORAGE_KEY, updatedProfiles);
    set({ profiles: updatedProfiles });

    return account;
  },

  updateAccount: async (id: string, data: Partial<AccountFormData>) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            accounts: p.accounts.map((a) =>
              a.id === id ? { ...a, ...data } : a
            ),
            updatedAt: now(),
          }
        : p
    );

    await storage.set(STORAGE_KEY, updatedProfiles);
    set({ profiles: updatedProfiles });
  },

  deleteAccount: async (id: string) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    // Check if any rules are linked to this account
    const linkedRules = get().getRulesForAccount(id);
    if (linkedRules.length > 0) {
      throw new Error(
        `Cannot delete account: ${linkedRules.length} budget rule(s) are linked to this account. ` +
        `Please unlink or delete those rules first.`
      );
    }

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            accounts: p.accounts.filter((a) => a.id !== id),
            updatedAt: now(),
          }
        : p
    );

    await storage.set(STORAGE_KEY, updatedProfiles);
    set({ profiles: updatedProfiles });
  },

  // --------------------------------------------------------------------------
  // Computed Getters
  // --------------------------------------------------------------------------

  getActiveProfile: () => {
    const { profiles, activeProfileId } = get();
    return profiles.find((p) => p.id === activeProfileId) ?? null;
  },

  getAccounts: () => {
    const profile = get().getActiveProfile();
    return profile?.accounts ?? [];
  },

  getAccountById: (id: string) => {
    const accounts = get().getAccounts();
    return accounts.find((a) => a.id === id);
  },

  getRulesForAccount: (accountId: string) => {
    const profile = get().getActiveProfile();
    if (!profile) return [];
    // Match rules where accountId OR toAccountId equals the target
    return profile.rules.filter((r) => r.accountId === accountId || r.toAccountId === accountId);
  },

  getNetWorth: () => {
    const accounts = get().getAccounts();
    // Liabilities are stored as negative, so simple sum gives net worth
    return accounts.reduce((sum, account) => sum + account.startingBalance, 0);
  },

  getTotalIncome: () => {
    const profile = get().getActiveProfile();
    if (!profile) return 0;

    return profile.rules
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + getMonthlyNormalizedAmount(r), 0);
  },

  getTotalExpenses: () => {
    const profile = get().getActiveProfile();
    if (!profile) return 0;

    return profile.rules
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + getMonthlyNormalizedAmount(r), 0);
  },

  getAmountLeftToAllocate: () => {
    const totalIncome = get().getTotalIncome();
    const totalExpenses = get().getTotalExpenses();
    return totalIncome - totalExpenses;
  },
}));

