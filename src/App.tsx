/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { 
  ExploreView, 
  OnboardingView, 
  AuthView, 
  VenueDetailsView, 
  BudgetView, 
  SafetyView, 
  ManagerDashboardView, 
  ProfileView,
  OrderTrackingView,
  AdminDashboardView,
  AdminSuperDashboardView,
  BusinessOnboardingView,
  OrdersView,
  WorkflowView,
  PartnerDashboardView,
  WaytaMenu,
  WaytaCheckout,
  StaffDashboardView,
  EventManagerDashboardView,
  EventAdminDashboardView,
  WaiterDashboardView,
  VendorDashboardView,
  PaymentAuthorizationView,
  PaymentNotificationView,
  PatronEventView,
  PublicEventsView,
  PublicEventDetailView,
  TicketsView,
  AuditHubView,
  QuickTourSandboxView
} from './views';
import { QRScanner } from './components/QRScanner';
import { BottomNav } from './components/BottomNav';
import { TopBar } from './components/TopBar';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import onboardingSteps from './data/onboardingSteps.json';
import { StaffCredentialsOverlay } from './components/onboarding/StaffCredentialsOverlay';
import { VenueConfirmationOverlay } from './components/onboarding/VenueConfirmationOverlay';
import { ServiceStaffFAB } from './components/ServiceStaffFAB';
import { AdminFAB } from './components/AdminFAB';
import { 
  HelpCircle,
  Lock,
  X,
  AlertTriangle,
  Info,
  Compass,
  ShoppingBag,
  User as UserIcon,
  Ticket as TicketIcon,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Venue, Order, Transaction, User, UserRole, Event, Ticket } from './types';
import { cn } from './lib/utils';
import { offlineCache } from './services/offlineCache';
import { auth, rtdb, db, doc, onSnapshot, collection, query, where } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { validateFirebaseUser } from './lib/authValidator';
import { ref, onValue } from 'firebase/database';
import { syncUserProfile, updateUserProfile } from './services/authService';
import { venueService } from './services/venueService';
import { orderService } from './services/orderService';
import { eventService } from './services/eventService';
import { transactionService } from './services/transactionService';

import { useOnboarding } from './contexts/OnboardingContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProfileCompletionModal } from './components/modals/ProfileCompletionModal';
import { PersonaOnboardingOverlay } from './components/PersonaOnboardingOverlay';
import { PatronIntro } from './components/roles/PatronIntro';
import { BartenderIntro } from './components/roles/BartenderIntro';
import { ManagerIntro } from './components/roles/ManagerIntro';
import { EventManagerIntro } from './components/roles/EventManagerIntro';
import { VendorIntro } from './components/roles/VendorIntro';

import { OnboardingPortal } from './components/onboarding/OnboardingPortal';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { useWebNotifications } from './hooks/useWebNotifications';
import { AdminLoginOverlay } from './components/AdminLoginOverlay';

// Seed templates on mount
import { seedEmailTemplates } from './services/seedData';
import { useDynamicTheme } from './contexts/DynamicThemeContext';

