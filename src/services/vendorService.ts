import { rtdb, handleRTDBError, OperationType, ref, get, set, push, onValue } from '../lib/firebase';

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  status: 'Approved' | 'Pending';
}

export const vendorService = {
  getVendors: async (venueId: string): Promise<Vendor[]> => {
    const path = `venues/${venueId}/vendors`;
    try {
      const dbRef = ref(rtdb, path);
      const snapshot = await get(dbRef);
      if (!snapshot.exists()) return [];

      const vendors: Vendor[] = [];
      snapshot.forEach((child) => {
        vendors.push({
          id: child.key!,
          ...child.val(),
        } as Vendor);
      });
      return vendors;
    } catch (err) {
      handleRTDBError(err, OperationType.LIST, path);
      return [];
    }
  },

  listenToVendors: (venueId: string, callback: (vendors: Vendor[]) => void) => {
    const path = `venues/${venueId}/vendors`;
    const dbRef = ref(rtdb, path);
    return onValue(dbRef, (snapshot) => {
      const vendors: Vendor[] = [];
      snapshot.forEach((child) => {
        vendors.push({
          id: child.key!,
          ...child.val(),
        } as Vendor);
      });
      callback(vendors);
    }, (error) => {
      handleRTDBError(error, OperationType.LIST, path);
    });
  },

  addVendor: async (venueId: string, vendor: Omit<Vendor, 'id'>) => {
    const path = `venues/${venueId}/vendors`;
    try {
      const dbRef = ref(rtdb, path);
      const newDocRef = push(dbRef);
      await set(newDocRef, vendor);
      return newDocRef.key;
    } catch (err) {
      handleRTDBError(err, OperationType.CREATE, path);
    }
  }
};
