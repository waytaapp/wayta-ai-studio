import { db, doc, collection, onSnapshot, query, where, getDocs, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, OperationType, handleFirestoreError, writeBatch } from '../lib/firebase';

export interface InventoryItem {
  id: string;
  venue_id?: string;
  eventId?: string;
  code?: string;
  name: string;
  description?: string;
  category: string;
  type?: string;
  department?: string;
  unit_of_measure?: string;
  tax_type?: string;
  price: number;
  stock: number;
  status: 'Available' | 'Sold Out' | 'Low Stock';
  is_active?: boolean;
  is_premium?: boolean;
  image?: string;
  assigned_vendor_id?: string;
}

export const inventoryService = {
  getInventory: async (venueId: string, eventId?: string): Promise<InventoryItem[]> => {
    if (!venueId && !eventId) return [];
    try {
      let q;
      if (eventId) {
        q = query(collection(db, 'inventory'), where('eventId', '==', eventId));
      } else {
        q = query(collection(db, 'inventory'), where('venue_id', '==', venueId));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as InventoryItem));
    } catch (err) {
      console.error('Error getting inventory:', err);
      return [];
    }
  },

  listenToInventory: (venueId: string, callback: (items: InventoryItem[]) => void, eventId?: string) => {
    if (!venueId && !eventId) return () => {};
    const q = eventId 
      ? query(collection(db, 'inventory'), where('eventId', '==', eventId))
      : query(collection(db, 'inventory'), where('venue_id', '==', venueId));
      
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as InventoryItem));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });
  },

  addItem: async (item: Omit<InventoryItem, 'id'>, userId?: string) => {
    try {
      const itemData: any = { 
        ...item, 
        created_by: userId || 'system', 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const cleanItemData = JSON.parse(JSON.stringify(itemData, (k, v) => v === undefined ? null : v));
      cleanItemData.createdAt = serverTimestamp();
      cleanItemData.updatedAt = serverTimestamp();

      const docRef = await addDoc(collection(db, 'inventory'), cleanItemData);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
      return null;
    }
  },

  updateStock: async (itemId: string, stock: number) => {
    if (!itemId) return;
    try {
      let status: InventoryItem['status'] = 'Available';
      if (stock <= 0) status = 'Sold Out';
      else if (stock < 10) status = 'Low Stock';
      
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, { stock, status, updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  },

  updatePrice: async (itemId: string, price: number) => {
    if (!itemId) return;
    try {
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, { price, updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  },

  toggleStatus: async (itemId: string, currentIsActive: boolean | undefined) => {
    if (!itemId) return;
    try {
      const nextIsActive = currentIsActive === false ? true : false;
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, { 
        is_active: nextIsActive,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  },

  togglePremiumStatus: async (itemId: string, currentIsPremium: boolean | undefined) => {
    if (!itemId) return;
    try {
      const nextIsPremium = !currentIsPremium;
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, { 
        is_premium: nextIsPremium,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  },

  updateItem: async (itemId: string, updates: Partial<InventoryItem>) => {
    if (!itemId) return;
    try {
      const itemRef = doc(db, 'inventory', itemId);
      
      // Auto-calculate status if stock is being updated but status is not specified
      const finalUpdates = { ...updates };
      if (finalUpdates.stock !== undefined && finalUpdates.status === undefined) {
        if (finalUpdates.stock <= 0) finalUpdates.status = 'Sold Out';
        else if (finalUpdates.stock < 10) finalUpdates.status = 'Low Stock';
        else finalUpdates.status = 'Available';
      }

      const cleanUpdates = Object.fromEntries(Object.entries(finalUpdates).filter(([_, v]) => v !== undefined));

      await updateDoc(itemRef, { ...cleanUpdates, updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  },

  deleteItem: async (itemId: string) => {
    if (!itemId) return;
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${itemId}`);
    }
  },

  decrementStock: async (itemId: string, quantity: number) => {
    if (!itemId) return;
    try {
      const itemRef = doc(db, 'inventory', itemId);
      const snapshot = await getDocs(query(collection(db, 'inventory'), where('__name__', '==', itemId)));
      if (!snapshot.empty) {
        const currentStock = snapshot.docs[0].data().stock || 0;
        const newStock = Math.max(0, currentStock - quantity);
        let status: InventoryItem['status'] = 'Available';
        if (newStock <= 0) status = 'Sold Out';
        else if (newStock < 10) status = 'Low Stock';
        
        await updateDoc(itemRef, { stock: newStock, status, updatedAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  },

  addBulkItems: async (items: Omit<InventoryItem, 'id'>[], userId?: string) => {
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, 'inventory');

      items.forEach(item => {
        const itemData: any = { 
          ...item, 
          created_by: userId || 'system', 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: item.stock <= 0 ? 'Sold Out' : (item.stock < 10 ? 'Low Stock' : 'Available')
        };
        const docRef = doc(collectionRef);
        batch.set(docRef, itemData);
      });

      await batch.commit();
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'inventory-bulk');
      return false;
    }
  }
};
