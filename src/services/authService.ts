import { auth, rtdb, handleRTDBError, OperationType, ref, get, set, update, rtdbTimestamp } from '../lib/firebase';
import { User as FirebaseUser, signInWithCustomToken, signOut } from 'firebase/auth';
import SHA256 from 'crypto-js/sha256.js';
import { cleanForRTDB } from '../lib/utils';
import { isSafeUser } from '../lib/authValidator';
import { api } from '../lib/apiClient';
import { decodeToken, isTokenExpired } from '../lib/jwt';

export enum UserRole {
  PATRON = 'PATRON',
  BARTENDER = 'BARTENDER',
  WAITER = 'WAITER',
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  EVENT_MANAGER = 'EVENT_MANAGER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  uid: string;
  email: string | null;
  username?: string;
  pin_hash?: string;
  hashed_pin?: string;
  full_name?: string;
  displayName?: string | null;
  photoURL: string | null;
  role?: UserRole;
  assigned_venue_id?: string;
  assigned_event_id?: string;
  onboarding_details?: {
    venue_id?: string;
    [key: string]: any;
  };
  isVerified?: boolean;
  phone?: string;
  pin?: string;
  firstName?: string;
  lastName?: string;
  vibe?: string;
  budgetLimit?: number;
  budget?: number;
  specialty?: string;
  experience?: string;
  date_of_birth?: string;
  home_city?: string;
  address?: string;
  bio?: string;
  is_profile_complete?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt?: number;
  updatedAt?: number;
  mfa_enabled?: boolean;
  phone_number?: string;
  points?: number;
  tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'TITANIUM';
  fcmToken?: string;
}

// Local fallback storage helper
const STORAGE_KEY_PREFIX = 'wayta_user_';

function getLocalProfile(uid: string): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEY_PREFIX + uid);
  return data ? JSON.parse(data) : null;
}

function setLocalProfile(uid: string, profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(profile));
}

