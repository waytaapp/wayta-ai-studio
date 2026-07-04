import { rtdb, handleRTDBError, handleFirestoreError, OperationType, ref, get, set, push, onValue, db, collection, onSnapshot, query, where, getDocs, addDoc, collectionGroup } from '../lib/firebase';
import { Venue, MenuItem, Event } from '../types';

export const venueService = {
  // ... existing code ...
  listenToAllEvents(callback: (events: Event[]) => void) {
    const eventsColl = collection(db, 'events');
    return onSnapshot(eventsColl, (snapshot) => {
      const events: Event[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Event));
      callback(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
  },
  // Existing RTDB methods...
  async getAllVenues(): Promise<Venue[]> {
    const path = 'venues';
    try {
      const venuesRef = ref(rtdb, path);
      const snapshot = await get(venuesRef);
      if (!snapshot.exists()) return [];

      const venues: Venue[] = [];
      snapshot.forEach((child) => {
        venues.push({ ...child.val(), id: child.key! } as Venue);
      });
      return venues;
    } catch (err) {
      handleRTDBError(err, OperationType.LIST, path);
      return [];
    }
  },

  // Firestore-based venues
  listenToVenuesFirestore(callback: (venues: Venue[]) => void) {
    const venuesColl = collection(db, 'venues');
    return onSnapshot(venuesColl, (snapshot) => {
      const venues: Venue[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Venue));
      callback(venues);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'venues');
    });
  },

  async getVenueById(id: string): Promise<Venue | null> {
    const path = `venues/${id}`;
    try {
      const venueRef = ref(rtdb, path);
      const snapshot = await get(venueRef);
      if (snapshot.exists()) {
        return { ...snapshot.val(), id: snapshot.key! } as Venue;
      }
      return null;
    } catch (err) {
      handleRTDBError(err, OperationType.GET, path);
      return null;
    }
  },

  listenToVenues(callback: (venues: Venue[]) => void) {
    const path = 'venues';
    const venuesRef = ref(rtdb, path);
    return onValue(venuesRef, (snapshot) => {
      const venues: Venue[] = [];
      snapshot.forEach((child) => {
        venues.push({ ...child.val(), id: child.key! } as Venue);
      });
      callback(venues);
    }, (error) => {
      handleRTDBError(error, OperationType.LIST, path);
    });
  },

  // Menu Items subcollection in Firestore
  listenToMenuItems(venueId: string, callback: (items: MenuItem[]) => void) {
    const menuItemsColl = collection(db, 'venues', venueId, 'menuItems');
    return onSnapshot(menuItemsColl, (snapshot) => {
      const items: MenuItem[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as MenuItem));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `venues/${venueId}/menuItems`);
    });
  },

  // Events subcollection in Firestore
  listenToEventsFirestore(venueId: string, callback: (events: any[]) => void) {
    const eventsColl = collection(db, 'venues', venueId, 'events');
    return onSnapshot(eventsColl, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      callback(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `venues/${venueId}/events`);
    });
  },

  async createVenue(venue: Omit<Venue, 'id'>) {
    const path = `venues`;
    try {
      const venuesRef = ref(rtdb, path);
      const newVenueRef = push(venuesRef);
      await set(newVenueRef, venue);
      return newVenueRef.key;
    } catch (err) {
      handleRTDBError(err, OperationType.CREATE, path);
    }
  },

  async updateVenue(venueId: string, updates: Partial<Venue>) {
    const path = `venues/${venueId}`;
    try {
      const venueRef = ref(rtdb, path);
      const existing = await get(venueRef);
      await set(venueRef, { ...(existing.exists() ? existing.val() : {}), ...updates });
    } catch (err) {
      handleRTDBError(err, OperationType.UPDATE, path);
    }
  },

  listenToVenue(venueId: string, callback: (venue: Venue) => void) {
    const path = `venues/${venueId}`;
    const venueRef = ref(rtdb, path);
    return onValue(venueRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...snapshot.val(), id: snapshot.key! } as Venue);
      }
    }, (error) => {
      handleRTDBError(error, OperationType.GET, path);
    });
  },

  async addReview(venueId: string, review: { user_id: string; user_name: string; rating: number; comment: string }) {
    const path = `venue_reviews/${venueId}`;
    try {
      const reviewsRef = ref(rtdb, path);
      const newReviewRef = push(reviewsRef);
      const reviewData = {
        ...review,
        created_at: new Date().toISOString()
      };
      await set(newReviewRef, reviewData);
      return newReviewRef.key;
    } catch (err) {
      handleRTDBError(err, OperationType.CREATE, path);
    }
  },

  listenToReviewCount(venueId: string, callback: (count: number) => void) {
    const path = `venue_reviews/${venueId}`;
    const reviewsRef = ref(rtdb, path);
    return onValue(reviewsRef, (snapshot) => {
      // @ts-ignore - DataSnapshot has numChildren
      callback(snapshot.numChildren());
    });
  },

  listenToReviews(venueId: string, callback: (reviews: any[]) => void) {
    const path = `venue_reviews/${venueId}`;
    const reviewsRef = ref(rtdb, path);
    return onValue(reviewsRef, (snapshot) => {
      const reviews: any[] = [];
      snapshot.forEach((child) => {
        reviews.push({ ...child.val(), id: child.key! });
      });
      callback(reviews);
    }, (error) => {
      handleRTDBError(error, OperationType.LIST, path);
    });
  }
};
