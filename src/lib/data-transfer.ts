// ============================================================================
// DATA TRANSFER LAYER - API-Style Import/Export
// ============================================================================
// Follows the StorageAdapter pattern for consistent API design.
// Schema-versioned exports enable future migrations.
// ============================================================================

import { useBudgetStore } from '@/store/budget-store';
import type { BudgetProfile, BudgetRule } from '@/types/budget';

// ----------------------------------------------------------------------------
// Schema Version
// ----------------------------------------------------------------------------

/** Current export schema version - increment on breaking changes */
export const SCHEMA_VERSION = '1.0.0';

// ----------------------------------------------------------------------------
// Export Types
// ----------------------------------------------------------------------------

export interface ExportData {
    version: string;
    exportedAt: string;
    profiles: BudgetProfile[];
    activeProfileId: string | null;
}

export interface ExportOptions {
    /** If provided, export only this profile */
    profileId?: string;
}

// ----------------------------------------------------------------------------
// Import Types
// ----------------------------------------------------------------------------

export type ImportMode = 'replace' | 'merge';
export type ConflictResolution = 'skip' | 'overwrite' | 'rename';

export interface ImportOptions {
    mode: ImportMode;
    conflictResolution: ConflictResolution;
}

export interface ImportResult {
    success: boolean;
    profilesImported: number;
    rulesImported: number;
    accountsImported: number;
    profilesSkipped: number;
    errors: string[];
    warnings: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    data: ExportData | null;
}

// ----------------------------------------------------------------------------
// Data Transfer Adapter Interface
// ----------------------------------------------------------------------------

export interface DataTransferAdapter {
    exportAll(): Promise<ExportData>;
    exportProfile(profileId: string): Promise<ExportData>;
    validateImport(data: unknown): ValidationResult;
    importData(data: ExportData, options: ImportOptions): Promise<ImportResult>;
    downloadExport(data: ExportData, filename?: string): void;
}

// ----------------------------------------------------------------------------
// Validation Helpers
// ----------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidProfile(profile: unknown): profile is BudgetProfile {
    if (!isObject(profile)) return false;
    return (
        typeof profile.id === 'string' &&
        typeof profile.name === 'string' &&
        Array.isArray(profile.rules) &&
        Array.isArray(profile.accounts)
    );
}

function isValidRule(rule: unknown): rule is BudgetRule {
    if (!isObject(rule)) return false;
    return (
        typeof rule.id === 'string' &&
        typeof rule.label === 'string' &&
        typeof rule.amount === 'number' &&
        (rule.type === 'income' || rule.type === 'expense')
    );
}

function validateExportData(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isObject(data)) {
        return { valid: false, errors: ['Invalid data format: expected object'], warnings: [], data: null };
    }

    // Check version
    if (typeof data.version !== 'string') {
        errors.push('Missing or invalid version field');
    } else if (data.version !== SCHEMA_VERSION) {
        warnings.push(`Version mismatch: expected ${SCHEMA_VERSION}, got ${data.version}`);
    }

    // Check exportedAt
    if (typeof data.exportedAt !== 'string') {
        warnings.push('Missing exportedAt timestamp');
    }

    // Check profiles
    if (!Array.isArray(data.profiles)) {
        errors.push('Missing or invalid profiles array');
    } else {
        data.profiles.forEach((profile, index) => {
            if (!isValidProfile(profile)) {
                errors.push(`Invalid profile at index ${index}`);
            } else {
                profile.rules.forEach((rule, ruleIndex) => {
                    if (!isValidRule(rule)) {
                        errors.push(`Invalid rule at profile[${index}].rules[${ruleIndex}]`);
                    }
                });
            }
        });
    }

    // Check activeProfileId
    if (data.activeProfileId !== null && typeof data.activeProfileId !== 'string') {
        errors.push('Invalid activeProfileId: expected string or null');
    }

    if (errors.length > 0) {
        return { valid: false, errors, warnings, data: null };
    }

    return {
        valid: true,
        errors: [],
        warnings,
        data: data as unknown as ExportData,
    };
}

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

function renameProfile(name: string, existingNames: Set<string>): string {
    let newName = name;
    let counter = 1;
    while (existingNames.has(newName)) {
        newName = `${name} (${counter})`;
        counter++;
    }
    return newName;
}

