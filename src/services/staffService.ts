import { auth, db, rtdb } from '../lib/firebase';
import { ref, get, onValue, set as databaseSet, update as databaseUpdate, remove as databaseRemove } from 'firebase/database';
import { collection, query, where, onSnapshot, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { User } from '../types';
import CryptoJS from 'crypto-js';

export type AppUser = User;

// Helper to locate a staff member's document across the different role collections in Firestore
async function findStaffDoc(uid: string) {
  const collections = ['staffs', 'bartenders', 'waiters', 'venue_managers', 'event_managers'];
  for (const coll of collections) {
    const docRef = doc(db, coll, uid);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { docRef, collectionName: coll, data: snap.data() };
      }
    } catch (e) {
      // Ignore errors for individual collections
    }
  }
  return null;
}

export async function getStaffForVenue(venueId: string): Promise<AppUser[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  try {
    const userDocRef = ref(rtdb, `users/${currentUser.uid}`);
    const userDocSnap = await get(userDocRef);
    const userData = userDocSnap.val();
    const userRole = userData?.role;

    // SUPER_ADMIN: use direct RTDB indexed query
    if (userRole === 'SUPER_ADMIN' || userRole === 'super_admin') {
      const usersRef = ref(rtdb, 'staffs');
      const staffSnapshot = await get(usersRef);

      const staff: AppUser[] = [];
      if (staffSnapshot.exists()) {
        const staffData = staffSnapshot.val();
        Object.entries(staffData).forEach(([uid, data]: [string, any]) => {
          if (data.assigned_venue_id === venueId && ['BARTENDER', 'WAITER', 'MANAGER', 'STAFF', 'EVENT_MANAGER'].includes(data.role)) {
            staff.push({ uid, ...data });
          }
        });
      }
      return staff;
    }

    // Non-admins: query Firestore role-specific collections
    const roleCollections = ['staffs', 'bartenders', 'waiters', 'venue_managers', 'event_managers', 'vendors'];
    const staffMap = new Map<string, AppUser>();

    for (const roleCollection of roleCollections) {
      const q = query(
        collection(db, roleCollection),
        where('assigned_venue_id', '==', venueId)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        staffMap.set(doc.id, { uid: doc.id, ...data } as AppUser);
      });
    }

    return Array.from(staffMap.values());
  } catch (error) {
    console.error('Error fetching staff for venue:', error);
    return [];
  }
}

export function listenToStaff(venueId: string, callback: (staff: AppUser[]) => void): (() => void) {
  let activeUnsubscribes: (() => void)[] = [];

  const authUnsub = auth.onAuthStateChanged(async (user) => {
    activeUnsubscribes.forEach(unsub => unsub());
    activeUnsubscribes = [];

    if (!user) {
      callback([]);
      return;
    }

    try {
      const userDocRef = ref(rtdb, `users/${user.uid}`);
      const userDocSnap = await get(userDocRef);
      const userData = userDocSnap.val();
      const userRole = userData?.role;

      // SUPER_ADMIN: use RTDB listener
      if (userRole === 'SUPER_ADMIN' || userRole === 'super_admin') {
        const staffRef = ref(rtdb, 'staffs');

        const unsub = onValue(staffRef, (snapshot) => {
          const staff: AppUser[] = [];
          if (snapshot.exists()) {
            const staffData = snapshot.val();
            Object.entries(staffData).forEach(([uid, data]: [string, any]) => {
              if (data.assigned_venue_id === venueId) {
                staff.push({ uid, ...data });
              }
            });
          }
          callback(staff);
        });
        activeUnsubscribes.push(unsub);
        return;
      }

      // Non-admins: listen to Firestore role collections
      const roleCollections = ['staffs', 'bartenders', 'waiters', 'venue_managers', 'event_managers', 'vendors'];
      const staffMap = new Map<string, AppUser>();

      roleCollections.forEach((roleCollection) => {
        const q = query(
          collection(db, roleCollection),
          where('assigned_venue_id', '==', venueId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
          // Remove old documents from this collection to handle deletions
          for (const [key, val] of staffMap.entries()) {
            if (val.role && getCollectionForRole(val.role) === roleCollection) {
              staffMap.delete(key);
            }
          }

          snapshot.forEach((doc) => {
            const data = doc.data();
            staffMap.set(doc.id, { uid: doc.id, ...data } as AppUser);
          });
          callback(Array.from(staffMap.values()));
        });
        activeUnsubscribes.push(unsub);
      });
    } catch (error) {
      console.error('Error setting up staff listener:', error);
      callback([]);
    }
  });

  return () => {
    activeUnsubscribes.forEach(unsub => unsub());
    authUnsub();
  };
}

