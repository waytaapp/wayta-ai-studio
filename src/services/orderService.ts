import { rtdb, handleRTDBError, handleFirestoreError, OperationType, ref, get, set, update, push, onValue, rtdbQuery, orderByChild, equalTo, rtdbTimestamp, runTransaction, db, collection, query, where, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, getDoc, getDocs } from '../lib/firebase';
import { Order, MenuItem, Ticket } from '../types';
import { extensionService } from './extensionService';
import { inventoryService } from './inventoryService';
import { api } from '../lib/apiClient';
import { showToast } from '../lib/utils';

let isSyncingOfflineOrders = false;

export const orderService = {
  // Firestore Orders Listener
  listenToUserOrdersFirestore(userId: string, callback: (orders: Order[]) => void) {
    if (!userId) {
      console.warn('orderService.listenToUserOrdersFirestore called without userId');
      return () => {};
    }
    const q = query(collection(db, 'orders'), where('user_id', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      callback(orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders-user');
    });
  },

  listenToVenueOrdersFirestore(venueId: string, callback: (orders: Order[]) => void) {
    if (!venueId) {
      console.warn('orderService.listenToVenueOrdersFirestore called without venueId');
      return () => {};
    }
    const q = query(collection(db, 'orders'), where('venue_id', '==', venueId));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      callback(orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders-venue');
    });
  },

  listenToEventsOrdersFirestore(eventIds: string[], targetVenueId: string | null | undefined, callback: (orders: Order[]) => void) {
    if (!eventIds || eventIds.length === 0 || !targetVenueId) {
      callback([]);
      return () => {};
    }
    
    // Use venue_id to retrieve all and filter client side. This avoids 'in' query limit and ensures both eventId and event_id are checked
    const q = query(collection(db, 'orders'), where('venue_id', '==', targetVenueId));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      
      const eventOrders = orders.filter(o => 
        (o.event_id && eventIds.includes(o.event_id)) || 
        (o.eventId && eventIds.includes(o.eventId))
      );
      
      callback(eventOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      console.error('[DEBUG] listenToEventsOrdersFirestore error:', error);
      handleFirestoreError(error, OperationType.LIST, 'orders-events');
    });
  },

  async createOrder(order: Omit<Order, 'id' | 'timestamp'>, userEmail?: string) {
    if (typeof window !== 'undefined' && localStorage.getItem('isOrderPaused') === 'true') {
      throw new Error("GLOBAL ORDER PAUSE ACTIVE: New orders are temporarily frozen for system maintenance.");
    }
    console.log('[DEBUG] createOrder called with:', order);
    const rtdbPath = 'orders';

    // 1. Detect if currently offline (including simulated offline)
    const isCurrentlyOffline = typeof window !== 'undefined' && 
      (localStorage.getItem('wayta_simulated_offline') === 'true' || !navigator.onLine);

    if (isCurrentlyOffline) {
      console.log('[DEBUG] Device is offline. Local caching order.');
      const tempId = `offline-ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const timestamp = new Date().toISOString();
      const orderNum = Math.floor(1000 + Math.random() * 9000);
      const rawData = {
        id: tempId,
        ...order,
        order_number: orderNum,
        timestamp,
        status: order.status || 'Pending',
        payment_status: order.payment_status || 'Paid',
        userEmail
      };
      
      const orderData = JSON.parse(JSON.stringify(rawData, (_, v) => v === undefined ? null : v));
      const existingOffline = JSON.parse(localStorage.getItem('wayta_offline_orders') || '[]');
      existingOffline.push(orderData);
      localStorage.setItem('wayta_offline_orders', JSON.stringify(existingOffline));
      
      // Dispatch custom event to notify UI immediately
      window.dispatchEvent(new window.Event('wayta_offline_orders_changed'));
      return tempId;
    }

    try {
      const timestamp = new Date().toISOString();
      let orderNum = Math.floor(1000 + Math.random() * 9000);
      try {
        if (order.venue_id) {
          const counterRef = ref(rtdb, `venues/${order.venue_id}/orderCounter`);
          const res = await runTransaction(counterRef, (currentVal) => {
            return (currentVal || 0) + 1;
          });
          if (res.committed && res.snapshot.val()) {
            orderNum = res.snapshot.val();
          }
        }
      } catch (e) {
        console.warn("Could not get next order number", e);
      }

      const rawData = {
        ...order,
        order_number: orderNum,
        timestamp,
        createdAt: rtdbTimestamp(),
        updatedAt: rtdbTimestamp(),
        status: order.status || 'Pending'
      };

      // Robust scrub for RTDB (remove undefined values)
      const orderData = JSON.parse(JSON.stringify(rawData, (_, v) => v === undefined ? null : v));
      console.log('[DEBUG] createOrder written orderData:', orderData);

      let orderId = `ord-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Write to RTDB (Primary for legacy components) - Resilient
      try {
        const ordersRef = ref(rtdb, rtdbPath);
        const newOrderRef = push(ordersRef);
        if (newOrderRef.key) {
          orderId = newOrderRef.key;
        }
        await set(newOrderRef, orderData);
      } catch (rtdbErr) {
        console.warn('⚠️ RTDB Order Sync Failed (proceeding with Firestore):', rtdbErr);
      }

      // 2. Write to Firestore (Primary for History & Realtime Sync)
      try {
        await setDoc(doc(db, 'orders', orderId), {
          ...orderData,
          id: orderId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (fsErr) {
        console.error('❌ Firestore Order Sync Failed:', fsErr);
        // If Firestore fails, retry or fall back to offline cache
        throw fsErr;
      }

      if (order.items && order.venue_id) {
        for (const item of order.items) {
          if (item.item && item.item.id) {
            // 1. RTDB Sync
            try {
              const stockRef = ref(rtdb, `venues/${order.venue_id}/inventory/${item.item.id}/stock`);
              await runTransaction(stockRef, (currentStock) => {
                if (currentStock === null) return 0;
                return Math.max(0, currentStock - item.quantity);
              });
            } catch (rtdbErr) {
              console.warn('⚠️ RTDB Stock Decrement Failed:', rtdbErr);
            }

            // 2. Firestore Sync
            await inventoryService.decrementStock(item.item.id, item.quantity).catch(err => {
               console.warn('⚠️ Firestore Stock Decrement Failed:', err);
            });
          }
        }
      }
      
      // Trigger Email Extension if email is provided
      if (userEmail) {
        await extensionService.sendEmail(
          userEmail,
          `Order Confirmed: #${orderId.slice(0, 5).toUpperCase()}`,
          `Your order at the venue for R${order.total_amount} has been received and is being prepared. Status: ${order.status || 'Pending'}`
        );
      }

      return orderId;
    } catch (err) {
      console.error('❌ Direct Order Submission Failed, falling back to offline local storage:', err);
      // Fallback cache
      if (typeof window !== 'undefined') {
        const tempId = `offline-ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const timestamp = new Date().toISOString();
        const orderNum = Math.floor(1000 + Math.random() * 9000);
        const rawData = {
          id: tempId,
          ...order,
          order_number: orderNum,
          timestamp,
          status: order.status || 'Pending',
          payment_status: order.payment_status || 'Paid',
          userEmail
        };
        const orderData = JSON.parse(JSON.stringify(rawData, (_, v) => v === undefined ? null : v));
        const existingOffline = JSON.parse(localStorage.getItem('wayta_offline_orders') || '[]');
        existingOffline.push(orderData);
        localStorage.setItem('wayta_offline_orders', JSON.stringify(existingOffline));
        
        window.dispatchEvent(new window.Event('wayta_offline_orders_changed'));
        return tempId;
      }
      handleRTDBError(err, OperationType.CREATE, rtdbPath);
    }
  },

  // Ticket Methods
  async createTickets(tickets: Omit<Ticket, 'id'>[]) {
    const results = [];
    for (const ticketData of tickets) {
      const ticketRef = doc(collection(db, 'tickets'));
      const ticketId = ticketRef.id;
      const ticket = { ...ticketData, id: ticketId };
      await setDoc(ticketRef, {
        ...ticket,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      results.push(ticket);
    }
    return results;
  },

  listenToUserTickets(userId: string, callback: (tickets: Ticket[]) => void) {
    if (!userId) return () => {};
    const q = query(collection(db, 'tickets'), where('user_id', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ticket));
      callback(tickets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
  },

  async updateTicketStatus(ticketId: string, status: 'valid' | 'used' | 'expired', scannedBy?: string) {
    const ticketRef = doc(db, 'tickets', ticketId);
    const updateData: any = { status, updatedAt: serverTimestamp() };
    if (status === 'used') {
      updateData.scanned_at = new Date().toISOString();
      updateData.scanned_by = scannedBy;
    }
    await updateDoc(ticketRef, updateData);
  },

  listenToUserOrders(userId: string, callback: (orders: Order[]) => void) {
    if (!userId) {
      console.warn('orderService.listenToUserOrders called without userId');
      return () => {};
    }
    const path = 'orders';
    const ordersRef = ref(rtdb, path);
    const userOrdersQuery = rtdbQuery(ordersRef, orderByChild('user_id'), equalTo(userId));
    
    return onValue(userOrdersQuery, (snapshot) => {
      const ordersMap = new Map<string, Order>();
      snapshot.forEach((child) => {
        const order = {
          ...child.val(),
          id: child.key!
        } as Order;
        ordersMap.set(order.id, order);
      });
      const orders = Array.from(ordersMap.values());
      callback(orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      handleRTDBError(error, OperationType.LIST, path);
    });
  },

  listenToVenueOrders(venueId: string, callback: (orders: Order[]) => void) {
    if (!venueId) {
      console.warn('orderService.listenToVenueOrders called without venueId');
      return () => {};
    }
    const path = 'orders';
    const ordersRef = ref(rtdb, path);
    const venueOrdersQuery = rtdbQuery(ordersRef, orderByChild('venue_id'), equalTo(venueId));
    
    return onValue(venueOrdersQuery, (snapshot) => {
      const ordersMap = new Map<string, Order>();
      snapshot.forEach((child) => {
        const order = {
          ...child.val(),
          id: child.key!
        } as Order;
        ordersMap.set(order.id, order);
      });
      const orders = Array.from(ordersMap.values());
      callback(orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      handleRTDBError(error, OperationType.LIST, path);
    });
  },

  async updateOrderStatus(orderId: string, status: string, userId?: string) {
    // 1. Update local RTDB
    const rtdbPath = `orders/${orderId}`;
    try {
      const orderRef = ref(rtdb, rtdbPath);
      const updateData: any = { status, updatedAt: rtdbTimestamp() };
      if (status === 'Collected' || status === 'Completed' || status === 'collected' || status === 'completed') {
        updateData.completedAt = rtdbTimestamp();
      }
      await update(orderRef, updateData);

      // 2. Update Firestore
      try {
        const fsUpdateData: any = { status, updatedAt: serverTimestamp() };
        if (status === 'Collected' || status === 'Completed' || status === 'collected' || status === 'completed') {
          fsUpdateData.completedAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'orders', orderId), fsUpdateData);
      } catch (fsErr) {
        console.warn('⚠️ Firestore Status Sync Failed:', fsErr);
      }

      // 3. Call Server API
      try {
        await api.patch(`/api/v1/orders/${orderId}/status`, { status });
      } catch (apiErr) {
        console.warn('⚠️ API Status Sync failed:', apiErr);
      }

      // Trigger FCM Notification
      if ((status === 'Ready' || status === 'ready') && userId) {
        try {
          const userSnap = await get(ref(rtdb, `users/${userId}`));
          const userData = userSnap.val();
          if (userData?.fcmToken) {
            const { sendOrderReadyNotification } = await import('./notificationService');
            await sendOrderReadyNotification(userData.fcmToken, orderId);
          }
        } catch (fcmErr) {
          console.error('❌ FCM Notification Relay Error:', fcmErr);
        }
      }
    } catch (err) {
      handleRTDBError(err, OperationType.UPDATE, rtdbPath);
    }
  },

  async syncOfflineOrders() {
    if (typeof window === 'undefined') return;
    if (isSyncingOfflineOrders) {
      console.log('[DEBUG] syncOfflineOrders already in progress. Skipping duplicate execution.');
      return;
    }

    const isCurrentlyOffline = localStorage.getItem('wayta_simulated_offline') === 'true' || !navigator.onLine;
    if (isCurrentlyOffline) {
      console.log('[DEBUG] Cannot sync offline orders yet: Grid still offline.');
      return;
    }

    const cached = localStorage.getItem('wayta_offline_orders');
    if (!cached) return;
    const offlineOrders = JSON.parse(cached);
    if (!Array.isArray(offlineOrders) || offlineOrders.length === 0) return;

    isSyncingOfflineOrders = true;

    try {
      // Immediately clear from localStorage to prevent duplicate sync on rapid reloads
      localStorage.removeItem('wayta_offline_orders');
      window.dispatchEvent(new window.Event('wayta_offline_orders_changed'));

      console.log('[DEBUG] Back online! Syncing cached orders:', offlineOrders.length);
      const remaining = [];
      for (const order of offlineOrders) {
        try {
          const { id, userEmail, order_number, timestamp, ...pureOrder } = order;
          
          const rtdbPath = 'orders';
          const timestampOnline = new Date().toISOString();
          let orderNum = Math.floor(1000 + Math.random() * 9000);
          try {
            if (pureOrder.venue_id) {
              const counterRef = ref(rtdb, `venues/${pureOrder.venue_id}/orderCounter`);
              const res = await runTransaction(counterRef, (currentVal) => {
                return (currentVal || 0) + 1;
              });
              if (res.committed && res.snapshot.val()) {
                orderNum = res.snapshot.val();
              }
            }
          } catch (e) {
            console.warn("Could not get next order number on sync", e);
          }

          const rawData = {
            ...pureOrder,
            order_number: orderNum,
            timestamp: timestampOnline,
            createdAt: rtdbTimestamp(),
            updatedAt: rtdbTimestamp(),
            status: pureOrder.status || 'Pending'
          };

          const orderData = JSON.parse(JSON.stringify(rawData, (_, v) => v === undefined ? null : v));
          const ordersRef = ref(rtdb, rtdbPath);
          const newOrderRef = push(ordersRef);
          const orderId = newOrderRef.key!;
          await set(newOrderRef, orderData);

          try {
            await setDoc(doc(db, 'orders', orderId), {
              ...orderData,
              id: orderId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } catch (fsErr) {
            console.error('❌ Firestore Sync in syncOfflineOrders Failed:', fsErr);
          }

          // Decrement stock for each item atomically
          if (pureOrder.items && pureOrder.venue_id) {
            for (const item of pureOrder.items) {
              if (item.item && item.item.id) {
                const stockRef = ref(rtdb, `venues/${pureOrder.venue_id}/inventory/${item.item.id}/stock`);
                await runTransaction(stockRef, (currentStock) => {
                  if (currentStock === null) return 0;
                  return Math.max(0, currentStock - item.quantity);
                });
                await inventoryService.decrementStock(item.item.id, item.quantity).catch(err => {
                   console.warn('⚠️ Firestore Stock Decrement in sync failed:', err);
                });
              }
            }
          }

          if (userEmail) {
            await extensionService.sendEmail(
              userEmail,
              `Order Sync: #${orderId.slice(0, 5).toUpperCase()}`,
              `Your offline order has been successfully uploaded to server and is being prepared. Status: ${pureOrder.status || 'Pending'}`
            ).catch(e => console.warn('Sync email failed:', e));
          }
        } catch (err) {
          console.error('Failed to sync offline order:', order, err);
          remaining.push(order);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem('wayta_offline_orders', JSON.stringify(remaining));
      } else {
        localStorage.removeItem('wayta_offline_orders');
      }
      window.dispatchEvent(new window.Event('wayta_offline_orders_changed'));
    } finally {
      isSyncingOfflineOrders = false;
    }
  },

  async checkBudgetThreshold(userId: string, newOrderTotal: number) {
    try {
      if (!userId) return;
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;
      
      const userData = userSnap.data();
      const budgetLimit = Number(userData.budget_limit || 0);
      if (!budgetLimit || budgetLimit <= 0) return;
      
      const q = query(collection(db, 'orders'), where('user_id', '==', userId));
      const querySnap = await getDocs(q);
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      let spentToday = 0;
      querySnap.forEach(innerDoc => {
        const orderData = innerDoc.data() as Order;
        const currentStatus = (orderData.status || '').toLowerCase();
        
        if (currentStatus !== 'cancelled') {
          const orderTime = new Date(orderData.timestamp);
          if (orderTime.getTime() >= todayStart.getTime()) {
            spentToday += (orderData.total_amount || orderData.total || 0);
          }
        }
      });
      
      const projectedSpent = spentToday + newOrderTotal;
      const threshold = budgetLimit * 0.8;
      
      if (projectedSpent >= threshold) {
        const percentUsed = Math.round((projectedSpent / budgetLimit) * 100);
        showToast(
          `Alert: Budget alert! You have utilized ${percentUsed}% of your daily budget limit (R${budgetLimit}). Projected total spend including this event: R${projectedSpent}.`,
          'warning'
        );
      }
    } catch (err) {
      console.error('Error in checkBudgetThreshold:', err);
    }
  }
};
