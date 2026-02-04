// ============================================================================
// STORAGE ABSTRACTION LAYER
// ============================================================================
// API-style abstraction allowing easy swap from localStorage to backend API.
// ============================================================================

// ----------------------------------------------------------------------------
// Storage Adapter Interface
// ----------------------------------------------------------------------------

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

// ----------------------------------------------------------------------------
// LocalStorage Implementation
// ----------------------------------------------------------------------------

const STORAGE_PREFIX = 'budget_blueprint_';

export const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch {
      console.error(`Failed to parse localStorage key: ${key}`);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set localStorage key: ${key}`, error);
      throw error;
    }
  },

  async remove(key: string): Promise<void> {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  async keys(): Promise<string[]> {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        allKeys.push(key.slice(STORAGE_PREFIX.length));
      }
    }
    return allKeys;
  },
};

// ----------------------------------------------------------------------------
// Current Storage Export (swap this to change storage backend)
// ----------------------------------------------------------------------------

export const storage = localStorageAdapter;
