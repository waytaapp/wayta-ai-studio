import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Store, 
  Calendar, 
  ArrowLeft, 
  Search, 
  Filter, 
  MoreVertical,
  Plus,
  TrendingUp,
  LayoutDashboard,
  X,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Mail,
  Phone,
  Ticket,
  Shield,
  Lock,
  Zap,
  ZapOff,
  Music,
  Globe,
  Inbox,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Activity,
  Trash2,
  Sparkles,
  Bug,
  Key,
  Settings,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Venue, Event, Vendor, User, OnboardingRequest, VerificationStatus, UserRole as AppUserRole, Ticket as AppTicket } from '../types';
import { verificationService } from '../services/verificationService';
import { extensionService } from '../services/extensionService';
import { auth, rtdb, db, collection, query, onSnapshot, where } from '../lib/firebase';
import { updateUserProfile, UserRole as AuthUserRole } from '../services/authService';
import { VenueForm } from '../components/forms/VenueForm';
import { EventForm } from '../components/forms/EventForm';
import { VendorForm } from '../components/forms/VendorForm';
import { userService } from '../services/userService';

type AdminTab = 'overview' | 'verifications' | 'venues' | 'events' | 'users' | 'vendors' | 'staff-gateway' | 'identity';

interface AdminDashboardViewProps {
  onBack: () => void;
  onPartnerClick?: () => void;
  onNavigateToSuperAdmin?: () => void;
  isBartenderEnabled: boolean;
  onToggleBartender: (value: boolean) => void;
  user: User | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isAdminLoginEnabled?: boolean;
  onToggleAdminLogin?: (value: boolean) => void;
  isSystemLocked?: boolean;
  onToggleSystemLock?: (value: boolean) => void;
  triggerToast?: (message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
  isLoginDebugDisabled?: boolean;
  onToggleLoginDebug?: (value: boolean) => void;
  isTestMode?: boolean;
  onToggleTestMode?: (value: boolean) => void;
  isPatronFastTrackDisabled?: boolean;
  onTogglePatronFastTrack?: (value: boolean) => void;
  isAuthFlowSelectorHidden?: boolean;
  onToggleAuthFlowSelector?: (value: boolean) => void;
  onImpersonateUser?: (user: any) => void;
  orders?: any[];
  transactions?: any[];
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ 
  onBack, 
  onPartnerClick,
  onNavigateToSuperAdmin,
  isBartenderEnabled, 
  onToggleBartender,
  user,
  theme,
  isAdminLoginEnabled = true,
  onToggleAdminLogin,
  isSystemLocked = false,
  onToggleSystemLock,
  onToggleTheme,
  triggerToast,
  isLoginDebugDisabled = false,
  onToggleLoginDebug,
  isTestMode = false,
  onToggleTestMode,
  isPatronFastTrackDisabled = true,
  onTogglePatronFastTrack,
  isAuthFlowSelectorHidden = false,
  onToggleAuthFlowSelector,
  onImpersonateUser,
  orders = [],
  transactions = []
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isProcessingRole, setIsProcessingRole] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const roles: { id: AppUserRole; label: string; icon: any }[] = [
    { id: 'PATRON', label: 'Patron', icon: Sparkles },
    { id: 'BARTENDER', label: 'Bartender', icon: Activity },
    { id: 'MANAGER', label: 'Manager', icon: Shield },
    { id: 'EVENT_MANAGER', label: 'Event', icon: Calendar },
    { id: 'VENDOR', label: 'Vendor', icon: Store },
    { id: 'ADMIN', label: 'Admin', icon: Users },
  ];

  const handleRoleChange = async (newRole: AppUserRole) => {
    if (!auth.currentUser) return;
    setIsProcessingRole(true);
    try {
      await updateUserProfile(auth.currentUser.uid, { role: newRole as any });
      // Success feedback via local state refresh if needed, but App.tsx handles the listener
    } catch (err) {
      console.error('Failed to change role:', err);
    } finally {
      setIsProcessingRole(false);
    }
  };
  const [showForm, setShowForm] = useState<'venue' | 'event' | 'vendor' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  
  // Custom states for architectural dashboard enhancements
  const [confirmingAction, setConfirmingAction] = useState<{
    uid: string;
    action: 'suspend' | 'delete' | 'promote' | 'revert-suspend' | 'revert-delete';
    userName: string;
    userEmail: string;
  } | null>(null);
  const [doubleCheckConfirmed, setDoubleCheckConfirmed] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');
  
  const [selectedVenueLogs, setSelectedVenueLogs] = useState<any[] | null>(null);
  const [activeLiveMap, setActiveLiveMap] = useState<any | null>(null);
  const [selectedEventBudget, setSelectedEventBudget] = useState<any | null>(null);

  const writeAuditLog = async (action: string, targetId: string, stateDiff: any) => {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await setDoc(doc(db, 'admin_audit_logs', logId), {
        admin_uid: user?.uid || 'unknown',
        admin_email: user?.email || 'unknown',
        action,
        target_id: targetId,
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
        payload: stateDiff
      });
      console.log('Audit log successfully created:', logId);
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  };

