import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { decodeToken, DecodedToken, isTokenExpired } from '../lib/jwt';

/**
 * A hook that provides the current JWT token and its decoded claims.
 * Handles automatic updates when the auth state changes.
 */
export function useJwt() {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('auth_token'));
  const [claims, setClaims] = useState<DecodedToken | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(true);

  useEffect(() => {
    // Listen for auth state changes to keep token in sync
    const unsubscribe = auth.onIdTokenChanged(async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        setToken(idToken);
        sessionStorage.setItem('auth_token', idToken);
        
        const decoded = decodeToken(idToken);
        setClaims(decoded);
        setIsExpired(isTokenExpired(idToken));
      } else {
        setToken(null);
        setClaims(null);
        setIsExpired(true);
        sessionStorage.removeItem('auth_token');
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Manually force a token refresh
   */
  const refreshToken = async () => {
    const user = auth.currentUser;
    if (user) {
      const idToken = await user.getIdToken(true);
      setToken(idToken);
      setClaims(decodeToken(idToken));
      setIsExpired(false);
      sessionStorage.setItem('auth_token', idToken);
      return idToken;
    }
    return null;
  };

  return {
    token,
    claims,
    isExpired,
    refreshToken,
    isAuthenticated: !!token && !isExpired
  };
}
