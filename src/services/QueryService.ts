import { rtdb, handleRTDBError, OperationType, ref, get, rtdbQuery, orderByChild, equalTo } from '../lib/firebase';
import { UserProfile, UserRole } from './authService';

export class QueryService {
  /**
   * PATRON VIEW: Filter menus/products by venue_id and pricing.
   */
  static async getVenueMenu(venueId: string) {
    if (!venueId) return [];
    // In RTDB, we assume menus are under venues/{venueId}/menus
    const path = `venues/${venueId}/menus`;
    const dbRef = ref(rtdb, path);
    const q = rtdbQuery(dbRef, orderByChild('category'));
    
    try {
      const snapshot = await get(q);
      if (!snapshot.exists()) return [];
      
      const results: any[] = [];
      snapshot.forEach((child) => {
        results.push({ id: child.key, ...child.val() });
      });
      // Further sorting by price if needed
      return results.sort((a, b) => {
        if (a.category === b.category) return (a.price || 0) - (b.price || 0);
        return 0;
      });
    } catch (err) {
      handleRTDBError(err, OperationType.GET, path);
      return [];
    }
  }

  /**
   * STAFF VIEW: Filter venue_managers and bartenders by assigned_venue_id.
   */
  static async getStaffByVenue(venueId: string) {
    const path = 'users';
    const dbRef = ref(rtdb, path);
    // RTDB limited to one filter, so filter by venueId and role in memory
    const q = rtdbQuery(dbRef, orderByChild('assigned_venue_id'), equalTo(venueId));
    
    try {
      const snapshot = await get(q);
      if (!snapshot.exists()) return [];
      
      const results: any[] = [];
      snapshot.forEach((child) => {
        const data = child.val();
        if (['MANAGER', 'BARTENDER'].includes(data.role)) {
          results.push({ id: child.key, ...data });
        }
      });
      // Sort by last_login desc
      return results.sort((a, b) => (b.last_login || 0) - (a.last_login || 0));
    } catch (err) {
      handleRTDBError(err, OperationType.GET, path);
      return [];
    }
  }

  /**
   * VENDOR VIEW: Query vendors associated with vendor_management documents.
   */
  static async getVendorManagement() {
    const path = 'vendor_management';
    const dbRef = ref(rtdb, path);
    const q = rtdbQuery(dbRef, orderByChild('updated_at'));
    
    try {
      const snapshot = await get(q);
      if (!snapshot.exists()) return [];
      
      const results: any[] = [];
      snapshot.forEach((child) => {
        results.push({ id: child.key, ...child.val() });
      });
      return results.reverse(); // desc order
    } catch (err) {
      handleRTDBError(err, OperationType.GET, path);
      return [];
    }
  }

  /**
   * BARTENDER VIEW: Get orders for their specific venue.
   */
  static async getActiveOrders(venueId: string) {
    if (!venueId) {
      console.warn('QueryService.getActiveOrders called without venueId');
      return [];
    }
    const path = 'orders';
    const dbRef = ref(rtdb, path);
    const q = rtdbQuery(dbRef, orderByChild('venue_id'), equalTo(venueId));
    
    try {
      const snapshot = await get(q);
      if (!snapshot.exists()) return [];
      
      const results: any[] = [];
      snapshot.forEach((child) => {
        results.push({ id: child.key, ...child.val() });
      });
      // Sort by timestamp desc
      return results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (err) {
      handleRTDBError(err, OperationType.GET, path);
      return [];
    }
  }
}
