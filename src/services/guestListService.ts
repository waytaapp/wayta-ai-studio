import { db, handleFirestoreError, OperationType, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from '../lib/firebase';
import { GuestListItem } from '../types';

export const guestListService = {
  listenToGuestList: (eventId: string, callback: (guests: GuestListItem[]) => void) => {
    const guestsColl = collection(db, 'guest_lists');
    const q = query(guestsColl, where('eventId', '==', eventId));

    return onSnapshot(q, (snapshot) => {
      const guests: GuestListItem[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as GuestListItem));
      callback(guests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guest_lists');
    });
  },

  addGuest: async (guest: Omit<GuestListItem, 'id' | 'addedAt' | 'status'> & { status?: GuestListItem['status'] }) => {
    try {
      const guestsColl = collection(db, 'guest_lists');
      const docRef = await addDoc(guestsColl, {
        ...guest,
        status: guest.status || 'Invited',
        addedAt: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'guest_lists');
    }
  },

  updateGuest: async (guestId: string, updates: Partial<GuestListItem>) => {
    try {
      const guestDoc = doc(db, 'guest_lists', guestId);
      const dataToSave: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      if (updates.status === 'Checked-in' && !updates.checkedInAt) {
        dataToSave.checkedInAt = new Date().toISOString();
      }
      await updateDoc(guestDoc, dataToSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'guest_lists');
    }
  },

  removeGuest: async (guestId: string) => {
    try {
      const guestDoc = doc(db, 'guest_lists', guestId);
      await deleteDoc(guestDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'guest_lists');
    }
  },

  exportToCSV: (guests: GuestListItem[]) => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'VIP', 'Notes', 'Added At'];
    const rows = guests.map(g => [
      g.name,
      g.email || '',
      g.phone || '',
      g.status,
      g.isVip ? 'Yes' : 'No',
      g.notes || '',
      new Date(g.addedAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `guest_list_${guests[0]?.eventId || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