export const dataTransfer: DataTransferAdapter = {
    async exportAll(): Promise<ExportData> {
        const store = useBudgetStore.getState();
        
        return {
            version: SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            profiles: store.profiles,
            activeProfileId: store.activeProfileId,
        };
    },

    async exportProfile(profileId: string): Promise<ExportData> {
        const store = useBudgetStore.getState();
        const profile = store.profiles.find(p => p.id === profileId);

        if (!profile) {
            throw new Error(`Profile not found: ${profileId}`);
        }

        return {
            version: SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            profiles: [profile],
            activeProfileId: null,
        };
    },

    validateImport(data: unknown): ValidationResult {
        return validateExportData(data);
    },

    async importData(data: ExportData, options: ImportOptions): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            profilesImported: 0,
            rulesImported: 0,
            accountsImported: 0,
            profilesSkipped: 0,
            errors: [],
            warnings: [],
        };

        try {
            const store = useBudgetStore.getState();

            if (options.mode === 'replace') {
                // Delete all existing profiles first
                const existingProfiles = [...store.profiles];
                for (const profile of existingProfiles) {
                    try {
                        await store.deleteProfile(profile.id);
                    } catch (error) {
                        // Ignore errors for last profile deletion
                    }
                }

                // Import all profiles
                for (const importProfile of data.profiles) {
                    try {
                        // Create profile
                        const newProfile = await store.createProfile(importProfile.name);
                        
                        // Create account ID mapping (old ID -> new ID)
                        const accountIdMap = new Map<string, string>();
                        
                        // Import accounts and build mapping
                        for (const account of importProfile.accounts) {
                            const newAccount = await store.addAccount({
                                name: account.name,
                                type: account.type,
                                startingBalance: account.startingBalance,
                            });
                            accountIdMap.set(account.id, newAccount.id);
                            result.accountsImported++;
                        }

                        // Import rules with mapped account IDs
                        for (const rule of importProfile.rules) {
                            await store.addRule({
                                label: rule.label,
                                amount: rule.amount,
                                type: rule.type,
                                accountId: rule.accountId ? accountIdMap.get(rule.accountId) : undefined,
                                toAccountId: rule.toAccountId ? accountIdMap.get(rule.toAccountId) : undefined,
                                category: rule.category,
                                notes: rule.notes,
                                isRecurring: rule.isRecurring,
                                frequency: rule.frequency,
                                startDate: rule.startDate,
                            });
                            result.rulesImported++;
                        }

                        result.profilesImported++;

                        // Set as active if it was the active profile
                        if (data.activeProfileId === importProfile.id) {
                            store.setActiveProfile(newProfile.id);
                        }
                    } catch (error) {
                        result.errors.push(`Failed to import profile "${importProfile.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }

                // If no active profile was set, use the first imported one
                if (data.profiles.length > 0 && !data.activeProfileId) {
                    const firstProfile = store.profiles[0];
                    if (firstProfile) {
                        store.setActiveProfile(firstProfile.id);
                    }
                }
            } else {
                // Merge mode
                const existingNames = new Set(store.profiles.map(p => p.name));

                for (const importProfile of data.profiles) {
                    const nameExists = existingNames.has(importProfile.name);

                    if (nameExists) {
                        switch (options.conflictResolution) {
                            case 'skip':
                                result.profilesSkipped++;
                                result.warnings.push(`Skipped profile: ${importProfile.name}`);
                                break;

                            case 'overwrite': {
                                const existing = store.profiles.find(p => p.name === importProfile.name);
                                if (existing) {
                                    try {
                                        // Delete existing profile
                                        await store.deleteProfile(existing.id);
                                        
                                        // Create new profile with imported data
                                        void await store.createProfile(importProfile.name);
                                        
                                        // Create account ID mapping
                                        const accountIdMap = new Map<string, string>();
                                        
                                        // Import accounts and build mapping
                                        for (const account of importProfile.accounts) {
                                            const newAccount = await store.addAccount({
                                                name: account.name,
                                                type: account.type,
                                                startingBalance: account.startingBalance,
                                            });
                                            accountIdMap.set(account.id, newAccount.id);
                                            result.accountsImported++;
                                        }

                                        // Import rules with mapped account IDs
                                        for (const rule of importProfile.rules) {
                                            await store.addRule({
                                                label: rule.label,
                                                amount: rule.amount,
                                                type: rule.type,
                                                accountId: rule.accountId ? accountIdMap.get(rule.accountId) : undefined,
                                                toAccountId: rule.toAccountId ? accountIdMap.get(rule.toAccountId) : undefined,
                                                category: rule.category,
                                                notes: rule.notes,
                                                isRecurring: rule.isRecurring,
                                                frequency: rule.frequency,
                                                startDate: rule.startDate,
                                            });
                                            result.rulesImported++;
                                        }

                                        result.profilesImported++;
                                        result.warnings.push(`Overwrote profile: ${importProfile.name}`);
                                    } catch (error) {
                                        result.errors.push(`Failed to overwrite profile "${importProfile.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    }
                                }
                                break;
                            }

                            case 'rename': {
                                const newName = renameProfile(importProfile.name, existingNames);
                                try {
                                    void await store.createProfile(newName);
                                    
                                    // Create account ID mapping
                                    const accountIdMap = new Map<string, string>();
                                    
                                    // Import accounts and build mapping
                                    for (const account of importProfile.accounts) {
                                        const newAccount = await store.addAccount({
                                            name: account.name,
                                            type: account.type,
                                            startingBalance: account.startingBalance,
                                        });
                                        accountIdMap.set(account.id, newAccount.id);
                                        result.accountsImported++;
                                    }

                                    // Import rules with mapped account IDs
                                    for (const rule of importProfile.rules) {
                                        await store.addRule({
                                            label: rule.label,
                                            amount: rule.amount,
                                            type: rule.type,
                                            accountId: rule.accountId ? accountIdMap.get(rule.accountId) : undefined,
                                            toAccountId: rule.toAccountId ? accountIdMap.get(rule.toAccountId) : undefined,
                                            category: rule.category,
                                            notes: rule.notes,
                                            isRecurring: rule.isRecurring,
                                            frequency: rule.frequency,
                                            startDate: rule.startDate,
                                        });
                                        result.rulesImported++;
                                    }

                                    existingNames.add(newName);
                                    result.profilesImported++;
                                    result.warnings.push(`Renamed "${importProfile.name}" to "${newName}"`);
                                } catch (error) {
                                    result.errors.push(`Failed to import profile "${importProfile.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
                                }
                                break;
                            }
                        }
                    } else {
                        // No conflict, just import
                        try {
                            void await store.createProfile(importProfile.name);
                            
                            // Create account ID mapping
                            const accountIdMap = new Map<string, string>();
                            
                            // Import accounts and build mapping
                            for (const account of importProfile.accounts) {
                                const newAccount = await store.addAccount({
                                    name: account.name,
                                    type: account.type,
                                    startingBalance: account.startingBalance,
                                });
                                accountIdMap.set(account.id, newAccount.id);
                                result.accountsImported++;
                            }

                            // Import rules with mapped account IDs
                            for (const rule of importProfile.rules) {
                                await store.addRule({
                                    label: rule.label,
                                    amount: rule.amount,
                                    type: rule.type,
                                    accountId: rule.accountId ? accountIdMap.get(rule.accountId) : undefined,
                                    toAccountId: rule.toAccountId ? accountIdMap.get(rule.toAccountId) : undefined,
                                    category: rule.category,
                                    notes: rule.notes,
                                    isRecurring: rule.isRecurring,
                                    frequency: rule.frequency,
                                    startDate: rule.startDate,
                                });
                                result.rulesImported++;
                            }

                            existingNames.add(importProfile.name);
                            result.profilesImported++;
                        } catch (error) {
                            result.errors.push(`Failed to import profile "${importProfile.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                    }
                }
            }

            result.success = result.errors.length === 0;
        } catch (error) {
            result.errors.push(error instanceof Error ? error.message : 'Unknown error during import');
        }

        return result;
    },

    downloadExport(data: ExportData, filename?: string): void {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename ?? `budget-blueprint-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
};
