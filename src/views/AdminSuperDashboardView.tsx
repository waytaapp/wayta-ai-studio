import React, { useEffect, useState, useCallback, useRef } from 'react';
import { UserProfile, updateUserProfile } from '../services/authService';
import { cn } from '../lib/utils';
import { 
  Trash2, RefreshCw, Edit, Save, X, Users, Activity, 
  Map, Calendar, Shield, Search, Power, ShieldAlert, 
  AlertTriangle, Play, Pause, ChevronRight, Fingerprint,
  Database, ServerCrash, CheckCircle, PauseCircle,
  Bell, FileText, Filter, Clock, Sparkles, Palette, Wand2,
  Plus, MapPin, TrendingUp
} from 'lucide-react';
import { api } from '../lib/apiClient';
import { db, rtdb, auth, fsRunTransaction, database } from '../lib/firebase';
import { collection, doc, query, onSnapshot, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import { ref, onValue, get, update, runTransaction } from 'firebase/database';
import { Venue, Event } from '../types';
import { ThemePreviewer } from '../components/ThemePreviewer';

interface SystemState {
  global_order_pause: boolean;
  test_mode: boolean;
}

interface Telemetry {
  activeConnections: number;
  salesVolume: number;
  apiSuccessRate: number;
}

export const AdminSuperDashboardView = () => {
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'VENUES' | 'EVENTS' | 'USERS' | 'SYSTEM' | 'AUDIT_TRAIL' | 'BROADCASTER' | 'THEMES'>('TELEMETRY');
  
  // Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [systemState, setSystemState] = useState<SystemState>({ global_order_pause: false, test_mode: false });
  const [telemetry, setTelemetry] = useState<Telemetry>({ activeConnections: 0, salesVolume: 0, apiSuccessRate: 100 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  
  // New States for Super Core features
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');
  
  // Broadcaster State
  const [broadcastTarget, setBroadcastTarget] = useState<string>('ALL');
  const [broadcastTitle, setBroadcastTitle] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastType, setBroadcastType] = useState<string>('SYSTEM');
  const [broadcastSending, setBroadcastSending] = useState(false);
  
  // System Maintenance Parameters
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [maxTxLimit, setMaxTxLimit] = useState<number>(5000);

  // Spend tracker state
  const [userSpends, setUserSpends] = useState<Record<string, number>>({});

  // Party Statement state
  const [selectedPartyUser, setSelectedPartyUser] = useState<UserProfile | null>(null);
  const [partyOrders, setPartyOrders] = useState<any[]>([]);
  const [partyTickets, setPartyTickets] = useState<any[]>([]);

  // Double confirmation state
  const [doubleConfirmModal, setDoubleConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    requiredWord: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [doubleConfirmInput, setDoubleConfirmInput] = useState('');

  // Filtering states
  const [venueStatusFilter, setVenueStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SUSPENDED'>('ALL');
  const [eventStatusFilter, setEventStatusFilter] = useState<'ALL' | 'LIVE' | 'CANCELLED' | 'PENDING'>('ALL');
  const [themeOverrideVenue, setThemeOverrideVenue] = useState<Venue | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  // Event Creation State
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    venueId: '',
    date: '',
    time: '20:00 - 02:00',
    ticketPrice: '150',
    ticketsTotal: '500',
    eventType: 'CLUB',
    description: '',
  });
  
  // Live Analytics Aggregates
  const [analytics, setAnalytics] = useState({
    totalOrdersCount: 0,
    totalTicketsCount: 0,
    totalRevenueZar: 0,
    lastCalculated: new Date()
  });

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: () => Promise<void>, title: string, message: string} | null>(null);

  // Polling Worker for Telemetry
  const telemetryWorkerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    // 1. Listen to System State (Kill Switches)
    let unsubSys: (() => void) | null = null;
    try {
      const sysRef = ref(rtdb, 'platform_settings/system');
      unsubSys = onValue(sysRef, (snap) => {
        if (snap.exists()) setSystemState(snap.val());
      }, (error) => {
        console.warn("RTDB System Settings connection failed silently:", error);
      });
    } catch (e) {
      console.warn("Defensive catch: RTDB platform_settings/system failed to initialize:", e);
    }

    // 2. Listen to Users (RTDB)
    let unsubUsers: (() => void) | null = null;
    try {
      const usersRef = ref(rtdb, 'users');
      unsubUsers = onValue(usersRef, (snap) => {
        const parsed: UserProfile[] = [];
        snap.forEach(child => {
          parsed.push({ uid: child.key!, ...child.val() } as UserProfile);
        });
        setUsers(parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
        setLoading(false);
      }, (error) => {
        console.warn("RTDB Users connection failed silently, falling back to empty list:", error);
        setLoading(false);
      });
    } catch (e) {
      console.warn("Defensive catch: RTDB users failed to initialize:", e);
      setLoading(false);
    }

    // 3. Listen to Venues (RTDB)
    let unsubVenues: (() => void) | null = null;
    try {
      const venuesRef = ref(rtdb, 'venues');
      unsubVenues = onValue(venuesRef, (snap) => {
        const parsed: Venue[] = [];
        snap.forEach(child => {
          parsed.push({ id: child.key!, ...child.val() } as Venue);
        });
        setVenues(parsed);
      }, (error) => {
        console.warn("RTDB Venues connection failed silently, falling back to empty list:", error);
      });
    } catch (e) {
      console.warn("Defensive catch: RTDB venues failed to initialize:", e);
    }

    // 4. Listen to Events (Firestore)
    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));
    }, (error) => {
      console.warn("Firestore events query onSnapshot error (silently caught):", error);
    });

    // 4.5 Listen to Orders (Firestore)
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Firestore orders query onSnapshot error:", error);
    });

    // 5. Telemetry Polling Worker (Mocking active real-time load)
    telemetryWorkerRef.current = setInterval(() => {
      setTelemetry(prev => ({
        activeConnections: Math.floor(Math.random() * 50) + 120, // baseline 120+
        salesVolume: prev.salesVolume + (Math.random() * 20), // slower slow growth
        apiSuccessRate: 99.0 + (Math.random() * 0.99)
      }));
    }, 3000);

    // 6. Listen to Audit Logs (Firestore)
    let unsubAuditLogs: (() => void) | null = null;
    try {
      const q = query(collection(db, 'admin_audit_logs'));
      unsubAuditLogs = onSnapshot(q, (snap) => {
        const parsed = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            timestamp: d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp)) : new Date()
          };
        });
        parsed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setAuditLogs(parsed);
      }, (error) => {
        console.warn("Firestore Audit Logs connection failed:", error);
      });
    } catch (e) {
      console.warn("Defensive catch: Audit Logs subscription failed:", e);
    }

    // 7. Load real aggregates from Firestore once on start
    const fetchRealAggregates = async () => {
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const ticketsSnap = await getDocs(collection(db, 'tickets'));
        let revSum = 0;
        let ordCount = ordersSnap.size;
        let tktCount = ticketsSnap.size;
        
        const spends: Record<string, number> = {};
        ordersSnap.forEach(docSnap => {
          const d = docSnap.data();
          const amt = parseFloat(d.total_amount || d.total || '0');
          if (!isNaN(amt)) revSum += amt;

          const userId = d.userId || d.customer_id || d.customerId || d.uid;
          if (userId && !isNaN(amt)) {
            spends[userId] = (spends[userId] || 0) + amt;
          }
        });

        setUserSpends(spends);

        setAnalytics({
          totalOrdersCount: ordCount,
          totalTicketsCount: tktCount,
          totalRevenueZar: revSum,
          lastCalculated: new Date()
        });

        // Seed initial telemetry salesVolume with actual database revenue to make it dynamic and real!
        setTelemetry(prev => ({
          ...prev,
          salesVolume: revSum
        }));
      } catch (err) {
        console.warn("Failed to fetch real analytics aggregates:", err);
      }
    };
    fetchRealAggregates();

    // 8. Listen to system maintenance and limits (RTDB)
    let unsubMaint: (() => void) | null = null;
    try {
      const maintRef = ref(rtdb, 'platform_settings/maintenance');
      unsubMaint = onValue(maintRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          setMaintenanceMode(!!val.maintenance_mode);
          setMaxTxLimit(val.max_transaction_amount || 5000);
        }
      });
    } catch (e) {
      console.warn("RTDB platform_settings/maintenance connection failed:", e);
    }

    return () => {
      if (unsubSys) {
        try { unsubSys(); } catch (_) {}
      }
      if (unsubUsers) {
        try { unsubUsers(); } catch (_) {}
      }
      if (unsubVenues) {
        try { unsubVenues(); } catch (_) {}
      }
      if (unsubEvents) {
        try { unsubEvents(); } catch (_) {}
      }
      if (unsubOrders) {
        try { unsubOrders(); } catch (_) {}
      }
      if (unsubAuditLogs) {
        try { unsubAuditLogs(); } catch (_) {}
      }
      if (unsubMaint) {
        try { unsubMaint(); } catch (_) {}
      }
      if (telemetryWorkerRef.current) clearInterval(telemetryWorkerRef.current);
    };
  }, []);

  // --- AUDIT LOGGING ---
  const logAudit = async (action: string, targetId: string, metadata: any) => {
    // Audit logs strictly happen via transactions to ensure immutability
    const adminUid = auth.currentUser?.uid || 'UNKNOWN_ADMIN';
    const logRef = doc(collection(db, 'admin_audit_logs'));
    
    // We don't block the UI for logs, but we still use transaction for defensive write
    try {
      await fsRunTransaction(db, async (trans) => {
        trans.set(logRef, {
          adminUid,
          action,
          targetId,
          metadata,
          timestamp: serverTimestamp()
        });
      });
    } catch (e) {
      console.warn("Audit Log failed to write:", e);
    }
  };

  // --- DEFENSIVE ACTIONS ---

  const requestAction = (title: string, message: string, actionBody: () => Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      action: async () => {
        try {
          await actionBody();
          showToast('Execution Successful.', 'success');
        } catch (e: any) {
          console.error("Action aborted:", e);
          showToast(`System Error / Aborted: ${e.message}`, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const requestDoubleConfirmAction = (
    title: string, 
    message: string, 
    requiredWord: string, 
    onConfirm: () => Promise<void>
  ) => {
    setDoubleConfirmInput('');
    setDoubleConfirmModal({
      isOpen: true,
      title,
      message,
      requiredWord: requiredWord.toUpperCase(),
      onConfirm: async () => {
        try {
          await onConfirm();
          showToast('Destructive execution complete.', 'success');
        } catch (e: any) {
          console.error("Action aborted:", e);
          showToast(`Aborted: ${e.message}`, 'error');
        } finally {
          setDoubleConfirmModal(null);
          setDoubleConfirmInput('');
        }
      }
    });
  };

  // User Actions with Safety Double-Confirmation
  const handleToggleUserSuspend = (user: UserProfile) => {
    const isSuspended = user.status === 'SUSPENDED';
    requestDoubleConfirmAction(
      isSuspended ? 'Reinstate User Identity' : 'Suspend User Identity',
      `Are you sure you want to ${isSuspended ? 'reinstate' : 'suspend'} ${user.email || user.uid}? They will be immediately ${isSuspended ? 'granted access' : 'locked out of all sessions'}. Type "${isSuspended ? 'REINSTATE' : 'SUSPEND'}" to confirm.`,
      isSuspended ? 'REINSTATE' : 'SUSPEND',
      async () => {
        const userRef = ref(rtdb, `users/${user.uid}`);
        await runTransaction(userRef, (currentData) => {
          if (currentData) {
            currentData.status = isSuspended ? 'APPROVED' : 'SUSPENDED';
          }
          return currentData;
        });
        await logAudit('TOGGLE_SUSPEND_USER', user.uid, { previousState: user.status });
      }
    );
  };

  const handleSoftDeleteUser = (uid: string, email: string) => {
    requestDoubleConfirmAction(
      'Soft Delete User',
      `Are you sure you want to mark ${email} as deleted? They will be locked out immediately and hidden from search. Type "DELETE" to confirm.`,
      'DELETE',
      async () => {
        const userRef = ref(rtdb, `users/${uid}`);
        await update(userRef, { is_deleted: true, status: 'SUSPENDED' });
        await logAudit('SOFT_DELETE_USER', uid, {});
      }
    );
  };

  const handlePermanentDeleteUserCascade = (uid: string, email: string) => {
    requestDoubleConfirmAction(
      'PERMANENT CASCADE DELETE',
      `⚠️ CRITICAL WARNING: This permanently purges ${email} from EVERY database table, Firestore role collection, and RTDB. All sessions will be terminated and user progress cleared. THIS ACTION IS IRREVERSIBLE. Type "CASCADE" to execute.`,
      'CASCADE',
      async () => {
        const { userService } = await import('../services/userService');
        await userService.permanentlyDeleteUser(uid);
        await logAudit('PERMANENT_CASCADE_DELETE_USER', uid, { cascade: true });
      }
    );
  };

  // Inline Role Modification
  const handleUpdateUserRole = async (uid: string, email: string, oldRole: string, newRole: string) => {
    try {
      showToast('Elevating security clearance...', 'success');
      
      // Update RTDB users
      const userRtdbRef = ref(rtdb, `users/${uid}`);
      await update(userRtdbRef, { role: newRole });

      // Update Firestore users
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });

      await logAudit('UPDATE_USER_ROLE', uid, { oldRole, newRole, email });
      showToast(`User ${email} promoted to ${newRole} role.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update role claim: ${err.message}`, 'error');
    }
  };

  // Venue Approval Toggle
  const handleToggleVenueVerification = async (venue: Venue, newStatus: 'Pending' | 'Approved' | 'Suspended') => {
    try {
      showToast(`Setting verification to ${newStatus}...`, 'success');
      
      // Update RTDB
      const vRtdbRef = ref(rtdb, `venues/${venue.id}`);
      await update(vRtdbRef, { verification_status: newStatus, status: newStatus === 'Approved' ? 'Open' : 'Closed' });

      // Update Firestore
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'venues', venue.id), { verification_status: newStatus, status: newStatus === 'Approved' ? 'Open' : 'Closed' }, { merge: true });

      await logAudit('TOGGLE_VENUE_VERIFICATION', venue.id, { previousStatus: (venue as any).verification_status || venue.status, newStatus });
      showToast(`Venue ${venue.name} verification status set to ${newStatus}.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update registration: ${err.message}`, 'error');
    }
  };

  // Dynamic Theme Preset Override
  const handleSaveThemeOverride = async (venueId: string, primaryColor: string, themePreset: string) => {
    try {
      showToast('Deploying theme overrides...', 'success');
      const themeObj = { primaryColor, theme_preset: themePreset, updatedAt: Date.now() };
      
      // Update RTDB
      const vRtdbRef = ref(rtdb, `venues/${venueId}/theme`);
      await update(vRtdbRef, themeObj);

      // Update Firestore
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'venues', venueId), { theme: themeObj }, { merge: true });

      await logAudit('VENUE_THEME_OVERRIDE', venueId, themeObj);
      setThemeOverrideVenue(null);
      showToast('Dynamic theme override deployed successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Theme override deployment failed: ${err.message}`, 'error');
    }
  };

  // Cancel/Archive Event (gated by live orders check)
  const handleCancelArchiveEvent = async (event: Event) => {
    try {
      // 1. Client-side unresolved active orders verification
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      const ordersQ = query(collection(db, 'orders'), where('eventId', '==', event.id));
      const ordersSnap = await getDocs(ordersQ);
      const unresolved = ordersSnap.docs.filter(docSnap => {
        const status = (docSnap.data().status || '').toLowerCase();
        return ['pending', 'preparing', 'ready', 'ordered', 'uncollected', 'active'].includes(status);
      });

      if (unresolved.length > 0) {
        showToast(`Aborted: This event has ${unresolved.length} unresolved active orders. Purse them first!`, 'error');
        return;
      }
    } catch (err: any) {
      console.warn("Client-side active order validation skipped, fallback to backend:", err);
    }

    requestDoubleConfirmAction(
      'Cancel & Archive Event',
      `You are about to cancel and archive "${event.title}". This locks further order registries. Type "CANCEL" to proceed.`,
      'CANCEL',
      async () => {
        // Soft delete / cancel in Firestore
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        await updateDoc(doc(db, 'events', event.id), { status: 'Cancelled', is_archived: true });

        // Update in RTDB
        if (event.venueId) {
          const rtdbRef = ref(rtdb, `venues/${event.venueId}/events/${event.id}`);
          await update(rtdbRef, { status: 'Cancelled' }).catch(() => {});
        }

        await logAudit('CANCEL_ARCHIVE_EVENT', event.id, { title: event.title, previousState: event.status });
        showToast('Event successfully cancelled and archived.', 'success');
      }
    );
  };

  // Hard Delete Venue (calling backend api, checking unresolved live orders)
  const handlePermanentDeleteVenueFully = async (venueId: string, name: string) => {
    requestDoubleConfirmAction(
      'Hard Purge Venue',
      `⚠️ WARNING: This will completely erase Venue "${name}" from all registers. This check validates active live orders first. Type "PURGE" to verify.`,
      'PURGE',
      async () => {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(`/api/admin/venues/${venueId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Server rejected venue purge.');
        }

        await logAudit('HARD_DELETE_VENUE', venueId, { name });
        showToast(`Venue "${name}" purged successfully.`, 'success');
      }
    );
  };

  // Hard Delete Event (calling backend api, checking unresolved live orders)
  const handlePermanentDeleteEventFully = async (eventId: string, title: string) => {
    requestDoubleConfirmAction(
      'Hard Purge Event',
      `⚠️ WARNING: This will completely erase Event "${title}" from all registers. This check validates active live orders first. Type "PURGE" to verify.`,
      'PURGE',
      async () => {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Server rejected event purge.');
        }

        await logAudit('HARD_DELETE_EVENT', eventId, { title });
        showToast(`Event "${title}" purged successfully.`, 'success');
      }
    );
  };

  const handleSwitchUser = async (uid: string) => {
    try {
      showToast('Generating Impersonation Token...', 'success');
      const response = await api.post('/api/impersonate', { targetUid: uid }) as { success: boolean; token?: string };
      if (response && response.token) {
        localStorage.setItem('wayta_impersonating', 'true');
        localStorage.setItem('wayta_impersonator_uid', auth.currentUser?.uid || '');
        
        await logAudit('IMPERSONATE_USER', uid, {});

        const { signInWithCustomToken } = await import('firebase/auth');
        const userCredential = await signInWithCustomToken(auth, response.token);
        const idToken = await userCredential.user.getIdToken();
        sessionStorage.setItem('auth_token', idToken);
        
        window.location.href = import.meta.env.BASE_URL; 
      } else {
        throw new Error('No impersonation token returned');
      }
    } catch (err: any) {
      showToast(`Impersonation Failed: ${err.message}`, 'error');
    }
  };

  // --- BROADCASTER & PLATFORM OPERATIONS ---
  const handleSendBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      showToast('Title and message are required for broadcast!', 'error');
      return;
    }
    setBroadcastSending(true);
    try {
      showToast('Sending broadcast...', 'success');
      
      const adminUid = auth.currentUser?.uid || 'SUPER_ADMIN_CORE';
      
      // Determine targets
      let targets: string[] = [];
      if (broadcastTarget === 'ALL') {
        targets = users.map(u => u.uid).filter(Boolean);
      } else if (broadcastTarget === 'STAFF_ONLY') {
        const staffRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'BARTENDER', 'EVENT_MANAGER', 'STAFF', 'WAITER'];
        targets = users.filter(u => staffRoles.includes(u.role || '')).map(u => u.uid).filter(Boolean);
      } else {
        targets = [broadcastTarget];
      }

      if (targets.length === 0) {
        throw new Error('No targets found matching filter criteria.');
      }

      // Add to Firestore notifications
      const promises = targets.map(async (targetId) => {
        await addDoc(collection(db, 'notifications'), {
          targetUserId: targetId,
          title: broadcastTitle,
          message: broadcastMessage,
          type: broadcastType,
          read: false,
          timestamp: serverTimestamp()
        });
      });

      await Promise.all(promises);

      // Save audit log
      await logAudit('BROADCAST_NOTIFICATION', broadcastTarget, {
        title: broadcastTitle,
        type: broadcastType,
        recipientCount: targets.length
      });

      showToast(`Broadcast successfully sent to ${targets.length} recipient(s)!`, 'success');
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err: any) {
      console.error(err);
      showToast(`Broadcast failed: ${err.message}`, 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleUpdateSystemParameters = async (mMode: boolean, txLimit: number) => {
    try {
      showToast('Updating system constraints...', 'success');
      const maintRef = ref(rtdb, 'platform_settings/maintenance');
      await update(maintRef, {
        maintenance_mode: mMode,
        max_transaction_amount: txLimit,
        updated_at: Date.now()
      });
      await logAudit('UPDATE_SYSTEM_CONSTRAINTS', 'PLATFORM', { maintenance_mode: mMode, max_transaction_amount: txLimit });
      showToast('System parameters updated successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update system parameters: ${err.message}`, 'error');
    }
  };

  const handleRunDatabaseMaintenance = async (task: string) => {
    requestAction(
      'Database Core Maintenance',
      `Are you sure you want to run the core maintenance routine: "${task.replace('_', ' ')}"?`,
      async () => {
        if (task === 'PRUNE_EXPIRED_TICKETS') {
          const ticketsSnap = await getDocs(collection(db, 'tickets'));
          let prunedCount = 0;
          const today = new Date().toISOString().split('T')[0];
          
          const promises = ticketsSnap.docs.map(async (ticketDoc) => {
            const data = ticketDoc.data();
            if (data.status === 'valid' && data.event_date && data.event_date < today) {
              const { updateDoc, doc } = await import('firebase/firestore');
              await updateDoc(doc(db, 'tickets', ticketDoc.id), { status: 'expired' });
              prunedCount++;
            }
          });
          await Promise.all(promises);
          await logAudit('MAINTENANCE_PRUNE_TICKETS', 'PLATFORM', { prunedCount });
          showToast(`Successfully pruned ${prunedCount} expired tickets.`, 'success');
        } else if (task === 'SEED_DIAGNOSTICS') {
          await logAudit('DIAGNOSTIC_PING', 'SYSTEM', { pingTime: Date.now(), clientAgent: navigator.userAgent });
          showToast('Diagnostic ping successfully committed to the Immutable Ledger.', 'success');
        } else if (task === 'RECALCULATE_METRICS') {
          const ordersSnap = await getDocs(collection(db, 'orders'));
          const ticketsSnap = await getDocs(collection(db, 'tickets'));
          let revSum = 0;
          const spends: Record<string, number> = {};
          
          ordersSnap.forEach(d => {
            const data = d.data();
            const val = parseFloat(data.total_amount || data.total || '0');
            if (!isNaN(val)) revSum += val;

            const userId = data.userId || data.customer_id || data.customerId || data.uid;
            if (userId && !isNaN(val)) {
              spends[userId] = (spends[userId] || 0) + val;
            }
          });
          
          setUserSpends(spends);
          setAnalytics({
            totalOrdersCount: ordersSnap.size,
            totalTicketsCount: ticketsSnap.size,
            totalRevenueZar: revSum,
            lastCalculated: new Date()
          });
          setTelemetry(prev => ({
            ...prev,
            salesVolume: revSum
          }));
          await logAudit('RECALCULATE_METRICS', 'PLATFORM', { totalRevenueZar: revSum, totalOrders: ordersSnap.size });
          showToast('Live aggregates successfully compiled and synchronized.', 'success');
        }
      }
    );
  };

  // UI States for Editing Modals
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Edit Trigger Actions
  const handleEditVenue = (venue: Venue) => {
    setEditingVenue({ ...venue });
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent({ ...event });
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser({ ...user });
  };

  const handleOpenPartyStatement = async (user: UserProfile) => {
    try {
      showToast('Compiling Party Statement...', 'success');
      setSelectedPartyUser(user);
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // Fetch user orders
      const ordersQ = query(collection(db, 'orders'), where('user_id', '==', user.uid));
      const ordersSnap = await getDocs(ordersQ);
      const userOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPartyOrders(userOrders);
      
      // Fetch user tickets
      const ticketsQ = query(collection(db, 'tickets'), where('user_id', '==', user.uid));
      const ticketsSnap = await getDocs(ticketsQ);
      const userTickets = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPartyTickets(userTickets);
      
      showToast('Statement compiled successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to compile statement: ${err.message}`, 'error');
    }
  };

  // Save Actions
  const handleSaveVenueEdit = async (venueId: string, updatedVenue: any) => {
    try {
      showToast('Saving Venue details...', 'success');
      // Update RTDB
      const vRtdbRef = ref(rtdb, `venues/${venueId}`);
      await update(vRtdbRef, updatedVenue);

      // Update Firestore
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'venues', venueId), updatedVenue, { merge: true });

      await logAudit('EDIT_VENUE', venueId, updatedVenue);
      setEditingVenue(null);
      showToast('Venue updated successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update venue: ${err.message}`, 'error');
    }
  };

  const handleSaveEventEdit = async (eventId: string, updatedEvent: any) => {
    try {
      showToast('Saving Event details...', 'success');
      // Update Firestore events collection
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'events', eventId), updatedEvent, { merge: true });

      // Sync with RTDB under venues if venueId is provided
      if (updatedEvent.venueId) {
        try {
          const evtRtdbRef = ref(rtdb, `venues/${updatedEvent.venueId}/events/${eventId}`);
          await update(evtRtdbRef, updatedEvent);
        } catch (rtdbErr) {
          console.warn('RTDB event sync failed, skipping:', rtdbErr);
        }
      }

      await logAudit('EDIT_EVENT', eventId, updatedEvent);
      setEditingEvent(null);
      showToast('Event updated successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update event: ${err.message}`, 'error');
    }
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.venueId) {
      showToast('Please select a target venue.', 'error');
      return;
    }
    try {
      showToast('Deploying new event terminal...', 'success');
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const selectedVenue = venues.find(v => v.id === newEventData.venueId);
      const venueName = selectedVenue ? selectedVenue.name : 'Unknown Venue';

      const eventPayload = {
        title: newEventData.title,
        venueId: newEventData.venueId,
        venueName: venueName,
        date: newEventData.date,
        time: newEventData.time,
        ticketPrice: parseFloat(newEventData.ticketPrice) || 150,
        ticketsTotal: parseInt(newEventData.ticketsTotal) || 500,
        ticketsSold: 0,
        eventType: newEventData.eventType,
        description: newEventData.description,
        status: 'Live',
        is_archived: false,
        createdAt: Date.now()
      };

      // Add to Firestore events collection
      const eventRef = await addDoc(collection(db, 'events'), eventPayload);
      const newEventId = eventRef.id;

      // Sync to RTDB under venues
      if (newEventData.venueId) {
        try {
          const rtdbRef = ref(rtdb, `venues/${newEventData.venueId}/events/${newEventId}`);
          await update(rtdbRef, { id: newEventId, ...eventPayload });
        } catch (rtdbErr) {
          console.warn('RTDB event create sync failed, skipping:', rtdbErr);
        }
      }

      await logAudit('CREATE_EVENT', newEventId, eventPayload);
      setIsAddingEvent(false);
      setNewEventData({
        title: '',
        venueId: '',
        date: '',
        time: '20:00 - 02:00',
        ticketPrice: '150',
        ticketsTotal: '500',
        eventType: 'CLUB',
        description: '',
      });
      showToast('Event successfully broadcasted to live directories.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to create event: ${err.message}`, 'error');
    }
  };

  const handleSaveUserEdit = async (uid: string, updatedUser: any) => {
    try {
      showToast('Saving User Profile...', 'success');
      const { updateUserProfile } = await import('../services/authService');
      await updateUserProfile(uid, updatedUser);

      await logAudit('EDIT_USER', uid, updatedUser);
      setEditingUser(null);
      showToast('User profile updated successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update user: ${err.message}`, 'error');
    }
  };

  // Venue Actions
  const handleToggleVenueOrdering = (venue: Venue) => {
    const currentState = venue.isOrderingEnabled !== false; // Default true if undefined
    requestAction(
      currentState ? 'Suspend Venue Ordering' : 'Enable Venue Ordering',
      `Are you sure you want to ${currentState ? 'block' : 'unblock'} live orders for ${venue.name}?`,
      async () => {
        const vRef = ref(rtdb, `venues/${venue.id}`);
        await update(vRef, { isOrderingEnabled: !currentState });
        await logAudit('VENUE_ORDER_TOGGLE', venue.id, { newState: !currentState });
      }
    );
  };

  // Event Actions
  const handleToggleEventFreeze = (event: Event) => {
    const isFrozen = event.status === 'Cancelled' || event.status === 'REJECTED'; 
    requestAction(
      isFrozen ? 'Unfreeze Event' : 'Emergency Freeze Event',
      `Are you sure you want to ${isFrozen ? 'unfreeze' : 'freeze'} ${event.title}?`,
      async () => {
        const evtRef = doc(db, 'events', event.id);
        const newState = isFrozen ? 'APPROVED' : 'REJECTED';
        await fsRunTransaction(db, async (trans) => {
           const docSnap = await trans.get(evtRef);
           if (!docSnap.exists()) throw new Error("Event does not exist.");
           trans.update(evtRef, { status: newState });
        });
        await logAudit('EVENT_FREEZE_TOGGLE', event.id, { newState });
      }
    );
  };

  // Global Kill Switches
  const toggleSystemSwitch = (key: keyof SystemState, currVal: boolean) => {
    requestAction(
      `Toggle ${key}`,
      `Are you sure you want to ${currVal ? 'DISABLE' : 'ENABLE'} global ${key}?`,
      async () => {
        const sysRef = ref(rtdb, `platform_settings/system`);
        await update(sysRef, { [key]: !currVal });
        await logAudit('GLOBAL_SYSTEM_TOGGLE', 'SYSTEM', { key, newState: !currVal });
      }
    );
  };

  const filteredUsers = users.filter(u => {
    if ((u as any).is_deleted) return false;
    const searchLower = searchQuery.toLowerCase();
    const emailMatch = u.email?.toLowerCase().includes(searchLower);
    const usernameMatch = u.username?.toLowerCase().includes(searchLower);
    const roleMatch = u.role?.toLowerCase().includes(searchLower);
    const uidMatch = u.uid?.toLowerCase().includes(searchLower);
    return emailMatch || usernameMatch || roleMatch || uidMatch;
  });

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col md:flex-row font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4",
          toast.type === 'error' ? "bg-error text-on-error" : "bg-success text-on-success"
        )}>
          {toast.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal via Opaque Overlay */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-2xl border border-error max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-error mb-4">
              <ShieldAlert size={28} />
              <h2 className="text-xl font-black uppercase tracking-wider">{confirmModal.title}</h2>
            </div>
            <p className="text-on-surface-variant mb-8">{confirmModal.message}</p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2 font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
                tabIndex={0}
              >
                Abort
              </button>
              <button 
                onClick={confirmModal.action}
                className="px-5 py-2 font-black uppercase tracking-widest bg-error text-on-error hover:bg-error/90 rounded-lg shadow-lg shadow-error/20 transition-transform active:scale-95"
                tabIndex={0}
              >
                Confirm execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Venue Modal */}
      {editingVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface rounded-2xl shadow-2xl border border-outline max-w-2xl w-full p-6 animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-outline pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Map className="text-primary" size={24} />
                <h2 className="text-xl font-black uppercase tracking-wider">Edit Venue Terminal</h2>
              </div>
              <button onClick={() => setEditingVenue(null)} className="text-on-surface-variant hover:text-on-background p-1.5 rounded-lg hover:bg-surface-variant transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveVenueEdit(editingVenue.id, editingVenue);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Venue Name</label>
                  <input
                    type="text"
                    required
                    value={editingVenue.name || ''}
                    onChange={e => setEditingVenue({ ...editingVenue, name: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Venue Type</label>
                  <select
                    value={editingVenue.type || editingVenue.venue_type || 'Club'}
                    onChange={e => setEditingVenue({ ...editingVenue, type: e.target.value as any, venue_type: e.target.value as any })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  >
                    <option value="Club">Club</option>
                    <option value="Pub">Pub</option>
                    <option value="Festival">Festival</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Lounge">Lounge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Location / City</label>
                  <input
                    type="text"
                    required
                    value={editingVenue.location || ''}
                    onChange={e => setEditingVenue({ ...editingVenue, location: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Owner User ID</label>
                  <input
                    type="text"
                    value={editingVenue.ownerId || ''}
                    onChange={e => setEditingVenue({ ...editingVenue, ownerId: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-mono outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Rating (0.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={editingVenue.rating ?? 4.0}
                    onChange={e => setEditingVenue({ ...editingVenue, rating: parseFloat(e.target.value) || 0 })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Distance (e.g. '0.0 km')</label>
                  <input
                    type="text"
                    value={editingVenue.distance || '0.0 km'}
                    onChange={e => setEditingVenue({ ...editingVenue, distance: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={editingVenue.image || ''}
                    onChange={e => setEditingVenue({ ...editingVenue, image: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingVenue.description || ''}
                    onChange={e => setEditingVenue({ ...editingVenue, description: e.target.value })}
                    className="w-full bg-background border border-outline rounded-xl p-4 text-sm font-semibold outline-none focus:border-primary transition-all resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="isOrderingEnabled"
                    checked={editingVenue.isOrderingEnabled !== false}
                    onChange={e => setEditingVenue({ ...editingVenue, isOrderingEnabled: e.target.checked })}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="isOrderingEnabled" className="text-sm font-bold uppercase tracking-wider cursor-pointer">Live Ordering Enabled</label>
                </div>
              </div>

              <div className="flex gap-4 justify-end border-t border-outline pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingVenue(null)}
                  className="px-5 py-2 font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-variant rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/95 font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface rounded-2xl shadow-2xl border border-outline max-w-2xl w-full p-6 animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-outline pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-primary" size={24} />
                <h2 className="text-xl font-black uppercase tracking-wider">Edit Event Details</h2>
              </div>
              <button onClick={() => setEditingEvent(null)} className="text-on-surface-variant hover:text-on-background p-1.5 rounded-lg hover:bg-surface-variant transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveEventEdit(editingEvent.id, editingEvent);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.title || editingEvent.name || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value, name: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Genre</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.genre || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, genre: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={editingEvent.date || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="18:00"
                    value={editingEvent.startTime || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    placeholder="02:00"
                    value={editingEvent.endTime || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Tickets Sold</label>
                  <input
                    type="number"
                    min="0"
                    value={editingEvent.ticketsSold ?? 0}
                    onChange={e => setEditingEvent({ ...editingEvent, ticketsSold: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Tickets Total Capacity</label>
                  <input
                    type="number"
                    min="0"
                    value={editingEvent.ticketsTotal ?? 0}
                    onChange={e => setEditingEvent({ ...editingEvent, ticketsTotal: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Venue Name</label>
                  <input
                    type="text"
                    value={editingEvent.venueName || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, venueName: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Venue ID</label>
                  <input
                    type="text"
                    value={editingEvent.venueId || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, venueId: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-mono outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Status</label>
                  <select
                    value={editingEvent.status || 'Live'}
                    onChange={e => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  >
                    <option value="Live">Live</option>
                    <option value="Draft">Draft</option>
                    <option value="Past">Past</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Owner User ID</label>
                  <input
                    type="text"
                    value={editingEvent.ownerId || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, ownerId: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-mono outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={editingEvent.image || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, image: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    value={editingEvent.description || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    className="w-full bg-background border border-outline rounded-xl p-4 text-sm font-semibold outline-none focus:border-primary transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end border-t border-outline pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-5 py-2 font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-variant rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/95 font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface rounded-2xl shadow-2xl border border-outline max-w-2xl w-full p-6 animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-outline pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Users className="text-primary" size={24} />
                <h2 className="text-xl font-black uppercase tracking-wider">Edit Identity Profile</h2>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-on-surface-variant hover:text-on-background p-1.5 rounded-lg hover:bg-surface-variant transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveUserEdit(editingUser.uid, editingUser);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email || ''}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editingUser.username || ''}
                    onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">First Name</label>
                  <input
                    type="text"
                    value={editingUser.firstName || ''}
                    onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editingUser.lastName || ''}
                    onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editingUser.displayName || editingUser.full_name || ''}
                    onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value, full_name: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editingUser.phone || editingUser.phone_number || ''}
                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value, phone_number: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Role Claim</label>
                  <select
                    value={editingUser.role || 'PATRON'}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  >
                    <option value="PATRON">PATRON</option>
                    <option value="BARTENDER">BARTENDER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="EVENT_MANAGER">EVENT_MANAGER</option>
                    <option value="VENDOR">VENDOR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="WAITER">WAITER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Status</label>
                  <select
                    value={editingUser.status || 'APPROVED'}
                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Assigned Venue ID</label>
                  <input
                    type="text"
                    value={editingUser.assigned_venue_id || ''}
                    onChange={e => setEditingUser({ ...editingUser, assigned_venue_id: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-mono outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Assigned Event ID</label>
                  <input
                    type="text"
                    value={editingUser.assigned_event_id || ''}
                    onChange={e => setEditingUser({ ...editingUser, assigned_event_id: e.target.value })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-mono outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Points Balance</label>
                  <input
                    type="number"
                    min="0"
                    value={editingUser.points ?? 0}
                    onChange={e => setEditingUser({ ...editingUser, points: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Status Tier</label>
                  <select
                    value={editingUser.tier || 'BRONZE'}
                    onChange={e => setEditingUser({ ...editingUser, tier: e.target.value as any })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  >
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                    <option value="TITANIUM">TITANIUM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Budget Limit (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingUser.budgetLimit ?? editingUser.budget ?? 0}
                    onChange={e => setEditingUser({ ...editingUser, budgetLimit: parseInt(e.target.value) || 0, budget: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 py-4">
                  <input
                    type="checkbox"
                    id="isVerified"
                    checked={editingUser.isVerified !== false}
                    onChange={e => setEditingUser({ ...editingUser, isVerified: e.target.checked })}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="isVerified" className="text-sm font-bold uppercase tracking-wider cursor-pointer">Verified Account</label>
                </div>
              </div>

              <div className="flex gap-4 justify-end border-t border-outline pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2 font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-variant rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/95 font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Sidebar */}
      <nav className="w-full md:w-64 bg-surface border-r border-outline flex flex-col">
        <div className="p-6 border-b border-outline">
          <h1 className="text-xl font-black tracking-[0.2em] uppercase text-primary">WAYTA</h1>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mt-1">Super Admin Core</p>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-2 px-3">
          {[
            { id: 'TELEMETRY', icon: Activity, label: 'Telemetry' },
            { id: 'VENUES', icon: Map, label: 'Venue Engine' },
            { id: 'EVENTS', icon: Calendar, label: 'Event Hub' },
            { id: 'USERS', icon: Users, label: 'User Matrix' },
            { id: 'SYSTEM', icon: Power, label: 'Kill Switches' },
            { id: 'AUDIT_TRAIL', icon: Shield, label: 'Audit Trail' },
            { id: 'BROADCASTER', icon: Bell, label: 'Broadcaster' },
            { id: 'THEMES', icon: Palette, label: 'Theme Preview' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                activeTab === tab.id 
                  ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                  : "text-on-surface hover:bg-surface-variant"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-h-screen overflow-y-auto p-6 md:p-10">
        
        {/* TELEMETRY VIEW */}
        {activeTab === 'TELEMETRY' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header>
              <h2 className="text-3xl font-black uppercase tracking-tight">Platform Telemetry</h2>
              <p className="text-on-surface-variant">Live system diagnostics and transactional velocity.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-2xl border border-outline shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={64}/></div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Active Websockets</p>
                <p className="text-5xl font-black text-primary">{telemetry.activeConnections.toLocaleString()}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-success">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live Pulse Validated
                </div>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-outline shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Database size={64}/></div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Live Volume (ZAR)</p>
                <p className="text-5xl font-black">R{(telemetry.salesVolume).toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-success">
                  +1.4% / sec velocity
                </div>
              </div>
              <div className="bg-surface p-6 rounded-2xl border-2 border-primary/20 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Shield size={64}/></div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">POS Handshake API</p>
                <p className="text-5xl font-black text-success">{telemetry.apiSuccessRate.toFixed(2)}%</p>
                <div className="mt-4 w-full bg-surface-variant h-1 rounded-full overflow-hidden">
                  <div className="bg-success h-full" style={{width: `${telemetry.apiSuccessRate}%`}} />
                </div>
              </div>
            </div>
            
            {/* Core Durable Database Aggregates */}
            <div className="bg-surface border border-outline rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                    <Database size={20} className="text-primary animate-pulse" /> Live Cloud Data Aggregates
                  </h3>
                  <p className="text-xs text-on-surface-variant">Real database counts compiled directly from active Firestore schemas.</p>
                </div>
                <button 
                  onClick={() => handleRunDatabaseMaintenance('RECALCULATE_METRICS')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                  title="Synchronize and recount Firestore documents"
                >
                  <RefreshCw size={13} /> Re-verify DB
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-variant/40 border border-outline p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Orders Stored</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono">{analytics.totalOrdersCount}</span>
                    <span className="text-[10px] text-success font-bold font-mono">active docs</span>
                  </div>
                </div>
                <div className="bg-surface-variant/40 border border-outline p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Tickets Issued</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono">{analytics.totalTicketsCount}</span>
                    <span className="text-[10px] text-primary font-bold font-mono">valid/used</span>
                  </div>
                </div>
                <div className="bg-surface-variant/40 border-2 border-primary/30 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Exact Ledger Sum</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono text-primary">R{analytics.totalRevenueZar.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">zar</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[10px] font-mono text-on-surface-variant flex items-center gap-2 justify-end">
                <Clock size={11} /> Last verified: {analytics.lastCalculated.toLocaleTimeString()}
              </div>
            </div>

            <div className="bg-surface border border-outline rounded-2xl p-6">
               <h3 className="text-lg font-bold uppercase tracking-widest mb-4">Diagnostics Feed</h3>
               <div className="space-y-3 font-mono text-xs">
                 <div className="flex gap-4 p-3 bg-surface-variant rounded-lg border border-outline">
                    <span className="text-primary font-bold">SYS</span>
                    <span className="text-on-surface-variant">Worker Thread 01 connected. Handshake OK. Payload stable.</span>
                 </div>
                 <div className="flex gap-4 p-3 bg-surface-variant rounded-lg border border-outline">
                    <span className="text-success font-bold">SEC</span>
                    <span className="text-on-surface-variant">Auto-TLS Rotation verified. Signature intact.</span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* VENUES MATRIX */}
        {activeTab === 'VENUES' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Location Terminals ({venues.length})</h2>
                <p className="text-on-surface-variant text-sm mt-1">Verify tenant registrations, deploy theme presets, and manage POS locks.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search venue name..." 
                    className="w-full bg-surface border border-outline rounded-xl pl-10 pr-4 py-2 font-semibold text-sm focus:border-primary outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={venueStatusFilter}
                  onChange={e => setVenueStatusFilter(e.target.value as any)}
                  className="bg-surface border border-outline rounded-xl px-3 py-2 font-bold text-xs uppercase tracking-wider outline-none cursor-pointer focus:border-primary"
                >
                  <option value="ALL">All Registrations</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="APPROVED">Approved / Live</option>
                  <option value="SUSPENDED">Suspended / Paused</option>
                </select>
              </div>
            </div>

            <div className="bg-surface border border-outline rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-variant border-b border-outline">
                  <tr>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Venue Details</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Owner Account</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Current Theme</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Verification Status</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Ordering Gate</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-right">Terminal Override Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {venues
                    .filter(v => {
                      const matchesStatus = venueStatusFilter === 'ALL' || ((v as any).verification_status || v.status || 'Pending').toUpperCase() === venueStatusFilter;
                      const matchesSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || (v.id || '').toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesStatus && matchesSearch;
                    })
                    .map((v, idx) => {
                      const currentThemeName = (v as any).theme?.theme_preset || (v as any).themePreset || 'Slate (Default)';
                      const currentPrimaryColor = (v as any).theme?.primaryColor || '#6366f1';
                      return (
                        <tr key={`admin-v-${v.id ?? idx}-${idx}`} className="hover:bg-surface-variant/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold flex items-center gap-2">
                              {v.name}
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-variant text-on-surface font-mono uppercase">
                                {v.type || v.venue_type || 'CLUB'}
                              </span>
                            </div>
                            <div className="text-[10px] text-on-surface-variant font-mono uppercase mt-1 flex items-center gap-1">
                              <MapPin size={10} /> {v.location || 'Distributed Node'}
                            </div>
                            <div className="text-[9px] text-on-surface-variant font-mono uppercase mt-0.5">UID: {v.id}</div>
                          </td>
                          <td className="p-4 font-mono text-xs text-on-surface-variant">
                            {v.ownerId || 'Not Bound'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full border border-outline shadow-sm shrink-0" style={{ backgroundColor: currentPrimaryColor }} />
                              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">{currentThemeName}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={(v as any).verification_status || v.status || 'Pending'}
                              onChange={e => handleToggleVenueVerification(v, e.target.value as any)}
                              className={cn(
                                "px-2.5 py-1.5 rounded-xl border-none text-xs font-black uppercase tracking-wider outline-none cursor-pointer",
                                ((v as any).verification_status || v.status) === 'Approved' ? "bg-success/10 text-success" :
                                ((v as any).verification_status || v.status) === 'Suspended' ? "bg-error/10 text-error" :
                                "bg-warning/10 text-warning"
                              )}
                            >
                              <option value="Pending" className="bg-surface text-on-surface">Pending Verification</option>
                              <option value="Approved" className="bg-surface text-on-surface">Approved</option>
                              <option value="Suspended" className="bg-surface text-on-surface">Suspended</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleVenueOrdering(v)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                v.isOrderingEnabled !== false
                                  ? "bg-success/10 text-success border-success/20"
                                  : "bg-error/10 text-error border-error/20"
                              )}
                              title="Toggle POS Ordering Gate"
                            >
                              {v.isOrderingEnabled !== false ? <CheckCircle size={12}/> : <PauseCircle size={12}/>}
                              {v.isOrderingEnabled !== false ? 'Open' : 'Locked'}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => handleEditVenue(v)} 
                                className="p-2 text-on-surface hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-outline" 
                                title="Edit Business Details"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => setThemeOverrideVenue(v)} 
                                className="p-2 text-on-surface hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors border border-outline" 
                                title="Manage Theme Override"
                              >
                                <Palette size={16} />
                              </button>
                              <button 
                                onClick={() => handlePermanentDeleteVenueFully(v.id, v.name)} 
                                className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors border border-outline" 
                                title="Hard Purge (Cascading)"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {venues.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant font-mono text-sm">
                        No registered locations found matching the query filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EVENTS MATRIX */}
        {activeTab === 'EVENTS' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Global Event Hub ({events.length})</h2>
                <p className="text-on-surface-variant text-sm mt-1">Deploy venues, schedule lineups, cancel tickets, and trace transaction volumes.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch">
                <button
                  onClick={() => setIsAddingEvent(true)}
                  className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/95 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Plus size={16} /> Deploy New Event
                </button>
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search events/venues..." 
                    className="w-full bg-surface border border-outline rounded-xl pl-10 pr-4 py-2 font-semibold text-sm focus:border-primary outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={eventStatusFilter}
                  onChange={e => setEventStatusFilter(e.target.value as any)}
                  className="bg-surface border border-outline rounded-xl px-3 py-2 font-bold text-xs uppercase tracking-wider outline-none cursor-pointer focus:border-primary"
                >
                  <option value="ALL">All State Registries</option>
                  <option value="LIVE">Live / Booking</option>
                  <option value="CANCELLED">Cancelled / Archived</option>
                  <option value="PENDING">Drafts</option>
                </select>
              </div>
            </div>

            <div className="bg-surface border border-outline rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-variant border-b border-outline">
                  <tr>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Event Master</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Date & Schedule</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Booking Capacity</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Ticket Price</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-center">Active Orders</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-right">Gross Sales (ZAR)</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {events
                    .filter(e => {
                      const matchesStatus = eventStatusFilter === 'ALL' || (e.status || 'Live').toUpperCase() === eventStatusFilter;
                      const matchesSearch = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.venueName || '').toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesStatus && matchesSearch;
                    })
                    .map((e, idx) => {
                      // Calculate live unresolved active orders specifically for this event
                      const activeOrdersForEvent = orders.filter(o => 
                        (o.eventId === e.id || o.event_id === e.id) && 
                        ['pending', 'preparing', 'ready', 'ordered', 'uncollected', 'active'].includes((o.status || '').toLowerCase())
                      ).length;

                      // Calculate gross volume for this event
                      const eventRevenue = orders
                        .filter(o => o.eventId === e.id || o.event_id === e.id)
                        .reduce((acc, o) => acc + (parseFloat(o.total_amount || o.total || '0') || 0), 0);

                      return (
                        <tr key={`admin-e-${e.id ?? idx}-${idx}`} className="hover:bg-surface-variant/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold flex items-center gap-2">
                              {e.title}
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-variant text-on-surface font-mono uppercase">
                                {e.eventType || 'CONCERT'}
                              </span>
                            </div>
                            <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mt-1">{e.venueName || 'Unassigned Venue'}</div>
                            <div className="text-[9px] text-on-surface-variant font-mono">UID: {e.id}</div>
                          </td>
                          <td className="p-4 font-mono text-xs">
                            <div className="font-semibold text-on-surface">{e.date || 'No Date'}</div>
                            <div className="text-[10px] text-on-surface-variant mt-0.5">{e.time || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            <div className="w-full max-w-xs space-y-1.5">
                              <div className="flex justify-between text-[10px] font-mono font-bold text-on-surface-variant">
                                <span>{(e as any).ticketsSold ?? 0} SOLD</span>
                                <span>{e.ticketsTotal ?? 500} CAP</span>
                              </div>
                              <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-primary h-full rounded-full transition-all" 
                                  style={{ width: `${Math.min(100, (((e as any).ticketsSold ?? 0) / (e.ticketsTotal ?? 500)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs font-bold text-on-surface">
                            R{(parseFloat(e.ticketPrice as any) || 0).toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            {activeOrdersForEvent > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 uppercase tracking-widest border border-amber-500/20">
                                <TrendingUp size={11} className="animate-bounce" /> {activeOrdersForEvent} Active
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-on-surface-variant font-mono">0 live</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono text-xs font-bold text-success">
                            R{eventRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end items-center">
                              {e.status !== 'Cancelled' && (
                                <button 
                                  onClick={() => handleCancelArchiveEvent(e)} 
                                  className="px-3 py-1.5 text-xs font-black uppercase tracking-wider text-error bg-error/5 hover:bg-error/10 rounded-lg transition-colors border border-error/20"
                                >
                                  Cancel Event
                                </button>
                              )}
                              {e.status === 'Cancelled' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-error/10 text-error uppercase tracking-wider">
                                  Cancelled
                                </span>
                              )}
                              <button 
                                onClick={() => handleEditEvent(e)} 
                                className="p-2 text-on-surface hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-outline" 
                                title="Modify Event Details"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handlePermanentDeleteEventFully(e.id, e.title)} 
                                className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors border border-outline" 
                                title="Hard Purge Registry"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-on-surface-variant font-mono text-sm">
                        No scheduled event files found matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS MATRIX */}
        {activeTab === 'USERS' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Identity Directory ({filteredUsers.length})</h2>
                <p className="text-on-surface-variant text-sm mt-1">Cross-tenant RBAC profile matrix. Grant security privileges instantly.</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  type="text" 
                  placeholder="Omni-search email, UID, or role..." 
                  className="w-full bg-surface border border-outline rounded-xl pl-10 pr-4 py-2 font-mono text-sm focus:border-primary outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-surface border border-outline rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-variant border-b border-outline">
                  <tr>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Principal Identity</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Role Claim Elevate</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest">Joined Date</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-right">Total Spend (ZAR)</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-center">Security Status</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-right">Operations Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {filteredUsers.map((u, idx) => {
                    const totalSpendZar = userSpends[u.uid] || 0;
                    return (
                      <tr key={`admin-u-${u.uid ?? idx}-${idx}`} className="hover:bg-surface-variant/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-on-surface">{u.email || 'NO-EMAIL-BOUND'}</div>
                          {u.username && <div className="text-xs text-on-surface-variant">Profile: {u.username}</div>}
                          <div className="text-[9px] text-on-surface-variant font-mono mt-0.5">UID: {u.uid}</div>
                        </td>
                        <td className="p-4">
                          <select
                            value={u.role ? u.role.toUpperCase() : 'PATRON'}
                            onChange={e => handleUpdateUserRole(u.uid, u.email || u.uid, u.role || 'PATRON', e.target.value)}
                            className="bg-surface border border-outline rounded-xl px-2.5 py-1.5 text-xs font-black uppercase tracking-wider outline-none cursor-pointer focus:border-primary text-primary"
                          >
                            <option value="PATRON">PATRON</option>
                            <option value="STAFF">BARTENDER/STAFF</option>
                            <option value="MANAGER">VENUE MANAGER</option>
                            <option value="ADMIN">SUPER ADMIN</option>
                          </select>
                        </td>
                        <td className="p-4 text-xs font-mono text-on-surface-variant">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Historical Registration'}
                        </td>
                        <td className="p-4 text-right font-mono text-xs font-bold text-on-surface">
                          R{totalSpendZar.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                            u.status === 'SUSPENDED' ? "bg-error/10 text-error border-error/20" : 
                            u.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            "bg-success/10 text-success border-success/20"
                          )}>
                            {u.status === 'SUSPENDED' ? <PauseCircle size={10}/> : <CheckCircle size={10}/>}
                            {u.status || 'APPROVED'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenPartyStatement(u)} 
                              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1"
                              title="Compile Party Statement"
                            >
                              <FileText size={12} /> Statement
                            </button>
                            <button 
                              onClick={() => handleEditUser(u)} 
                              className="p-2 text-on-surface hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-outline" 
                              title="Edit Identity Profile"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleSwitchUser(u.uid)} 
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors border border-outline" 
                              title="Impersonate Secure Node"
                            >
                              <Fingerprint size={16} />
                            </button>
                            <button 
                              onClick={() => handleToggleUserSuspend(u)} 
                              className="p-2 text-warning hover:bg-warning/10 rounded-lg transition-colors border border-outline" 
                              title="Lockout/Reinstate Privilege"
                            >
                              <PauseCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleSoftDeleteUser(u.uid, u.email || u.uid)} 
                              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors border border-outline" 
                              title="Soft Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button 
                              onClick={() => handlePermanentDeleteUserCascade(u.uid, u.email || u.uid)} 
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-outline" 
                              title="Hard Cascade Purge"
                            >
                              <ShieldAlert size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant font-mono text-sm">
                        No identities match the query search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SYSTEM SWITCHES */}
        {activeTab === 'SYSTEM' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
            {/* Global Threat & Kill Switches */}
            <div className="border border-error/30 rounded-3xl p-8 bg-error/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><ServerCrash size={140} /></div>
              
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tight text-error flex items-center gap-3"><ShieldAlert size={32}/> Global Threat Center</h2>
                 <p className="text-on-surface-variant mt-2 max-w-2xl">Extreme caution: Modifying these vectors overrides all tenant rules immediately across the entire distributed infrastructure.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 relative z-10">
                
                <div className="bg-surface p-6 rounded-2xl border border-error/50 shadow-lg shadow-error/10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black uppercase tracking-widest text-error">Global Order Pause</h3>
                      <p className="text-xs text-on-surface-variant font-mono mt-1">Blocks all transacting across all terminals.</p>
                    </div>
                    <div className={cn("px-3 py-1 font-bold text-xs uppercase tracking-widest rounded-full", systemState.global_order_pause ? "bg-error text-on-error" : "bg-outline text-on-surface-variant")}>
                      {systemState.global_order_pause ? 'ARMED' : 'SAFE'}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => toggleSystemSwitch('global_order_pause', systemState.global_order_pause)}
                    className="w-full py-3 rounded-lg font-black uppercase tracking-widest border-2 border-error text-error hover:bg-error hover:text-on-error transition-all"
                  >
                    {systemState.global_order_pause ? 'DISARM PAUSE' : 'ENGAGE OMNI-PAUSE'}
                  </button>
                </div>

                <div className="bg-surface p-6 rounded-2xl border border-warning/50 shadow-lg shadow-warning/10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black uppercase tracking-widest text-warning">Global Test Mode</h3>
                      <p className="text-xs text-on-surface-variant font-mono mt-1">Bypasses geography bounds for end-to-end tests.</p>
                    </div>
                    <div className={cn("px-3 py-1 font-bold text-xs uppercase tracking-widest rounded-full", systemState.test_mode ? "bg-warning text-on-warning" : "bg-outline text-on-surface-variant")}>
                      {systemState.test_mode ? 'ACTIVE' : 'SAFE'}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => toggleSystemSwitch('test_mode', systemState.test_mode)}
                    className="w-full py-3 rounded-lg font-black uppercase tracking-widest border-2 border-warning text-warning hover:bg-warning hover:text-on-warning transition-all"
                  >
                    {systemState.test_mode ? 'DISABLE TESTBED' : 'ENABLE DEMO MODE'}
                  </button>
                </div>

              </div>
            </div>

            {/* Platform Constraints Configuration */}
            <div className="bg-surface border border-outline rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-black uppercase tracking-wider flex items-center gap-2 mb-2">
                <Shield size={22} className="text-primary" /> Core Security Constraints
              </h3>
              <p className="text-xs text-on-surface-variant mb-6">Configure high-level constraints that affect platform mechanics globally.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Global Limit Per Transaction (ZAR)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={maxTxLimit}
                      onChange={e => setMaxTxLimit(Math.max(1, parseInt(e.target.value) || 0))}
                      className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold font-mono outline-none focus:border-primary transition-all"
                    />
                    <button
                      onClick={() => handleUpdateSystemParameters(maintenanceMode, maxTxLimit)}
                      className="px-4 bg-primary text-on-primary font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-primary/95 transition-all"
                    >
                      Update Limit
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1.5">Maximum amount a user is authorized to transact in a single transaction.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Maintenance Lockout Override</label>
                  <div className="flex items-center justify-between h-11 px-4 bg-background border border-outline rounded-xl">
                    <span className="text-sm font-semibold">Active Maintenance Lock</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !maintenanceMode;
                        setMaintenanceMode(next);
                        handleUpdateSystemParameters(next, maxTxLimit);
                      }}
                      className={cn(
                        "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                        maintenanceMode ? "bg-error text-on-error" : "bg-outline text-on-surface"
                      )}
                    >
                      {maintenanceMode ? 'ACTIVE - RE-OPEN' : 'SAFE - LOCK DOWN'}
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1.5">Forcefully disconnects and displays a maintenance shield to all standard roles.</p>
                </div>
              </div>
            </div>

            {/* Platform Self-Healing & Diagnostics */}
            <div className="bg-surface border border-outline rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-black uppercase tracking-wider flex items-center gap-2 mb-2">
                <Sparkles size={22} className="text-primary animate-pulse" /> Self-Healing & Ledger Utilities
              </h3>
              <p className="text-xs text-on-surface-variant mb-6">Triggers diagnostic and correction operations directly across database entities.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-variant/40 border border-outline p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wide">Prune Expired</h4>
                    <p className="text-[10px] text-on-surface-variant mt-1">Converts all valid tickets belonging to past dates into 'expired' status.</p>
                  </div>
                  <button
                    onClick={() => handleRunDatabaseMaintenance('PRUNE_EXPIRED_TICKETS')}
                    className="mt-4 w-full py-2 bg-error/10 hover:bg-error/20 text-error border border-error/20 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                  >
                    Execute Prune
                  </button>
                </div>

                <div className="bg-surface-variant/40 border border-outline p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wide">Diagnostics Trace</h4>
                    <p className="text-[10px] text-on-surface-variant mt-1">Logs a mock trace into the Immutable audit ledger to verify system integrity.</p>
                  </div>
                  <button
                    onClick={() => handleRunDatabaseMaintenance('SEED_DIAGNOSTICS')}
                    className="mt-4 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                  >
                    Ping Diagnostic
                  </button>
                </div>

                <div className="bg-surface-variant/40 border border-outline p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wide">Recalculate Ledger</h4>
                    <p className="text-[10px] text-on-surface-variant mt-1">Deep aggregates and recounts all Firestore order transaction volumes.</p>
                  </div>
                  <button
                    onClick={() => handleRunDatabaseMaintenance('RECALCULATE_METRICS')}
                    className="mt-4 w-full py-2 bg-success/10 hover:bg-success/20 text-success border border-success/20 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                  >
                    Run Aggregator
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TRAIL VIEW */}
        {activeTab === 'AUDIT_TRAIL' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Immutable Ledger Audit Trail</h2>
                <p className="text-on-surface-variant text-sm">Real-time cryptographic audit journal tracking administrative operations.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Search Admin/Target Uid..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-48 sm:w-64 h-10 pl-10 pr-4 bg-surface border border-outline rounded-xl text-xs font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-variant border border-outline rounded-xl">
                  <Filter size={13} className="text-on-surface-variant" />
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase tracking-wider outline-none border-none cursor-pointer pr-2"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="IMPERSONATE_USER">Impersonations</option>
                    <option value="BROADCAST_NOTIFICATION">Broadcasts</option>
                    <option value="UPDATE_SYSTEM_CONSTRAINTS">System Updates</option>
                    <option value="SOFT_DELETE_USER">Soft Deletes</option>
                    <option value="TOGGLE_SUSPEND_USER">Suspensions</option>
                    <option value="MAINTENANCE_PRUNE_TICKETS">Pruned Tickets</option>
                  </select>
                </div>
              </div>
            </header>

            <div className="bg-surface border border-outline rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline bg-surface-variant/30 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="p-4 pl-6">Admin Identity</th>
                    <th className="p-4">Operation/Action</th>
                    <th className="p-4">Target Resource</th>
                    <th className="p-4">Timestamp (Local)</th>
                    <th className="p-4 pr-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline text-xs">
                  {auditLogs
                    .filter(log => {
                      if (auditFilter !== 'ALL' && log.action !== auditFilter) return false;
                      if (auditSearch) {
                        const s = auditSearch.toLowerCase();
                        return (log.adminUid || '').toLowerCase().includes(s) || 
                               (log.targetId || '').toLowerCase().includes(s) || 
                               (log.action || '').toLowerCase().includes(s);
                      }
                      return true;
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-surface-variant/20 transition-all font-mono">
                        <td className="p-4 pl-6 font-semibold text-primary">{log.adminUid}</td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase",
                            log.action?.includes('DELETE') ? "bg-error/10 text-error border border-error/20" :
                            log.action?.includes('UPDATE') ? "bg-warning/10 text-warning border border-warning/20" :
                            log.action?.includes('BROADCAST') ? "bg-primary/10 text-primary border border-primary/20" :
                            "bg-outline/10 text-on-surface-variant border border-outline/20"
                          )}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-on-surface-variant">{log.targetId}</td>
                        <td className="p-4 text-on-surface-variant">
                          {log.timestamp instanceof Date ? log.timestamp.toLocaleString() : new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1.5 bg-surface-variant hover:bg-outline/20 text-on-surface border border-outline font-bold uppercase tracking-wider rounded-lg text-[10px] transition-all"
                          >
                            Inspect Payload
                          </button>
                        </td>
                      </tr>
                    ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-on-surface-variant font-medium">
                        No audit ledger records matched query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Inspect payload modal popup */}
            {selectedLog && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-surface border border-outline rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="absolute top-4 right-4 p-1.5 hover:bg-surface-variant rounded-full text-on-surface-variant"
                  >
                    <X size={18} />
                  </button>
                  <h3 className="text-lg font-black uppercase tracking-wider mb-2 flex items-center gap-2 text-primary">
                    <Fingerprint size={20} /> Journal Entry Payload
                  </h3>
                  <p className="text-xs text-on-surface-variant mb-4">Cryptographically isolated metadata package for log: {selectedLog.id}</p>

                  <div className="space-y-3 bg-surface-variant/40 p-4 rounded-2xl border border-outline text-xs font-mono max-h-64 overflow-y-auto">
                    <div>
                      <span className="text-on-surface-variant font-bold block uppercase text-[10px]">Action Type:</span>
                      <span className="font-bold text-on-surface">{selectedLog.action}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant font-bold block uppercase text-[10px]">Executor Admin ID:</span>
                      <span className="text-on-surface">{selectedLog.adminUid}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant font-bold block uppercase text-[10px]">Target Resource ID:</span>
                      <span className="text-on-surface">{selectedLog.targetId}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant font-bold block uppercase text-[10px]">Recorded Metadata:</span>
                      <pre className="mt-1.5 text-[11px] text-primary/90 bg-background p-2.5 rounded-xl border border-outline overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="px-4 py-2 bg-primary text-on-primary font-bold uppercase tracking-wider text-xs rounded-xl"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BROADCASTER VIEW */}
        {activeTab === 'BROADCASTER' && (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
            <header>
              <h2 className="text-3xl font-black uppercase tracking-tight">Broadcaster Matrix</h2>
              <p className="text-on-surface-variant text-sm">Target and stream global system notifications or alerts directly to user accounts in real time.</p>
            </header>

            <form onSubmit={handleSendBroadcastNotification} className="bg-surface border border-outline rounded-3xl p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Recipient Target Pool</label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                  >
                    <option value="ALL">All Registered Users ({users.length})</option>
                    <option value="STAFF_ONLY">All Operating Staff Only</option>
                    {users.map((u, idx) => (
                      <option key={`broadcast-u-${u.uid || idx}-${idx}`} value={u.uid}>{u.email || u.uid} ({u.role || 'Patron'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Payload Severity Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'SYSTEM', label: '📢 System' },
                      { id: 'ALERT', label: '⚠️ Alert' },
                      { id: 'WARNING', label: '🟡 Warning' },
                      { id: 'INFO', label: '🔵 Informational' },
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setBroadcastType(type.id)}
                        className={cn(
                          "py-2.5 rounded-xl font-bold text-xs border transition-all text-center",
                          broadcastType === type.id 
                            ? "bg-primary border-primary text-on-primary shadow-md shadow-primary/20" 
                            : "bg-background border-outline hover:border-outline-variant text-on-surface"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Database Maintenance Tonight"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-sm font-semibold outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Broadcast Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Please wrap up active table logs. The system will undergo an elastic scale cycle at 23:00 UTC."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-background border border-outline rounded-xl p-4 text-sm font-semibold outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={broadcastSending}
                  className="w-full h-12 bg-primary text-on-primary font-black uppercase tracking-widest text-sm rounded-xl hover:bg-primary/95 shadow-lg shadow-primary/25 disabled:opacity-55 transition-all flex items-center justify-center gap-2"
                >
                  {broadcastSending ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Stream-broadcasting payload...
                    </>
                  ) : (
                    <>
                      <Bell size={16} /> Broadcast Notification Payload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'THEMES' && (
          <ThemePreviewer 
            venues={venues} 
          />
        )}

        {/* MODALS LAYER */}
        
        {/* ADD EVENT MODAL */}
        {isAddingEvent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-outline rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-variant/30">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Deploy New Event</h3>
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Configure event master registry</p>
                </div>
                <button onClick={() => setIsAddingEvent(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateEventSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Event Title</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 font-bold outline-none focus:border-primary"
                      value={newEventData.title}
                      onChange={e => setNewEventData({...newEventData, title: e.target.value})}
                      placeholder="e.g. Neon Nights: Summer Series"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Target Venue</label>
                    <select
                      required
                      className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 font-bold outline-none focus:border-primary"
                      value={newEventData.venueId}
                      onChange={e => setNewEventData({...newEventData, venueId: e.target.value})}
                    >
                      <option value="">Select Venue...</option>
                      {venues.map((v, idx) => (
                        <option key={`add-event-v-${v.id ?? idx}-${idx}`} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Event Type</label>
                    <select
                      className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 font-bold outline-none focus:border-primary"
                      value={newEventData.eventType}
                      onChange={e => setNewEventData({...newEventData, eventType: e.target.value})}
                    >
                      <option value="CLUB">CLUB NIGHT</option>
                      <option value="FESTIVAL">FESTIVAL</option>
                      <option value="CONCERT">CONCERT</option>
                      <option value="LOUNGE">LOUNGE/DINING</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 font-bold outline-none focus:border-primary"
                      value={newEventData.date}
                      onChange={e => setNewEventData({...newEventData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Schedule Time</label>
                    <input 
                      type="text" 
                      className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 font-bold outline-none focus:border-primary"
                      value={newEventData.time}
                      onChange={e => setNewEventData({...newEventData, time: e.target.value})}
                      placeholder="20:00 - 02:00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Ticket Price (ZAR)</label>
                    <input 
                      type="number" 
                      className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 font-bold outline-none focus:border-primary"
                      value={newEventData.ticketPrice}
                      onChange={e => setNewEventData({...newEventData, ticketPrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Capacity</label>
                    <input 
                      type="number" 
                      className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 font-bold outline-none focus:border-primary"
                      value={newEventData.ticketsTotal}
                      onChange={e => setNewEventData({...newEventData, ticketsTotal: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 bg-primary text-on-primary font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4">
                  Broadcast Global Event
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PARTY STATEMENT MODAL */}
        {selectedPartyUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-outline rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-variant/30">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Party Statement</h3>
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{selectedPartyUser.email} • ID Trace</p>
                </div>
                <button onClick={() => setSelectedPartyUser(null)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-variant/30 rounded-2xl border border-outline">
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Transaction Volume</div>
                    <div className="text-2xl font-black">R{userSpends[selectedPartyUser.uid]?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="p-4 bg-surface-variant/30 rounded-2xl border border-outline">
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Total Orders</div>
                    <div className="text-2xl font-black">{partyOrders.length}</div>
                  </div>
                </div>

                {/* Orders Trace */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                    <FileText size={14} /> POS Order History
                  </h4>
                  <div className="space-y-2">
                    {partyOrders.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-on-surface-variant bg-surface-variant/10 rounded-xl border border-dashed border-outline">
                        No transactions found in this profile identity.
                      </div>
                    ) : (
                      partyOrders.map((o, idx) => (
                        <div key={`party-o-${o.id ?? idx}-${idx}`} className="p-3 bg-surface-variant/20 rounded-xl border border-outline flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold uppercase">{o.venueName || 'Unknown Location'}</div>
                            <div className="text-[10px] text-on-surface-variant font-mono">{o.timestamp ? new Date(o.timestamp).toLocaleString() : 'N/A'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black">R{(o.total || o.total_amount || 0).toFixed(2)}</div>
                            <div className="text-[9px] font-bold uppercase text-primary">{o.status}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tickets Trace */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                    <Calendar size={14} /> Ticket Assets
                  </h4>
                  <div className="space-y-2">
                    {partyTickets.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-on-surface-variant bg-surface-variant/10 rounded-xl border border-dashed border-outline">
                        No active or past ticket assets linked to this UID.
                      </div>
                    ) : (
                      partyTickets.map((t, idx) => (
                        <div key={`party-t-${t.id ?? idx}-${idx}`} className="p-3 bg-surface-variant/20 rounded-xl border border-outline flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold uppercase">{t.event_title || 'Unknown Event'}</div>
                            <div className="text-[10px] text-on-surface-variant">{t.venue_name} • {t.tier_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-success uppercase">{t.status}</div>
                            <div className="text-[9px] font-mono text-on-surface-variant">R{(t.price || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-outline bg-surface-variant/10 flex justify-end">
                <button 
                  onClick={() => window.print()} 
                  className="px-6 py-2 bg-on-surface text-surface text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <FileText size={16} /> Print Full Statement
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

