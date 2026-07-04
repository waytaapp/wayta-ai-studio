import { User as FirebaseUser } from 'firebase/auth';

/**
 * Deeply sanitizes an object by removing non-serializable properties (functions, symbols)
 * and breaking cyclic references.
 */
function safeClone<T>(obj: T, seen = new WeakMap()): any {
  if (obj === null || typeof obj !== 'object') {
    return (typeof obj === 'function' || typeof obj === 'symbol') ? undefined : obj;
  }

  // Handle common non-serializable built-ins
  if (obj instanceof Date) return obj.toISOString();
  if (obj instanceof RegExp) return obj.toString();
  if (obj instanceof Error) return { message: obj.message, name: obj.name, stack: obj.stack };

  // Break cycles
  if (seen.has(obj)) {
    return '[Cyclic Reference]';
  }
  seen.set(obj, true);

  if (Array.isArray(obj)) {
    return obj.map(item => safeClone(item, seen)).filter(val => val !== undefined);
  }

  const sanitized: any = {};
  // Only iterate own enumerable properties to avoid prototype pollution or complex getters
  const keys = Object.keys(obj);
  for (const key of keys) {
    try {
      const val = (obj as any)[key];
      const sanitizedVal = safeClone(val, seen);
      if (sanitizedVal !== undefined) {
        sanitized[key] = sanitizedVal;
      }
    } catch (e) {
      // Skip properties that throw on access (e.g. some restricted properties on native objects)
    }
  }
  return sanitized;
}

/**
 * Validates and sanitizes the Firebase User object to ensure it has the required fields
 * before it's used to update application state. This prevents common "Cannot read property of undefined"
 * and cyclic reference errors.
 */
export function validateFirebaseUser(user: FirebaseUser | null): {
  isValid: boolean;
  sanitizedUser: any | null;
  error?: string;
} {
  if (!user) {
    return { isValid: false, sanitizedUser: null };
  }

  if (typeof user !== 'object' || user === null) {
    return { isValid: false, sanitizedUser: null, error: 'User is not an object' };
  }

  if (!user.uid) {
    return { isValid: false, sanitizedUser: null, error: 'User object missing UID' };
  }

  // Explicitly extract core fields to ensure we don't carry over the huge internal Firebase state
  const coreUser = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    emailVerified: user.emailVerified || false,
    isAnonymous: user.isAnonymous || false,
    phoneNumber: user.phoneNumber || null,
    tenantId: user.tenantId || null,
    metadata: {
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime
    },
    providerData: user.providerData.map(p => ({
      providerId: p.providerId,
      uid: p.uid,
      displayName: p.displayName,
      email: p.email,
      phoneNumber: p.phoneNumber,
      photoURL: p.photoURL
    }))
  };

  // Run through safeClone as an extra layer of protection against unexpected internal props
  const sanitizedUser = safeClone(coreUser);

  // Final sanity check: Can it be stringified?
  try {
    JSON.stringify(sanitizedUser);
  } catch (e) {
    return { isValid: false, sanitizedUser: null, error: 'Sanitized user is not serializable' };
  }

  return {
    isValid: true,
    sanitizedUser
  };
}

/**
 * Checks if the provided object looks like a valid Firebase User
 */
export function isSafeUser(user: any): user is FirebaseUser {
  return (
    user &&
    typeof user === 'object' &&
    typeof user.uid === 'string' &&
    user.uid.length > 0 &&
    !Object.values(user).some(v => typeof v === 'function' && v.name === 'proactiveRefresh') // Heuristic check for raw Firebase User
  );
}