export async function syncUserProfile(user: FirebaseUser): Promise<UserProfile | null> {
  if (!isSafeUser(user)) {
    console.error('syncUserProfile: Invalid or unsafe user object');
    return null;
  }
  const path = `users/${user.uid}`;
  try {
    // Ensure the auth token is fully loaded
    try {
      await user.getIdToken(true);
    } catch (tokenErr) {
      console.warn('IdToken refresh failed:', tokenErr);
    }
    
    const userRef = ref(rtdb, path);
    // FIRST: Always check specialized collections directly. RTDB might only have partial data.
    if (user.uid.startsWith('patron_')) {
      try {
        const { doc, getDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const patronDoc = await getDoc(doc(db, 'patrons', user.uid));
        if (patronDoc.exists()) {
          const profile = patronDoc.data() as UserProfile;
          // Self-heal RTDB
          const rtdbSnap = await get(userRef);
          if (!rtdbSnap.exists() || rtdbSnap.val().role !== UserRole.PATRON) {
             await update(userRef, { role: UserRole.PATRON });
          }
          setLocalProfile(user.uid, profile);
          return profile;
        }
      } catch (err) {
        console.warn('Failed to fetch from patrons collection:', err);
      }
    } else if (user.uid.startsWith('manager-')) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const managerDoc = await getDoc(doc(db, 'venue_managers', user.uid));
        if (managerDoc.exists()) {
          const profile = managerDoc.data() as UserProfile;
          setLocalProfile(user.uid, profile);
          
          try {
            const cleaned = cleanForRTDB({ ...profile, updatedAt: rtdbTimestamp() });
            await set(userRef, cleaned);
          } catch (e) {
            console.warn('Self-heal write to RTDB failed:', e);
          }
          return profile;
        }
      } catch (err) {
        console.warn('Failed to fetch from venue_managers collection:', err);
      }
    }

    const snapshot = await get(userRef);

    if (!snapshot.exists() || !snapshot.val().role) {
      // Check users collection as fallback
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc?.exists()) {
        const profile = userDoc.data() as UserProfile;
        setLocalProfile(user.uid, profile);
        return profile;
      }

      // Don't auto-create the profile here. 
      // Return a skeleton profile and let the UI handle the registration flow (username/PIN setup)
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isVerified: false,
        status: 'PENDING'
      };
    }

    const profile = snapshot.val() as UserProfile;
    profile.uid = user.uid; // Ensure uid is set, as RTDB values might not include it
    
    // Self-heal corrupted dev accounts that were forced to ADMIN previously
    if (user.uid.startsWith('patron_') && profile.role !== UserRole.PATRON) {
      console.log(`[AUTH FIX] Correcting patron role from ${profile.role} to PATRON for ${user.uid}`);
      profile.role = UserRole.PATRON;
      await update(userRef, { role: UserRole.PATRON });
    }
    
    // Ad-hoc client-side missing assigned_venue_id patch
    if (profile.role && profile.role !== UserRole.PATRON && profile.role !== UserRole.ADMIN && !profile.assigned_venue_id) {
       try {
         const { doc, getDoc } = await import('firebase/firestore');
         const { db } = await import('../lib/firebase');
         const targetColl = profile.role === UserRole.MANAGER || profile.role === UserRole.EVENT_MANAGER ? 'venue_managers' : 'users';
         const fsDoc = await getDoc(doc(db, targetColl, user.uid));
         if (fsDoc.exists()) {
             const fsData = fsDoc.data();
             if (fsData.assigned_venue_id) {
                 profile.assigned_venue_id = fsData.assigned_venue_id;
                 await update(userRef, { assigned_venue_id: fsData.assigned_venue_id });
             }
         }
       } catch (err) {
         console.warn("Client fallback for missing assigned_venue_id failed", err);
       }
    }
    
    // Auto-Upgrade if it's the super admin
    // Removed because it's forcing users to ADMIN if they use their dev email for other roles


    // Regular Firestore sync
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // Atomic schema mapping
      const payload = {
        uid: profile.uid,
        email: profile.email || null,
        username: profile.username || null,
        pin_configured: !!(profile.pin_hash || profile.hashed_pin),
        assigned_venue_id: profile.assigned_venue_id || null,
        assigned_event_id: profile.assigned_event_id || null,
        role: profile.role || UserRole.PATRON,
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        updatedAt: serverTimestamp()
      };

      let targetCollection = 'users';
      const userRole = profile.role?.toUpperCase();
      if (userRole === 'PATRON') targetCollection = 'patrons';
      else if (userRole === 'MANAGER') targetCollection = 'venue_managers';
      else if (userRole === 'EVENT_MANAGER') targetCollection = 'event_managers';
      else if (userRole) targetCollection = userRole.toLowerCase().replace(/_/g, '_') + 's';

      await setDoc(doc(db, targetCollection, user.uid), { ...profile, ...payload }, { merge: true });

      // Ensure it's also in users
      if (targetCollection !== 'users') {
        await setDoc(doc(db, 'users', user.uid), { ...profile, ...payload }, { merge: true });
      }
    } catch (fsErr: any) {
      console.warn('Firestore profile sync failed:', fsErr);
      if (fsErr?.code === 'permission-denied' || fsErr?.message?.includes('Missing or insufficient permissions')) {
        // Rollback and ensure secure local cache
        setLocalProfile(user.uid, profile);
        console.info('Successfully rolled back to secure local fallback cache.');
      }
    }

    setLocalProfile(user.uid, profile);
    return profile;
  } catch (err) {
    console.warn('Realtime Database sync failed, attempting local fallback:', err);
    const local = getLocalProfile(user.uid);
    if (local) return local;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }
}

export class WaytaAuthService {
  /**
   * Hashes a PIN securely using SHA-256 for local verification or preparation
   */
  hashPin(pin: string): string {
    return SHA256(pin.toString().trim()).toString();
  }

