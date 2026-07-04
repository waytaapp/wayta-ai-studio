import { rtdb, auth, OperationType, ref, get, set, update, push, rtdbQuery, orderByChild, equalTo, rtdbTimestamp, handleRTDBError, db, collection, addDoc, doc, setDoc, updateDoc, query, where, getDocs, serverTimestamp, handleFirestoreError } from '../lib/firebase';
import { OnboardingRequest, VerificationStatus } from '../types';
import { cleanForRTDB } from '../lib/utils';

export const verificationService = {
  async createRequest(data: Omit<OnboardingRequest, 'id' | 'timestamp' | 'status'> & { status?: VerificationStatus }) {
    // If it's an event, we use Firestore for the 'pending collection'
    if (data.type === 'EVENT') {
      try {
        const eventId = `event_${Date.now()}`;
        const payload: any = {
          id: eventId,
          type: 'EVENT',
          name: data.business_name || (data as any).name || 'N/A',
          businessName: data.business_name || (data as any).name || 'N/A',
          contactEmail: data.contact_email || (data as any).email || 'N/A',
          details: data.details || {},
          status: 'pending',
          createdAt: serverTimestamp(),
          // Metadata for linking later
          credentialsGenerated: false
        };

        const cleanPayload = JSON.parse(JSON.stringify(payload, (k, v) => v === undefined ? null : v));
        cleanPayload.createdAt = serverTimestamp();

        await setDoc(doc(db, 'events', eventId), cleanPayload);
        
        // We also create a light record in RTDB for the onboarding tracking (standard across the app)
        const rtdbPath = 'onboarding_requests';
        const newRequestRef = push(ref(rtdb, rtdbPath));
        await set(newRequestRef, {
          ...payload,
          firestoreId: eventId,
          venue_id: eventId,
          timestamp: rtdbTimestamp(),
          submittedAt: rtdbTimestamp(), // Overwrite for RTDB compatibility
        });

        return eventId;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'events');
      }
    }

    if (data.type === 'VENUE') {
      try {
        const venueId = `venue_${Date.now()}`;
        const venueDoc = {
          id: venueId,
          name: data.business_name || (data as any).name || 'N/A',
          location: data.details?.location || data.details?.address || 'TBD',
          address: data.details?.location || data.details?.address || 'TBD',
          description: data.details?.description || '',
          status: 'PENDING',
          accepted: false,
          type: data.details?.venueType || 'Club',
          capacity: data.details?.venueCapacity ? parseInt(data.details.venueCapacity) : 0,
          operating_days: data.details?.startDay ? `${data.details.startDay}-${data.details.endDay}` : '',
          operating_hours: data.details?.startTime ? `${data.details.startTime}-${data.details.endTime}` : '',
          createdAt: serverTimestamp(),
          contactEmail: data.contact_email,
          contactPerson: data.details?.contactPerson || '',
          phone: data.details?.phone || '',
        };

        await setDoc(doc(db, 'venues', venueId), venueDoc);
        
        // We also create a light record in RTDB for the onboarding tracking 
        const rtdbPath = 'onboarding_requests';
        const newRequestRef = push(ref(rtdb, rtdbPath));
        await set(newRequestRef, {
          type: 'VENUE',
          business_name: data.business_name,
          contact_email: data.contact_email,
          details: data.details || {},
          status: 'Pending',
          accepted: false,
          venue_id: venueId,
          timestamp: rtdbTimestamp(),
          submittedAt: rtdbTimestamp(),
        });

        return venueId;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'venues');
      }
    }

    // Default RTDB flow for other types
    const path = 'onboarding_requests';
    try {
      const requestsRef = ref(rtdb, path);
      const newRequestRef = push(requestsRef);
      
      const payload = cleanForRTDB({
        type: data.type || 'USER',
        business_name: data.business_name || (data as any).name || 'N/A',
        contact_email: data.contact_email || (data as any).email || 'N/A',
        details: data.details || {},
        status: data.status || 'Pending',
        timestamp: rtdbTimestamp(),
      });

      await set(newRequestRef, payload);
      return newRequestRef.key;
    } catch (error) {
      handleRTDBError(error, OperationType.CREATE, path);
    }
  },

  async getPendingRequests() {
    const path = 'onboarding_requests';
    try {
      const requests: OnboardingRequest[] = [];
      const requestsRef = ref(rtdb, path);
      const q = rtdbQuery(requestsRef, orderByChild('status'), equalTo('Pending'));
      const snapshot = await get(q);
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const data = child.val();
          // Avoid pushing RTDB venues and events if we're also grabbing them from Firestore
          if (data.type !== 'VENUE' && data.type !== 'EVENT') {
            requests.push({
              id: child.key!,
              ...data,
              timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString()
            } as OnboardingRequest);
          }
        });
      }

      // Fetch pending events from Firestore directly
      try {
        const eventsQuery = query(collection(db, 'events'), where('status', '==', 'pending'));
        const qs = await getDocs(eventsQuery);
        qs.forEach(doc => {
          const data = doc.data();
          requests.push({
             id: doc.id,
             type: 'EVENT',
             name: data.businessName || data.name || 'N/A',
             email: data.contactEmail || 'N/A',
             status: 'Pending',
             venue_id: doc.id,
             timestamp: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString() : new Date().toISOString(),
             details: data.details || {}
          });
        });
      } catch (err) {
         console.error('Failed to fetch pending events from Firestore', err);
      }

      // Fetch pending venues from Firestore directly
      try {
        const venuesQuery = query(collection(db, 'venues'), where('status', '==', 'PENDING'));
        const qs = await getDocs(venuesQuery);
        qs.forEach(doc => {
          const data = doc.data();
          requests.push({
             id: doc.id,
             type: 'VENUE',
             name: data.name,
             email: data.contactEmail || 'N/A',
             status: 'Pending',
             venue_id: doc.id, // Keep a reference to the venue ID explicitly
             timestamp: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString() : new Date().toISOString(),
             details: {
               venueCapacity: data.capacity,
               venueType: data.type,
               location: data.location,
               phone: data.phone
             }
          });
        });
      } catch (err) {
         console.error('Failed to fetch pending venues from Firestore', err);
      }

      // RTDB sort might be needed if orderByChild doesn't guarantee reverse chronological easily
      return requests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      handleRTDBError(error, OperationType.LIST, path);
    }
  },

  async updateRequestStatus(requestId: string, status: VerificationStatus, rejectionReason?: string, adminNotes?: string) {
    if (!requestId) {
      console.warn('verificationService.updateRequestStatus called without requestId');
      return;
    }
    
    // If it's a venue ID or event ID fetched directly from Firestore, update the collection directly
    if (requestId.startsWith('venue_') || requestId.startsWith('V-') || requestId.startsWith('event_')) {
       try {
         const collectionName = requestId.startsWith('event_') ? 'events' : 'venues';
         const updates: any = {
           status: status === 'Approved' ? (collectionName === 'events' ? 'accepted' : 'ACCEPTED') : status.toUpperCase()
         };
         if (status === 'Approved' && collectionName === 'venues') updates.accepted = true;
         if (status === 'Rejected') {
           updates.rejectionReason = rejectionReason;
           if (collectionName === 'venues') updates.accepted = false;
         }
         await updateDoc(doc(db, collectionName, requestId), updates);
       } catch (error) {
         handleFirestoreError(error, OperationType.UPDATE, `venues_or_events/${requestId}`);
       }
       return;
    }

    const path = `onboarding_requests/${requestId}`;
    try {
      const payload: any = cleanForRTDB({
        status,
        processedAt: rtdbTimestamp(),
        processedBy: auth.currentUser?.uid || 'system'
      });

      if (rejectionReason !== undefined) {
        payload.rejectionReason = rejectionReason;
      }
      if (adminNotes !== undefined) {
        payload.adminNotes = adminNotes;
      }

      await update(ref(rtdb, path), payload);
    } catch (error) {
      handleRTDBError(error, OperationType.UPDATE, path);
    }
  },

  async approveOnboarding(requestId: string, data: { name: string, email: string, type: string, details?: any, firestoreId?: string, venue_id?: string }) {
    try {
      const response = await fetch('/api/admin/approve-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          ...data
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve onboarding');
      }

      return await response.json();
    } catch (error) {
      console.error('Approve onboarding error:', error);
      throw error;
    }
  }
};
