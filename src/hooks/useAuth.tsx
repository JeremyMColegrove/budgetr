// ============================================================================
// AUTHENTICATION CONTEXT
// ============================================================================

import { authApi } from '@/lib/auth-api';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ACCESS_KEY_STORAGE_KEY = 'access_key';

interface AuthContextValue {
  accessKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (key: string) => Promise<void>;
  register: () => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(ACCESS_KEY_STORAGE_KEY);
    if (storedKey) {
      // Validate the stored key
      authApi
        .login(storedKey)
        .then((success) => {
          if (success) {
            setAccessKey(storedKey);
          } else {
            // Invalid key, remove it
            localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
          }
        })
        .catch(() => {
          // Error validating, remove it
          localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (key: string) => {
    const success = await authApi.login(key);
    if (!success) {
      throw new Error('Invalid access key');
    }
    localStorage.setItem(ACCESS_KEY_STORAGE_KEY, key);
    setAccessKey(key);
  }, []);

  const register = useCallback(async () => {
    const newKey = await authApi.register();
    // Don't auto-authenticate - let LoginPage handle it after user acknowledges the key
    return newKey;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
    setAccessKey(null);
  }, []);

  const value: AuthContextValue = {
    accessKey,
    isAuthenticated: !!accessKey,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to get access key for API requests
export function getAccessKey(): string | null {
  return localStorage.getItem(ACCESS_KEY_STORAGE_KEY);
}
