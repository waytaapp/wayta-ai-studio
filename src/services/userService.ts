import { rtdb, handleRTDBError, OperationType, ref, get, update } from '../lib/firebase';
import { UserProfile } from './authService';

export const userService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const userRef = ref(rtdb, path);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return null;
      return { uid, ...snapshot.val() } as UserProfile;
    } catch (error) {
      console.warn('Failed to get user profile', error);
      return null;
    }
  },
  async getAllUsers(): Promise<UserProfile[]> {
    const path = 'users';
    try {
      const usersRef = ref(rtdb, path);
      const snapshot = await get(usersRef);
      if (!snapshot.exists()) return [];

      const users: UserProfile[] = [];
      snapshot.forEach((child) => {
        users.push({ uid: child.key!, ...child.val() } as UserProfile);
      });
      
      // Sort manually as RTDB orderByChild is not as flexible for descending
      return users.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (error) {
      handleRTDBError(error, OperationType.LIST, path);
      return [];
    }
  },
  async deleteUser(uid: string) {
    const path = `users/${uid}`;
    try {
      await update(ref(rtdb, path), { status: 'DELETED' });
    } catch (error) {
      handleRTDBError(error, OperationType.DELETE, path);
    }
  },
  async permanentlyDeleteUser(uid: string) {
    const path = `users/${uid}`;
    try {
      // 1. Delete from Realtime Database
      const { remove } = await import('firebase/database');
      await remove(ref(rtdb, path));
      await remove(ref(rtdb, `patrons/${uid}`)).catch(() => {});
      await remove(ref(rtdb, `venue_managers/${uid}`)).catch(() => {});
      await remove(ref(rtdb, `event_managers/${uid}`)).catch(() => {});

      // 2. Cascade delete from Firestore
      const { db, doc, deleteDoc } = await import('../lib/firebase');
      const collectionsToCascade = [
        'users',
        'patrons',
        'venue_managers',
        'event_managers',
        'staffs',
        'waiters',
        'vendors',
        'admins'
      ];
      for (const coll of collectionsToCascade) {
        try {
          await deleteDoc(doc(db, coll, uid));
        } catch (err) {
          console.warn(`Could not cascade delete doc ${uid} from Firestore collection ${coll}:`, err);
        }
      }
    } catch (error) {
      handleRTDBError(error, OperationType.DELETE, path);
    }
  },
  async updateUserRole(uid: string, role: string) {
    const path = `users/${uid}`;
    try {
      await update(ref(rtdb, path), { role });
    } catch (error) {
      handleRTDBError(error, OperationType.UPDATE, path);
    }
  }
};