export function listenToEventStaff(eventId: string, callback: (staff: AppUser[]) => void): (() => void) {
  let activeUnsubscribes: (() => void)[] = [];

  const authUnsub = auth.onAuthStateChanged(async (user) => {
    activeUnsubscribes.forEach(unsub => unsub());
    activeUnsubscribes = [];

    if (!user) {
      callback([]);
      return;
    }

    try {
      const userDocRef = ref(rtdb, `users/${user.uid}`);
      const userDocSnap = await get(userDocRef);
      const userData = userDocSnap.val();
      const userRole = userData?.role;

      // SUPER_ADMIN: use RTDB
      if (userRole === 'SUPER_ADMIN' || userRole === 'super_admin') {
        const staffRef = ref(rtdb, 'staffs');

        const unsub = onValue(staffRef, (snapshot) => {
          const staff: AppUser[] = [];
          if (snapshot.exists()) {
            const staffData = snapshot.val();
            Object.entries(staffData).forEach(([uid, data]: [string, any]) => {
              if (data.assigned_event_id === eventId) {
                staff.push({ uid, ...data });
              }
            });
          }
          callback(staff);
        });
        activeUnsubscribes.push(unsub);
        return;
      }

      // Non-admins: query all role-specific collections assigned to this event
      const roleCollections = ['staffs', 'bartenders', 'waiters', 'venue_managers', 'event_managers', 'vendors'];
      const staffMap = new Map<string, AppUser>();

      roleCollections.forEach((roleCollection) => {
        const q = query(
          collection(db, roleCollection),
          where('assigned_event_id', '==', eventId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
          // Remove old documents from this collection to handle deletions
          for (const [key, val] of staffMap.entries()) {
            if (val.role && getCollectionForRole(val.role) === roleCollection) {
              staffMap.delete(key);
            }
          }

          snapshot.forEach((doc) => {
            const data = doc.data();
            staffMap.set(doc.id, { uid: doc.id, ...data } as AppUser);
          });
          callback(Array.from(staffMap.values()));
        });
        activeUnsubscribes.push(unsub);
      });
    } catch (error) {
      console.error('Error setting up event staff listener:', error);
      callback([]);
    }
  });

  return () => {
    activeUnsubscribes.forEach(unsub => unsub());
    authUnsub();
  };
}

function getCollectionForRole(role: string): string {
  const roleUpper = role.toUpperCase();
  if (roleUpper === 'BARTENDER') return 'bartenders';
  if (roleUpper === 'WAITER') return 'waiters';
  if (roleUpper === 'MANAGER') return 'venue_managers';
  if (roleUpper === 'EVENT_MANAGER') return 'event_managers';
  if (roleUpper === 'VENDOR') return 'vendors';
  return 'staffs';
}

