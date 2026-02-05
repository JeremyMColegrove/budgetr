// ============================================================================
// AUTHENTICATION API CLIENT
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface RegisterResponse {
  accessKey: string;
}

interface LoginRequest {
  accessKey: string;
}

interface LoginResponse {
  success: boolean;
}

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// ----------------------------------------------------------------------------
// Auth API
// ----------------------------------------------------------------------------

export const authApi = {
  async register(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await handleResponse<RegisterResponse>(response);
    return data.accessKey;
  },

  async login(accessKey: string): Promise<boolean> {
    const body: LoginRequest = { accessKey };
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await handleResponse<LoginResponse>(response);
    return data.success;
  },
};
