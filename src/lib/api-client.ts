// ============================================================================
// API CLIENT - HTTP Client for Backend Communication
// ============================================================================

import type {
    Account,
    AccountFormData,
    BudgetProfile,
    BudgetRule,
    BudgetRuleFormData,
} from '@/types/budget';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Get access key from localStorage
  const accessKey = localStorage.getItem('access_key');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add access key header if available
  if (accessKey) {
    headers['x-access-key'] = accessKey;
  }
  
  // Merge with any additional headers
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  return handleResponse<T>(response);
}

// ----------------------------------------------------------------------------
// Profile API
// ----------------------------------------------------------------------------

export const profilesApi = {
  async list(): Promise<BudgetProfile[]> {
    return request<BudgetProfile[]>('/profiles');
  },

  async get(id: string): Promise<BudgetProfile> {
    return request<BudgetProfile>(`/profiles/${id}`);
  },

  async create(name: string): Promise<BudgetProfile> {
    return request<BudgetProfile>('/profiles', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async update(id: string, name: string): Promise<BudgetProfile> {
    return request<BudgetProfile>(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/profiles/${id}`, {
      method: 'DELETE',
    });
  },

  async duplicate(id: string): Promise<BudgetProfile> {
    return request<BudgetProfile>(`/profiles/${id}/duplicate`, {
      method: 'POST',
    });
  },

  async getSummary(id: string): Promise<import('@/types/engine').ProfileSummary> {
    return request(`/profiles/${id}/summary`);
  },

  async getAccountsWithProjections(
    id: string,
    months: number,
    budgetId?: string
  ): Promise<import('@/types/engine').AccountsWithProjectionsResponse> {
    const params = new URLSearchParams({ months: months.toString() });
    if (budgetId) {
      params.append('budgetId', budgetId);
    }
    return request(`/profiles/${id}/accounts/projections?${params.toString()}`);
  },
};

// ----------------------------------------------------------------------------
// Account API
// ----------------------------------------------------------------------------

export const accountsApi = {
  async list(profileId: string): Promise<Account[]> {
    return request<Account[]>(`/profiles/${profileId}/accounts`);
  },

  async create(profileId: string, data: AccountFormData): Promise<Account> {
    return request<Account>(`/profiles/${profileId}/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<AccountFormData>): Promise<Account> {
    return request<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/accounts/${id}`, {
      method: 'DELETE',
    });
  },
};

// ----------------------------------------------------------------------------
// Budget Rule API
// ----------------------------------------------------------------------------

export const rulesApi = {
  async list(profileId: string): Promise<BudgetRule[]> {
    return request<BudgetRule[]>(`/profiles/${profileId}/rules`);
  },

  async create(profileId: string, data: BudgetRuleFormData): Promise<BudgetRule> {
    // Get current month in YYYY-MM format
    const now = new Date();
    const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return request<BudgetRule>(`/profiles/${profileId}/rules`, {
      method: 'POST',
      body: JSON.stringify({ ...data, startMonth }),
    });
  },

  async update(id: string, data: Partial<BudgetRuleFormData>): Promise<BudgetRule> {
    // Get current month in YYYY-MM format for versioning
    const now = new Date();
    const currentViewMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return request<BudgetRule>(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, currentViewMonth }),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/rules/${id}`, {
      method: 'DELETE',
    });
  },

  async getSummary(profileId: string): Promise<import('@/types/engine').RuleSummary> {
    return request(`/profiles/${profileId}/rules/summary`);
  },
};
