/**
 * Basic JWT utility functions for the client side.
 */

export interface DecodedToken {
  uid: string;
  email?: string;
  role?: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Parses a JWT token without verifying the signature (safe for client-side display/logic)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT token:', e);
    return null;
  }
}

/**
 * Checks if a token is expired or will expire within the given threshold (in seconds)
 */
export function isTokenExpired(token: string | null, thresholdSeconds = 60): boolean {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < (now + thresholdSeconds);
}

/**
 * Returns the role from a token if present
 */
export function getTokenRole(token: string | null): string | null {
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.role || null;
}