export async function enrollStaff(
  venueId: string,
  name: string,
  email: string,
  role: string,
  eventId?: string | null | undefined,
  phone?: string,
  gender?: string
): Promise<{ username: string; pin: string }> {
  try {
    const parts = name.trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts[parts.length - 1] || '';
    const baseUsername = `${first.charAt(0)}${last}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
    const upUsername = username.toUpperCase();

    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const pinHash = CryptoJS.SHA256(pin).toString();

    const docId = `${username}_${Date.now()}`;

    const staffData = {
      uid: docId,
      id: docId,
      displayName: name,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      email: email.toLowerCase(),
      role: role.toUpperCase(),
      assigned_venue_id: venueId || '',
      assigned_event_id: eventId || '',
      phone: phone || '',
      gender: gender || 'Prefer not to say',
      username: upUsername,
      pin,
      hashed_pin: pinHash,
      pin_hash: pinHash,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // 1. Write to Firestore subcollection (legacy compatibility)
    await setDoc(doc(db, 'venues', venueId, 'staff', docId), staffData);

    // 2. Write to Firestore top-level role collection
    const targetColl = getCollectionForRole(role);
    await setDoc(doc(db, targetColl, docId), staffData);

    // 3. Write to RTDB `/staffs/${docId}` (Super Admin compatibility)
    await databaseSet(ref(rtdb, `staffs/${docId}`), staffData).catch((e) => {
      console.warn('Could not write staff to RTDB staffs:', e);
    });

    // 4. Write to RTDB `/users/${docId}` (Auth compatibility)
    await databaseSet(ref(rtdb, `users/${docId}`), staffData).catch((e) => {
      console.warn('Could not write staff to RTDB users:', e);
    });

    console.log(`[STAFF_SERVICE_DEBUG] Enrolled staff ${name} (${role}) under docId ${docId}, username: ${upUsername}`);
    return { username, pin };
  } catch (error) {
    console.error('Error in enrollStaff:', error);
    throw error;
  }
}

export async function updateStaffEventAssignment(uid: string, eventId: string | null): Promise<void> {
  try {
    const info = await findStaffDoc(uid);
    if (info) {
      await updateDoc(info.docRef, { assigned_event_id: eventId || '' });
    } else {
      await updateDoc(doc(db, 'staffs', uid), { assigned_event_id: eventId || '' }).catch(() => {});
    }

    await databaseUpdate(ref(rtdb, `staffs/${uid}`), { assigned_event_id: eventId || '' }).catch(() => {});
    await databaseUpdate(ref(rtdb, `users/${uid}`), { assigned_event_id: eventId || '' }).catch(() => {});
  } catch (error) {
    console.error(`Error updating staff ${uid} event assignment:`, error);
    throw error;
  }
}

export async function updateStaffRole(uid: string, role: string): Promise<void> {
  try {
    const info = await findStaffDoc(uid);
    if (info) {
      const currentCollection = info.collectionName;
      const targetCollection = getCollectionForRole(role);
      const updatedData = { ...info.data, role: role.toUpperCase() };

      if (currentCollection !== targetCollection) {
        await setDoc(doc(db, targetCollection, uid), updatedData);
        await deleteDoc(info.docRef);
      } else {
        await updateDoc(info.docRef, { role: role.toUpperCase() });
      }
    } else {
      await updateDoc(doc(db, 'staffs', uid), { role: role.toUpperCase() }).catch(() => {});
    }

    await databaseUpdate(ref(rtdb, `staffs/${uid}`), { role: role.toUpperCase() }).catch(() => {});
    await databaseUpdate(ref(rtdb, `users/${uid}`), { role: role.toUpperCase() }).catch(() => {});
  } catch (error) {
    console.error(`Error updating staff ${uid} role:`, error);
    throw error;
  }
}

export async function deleteStaff(uid: string): Promise<void> {
  try {
    const collections = ['staffs', 'bartenders', 'waiters', 'venue_managers', 'event_managers'];
    for (const coll of collections) {
      await deleteDoc(doc(db, coll, uid)).catch(() => {});
    }

    await databaseRemove(ref(rtdb, `staffs/${uid}`)).catch(() => {});
    await databaseRemove(ref(rtdb, `users/${uid}`)).catch(() => {});
  } catch (error) {
    console.error(`Error deleting staff ${uid}:`, error);
    throw error;
  }
}

export async function updateStaffCredentials(uid: string, username: string, pin: string): Promise<void> {
  try {
    const pinHash = CryptoJS.SHA256(pin).toString();
    const upUsername = username.toUpperCase();

    const info = await findStaffDoc(uid);
    const updates = { 
      username: upUsername, 
      pin, 
      hashed_pin: pinHash, 
      pin_hash: pinHash 
    };

    if (info) {
      await updateDoc(info.docRef, updates);
    } else {
      await updateDoc(doc(db, 'staffs', uid), updates).catch(() => {});
    }

    await databaseUpdate(ref(rtdb, `staffs/${uid}`), updates).catch(() => {});
    await databaseUpdate(ref(rtdb, `users/${uid}`), updates).catch(() => {});
  } catch (error) {
    console.error(`Error updating credentials for staff ${uid}:`, error);
    throw error;
  }
}

export const staffService = {
  getStaffForVenue,
  listenToStaff,
  listenToEventStaff,
  enrollStaff,
  updateStaffEventAssignment,
  updateStaffRole,
  deleteStaff,
  updateStaffCredentials
};
