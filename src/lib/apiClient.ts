import { auth } from './firebase';

/**
 * A helper to proactively get a fresh Firebase ID token.
 */
export async function getProactiveIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // getIdToken() internally handles refresh if near expiration.
    const token = await user.getIdToken();
    sessionStorage.setItem('auth_token', token);
    return token;
  } catch (e) {
    console.warn('Failed to refresh ID token:', e);
    return sessionStorage.getItem('auth_token');
  }
}

/**
 * A robust fetch wrapper that automatically handles Firebase ID tokens,
 * token refreshes, and standard error handling.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getProactiveIdToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && (options.method === 'POST' || options.method === 'PATCH' || options.method === 'PUT')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Convenience methods for HTTP verbs
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  patch: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
};