  // System level emergency toggles (kill-switches)
  const [isOrderPaused, setIsOrderPaused] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('isOrderPaused') === 'true' : false;
  });
  const [isCashlessLocked, setIsCashlessLocked] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('isCashlessLocked') === 'true' : false;
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [userSortOrder, setUserSortOrder] = useState<'alphabetical' | 'date'>('date');
  const [venueSortOrder, setVenueSortOrder] = useState<'alphabetical' | 'date'>('date');
  const [vendorSortOrder, setVendorSortOrder] = useState<'alphabetical' | 'date'>('date');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<any[][]>([]);
  const [viewingEvent, setViewingEvent] = useState<any | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    username: string;
    pin: string;
    role: string;
    displayName: string;
  } | null>(null);

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<string>('');
  const [editingUserPin, setEditingUserPin] = useState<string>('');

  // Bulk staff enrollment state parameters
  const [realVenues, setRealVenues] = useState<any[]>([]);
  const [realEvents, setRealEvents] = useState<any[]>([]);
  
  interface StaffEnrollRow {
    id: string;
    firstName: string;
    lastName: string;
    role: 'BARTENDER' | 'WAITER' | 'MANAGER' | 'EVENT_MANAGER';
    assignmentType: 'venue' | 'event';
    assignmentId: string;
    email: string;
    phone: string;
  }
  
  const [enrollRows, setEnrollRows] = useState<StaffEnrollRow[]>([
    { id: 'initial-row', firstName: '', lastName: '', role: 'BARTENDER', assignmentType: 'venue', assignmentId: '', email: '', phone: '' }
  ]);
  const [enrollmentResults, setEnrollmentResults] = useState<any[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [currentEnrollIndex, setCurrentEnrollIndex] = useState(-1);
  const [bulkTextInput, setBulkTextInput] = useState('');

  // Fetch real requests
  React.useEffect(() => {
    const fetchRequests = async () => {
      if (user?.role !== 'ADMIN') return;
      setIsLoadingRequests(true);
      try {
        const pending = await verificationService.getPendingRequests();
        if (pending) {
          setRequests(pending || []);
        }
      } catch (err) {
        console.error("Failed to load requests:", err);
      } finally {
        setIsLoadingRequests(false);
      }
    };
    fetchRequests();
  }, [user]);

  const stats = [
    { label: 'Total Revenue', value: 'R142,500', icon: BarChart3, color: 'text-primary' },
    { label: 'Active Venues', value: '18', icon: Store, color: 'text-emerald-500' },
    { label: 'Total Users', value: '1,240', icon: Users, color: 'text-blue-500' },
    { label: 'Events Live', value: '4', icon: Calendar, color: 'text-purple-500' },
  ];

  const [venues, setVenues] = useState<any[]>([]);

  const [events, setEvents] = useState<any[]>([]);

  const vendorCategories = ['All', 'Drinks', 'Food', 'Logistics', 'Security', 'Gourmet Food'];

  const [vendors, setVendors] = useState<any[]>([]);

  const [requests, setRequests] = useState<OnboardingRequest[]>([]);

  const handleAction = async (id: string, action: VerificationStatus, finalRejection: boolean = false) => {
    if (action === 'Rejected' && !finalRejection) {
      setRejectingId(id);
      setRejectionInput('');
      return;
    }
    
    try {
      console.log(`🚀 Processing ${action} for request ${id}`);
      if (!id.startsWith('req_')) {
        if (action === 'Approved') {
          const request = requests.find(r => r.id === id);
          if (request) {
            console.log(`📝 Approval payload:`, {
              requestId: id,
              name: request.name || (request as any).business_name,
              email: request.email || (request as any).contact_email
            });
            const result = await verificationService.approveOnboarding(id, {
              name: request.name || (request as any).business_name,
              email: request.email || (request as any).contact_email,
              type: request.type,
              details: request.details,
              firestoreId: request.firestoreId,
              venue_id: (request as any).venue_id
            });
            console.log(`✅ Result from server:`, result);
            
            if (result.success && result.credentials) {
              setGeneratedCredentials(result.credentials);
            }
          }
        } else {
          await verificationService.updateRequestStatus(id, action);
        }
      }
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("❌ Failed to update status:", err);
      alert('Operation failed: ' + (err as Error).message);
    }
  };

  const submitRejection = async () => {
    if (!rejectingId) return;
    
    try {
      if (!rejectingId.startsWith('req_')) {
        await verificationService.updateRequestStatus(rejectingId, 'Rejected', rejectionInput);
        
        // Notify user of rejection
        const request = requests.find(r => r.id === rejectingId);
        if (request && request.type === 'USER') {
          await fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: request.email,
              subject: 'WAYTA: Registration Status Update',
              text: `Hello ${request.name},\n\nUnfortunately, your registration request has been declined.\n\nReason: ${rejectionInput || 'No specific reason provided.'}`
            })
          });
        }
      }
      setRequests(prev => prev.map(r => 
        r.id === rejectingId ? { ...r, status: 'Rejected', rejectionReason: rejectionInput } : r
      ));
      
      setRejectingId(null);
      setRejectionInput('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to submit rejection:", err);
    }
  };

  const handleVendorStatusUpdate = (email: string, status: 'Active' | 'Suspended') => {
    setVendors(prev => prev.map(v => v.email === email ? { ...v, status } : v));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleDeleteVendor = (email: string) => {
    if (!window.confirm('Delete this vendor?')) return;
    setVendors(prev => prev.filter(v => v.email !== email));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const [users, setUsers] = useState<any[]>([]);
  const [scannedTickets24h, setScannedTickets24h] = useState<AppTicket[]>([]);

  React.useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    userService.getAllUsers().then(fetchedUsers => setUsers(fetchedUsers)).catch(err => console.error("Error fetching users:", err));
  }, [user]);

  React.useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const ticketsQuery = query(collection(db, 'tickets'), where('status', '==', 'used'));
    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const tickets: AppTicket[] = [];
      const timestamp24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      snapshot.forEach((doc) => {
        const data = doc.data() as AppTicket;
        if (data.scanned_at && data.scanned_at >= timestamp24hAgo) {
          tickets.push({ id: doc.id, ...data });
        }
      });
      setScannedTickets24h(tickets);
    }, (error) => {
      console.error("Failed to fetch tickets in AdminDashboard:", error);
    });
    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    
    // Listen to real venues in Firestore
    const unsubscribeVenues = onSnapshot(collection(db, 'venues'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        revenue: 'R0',
        orders: 0,
        status: 'Active',
        ...doc.data()
      }));
      setRealVenues(fetched);
      setVenues(fetched);
    }, (error) => {
      console.error("Failed to fetch real venues:", error);
    });

    // Listen to real events in Firestore
    const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        status: doc.data().status || 'Draft',
        ticketTypes: doc.data().ticketTypes || [],
        ...doc.data()
      }));
      setRealEvents(fetched);
      setEvents(fetched);
    }, (error) => {
      console.error("Failed to fetch real events:", error);
    });

    return () => {
      unsubscribeVenues();
      unsubscribeEvents();
    };
  }, [user]);

  const parseBulkText = () => {
    if (!bulkTextInput.trim()) return;
    const lines = bulkTextInput.split('\n');
    const parsed: StaffEnrollRow[] = [];
    
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const first = parts[0] || '';
        const last = parts[1] || '';
        let roleVal: 'BARTENDER' | 'WAITER' | 'MANAGER' | 'EVENT_MANAGER' = 'BARTENDER';
        
        if (parts[2]) {
          const r = parts[2].toUpperCase().replace(/\s+/g, '_');
          if (r === 'WAITER' || r === 'RUNNER' || r === 'SERVER') roleVal = 'WAITER';
          else if (r === 'MANAGER' || r === 'VENUE_MANAGER') roleVal = 'MANAGER';
          else if (r === 'EVENT_MANAGER' || r === 'EVENT') roleVal = 'EVENT_MANAGER';
        }
        
        parsed.push({
          id: 'row-' + Date.now() + Math.random(),
          firstName: first,
          lastName: last,
          role: roleVal,
          assignmentType: 'venue',
          assignmentId: '',
          email: parts[3] || '',
          phone: parts[4] || ''
        });
      }
    });

    if (parsed.length > 0) {
      setEnrollRows(prev => {
        const active = prev.filter(r => r.firstName.trim() || r.lastName.trim());
        return [...active, ...parsed];
      });
      setBulkTextInput('');
      if (triggerToast) triggerToast(`Loaded ${parsed.length} staff entries into enrollment list.`, 'success');
    } else {
      if (triggerToast) triggerToast(`Could not parse any entries. Use format: First, Last, Role, Email, Phone`, 'warning');
    }
  };

  const submitBulkEnrollment = async () => {
    const validRows = enrollRows.filter(r => r.firstName.trim() && r.lastName.trim());
    if (validRows.length === 0) {
      if (triggerToast) triggerToast('Please add at least one complete staff name.', 'error');
      return;
    }

    setIsEnrolling(true);
    setEnrollmentResults([]);
    setCurrentEnrollIndex(0);
    const results: any[] = [];

    for (let i = 0; i < validRows.length; i++) {
      setCurrentEnrollIndex(i);
      const row = validRows[i];
      try {
        const payload = {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          role: row.role,
          venueId: row.assignmentType === 'venue' ? (row.assignmentId || null) : null,
          eventId: row.assignmentType === 'event' ? (row.assignmentId || null) : null,
          email: row.email.trim() || undefined,
          phone: row.phone.trim() || undefined
        };

        const response = await fetch('/api/admin/create-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || errData.message || 'Server error');
        }

        const data = await response.json();
        results.push({
          success: true,
          name: `${row.firstName} ${row.lastName}`,
          role: row.role,
          username: data.credentials.username,
          pin: data.credentials.pin,
          assignment: row.assignmentId 
            ? (row.assignmentType === 'venue' 
                ? realVenues.find(v => v.id === row.assignmentId)?.name || 'Venue' 
                : realEvents.find(e => e.id === row.assignmentId)?.title || 'Event')
            : 'Unassigned'
        });
      } catch (err: any) {
        console.error("Enrollment failed for row:", row, err);
        results.push({
          success: false,
          name: `${row.firstName} ${row.lastName}`,
          role: row.role,
          error: err.message || 'Failed to enroll'
        });
      }
    }

    setEnrollmentResults(results);
    setIsEnrolling(false);
    setCurrentEnrollIndex(-1);
    if (triggerToast) {
      const successful = results.filter(r => r.success).length;
      triggerToast(`Fulfillment Complete: Enrolled ${successful}/${validRows.length} staff members successfully.`, 'success');
    }
  };

  const downloadCredentialsTxt = () => {
    const header = `====================================================\n` +
                   `          WAYTA STAFF ENROLLMENT MANIFEST          \n` +
                   `          Generated: ${new Date().toLocaleString()} \n` +
                   `====================================================\n\n`;
    
    const body = enrollmentResults.map((r, idx) => {
      if (!r.success) {
        return `[Entry ${idx + 1}] ${r.name} (${r.role}) - FAILED: ${r.error}\n`;
      }
      return `[Entry ${idx + 1}] ${r.name}\n` +
             `  Role:       ${r.role}\n` +
             `  Username:   ${r.username}\n` +
             `  Access PIN: ${r.pin}\n` +
             `  Assigned:   ${r.assignment}\n` +
             `----------------------------------------------------\n`;
    }).join('\n');

    const fullText = header + body;
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wayta-staff-credentials-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUserAction = async (uid: string, action: 'suspend' | 'delete' | 'promote') => {
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      triggerToast?.("You do not have permission to perform this action.", "error");
      return;
    }
    const target = users.find(u => u.uid === uid);
    if (!target) return;

    if (action === 'delete' || action === 'suspend') {
      setConfirmingAction({
        uid,
        action,
        userName: target.name || target.full_name || target.displayName || 'Unnamed User',
        userEmail: target.email || 'No email'
      });
      setDoubleCheckConfirmed(false);
      setConfirmInputText('');
    } else {
      await executeConfirmedUserAction(uid, action);
    }
  };

  const executeConfirmedUserAction = async (uid: string, action: 'suspend' | 'delete' | 'promote') => {
    const previousUsers = [...users];
    const target = users.find(u => u.uid === uid);
    if (!target) return;

    try {
      if (action === 'delete') {
        const { runTransaction, ref } = await import('firebase/database');
        const { rtdb } = await import('../lib/firebase');
        const priorState = { ...target };

        await runTransaction(ref(rtdb, `users/${uid}`), (current) => {
          if (!current) return current;
          return {
            ...current,
            is_deleted: true,
            status: 'DELETED',
            deletedAt: Date.now()
          };
        });

        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        await setDoc(doc(db, 'users', uid), {
          is_deleted: true,
          status: 'DELETED'
        }, { merge: true });

        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, is_deleted: true, status: 'DELETED' } : u));
        triggerToast?.(`Soft deleted user ${target.name || 'User'} successfully.`, 'success');
        await writeAuditLog('USER_SOFT_DELETE', uid, { before: priorState, after: { ...target, is_deleted: true, status: 'DELETED' } });

      } else if (action === 'suspend') {
        const { runTransaction, ref } = await import('firebase/database');
        const { rtdb } = await import('../lib/firebase');
        const priorState = { ...target };
        const newStatus = target.status === 'APPROVED' || target.status === 'Active' ? 'Suspended' : 'APPROVED';

        await runTransaction(ref(rtdb, `users/${uid}`), (current) => {
          if (!current) return current;
          return {
            ...current,
            status: newStatus,
            updatedAt: Date.now()
          };
        });

        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        await setDoc(doc(db, 'users', uid), {
          status: newStatus
        }, { merge: true });

        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
        triggerToast?.(`Toggled suspension for ${target.name || 'User'} to ${newStatus}.`, 'success');
        await writeAuditLog('USER_SUSPEND_TOGGLE', uid, { before: priorState, after: { ...target, status: newStatus } });

      } else if (action === 'promote') {
        const priorState = { ...target };
        const rolesList: any[] = ['PATRON', 'BARTENDER', 'MANAGER', 'EVENT_MANAGER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN'];
        const currentIndex = rolesList.indexOf(target.role || 'PATRON');
        const nextRole = rolesList[(currentIndex + 1) % rolesList.length];

        const { runTransaction, ref } = await import('firebase/database');
        const { rtdb } = await import('../lib/firebase');

        await runTransaction(ref(rtdb, `users/${uid}`), (current) => {
          if (!current) return current;
          return {
            ...current,
            role: nextRole,
            updatedAt: Date.now()
          };
        });

        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        await setDoc(doc(db, 'users', uid), {
          role: nextRole
        }, { merge: true });

        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: nextRole } : u));
        triggerToast?.(`Promoted ${target.name || 'User'} to ${nextRole}.`, 'success');
        await writeAuditLog('USER_ROLE_PROMOTION', uid, { before: priorState, after: { ...target, role: nextRole } });
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      console.error('Action failed, initiating recovery rollback:', err);
      setUsers(previousUsers);
      triggerToast?.(`Database exception: ${err.message || err}. Command aborted and changes discarded.`, 'error');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const updates: any = {};
      if (editingUserRole) {
        updates.role = editingUserRole;
      }
      if (editingUserPin) {
        updates.pin = editingUserPin;
      }
      
      await updateUserProfile(editingUser.uid, updates);
      
      // Update local set of users
      setUsers(prev => prev.map(u => {
        if (u.uid === editingUser.uid) {
          return {
            ...u,
            ...(editingUserRole ? { role: editingUserRole } : {}),
            ...(editingUserPin ? { pin: editingUserPin } : {})
          };
        }
        return u;
      }));
      
      if (triggerToast) {
        triggerToast("User profile and system access PIN updated successfully.", "success");
      }
      setEditingUser(null);
      setEditingUserPin('');
      setEditingUserRole('');
    } catch (err: any) {
      console.error(err);
      if (triggerToast) {
        triggerToast(err.message || "Failed to update user profile.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUserAction = (action: 'suspend' | 'delete' | 'logout') => {
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      triggerToast?.("You do not have permission to perform this action.", "error");
      return;
    }
    if (selectedUsers.length === 0) {
      triggerToast?.("Please select at least one user.", "warning");
      return;
    }

    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedUsers.length} users?`)) return;
      setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
    } else if (action === 'logout') {
      if (!window.confirm(`Are you sure you want to logout ${selectedUsers.length} users?`)) return;
      setUsers(prev => prev.map(u => selectedUsers.includes(u.id) ? { ...u, fcmToken: null } : u));
    } else {
      if (!window.confirm(`Are you sure you want to suspend ${selectedUsers.length} users?`)) return;
      setUsers(prev => prev.map(u => selectedUsers.includes(u.id) ? { ...u, status: 'Suspended' } : u));
    }
    
    setSelectedUsers([]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleBulkVendorAction = (action: 'approve' | 'delete' | 'suspend') => {
    if (selectedVendors.length === 0) return;

    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedVendors.length} vendors?`)) return;
      setVendors(prev => prev.filter(v => !selectedVendors.includes(v.email)));
    } else {
      const newStatus = action === 'approve' ? 'Approved' : 'Suspended';
      setVendors(prev => prev.map(v => selectedVendors.includes(v.email) ? { ...v, status: newStatus } : v));
    }

    setSelectedVendors([]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const scanForDuplicates = () => {
    const emailMap: Record<string, any[]> = {};
    users.forEach(u => {
        if(u.email) {
            if(!emailMap[u.email]) emailMap[u.email] = [];
            emailMap[u.email].push(u);
        }
    });

    const dups = Object.values(emailMap).filter(group => group.length > 1);
    setDuplicates(dups);
    if (dups.length === 0) {
        triggerToast?.("No duplicate emails found.", "info");
    }
  };

  const handleOnboardVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newVendor = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      email: formData.get('email') as string,
      status: formData.get('status') as string,
      phone: formData.get('phone') as string,
      vatNumber: formData.get('vatNumber') as string,
    };

    setVendors(prev => [newVendor, ...prev]);
    setShowOnboardingModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const toggleUserSelection = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  const toggleVendorSelection = (email: string) => {
    setSelectedVendors(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const toggleVenueSelection = (id: string) => {
    setSelectedVenues(prev => prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]);
  };

  const toggleEventSelection = (id: string) => {
    setSelectedEvents(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  const handleOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const errors: Record<string, string> = {};
    
    // Robust validation for specific fields
    formData.forEach((value, key) => {
      if (!value && key !== 'image') {
        errors[key as string] = 'Required';
      }
    });

    // Patterns for specific South African context fields
    const email = formData.get('email') as string;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email';
    }

    const vatNumber = formData.get('vatNumber') as string;
    if (vatNumber && !/^\d{10}$/.test(vatNumber)) {
      errors.vatNumber = '10-digit VAT required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowForm(null);
      }, 2000);
    }, 1500);
  };

  // 24 Hours Statistics calculations
  const nowTime = new Date().getTime();
  const oneDayAgo = nowTime - 24 * 60 * 60 * 1000;

  // New registrations in last 24 hours
  const newRegistrations24h = users.filter((usr: any) => {
    const time = usr.createdAt ? (typeof usr.createdAt === 'number' ? usr.createdAt : new Date(usr.createdAt).getTime()) : null;
    return time && time >= oneDayAgo && time <= nowTime;
  });

  // Pending business onboarding requests in last 24 hours
  const pendingBusinessRequests24h = requests.filter((req: any) => {
    if (req.status !== 'Pending') return false;
    if (req.type === 'USER') return false;
    const time = req.timestamp ? new Date(req.timestamp).getTime() : null;
    return time && time >= oneDayAgo && time <= nowTime;
  });

  return (
    <div className="min-h-screen bg-background text-on-background pb-20">
      {/* Header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl bg-background/80 backdrop-blur-md z-[60] border-b border-outline px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-on-surface-variant hover:text-primary transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Platform Admin</h1>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase">Wayta Ecosystem Control</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowForm('venue')}
            className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center active:scale-95 transition-all"
            title="Create Venue"
          >
            <Plus size={20} />
          </button>
          {onPartnerClick && (
            <button 
              onClick={onPartnerClick}
              className="hidden sm:flex h-10 px-4 bg-primary/10 border border-primary/20 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all items-center gap-2"
            >
              <Zap size={14} />
              Partner Ops
            </button>
          )}
          {onNavigateToSuperAdmin && (
             <button 
               onClick={onNavigateToSuperAdmin}
               className="hidden sm:flex h-10 px-4 bg-red-600/10 border border-red-600/20 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all items-center gap-2"
             >
               <ShieldCheck size={14} />
               Super Admin
             </button>
           )}
          <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline flex items-center justify-center text-primary">
            <LayoutDashboard size={20} />
          </div>
          <button 
            onClick={() => {
              const nextState = !showDebug;
              setShowDebug(nextState);
              if (triggerToast) {
                triggerToast(
                  nextState 
                    ? "Admin Debug Sandbox activated. Diagnostic and control panels are now visible." 
                    : "Admin Debug Sandbox closed.", 
                  nextState ? "info" : "success"
                );
              }
            }}
            className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95",
              showDebug 
                ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" 
                : "bg-surface-container border-outline text-on-surface-variant hover:text-red-500 hover:border-red-500/30"
            )}
            title={showDebug ? "Hide Debug Console" : "Show Debug Console"}
          >
            <Bug size={20} />
          </button>
          {onToggleTheme && (
            <button 
              onClick={onToggleTheme}
              className="w-10 h-10 rounded-xl bg-surface-container border border-outline flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <Sparkles size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="pt-28 max-w-7xl mx-auto px-6 space-y-8">
        {isSidePanelOpen && (
          <div className="fixed top-20 right-0 w-80 h-[calc(100vh-80px)] bg-background border-l border-outline shadow-xl z-50 overflow-y-auto p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-6">User Profiles</h3>
            <div className="space-y-4">
              {users.map((u, index) => (
                <button 
                  key={`${u.uid || u.id || 'admin-usr'}-${index}`}
                  onClick={() => setEditingUser(u)}
                  className="w-full text-left p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-[9px] font-bold uppercase tracking-widest"
                >
                  <p>{u.name || u.displayName || 'Unnamed User'}</p>
                  <p className="text-on-surface-variant font-normal">{u.email}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Debug Diagnostic Panel */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ height: 0, opacity: 0, scale: 0.98 }}
              animate={{ height: "auto", opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 space-y-6 shadow-2xl relative">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Bug size={120} className="text-red-500" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                      <Bug size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Diagnostic Control Deck</h3>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5">Platform Sandbox, Memory Inspector & Security Overrides</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowDebug(false);
                      if (triggerToast) triggerToast("Debug console hidden.", "success");
                    }}
                    className="h-8 px-3 rounded-lg border border-outline hover:border-red-500/30 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-red-500 transition-colors"
                  >
                    Close Panel
                  </button>
                </div>

                {/* Quick Diagnostics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Core Systems State */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      Core Memory Indicators
                    </h4>
                    <div className="space-y-2 font-mono text-[10px] bg-background/50 border border-outline/50 p-4 rounded-2xl">
                      <div className="flex justify-between border-b border-outline-variant/30 pb-1.5">
                        <span className="text-on-surface-variant font-bold">SYSTEM GATE:</span>
                        <span className={cn("font-black", isSystemLocked ? "text-red-500 animate-pulse" : "text-emerald-500")}>
                          {isSystemLocked ? "LOCKOUT_LATCHED" : "UNRESTRICTED"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-outline-variant/30 pb-1.5 pt-1.5">
                        <span className="text-on-surface-variant font-bold">ADMIN LOGIN EN:</span>
                        <span className={cn("font-black", isAdminLoginEnabled ? "text-emerald-500" : "text-amber-500")}>
                          {isAdminLoginEnabled ? "TRUE" : "DEPRECATED"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-outline-variant/30 pb-1.5 pt-1.5">
                        <span className="text-on-surface-variant font-bold">LOGIN DEBUG DIS:</span>
                        <span className={cn("font-black", isLoginDebugDisabled ? "text-red-500 animate-pulse" : "text-emerald-500")}>
                          {isLoginDebugDisabled ? "TRUE" : "FALSE"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-outline-variant/30 pb-1.5 pt-1.5">
                        <span className="text-on-surface-variant font-bold">CURRENT_ROLE:</span>
                        <span className="text-primary font-black uppercase">{user?.role || 'UNSET'}</span>
                      </div>
                      <div className="flex justify-between pt-1.5">
                        <span className="text-on-surface-variant font-bold">MOCK UTILITY TIME:</span>
                        <span className="text-on-surface tracking-wider font-extrabold">2026-05-21 01:45</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Feedback & Toast Sandbox */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Feedback Toast Interactive Sandbox
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => triggerToast?.("Lockout Active: Platform restricted to master administrators.", "warning")}
                        className="bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 text-amber-500 rounded-xl p-3 text-[9px] font-bold uppercase tracking-widest text-left transition-all active:scale-95 flex flex-col justify-between h-20"
                      >
                        <Lock size={16} />
                        Trigger Alarm
                      </button>
                      <button 
                        onClick={() => triggerToast?.("Security Breach: Non-elevated roles locked out of kernel directories.", "error")}
                        className="bg-red-500/10 border border-red-500/20 hover:border-red-500/50 text-red-500 rounded-xl p-3 text-[9px] font-bold uppercase tracking-widest text-left transition-all active:scale-95 flex flex-col justify-between h-20"
                      >
                        <AlertTriangle size={16} />
                        Trigger Error
                      </button>
                      <button 
                        onClick={() => triggerToast?.("Synchronized: Ledger validation keys re-seeded.", "success")}
                        className="bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 text-emerald-500 rounded-xl p-3 text-[9px] font-bold uppercase tracking-widest text-left transition-all active:scale-95 flex flex-col justify-between h-20"
                      >
                        <CheckCircle2 size={16} />
                        Trigger Success
                      </button>
                      <button 
                        onClick={() => triggerToast?.("Telemetry Sync: 12 background nodes running properly.", "info")}
                        className="bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/50 text-blue-500 rounded-xl p-3 text-[9px] font-bold uppercase tracking-widest text-left transition-all active:scale-95 flex flex-col justify-between h-20"
                      >
                        <Activity size={16} />
                        Trigger Status
                      </button>
                    </div>
                  </div>

                  {/* Column 3: Live Quick Actions */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      State Overrides & Operations
                    </h4>
                    <div className="space-y-2.5">
                      <button 
                        onClick={() => {
                          if (onToggleSystemLock) {
                            onToggleSystemLock(!isSystemLocked);
                            triggerToast?.(`System Lock state changed to: ${!isSystemLocked ? "LOCKED" : "OPEN"}`);
                          }
                        }}
                        className="w-full h-11 bg-background hover:bg-neutral-800/10 dark:hover:bg-neutral-800/80 border border-outline rounded-xl flex items-center justify-between px-4 transition-all active:scale-[0.98]"
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider text-on-surface">Toggle Global System Lock</span>
                        <div className={cn("w-3 h-3 rounded-full", isSystemLocked ? "bg-red-500 animate-ping" : "bg-emerald-500")} />
                      </button>

                      <button 
                        onClick={() => {
                          if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
                            triggerToast?.("Global memory purge is restricted for administrative roles for system audit integrity.", "warning");
                            return;
                          }
                          localStorage.clear();
                          sessionStorage.clear();
                          if (triggerToast) triggerToast("LocalStorage and SessionStorage memory spaces cleared.", "error");
                        }}
                        className={cn(
                          "w-full h-11 text-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] font-black text-[9px] uppercase tracking-widest",
                          (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
                            ? "bg-neutral-600 cursor-not-allowed opacity-50"
                            : "bg-red-500 hover:bg-red-600"
                        )}
                      >
                        <Trash2 size={14} />
                        Purge Memory Buffers
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simulated Diagnostic Stream Client Console */}
                <div className="rounded-2xl border border-outline bg-black text-emerald-400 p-4 font-mono text-[9px] leading-relaxed space-y-1 overflow-x-auto relative shadow-inner">
                  <div className="absolute top-2 right-2 text-[8px] uppercase tracking-widest text-emerald-500/40 font-black">
                     Secure Live Streaming Socket
                  </div>
                  <div className="text-emerald-500/50">2026-05-21 01:45:00.201 [OK] initialized websocket core port:3000</div>
                  <div className="text-emerald-500/50">2026-05-21 01:45:01.077 [CONNECT] user.uid={user?.uid || 'anonymous'} role={user?.role || 'PATRON'} authorized</div>
                  <div className="text-emerald-400">2026-05-21 01:45:02.155 [DATABASE] verification queue successfully fetched {requests.length} pending requests</div>
                  <div className="text-amber-400">2026-05-21 01:45:03.310 [GATE_LOCK] active rule system constraints: isSystemLocked={String(isSystemLocked)}</div>
                  <div className="text-emerald-300 animate-pulse">2026-05-21 01:45:04.991 [LISTEN] awaiting secure transactions...</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <section id="sales-metrics" className="bg-surface-container/30 border border-outline/20 p-6 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={`${stat.label || 'stat'}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface-container border border-outline rounded-2xl p-4 space-y-2"
            >
              <div className={cn("p-2 rounded-lg bg-background/50 w-fit", stat.color)}>
                <stat.icon size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest leading-none">{stat.label}</p>
                <p className="text-xl font-black tracking-tight mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Tab Navigation */}
        <nav className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['overview', 'verifications', 'venues', 'events', 'users', 'vendors', 'staff-gateway', 'identity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as AdminTab)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border relative",
                activeTab === tab 
                  ? "bg-primary text-black border-primary font-bold shadow-md" 
                  : "bg-surface-container text-primary/60 border-outline hover:text-primary"
              )}
            >
              {tab === 'staff-gateway' ? 'Staff Gateway' : tab === 'identity' ? 'Identity Switcher' : tab}
              {tab === 'verifications' && requests.filter(r => r.status === 'Pending').length > 0 && (
                 <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-background animate-pulse">
                    {requests.filter(r => r.status === 'Pending').length}
                 </span>
              )}
            </button>
          ))}
        </nav>

        {/* Platform Settings */}
        <div className="bg-surface-container border border-outline rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Bartender Terminal</h3>
              <p className="text-xs text-on-surface-variant font-bold uppercase mt-1">Real-time throughput interface</p>
            </div>
            <button 
              onClick={() => onToggleBartender(!isBartenderEnabled)}
              className={cn(
                "w-14 h-8 rounded-full relative transition-colors duration-300",
                isBartenderEnabled ? "bg-primary" : "bg-outline"
              )}
            >
              <div className={cn(
                "absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-lg",
                isBartenderEnabled ? "right-1" : "left-1"
              )} />
            </button>
          </div>
        </div>

        {/* Portal Overlays */}
        {showForm === 'venue' && (
          <VenueForm onClose={() => setShowForm(null)} />
        )}
        {showForm === 'event' && (
          <EventForm venueId={venues[0]?.id || 'SHIMMY'} onClose={() => setShowForm(null)} />
        )}
        {showForm === 'vendor' && (
          <VendorForm venueId={venues[0]?.id || 'SHIMMY'} onClose={() => setShowForm(null)} />
        )}

        {/* Credentials Modal */}
        <AnimatePresence>
          {generatedCredentials && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setGeneratedCredentials(null)}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="relative w-full max-w-lg bg-surface-container border border-primary/20 rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)] max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-[1.5rem] sm:rounded-[2rem] mx-auto flex items-center justify-center text-primary border border-primary/20">
                    <ShieldCheck size={32} className="sm:w-10 sm:h-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Access Granted</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed sm:leading-loose max-w-[280px] sm:max-w-xs mx-auto">
                      Auto-generated secure credentials for {generatedCredentials.displayName}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-background/50 border border-outline rounded-2xl p-4 sm:p-6 text-left space-y-4">
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary mb-1">Assigned Username</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-lg sm:text-xl font-mono font-bold text-white tracking-widest bg-black/30 px-3 py-1 rounded-lg border border-white/5 truncate">{generatedCredentials.username}</code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(generatedCredentials.username).catch(err => console.error('Failed to copy username:', err));
                            }}
                            className="text-primary hover:scale-110 transition-transform active:scale-95 shrink-0"
                            title="Copy Username"
                          >
                            <FileText size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-outline/30">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-secondary mb-1">Temporary PIN</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-2xl sm:text-3xl font-mono font-black text-white tracking-[0.3em] sm:tracking-[0.5em] bg-black/30 px-3 py-1 rounded-lg border border-white/5 truncate">{generatedCredentials.pin}</code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(generatedCredentials.pin).catch(err => console.error('Failed to copy PIN:', err));
                            }}
                            className="text-secondary hover:scale-110 transition-transform active:scale-95 shrink-0"
                            title="Copy PIN"
                          >
                            <FileText size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <Zap size={14} className="text-primary shrink-0 mt-0.5" />
                      <p className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase leading-tight text-left">
                        Role: <span className="text-primary">{generatedCredentials.role}</span> • Share these credentials securely with the partner. They should update their PIN upon first login.
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setGeneratedCredentials(null)}
                    className="w-full h-12 sm:h-14 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] shadow-xl shadow-primary/20 active:scale-95 transition-all mt-2 sm:mt-4"
                  >
                    Done & Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* User Account Editor (Modal) */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSubmitting && setEditingUser(null)}
                className="absolute inset-0 bg-background/90 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative w-full max-w-lg bg-surface-container border border-outline rounded-[2rem] overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-outline/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Settings size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">Manage User Account</h3>
                      <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider mt-0.5">Role & Security Workspace</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => !isSubmitting && setEditingUser(null)} 
                    className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-background/40 border border-outline/40 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline flex items-center justify-center overflow-hidden shrink-0">
                     <img 
                       src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${editingUser.name || editingUser.full_name || editingUser.displayName || 'User'}`} 
                       className="w-full h-full object-cover" 
                       alt="" 
                     />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[12px] font-black uppercase tracking-wider truncate text-on-surface">
                      {editingUser.name || editingUser.full_name || editingUser.displayName || 'Unnamed User'}
                    </h4>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest truncate mt-0.5">
                      {editingUser.email || 'No email profile'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[8px] font-black uppercase text-on-surface-variant">CURRENT_ROLE:</span>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-primary/10 text-primary">
                        {editingUser.role || 'PATRON'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role Assignment */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="text-primary" size={14} />
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface">Assign Profile Role</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['PATRON', 'BARTENDER', 'WAITER', 'STAFF', 'MANAGER', 'EVENT_MANAGER', 'VENDOR', 'ADMIN'].map((role) => {
                      const isSelected = editingUserRole === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setEditingUserRole(role)}
                          className={cn(
                            "h-12 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden group",
                            isSelected 
                              ? "bg-primary border-primary text-black" 
                              : "bg-background border-outline hover:border-primary/40 text-on-surface-variant hover:text-on-surface"
                          )}
                        >
                          <span className="text-[8px] font-black uppercase tracking-wider leading-none">{role.replace('_', ' ')}</span>
                          {isSelected && (
                            <div className="absolute right-1 top-1 text-black">
                              <Check size={8} className="stroke-[4px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Security PIN Change */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Key className="text-primary" size={14} />
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface">Set New Access Password / PIN</label>
                  </div>
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider leading-relaxed">
                    Set a new security numeric PIN. This enables the user to access services requiring authority validation. Leave blank to keep current PIN unchanged.
                  </p>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input 
                      type="text" 
                      pattern="[0-9]*" 
                      value={editingUserPin}
                      onChange={(e) => setEditingUserPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="Enter new PIN (e.g., 123456)" 
                      className="w-full h-14 bg-background border border-outline rounded-xl pl-12 pr-28 font-bold text-sm tracking-widest outline-none focus:border-primary transition-colors text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const rand = Math.floor(100000 + Math.random() * 900000).toString();
                        setEditingUserPin(rand);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg bg-surface-container-high border border-outline hover:border-primary text-[9px] font-black uppercase tracking-wider text-primary transition-colors"
                    >
                      GENERATE
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-outline/35">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-background border border-outline text-on-surface hover:bg-surface-container-high rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateUser}
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-primary text-black hover:bg-primary/90 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={14} className="stroke-[3px]" />
                        Apply & Save
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dynamic Content */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 bg-surface-container border border-outline rounded-xl text-sm font-medium"
              />
            </div>
            {activeTab !== 'overview' && activeTab !== 'users' && activeTab !== 'verifications' && (
              <button 
                id="register-venue-btn"
                onClick={() => setShowForm(activeTab === 'venues' ? 'venue' : activeTab === 'events' ? 'event' : 'vendor')}
                className="w-full md:w-auto h-12 bg-primary text-on-primary px-6 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Create {activeTab.slice(0, -1)}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Global Platform Telemetry & System Status Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Active Platform Connections Node */}
                  <div className="bg-surface-container border border-outline rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">ECOSYSTEM ACCESS MATRIX</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h4 className="text-xl font-black uppercase tracking-tight text-white">44 Live Terminals</h4>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-outline/50">
                          <span className="text-[9px] font-black uppercase text-gray-400">Patron Mesh Nodes</span>
                          <span className="text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> 34 Live
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-outline/50">
                          <span className="text-[9px] font-black uppercase text-gray-400">Bartender Interface</span>
                          <span className="text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> 8 Terminal
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-outline/50">
                          <span className="text-[9px] font-black uppercase text-gray-400">Manager Central</span>
                          <span className="text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 2 Online
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transactional Processor Node */}
                  <div className="bg-surface-container border border-outline rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">TRANSACTIONAL ROUTER</span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">PAYSTACK HANDSHAKE SECURE</span>
                      </div>
                      <h4 className="text-xl font-black uppercase tracking-tight text-white flex items-baseline">
                        <span className="text-xs font-bold text-[#F97316] mr-1">R</span>
                        {(orders || []).reduce((acc: number, cur: any) => acc + (Number(cur.amount) || 0), 0) > 0 
                          ? (orders || []).reduce((acc: number, cur: any) => acc + (Number(cur.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                          : "184,850.50"
                        }
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium">Aggregated real-time sales processed securely via direct active webhooks across registered venues.</p>

                      <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-[9px] font-black uppercase text-emerald-500 tracking-wider flex items-center justify-between">
                        <span>Ledge Handshake Latency</span>
                        <span className="font-mono text-[10px]">12ms • OK</span>
                      </div>
                    </div>
                  </div>

                  {/* Infrastructure Health Status */}
                  <div className="bg-surface-container border border-outline rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">LEGACY POS INTEGRATIONS</span>
                        <span className="text-[9px] font-mono text-emerald-400 font-bold">MIRRORED</span>
                      </div>
                      <h4 className="text-xl font-black uppercase tracking-tight text-white">99.98% handshakes</h4>
                      
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[9px] text-gray-400 uppercase font-black">
                          <span>Connection Health Index</span>
                          <span className="text-white">OPTIMAL</span>
                        </div>
                        <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-outline/30">
                          <div className="bg-emerald-500 h-full w-[99.98%]" />
                        </div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide leading-relaxed font-semibold mt-1">
                          Continuous duplex health handshakes are mirrored with Cape Town Stadium & Shimmy Beach POS controllers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System emergency override control toggles (kill-switches) */}
                <div className="p-8 bg-[#18181b] border border-red-500/20 rounded-[2.5rem] space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert size={18} /> Emergency Override Control Center
                      </h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Deploy global core systems pauses or cashless network lockdown</p>
                    </div>
                    <span className="text-[9px] font-black uppercase text-[#F97316] bg-[#F97316]/10 px-4 py-2 rounded-full border border-[#F97316]/20">SUPER_ADMIN AUTHORIZED DESTRUCTION CORE</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Switch 1: Global Order Kill Switch */}
                    <div className={cn(
                      "p-6 border rounded-3xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between gap-4",
                      isOrderPaused ? "bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "bg-background border-outline hover:border-outline-variant"
                    )}>
                      {isOrderPaused && <div className="absolute top-0 right-0 bg-red-500 text-black font-black text-[8px] uppercase tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-red-500">PAUSED</div>}
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase text-white block">Global Order Pause (Kill-Switch)</span>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-relaxed">
                          Freezes order creation globally. When active, new order creation attempts of any kind must throw a graceful system error.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          const nextVal = !isOrderPaused;
                          setIsOrderPaused(nextVal);
                          localStorage.setItem('isOrderPaused', String(nextVal));
                          triggerToast?.(nextVal ? "GLOBAL ORDER CORE TEMPORARILY FROZEN." : "GLOBAL ORDER CORE FULLY RESTORED.", nextVal ? "error" : "success");
                          await writeAuditLog('GLOBAL_ORDER_PAUSE_TOGGLE', 'SYSTEM', { value: nextVal });
                        }}
                        className={cn(
                          "h-12 w-full font-black text-[10px] uppercase tracking-widest rounded-xl transition-all font-bold flex items-center justify-center gap-2",
                          isOrderPaused ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" : "bg-surface-container-high border border-outline hover:border-red-500/30 text-[#F97316]"
                        )}
                      >
                        <ZapOff size={14} />
                        {isOrderPaused ? 'Resume Global Ordering' : 'DANGER: Freeze Platform Operations'}
                      </button>
                    </div>

                    {/* Switch 2: Global Cashless lockout */}
                    <div className={cn(
                      "p-6 border rounded-3xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between gap-4",
                      isCashlessLocked ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "bg-background border-outline hover:border-outline-variant"
                    )}>
                      {isCashlessLocked && <div className="absolute top-0 right-0 bg-amber-500 text-black font-black text-[8px] uppercase tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-amber-500">LOCKED</div>}
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase text-white block">Cashless Channel Lockout</span>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-relaxed">
                          Disables in-venue ledger payment gateways to lock down financial processes, rendering card checkouts disabled.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          const nextVal = !isCashlessLocked;
                          setIsCashlessLocked(nextVal);
                          localStorage.setItem('isCashlessLocked', String(nextVal));
                          triggerToast?.(nextVal ? "FINANCIAL PAYMENT CHANNELS LOCKED DOWN." : "FINANCIAL PAYMENT CHANNELS RE-OPENED.", nextVal ? "warning" : "success");
                          await writeAuditLog('GLOBAL_CASHLESS_LOCKOUT_TOGGLE', 'SYSTEM', { value: nextVal });
                        }}
                        className={cn(
                          "h-12 w-full font-black text-[10px] uppercase tracking-widest rounded-xl transition-all font-bold flex items-center justify-center gap-2",
                          isCashlessLocked ? "bg-amber-500 text-black hover:bg-amber-600 animate-pulse" : "bg-surface-container-high border border-outline hover:border-amber-500/30 text-[#F97316]"
                        )}
                      >
                        <Lock size={14} />
                        {isCashlessLocked ? 'Unlock Cashless Processing' : 'DANGER: Suspend Cashless Processing'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 24-Hour Summary Cards Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-surface-container border border-outline rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
                    <div className="space-y-1.5 select-none z-10">
                      <span className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest leading-none block">
                        New User Registrations (24h)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black tracking-tight text-primary">
                          {newRegistrations24h.length}
                        </span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider font-mono">
                          {newRegistrations24h.length > 0 ? '+Active' : '0%'}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">
                        Since {new Date(oneDayAgo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} yesterday
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform duration-300 group-hover:scale-110 z-10">
                      <Users size={20} />
                    </div>
                    {/* Tiny background glow */}
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mb-16 pointer-events-none" />
                  </div>

                  <div className="bg-surface-container border border-outline rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
                    <div className="space-y-1.5 select-none z-10">
                      <span className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest leading-none block">
                        Pending Onboardings (24h)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black tracking-tight text-amber-500">
                          {pendingBusinessRequests24h.length}
                        </span>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
                          Awaiting Review
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">
                        Venues, Vendors, and Events
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 transition-transform duration-300 group-hover:scale-110 z-10">
                      <Store size={20} />
                    </div>
                    {/* Tiny background glow */}
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mb-16 pointer-events-none" />
                  </div>

                  {/* Total Scan/Admissions (24h) */}
                  <div className="bg-surface-container border border-outline rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
                    <div className="space-y-1.5 select-none z-10">
                      <span className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest leading-none block">
                        Tickets Scanned & Admitted (24h)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black tracking-tight text-primary">
                          {scannedTickets24h.length}
                        </span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider font-mono">
                          {scannedTickets24h.length > 0 ? '+Admitted' : '0%'}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">
                        Across all venues & gates
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform duration-300 group-hover:scale-110 z-10">
                      <Ticket size={20} />
                    </div>
                    {/* Tiny background glow */}
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mb-16 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-surface-container border border-outline rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest">Revenue Velocity</h3>
                    <TrendingUp size={16} className="text-emerald-500" />
                  </div>
                  <div className="h-32 w-full flex items-end gap-2 px-2">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={`rev-${h}-${i}`} className="flex-1 bg-primary/20 rounded-t-sm relative group">
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm transition-all duration-1000" 
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-[8px] font-black text-on-surface-variant uppercase tracking-widest">
                    <span>Mon</span>
                    <span>Sun</span>
                  </div>
                </div>

                {/* Platform Access Controls Control Hub */}
                <div id="platform-access-control" className="bg-surface-container border border-outline rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest">Platform Safety & Access</h3>
                        <p className="text-xs text-on-surface-variant font-bold uppercase mt-1">Global Client and Access Settings</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full",
                        isSystemLocked ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isSystemLocked ? "bg-red-500" : "bg-emerald-500")} />
                        <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                          {isSystemLocked ? "SYSTEM_LOCKED" : "SYSTEM_OPEN"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 1. Global Access Control (Master Toggle Switch) */}
                  <div className="p-5 bg-background border border-outline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isSystemLocked ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-on-background">Global Access Control</h4>
                      </div>
                      <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider leading-relaxed">
                        Manages the unified state: <strong className="text-emerald-500">SYSTEM_OPEN</strong> (Logins & Registrations allowed) vs <strong className="text-red-500">SYSTEM_LOCKED</strong> (Logins & Registrations frozen under an opaque overlay).
                      </p>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        onClick={() => onToggleSystemLock?.(!isSystemLocked)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isSystemLocked ? "bg-red-500" : "bg-emerald-500"
                        )}
                        role="switch"
                        aria-checked={isSystemLocked}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out",
                            isSystemLocked ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 2. Admin Login Access Toggle */}
                  <div className="p-5 bg-background border border-outline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isAdminLoginEnabled ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-on-background">Admin Login Access Toggle</h4>
                      </div>
                      <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider leading-relaxed">
                        Toggle platform-wide login permissions specifically for users with the <strong className="text-red-500">Admin</strong> role. When disabled, access points are blocked with an opaque guard overlay.
                      </p>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        onClick={() => onToggleAdminLogin?.(!isAdminLoginEnabled)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isAdminLoginEnabled ? "bg-primary" : "bg-outline"
                        )}
                        role="switch"
                        aria-checked={isAdminLoginEnabled}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out",
                            isAdminLoginEnabled ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 3. Disable Login Debug Menu */}
                  <div className="p-5 bg-background border border-outline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isLoginDebugDisabled ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-on-background">Login Debug Menu Access Toggle</h4>
                      </div>
                      <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider leading-relaxed">
                        Disable or hide the debug fast-login credentials menu widget on the public login and authenticator screens.
                      </p>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        onClick={() => {
                          onToggleLoginDebug?.(!isLoginDebugDisabled);
                          if (triggerToast) {
                            triggerToast(
                              !isLoginDebugDisabled 
                                ? "Public Login Debug menu has been disabled." 
                                : "Public Login Debug menu has been enabled.",
                              !isLoginDebugDisabled ? "warning" : "success"
                            );
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isLoginDebugDisabled ? "bg-red-500" : "bg-emerald-500"
                        )}
                        role="switch"
                        aria-checked={isLoginDebugDisabled}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out",
                            isLoginDebugDisabled ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 4. Global Test Mode (Demo Order Interceptor) */}
                  <div className="p-5 bg-background border border-outline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isTestMode ? "bg-amber-500 animate-pulse" : "bg-neutral-500")} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-on-background">Global Demo Test Mode</h4>
                      </div>
                      <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider leading-relaxed">
                        Enable Demonstration Test Mode. This intercepts simulated orders, bypassing real <strong className="text-amber-500">POS API integrations (GAAP POS sync)</strong> and <strong className="text-blue-500">Paystack/Stitch gateways</strong> to ensure flawless evaluation transactions.
                      </p>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        onClick={() => {
                          onToggleTestMode?.(!isTestMode);
                          if (triggerToast) {
                            triggerToast(
                              !isTestMode 
                                ? "Global Test Mode has been enabled. Demo Order Interceptor engaged." 
                                : "Global Test Mode has been disabled. Live gateway channels restored.",
                              !isTestMode ? "warning" : "success"
                            );
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isTestMode ? "bg-amber-500" : "bg-outline"
                        )}
                        role="switch"
                        aria-checked={isTestMode}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out",
                            isTestMode ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 5. Disable Patron Fast Track */}
                  <div className="p-5 bg-background border border-outline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isPatronFastTrackDisabled ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-on-background">Disable Patron Fast Track</h4>
                      </div>
                      <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider leading-relaxed">
                        When enabled, visitors will not be able to register as new patrons via the Fast Track portal selection screen on the login/landing page.
                      </p>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        onClick={() => {
                          onTogglePatronFastTrack?.(!isPatronFastTrackDisabled);
                          if (triggerToast) {
                            triggerToast(
                              !isPatronFastTrackDisabled 
                                ? "Patron Fast Track has been disabled on the login page." 
                                : "Patron Fast Track has been enabled on the login page.",
                              !isPatronFastTrackDisabled ? "warning" : "success"
                            );
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isPatronFastTrackDisabled ? "bg-red-500" : "bg-outline"
                        )}
                        role="switch"
                        aria-checked={isPatronFastTrackDisabled}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out",
                            isPatronFastTrackDisabled ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 6. Hide Auth Flow Selector */}
                  <div className="p-5 bg-background border border-outline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isAuthFlowSelectorHidden ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-on-background">Hide Auth Flow Selector Component</h4>
                      </div>
                      <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider leading-relaxed">
                        Completely hide the dynamic Operator/Patron tab selection component on the login/landing view.
                      </p>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        id="toggle-auth-flow-visibility-btn"
                        onClick={() => {
                          onToggleAuthFlowSelector?.(!isAuthFlowSelectorHidden);
                          if (triggerToast) {
                            triggerToast(
                              !isAuthFlowSelectorHidden 
                                ? "Auth Flow Selector component has been completely hidden." 
                                : "Auth Flow Selector component has been restored to view.",
                              !isAuthFlowSelectorHidden ? "warning" : "success"
                            );
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isAuthFlowSelectorHidden ? "bg-red-500" : "bg-outline"
                        )}
                        role="switch"
                        aria-checked={isAuthFlowSelectorHidden}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out",
                            isAuthFlowSelectorHidden ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Firebase Extensions Status Hub */}
                <div id="extension-hub" className="bg-surface-container border border-outline rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                        <Activity size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest">Extension Hub</h3>
                        <p className="text-xs text-on-surface-variant font-bold uppercase mt-1">Managed Firebase Extensions Infrastructure</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[8px] font-black uppercase tracking-widest leading-none">Healthy</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'Send Email', desc: 'Order Confirmations', status: 'Active', icon: Mail },
                      { name: 'Resize Images', desc: 'User & Venue Media', status: 'Active', icon: ImageIcon },
                      { name: 'Search Algolia', desc: 'Venue Discovery Index', status: 'Active', icon: Search },
                      { name: 'Stripe Payments', desc: 'Ticket & Order Clearing', status: 'Active', icon: Ticket }
                    ].map((ext) => (
                      <div key={ext.name} className="p-4 bg-background/50 border border-outline rounded-xl flex items-center justify-between group hover:border-primary transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                            <ext.icon size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-tight">{ext.name}</p>
                            <p className="text-[8px] font-bold text-on-surface-variant uppercase">{ext.desc}</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">{ext.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Strategy Decoder */}
                <div id="ai-decoder" className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={64} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-on-background">Strategic Decoder</h3>
                      <p className="text-xs text-primary font-bold uppercase mt-1">AI-Powered Revenue Intelligence</p>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed text-on-surface-variant">
                    GEMINI ANALYSIS: Suggesting 15% price increase on 'Premium Vodkas' for next weekend's high-traffic event based on historical conversion rates.
                  </p>
                  <button className="h-9 px-4 bg-primary text-black rounded-lg font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">
                    Execute Optimization
                  </button>
                </div>

                {/* User Approval Requests Card */}
                <div className="bg-surface-container border border-outline rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest">Pending User Approvals</h3>
                        <p className="text-xs text-on-surface-variant font-bold uppercase mt-1">Verification queue for managers & admins</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('verifications')}
                      className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                    >
                      View All <ArrowRight size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {isLoadingRequests ? (
                      <div className="py-8 flex flex-col items-center justify-center space-y-3">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">Reconciling identity mesh...</p>
                      </div>
                    ) : (
                      <>
                        {requests.filter(r => r.type === 'USER' && r.status === 'Pending').slice(0, 3).map((req, i) => (
                          <div key={`${req.id || 'req-user-pending'}-${i}`} className="bg-background/40 border border-outline rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline flex items-center justify-center font-black text-[10px] text-primary">
                                  {req.name.slice(0, 1)}
                               </div>
                               <div>
                                  <p className="font-black text-xs uppercase tracking-tight">{req.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[9px] font-bold text-on-surface-variant uppercase">{req.details?.role || 'USER'} • {req.email}</p>
                                    {req.details?.username && (
                                      <span className="text-[9px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded-full">@{req.details.username}</span>
                                    )}
                                  </div>
                               </div>
                            </div>
                            <button 
                              onClick={() => setActiveTab('verifications')}
                              className="h-8 w-8 rounded-lg border border-outline flex items-center justify-center hover:border-primary transition-all"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        ))}
                        {requests.filter(r => r.type === 'USER' && r.status === 'Pending').length === 0 && (
                          <div className="py-8 text-center border border-outline border-dashed rounded-xl">
                            <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">No pending user verifications</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div id="staff-performance" className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} className="text-primary" />
                    Team Efficiency Score
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'Kamohelo M.', role: 'Head Bartender', speed: '2.4m', rating: 4.9, status: 'Active' },
                      { name: 'Lerato S.', role: 'Senior Mixologist', speed: '3.1m', rating: 4.7, status: 'Active' }
                    ].map((staff) => (
                      <div key={staff.name} className="p-4 bg-surface-container border border-outline rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-xs text-primary">
                            {staff.name.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-tight">{staff.name}</p>
                            <p className="text-[8px] font-bold text-on-surface-variant uppercase">{staff.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-primary">Avg. {staff.speed}</p>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <span className="text-[8px] font-black text-on-background">★ {staff.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Store size={14} className="text-primary" />
                    Top Performing Venues
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center mb-4">                
                     <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sort By:</p>
                     <div className="flex gap-2">
                        <button onClick={() => setVenueSortOrder('alphabetical')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", venueSortOrder === 'alphabetical' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}>Name</button>
                        <button onClick={() => setVenueSortOrder('date')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", venueSortOrder === 'date' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}>Date</button>
                     </div>
                  </div>
                  {venues.sort((a,b) => {
                    if (venueSortOrder === 'alphabetical') return (a.name || '').localeCompare(b.name || '');
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  }).map((v, i) => (
                      <div key={`${v.id || v.name || 'top-v'}-${i}`} className="bg-surface-container border border-outline rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm">{v.name}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{v.orders} orders processed</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-500 text-sm">{v.revenue}</p>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-1",
                            v.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" : "bg-warning/10 text-warning"
                          )}>
                            {v.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'venues' && (
              <motion.div key="venues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {selectedVenues.length > 0 && (
                   <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between col-span-full">
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary">{selectedVenues.length} Venues Selected</p>
                     <div className="flex gap-2">
                        <button onClick={() => { setVenues(prev => prev.filter(v => !selectedVenues.includes(v.id))); setSelectedVenues([]); }} className="h-8 px-4 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Delete</button>
                        <button onClick={() => setSelectedVenues([])} className="h-8 px-4 bg-surface-container border border-outline rounded-lg text-[9px] font-black uppercase tracking-widest">Cancel</button>
                     </div>
                   </div>
                 )}
                 <div className="flex justify-between items-center bg-surface-container/50 p-4 rounded-2xl border border-outline border-dashed col-span-full">
                     <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sort By:</p>
                     <div className="flex gap-2">
                        <button onClick={() => setVenueSortOrder('alphabetical')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", venueSortOrder === 'alphabetical' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}>Name</button>
                        <button onClick={() => setVenueSortOrder('date')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", venueSortOrder === 'date' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}>Date</button>
                     </div>
                  </div>
                 {venues.sort((a, b) => {
                     if (venueSortOrder === 'alphabetical') return (a.name || '').localeCompare(b.name || '');
                     return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                 }).map((v, i) => (
                   <div key={`${v.id || 'venue'}-${i}`} className={cn("bg-surface-container border rounded-xl p-5 space-y-4", selectedVenues.includes(v.id) ? "border-primary bg-primary/5" : "border-outline")}>
                     <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                         <input type="checkbox" checked={selectedVenues.includes(v.id)} onChange={() => toggleVenueSelection(v.id)} className="w-4 h-4 rounded border-outline text-primary focus:ring-primary cursor-pointer"/>
                         <div>
                           <h4 className="font-black text-lg">{v.name}</h4>
                           <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Merchant ID: VEN-{v.name.slice(0,3).toUpperCase()}</p>
                         </div>
                       </div>
                       <MoreVertical size={18} className="text-on-surface-variant" />
                     </div>
                     <div className="grid grid-cols-2 gap-4 border-t border-outline pt-4">
                       <div>
                         <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Net Payout (95%)</p>
                         <p className="font-black text-emerald-500">{v.revenue}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Platform Fee (5%)</p>
                         <p className="font-black text-primary">R0</p>
                       </div>
                     </div>
                   </div>
                 ))}
               </motion.div>
             )}

            {activeTab === 'events' && (
               <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container/50 p-6 rounded-2xl border border-outline border-dashed">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Event Deployment</h4>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">Schedule new festivals and club nights</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                       <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-surface-container border border-outline rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary"
                      >
                        <option value="All">All Dates</option>
                        <option value="Today">Today</option>
                        <option value="Weekend">This Weekend</option>
                        <option value="Month">This Month</option>
                      </select>
                      <button 
                        onClick={() => setShowForm('event')}
                        className="flex-1 md:flex-none h-10 px-6 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} />
                        Create Event
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events
                      .filter(e => (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (e.venue || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((e, i) => (
                      <div key={`${e.id || 'event'}-${i}`} className="bg-surface-container border border-outline rounded-2xl p-5 space-y-4 group hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-lg uppercase tracking-tight">{e.title}</h4>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{e.type}</p>
                          </div>
                          <div className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                            e.status === 'Live' ? "bg-emerald-500/10 text-emerald-500" : "bg-on-surface-variant/10 text-on-surface-variant"
                          )}>
                            {e.status}
                          </div>
                                         <div className="space-y-3">
                           <div className="flex items-center gap-3 text-on-surface-variant">
                              <MapPin size={14} className="text-on-surface-variant/50" />
                              <span className="text-[11px] font-bold uppercase">{e.venue}</span>
                           </div>
                           <div className="flex items-center gap-3 text-on-surface-variant">
                              <Calendar size={14} className="text-on-surface-variant/50" />
                              <span className="text-[11px] font-bold uppercase">{e.date}</span>
                           </div>
                           <div className="flex items-center gap-3 text-on-surface-variant">
                              <Activity size={14} className="text-on-surface-variant/50" />
                              <span className="text-[11px] font-bold uppercase tracking-widest">{e.startTime} - {e.endTime}</span>
                           </div>
                        </div>          </div>

                        <div className="pt-4 border-t border-outline">
                          <div className="flex justify-between items-center mb-3">
                             <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Active Inventory</p>
                             <p className="text-[10px] font-black uppercase text-primary">{e.tickets} Sold</p>
                          </div>
                          <div className="w-full bg-background h-1.5 rounded-full overflow-hidden">
                             <div className="bg-primary h-full w-[65%]" />
                          </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                           <button 
                             onClick={() => setViewingEvent(e)}
                             className="flex-1 h-9 rounded-lg bg-surface-container-high border border-outline text-[8px] font-black uppercase tracking-widest hover:border-primary/50 transition-all"
                           >
                             Manage Inventory
                           </button>
                           <button className="h-9 w-9 flex items-center justify-center rounded-lg bg-surface-container-high border border-outline hover:text-red-500 transition-all">
                              <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
               </motion.div>
            )}

            {activeTab === 'vendors' && (
               <motion.div 
                 key="vendors"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-4"
               >
                 <div className="flex justify-between items-center bg-surface-container/50 p-4 rounded-2xl border border-outline border-dashed">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Vendor Management</h4>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">Register new service providers</p>
                    </div>
                    <button 
                      onClick={() => setShowOnboardingModal(true)}
                      className="h-10 px-6 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                      Onboard Partner
                    </button>
                 </div>

                 {selectedVendors.length > 0 && (
                   <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary">{selectedVendors.length} Vendors Selected</p>
                     <div className="flex gap-2">
                        <button 
                         onClick={() => handleBulkVendorAction('approve')}
                         className="h-8 px-4 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                       >
                         Approve
                       </button>
                       <button 
                         onClick={() => handleBulkVendorAction('suspend')}
                         className="h-8 px-4 bg-surface-container border border-outline rounded-lg text-[9px] font-black uppercase tracking-widest"
                       >
                         Suspend
                       </button>
                       <button 
                         onClick={() => handleBulkVendorAction('delete')}
                         className="h-8 px-4 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                       >
                         Delete
                       </button>
                       <button 
                         onClick={() => setSelectedVendors([])}
                         className="h-8 px-4 bg-surface-container border border-outline rounded-lg text-[9px] font-black uppercase tracking-widest"
                       >
                         Cancel
                       </button>
                     </div>
                   </div>
                 )}

                 {/* Vendor Filters */}
                 <div className="flex justify-between items-center py-2">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {vendorCategories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                          selectedCategory === cat ? "bg-primary text-on-primary border-primary" : "bg-surface-container text-on-surface-variant border-outline"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setVendorSortOrder('alphabetical')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", vendorSortOrder === 'alphabetical' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}>Name</button>
                       <button onClick={() => setVendorSortOrder('date')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", vendorSortOrder === 'date' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}>Date</button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors
                      .filter(v => 
                        (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (v.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (v.category || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .filter(v => selectedCategory === 'All' || v.category === selectedCategory)
                      .sort((a, b) => {
                         if (vendorSortOrder === 'alphabetical') return (a.name || '').localeCompare(b.name || '');
                         return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                      })
                      .map((v, i) => (
                      <div key={`${v.id || v.email || 'vendor'}-${i}`} className={cn(
                        "bg-surface-container border rounded-xl p-5 space-y-4 transition-all group relative",
                        selectedVendors.includes(v.email) ? "border-primary bg-primary/5" : "border-outline hover:border-primary/30"
                      )}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={selectedVendors.includes(v.email)}
                              onChange={() => toggleVendorSelection(v.email)}
                              className="w-4 h-4 rounded border-outline text-primary focus:ring-primary cursor-pointer"
                            />
                            <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center font-black text-primary">
                              {v.name.slice(0, 1)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                              v.status === 'Active' || v.status === 'Approved' ? "bg-emerald-500/10 text-emerald-500" : "bg-warning/10 text-warning"
                            )}>
                              {v.status}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-black text-lg uppercase tracking-tight">{v.name}</h4>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{v.category}</p>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Mail size={12} />
                          <span className="text-[10px] font-medium">{v.email}</span>
                        </div>
                        
                        {/* Management Detailed Box / Tooltip Area */}
                        <div className="bg-surface-container-high/40 rounded-xl p-3 border border-outline/50 space-y-2 group-hover:border-primary/20 transition-all">
                           <div className="flex items-center justify-between gap-4">
                              <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant">VAT Reg</span>
                              <span className="text-[8px] font-mono font-bold text-on-surface truncate">{v.vatNumber || 'ZA-PENDING'}</span>
                           </div>
                           <div className="flex items-center justify-between gap-4">
                              <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant">Phone</span>
                              <span className="text-[8px] font-bold text-on-surface">{v.phone || '+27 -- --- ----'}</span>
                           </div>
                           <div className="flex items-center justify-between pt-2 border-t border-outline/30">
                              <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant">Activity</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[7px] font-black uppercase text-on-surface">2h ago</span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="pt-4 border-t border-outline flex gap-2">
                           <button 
                             onClick={() => handleVendorStatusUpdate(v.email, 'Active')}
                             className="flex-1 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                           >
                             Approve
                           </button>
                           <button 
                             onClick={() => handleVendorStatusUpdate(v.email, 'Suspended')}
                             className="flex-1 h-9 rounded-lg bg-warning/10 text-warning text-[8px] font-black uppercase tracking-widest hover:bg-warning hover:text-white transition-all"
                           >
                             Suspend
                           </button>
                           <button 
                             onClick={() => handleDeleteVendor(v.email)}
                             className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                           >
                             <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
            )}

            {activeTab === 'users' && (
               <motion.div 
                 key="users"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-4"
               >
                 {selectedUsers.length > 0 && (
                   <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary">{selectedUsers.length} Users Selected</p>
                     <div className="flex gap-2">
                       <button 
                         onClick={() => handleBulkUserAction('suspend')}
                         className="h-8 px-4 bg-surface-container border border-outline rounded-lg text-[9px] font-black uppercase tracking-widest"
                       >
                         Suspend
                       </button>
                       <button 
                         onClick={() => handleBulkUserAction('delete')}
                         className="h-8 px-4 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                       >
                         Delete
                       </button>
                       <button 
                         onClick={() => setSelectedUsers([])}
                         className="h-8 px-4 bg-surface-container border border-outline rounded-lg text-[9px] font-black uppercase tracking-widest"
                       >
                         Cancel
                       </button>
                     </div>
                   </div>
                 )}
                 <div className="flex justify-between items-center mb-4">
                     <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sort By:</p>
                     <div className="flex gap-2">
                        <button 
                          onClick={scanForDuplicates}
                          className="h-8 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/20"
                        >
                          Scan Duplicates
                        </button>
                        <button 
                          onClick={() => setUserSortOrder('alphabetical')} 
                          className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", userSortOrder === 'alphabetical' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}
                        >
                          Name
                        </button>
                        <button 
                          onClick={() => setUserSortOrder('date')} 
                          className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all", userSortOrder === 'date' ? "bg-primary text-black border-primary" : "bg-surface-container border-outline")}
                        >
                          Date
                        </button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                   {users.filter(u => {
                     const name = (u.name || u.full_name || u.displayName || '').toLowerCase();
                     const email = (u.email || '').toLowerCase();
                     const query = searchQuery.toLowerCase();
                     return name.includes(query) || email.includes(query);
                   }).sort((a, b) => {
                      if (userSortOrder === 'alphabetical') {
                        const nameA = (a.name || a.full_name || a.displayName || '').toLowerCase();
                        const nameB = (b.name || b.full_name || b.displayName || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                      } else {
                        const timeA = new Date(a.joined || 0).getTime();
                        const timeB = new Date(b.joined || 0).getTime();
                        return timeB - timeA;
                      }
                    }).map((user, index) => {
                      const userName = user.name || user.full_name || user.displayName || 'Unnamed User';
                      const userId = user.uid || user.id || `user-id-${index}`;
                      return (
                      <div key={`${userId}-${index}`} className={cn(
                        "bg-surface-container border rounded-2xl p-4 flex items-center justify-between group transition-all",
                        selectedUsers.includes(userId) ? "border-primary bg-primary/5" : "border-outline hover:border-primary/30"
                      )}>
                        <div className="flex items-center gap-4">
                          <input 
                            type="checkbox" 
                            checked={selectedUsers.includes(userId)}
                            onChange={() => toggleUserSelection(userId)}
                            className="w-4 h-4 rounded border-outline text-primary focus:ring-primary"
                          />
                          <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline flex items-center justify-center overflow-hidden">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-[11px] font-black uppercase tracking-tight">{userName}</h4>
                              <span className={cn(
                                "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                                user.is_deleted ? "bg-red-500/20 text-red-500 border border-red-500/30" :
                                (user.status === 'Suspended' || user.status === 'SUSPENDED') ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                              )}>{user.is_deleted ? 'DELETED' : (user.status || 'Active')}</span>
                            </div>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <p className="text-[7px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Joined</p>
                            <p className="text-[9px] font-bold uppercase">{user.joined || 'Unknown'}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {/* User Impersonation Session Swapper */}
                             {!user.is_deleted && onImpersonateUser && (
                               <button 
                                 onClick={() => {
                                   onImpersonateUser(user);
                                   if (triggerToast) {
                                     triggerToast(`Entering session impersonation for ${userName}.`, "warning");
                                   }
                                 }}
                                 title="Impersonate user session in-memory"
                                 className="h-10 px-3 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 rounded-xl flex items-center gap-2 transition-all font-black text-[8px] uppercase tracking-widest"
                               >
                                 <Users size={12} />
                                 Impersonator
                               </button>
                             )}

                             {user.is_deleted ? (
                               <button 
                                 onClick={async () => {
                                   // Immediate transactional restoration!
                                   const previousUsers = [...users];
                                   try {
                                     const { runTransaction, ref } = await import('firebase/database');
                                     const { rtdb } = await import('../lib/firebase');
                                     const { doc, setDoc } = await import('firebase/firestore');
                                     const { db } = await import('../lib/firebase');

                                     await runTransaction(ref(rtdb, `users/${userId}`), (current) => {
                                       if (!current) return current;
                                       return { ...current, is_deleted: null, status: 'APPROVED' };
                                     });
                                     await setDoc(doc(db, 'users', userId), { is_deleted: null, status: 'APPROVED' }, { merge: true });

                                     setUsers(prev => prev.map(u => u.uid === userId ? { ...u, is_deleted: undefined, status: 'APPROVED' } : u));
                                     triggerToast?.(`Restored user directory payload for ${userName}.`, 'success');
                                     await writeAuditLog('USER_RESTORE', userId, { restored: userId });
                                   } catch (e: any) {
                                     setUsers(previousUsers);
                                     triggerToast?.(`Recovery failed during restore transaction: ${e.message}`, 'error');
                                   }
                                 }}
                                 className="h-10 px-4 bg-emerald-500 text-black font-black text-[8px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                               >
                                 Restore
                               </button>
                             ) : (
                               <>
                                 <button 
                                   onClick={() => {
                                     setEditingUser(user);
                                     setEditingUserRole(user.role || 'PATRON');
                                     setEditingUserPin('');
                                   }}
                                   title="Manage Role & Security"
                                   className="h-10 px-3 bg-surface-container-high border border-outline rounded-xl flex items-center gap-2 hover:border-primary transition-colors"
                                 >
                                   <span className="text-[8px] font-black uppercase tracking-widest text-primary">{user.role || 'PATRON'}</span>
                                   <Settings size={12} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                                 </button>
                                 <button 
                                   onClick={() => handleUserAction(userId, 'suspend')}
                                   className={cn(
                                     "w-10 h-10 rounded-xl flex items-center justify-center border border-outline transition-all",
                                     (user.status === 'Suspended' || user.status === 'SUSPENDED') ? "bg-red-500 text-white border-red-500" : "bg-surface-container-high hover:border-red-500/50"
                                   )}
                                 >
                                    <ShieldAlert size={16} />
                                 </button>
                                 <button 
                                   onClick={() => handleUserAction(userId, 'delete')}
                                   className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </>
                             )}
                          </div>
                        </div>
                      </div>
                   )})}
                 </div>
               </motion.div>
            )}

            {activeTab === 'verifications' && (
               <motion.div 
                 key="verifications"
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.98 }}
                 className="space-y-4"
               >
                 <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Pending Approvals</h3>
                       <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Destination: o3sharenet@gmail.com</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                          {requests.filter(r => r.status === 'Pending').length} Pending
                       </span>
                    </div>
                 </div>

                 {requests.filter(r => r.status === 'Pending').length === 0 ? (
                    <div className="bg-surface-container border border-outline rounded-[2.5rem] p-16 text-center space-y-6">
                       <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[2rem] mx-auto flex items-center justify-center">
                          <CheckCircle2 size={40} />
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-xl font-black uppercase tracking-tight">System Validated</h3>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-loose max-w-xs mx-auto">
                             All incoming user and business identities have been reconciled against our verification mesh.
                          </p>
                       </div>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {requests.filter(r => r.status === 'Pending').map((req, i) => (
                        <div key={`${req.id || 'req-pending'}-${i}`} className={cn(
                          "bg-surface-container border rounded-[2rem] overflow-hidden transition-all duration-500",
                          rejectingId === req.id ? "border-red-500/50 shadow-2xl shadow-red-500/5" : "border-outline hover:border-primary/30"
                        )}>
                           <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                              <div className="flex items-center gap-6">
                                 <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center text-on-primary shadow-xl relative",
                                    req.type === 'VENUE' ? "bg-primary" : 
                                    req.type === 'EVENT' ? "bg-purple-500" : 
                                    req.type === 'USER' ? "bg-emerald-500" : "bg-blue-500"
                                 )}>
                                    {req.type === 'VENUE' ? <Store size={28} /> : 
                                     req.type === 'EVENT' ? <Calendar size={28} /> : 
                                     req.type === 'USER' ? <Users size={28} /> : <Zap size={28} />}
                                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1 rounded-lg shadow-lg">
                                      <Clock size={12} />
                                    </div>
                                 </div>
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                      <h4 className="text-2xl font-black uppercase tracking-tight">{req.name}</h4>
                                      <span className="bg-yellow-500/10 text-yellow-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 border border-yellow-500/20">
                                         <Clock size={10} /> Pending
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <span className="text-[9px] font-black uppercase bg-white/5 border border-white/10 text-on-surface-variant px-2.5 py-1 rounded-lg">
                                          {req.type} ACTIVATION
                                       </span>
                                       <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">{req.timestamp}</span>
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-4 items-center">
                                 <div className="text-right hidden lg:block mr-4">
                                    <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Identity Vector</p>
                                    <p className="text-xs font-bold text-on-surface truncate max-w-[200px]">{req.email}</p>
                                 </div>
                                 
                                 {!rejectingId || rejectingId !== req.id ? (
                                   <div className="flex gap-3 animate-in fade-in slide-in-from-right-4">
                                      <button 
                                        onClick={() => handleAction(req.id, 'Rejected')}
                                        className="h-14 px-8 bg-surface-container-high border border-outline rounded-2xl flex items-center gap-3 hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                                      >
                                         <ThumbsDown size={18} className="text-on-surface-variant/40 group-hover:text-red-500 transition-colors" />
                                         <span className="text-[10px] font-black uppercase tracking-widest">Reject</span>
                                      </button>
                                      <button 
                                        onClick={() => handleAction(req.id, 'Approved')}
                                        className="h-14 px-8 bg-primary text-black rounded-2xl flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                      >
                                         <ThumbsUp size={18} />
                                         <span className="text-[10px] font-black uppercase tracking-widest">Approve</span>
                                      </button>
                                   </div>
                                 ) : (
                                   <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                                      <button 
                                        onClick={() => setRejectingId(null)}
                                        className="h-10 px-4 text-on-surface-variant hover:text-on-surface transition-colors"
                                      >
                                         <X size={20} />
                                      </button>
                                   </div>
                                 )}
                              </div>
                           </div>
                           
                           <AnimatePresence>
                             {rejectingId === req.id && (
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden bg-red-500/5 border-t border-red-500/20"
                               >
                                 <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                       <label className="text-[9px] font-black uppercase tracking-widest text-red-500 px-1">Rejection Reason Pipeline</label>
                                       <div className="relative">
                                          <textarea 
                                             placeholder="Specify compliance violation or missing documentation..."
                                             value={rejectionInput}
                                             onChange={(e) => setRejectionInput(e.target.value)}
                                             className="w-full bg-background border border-red-500/20 rounded-2xl p-6 text-sm font-bold min-h-[120px] outline-none focus:border-red-500/50 transition-all text-on-surface"
                                          />
                                          <div className="absolute top-4 right-4 text-red-500/30">
                                             <ShieldAlert size={24} />
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex justify-end">
                                       <button 
                                          onClick={submitRejection}
                                          disabled={!rejectionInput.trim()}
                                          className="h-12 px-10 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                                       >
                                          Confirm Rejection
                                       </button>
                                    </div>
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                           
                           {/* Details Mesh */}
                           <div className="bg-background/40 border-t border-outline px-8 py-5 flex gap-10 overflow-x-auto no-scrollbar">
                              {Object.entries(req.details).map(([key, val]) => (
                                 <div key={key} className="flex flex-col whitespace-nowrap space-y-1">
                                    <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest opacity-60 italic">{key}</span>
                                    <span className="text-[10px] font-bold uppercase text-on-surface tracking-tight">{String(val)}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                      ))}
                    </div>
                 )}

                 {/* Historical Log Section */}
                 <div className="mt-12 space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant px-2">Verification History</h3>
                    <div className="space-y-4">
                       {requests.filter(r => r.status !== 'Pending').slice(0, 5).map((req, i) => (
                         <div key={`${req.id || 'req-history'}-${i}`} className={cn(
                           "bg-surface-container/30 border rounded-3xl p-6 transition-all",
                           req.status === 'Approved' ? "border-emerald-500/20" : "border-red-500/20"
                         )}>
                           <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                                  req.status === 'Approved' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                               )}>
                                  {req.status === 'Approved' ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                               </div>
                               <div className="space-y-1">
                                  <p className="text-sm font-black uppercase tracking-tight">{req.name}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{req.timestamp}</span>
                                    <span className="text-[8px] font-bold text-on-surface-variant">•</span>
                                    <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{req.type}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                 "text-[9px] font-black uppercase px-4 py-1.5 rounded-full border flex items-center gap-2",
                                 req.status === 'Approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                              )}>
                                 {req.status === 'Approved' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                 {req.status}
                              </span>
                            </div>
                           </div>

                           {req.rejectionReason && (
                              <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl animate-in slide-in-from-top-2">
                                 <div className="flex items-start gap-3">
                                   <div className="mt-1">
                                     <AlertTriangle size={14} className="text-red-500" />
                                   </div>
                                   <div className="space-y-1">
                                     <p className="text-[9px] font-black uppercase text-red-500 tracking-[0.2em]">Compliance Rejection Reason</p>
                                     <p className="text-[11px] font-medium text-red-400/90 leading-relaxed italic">"{req.rejectionReason}"</p>
                                   </div>
                                 </div>
                              </div>
                           )}
                         </div>
                       ))}
                    </div>
                 </div>
               </motion.div>
            )}

            {activeTab === 'staff-gateway' && (
              <motion.div
                key="staff-gateway"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Gateway Hero Hub */}
                <div className="bg-gradient-to-r from-purple-950/20 via-surface-container to-purple-950/20 border border-purple-500/20 rounded-[2.5rem] p-8 md:p-12 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline/10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                          <Users size={20} className="animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">Staff Registration Gateway</h3>
                      </div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">
                        CENTRALIZED DISPATCH HUB FOR REAL-TIME BULK STAFF CREATION
                      </p>
                    </div>
                  </div>

                  {/* Batch Import Quick Copy-Paste Form */}
                  <div className="bg-background/40 border border-outline/10 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">Batch Quick-Load Matrix</h4>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Paste raw text entries to auto-populate rows rapidly</p>
                      </div>
                      <span className="text-[9px] font-mono tracking-wider opacity-60 text-zinc-400 hidden sm:inline">FORMAT: FIRST, LAST, ROLE, EMAIL, PHONE</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        value={bulkTextInput}
                        onChange={(e) => setBulkTextInput(e.target.value)}
                        placeholder="e.g.&#10;John, Doe, Bartender, john.doe@example.com, +27821112222&#10;Sarah, Smith, Waiter, sarah.s@example.com"
                        rows={2}
                        className="flex-1 bg-neutral-900 border border-outline/20 p-3 rounded-2xl text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 resize-y"
                      />
                      <button
                        onClick={parseBulkText}
                        disabled={isEnrolling}
                        className="sm:w-36 h-12 self-end bg-purple-500 hover:bg-purple-600 text-black font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
                      >
                        <Plus size={14} /> Parse Entries
                      </button>
                    </div>
                  </div>

                  {/* Operational Enrollment Matrix */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">Active Enrollment Roster ({enrollRows.length})</h4>
                      <button
                        onClick={() => setEnrollRows([...enrollRows, { id: 'row-' + Date.now(), firstName: '', lastName: '', role: 'BARTENDER', assignmentType: 'venue', assignmentId: '', email: '', phone: '' }])}
                        disabled={isEnrolling}
                        className="h-9 px-4 bg-surface-container-high hover:bg-surface-container-highest border border-outline/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Add Row
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
                      {enrollRows.map((row, idx) => (
                        <div key={`${row.id || 'enroll-row'}-${idx}`} className="bg-background/20 border border-outline/10 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative group">
                          
                          {/* Top-Right Index Badge */}
                          <div className="absolute top-2.5 right-3 text-[9px] font-black text-zinc-600 font-mono">
                            #0{idx + 1}
                          </div>

                          {/* First Name */}
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block">First Name</label>
                            <input
                              type="text"
                              value={row.firstName}
                              disabled={isEnrolling}
                              onChange={(e) => {
                                const updated = [...enrollRows];
                                updated[idx].firstName = e.target.value;
                                setEnrollRows(updated);
                              }}
                              placeholder="First"
                              className="w-full h-10 bg-neutral-950 border border-outline/25 p-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500/40 text-white"
                            />
                          </div>

                          {/* Last Name */}
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block">Last Name</label>
                            <input
                              type="text"
                              value={row.lastName}
                              disabled={isEnrolling}
                              onChange={(e) => {
                                const updated = [...enrollRows];
                                updated[idx].lastName = e.target.value;
                                setEnrollRows(updated);
                              }}
                              placeholder="Last"
                              className="w-full h-10 bg-neutral-950 border border-outline/25 p-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500/40 text-white"
                            />
                          </div>

                          {/* Role selector */}
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block">Assigned Role</label>
                            <select
                              value={row.role}
                              disabled={isEnrolling}
                              onChange={(e) => {
                                const updated = [...enrollRows];
                                updated[idx].role = e.target.value as any;
                                setEnrollRows(updated);
                              }}
                              className="w-full h-10 bg-neutral-950 border border-outline/25 p-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500/40 text-white"
                            >
                              <option value="BARTENDER">🍺 Bartender Crew</option>
                              <option value="WAITER">🏃‍♂️ Waiter Server</option>
                              <option value="MANAGER">💼 Venue Manager</option>
                              <option value="EVENT_MANAGER">🎪 Event Manager</option>
                            </select>
                          </div>

                          {/* Assignment Type Toggle & selector */}
                          <div className="md:col-span-4 grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4 space-y-1">
                              <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block">Mapping</label>
                              <select
                                value={row.assignmentType}
                                disabled={isEnrolling}
                                onChange={(e) => {
                                  const updated = [...enrollRows];
                                  updated[idx].assignmentType = e.target.value as 'venue' | 'event';
                                  updated[idx].assignmentId = ''; // default clear
                                  setEnrollRows(updated);
                                }}
                                className="w-full h-10 bg-neutral-950 border border-outline/25 p-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500/40 text-white text-center"
                              >
                                <option value="venue">Venue</option>
                                <option value="event">Event</option>
                              </select>
                            </div>

                            <div className="col-span-8 space-y-1">
                              <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block">Venue / Event Assignment</label>
                              <select
                                value={row.assignmentId}
                                disabled={isEnrolling}
                                onChange={(e) => {
                                  const updated = [...enrollRows];
                                  updated[idx].assignmentId = e.target.value;
                                  setEnrollRows(updated);
                                }}
                                className="w-full h-10 bg-neutral-950 border border-outline/25 p-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500/40 text-white"
                              >
                                <option value="">Unassigned (Global)</option>
                                {row.assignmentType === 'venue' ? (
                                  <>
                                    {realVenues.map((v, i) => (
                                      <option key={`${v.id || 'venue'}-${i}`} value={v.id}>{v.name}</option>
                                    ))}
                                    {realVenues.length === 0 && venues.map((v, i) => (
                                      <option key={v.id || v.name || `venue-fallback-${i}`} value={v.name}>{v.name}</option>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {realEvents.map((e, i) => (
                                      <option key={`${e.id || 'event'}-${i}`} value={e.id}>{e.title}</option>
                                    ))}
                                    {realEvents.length === 0 && events.map((e, i) => (
                                      <option key={e.id || e.title || `event-fallback-${i}`} value={e.title}>{e.title}</option>
                                    ))}
                                  </>
                                )}
                              </select>
                            </div>
                          </div>

                          {/* Delete Row Selector */}
                          <div className="md:col-span-1 space-y-1 self-end flex justify-end">
                            <button
                              onClick={() => {
                                if (enrollRows.length === 1) return;
                                setEnrollRows(enrollRows.filter((_, i) => i !== idx));
                              }}
                              disabled={isEnrolling}
                              className="w-10 h-10 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 flex items-center justify-center transition-all active:scale-95"
                              title="Delete row"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Submit Section */}
                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline/10">
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Ensure correct details are inputted before enrollment. PINs are system-generated and masked.</p>
                      </div>

                      <button
                        onClick={submitBulkEnrollment}
                        disabled={isEnrolling || enrollRows.some(r => !r.firstName.trim() || !r.lastName.trim())}
                        className={cn(
                          "w-full sm:w-auto px-8 h-12 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest text-black shadow-lg",
                          isEnrolling 
                            ? "bg-purple-500/40 cursor-not-allowed text-purple-950/50" 
                            : "bg-purple-500 hover:bg-purple-600 active:scale-95 text-black shadow-purple-500/10"
                        )}
                      >
                        {isEnrolling ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Processing Entry {currentEnrollIndex + 1}...
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Process Bulk Enrollment
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Enrollment Results Portal (Manifest Output) */}
                  {enrollmentResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 border border-purple-500/30 p-8 rounded-3xl bg-neutral-950 space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-outline/10">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black uppercase text-purple-400 tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            WAYTA Staff Credentials Manifest
                          </h4>
                          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                            These credentials will not be displayed again. Download or copy immediately for secure distribution.
                          </p>
                        </div>
                        <button
                          onClick={downloadCredentialsTxt}
                          className="h-9 px-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <FileText size={14} /> Download (.TXT)
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {enrollmentResults.map((res, index) => (
                          <div key={`${res.name}-${res.role}-${index}`} className={cn(
                            "border p-4 rounded-2xl flex flex-col justify-between space-y-3 relative overflow-hidden",
                            res.success ? "bg-purple-950/10 border-purple-500/20" : "bg-red-950/13 border-red-500/20"
                          )}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-semibold text-xs text-white uppercase">{res.name}</h5>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-400 bg-zinc-800/55 px-2 py-0.5 rounded block w-fit mt-1">
                                  {res.role} • {res.assignment}
                                </span>
                              </div>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                                res.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              )}>
                                {res.success ? 'SUCCESS' : 'FAILED'}
                              </span>
                            </div>

                            {res.success ? (
                              <div className="bg-neutral-900/60 p-3 rounded-xl border border-outline/10 space-y-2 font-mono text-[11px] select-text">
                                <div className="flex items-center justify-between text-zinc-300">
                                  <span>Username:</span>
                                  <span className="font-bold text-white selection:bg-purple-500/30">{res.username}</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-300">
                                  <span>Service PIN:</span>
                                  <span className="font-bold text-purple-400 font-bold selection:bg-purple-500/30">{res.pin}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-red-400/90 font-medium italic mt-2">Error: {res.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                </div>
              </motion.div>
            )}

            {activeTab === 'identity' && (
              <motion.div
                key="identity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-surface-container border border-outline rounded-[2.5rem] p-12 space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                             <Users size={20} />
                          </div>
                          <h3 className="text-2xl font-black uppercase tracking-tight">Identity Nexus</h3>
                       </div>
                       <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Switch your active profile role for ecosystem simulation</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-high px-4 py-2 rounded-xl border border-outline">
                          Current: {localStorage.getItem('user_role') || 'ADMIN'}
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {roles.map((r) => {
                      const isActive = user?.role === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => !isProcessingRole && handleRoleChange(r.id)}
                          disabled={isProcessingRole}
                          className={cn(
                            "group p-6 rounded-[2rem] border-2 transition-all duration-300 relative overflow-hidden",
                            isActive 
                              ? "bg-primary border-primary text-black shadow-xl shadow-primary/20 scale-[1.02]" 
                              : "bg-background border-outline text-on-surface hover:border-primary/50"
                          )}
                        >
                          {isActive && (
                            <motion.div 
                              layoutId="active-glow"
                              className="absolute inset-0 bg-white/20 blur-xl animate-pulse"
                            />
                          )}
                          
                          <div className="relative z-10 space-y-4">
                             <div className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                               isActive ? "bg-black/10" : "bg-primary/10 text-primary group-hover:scale-110"
                             )}>
                               <r.icon size={28} />
                             </div>
                             <div className="text-left">
                               <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">{r.label}</p>
                               <p className={cn(
                                 "text-[9px] font-bold uppercase tracking-widest opacity-60",
                                 isActive ? "text-black" : "text-on-surface-variant"
                               )}>
                                 {r.id === 'ADMIN' ? 'System Superuser' : r.id === 'PATRON' ? 'Consumer Node' : 'Partner Access'}
                               </p>
                             </div>
                          </div>
                          
                          {isActive && (
                             <div className="absolute top-4 right-4">
                               <CheckCircle2 size={16} />
                             </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-8 border-t border-error/20">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error border border-error/20">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                         <h4 className="text-sm font-black uppercase tracking-widest text-error">Danger Zone</h4>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Irreversible infrastructure operations</p>
                      </div>
                    </div>

                    <div className="bg-error/5 border border-error/20 rounded-3xl p-8 space-y-4">
                      <div>
                        <p className="text-xs font-black uppercase text-error tracking-tight">Factory Reset Database</p>
                        <p className="text-[11px] font-medium text-on-surface-variant mt-1 leading-relaxed">
                          This will permanently delete all users, onboarding requests, orders, and transactions. This action cannot be undone. All active sessions will be terminated.
                        </p>
                      </div>
                      
                      <button 
                        onClick={async () => {
                          if (!window.confirm('CRITICAL: ARE YOU ABSOLUTELY SURE? This will delete ALL user data and requests.')) return;
                          if (!window.confirm('SECOND VERIFICATION: This cannot be reversed. Click OK to initiate final wipe.')) return;
                          
                          try {
                            setIsProcessingRole(true);
                            const response = await fetch('/api/admin/reset-database', { method: 'POST' });
                            if (response.ok) {
                              alert('Database Wiped. Refreshing application...');
                              window.location.reload();
                            } else {
                              throw new Error('Reset failed');
                            }
                          } catch (err) {
                            alert('Reset failed: ' + (err as Error).message);
                          } finally {
                            setIsProcessingRole(false);
                          }
                        }}
                        disabled={isProcessingRole}
                        className="h-12 px-8 bg-error text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-error/20 active:scale-95 transition-all flex items-center gap-2 hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                        Initiate Global Wipe
                      </button>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded-[1.5rem] p-6 flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-primary text-black flex items-center justify-center shrink-0">
                       <Zap size={24} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">State Synchronicity</h4>
                      <p className="text-xs font-medium text-primary/80 leading-relaxed">
                        Role transitions are committed to the secure mesh instantly. The application top bar and primary layout will adapt to your new identity parameters without requiring a logout.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Onboarding Modals */}
      <AnimatePresence>
        {showOnboardingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pb-24">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOnboardingModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-surface-container border border-outline rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-outline bg-surface-container-high/50">
                <h3 className="text-lg font-black uppercase tracking-tight text-on-background">Manual Partner Setup</h3>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Add details for business verification</p>
              </div>
              
              <form onSubmit={handleOnboardVendor} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Vendor Name</label>
                  <input name="name" required className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" placeholder="e.g. Electric Spirits" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Category</label>
                    <select name="category" required className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none text-on-surface">
                      {vendorCategories.slice(1).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Initial Status</label>
                    <select name="status" className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none text-emerald-500 font-bold">
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Email</label>
                  <input name="email" type="email" required className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" placeholder="ops@vendor.co.za" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">VAT Number</label>
                    <input name="vatNumber" required className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" placeholder="4XXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Phone</label>
                    <input name="phone" required className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" placeholder="+27 ..." />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowOnboardingModal(false)}
                    className="flex-1 h-12 rounded-xl bg-surface-container-high border border-outline text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all text-on-surface"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 h-12 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    Complete Setup
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Existing Onboarding Forms Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowForm(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container border border-outline rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              {/* Sidebar Info */}
              <div className="bg-primary p-12 text-on-primary flex flex-col justify-between md:w-1/3">
                 <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Onboarding</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Tier 1 Verification</p>
                 </div>
                 <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                       <ShieldCheck className="shrink-0" size={24} />
                       <p className="text-[11px] font-bold leading-relaxed uppercase opacity-80">Compliance verified via POPIA South Africa standards.</p>
                    </div>
                    <div className="flex gap-4 items-start">
                       <TrendingUp className="shrink-0" size={24} />
                       <p className="text-[11px] font-bold leading-relaxed uppercase opacity-80">KYC check automatically initiated on submission.</p>
                    </div>
                 </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[80vh] md:max-h-none">
                {showSuccess ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Onboarding Initiated</h3>
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">Entry added to pending verification queue.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleOnboard} className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-black uppercase tracking-tight">New {showForm}</h3>
                      <button type="button" onClick={() => setShowForm(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Legal Name</label>
                          <div className={cn("relative", formErrors.legalName && "animate-shake")}>
                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                            <input name="legalName" required type="text" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.legalName && "border-red-500")} placeholder="e.g. Cape Town Stadium" />
                            {formErrors.legalName && <span className="absolute -bottom-4 left-1 text-[8px] font-black text-red-500 uppercase tracking-widest">Required</span>}
                          </div>
                       </div>
                       
                       {showForm === 'vendor' ? (
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Specialized Category</label>
                            <select name="category" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none">
                               {vendorCategories.slice(1).map(cat => (
                                 <option key={cat} value={cat}>{cat}</option>
                               ))}
                            </select>
                         </div>
                       ) : (
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Location / Venue ID</label>
                            <div className={cn("relative", formErrors.location && "animate-shake")}>
                              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                              <input name="location" required type="text" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.location && "border-red-500")} placeholder="e.g. Green Point, CT" />
                            </div>
                         </div>
                       )}
                    </div>

                    {showForm === 'venue' && (
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Global Capacity</label>
                             <div className={cn("relative", formErrors.capacity && "animate-shake")}>
                               <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                               <input name="capacity" required type="number" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.capacity && "border-red-500")} placeholder="e.g. 15000" />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">VIP Allocation</label>
                             <div className={cn("relative", formErrors.vipCapacity && "animate-shake")}>
                               <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                               <input name="vipCapacity" required type="number" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.vipCapacity && "border-red-500")} placeholder="e.g. 500" />
                             </div>
                          </div>
                          <div className="col-span-2 space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Liquor License / Permit #</label>
                             <div className={cn("relative", formErrors.license && "animate-shake")}>
                               <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                               <input name="license" required type="text" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.license && "border-red-500")} placeholder="LL-XXXX-2024" />
                             </div>
                          </div>
                       </div>
                    )}

                    {showForm === 'vendor' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">VAT Number (SA)</label>
                             <div className={cn("relative", formErrors.vatNumber && "animate-shake")}>
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                <input name="vatNumber" required type="text" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.vatNumber && "border-red-500")} placeholder="4XXXXXXXXX" />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Phone</label>
                             <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                <input name="phone" required type="tel" className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" placeholder="+27 ..." />
                             </div>
                          </div>
                       </div>
                    )}

                    {showForm === 'event' && (
                       <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Title</label>
                               <input name="title" required className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" placeholder="e.g. Neon Nights Festival" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Type</label>
                               <select name="type" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none text-on-surface">
                                  <option value="Festival">Music Festival</option>
                                  <option value="Club Night">Club Night / Event</option>
                                  <option value="Concert">Live Concert</option>
                                  <option value="Pop-up">Pop-up / Activation</option>
                               </select>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Date</label>
                               <input name="date" type="date" required className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Start Time</label>
                               <input name="startTime" type="time" required className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">End Time</label>
                               <input name="endTime" type="time" required className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue Partner</label>
                               <select name="venue" required className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none text-on-surface">
                                  {venues.map((v, i) => <option key={v.id || `${v.name}-${i}`} value={v.name}>{v.name}</option>)}
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Total Capacity</label>
                               <input name="tickets" type="number" required className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors text-on-surface" placeholder="e.g. 5000" />
                            </div>
                         </div>

                         <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Ticket Categories JSON (Optional)</label>
                            <textarea 
                              name="ticketTypes" 
                              className="w-full bg-background border border-outline rounded-2xl p-4 font-mono text-xs outline-none focus:border-primary transition-colors resize-none text-on-surface"
                              defaultValue='[{"name": "GA", "price": 350, "count": 1000}, {"name": "VIP", "price": 850, "count": 200}]'
                              rows={3}
                            />
                            <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Advanced: Define ticket tiers for deployment</p>
                         </div>
                       </div>
                    )}

                    {showForm === 'vendor' && (
                       <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">VAT / Tax Number</label>
                                <div className={cn("relative", formErrors.vatNumber && "animate-shake")}>
                                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                  <input name="vatNumber" required type="text" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.vatNumber && "border-red-500")} placeholder="4XXXXXXXXX" />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Health Permit #</label>
                                <div className={cn("relative", formErrors.healthPermit && "animate-shake")}>
                                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                  <input name="healthPermit" required type="text" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.healthPermit && "border-red-500")} placeholder="HP-2024-XXXX" />
                                </div>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Peak Power Consumption (kW)</label>
                             <div className={cn("relative", formErrors.power && "animate-shake")}>
                               <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                               <input name="power" required type="number" step="0.1" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.power && "border-red-500")} placeholder="e.g. 4.5" />
                             </div>
                          </div>
                       </div>
                    )}

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Primary Owner Email</label>
                       <div className={cn("relative", formErrors.email && "animate-shake")}>
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                         <input name="email" required type="email" className={cn("w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors", formErrors.email && "border-red-500")} placeholder="owner@entity.co.za" />
                         {formErrors.email && <span className="absolute -bottom-4 left-1 text-[8px] font-black text-red-500 uppercase tracking-widest">{formErrors.email}</span>}
                       </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button 
                         type="button" 
                         onClick={() => !isSubmitting && setShowForm(null)}
                         className="flex-1 h-14 bg-surface-container-high rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-transform"
                       >
                         Cancel
                       </button>
                       <button 
                         type="submit" 
                         disabled={isSubmitting}
                         className="flex-[2] h-14 bg-primary text-on-primary rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                       >
                         {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                         ) : (
                            <>
                              <Plus size={18} />
                              Onboard {showForm}
                            </>
                         )}
                       </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      {/* Double-Step Destructive Safety Authorization confirmation modal */}
      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmingAction(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            className="relative bg-[#121214] border border-red-500/20 rounded-[2.5rem] w-full max-w-lg p-10 overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-red-500">
                <ShieldAlert size={32} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#F97316]">DESTRUCTIVE GATEWAY LIMIT</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Dual-Step Administrative Authorization Required</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-gray-300 space-y-2">
                <p className="text-xs font-black uppercase text-red-400 tracking-wider">CRITICAL SYSTEM DIRECTIVE WARNING</p>
                <p className="text-[11px] font-medium leading-relaxed uppercase tracking-wide text-gray-400">
                  You are about to issue a global registry modification: <span className="text-white font-black">{confirmingAction.action.toUpperCase()}</span> on the active profile of <span className="text-white font-black">{confirmingAction.userName}</span> ({confirmingAction.userEmail}).
                </p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                  Soft-deletions freeze authentication access but preserve directories. Suspensions immediately toggle real-time payment privileges.
                </p>
              </div>

              {/* Step 1 checkbox */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">STEP 1: CONFIRM ACKNOWLEDGEMENT</label>
                <label className="flex items-start gap-3 p-4 bg-surface-container-high/40 border border-outline rounded-2xl cursor-pointer hover:border-outline-variant transition-colors group">
                  <input 
                    type="checkbox"
                    checked={doubleCheckConfirmed}
                    onChange={(e) => setDoubleCheckConfirmed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-outline text-red-500 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-300 group-hover:text-white transition-colors">I acknowledge and authorize this action</span>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">This action alters production data indices and propagates across all connected terminals.</p>
                  </div>
                </label>
              </div>

              {/* Step 2 input verification */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">
                  STEP 2: ENFORCE TEXT VERIFICATION (TYPE EXACT USER EMAIL)
                </label>
                <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col gap-1">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest">User Email Prompt Match: <span className="font-mono text-white text-[10px] font-bold lowercase">{confirmingAction.userEmail}</span></p>
                  <input 
                    type="text"
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    placeholder="Enter target email to verify"
                    className="w-full bg-transparent border-0 outline-none text-white font-mono text-xs p-1 tracking-wider outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setConfirmingAction(null)}
                  className="flex-1 h-14 bg-surface-container-high rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-transform"
                >
                  ABORT COMMAND
                </button>
                <button 
                  type="button"
                  disabled={!doubleCheckConfirmed || confirmInputText.trim().toLowerCase() !== confirmingAction.userEmail.trim().toLowerCase()}
                  onClick={async () => {
                    const uid = confirmingAction.uid;
                    const act = confirmingAction.action;
                    setConfirmingAction(null);
                    await executeConfirmedUserAction(uid, act as any);
                  }}
                  className="flex-[2] h-14 bg-red-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  VERIFY & EXECUTE SIGN REGISTRY
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      </AnimatePresence>
    </div>
  );
};