  /**
   * Performs Username + PIN authentication via Server-side Custom Token generation
   * Mirrors the Dart WaytaAuthService blueprint logic
   */
  async loginWithPin(username: string, pin: string, role?: string): Promise<UserProfile | null> {
    try {
      // 1. Call our "verifyPin" equivalent on the server using the robust api client
      const currentUser = auth.currentUser;
      const loginData = await api.post('/api/verifypin', { 
        username, 
        pin, 
        clientUid: currentUser?.uid,
        role 
      }) as { profile: any, token?: string, usePasswordLogin?: boolean, email?: string, password?: string };

      const { profile, token, usePasswordLogin, email, password } = loginData;
      
      // 2. Extract the custom token from the response
      if (token) {
        try {
          // Check if token is already expired (unlikely from server but good feature)
          if (isTokenExpired(token)) {
            console.warn('Received expired custom token from server');
          }

          const decoded = decodeToken(token);
          console.log(`🎫 Token claims decoded:`, decoded);

          // 3. Sign in to Firebase Auth using that token
          const userCredential = await signInWithCustomToken(auth, token);
          console.log(`✅ Fully signed in with Custom Token: ${userCredential.user.uid}`);
          
          // 4. Save the ID token for API requests (Firebase ID token, not the custom token)
          const idToken = await userCredential.user.getIdToken();
          sessionStorage.setItem('auth_token', idToken);
          if (decoded?.role) {
            sessionStorage.setItem('auth_role', decoded.role);
          }
          
          // Sync profile from the new identity
          const syncedProfile = await syncUserProfile(userCredential.user);
          const finalProfile = { ...profile, ...syncedProfile };
          // Prefer assigned_venue_id from the server if the RTDB one is missing
          if (profile.assigned_venue_id && !syncedProfile?.assigned_venue_id) {
             finalProfile.assigned_venue_id = profile.assigned_venue_id;
          }
          return finalProfile;
        } catch (signInErr) {
          console.warn('SignInWithCustomToken Failed:', signInErr);
          throw new Error('Firebase Custom Token Sign-in Failed');
        }
      } else if (usePasswordLogin && email && password) {
          try {
             const { signInWithEmailAndPassword } = await import('firebase/auth');
             const userCredential = await signInWithEmailAndPassword(auth, email, password);
             console.log(`✅ Fully signed in with Email/Password Fallback: ${userCredential.user.uid}`);
             const idToken = await userCredential.user.getIdToken();
             sessionStorage.setItem('auth_token', idToken);
             const syncedProfile = await syncUserProfile(userCredential.user);
             return { ...profile, ...syncedProfile };
          } catch(err) {
             console.warn('Fallback Email/Password Sign-in Failed:', err);
             throw new Error('Firebase Email/Password Sign-in Failed');
          }
      }

      if (profile && currentUser) {
        setLocalProfile(currentUser.uid, profile);
      }

      return profile;
    } catch (err: any) {
      console.warn('WaytaAuthService Login Error:', err);
      throw err; // Re-throw the error from api client which already has descriptive messaging
    }
  }

  /**
   * Signs the user out of Firebase Auth
   */
  async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Checks if a username is available via the server-side API
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.available;
    } catch (err) {
      console.error('Error checking username availability:', err);
      return false;
    }
  }
}

// Export singleton instance as used in the Dart example: final _authService = WaytaAuthService();
export const authService = new WaytaAuthService();

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  if (!uid) {
    console.error('updateUserProfile called with empty uid!', data);
    return;
  }
  const path = `users/${uid}`;
  
  const finalData: any = { ...data, uid }; // Always include UID for validation consistency
  
  // Mapping for blueprint consistency
  if (data.displayName && !data.full_name) {
    finalData.full_name = data.displayName;
  }
  if (data.budget !== undefined && data.budgetLimit === undefined) {
    finalData.budgetLimit = data.budget;
  }

  if (data.pin) {
    // Automatically generate hash if PIN is provided
    finalData.pin_hash = authService.hashPin(data.pin);
    finalData.hashed_pin = authService.hashPin(data.pin); // Blueprint alignment
  }

  // Always update local first
  const current = getLocalProfile(uid) || { uid } as UserProfile;
  const updated = { ...current, ...finalData };
  setLocalProfile(uid, updated);

  const userRef = ref(rtdb, `users/${uid}`);
  const cleaned = cleanForRTDB({
    ...finalData,
    updatedAt: rtdbTimestamp()
  });

  try {
    const currentUser = auth.currentUser;
    const currentUserRole = sessionStorage.getItem('auth_role');
    const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

    if (!currentUser || (currentUser.uid !== uid && !isAdmin)) {
      throw new Error(`User not authenticated or UID mismatch: ${uid}`);
    }
    // Ensure token is fresh
    await currentUser.getIdToken(true);
    await update(userRef, cleaned);
  } catch (err) {
    console.warn('Realtime Database update failed (possibly permissions or network), skipping and proceeding with Firestore sync:', err);
  }

  // Sync to Firestore
  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    
    let targetCollection = 'users';
    if (updated.role === UserRole.MANAGER) targetCollection = 'venue_managers';
    else if (updated.role === UserRole.EVENT_MANAGER) targetCollection = 'event_managers';
    else if (updated.role === UserRole.PATRON) targetCollection = 'patrons';

    await setDoc(doc(db, targetCollection, uid), {
      ...cleaned,
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (targetCollection !== 'users') {
      await setDoc(doc(db, 'users', uid), {
        ...cleaned,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (fsErr) {
    console.warn('Firestore profile update failed:', fsErr);
  }
}
