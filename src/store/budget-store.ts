// ============================================================================
// BUDGET STORE - Zustand State Management
// ============================================================================
// Manages Budget Profiles and Transaction Rules with API persistence.
// ============================================================================

import { accountsApi, profilesApi, rulesApi } from '@/lib/api-client';
import type {
    Account,
    AccountFormData,
    BudgetProfile,
    BudgetRule,
    BudgetRuleFormData
} from '@/types/budget';
import { create } from 'zustand';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const ACTIVE_PROFILE_KEY = 'active_profile_id';

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
      // Load profiles from API
      const profiles = await profilesApi.list();

      // Create default profile if none exist
      let finalProfiles = profiles;
      let finalActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY);

      if (!finalProfiles || finalProfiles.length === 0) {
        const defaultProfile = await profilesApi.create('My Budget');
        finalProfiles = [defaultProfile];
        finalActiveId = defaultProfile.id;
        localStorage.setItem(ACTIVE_PROFILE_KEY, finalActiveId);
      }

      // Validate active profile exists
      if (!finalActiveId || !finalProfiles?.find((p) => p.id === finalActiveId)) {
        finalActiveId = finalProfiles[0].id;
        localStorage.setItem(ACTIVE_PROFILE_KEY, finalActiveId);
      }

      set({
        profiles: finalProfiles,
        activeProfileId: finalActiveId,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to initialize budget store:', error);
      set({
        profiles: [],
        activeProfileId: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  // --------------------------------------------------------------------------
  // Profile CRUD
  // --------------------------------------------------------------------------

  createProfile: async (name: string) => {
    const profile = await profilesApi.create(name);
    const profiles = [...get().profiles, profile];
    set({ profiles, activeProfileId: profile.id });
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    return profile;
  },

  updateProfile: async (id: string, name: string) => {
    const updatedProfile = await profilesApi.update(id, name);
    const profiles = get().profiles.map((p) => p.id === id ? updatedProfile : p);
    set({ profiles });
  },

  deleteProfile: async (id: string) => {
    const currentProfiles = get().profiles;
    if (currentProfiles.length <= 1) {
      throw new Error('Cannot delete the last profile');
    }

    await profilesApi.delete(id);
    const profiles = currentProfiles.filter((p) => p.id !== id);

    // Update active profile if deleted
    let { activeProfileId } = get();
    if (activeProfileId === id) {
      activeProfileId = profiles[0].id;
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    }

    set({ profiles, activeProfileId });
  },

  setActiveProfile: (id: string) => {
    set({ activeProfileId: id });
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  },

  duplicateProfile: async (id: string) => {
    const duplicate = await profilesApi.duplicate(id);
    const profiles = [...get().profiles, duplicate];
    set({ profiles, activeProfileId: duplicate.id });
    localStorage.setItem(ACTIVE_PROFILE_KEY, duplicate.id);
    return duplicate;
  },

  // --------------------------------------------------------------------------
  // Rule CRUD
  // --------------------------------------------------------------------------

  addRule: async (data: BudgetRuleFormData) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const rule = await rulesApi.create(activeProfileId, data);

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? { ...p, rules: [...p.rules, rule] }
        : p
    );

    set({ profiles: updatedProfiles });
    return rule;
  },

  updateRule: async (ruleId: string, data: Partial<BudgetRuleFormData>) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const updatedRule = await rulesApi.update(ruleId, data);

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            rules: p.rules.map((r) => r.id === ruleId ? updatedRule : r),
          }
        : p
    );

    set({ profiles: updatedProfiles });
  },

  deleteRule: async (ruleId: string) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    await rulesApi.delete(ruleId);

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? { ...p, rules: p.rules.filter((r) => r.id !== ruleId) }
        : p
    );

    set({ profiles: updatedProfiles });
  },

  // --------------------------------------------------------------------------
  // Account CRUD
  // --------------------------------------------------------------------------

  addAccount: async (data: AccountFormData) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const account = await accountsApi.create(activeProfileId, data);

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? { ...p, accounts: [...p.accounts, account] }
        : p
    );

    set({ profiles: updatedProfiles });
    return account;
  },

  updateAccount: async (id: string, data: Partial<AccountFormData>) => {
    const { activeProfileId, profiles } = get();
    if (!activeProfileId) throw new Error('No active profile');

    const updatedAccount = await accountsApi.update(id, data);

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            accounts: p.accounts.map((a) => a.id === id ? updatedAccount : a),
          }
        : p
    );

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

    await accountsApi.delete(id);

    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId
        ? { ...p, accounts: p.accounts.filter((a) => a.id !== id) }
        : p
    );

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
}));

