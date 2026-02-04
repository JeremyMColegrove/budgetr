// ============================================================================
// DATA TRANSFER LAYER - API-Style Import/Export
// ============================================================================
// Follows the StorageAdapter pattern for consistent API design.
// Schema-versioned exports enable future migrations.
// ============================================================================

import { storage } from '@/lib/storage';
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

function generateId(): string {
    return crypto.randomUUID();
}

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
        const profiles = await storage.get<BudgetProfile[]>('profiles') ?? [];
        const activeProfileId = await storage.get<string>('activeProfileId');

        return {
            version: SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            profiles,
            activeProfileId: activeProfileId ?? null,
        };
    },

    async exportProfile(profileId: string): Promise<ExportData> {
        const profiles = await storage.get<BudgetProfile[]>('profiles') ?? [];
        const profile = profiles.find(p => p.id === profileId);

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
            profilesSkipped: 0,
            errors: [],
            warnings: [],
        };

        try {
            if (options.mode === 'replace') {
                // Replace all existing data
                await storage.set('profiles', data.profiles);
                if (data.activeProfileId && data.profiles.some(p => p.id === data.activeProfileId)) {
                    await storage.set('activeProfileId', data.activeProfileId);
                } else if (data.profiles.length > 0) {
                    await storage.set('activeProfileId', data.profiles[0].id);
                }

                result.profilesImported = data.profiles.length;
                result.rulesImported = data.profiles.reduce((sum, p) => sum + p.rules.length, 0);
            } else {
                // Merge with existing data
                const existingProfiles = await storage.get<BudgetProfile[]>('profiles') ?? [];
                const existingNames = new Set(existingProfiles.map(p => p.name));
                const existingIds = new Set(existingProfiles.map(p => p.id));

                const mergedProfiles = [...existingProfiles];

                for (const importProfile of data.profiles) {
                    const nameExists = existingNames.has(importProfile.name);
                    const idExists = existingIds.has(importProfile.id);

                    if (nameExists || idExists) {
                        switch (options.conflictResolution) {
                            case 'skip':
                                result.profilesSkipped++;
                                result.warnings.push(`Skipped profile: ${importProfile.name}`);
                                break;

                            case 'overwrite':
                                const existingIndex = mergedProfiles.findIndex(p => p.id === importProfile.id || p.name === importProfile.name);
                                if (existingIndex >= 0) {
                                    mergedProfiles[existingIndex] = importProfile;
                                    result.profilesImported++;
                                    result.rulesImported += importProfile.rules.length;
                                }
                                break;

                            case 'rename':
                                const newName = renameProfile(importProfile.name, existingNames);
                                const newId = idExists ? generateId() : importProfile.id;
                                mergedProfiles.push({
                                    ...importProfile,
                                    id: newId,
                                    name: newName,
                                });
                                existingNames.add(newName);
                                existingIds.add(newId);
                                result.profilesImported++;
                                result.rulesImported += importProfile.rules.length;
                                result.warnings.push(`Renamed "${importProfile.name}" to "${newName}"`);
                                break;
                        }
                    } else {
                        mergedProfiles.push(importProfile);
                        existingNames.add(importProfile.name);
                        existingIds.add(importProfile.id);
                        result.profilesImported++;
                        result.rulesImported += importProfile.rules.length;
                    }
                }

                await storage.set('profiles', mergedProfiles);
            }

            result.success = true;
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