export default function App() {
  const { setVenue, setEvent, themeMode, toggleThemeMode } = useDynamicTheme();
  useWebNotifications();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('impersonated_user');
      return u ? JSON.parse(u) : null;
    }
    return null;
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const activeUser = impersonatedUser || currentUser;
  const [showScanner, setShowScanner] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [view, setView] = useState<'onboarding' | 'auth' | 'explore' | 'venue' | 'budget' | 'safety' | 'manager' | 'profile' | 'tracking' | 'admin' | 'admin-super' | 'business-onboarding' | 'onboarding-new' | 'orders' | 'tickets' | 'workflow' | 'wayta-menu' | 'wayta-checkout' | 'staff-dashboard' | 'event-dashboard' | 'event-admin-dashboard' | 'waiter-dashboard' | 'vendor-dashboard' | 'payment-authorization' | 'payment-notification' | 'patron-event' | 'public-events' | 'public-event-detail' | 'audit' | 'quick-tour'>('auth');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<{ view: any, eventId?: string } | null>(null);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);

  const [viewHistory, setViewHistory] = useState<string[]>([]);
  const isBackNavigatingRef = useRef(false);

  useEffect(() => {
    if (isBackNavigatingRef.current) {
      isBackNavigatingRef.current = false;
      return;
    }
    setViewHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === view) {
        return prev;
      }
      return [...prev, view];
    });
  }, [view]);

  const handleNavigateBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop(); // remove current
      const prevView = newHistory.pop(); // get previous
      if (prevView) {
        isBackNavigatingRef.current = true;
        setViewHistory([...newHistory, prevView]);
        setView(prevView as any);
        return;
      }
    }
    setView('explore');
  };

  useEffect(() => {
    // Strip the deploy base (e.g. /wayta-ai-studio/ on GitHub Pages) so the
    // deep-link checks below work regardless of where the bundle is hosted.
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const rawPath = window.location.pathname;
    const path = base && rawPath.startsWith(base) ? rawPath.slice(base.length) || '/' : rawPath;
    if (path === '/payment-authorization.html') {
      setView('payment-authorization');
    } else if (path === '/payment-success' || path === '/payment-notification') {
      setView('payment-notification');
    } else if (path === '/payment-failed') {
      setView('payment-notification');
    } else if (path === '/order-tracking') {
      setView('orders');
    } else if (path === '/onboarding') {
      setView('onboarding');
    }
  }, []);

  const [isBrowserOffline, setIsBrowserOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOffline(false);
      triggerToast("Network Restored: Dual-synchronizing systems in the background.", "success");
    };
    const handleOffline = () => {
      setIsBrowserOffline(true);
      triggerToast("Connectivity Shifted: Wayta Offline Grid engaged. Active tasks are locally secured.", "warning");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isCurrentlyOffline = isSimulatedOffline || isBrowserOffline;

  useEffect(() => {
    localStorage.setItem('wayta_simulated_offline', String(isSimulatedOffline));
    window.dispatchEvent(new window.Event('wayta_offline_orders_changed'));
  }, [isSimulatedOffline]);

  useEffect(() => {
    if (!isCurrentlyOffline) {
      console.log('[DEBUG] System registered ONLINE. Triggering sync of offline cached orders...');
      orderService.syncOfflineOrders().catch(err => {
        console.error('Failed to auto sync offline orders:', err);
      });
    }
  }, [isCurrentlyOffline]);

  useEffect(() => {
    // Seed templates on mount - ignore errors as this is a background task that requires admin perms for write
    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF' || currentUser?.uid?.startsWith('staff-')) {
      seedEmailTemplates().catch(err => {
        console.warn("Seeding templates skipped or failed:", err.message);
      });
    }
  }, [currentUser]);

  const [showPatronFloatingNav, setShowPatronFloatingNav] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowPatronFloatingNav(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [isBartenderEnabled, setIsBartenderEnabled] = useState(true);
  const [isAdminLoginEnabled, setIsAdminLoginEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isAdminLoginEnabled');
    return saved !== 'false';
  });

  const handleToggleAdminLogin = (value: boolean) => {
    setIsAdminLoginEnabled(value);
    localStorage.setItem('isAdminLoginEnabled', String(value));
  };

  const [isSystemLocked, setIsSystemLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem('isSystemLocked');
    return saved === 'true';
  });

  const handleToggleSystemLock = (value: boolean) => {
    setIsSystemLocked(value);
    localStorage.setItem('isSystemLocked', String(value));
  };

  const [isLoginDebugDisabled, setIsLoginDebugDisabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isLoginDebugDisabled');
    return saved === 'true';
  });

  const handleToggleLoginDebug = (value: boolean) => {
    setIsLoginDebugDisabled(value);
    localStorage.setItem('isLoginDebugDisabled', String(value));
  };

  const [isPatronFastTrackDisabled, setIsPatronFastTrackDisabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isPatronFastTrackDisabled');
    // Default to true as currently disabled, or allow toggling
    return saved !== 'false';
  });

  const handleTogglePatronFastTrack = (value: boolean) => {
    setIsPatronFastTrackDisabled(value);
    localStorage.setItem('isPatronFastTrackDisabled', String(value));
  };

  const [isAuthFlowSelectorHidden, setIsAuthFlowSelectorHidden] = useState<boolean>(() => {
    const saved = localStorage.getItem('isAuthFlowSelectorHidden');
    return saved === 'true';
  });

  const handleToggleAuthFlowSelector = (value: boolean) => {
    setIsAuthFlowSelectorHidden(value);
    localStorage.setItem('isAuthFlowSelectorHidden', String(value));
  };

  const [isTestMode, setIsTestMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isTestMode');
    if (saved === 'true') {
      sessionStorage.setItem('is_test_mode', 'true');
    } else {
      sessionStorage.removeItem('is_test_mode');
    }
    return saved === 'true';
  });

  const handleToggleTestMode = async (value: boolean) => {
    setIsTestMode(value);
    localStorage.setItem('isTestMode', String(value));
    if (value) {
      sessionStorage.setItem('is_test_mode', 'true');
    } else {
      sessionStorage.removeItem('is_test_mode');
    }
    window.dispatchEvent(new CustomEvent('WAYTA_TEST_MODE_CHANGED', { detail: { enabled: value } }));
    try {
      await fetch('/api/admin/toggle-test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: value })
      });
    } catch (err) {
      console.error("Failed to sync Test Mode with backend", err);
    }
  };

  useEffect(() => {
    if (isTestMode) {
      sessionStorage.setItem('is_test_mode', 'true');
    } else {
      sessionStorage.removeItem('is_test_mode');
    }
    window.dispatchEvent(new CustomEvent('WAYTA_TEST_MODE_CHANGED', { detail: { enabled: isTestMode } }));
    fetch('/api/admin/toggle-test-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: isTestMode })
    }).catch(err => console.error("Initial Test Mode sync with backend failed", err));
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (message: string, type: 'error' | 'warning' | 'info' | 'success' = 'warning') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    setToastType(type);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 5500);
  };

  // Listen for WebSocket Test Mode broadcasts globally to trigger UI Toasts
  useEffect(() => {
    if (!isTestMode) return;

    const handleOrderSyncGlobal = (e: any) => {
      const detail = e.detail;
      triggerToast(
        `🛎️ NPC Order received from ${detail.customer_name}: ${detail.items}`,
        'success'
      );
    };

    const handleStatusSyncGlobal = (e: any) => {
      const detail = e.detail;
      const cleanId = detail.orderId && detail.orderId.startsWith('sim-') ? detail.orderId.substring(4) : detail.orderId;
      triggerToast(
        `🍹 Sim order #${cleanId} for ${detail.customer_name} status matches '${detail.status.toUpperCase()}'!`,
        'success'
      );
    };

    window.addEventListener('WAYTA_ORDER_SUBMITTED', handleOrderSyncGlobal as any);
    window.addEventListener('WAYTA_STATUS_UPDATED', handleStatusSyncGlobal as any);

    return () => {
      window.removeEventListener('WAYTA_ORDER_SUBMITTED', handleOrderSyncGlobal as any);
      window.removeEventListener('WAYTA_STATUS_UPDATED', handleStatusSyncGlobal as any);
    };
  }, [isTestMode]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Global View/Role Authorization Protection & Lockout Redirection Guard
  useEffect(() => {
    if (!currentUser) {
      const protectedViews = [
        'admin', 'admin-super', 'manager', 'workflow', 'profile', 
        'staff-dashboard', 'event-dashboard', 'vendor-dashboard', 'waiter-dashboard', 
        'orders', 'tickets', 'budget', 'tracking', 'explore'
      ];
      if (protectedViews.includes(view)) {
        setView('auth');
      }
      return;
    }

    const role = (activeUser?.role || 'PATRON') as string;

    // Check 1: System Lockout / Maintenance Mode Role Restriction
    if (isSystemLocked) {
      const allowedDuringLock = ['ADMIN', 'MANAGER', 'EVENT_MANAGER'];
      if (!allowedDuringLock.includes(role)) {
        const restrictedTerminals = [
          'manager', 'workflow', 'staff-dashboard', 'vendor-dashboard', 
          'waiter-dashboard', 'orders', 'budget', 'tracking'
        ];
        if (restrictedTerminals.includes(view)) {
          setView('profile');
          triggerToast("Access Paused: The platform has been placed under Maintenance Mode. Only verified admin/management keys can access live transaction hubs.", "warning");
          return;
        }
      }
    }

    // Check 2: Unauthorized Dashboard Access
    if (view === 'admin' && role !== 'ADMIN') {
      setView('profile');
      triggerToast("Access Denied: Your credential role lacks security level clearance to enter the Wayta Global Administration console.", "error");
    } else if (view === 'manager') {
      const allowed = ['BARTENDER', 'MANAGER', 'ADMIN', 'EVENT_MANAGER', 'VENDOR', 'STAFF'];
      if (!allowed.includes(role)) {
        setView('explore');
        triggerToast("Access Blocked: The Venue Manager interface is strictly reserved for operational team personnel.", "error");
      }
    } else if (view === 'staff-dashboard') {
      const allowed = ['BARTENDER', 'STAFF', 'MANAGER', 'ADMIN'];
      if (!allowed.includes(role)) {
        setView('profile');
        triggerToast("Access Denied: This staff terminal can only be accessed by assigned service crew and bartenders.", "error");
      }
    } else if (view === 'event-dashboard') {
      const allowed = ['EVENT_MANAGER', 'MANAGER', 'ADMIN'];
      if (!allowed.includes(role)) {
        setView('profile');
        triggerToast("Access Denied: Event monitoring metrics are closed to unauthorized profiles.", "error");
      }
    } else if (view === 'event-admin-dashboard') {
      const allowed = ['EVENT_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];
      if (!allowed.includes(role)) {
        setView('profile');
        triggerToast("Access Denied: Dynamic stock monitoring is reserved for testing event managers.", "error");
      }
    } else if (view === 'vendor-dashboard') {
      const allowed = ['VENDOR', 'MANAGER', 'ADMIN'];
      if (!allowed.includes(role)) {
        setView('profile');
        triggerToast("Access Denied: This billing and stock terminal requires verified vendor partner permissions.", "error");
      }
    } else if (view === 'waiter-dashboard') {
      const allowed = ['WAITER', 'MANAGER', 'ADMIN'];
      if (!allowed.includes(role)) {
        setView('profile');
        triggerToast("Access Denied: Waiter terminal functions require active digital waiter dispatch authorization.", "error");
      }
    }
  }, [view, currentUser, isSystemLocked]);
  const [showProfileModal, setShowProfileModal] = useState(true);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedTab, setSelectedTab] = useState<string | undefined>(undefined);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [budget, setBudget] = useState(0);
  const [showBudgetPrompt, setShowBudgetPrompt] = useState(false);
  const [spent, setSpent] = useState(0);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [venueOrders, setVenueOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [assignedEvents, setAssignedEvents] = useState<Event[]>([]);
  const [showRoleIntro, setShowRoleIntro] = useState(false);
  const [showStaffCredentialsOverlay, setShowStaffCredentialsOverlay] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [isAdminLoginVisible, setIsAdminLoginVisible] = useState(false);
  const { startTour, isActive } = useOnboarding();

  useEffect(() => {
    setVenue(selectedVenue);
  }, [selectedVenue, setVenue]);

  useEffect(() => {
    if (selectedEventId) {
      const ev = allEvents.find(e => e.id === selectedEventId) || null;
      setEvent(ev);
    } else {
      setEvent(null);
    }
  }, [selectedEventId, allEvents, setEvent]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (rawFirebaseUser) => {
      const { isValid, sanitizedUser: firebaseUser, error: validationError } = validateFirebaseUser(rawFirebaseUser);

      if (isValid && firebaseUser) {
        try {
          // Small delay to ensure auth token is fully propagated
          await new Promise(resolve => setTimeout(resolve, 500));
          const profile = await syncUserProfile(rawFirebaseUser!);
          
          // If profile has a PIN hash, we don't auto-login here. 
          // Instead, we stay on 'auth' view and let AuthView handle PIN entry or username login.
          if (profile && profile.role) {
            if (profile.pin_hash && !sessionStorage.getItem('pin_verified')) {
              setView('auth');
              return;
            }

            const userData: User = {
              uid: profile.uid || firebaseUser.uid,
              email: profile.email || firebaseUser.email || '',
              full_name: profile.full_name || profile.displayName || 'User',
              displayName: profile.full_name || profile.displayName || 'User',
              role: ((profile.role as string)?.toUpperCase() as UserRole) || 'PATRON',
              isAuthorized: true,
              isVerified: profile.isVerified || false,
              firstName: profile.firstName,
              lastName: profile.lastName,
              phone: profile.phone,
              status: profile.status || 'APPROVED',
              photoURL: profile.photoURL || undefined,
              budgetLimit: profile.budgetLimit !== undefined ? profile.budgetLimit : 0,
              assigned_venue_id: profile.onboarding_details?.venue_id || profile.assigned_venue_id,
              assigned_event_id: profile.assigned_event_id || (profile.role === 'EVENT_MANAGER' ? profile.assigned_venue_id : undefined),
              is_profile_complete: profile.is_profile_complete
            };
            setCurrentUser(userData);
            
            // Only auto-navigate on initial load if we're stuck in auth/onboarding/admin states
            setView(prev => {
              const roleUpper = (userData.role || 'PATRON').toUpperCase();
              if (redirectAfterAuth) {
                const nextView = redirectAfterAuth.view;
                const nextEventId = redirectAfterAuth.eventId;
                setRedirectAfterAuth(null);
                if (nextEventId) setCurrentEventId(nextEventId);
                return nextView;
              }
              if (prev === 'auth' || prev === 'onboarding' || prev === 'admin' || prev === 'admin-super' || prev === 'public-events') {
                if (roleUpper === 'SUPER_ADMIN') return 'admin-super';
                if (roleUpper === 'ADMIN') return 'admin-super';
                if (roleUpper === 'EVENT_MANAGER') return 'event-admin-dashboard';
                if (roleUpper === 'WAITER') return 'waiter-dashboard';
                if (roleUpper === 'VENDOR') return 'vendor-dashboard';
                if (roleUpper === 'STAFF' || roleUpper === 'BARTENDER') return 'staff-dashboard';
                if (roleUpper === 'MANAGER') return 'manager';
                return 'explore';
              }
              return prev;
            });
          } else {
            // User exists but no role - send to auth to pick role
            setCurrentUser(null);
            setView('auth');
          }
        } catch (error) {
          console.error("Auth sync error:", error);
          if (error && typeof error === 'object') {
            try {
              console.error("🔍 Auth sync error details:", JSON.stringify(error, null, 2));
            } catch (e) {}
          }
          setView('auth');
        }
      } else {
        setCurrentUser(null);
        sessionStorage.removeItem('pin_verified');
        setView(prev => prev === 'onboarding' ? 'onboarding' : 'auth');
      }
    });

    return () => unsubscribe();
  }, []); // Run once on mount

  // Listen to profile changes in real-time
  useEffect(() => {
    if (!currentUser?.uid) return;

    let rtdbUnsubscribed = false;
    let rtdbUnsubscribe: (() => void) | null = null;
    let fsUnsubscribe: (() => void) | null = null;

    const setupRtdbAndFallback = () => {
      try {
        const userRef = ref(rtdb, `users/${currentUser.uid}`);
        rtdbUnsubscribe = onValue(userRef, (snapshot) => {
          if (rtdbUnsubscribed) return;
          if (snapshot.exists()) {
            const data = snapshot.val();
            setCurrentUser(prev => prev ? {
              ...prev,
              role: (data.role as UserRole) || prev.role,
              full_name: data.full_name || data.displayName || prev.full_name,
              displayName: data.full_name || data.displayName || prev.displayName,
              photoURL: data.photoURL || prev.photoURL,
              phone: data.phone || prev.phone,
              budgetLimit: data.budgetLimit || data.budget || prev.budgetLimit || 0,
              address: data.address || prev.address,
              bio: data.bio || prev.bio,
              isAuthorized: true,
              assigned_venue_id: data.onboarding_details?.venue_id || data.assigned_venue_id || prev.assigned_venue_id,
              assigned_event_id: data.assigned_event_id || prev.assigned_event_id || (data.role === 'EVENT_MANAGER' ? data.assigned_venue_id : undefined),
              is_profile_complete: data.is_profile_complete !== undefined ? data.is_profile_complete : prev.is_profile_complete
            } : null);
          }
        }, (error) => {
          console.warn('RTDB User Listener error, falling back to Firestore polling silently:', error);
          rtdbUnsubscribed = true;
          setupFirestoreFallback();
        });
      } catch (e) {
        console.warn('Error during RTDB setup, falling back to Firestore polling silently:', e);
        setupFirestoreFallback();
      }
    };

    const setupFirestoreFallback = () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        fsUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data) {
              setCurrentUser(prev => prev ? {
                ...prev,
                role: (data.role as UserRole) || prev.role,
                full_name: data.full_name || data.displayName || prev.full_name,
                displayName: data.full_name || data.displayName || prev.displayName,
                photoURL: data.photoURL || prev.photoURL,
                phone: data.phone || prev.phone,
                budgetLimit: data.budgetLimit || data.budget || prev.budgetLimit || 0,
                address: data.address || prev.address,
                bio: data.bio || prev.bio,
                isAuthorized: true,
                assigned_venue_id: data.onboarding_details?.venue_id || data.assigned_venue_id || prev.assigned_venue_id,
                assigned_event_id: data.assigned_event_id || prev.assigned_event_id || (data.role === 'EVENT_MANAGER' ? data.assigned_venue_id : undefined),
                is_profile_complete: data.is_profile_complete !== undefined ? data.is_profile_complete : prev.is_profile_complete
              } : null);
            }
          }
        }, (fsError) => {
          console.warn('Firestore fallback listener error:', fsError);
        });
      } catch (err) {
        console.error('Failed to setup Firestore fallback:', err);
      }
    };

    setupRtdbAndFallback();

    return () => {
      rtdbUnsubscribed = true;
      if (rtdbUnsubscribe) {
        try {
          rtdbUnsubscribe();
        } catch (_) {}
      }
      if (fsUnsubscribe) {
        try {
          fsUnsubscribe();
        } catch (_) {}
      }
    };
  }, [currentUser?.uid]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('is_beta_authorized', 'true');
    sessionStorage.setItem('user_role', user.role);

    // Step 2: New Staff Credentials Onboarding Overlay
    const staffRoles = ['BARTENDER', 'STAFF', 'WAITER'];
    if (staffRoles.includes(user.role) && !user.is_profile_complete) {
        setShowStaffCredentialsOverlay(true);
        return; // Pause auto-routing until onboarding is done
    }

    // Trigger Onboarding if first time for this role
    const hasSeenOnboarding = localStorage.getItem(`has_seen_onboarding_${user.role}`);
    if (!hasSeenOnboarding) {
      startTour(user.role as any);
    }

    // Intelligent role-based routing for the "Command" button
    const autoLoginRole = localStorage.getItem('wayta_auto_login_role');
    const autoLoginEventId = localStorage.getItem('wayta_auto_login_event_id');

    if (redirectAfterAuth) {
      const nextView = redirectAfterAuth.view;
      const nextEventId = redirectAfterAuth.eventId;
      setRedirectAfterAuth(null);
      if (nextEventId) setCurrentEventId(nextEventId);
      setView(nextView);
      return;
    }

    if (autoLoginRole && autoLoginRole === 'EVENT_MANAGER') {
      localStorage.removeItem('wayta_auto_login_role');
      localStorage.removeItem('wayta_auto_login_event_id');
      setSelectedEventId(autoLoginEventId || undefined);
      setView('event-admin-dashboard');
      return;
    }

    const roleUpper = (user.role || 'PATRON').toUpperCase();
    if (user.username?.toUpperCase() === 'EVENT_ADMIN' || user.username?.toUpperCase().includes('EVENT_ADMIN') || roleUpper === 'EVENT_MANAGER') {
      setView('event-admin-dashboard');
      triggerToast("Event Administrator: Activated dynamic Simplified Stock & Live Orders monitor terminal.", "success");
    } else if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN') {
      setView('admin-super');
      triggerToast("Master Platform Admin: Logged into Master Platform Admin Dashboard.", "success");
    } else if (roleUpper === 'WAITER') {
      setView('waiter-dashboard');
      triggerToast("Terminal Activated: Welcome to Waiter Service & Delivery Hub.", "success");
    } else if (roleUpper === 'VENDOR') {
      setView('vendor-dashboard');
      triggerToast("Supply Chain Online: Welcome to Partner Vendor Dashboard.", "success");
    } else if (roleUpper === 'STAFF' || roleUpper === 'BARTENDER') {
      setView('staff-dashboard');
      triggerToast("Service Online: Activated Bartender/Staff Terminal.", "success");
    } else if (roleUpper === 'MANAGER') {
      setView('manager');
      triggerToast("Command Access: Welcome back, Venue Manager. Navigated to Venue Command dashboard.", "success");
    } else {
      setView('explore');
      triggerToast("Sandton Grid Online: Welcome to Wayta Patron Explore Hub.", "success");
    }
  };

  const switchMode = () => {
    if (view === 'manager' || view === 'staff-dashboard' || view === 'event-dashboard' || view === 'event-admin-dashboard' || view === 'waiter-dashboard' || view === 'vendor-dashboard') {
      setView('explore');
    } else if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
      setView('admin-super');
    } else if (currentUser?.role === 'MANAGER') {
      setView('manager');
    } else if (currentUser?.role === 'VENDOR') {
      setView('vendor-dashboard');
    } else if (currentUser?.role === 'BARTENDER' || currentUser?.role === 'STAFF') {
      setView('staff-dashboard');
    } else if (currentUser?.role === 'EVENT_MANAGER') {
      setView('event-admin-dashboard');
    } else if (currentUser?.role === 'WAITER') {
      setView('waiter-dashboard');
    } else {
      setView('business-onboarding');
    }
  };

  const handleLogout = async () => {
    if (currentUser?.uid) {
      const origRole = localStorage.getItem(`wayta_original_role_${currentUser.uid}`);
      if (origRole && origRole !== currentUser.role) {
        try {
          await updateUserProfile(currentUser.uid, { role: origRole as any });
        } catch (err) {
          console.error("Failed to restore original user role during logout hook:", err);
        }
      }
      localStorage.removeItem(`wayta_original_role_${currentUser.uid}`);
    }
    sessionStorage.clear();
    localStorage.removeItem(`wayta_profile_${currentUser?.uid}`);
    auth.signOut().then(() => {
        setCurrentUser(null);
        setView('auth');
    }).catch((err) => {
        console.error("Sign out error", err);
    });
  };

  const canAccess = (roles: UserRole[]) => {
    return currentUser && roles.includes(currentUser.role);
  };
  
  // Initial load from cache & DB
  useEffect(() => {
    if (isAuthenticating) return;

    setLoadingVenues(true);
    const cachedVenues = offlineCache.getVenues();
    if (cachedVenues && cachedVenues.length > 0) {
      setVenues(cachedVenues);
      setLoadingVenues(false);
    }
    
    // Listen to venues in Firestore
    const unsubscribeVenues = venueService.listenToVenuesFirestore((dbVenues) => {
      setVenues(dbVenues);
      setLoadingVenues(false);
      offlineCache.saveVenues(dbVenues);
    });

    // Listen to all events in Firestore
    const unsubscribeEvents = eventService.listenToAllEventsFirestore((dbEvents) => {
      setAllEvents(dbEvents);
    });

    return () => {
      unsubscribeVenues();
      unsubscribeEvents();
    };
  }, [currentUser?.role, isAuthenticating]);

  // Listen to user profile changes in Firestore
  useEffect(() => {
    if (currentUser?.uid) {
      const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrentUser(prev => prev ? { ...prev, ...data } : (data as any));
        }
      }, (error) => {
        console.warn("User profile onSnapshot error (silently caught):", error);
      });
      return () => unsub();
    }
  }, [currentUser?.uid]);

  // Listen to assigned events for staff/bartenders
  useEffect(() => {
    if (!currentUser?.uid || (currentUser.role !== 'BARTENDER' && currentUser.role !== 'STAFF' && currentUser.role !== 'WAITER' && currentUser.role !== 'EVENT_MANAGER')) {
      setAssignedEvents([]);
      return;
    }

    if (currentUser.uid === 'door-staff-quick') {
      if (currentUser.assigned_event_id) {
        const selected = allEvents.find(e => e.id === currentUser.assigned_event_id);
        setAssignedEvents(selected ? [selected] : []);
      } else {
        setAssignedEvents([]);
      }
      return;
    }

    let unsub: () => void;
    if (currentUser.role === 'EVENT_MANAGER') {
      unsub = eventService.listenToEventsByOwner(currentUser.uid, (events) => {
        setAssignedEvents(events);
      });
    } else {
      unsub = eventService.listenToEventsByStaff(currentUser.uid, (events) => {
        setAssignedEvents(events);
      });
    }

    return () => unsub();
  }, [currentUser?.uid, currentUser?.role, currentUser?.assigned_event_id, allEvents]);

  // Listen to orders and transactions when user is logged in
  useEffect(() => {
    if (!currentUser?.uid) {
      setUserOrders([]);
      setUserTickets([]);
      setVenueOrders([]);
      setTransactions([]);
      return;
    }

    // 1. Patron / Guest: Listen to orders where user_id === currentUser.uid OR customer_id === currentUser.uid
    // Listen to user_id === uid
    const qUser = query(collection(db, 'orders'), where('user_id', '==', currentUser.uid));
    const unsubUserOrders = onSnapshot(qUser, (snapshot) => {
      const dbOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setUserOrders(prev => {
        const otherOrders = prev.filter(o => o.customer_id === currentUser.uid && !dbOrders.some(x => x.id === o.id));
        const combined = [...dbOrders, ...otherOrders];
        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
      // Update spent based on combined orders
      const totalSpent = dbOrders.reduce((sum, order) => sum + (order.total || order.total_amount || 0), 0);
      setSpent(totalSpent);
    }, (error) => {
      console.warn("User orders onSnapshot error (silently caught):", error);
    });

    // Listen to customer_id === uid
    const qUserCust = query(collection(db, 'orders'), where('customer_id', '==', currentUser.uid));
    const unsubUserCustOrders = onSnapshot(qUserCust, (snapshot) => {
      const dbOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setUserOrders(prev => {
        const otherOrders = prev.filter(o => o.user_id === currentUser.uid && !dbOrders.some(x => x.id === o.id));
        const combined = [...dbOrders, ...otherOrders];
        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }, (error) => {
      console.warn("User customer orders onSnapshot error (silently caught):", error);
    });

    // 3. Listen to User's tickets
    const unsubUserTickets = orderService.listenToUserTickets(currentUser.uid, (dbTickets) => {
      setUserTickets(dbTickets);
    });

    // 2. Listen to Venue/Event orders based on user role (BARTENDER, MANAGER, etc.)
    let unsubVenueOrders: (() => void) | undefined;

    if (currentUser.role === 'BARTENDER') {
      const currentVenueId = currentUser.assigned_venue_id;
      let qBartender;
      if (currentVenueId) {
        qBartender = query(collection(db, 'orders'), where('venue_id', '==', currentVenueId));
      } else {
        qBartender = collection(db, 'orders'); // all orders fallbacks
      }
      unsubVenueOrders = onSnapshot(qBartender, (snapshot) => {
        const dbOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        // Filter active: not collected, status is not complete
        const activeOrders = dbOrders.filter(order => {
          const status = (order.status || '').toLowerCase();
          return status !== 'collected' && status !== 'completed';
        });
        setVenueOrders(activeOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }, (error) => {
        console.warn("Bartender orders onSnapshot error (silently caught):", error);
      });
    } else if (currentUser.role === 'MANAGER') {
      const managedVenueId = currentUser.assigned_venue_id;
      if (managedVenueId) {
        const qManager = query(collection(db, 'orders'), where('venue_id', '==', managedVenueId));
        unsubVenueOrders = onSnapshot(qManager, (snapshot) => {
          const dbOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          setVenueOrders(dbOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, (error) => {
          console.warn("Manager orders onSnapshot error (silently caught):", error);
        });
      }
    } else if (currentUser.role !== 'PATRON') {
      // General Event Manager / Admin fallback
      const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.email === 'o3sharenet@gmail.com';
      const userVenue = currentUser.assigned_venue_id || (isAdmin && venues.length > 0 ? venues[0].id : null);
      
      if (userVenue) {
        if (assignedEvents && assignedEvents.length > 0) {
          const eventIds = assignedEvents.map(e => e.id);
          unsubVenueOrders = orderService.listenToEventsOrdersFirestore(eventIds, userVenue, (dbOrders) => {
            setVenueOrders(dbOrders);
          });
        } else {
          unsubVenueOrders = orderService.listenToVenueOrdersFirestore(userVenue, (dbOrders) => {
            setVenueOrders(dbOrders);
          });
        }
      }
    }

    const unsubTxs = transactionService.listenToUserTransactions(currentUser.uid, (dbTxs) => {
      setTransactions(dbTxs);
    });

    return () => {
      unsubUserOrders();
      unsubUserCustOrders();
      unsubUserTickets();
      if (unsubVenueOrders) unsubVenueOrders();
      unsubTxs();
    };
  }, [currentUser?.uid, currentUser?.role, currentUser?.assigned_venue_id, assignedEvents]);

  // Merge orders for different views
  const allUserOrders = userOrders;
  const staffOrders = venueOrders;
  // For the generic 'orders' state used in many places, we need to decide what to show
  // Usually, staff want to see venue orders in their dashboard, Patrons want to see their own.
  const displayOrders = (currentUser?.role === 'PATRON') ? userOrders : venueOrders;


  const toggleTheme = toggleThemeMode;

  const handleMenuClick = () => {
    if (!currentUser) {
      setView('public-events');
      return;
    }
    
    // Intelligent role-based routing for the "Command" button
    switch (currentUser.role) {
      case 'MANAGER': setView('manager'); break;
      case 'VENDOR': setView('vendor-dashboard'); break;
      case 'STAFF':
      case 'BARTENDER': setView('staff-dashboard'); break;
      case 'EVENT_MANAGER': setView('event-admin-dashboard'); break;
      case 'WAITER': setView('waiter-dashboard'); break;
      case 'ADMIN':
      case 'SUPER_ADMIN': setView('admin-super'); break;
      default: setView('profile'); break;
    }
  };
  
  const triggerTour = () => {
    if (currentUser) {
      setIntroStep(0);
      setShowRoleIntro(true);
    }
  };

  const handleIntroComplete = () => {
    setShowRoleIntro(false);
    if (currentUser) {
      startTour(currentUser.role as any);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const order = staffOrders.find(o => o.id === orderId) || allUserOrders.find(o => o.id === orderId);
      await orderService.updateOrderStatus(orderId, status, order?.user_id);
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const navigate = (newView: typeof view, venue?: Venue, initialTab?: string, eventId?: string) => {
    if (venue) {
      setSelectedVenue(venue);
      setSelectedTab(initialTab);
      setSelectedEventId(eventId);
    }
    setView(newView);
    window.scrollTo(0, 0);
  };

  const handleGetTickets = (eventId: string, tierName?: string) => {
    if (!currentUser) {
      setRedirectAfterAuth({ view: 'patron-event', eventId });
      setView('auth');
      return;
    }
    
    // User is logged in, but check if profile is complete
    if (!currentUser.is_profile_complete) {
      // ProfileCompletionModal will handle it
      setCurrentEventId(eventId);
      setView('patron-event');
    } else {
      setCurrentEventId(eventId);
      setView('patron-event');
    }
  };

  const handleOrder = async (order: Order) => {
    if (!currentUser) return;

    try {
      const orderId = await orderService.createOrder({
        user_id: currentUser.uid,
        customer_name: (currentUser.full_name || currentUser.displayName || "Customer"),
        venue_id: selectedVenue?.id || 'unknown',
        event_id: order.event_id || (order as any).eventId || selectedEventId || null,
        items: order.items || [],
        status: order.status || 'Pending',
        payment_status: order.payment_status || 'Paid',
        total_amount: order.total || 0,
        total: order.total || 0,
        wayta_commission: order.wayta_commission || (order.total * 0.1) || 0
      }, currentUser.email || undefined);

      // Create transaction record
      await transactionService.createTransaction(currentUser.uid, {
        venue_id: selectedVenue?.id || 'unknown',
        event_id: order.event_id || (order as any).eventId || selectedEventId || null,
        venueName: selectedVenue?.name || 'Venue',
        amount: order.total || 0,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Success',
        category: 'Drinks',
        image: selectedVenue?.image || '/placeholder.png'
      });

      setActiveOrder({ ...order, id: orderId || order.id });
      setView('tracking');

      // First order prompt for budget setup
      const hasSetFirstBudget = localStorage.getItem(`has_set_budget_${currentUser.uid}`);
      if (!hasSetFirstBudget) {
        setTimeout(() => {
          setShowBudgetPrompt(true);
          localStorage.setItem(`has_set_budget_${currentUser.uid}`, 'true');
        }, 3000); // Wait 3s on tracking before prompting
      }

      // Loyalty Points Logic: R1 = 1 Point
      const newPoints = (currentUser.points || 0) + Math.floor(order.total);
      
      // Tier Calculation
      let newTier = currentUser.tier || 'BRONZE';
      if (newPoints >= 50000) newTier = 'TITANIUM';
      else if (newPoints >= 15000) newTier = 'PLATINUM';
      else if (newPoints >= 5000) newTier = 'GOLD';
      else if (newPoints >= 1000) newTier = 'SILVER';
      else newTier = 'BRONZE';

      // Update user profile in RTDB (this will trigger the app listener)
      await updateUserProfile(currentUser.uid, {
        points: newPoints,
        tier: newTier as any
      });

    } catch (err) {
      console.error('Order creation failed:', err);
    }
  };

  const handleScanQR = () => {
    setShowScanner(true);
  };

  const handleQRSuccess = (decodedText: string) => {
    console.log('Scanned QR:', decodedText);
    // Simulate detecting a venue or table from the QR
    // In a real app, you would parse the URL/ID and fetch the venue
    setSelectedVenue(venues[0]);
    setView('venue');
    setShowScanner(false);
  };

  useEffect(() => {
    if (currentUser) {
      const hasSeen = localStorage.getItem(`has_seen_onboarding_${currentUser.role}`);
      if (!hasSeen && (view === 'explore' || view === 'manager' || view === 'profile')) {
        triggerTour();
        localStorage.setItem(`has_seen_onboarding_${currentUser.role}`, 'true');
      }
    }
  }, [currentUser, view]);

  const handleUpdateBudget = (b: number) => {
    setBudget(b);
    if (currentUser) {
      updateUserProfile(currentUser.uid, { budgetLimit: b }).catch(err => {
        console.error('Failed to update budget in profile:', err);
      });
    }
  };

  return (
    <SocketProvider userId={currentUser?.uid}>
      <div className={cn(
        "min-h-screen bg-background text-on-background flex flex-col w-full mx-auto relative shadow-2xl md:border-x border-outline-variant",
        themeMode === 'dark' ? "dark" : ""
      )}>
      {['tracking', 'profile', 'tickets', 'public-event-detail', 'payment-authorization', 'payment-notification', 'wayta-checkout', 'wayta-menu', 'venue', 'event-dashboard', 'audit', 'workflow', 'budget', 'safety', 'quick-tour'].includes(view) && (
        <button
          onClick={handleNavigateBack}
          className="fixed top-6 left-6 z-[9999] h-11 w-11 rounded-full bg-black/80 hover:bg-[#1f2937] text-[#059669] border border-gray-800 shadow-2xl backdrop-blur-md active:scale-95 transition-all cursor-pointer flex items-center justify-center font-bold"
          title="Go Back"
          id="global-back-button"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      {isTestMode && (
        <div id="test-mode-status-banner" className="bg-amber-500 text-black font-black text-xs uppercase tracking-[0.2em] py-3.5 px-4 text-center border-b-4 border-black flex items-center justify-center gap-2 select-none shrink-0 z-50 shadow-md">
          <span className="w-2.5 h-2.5 bg-black rounded-full animate-ping" />
          <span>⚠️ GLOBAL DEMO TEST MODE ACTIVE — SIMULATED TRANSACTIONS ONLY</span>
        </div>
      )}
      {(localStorage.getItem('wayta_impersonating') === 'true' || impersonatedUser) && (
        <button
          onClick={() => {
            localStorage.removeItem('wayta_impersonating');
            localStorage.removeItem('wayta_impersonator_uid');
            localStorage.removeItem('impersonated_user');
            setImpersonatedUser(null);
            auth.signOut().then(() => {
              // Redirect to clean auth state which allows them to log back in as admin
              window.location.href = import.meta.env.BASE_URL;
            });
          }}
          title="Click to revert session back to Administrator"
          className="bg-red-600 text-white font-black text-xs uppercase tracking-[0.2em] py-3.5 px-4 text-center border-b-4 border-black flex items-center justify-center gap-2 select-none shrink-0 z-50 shadow-md animate-pulse hover:bg-neutral-900 active:scale-95 transition-all w-full cursor-pointer"
        >
          <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
          <span>👤 OPERATING IN IMPERSONATION MODE — CLICK TO REVERT</span>
        </button>
      )}
      {isAuthenticating && (
        <div 
          className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-8 text-center"
        >
           <div className="relative w-24 h-24 flex items-center justify-center mb-8">
              <div className="absolute inset-0 border border-outline rounded-full scale-110" />
              <div className="absolute inset-0 border-2 border-t-primary rounded-full animate-spin" />
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center font-black text-black text-3xl shadow-2xl shadow-primary/20 amber-glow">W</div>
           </div>
           <h2 className="text-xl font-black uppercase tracking-[0.3em] text-on-background">Initializing Pulse</h2>
           <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-[0.2em] mt-4">Connecting to Secure Mesh • SANDTON v2.4</p>
        </div>
      )}

      {view !== 'onboarding' && view !== 'auth' && view !== 'admin' && view !== 'manager' && view !== 'event-dashboard' && (
        <TopBar 
          onProfileClick={() => currentUser ? setView('profile') : setView('auth')} 
          onMenuClick={handleMenuClick} 
          onScanQR={handleScanQR}
          onAdminClick={() => setView('admin-super')}
          theme={themeMode}
          onToggleTheme={toggleThemeMode}
          sticky={true}
          user={currentUser}
          isOffline={isCurrentlyOffline}
          venueName={selectedVenue?.name}
        />
      )}

      {/* Service Staff FAB - Persistent Control */}
      {currentUser && ['BARTENDER', 'STAFF', 'WAITER'].includes(currentUser.role) && (
        <ServiceStaffFAB
           isSimulatedOffline={isSimulatedOffline}
           onToggleSimulatedOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
           onToggleTerminal={() => setView('orders')}
           onOpenScanner={handleScanQR}
           theme={themeMode}
        />
      )}

      {/* Admin FAB - Persistent Access */}
      {currentUser && currentUser.role !== 'PATRON' && (
        <AdminFAB
           onOpenAdmin={() => {
             if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
               setView('admin-super');
             } else {
               setIsAdminLoginVisible(true);
             }
           }}
           theme={themeMode}
        />
      )}

      {showStaffCredentialsOverlay && currentUser && (
        <StaffCredentialsOverlay
          user={currentUser}
          onComplete={() => {
            setShowStaffCredentialsOverlay(false);
            handleLoginSuccess(currentUser);
          }}
        />
      )}

      <main className="flex-1 overflow-x-hidden pb-20">
        <div
          key={`view-${view}`}
          className="w-full"
        >
            {view === 'wayta-menu' && <WaytaMenu onViewChange={(v) => setView(v as any)} theme={themeMode} />}
            {view === 'public-events' && (
              <PublicEventsView 
                onLogin={() => setView('auth')}
                onViewDetails={(eid) => {
                  setCurrentEventId(eid);
                  setView('public-event-detail');
                }}
                theme={themeMode}
              />
            )}
            {view === 'public-event-detail' && currentEventId && (
              <PublicEventDetailView 
                eventId={currentEventId}
                onBack={() => setView('public-events')}
                onGetTickets={handleGetTickets}
                theme={themeMode}
              />
            )}
            {view === 'wayta-checkout' && <WaytaCheckout onComplete={() => setView('payment-notification')} />}
            {view === 'onboarding' && <OnboardingView onComplete={() => setView('auth')} onExit={() => setView('auth')} />}
            {view === 'business-onboarding' && <BusinessOnboardingView onBack={() => setView('onboarding')} />}
            {view === 'auth' && <AuthView onLogin={handleLoginSuccess} onExplore={() => setView('public-events')} theme={themeMode} onToggleTheme={toggleTheme} onPartnerClick={switchMode} isAdminLoginEnabled={isAdminLoginEnabled} isSystemLocked={isSystemLocked} isLoginDebugDisabled={isLoginDebugDisabled} isPatronFastTrackDisabled={isPatronFastTrackDisabled} isAuthFlowSelectorHidden={isAuthFlowSelectorHidden} venues={venues} onStartTour={() => setView('quick-tour')} />}
            {view === 'patron-event' && currentEventId && (
              <PatronEventView 
                eventId={currentEventId}
                user={currentUser}
                onBack={() => setView('explore')}
                theme={themeMode}
              />
            )}
            {view === 'explore' && (
              <ProtectedRoute 
                user={currentUser} 
                allowedRoles={['PATRON', 'ADMIN', 'SUPER_ADMIN']} 
                fallback={
                  <AuthView 
                    onLogin={handleLoginSuccess} 
                    onExplore={() => setView('public-events')}
                    theme={themeMode} 
                    onToggleTheme={toggleThemeMode} 
                    onPartnerClick={switchMode} 
                    isAdminLoginEnabled={isAdminLoginEnabled}
                    isSystemLocked={isSystemLocked}
                    isLoginDebugDisabled={isLoginDebugDisabled}
                    isPatronFastTrackDisabled={isPatronFastTrackDisabled}
                    isAuthFlowSelectorHidden={isAuthFlowSelectorHidden}
                    venues={venues}
                    onStartTour={() => setView('quick-tour')}
                  />
                }
              >
                {loadingVenues ? (
                  <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Syncing Mesh Venues...</p>
                  </div>
                ) : (
                  <ExploreView 
                    venues={venues} 
                    onSelectVenue={(v, tab, eid) => navigate('venue', v, tab, eid)} 
                    onSelectEvent={(eid) => {
                      setCurrentEventId(eid);
                      setView('patron-event');
                    }}
                    onScanQR={handleScanQR} 
                    spent={spent} 
                    budget={currentUser?.budgetLimit || budget} 
                    onUpdateBudget={handleUpdateBudget} 
                    userEmail={currentUser?.email} 
                    user={currentUser}
                    theme={themeMode}
                  />
                )}
              </ProtectedRoute>
            )}
            {view === 'venue' && selectedVenue && (
              <VenueDetailsView 
                venue={selectedVenue} 
                budgetRemaining={(currentUser?.budgetLimit || budget) - spent}
                budgetLimit={currentUser?.budgetLimit || budget}
                onBack={() => setView('explore')}
                onOrder={handleOrder} 
                user={currentUser}
                initialTab={selectedTab as any}
                selectedEventId={selectedEventId}
                theme={themeMode}
              />
            )}
            {view === 'tracking' && activeOrder && (
              <OrderTrackingView 
                order={activeOrder} 
                onClose={() => setView('orders')} 
              />
            )}
            {view === 'orders' && (
              <OrdersView 
                orders={displayOrders}
                venues={venues}
                events={allEvents}
                onOrderClick={(order) => {
                  setActiveOrder(order);
                  setView('tracking');
                }}
              />
            )}
            {view === 'tickets' && (
              <TicketsView 
                tickets={userTickets}
                onBack={() => setView('explore')}
                theme={themeMode}
              />
            )}
            {view === 'budget' && (
              <BudgetView 
                budget={currentUser?.budgetLimit || budget} 
                spent={spent} 
                transactions={transactions}
                onUpdateBudget={handleUpdateBudget}
              />
            )}
            {view === 'safety' && <SafetyView />}
            {view === 'manager' && (
              <ProtectedRoute 
                user={currentUser} 
                allowedRoles={['BARTENDER', 'MANAGER', 'ADMIN', 'EVENT_MANAGER', 'VENDOR', 'STAFF']} 
                fallback={
                  <ExploreView 
                    venues={venues} 
                    onSelectVenue={(v) => navigate('venue', v)} 
                    onSelectEvent={(eid) => {
                      setCurrentEventId(eid);
                      setView('patron-event');
                    }}
                    onScanQR={handleScanQR} 
                    spent={spent} 
                    budget={currentUser?.budgetLimit || budget} 
                    onUpdateBudget={(b) => setBudget(b)} 
                    userEmail={currentUser?.email} 
                    user={currentUser} 
                  />
                }
              >
                {loadingVenues ? (
                  <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Syncing Manager Hub...</p>
                  </div>
                ) : venues.length > 0 ? (
                  <ManagerDashboardView 
                    venue={venues.find(v => v.id === currentUser?.assigned_venue_id) || venues[0]}
                    user={currentUser}
                    orders={staffOrders} 
                    onUpdateOrderStatus={handleUpdateOrderStatus} 
                    theme={themeMode}
                    onHome={() => setView('explore')}
                    onBack={() => setView('profile')}
                    onLogout={handleLogout}
                    role={currentUser?.role || 'PATRON'}
                    onViewChange={setView}
                    onViewEventDashboard={(eventId) => {
                      setCurrentEventId(eventId);
                      setView('event-admin-dashboard');
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                    <p className="text-sm font-bold text-on-surface-variant text-center max-w-sm px-4">No venues found or assigned to your manager profile. Contact an administrator to link your account.</p>
                    <div className="bg-surface-container rounded-lg p-4 text-left w-full max-w-sm overflow-auto text-xs font-mono">
                       <p>User Role: {currentUser?.role}</p>
                       <p>Assigned Venue ID: {currentUser?.assigned_venue_id || 'None'}</p>
                       <p>Total Venues Loaded: {venues.length}</p>
                       {venues.map((v, i) => <p key={`v-${v.id}-${i}`}>- {v.id} ({v.name})</p>)}
                    </div>
                  </div>
                )}
              </ProtectedRoute>
            )}
            {view === 'workflow' && venues.length > 0 && venues[0] && (
              <ProtectedRoute 
                user={currentUser} 
                allowedRoles={['BARTENDER', 'MANAGER', 'ADMIN', 'EVENT_MANAGER', 'VENDOR', 'STAFF']} 
                fallback={
                  <ExploreView 
                    venues={venues} 
                    onSelectVenue={(v) => navigate('venue', v)} 
                    onSelectEvent={(eid) => {
                      setCurrentEventId(eid);
                      setView('patron-event');
                    }}
                    onScanQR={handleScanQR} 
                    spent={spent} 
                    budget={currentUser?.budgetLimit || budget} 
                    onUpdateBudget={(b) => setBudget(b)} 
                    userEmail={currentUser?.email} 
                    user={currentUser} 
                  />
                }
              >
                <WorkflowView 
                  venue={venues.find(v => v.id === currentUser?.assigned_venue_id) || venues[0]}
                  orders={staffOrders}
                  onBack={() => setView('manager')}
                  role={currentUser?.role || 'PATRON'}
                  theme={themeMode}
                  onToggleTheme={toggleThemeMode}
                />
              </ProtectedRoute>
            )}
            {view === 'profile' && (
              <ProfileView 
                onLogout={handleLogout} 
                theme={themeMode} 
                onToggleTheme={toggleThemeMode} 
                isAdminLoginEnabled={isAdminLoginEnabled}
                onAdminClick={() => {
                  if (sessionStorage.getItem('admin_verified')) {
                    setView('admin');
                  } else {
                    setIsAdminLoginVisible(true);
                  }
                }} 
                onPartnerClick={switchMode}
                isBartenderEnabled={isBartenderEnabled} 
                onBartenderClick={() => setView('manager')}
                user={currentUser}
                onRestartTour={triggerTour}
                onUpdateProfile={async (data) => {
                  if (currentUser) {
                    await updateUserProfile(currentUser.uid, data);
                    if (data.role) {
                      const roleUpper = data.role.toUpperCase();
                      if (roleUpper === 'ADMIN') {
                        setView('admin');
                        triggerToast("Platform Authority: Switched to Platform Admin Dashboard.", "success");
                      } else if (roleUpper === 'EVENT_MANAGER') {
                        setView('event-admin-dashboard');
                        triggerToast("Registry Access: Switched to Simplified Event Admin Terminal.", "success");
                      } else if (roleUpper === 'WAITER') {
                        setView('waiter-dashboard');
                        triggerToast("Terminal Activated: Switched to Waiter Service & Delivery Hub.", "success");
                      } else if (roleUpper === 'VENDOR') {
                        setView('vendor-dashboard');
                        triggerToast("Supply Chain Online: Switched to Partner Vendor Dashboard.", "success");
                      } else if (roleUpper === 'STAFF' || roleUpper === 'BARTENDER') {
                        setView('staff-dashboard');
                        triggerToast("Service Online: Activated Staff/Crew Terminal.", "success");
                      } else if (roleUpper === 'MANAGER') {
                        setView('manager');
                        triggerToast("Command Access: Switched to Venue Command Dashboard.", "success");
                      } else {
                        setView('explore');
                        triggerToast("Grid Online: Navigated to Wayta Patron Explore Hub.", "success");
                      }
                    }
                  }
                }}
                onViewOrders={() => setView('orders')}
                orders={allUserOrders}
                transactions={transactions}
                onAuditClick={() => setView('audit')}
              />
            )}
            {view === 'admin' && (
              <AdminDashboardView 
                onBack={() => setView('profile')} 
                onPartnerClick={() => setView('manager')}
                onNavigateToSuperAdmin={() => setView('admin-super')}
                isBartenderEnabled={isBartenderEnabled} 
                onToggleBartender={setIsBartenderEnabled} 
                user={currentUser}
                theme={themeMode}
                onToggleTheme={toggleThemeMode}
                isAdminLoginEnabled={isAdminLoginEnabled}
                onToggleAdminLogin={handleToggleAdminLogin}
                isSystemLocked={isSystemLocked}
                onToggleSystemLock={handleToggleSystemLock}
                triggerToast={triggerToast}
                isLoginDebugDisabled={isLoginDebugDisabled}
                onToggleLoginDebug={handleToggleLoginDebug}
                isTestMode={isTestMode}
                onToggleTestMode={handleToggleTestMode}
                isPatronFastTrackDisabled={isPatronFastTrackDisabled}
                onTogglePatronFastTrack={handleTogglePatronFastTrack}
                isAuthFlowSelectorHidden={isAuthFlowSelectorHidden}
                onToggleAuthFlowSelector={handleToggleAuthFlowSelector}
                onImpersonateUser={(targetUser) => {
                  localStorage.setItem('impersonated_user', JSON.stringify(targetUser));
                  setImpersonatedUser(targetUser);
                  const role = targetUser.role || 'PATRON';
                  if (role === 'BARTENDER') setView('staff-dashboard');
                  else if (role === 'WAITER') setView('waiter-dashboard');
                  else if (role === 'MANAGER') setView('manager');
                  else if (role === 'EVENT_MANAGER') setView('event-admin-dashboard');
                  else if (role === 'VENDOR') setView('vendor-dashboard');
                  else setView('explore');
                  triggerToast?.(`Impersonating as: ${targetUser.email}`, "warning");
                }}
              />
            )}
            {view === 'admin-super' && (
              <AdminSuperDashboardView />
            )}
            {view === 'staff-dashboard' && activeUser && venues.length > 0 && venues[0] && (
              <StaffDashboardView 
                venue={venues.find(v => v.id === activeUser.assigned_venue_id) || venues[0]}
                user={activeUser}
                orders={staffOrders}
                events={assignedEvents}
                onLogout={handleLogout}
                onBack={() => setView(currentUser?.role === 'MANAGER' ? 'manager' : 'profile')}
                onHome={() => setView('explore')}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                theme={themeMode}
                onToggleTheme={toggleThemeMode}
              />
            )}
            {view === 'event-dashboard' && activeUser && (
              <EventManagerDashboardView 
                venue={venues.find(v => v.id === activeUser.assigned_venue_id)}
                user={activeUser}
                events={allEvents}
                onLogout={handleLogout}
                onBack={() => setView(activeUser.role === 'MANAGER' ? 'manager' : 'profile')}
                onHome={() => setView('explore')}
                theme={themeMode}
                onToggleTheme={toggleThemeMode}
                initialEventId={currentEventId}
              />
            )}
            {view === 'event-admin-dashboard' && activeUser && (
              <EventAdminDashboardView 
                user={activeUser}
                onLogout={handleLogout}
                onHome={() => setView('explore')}
                theme={themeMode}
              />
            )}
            {view === 'vendor-dashboard' && activeUser && venues.length > 0 && venues[0] && (
              <VendorDashboardView 
                venue={venues.find(v => v.id === activeUser.assigned_venue_id) || venues[0]}
                user={activeUser}
                onLogout={handleLogout}
                onBack={() => setView('profile')}
                onHome={() => setView('explore')}
                theme={themeMode}
                onToggleTheme={toggleThemeMode}
              />
            )}
            {view === 'waiter-dashboard' && activeUser && venues.length > 0 && venues[0] && (
              <WaiterDashboardView 
                venue={venues.find(v => v.id === activeUser.assigned_venue_id) || venues[0]}
                user={activeUser}
                orders={staffOrders}
                onLogout={handleLogout}
                onBack={() => setView('profile')}
                onHome={() => setView('explore')}
                onOrderAction={handleUpdateOrderStatus}
                theme={themeMode}
                onToggleTheme={toggleThemeMode}
              />
            )}
            {view === 'audit' && (
              <AuditHubView 
                onBack={() => setView('profile')}
                onSimulateOffline={setIsSimulatedOffline}
                isSimulatedOffline={isSimulatedOffline}
                onToggleVerificationWait={setIsVerificationPending}
                isVerificationPending={isVerificationPending}
                triggerAppToast={triggerToast}
                theme={themeMode}
              />
            )}
            {view === 'quick-tour' && (
              <QuickTourSandboxView 
                onBack={() => setView('auth')}
                theme={themeMode}
                triggerAppToast={triggerToast}
              />
            )}
            {view === 'payment-authorization' && <PaymentAuthorizationView />}
            {view === 'payment-notification' && <PaymentNotificationView />}
          </div>
      </main>


      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed top-4 left-4 z-[200]">
          <button 
            onClick={() => {
              const b = prompt('Enter budget amount:');
              if (b) handleUpdateBudget(parseFloat(b));
            }}
            className="p-2 bg-black/50 text-white rounded text-[8px]"
          >
            DB: Set Budget
          </button>
        </div>
      )}

      {view !== 'onboarding' && view !== 'auth' && !isActive && (
        <div className="fixed bottom-24 right-6 z-[90]">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -inset-4 bg-primary/20 rounded-full animate-pulse blur-xl"
          />
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            whileHover={{ scale: 1.1, backgroundColor: '#ffffff', color: '#000000' }}
            whileTap={{ scale: 0.9 }}
            onClick={triggerTour}
            className="relative w-16 h-16 bg-black text-primary rounded-[2rem] flex items-center justify-center shadow-2xl border border-primary/20 hover:border-white transition-all duration-300"
          >
            <HelpCircle size={32} />
          </motion.button>
        </div>
      )}

      {view !== 'onboarding' && view !== 'auth' && view !== 'admin' && view !== 'manager' && view !== 'event-dashboard' && view !== 'waiter-dashboard' && view !== 'staff-dashboard' && view !== 'vendor-dashboard' && (
        <BottomNav currentView={view} onViewChange={setView} userRole={currentUser?.role} />
      )}

      {/* Patron Floating Header Navigation */}
      <AnimatePresence>
        {showPatronFloatingNav && ['explore', 'tickets', 'orders', 'profile'].includes(view) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-black/90 hover:bg-black/95 backdrop-blur-xl border border-primary/30 p-1.5 rounded-full flex items-center gap-1.5 shadow-2xl shadow-primary/10 transition-all max-w-[95vw] overflow-x-auto scrollbar-hide"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-white/10 shrink-0">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93]">Patron DOCK</span>
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  {id: 'explore', icon: Compass, label: 'Explore'},
                  {id: 'tickets', icon: TicketIcon, label: 'Tickets'},
                  {id: 'orders', icon: ShoppingBag, label: 'Orders'},
                  {id: 'profile', icon: UserIcon, label: 'Profile'}
                ] as const
              ).map(({id, icon: Icon, label}) => (
                <button
                  key={id}
                  onClick={() => {
                    setView(id as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                    view === id 
                      ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={11} className={cn(view === id ? "fill-black" : "")} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <OnboardingPortal />

      <PersonaOnboardingOverlay 
        open={showRoleIntro && currentUser !== null}
        step={introStep}
        total={
          currentUser?.role === 'PATRON' ? 6 : 
          currentUser?.role === 'BARTENDER' ? 4 : 
          currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' ? 7 : 3
        }
        onClose={() => setShowRoleIntro(false)}
        onDoNotShowAgain={() => {
          if (currentUser) {
             localStorage.setItem(`has_seen_onboarding_${currentUser.role}`, 'true');
             setShowRoleIntro(false);
          }
        }}
        title={currentUser?.role === 'PATRON' ? "Welcome, Patron" : currentUser?.role === 'BARTENDER' ? "Staff Activation" : "Manager Command"}
      >
        {currentUser?.role === 'PATRON' && (
          <PatronIntro 
            step={introStep} 
            next={() => setIntroStep(s => s + 1)} 
            prev={() => setIntroStep(s => s - 1)} 
            onComplete={handleIntroComplete}
          />
        )}
        {currentUser?.role === 'BARTENDER' && (
          <BartenderIntro 
            step={introStep} 
            next={() => setIntroStep(s => s + 1)} 
            prev={() => setIntroStep(s => s - 1)} 
            onComplete={handleIntroComplete}
          />
        )}
        {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN') && (
          <ManagerIntro 
            step={introStep} 
            next={() => setIntroStep(s => s + 1)} 
            prev={() => setIntroStep(s => s - 1)} 
            onComplete={handleIntroComplete}
          />
        )}
        {currentUser?.role === 'EVENT_MANAGER' && (
          <EventManagerIntro 
            step={introStep} 
            next={() => setIntroStep(s => s + 1)} 
            prev={() => setIntroStep(s => s - 1)} 
            onComplete={handleIntroComplete}
          />
        )}
        {currentUser?.role === 'VENDOR' && (
          <VendorIntro 
            step={introStep} 
            next={() => setIntroStep(s => s + 1)} 
            prev={() => setIntroStep(s => s - 1)} 
            onComplete={handleIntroComplete}
          />
        )}
      </PersonaOnboardingOverlay>

      <AnimatePresence>
        {isAdminLoginVisible && (
          <AdminLoginOverlay 
            onSuccess={() => {
              setIsAdminLoginVisible(false);
              setView('admin');
            }}
            onClose={() => setIsAdminLoginVisible(false)}
            isDark={themeMode === 'dark'}
          />
        )}
        {/* QR Scanner */}
      <AnimatePresence>
        {showBudgetPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface-container border border-outline rounded-[3rem] p-8 w-full max-w-sm text-center space-y-8 shadow-2xl"
            >
               <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
                  <span className="text-4xl font-black">R</span>
               </div>
               <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Set Party Budget?</h2>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-2 px-4">
                    Control your spending for this session. We'll alert you as you approach your limit.
                  </p>
               </div>
               
               <div className="space-y-4">
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">R</span>
                   <input 
                     type="number"
                     placeholder="Enter Amount"
                     className="w-full h-16 bg-background border border-outline rounded-2xl pl-10 pr-4 text-center text-2xl font-black focus:border-primary outline-none"
                     autoFocus
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         const val = parseFloat((e.target as HTMLInputElement).value);
                         if (!isNaN(val)) {
                           handleUpdateBudget(val);
                           setShowBudgetPrompt(false);
                         }
                       }
                     }}
                   />
                 </div>
                 <button 
                   onClick={(e) => {
                     const input = (e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement);
                     const val = parseFloat(input.value);
                     if (!isNaN(val)) {
                       handleUpdateBudget(val);
                       setShowBudgetPrompt(false);
                     }
                   }}
                   className="w-full h-16 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all"
                 >
                   Set Budget Now
                 </button>
                 <button 
                   onClick={() => setShowBudgetPrompt(false)}
                   className="w-full h-14 bg-surface-container-high border border-outline rounded-2xl font-black text-[10px] uppercase tracking-widest text-on-surface-variant active:scale-95 transition-all"
                 >
                   Maybe later
                 </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileCompletionModal 
        isOpen={!!currentUser && !currentUser.is_profile_complete && showProfileModal && currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN' && currentUser.role !== 'EVENT_MANAGER'}
        user={currentUser}
        onComplete={() => {
          if (currentUser) {
            setCurrentUser({ ...currentUser, is_profile_complete: true });
          }
        }}
        onClose={() => setShowProfileModal(false)}
      />

      {showScanner && (
          <QRScanner 
            onScan={handleQRSuccess} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </AnimatePresence>

      {/* Embedded Dynamic Lockout & Restrictive Access Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none"
          >
            <div className={cn(
              "flex items-start gap-4 p-4 rounded-3xl shadow-2xl border backdrop-blur-md pointer-events-auto",
              toastType === 'error' 
                ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-red-500/5" 
                : toastType === 'warning'
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-amber-500/5"
                : toastType === 'success'
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/5"
                : "bg-blue-500/10 border-blue-500/30 text-blue-500"
            )}>
              <div className="mt-0.5 min-w-[20px]">
                {toastType === 'error' ? (
                  <AlertTriangle size={20} className="text-red-500 animate-bounce" />
                ) : toastType === 'warning' ? (
                  <Lock size={20} className="text-amber-500 animate-pulse" />
                ) : (
                  <Info size={18} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-black uppercase tracking-widest leading-none">
                  {toastType === 'error' ? 'Security Blocked' : toastType === 'warning' ? 'Access Paused' : 'System Sync'}
                </h4>
                <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest leading-relaxed">
                  {toastMessage}
                </p>
              </div>
              <button 
                onClick={() => setToastMessage(null)}
                className="hover:opacity-75 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </SocketProvider>
    );
}
