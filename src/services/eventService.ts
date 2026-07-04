import { rtdb, handleRTDBError, handleFirestoreError, OperationType, ref, get, set, update, push, onValue, db, collection, query, where, onSnapshot } from '../lib/firebase';
import { Event } from '../types';

export const eventService = {
  // Existing RTDB methods...
  getEvents: async (venueId: string): Promise<Event[]> => {
    const path = `venues/${venueId}/events`;
    try {
      const dbRef = ref(rtdb, path);
      const snapshot = await get(dbRef);
      if (!snapshot.exists()) return [];

      const events: Event[] = [];
      snapshot.forEach((child) => {
        events.push({
          id: child.key!,
          ...child.val(),
        } as Event);
      });
      return events;
    } catch (err) {
      handleRTDBError(err, OperationType.LIST, path);
      return [];
    }
  },

  // Firestore events query by venueId
  // Firestore events query by ownerId (for event managers)
  listenToEventsByOwner(ownerId: string, callback: (events: Event[]) => void) {
    const eventsColl = collection(db, 'events');
    const q1 = query(eventsColl, where('ownerId', '==', ownerId));
    const q2 = query(eventsColl, where('managerUid', '==', ownerId));
    
    let events1: Event[] = [];
    let events2: Event[] = [];

    const triggerCallback = () => {
      const merged = [...events1];
      events2.forEach(e2 => {
        if (!merged.find(e => e.id === e2.id)) {
          merged.push(e2);
        }
      });
      callback(merged);
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      events1 = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
      triggerCallback();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      events2 = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
      triggerCallback();
    }, (error) => {
       // Ignore error for missing index if it occurs, or just log
       console.log('Query by managerUid failed:', error);
    });

    return () => {
       unsub1();
       unsub2();
    }
  },

  listenToEventsFirestore(venueId: string, callback: (events: Event[]) => void) {
    const eventsColl = collection(db, 'events');
    const q = query(eventsColl, where('venueId', '==', venueId));
    
    return onSnapshot(q, (snapshot) => {
      const events: Event[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Event));
      callback(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
  },

  listenToEventsByStaff(staffId: string, callback: (events: Event[]) => void) {
    const eventsColl = collection(db, 'events');
    const q = query(eventsColl, where('staffIds', 'array-contains', staffId));
    
    return onSnapshot(q, (snapshot) => {
      const events: Event[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Event));
      callback(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events-staff');
    });
  },

  listenToAllEventsFirestore(callback: (events: Event[]) => void) {
    const eventsColl = collection(db, 'events');
    const q = query(eventsColl);
    
    return onSnapshot(q, (snapshot) => {
      const events: Event[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Event));
      callback(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events-all');
    });
  },

  listenToEvents: (venueId: string, callback: (events: Event[]) => void) => {
    const path = `venues/${venueId}/events`;
    const dbRef = ref(rtdb, path);
    return onValue(dbRef, (snapshot) => {
      const events: Event[] = [];
      snapshot.forEach((child) => {
        events.push({
          id: child.key!,
          ...child.val(),
        } as Event);
      });
      callback(events);
    }, (error) => {
      handleRTDBError(error, OperationType.LIST, path);
    });
  },

  async createEvent(venueId: string, event: Omit<Event, 'id'>, userId: string) {
    const rtdbPath = `venues/${venueId}/events`;
    try {
      // 1. RTDB
      const dbRef = ref(rtdb, rtdbPath);
      const newDocRef = push(dbRef);
      const eventId = newDocRef.key!;
      const eventData = { 
        ...event, 
        venueId, 
        created_by: userId, 
        timestamp: new Date().toISOString() 
      };
      await set(newDocRef, eventData);

      // 2. Firestore (for querying across venues/ organisers)
      try {
        const { doc, setDoc, db, serverTimestamp } = await import('../lib/firebase');
        await setDoc(doc(db, 'events', eventId), {
          ...eventData,
          id: eventId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (fsErr) {
        console.error('Firestore Event Sync Error:', fsErr);
      }

      return eventId;
    } catch (err) {
      handleRTDBError(err, OperationType.CREATE, rtdbPath);
    }
  },

  async updateEventStatus(eventId: string, status: Event['status'], venueId?: string) {
    // 1. RTDB (if venueId provided)
    if (venueId) {
      const rtdbPath = `venues/${venueId}/events/${eventId}`;
      try {
        const dbRef = ref(rtdb, rtdbPath);
        await update(dbRef, { status });
      } catch (err) {
        console.error('RTDB Event Status Update Error:', err);
      }
    }

    // 2. Firestore
    try {
      const { doc, updateDoc, db, serverTimestamp } = await import('../lib/firebase');
      await updateDoc(doc(db, 'events', eventId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (fsErr) {
      console.error('Firestore Event Status Update Error:', fsErr);
    }
  },

  getEventById: async (eventId: string): Promise<Event | null> => {
    try {
      const { doc, getDoc, db } = await import('../lib/firebase');
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        return { ...eventDoc.data(), id: eventDoc.id } as Event;
      }
      return null;
    } catch (err) {
      console.error('Failed to get event by id:', err);
      return null;
    }
  },

  updateEvent: async (venueId: string | undefined | null, eventId: string, updates: Partial<Event>) => {
    // 1. RTDB (only if venueId provided)
    if (venueId) {
      const path = `venues/${venueId}/events/${eventId}`;
      try {
        const dbRef = ref(rtdb, path);
        await update(dbRef, updates);
      } catch (err) {
        console.error('RTDB Event Update Error:', err);
      }
    }

    // 2. Firestore
    try {
      const { doc, updateDoc, db, serverTimestamp } = await import('../lib/firebase');
      await updateDoc(doc(db, 'events', eventId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (fsErr) {
      console.error('Firestore Event Update Error:', fsErr);
      handleFirestoreError(fsErr, OperationType.UPDATE, 'events');
    }
  },

  purchaseTickets: async (eventId: string, venueId: string | undefined | null, tierName: string, quantity: number) => {
    try {
      const { doc, fsRunTransaction, db } = await import('../lib/firebase');
      const eventRef = doc(db, 'events', eventId);
      
      let updatedEventData: any = null;

      await fsRunTransaction(db, async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists()) throw new Error('Event does not exist!');

        const data = eventDoc.data();
        const tiers = data.ticketTiers || [];
        const tierIndex = tiers.findIndex((t: any) => t.name === tierName);
        
        if (tierIndex === -1) throw new Error('Tier not found!');
        
        const tier = tiers[tierIndex];
        const available = tier.capacity - (tier.sold || 0);

        if (quantity > available) {
          throw new Error('Not enough tickets available!');
        }

        tiers[tierIndex].sold = (tier.sold || 0) + quantity;
        const newTicketsSold = (data.ticketsSold || 0) + quantity;

        updatedEventData = {
          ticketTiers: tiers,
          ticketsSold: newTicketsSold
        };

        transaction.update(eventRef, updatedEventData);
      });

      // Mirror to RTDB
      if (venueId && updatedEventData) {
        const path = `venues/${venueId}/events/${eventId}`;
        const dbRef = ref(rtdb, path);
        await update(dbRef, updatedEventData);
      }

      return true;
    } catch (err) {
      console.error('Failed to purchase tickets:', err);
      throw err;
    }
  }
};
