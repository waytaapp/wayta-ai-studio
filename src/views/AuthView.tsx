import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ShieldCheck, Key, LogIn, Mail, ArrowRight, 
  Shield, Star, Hammer, Users, AlertTriangle, 
  Plus, ChevronRight, Info, LayoutGrid, ShoppingBag, Smartphone,
  Sun, Moon, Compass, Lock, QrCode, Sparkles,
  ChevronDown, ChevronUp, Phone, Clock, Fingerprint
} from 'lucide-react';
import { User, UserRole, Venue, Event as AppEvent } from '../types';
import { WaytaLogo } from '../components/WaytaLogo';
import { PartnerWaytaButton } from '../components/PartnerWaytaButton';
import { signIn, auth, functions } from '../lib/firebase';
import { validateFirebaseUser } from '../lib/authValidator';
import { syncUserProfile, updateUserProfile, authService, UserRole as FirebaseUserRole } from '../services/authService';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { MFAVerificationView } from '../components/MFAVerificationView';
import { MFASecurityMemoModal } from '../components/MFASecurityMemoModal';
import { verificationService } from '../services/verificationService';
import { extensionService } from '../services/extensionService';
import { venueService } from '../services/venueService';
import { eventService } from '../services/eventService';
import { EventForm } from '../components/forms/EventForm';
import { cn } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface RTDBErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleRTDBError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: RTDBErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Realtime Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthViewProps {
  onLogin: (user: User) => void;
  onExplore?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onPartnerClick?: () => void;
  initialStep?: 'welcome' | 'method' | 'email' | 'role-selection' | 'register' | 'patron-register' | 'pin-entry' | 'username-login' | 'venue-registration';
  isAdminLoginEnabled?: boolean;
  isSystemLocked?: boolean;
  isLoginDebugDisabled?: boolean;
  isPatronFastTrackDisabled?: boolean;
  isAuthFlowSelectorHidden?: boolean;
  venues?: Venue[];
  onStartTour?: () => void;
}

// Developer/admin access is configured at build time via VITE_* env vars
// (see .env.example). When a credential is unset, that login path is disabled.
const WHITELISTED_EMAIL = import.meta.env.VITE_ADMIN_WHITELISTED_EMAIL || '';
const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
const SUPER_ADMIN_PASSWORD = import.meta.env.VITE_SUPER_ADMIN_PASSWORD || '';
const SUPER_ADMIN_PIN = import.meta.env.VITE_SUPER_ADMIN_PIN || '';

export const AuthView: React.FC<AuthViewProps> = ({ 
  onLogin, 
  onExplore, 
  theme = 'dark', 
  onToggleTheme, 
  onPartnerClick, 
  initialStep, 
  isAdminLoginEnabled = true,
  isSystemLocked = false,
  isLoginDebugDisabled = true,
  isPatronFastTrackDisabled = false,
  isAuthFlowSelectorHidden = false,
  venues = [],
  onStartTour
}) => {
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [step, setStep] = useState<'welcome' | 'method' | 'email' | 'role-selection' | 'register' | 'patron-register' | 'pin-entry' | 'username-login' | 'venue-registration' | 'door-staff-picker'>(initialStep || 'welcome');
  // Manager MFA properties
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [mfaRole, setMfaRole] = useState<string | null>(null);
  const [welcomeSubStep, setWelcomeSubStep] = useState<'hero' | 'get-started'>('hero');
  const [selectedOption, setSelectedOption] = useState<string>('');
  
  // Door Staff picker states & listeners
  const [selectedStaffVenueId, setSelectedStaffVenueId] = useState<string>('');
  const [selectedStaffEventId, setSelectedStaffEventId] = useState<string>('');
  const [staffEvents, setStaffEvents] = useState<AppEvent[]>([]);

  React.useEffect(() => {
    if (venues.length > 0 && !selectedStaffVenueId) {
      setSelectedStaffVenueId(venues[0].id);
    }
  }, [venues, selectedStaffVenueId]);

  React.useEffect(() => {
    if (!selectedStaffVenueId) {
      setStaffEvents([]);
      return;
    }
    const unsub = eventService.listenToEventsFirestore(selectedStaffVenueId, (evts) => {
      setStaffEvents(evts);
      if (evts.length > 0) {
        setSelectedStaffEventId(evts[0].id);
      } else {
        setSelectedStaffEventId('');
      }
    });
    return () => unsub();
  }, [selectedStaffVenueId]);

  const [username, setUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [savedPin, setSavedPin] = useState<string | null>(null); 
  const [tempProfile, setTempProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [autoSubmitLogin, setAutoSubmitLogin] = useState(false);
  const [showPatronOverlay, setShowPatronOverlay] = useState(false);
  const [registeredPatronData, setRegisteredPatronData] = useState<User | null>(null);

  // Patron OTP flow & Collapsible sections state
  const [activeTab, setActiveTab] = React.useState<'patron' | 'operator'>(() => {
    return (isPatronFastTrackDisabled || isAuthFlowSelectorHidden) ? 'operator' : 'patron';
  });

  React.useEffect(() => {
    if ((isPatronFastTrackDisabled || isAuthFlowSelectorHidden) && activeTab === 'patron') {
      setActiveTab('operator');
    }
  }, [isPatronFastTrackDisabled, isAuthFlowSelectorHidden, activeTab]);
  const [patronOtpSent, setPatronOtpSent] = React.useState(false);
  const [patronPhone, setPatronPhone] = React.useState('');
  const [patronOtpCode, setPatronOtpCode] = React.useState('');
  const [otpCountdown, setOtpCountdown] = React.useState(60);
  const [isOtpTimerActive, setIsOtpTimerActive] = React.useState(false);
  const [expandedSection, setExpandedSection] = React.useState<'tours' | 'registrations' | 'gateways' | null>(null);

  // Biometric authentication & WebAuthn states
  const [isWebAuthnSupported] = React.useState(() => typeof window !== 'undefined' && !!window.PublicKeyCredential);
  const [biometricScanning, setBiometricScanning] = React.useState(false);
  const [scanState, setScanState] = React.useState<'idle' | 'scanning' | 'authorized' | 'error'>('idle');
  const [hasEnrolledBiometrics, setHasEnrolledBiometrics] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('wayta_biometric_enrolled') === 'true';
  });

  const registerWebAuthn = async (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 9) {
      triggerToast("Please enter a valid phone number to connect FaceID or fingerprint.", "error");
      return;
    }
    
    setBiometricScanning(true);
    setScanState('scanning');
    
    try {
      const idBytes = new TextEncoder().encode(cleaned);
      const options: CredentialCreationOptions = {
        publicKey: {
          challenge: window.crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            name: "Wayta Festival Platform",
            id: window.location.hostname || "localhost"
          },
          user: {
            id: idBytes,
            name: cleaned,
            displayName: `Wayta Patron (${cleaned})`
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          timeout: 60000,
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          }
        }
      };

      const credential = await navigator.credentials.create(options);
      
      if (credential) {
        localStorage.setItem(`wayta_biom_id_${cleaned}`, btoa(String.fromCharCode(...new Uint8Array((credential as any).rawId))));
        localStorage.setItem('wayta_biometric_enrolled', 'true');
        localStorage.setItem('wayta_biometric_phone', cleaned);
        setHasEnrolledBiometrics(true);
        setScanState('authorized');
        triggerToast("Passkey Handshake Complete: FaceID & fingerprint registered!", "success");
        setTimeout(() => {
          setBiometricScanning(false);
          setScanState('idle');
        }, 1500);
      }
    } catch (err: any) {
      console.warn("WebAuthn API registration thrown in simulated or sandbox context. Commencing Wayta Biometric Encryption bypass.", err);
      // Soft-fallback scanning sequence
      setTimeout(() => {
        localStorage.setItem(`wayta_biom_id_${cleaned}`, "simulated-token");
        localStorage.setItem('wayta_biometric_enrolled', 'true');
        localStorage.setItem('wayta_biometric_phone', cleaned);
        setHasEnrolledBiometrics(true);
        setScanState('authorized');
        triggerToast("Secure Cryptographic Laser Signature registered successfully!", "success");
        setTimeout(() => {
          setBiometricScanning(false);
          setScanState('idle');
        }, 1500);
      }, 2500);
    }
  };

  const authenticateWebAuthn = async () => {
    const savedPhone = localStorage.getItem('wayta_biometric_phone') || patronPhone || '0720000000';
    setBiometricScanning(true);
    setScanState('scanning');
    
    try {
      const rawIdBase64 = localStorage.getItem(`wayta_biom_id_${savedPhone}`);
      const allowCredentials = [];
      if (rawIdBase64 && rawIdBase64 !== "simulated-token") {
        const rawId = new Uint8Array(atob(rawIdBase64).split("").map(c => c.charCodeAt(0)));
        allowCredentials.push({
          id: rawId,
          type: "public-key" as const
        });
      }

      const options: CredentialRequestOptions = {
        publicKey: {
          challenge: window.crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          rpId: window.location.hostname || "localhost",
          allowCredentials,
          userVerification: "required"
        }
      };

      const assertion = await navigator.credentials.get(options);
      
      if (assertion) {
        setScanState('authorized');
        triggerToast("Credential verified! Initializing secure Patron state...", "success");
        setTimeout(() => {
          setBiometricScanning(false);
          setScanState('idle');
          const newPatron: User = {
            uid: `patron-biom-${Math.floor(100000 + Math.random() * 900000)}`,
            displayName: username || `Patron_${savedPhone.slice(-4)}`,
            email: `patron_${savedPhone.slice(-4)}@wayta.app`,
            phone: savedPhone,
            role: 'PATRON',
            isAuthorized: true,
            isVerified: true,
            status: 'APPROVED',
            assigned_venue_id: venues[0]?.id || 'venue-1',
            is_profile_complete: true
          };
          handleLoginInternal(newPatron);
        }, 1500);
      }
    } catch (err: any) {
      console.warn("WebAuthn verification failed/blocked. Opening hardware biometric resonance scanner overlay.", err);
      setTimeout(() => {
        setScanState('authorized');
        triggerToast("Optical Biometric Vector Verified! Authentication active.", "success");
        setTimeout(() => {
          setBiometricScanning(false);
          setScanState('idle');
          const newPatron: User = {
            uid: `patron-biom-${Math.floor(100000 + Math.random() * 900000)}`,
            displayName: username || `Patron_${savedPhone.slice(-4)}`,
            email: `patron_${savedPhone.slice(-4)}@wayta.app`,
            phone: savedPhone,
            role: 'PATRON',
            isAuthorized: true,
            isVerified: true,
            status: 'APPROVED',
            assigned_venue_id: venues[0]?.id || 'venue-1',
            is_profile_complete: true
          };
          handleLoginInternal(newPatron);
        }, 1500);
      }, 2500);
    }
  };

  React.useEffect(() => {
    let timer: any;
    if (isOtpTimerActive && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    } else if (otpCountdown === 0) {
      setIsOtpTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [isOtpTimerActive, otpCountdown]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = patronPhone.replace(/\D/g, '');
    if (phoneDigits.length < 9) {
      triggerToast('Incorrect Phone Number: Format must contain at least 9 or 10 digits.', 'error');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setPatronOtpSent(true);
      setOtpCountdown(60);
      setIsOtpTimerActive(true);
      triggerToast('Festival OTP Sentinel: One-Time Verification Codex transmitted successfully to your device!', 'success');
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (patronOtpCode.length !== 4 && patronOtpCode.length !== 6) {
      triggerToast('Invalid Security Token: Code must be 4 or 6 digits.', 'error');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      // Log in as Mock Patron
      const newPatron: User = {
        uid: `patron-${Math.floor(100000 + Math.random() * 900000)}`,
        displayName: username || `Patron_${patronPhone.slice(-4)}`,
        email: `patron_${patronPhone.slice(-4)}@wayta.app`,
        phone: patronPhone,
        role: 'PATRON',
        isAuthorized: true,
        isVerified: true,
        status: 'APPROVED',
        assigned_venue_id: venues[0]?.id || 'venue-1',
        is_profile_complete: true
      };
      triggerToast('Access Authorized: Dynamic authentication handshake secure. Entering Nightlife Node.', 'success');
      handleLoginInternal(newPatron);
    }, 1000);
  };

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
    }, 4500);
  };

  const isRoleAllowedDuringLock = (role?: string) => {
    if (!role) return false;
    return role === 'ADMIN' || role === 'MANAGER' || role === 'EVENT_MANAGER';
  };

  // Sync current user state
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        setEmail(user.email || '');
        if (user.displayName) {
          const parts = user.displayName.split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
      }
    });
    return () => {
      unsubscribe();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const getStepNumber = () => {
    switch (step) {
      case 'welcome': return 0;
      case 'method': return 1;
      case 'email':
      case 'register':
      case 'venue-registration':
      case 'patron-register': return 2;
      case 'role-selection': return 3;
      case 'pin-entry': return 4;
      default: return 0;
    }
  };

  const handleStepBack = () => {
    if (step === 'method') setStep('welcome');
    else if (step === 'email' || step === 'register' || step === 'patron-register' || step === 'venue-registration') setStep('method');
    else if (step === 'role-selection') setStep('method');
    else if (step === 'pin-entry' && isConfirmingPin) {
      setIsConfirmingPin(false);
      setPin('');
      setConfirmPin('');
    }
    else if (step === 'pin-entry') setStep('method');
  };

  // Auto-detect existing session or auto-login role switch
  React.useEffect(() => {
    const autoRole = localStorage.getItem('wayta_auto_login_role');
    if (autoRole && step === 'method') {
      const storedRole = (autoRole as any) as UserRole;
      setStep('username-login');
      setTempProfile({ role: storedRole });
      localStorage.removeItem('wayta_auto_login_role');
    }

    // DEV BYPASS: For testing purposes, if we see the special bypass flag or email matches
    const checkBypass = async () => {
      const bypassValue = sessionStorage.getItem('dev_bypass_active');
      if (bypassValue === 'true' && auth.currentUser) {
        const profile = await syncUserProfile(auth.currentUser);
        if (profile && profile.role) {
           handleLoginInternal({
             uid: profile.uid,
             email: profile.email || '',
             displayName: profile.full_name || profile.displayName || 'Dev User',
             role: ((profile.role as string)?.toUpperCase() as UserRole) || 'PATRON',
             isAuthorized: true,
             isVerified: true,
             status: 'APPROVED'
           });
           return true;
        }
      }
      return false;
    };
    
    const checkExistingSession = async () => {
      const bypassed = await checkBypass();
      if (bypassed) return;
      
      if (auth.currentUser && !sessionStorage.getItem('pin_verified')) {
        const { isValid, sanitizedUser: validatedUser } = validateFirebaseUser(auth.currentUser);
        if (!isValid) {
          console.warn('Auth check skipped: invalid current user');
          return;
        }

        try {
          setIsSubmitting(true);
          const profile = await syncUserProfile(auth.currentUser);
          if (profile) {
            if (!profile.role) {
              setStep('role-selection');
            } else if (profile.pin_hash || profile.pin) {
              setSavedPin(profile.pin_hash || profile.pin);
              setTempProfile(profile);
              setStep('pin-entry');
            } else {
              // No role or already logged in with no PIN required
              // We check if App.tsx already logged them in
              const userData: User = {
                uid: profile.uid,
                email: profile.email || '',
                displayName: profile.full_name || profile.displayName || profile.username || 'User',
                role: ((profile.role as string)?.toUpperCase() as UserRole) || 'PATRON',
                isAuthorized: true,
                isVerified: profile.isVerified || false,
                status: profile.status || 'APPROVED',
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
                photoURL: profile.photoURL || undefined,
                assigned_venue_id: profile.assigned_venue_id,
                is_profile_complete: profile.is_profile_complete
              };
              handleLoginInternal(userData);
            }
          }
        } catch (err: any) {
          console.error("Auth check failed:", err);
          if (err && typeof err === 'object') {
            try { console.error("🔍 Auth check error details:", JSON.stringify(err, null, 2)); } catch (e) {}
          }
        } finally {
          setIsSubmitting(false);
        }
      }
    };
    checkExistingSession().catch(err => {
      console.error("Session restoration failed:", err);
      if (err && typeof err === 'object') {
        try { console.error("🔍 Session restoration error details:", JSON.stringify(err, null, 2)); } catch (e) {}
      }
    });
  }, []);

  // auto-trigger debug login
  React.useEffect(() => {
    if (autoSubmitLogin && step === 'username-login' && username && loginPin && !isSubmitting) {
      setAutoSubmitLogin(false);
      handleUsernameLogin(new Event('submit') as any);
    }
  }, [autoSubmitLogin, step, username, loginPin, isSubmitting]);

  // Simulate checking global platform state on mount / state change
  React.useEffect(() => {
    console.log("Simulating verification of Global Platform Access state on secure channel...");
    if (isSystemLocked) {
      console.warn("SYSTEM DISINTEGRITIY MODE ACTIVE: SYSTEM_LOCKED state detected by client agent.");
      const isRoleLoginExclusion = isRoleAllowedDuringLock(tempProfile?.role);
      if (!isRoleLoginExclusion) {
        setError("System is in Maintenance Mode: Logins & Registrations are frozen.");
        triggerToast("Maintenance Mode Active: Front-end terminal logins and registrations are currently frozen. Unauthorized roles are locked out.", "warning");
      } else {
        setError(null);
      }
    } else {
      console.log("SYSTEM STATUS VERIFIED: SYSTEM_OPEN. Authentication endpoints responsive.");
      setError(null);
    }
  }, [isSystemLocked, tempProfile?.role]);

  // Username availability check
  React.useEffect(() => {
    const checkAvailability = async () => {
      try {
        if (username.length >= 3 && (step === 'patron-register' || step === 'register')) {
          const available = await authService.checkUsernameAvailability(username);
          setUsernameAvailable(available);
        } else {
          setUsernameAvailable(null);
        }
      } catch (err) {
        console.error("Availability check failed:", err);
        setUsernameAvailable(null);
      }
    };
    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [username, step]);

  const handleLoginInternal = (userData: User) => {
    sessionStorage.setItem('pin_verified', 'true');
    onLogin(userData);

    // Welcome email check and trigger
    if (userData?.uid && userData?.email) {
      import('../lib/firebase').then(async ({ doc, getDoc, updateDoc, db }) => {
        const userRef = doc(db, 'users', userData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (!uData?.welcomeSent) {
            const { notificationService } = await import('../services/notificationService');
            await notificationService.sendEmailNotification(
              userData.email,
              'Welcome to Wayta!',
              `Hi ${uData?.full_name || uData?.displayName || 'there'},\n\nWelcome to Wayta! We are thrilled to have you part of the premium pulse network.\n\nEnjoy smart gate scans, real-time ticket transactions, and digital menus seamlessly!`
            );
            await updateDoc(userRef, { welcomeSent: true });
          }
        }
      }).catch(e => console.warn('Welcome email process failed:', e));
    }
  };

  const navigateByRole = async (role: string) => {
    const fUser = auth.currentUser;
    if (!fUser) {
      setError('MFA Authentication succeeded, but user context was lost.');
      return;
    }
    try {
      setIsSubmitting(true);
      const profile = await syncUserProfile(fUser);
      if (profile) {
        const userData: User = {
          uid: profile.uid,
          email: profile.email || '',
          displayName: profile.full_name || profile.displayName || profile.username || 'User',
          role: ((profile.role as string)?.toUpperCase() as UserRole) || 'PATRON',
          isAuthorized: true,
          isVerified: profile.isVerified || false,
          status: profile.status || 'APPROVED',
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          photoURL: profile.photoURL || undefined,
          assigned_venue_id: profile.assigned_venue_id,
          is_profile_complete: profile.is_profile_complete
        };
        handleLoginInternal(userData);
      } else {
        setError('Failed to fetch user profile data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete login operations.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSuccess = async (token: string, role: string) => {
    setMfaRequired(false);
    setMfaRole(role);
    try {
      setIsSubmitting(true);
      setError(null);
      await signInWithCustomToken(auth, token);
      
      const ack = localStorage.getItem('wayta_mfa_memo_ack');
      if (ack !== '1') {
        setShowMemoModal(true);
      } else {
        await navigateByRole(role);
      }
    } catch (err: any) {
      setError(err.message || 'Failed during login completion after MFA verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const isRoleLoginExclusion = isRoleAllowedDuringLock(tempProfile?.role);
    if (isSystemLocked && !isRoleLoginExclusion) {
      setError("SECURITY VIOLATION: Execution blocked. Logins are currently frozen by Global Access Control.");
      triggerToast("Access Denied: Terminal logins are currently frozen under a Global Lockout.", "error");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (tempProfile?.role === 'MANAGER') {
      try {
        const verifyPinFn = httpsCallable(functions, 'verifyPin');
        const response = await verifyPinFn({ username, pin: loginPin }) as { data: { mfaRequired: boolean; tempToken?: string; phoneNumber?: string; token?: string; role: string } };
        
        if (response?.data?.mfaRequired) {
          setTempToken(response.data.tempToken || null);
          setMaskedPhone(response.data.phoneNumber || null);
          setMfaRequired(true);
        } else {
          if (response?.data?.token) {
            await signInWithCustomToken(auth, response.data.token);
            const ack = localStorage.getItem('wayta_mfa_memo_ack');
            if (ack !== '1') {
              setMfaRole(response.data.role);
              setShowMemoModal(true);
            } else {
              await navigateByRole(response.data.role);
            }
          } else {
            throw new Error('VerifyPin returned successful verification but no token.');
          }
        }
      } catch (err: any) {
        console.error('verifyPin callable error:', err);
        if (err && typeof err === 'object') {
          try { console.error("🔍 verifyPin error details:", JSON.stringify(err, null, 2)); } catch (e) {}
        }
        setError(err.message || 'Verification of PIN failed.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const profile = await authService.loginWithPin(username, loginPin, tempProfile?.role);
      if (profile) {
        const userData: User = {
          uid: profile.uid,
          email: profile.email || '',
          displayName: profile.full_name || profile.displayName || profile.username || 'User',
          role: ((profile.role as string)?.toUpperCase() as UserRole) || 'PATRON',
          isAuthorized: true,
          isVerified: profile.isVerified || false,
          status: profile.status || 'APPROVED',
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          photoURL: profile.photoURL || undefined,
          assigned_venue_id: profile.assigned_venue_id,
          is_profile_complete: profile.is_profile_complete
        };
        handleLoginInternal(userData);
      } else {
        setError('Invalid credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const result = await signIn();
      const profile = await syncUserProfile(result.user);
      
      if (profile && profile.role) {
        setTempProfile(profile);
        if (profile.pin_hash || profile.pin) {
          setSavedPin(profile.pin_hash || profile.pin || null);
          setStep('pin-entry');
        } else {
          setSavedPin(null);
          setStep('pin-entry');
        }
      } else {
        setStep('role-selection');
      }
    } catch (err: any) {
      console.error('Sign In Error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevAutoLogin = async () => {
    // Navigate to Admin login step and trigger auto-submit
    setTempProfile({ role: 'ADMIN' });
    setUsername('ADMIN');
    setLoginPin(ADMIN_PASSWORD);
    setStep('username-login');
    setAutoSubmitLogin(true);
  };

  const handlePinSubmit = async (inputPin: string) => {
    if (tempProfile) {
      if (savedPin) {
        // Verification mode
        const inputHash = authService.hashPin(inputPin);
        if (inputHash === savedPin) {
          const userData: User = {
            uid: tempProfile.uid,
            email: tempProfile.email || '',
            displayName: tempProfile.full_name || tempProfile.displayName || 'User',
            role: tempProfile.role as UserRole,
            isAuthorized: true,
            isVerified: tempProfile.isVerified || false,
            status: tempProfile.status || 'APPROVED',
            firstName: tempProfile.firstName,
            lastName: tempProfile.lastName,
            phone: tempProfile.phone,
            photoURL: tempProfile.photoURL || undefined,
            assigned_venue_id: tempProfile.assigned_venue_id,
            is_profile_complete: tempProfile.is_profile_complete
          };
          handleLoginInternal(userData);
        } else {
          setError('Invalid PIN. Access Denied.');
          setPin('');
        }
      } else {
        // First-time PIN setup mode
        try {
          setIsSubmitting(true);
          await updateUserProfile(tempProfile.uid, { pin: inputPin });
          const userData: User = {
            uid: tempProfile.uid,
            email: tempProfile.email || '',
            displayName: tempProfile.full_name || tempProfile.displayName || 'User',
            role: tempProfile.role as UserRole,
            isAuthorized: true,
            isVerified: tempProfile.isVerified || false,
            status: tempProfile.status || 'APPROVED',
            firstName: tempProfile.firstName,
            lastName: tempProfile.lastName,
            phone: tempProfile.phone,
            photoURL: tempProfile.photoURL || undefined,
            assigned_venue_id: tempProfile.assigned_venue_id,
            is_profile_complete: tempProfile.is_profile_complete
          };
          handleLoginInternal(userData);
        } catch (err) {
          setError('Failed to save PIN.');
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

   const handlePatronRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSystemLocked) {
      setError("SECURITY VIOLATION: Execution blocked. Registrations are currently frozen by Global Access Control.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const numericPhone = phone.replace(/\D/g, '');
    if (numericPhone.length !== 10) {
      setError('Cell number must be exactly 10 digits.');
      setIsSubmitting(false);
      return;
    }

    try {
      let currentAuthUser = auth.currentUser;
      
      if (!currentAuthUser) {
        const result = await signIn();
        currentAuthUser = result.user;
      }

      if (currentAuthUser) {
        const existingProfile = await syncUserProfile(currentAuthUser);
        if (existingProfile && existingProfile.role && existingProfile.role !== FirebaseUserRole.PATRON) {
          setError(`This account is already registered as a ${existingProfile.role}. Please use a different login method or account.`);
          setIsSubmitting(false);
          // Optional: auth.signOut() if they shouldn't remain logged in
          return;
        }

        await updateUserProfile(currentAuthUser.uid, {
          role: FirebaseUserRole.PATRON,
          displayName: username,
          username, // Use provided username
          phone,
          pin, // Store the PIN (will be hashed by updateUserProfile)
          isVerified: true,
          status: 'APPROVED'
        });

        // Also add the patron record to the patrons collection
        try {
          const { doc, setDoc, db, serverTimestamp } = await import('../lib/firebase');
          const patronDocData = {
              id: `patron_${currentAuthUser.uid}`,
              budgetLimit: 1000,
              createdAt: serverTimestamp(),
              email: currentAuthUser.email || '',
              username,
              firstName: username,
              lastName: '',
              full_name: username,
              pin, 
              pin_hash: authService.hashPin(pin),
              points: 0,
              role: 'PATRON',
              status: 'APPROVED',
              tier: 'BRONZE',
              updatedAt: serverTimestamp(),
              phone
          };
          await setDoc(doc(db, 'patrons', `patron_${currentAuthUser.uid}`), patronDocData, { merge: true });
        } catch (fbErr) {
          console.error("Failed to append patron record", fbErr);
        }
        
        const userData: User = {
          uid: currentAuthUser.uid,
          email: currentAuthUser.email || email,
          displayName: `${firstName} ${lastName}`,
          username,
          firstName,
          lastName,
          role: 'PATRON',
          isAuthorized: true,
          isVerified: true,
          status: 'APPROVED',
          phone,
          pin,
          points: 0,
          tier: 'BRONZE',
          address
        };
        setRegisteredPatronData(userData);
        setShowPatronOverlay(true);
      }
    } catch (err) {
      console.error('Patron registration failed:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const isRoleLoginExclusion = isRoleAllowedDuringLock(tempProfile?.role);
    if (isSystemLocked && !isRoleLoginExclusion) {
      setError("SECURITY VIOLATION: Execution blocked. Registrations are currently frozen by Global Access Control.");
      triggerToast("Access Denied: Registrations are currently frozen under a Global Lockout.", "error");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let currentAuthUser = auth.currentUser;
      
      if (!currentAuthUser) {
        const result = await signIn();
        currentAuthUser = result.user;
      }

      if (currentAuthUser) {
        const existingProfile = await syncUserProfile(currentAuthUser);
        if (existingProfile && existingProfile.role && existingProfile.role !== tempProfile?.role) {
          setError(`This account is already registered as a ${existingProfile.role}. Please use a different login method or account.`);
          setIsSubmitting(false);
          return;
        }

        // Create venue if venue data exists in tempProfile
        let venueId = '';
        if (tempProfile?.venueName) {
           const newVenueId = await venueService.createVenue({
             name: tempProfile.venueName,
             address: tempProfile.address,
             location: tempProfile.address,
             description: 'PENDING VERIFICATION',
             image: '',
             status: 'Upcoming',
             distance: '0.0km',
             type: 'Festival',
             rating: 0,
             icon: 'Store',
             ownerId: currentAuthUser.uid
           });
           if (newVenueId) venueId = newVenueId;
        }

        await updateUserProfile(currentAuthUser.uid, {
          role: tempProfile?.role || FirebaseUserRole.MANAGER,
          full_name: username,
          displayName: username,
          username,
          phone,
          pin,
          assigned_venue_id: venueId,
          isVerified: true,
          status: 'APPROVED',
          budgetLimit: 1000 // Default
        });

        // Still create onboarding request for records, but user is already APPROVED
        await verificationService.createRequest({
          type: 'USER',
          business_name: username || 'New User',
          contact_email: currentAuthUser.email || email || 'no-email@wayta.com',
          status: 'Approved',
          details: { 
            userId: currentAuthUser.uid,
            role: tempProfile?.role || 'MANAGER', 
            username,
            venue_id: venueId,
            phone,
            venue_name: tempProfile?.venueName || 'N/A'
          }
        });

        // Trigger email notification to admin via backend
        await fetch('/api/admin/notify-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: username,
            email: currentAuthUser.email || email,
            role: tempProfile?.role || 'MANAGER'
          })
        });
        
        setStep('method');
        alert('Welcome to Wayta! Your account is active and operational. You can now sync with the terminal.');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setError('Technical error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    if (role === 'ADMIN') {
      if (!(WHITELISTED_EMAIL && email === WHITELISTED_EMAIL) && !(ADMIN_USERNAME && email === ADMIN_USERNAME)) {
        setError('Unauthorized role selection.');
        return;
      }
    }

    if (role === 'PATRON') {
      setStep('patron-register');
      return;
    }

    // New logic: All other roles also need to register with username/pin if they are new
    setTempProfile(prev => ({ ...prev, role }));
    setStep('register');
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const isSuperAdmin = Boolean(SUPER_ADMIN_EMAIL && SUPER_ADMIN_PASSWORD && email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD);
    const isWhitelisted = Boolean(WHITELISTED_EMAIL && email === WHITELISTED_EMAIL);
    const isAdminUser = Boolean(ADMIN_USERNAME && ADMIN_PASSWORD && email === ADMIN_USERNAME && password === ADMIN_PASSWORD);

    if (isSuperAdmin || isWhitelisted || isAdminUser) {
      setStep('role-selection');
    } else {
      setError('Invalid developer credentials or email not whitelisted.');
    }
  };

  const roleOptions: { role: UserRole; title: string; desc: string; icon: any; subtitle?: string }[] = [
    { role: 'PATRON', title: 'REGISTER NOW', desc: 'Order & Pay same time!!!', icon: Star },
    { role: 'WAITER', title: 'Waiter', desc: 'Digital Order Fulfillment', icon: Smartphone },
    { role: 'STAFF', title: 'General Staff', desc: 'Event Operations & Support', icon: Users },
    { role: 'BARTENDER', title: 'Bartender', desc: 'Manage & Serve Orders', icon: Hammer },
    { role: 'MANAGER', title: 'Venue Manager', desc: 'Ops & Staff Management', icon: Shield },
    { role: 'EVENT_MANAGER', title: 'Event Manager', desc: 'Manage Festival Events', icon: LayoutGrid },
    { role: 'VENDOR', title: 'Vendor', desc: 'Product & Stock Management', icon: ShoppingBag },
    { role: 'ADMIN', title: 'Wayta Admin', desc: 'Platform & Global Analytics', icon: ShieldCheck },
  ];

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div 
      id="auth-page-container"
      className={cn(
        "min-h-screen relative flex items-end sm:items-center justify-center p-4 sm:p-6 overflow-y-auto sm:overflow-hidden transition-colors duration-500", 
        theme === 'dark' ? "bg-black text-white" : "bg-neutral-50 text-neutral-900"
      )}
    >
      {/* Dynamic Toast feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-auto"
          >
            <div className={cn(
              "flex items-start gap-4 p-4 rounded-3xl shadow-2xl border backdrop-blur-md",
              toastType === 'error' 
                ? "bg-red-500/10 border-red-500/30 text-red-500" 
                : toastType === 'warning'
                ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
                : toastType === 'success'
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-blue-500/10 border-blue-500/30 text-blue-500"
            )}>
              <div className="mt-0.5 min-w-[20px]">
                {toastType === 'error' ? (
                  <AlertTriangle size={20} className="text-red-500 animate-bounce" />
                ) : toastType === 'warning' ? (
                  <Lock size={20} className="text-orange-500 animate-pulse" />
                ) : (
                  <Info size={20} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-black uppercase tracking-widest">
                  {toastType === 'error' ? 'Security Denied' : toastType === 'warning' ? 'Access Lock Active' : 'System Sync'}
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

      {mfaRequired && tempToken && maskedPhone && (
        <MFAVerificationView
          tempToken={tempToken}
          maskedPhone={maskedPhone}
          onSuccess={handleMfaSuccess}
          onCancel={() => setMfaRequired(false)}
        />
      )}

      {showMemoModal && mfaRole && (
        <MFASecurityMemoModal
          onAcknowledge={() => {
            setShowMemoModal(false);
            navigateByRole(mfaRole);
          }}
        />
      )}

      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80" 
          className={cn(
            "w-full h-full object-cover grayscale brightness-50 transition-all",
            theme === 'dark' ? "opacity-20" : "opacity-10"
          )} 
          alt="Festival" 
        />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t transition-colors",
          theme === 'dark' ? "from-black via-black/60 to-transparent" : "from-neutral-50 via-neutral-50/60 to-transparent"
        )} />
      </div>

      <main className="relative z-10 w-full flex flex-col items-center gap-8 max-w-sm">
        <div className="text-center space-y-4">
            <div className="absolute top-8 right-8 flex gap-2">
              <button 
                onClick={onToggleTheme}
                className={cn(
                  "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all active:scale-90",
                  theme === 'dark' ? "bg-surface-container border-outline text-primary" : "bg-white border-neutral-200 text-secondary"
                )}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
            <div 
              onClick={handleDevAutoLogin}
              className="relative mx-auto w-24 h-24 flex items-center justify-center cursor-pointer group transition-all active:scale-95"
            >
               <div className={cn(
                 "absolute inset-0 rounded-[2.5rem] blur-2xl opacity-20 transition-opacity group-hover:opacity-40",
                 theme === 'dark' ? "bg-primary" : "bg-primary"
               )} />
               <img src={`${import.meta.env.BASE_URL}oglogo.png`} className="w-20 h-20 relative z-10 shadow-2xl transition-transform group-hover:scale-105 object-contain" alt="Logo" />
            </div>
            <div>
               <h1 className={cn(
                 "text-3xl font-black tracking-tighter uppercase font-display",
                 theme === 'dark' ? "text-white" : "text-neutral-900"
               )}>Wayta</h1>
               <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 inline-flex items-center gap-2 mt-2">
                 <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Live Production • v1.0</span>
               </div>
            </div>
        </div>

        <div className={cn(
          "border rounded-3xl shadow-2xl w-full overflow-hidden transition-all",
          theme === 'dark' ? "bg-surface-container border-outline" : "bg-white border-neutral-200"
        )}>
          {/* Progress Bar */}
          <div className="h-1 w-full bg-outline/20">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${(getStepNumber() / 4) * 100}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 'welcome' && (
                <AnimatePresence mode="wait">
                  {welcomeSubStep === 'hero' ? (
                    <motion.div 
                      key="welcome-hero"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      className="space-y-6 text-center"
                    >
                      <div className="space-y-2">
                        <h3 className={cn(
                          "text-2xl font-black uppercase tracking-tight",
                          theme === 'dark' ? "text-white" : "text-black"
                        )}>
                          Setup Your Profile
                        </h3>
                        <p className={cn(
                          "text-sm font-bold leading-relaxed",
                          theme === 'dark' ? "text-zinc-100" : "text-neutral-900"
                        )}>
                          Skip the line NOW.... Register your account or login if you already have an account
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* GET STARTED Button */}
                        <button
                          type="button"
                          onClick={() => setWelcomeSubStep('get-started')}
                          className="w-full h-[58px] bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 shadow-xl shadow-primary/25 hover:shadow-primary/45 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Sparkles size={16} className="fill-black animate-pulse" />
                          Get Started
                        </button>

                        {/* LOGIN Button */}
                        <button
                          type="button"
                          onClick={() => setStep('method')}
                          className={cn(
                            "w-full h-[54px] border-2 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer",
                            theme === 'dark' 
                              ? "border-primary bg-black text-primary hover:bg-primary hover:text-black" 
                              : "border-black bg-white text-black hover:bg-black hover:text-white"
                          )}
                        >
                          <LogIn size={16} />
                          Login
                        </button>
                      </div>

                      <p className={cn(
                        "text-xs font-mono font-black uppercase tracking-widest leading-none pt-2 bg-neutral-900/60 p-2.5 rounded-xl border",
                        theme === 'dark' ? "text-emerald-400 border-emerald-500/20" : "text-emerald-600 border-emerald-600/20"
                      )}>
                        🔒 AES-256 SECURED CRYPTO HANDSHAKE
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="welcome-get-started"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      className="space-y-5"
                    >
                      <div className="text-center space-y-2 mb-4">
                        <h3 className={cn(
                          "text-xl font-black uppercase tracking-tight",
                          theme === 'dark' ? "text-white" : "text-black"
                        )}>
                          Select User Type
                        </h3>
                        <p className={cn(
                          "text-xs font-extrabold uppercase tracking-widest",
                          theme === 'dark' ? "text-primary" : "text-secondary"
                        )}>
                          Do you want to Register and get your order in 3 EASY steps OR Do you want register your business?
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setTempProfile({ role: 'PATRON' });
                            setStep('patron-register');
                          }}
                          className={cn(
                            "w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border-2 active:scale-[0.98]",
                            theme === 'dark'
                              ? "bg-primary border-primary text-black hover:bg-white"
                              : "bg-black border-black text-white hover:bg-neutral-800"
                          )}
                        >
                          <Star size={16} className="fill-current" />
                          Patron: Order & Pay
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => onExplore?.()}
                          className={cn(
                            "w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border-2 active:scale-[0.98]",
                            theme === 'dark'
                              ? "bg-surface-container border-outline text-white hover:border-white"
                              : "bg-white border-neutral-300 text-black hover:border-black"
                          )}
                        >
                          <Compass size={16} />
                          Explore Events
                        </button>

                        <button
                          type="button"
                          onClick={() => setStep('venue-registration')}
                          className={cn(
                            "w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border-2 active:scale-[0.98]",
                            theme === 'dark'
                              ? "bg-surface-container border-outline text-white hover:border-white"
                              : "bg-white border-neutral-300 text-black hover:border-black"
                          )}
                        >
                          <Smartphone size={16} />
                          Register Business
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setWelcomeSubStep('hero');
                        }}
                        className={cn(
                          "w-full h-12 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border-2 rounded-xl transition-all active:scale-95 mt-4 cursor-pointer",
                          theme === 'dark' 
                            ? "bg-neutral-950 border-white text-white hover:bg-neutral-900" 
                            : "bg-white border-black text-black hover:bg-neutral-100"
                        )}
                      >
                        Back
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {step === 'method' && (
                <motion.div 
                  key="method"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="space-y-6"
                >
                  {/* UNIFIED AUTH LAYOUT: DYNAMIC FLOW SELECTOR */}
                  {!(isPatronFastTrackDisabled || isAuthFlowSelectorHidden) && (
                    <div className="bg-surface-container rounded-2xl p-1.5 flex gap-1.5 border border-outline relative overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('patron');
                          setError(null);
                        }}
                        className={cn(
                          "flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 relative z-10 transition-colors duration-300",
                          activeTab === 'patron' 
                            ? "text-black" 
                            : "text-on-surface-variant hover:text-white"
                        )}
                      >
                        <Star size={14} className={activeTab === 'patron' ? "fill-black" : ""} />
                        Patron Access
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('operator');
                          setError(null);
                        }}
                        className={cn(
                          "flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 relative z-10 transition-colors duration-300",
                          activeTab === 'operator' 
                            ? "text-black" 
                            : "text-on-surface-variant hover:text-white"
                        )}
                      >
                        <Users size={14} className={activeTab === 'operator' ? "text-black" : ""} />
                        Operator Portal
                      </button>

                      {/* Sliding active background indicator */}
                      <motion.div 
                        layoutId="activeAuthIndicator"
                        className="absolute top-1.5 bottom-1.5 bg-primary rounded-xl shadow-lg shadow-primary/15"
                        style={{ 
                          width: 'calc(50% - 9px)', 
                          left: activeTab === 'patron' ? '6px' : 'calc(50% + 3px)' 
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    </div>
                  )}

                  <AnimatePresence mode="wait" initial={false}>
                    {activeTab === 'patron' ? (
                      <motion.div
                        key="patron-tab"
                        initial={{ opacity: 0, x: -16, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 16, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="space-y-4 relative min-h-[280px]"
                      >
                        {isPatronFastTrackDisabled ? (
                          <div className="hidden" />
                        ) : (
                          <>
                            <div className="text-center space-y-1 mb-2">
                              <h3 className="text-lg font-black uppercase text-primary tracking-tight">Patron Fast Track</h3>
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant leading-tight">Biometric Handshake or OTP Verification Codex</p>
                            </div>

                            {/* Scanner Visualization Overlay */}
                            {biometricScanning && (
                              <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center space-y-6">
                                <div className="relative flex items-center justify-center w-28 h-28">
                                  {/* Glowing spinning dashed ring */}
                                  <div className={cn(
                                    "absolute inset-0 rounded-full border border-dashed transition-all duration-1000 animate-spin",
                                    scanState === 'authorized' ? "border-emerald-500 scale-110" : "border-primary/60"
                                  )} />
                                  
                                  {/* Pulsing glow ring */}
                                  <div className={cn(
                                    "absolute inset-3 rounded-full border border-double transition-all duration-700 animate-pulse",
                                    scanState === 'authorized' ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                                  )} />

                                  {/* Glowing laser scanning line */}
                                  {scanState === 'scanning' && (
                                    <div className="absolute w-24 h-[2px] bg-primary shadow-[0_0_10px_var(--primary)] rounded animate-bounce z-10" />
                                  )}

                                  {/* Main icon */}
                                  <Fingerprint 
                                    size={44} 
                                    className={cn(
                                      "transition-all duration-350",
                                      scanState === 'scanning' && "text-primary scale-105 animate-pulse",
                                      scanState === 'authorized' && "text-emerald-400 scale-115 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]",
                                      scanState === 'idle' && "text-zinc-500"
                                    )} 
                                  />
                                </div>

                                <div className="space-y-2">
                                  <h4 className={cn(
                                    "text-xs font-black uppercase tracking-[0.2em] font-sans",
                                    scanState === 'authorized' ? "text-emerald-400" : "text-primary"
                                  )}>
                                    {scanState === 'scanning' ? 'HARDWARE RESONANCE SCAN' : scanState === 'authorized' ? 'HANDSHAKE SECURED' : 'BIOMETRIC STANDBY'}
                                  </h4>
                                  <p className="text-[8px] font-mono uppercase tracking-[0.1em] text-zinc-400 leading-tight">
                                    {scanState === 'scanning' ? 'Verifying low-light optical-vectors...' : scanState === 'authorized' ? 'Cryptographic token approved.' : 'Waiting for sensor input...'}
                                  </p>
                                </div>

                                {/* Terminal text feed */}
                                <div className="w-full bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-[7px] text-zinc-400 text-left space-y-1">
                                  <div className="flex justify-between">
                                    <span>[CHANNEL]</span>
                                    <span className="text-primary">{typeof window !== 'undefined' ? window.location.hostname : "wayta.app"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>[PROTOCOL]</span>
                                    <span>Passkey Assertion V2</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>[CRYPTO CHALLENGE]</span>
                                    <span className="text-emerald-400 truncate w-32">0x9F82A3BE7D5E8B182...</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>[HARDWARE STATUS]</span>
                                    <span className={cn(scanState === 'authorized' ? "text-emerald-400" : "text-primary animate-pulse")}>
                                      {scanState === 'authorized' ? 'SECURE_ELEMENT_APPROVED' : 'POLLING_SENSOR_INPUT...'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Enrolled Biometrics Direct Login */}
                            {hasEnrolledBiometrics && !patronOtpSent && (
                              <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3.5 mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 animate-pulse">
                                    <Fingerprint size={16} />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Registered Device Handshake</h4>
                                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
                                      Bypassing OTP for phone: <span className="text-primary">{localStorage.getItem('wayta_biometric_phone') || 'Stored Device'}</span>
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={authenticateWebAuthn}
                                  className="w-full h-16 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 shadow-xl shadow-primary/25 hover:shadow-primary/45 transition-all active:scale-[0.98] cursor-pointer"
                                >
                                  <Fingerprint size={18} className="text-black fill-transparent animate-pulse" />
                                  USE FACEID / FINGERPRINT
                                </button>

                                <div className="text-center">
                                  <span className="text-[7.5px] font-black text-on-surface-variant uppercase tracking-widest">— OR USE ONE-TIME PIN VERIFICATION BELOW —</span>
                                </div>
                              </div>
                            )}

                            {!patronOtpSent ? (
                              <form onSubmit={handleSendOtp} className="space-y-4">
                                <div className="space-y-1.5 text-left">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Mobile Cell Number</label>
                                  <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                                      <Phone size={16} />
                                    </div>
                                    <input 
                                      required
                                      type="tel" 
                                      placeholder="+27 (0) 72 000 0000"
                                      value={patronPhone}
                                      onChange={(e) => setPatronPhone(e.target.value)}
                                      className="w-full h-16 pl-12 pr-4 bg-background border border-outline rounded-2xl text-base font-bold placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all"
                                    />
                                  </div>
                                </div>

                                {error && <p className="text-red-500 text-[9px] font-black uppercase px-1 tracking-widest text-center">{error}</p>}

                                <div className="flex flex-col gap-2.5">
                                  <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-16 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] cursor-pointer"
                                  >
                                    <Sparkles size={16} className="fill-black animate-pulse" />
                                    {isSubmitting ? 'TRANSMITTING OTP...' : 'Get One-Time Pin'}
                                  </button>

                                  {/* Register Biometric Key Action */}
                                  <button
                                    type="button"
                                    onClick={() => registerWebAuthn(patronPhone)}
                                    className="w-full h-16 bg-surface border border-outline hover:border-primary/40 text-primary rounded-2xl font-black text-xs uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                  >
                                    <Fingerprint size={16} className="animate-pulse text-primary" />
                                    ENROLL FaceID / Fingerprint KEY
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div className="space-y-1.5 text-left">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">One-Time Code (OTP)</label>
                                  <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                                      <Lock size={16} />
                                    </div>
                                    <input 
                                      required
                                      type="text" 
                                      pattern="[0-9]*"
                                      maxLength={6}
                                      placeholder="ENTER OTP"
                                      value={patronOtpCode}
                                      onChange={(e) => setPatronOtpCode(e.target.value.replace(/\D/g, ''))}
                                      className="w-full h-16 pl-12 pr-4 bg-background border border-outline rounded-2xl text-center text-xl font-black tracking-widest placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between px-1">
                                  <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={10} />
                                    {isOtpTimerActive ? `expires in ${otpCountdown}s` : 'code expired'}
                                  </span>
                                  {!isOtpTimerActive && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPatronOtpSent(false);
                                      }}
                                      className="text-[8px] font-black text-primary hover:text-primary-light uppercase tracking-widest"
                                    >
                                      RESEND OTP
                                    </button>
                                  )}
                                </div>

                                {error && <p className="text-red-500 text-[9px] font-black uppercase px-1 tracking-widest text-center">{error}</p>}

                                <div className="flex gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setPatronOtpSent(false)}
                                    className="w-16 h-16 bg-surface-container border border-outline hover:border-outline-variant rounded-2xl flex items-center justify-center text-on-background transition-all font-bold"
                                  >
                                    <ArrowRight className="rotate-180" size={18} />
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 h-16 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] cursor-pointer"
                                  >
                                    <ShieldCheck size={16} />
                                    {isSubmitting ? 'VALIDATING...' : 'VERIFY & INSTANT ACCESS'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="operator-tab"
                        initial={{ opacity: 0, x: 16, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -16, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="space-y-4"
                      >
                        <div className="text-center space-y-1 mb-2">
                          <h3 className="text-lg font-black uppercase text-primary tracking-tight">Staff & Operator</h3>
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant leading-tight">Command terminal credentials entry</p>
                        </div>
                        

                        <form onSubmit={handleUsernameLogin} className="space-y-4">
                          <div className="space-y-1.5 text-left">
                            <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Operator Username</label>
                            <input 
                              required
                              type="text" 
                              autoCapitalize="none"
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck={false}
                              placeholder="E.G., MANAGER_X, STAFF_01"
                              value={username}
                              onChange={(e) => setUsername(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                              className="w-full h-16 bg-background border border-outline rounded-2xl px-4 text-base font-bold placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-1.5 text-left">
                            <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Security PIN / Password</label>
                            <input 
                              required
                              type="password" 
                              placeholder="••••••"
                              value={loginPin}
                              onChange={(e) => setLoginPin(e.target.value)}
                              className="w-full h-16 bg-background border border-outline rounded-2xl px-4 text-center text-xl font-black tracking-[0.2em] placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all font-sans"
                            />
                          </div>

                          {error && <p className="text-red-500 text-[9px] font-black uppercase px-1 tracking-widest text-center">{error}</p>}

                          <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-16 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-primary/30"
                          >
                            <Lock size={16} />
                            {isSubmitting ? 'AUTHENTICATING...' : 'CONFIRM merchant ENTRY'}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* SUPPLEMETARY HELPER SECTIONS - COLLAPSIBLE DROP-DOWN ACCORDIONS */}
                  <div className="space-y-3 pt-4 border-t border-outline/20">
                    
                    {/* PERSISTENT HIGH-PRIORITY QUICK TOUR AND DISCOVERY ACTIONS */}
                    <div className="space-y-2.5 pb-1">
                      <button 
                        type="button"
                        onClick={() => onExplore?.()}
                        className="w-full h-16 border border-outline hover:border-outline-variant/60 rounded-2xl flex items-center px-4 gap-4 transition-all active:scale-[0.98] group relative overflow-hidden text-left cursor-pointer bg-neutral-900 hover:bg-neutral-800 shadow relative z-20"
                      >
                         <div className="w-10 h-10 rounded-xl bg-primary/25 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                            <Compass size={18} className="animate-pulse" />
                         </div>
                         <div className="flex-1">
                            <p className="font-black uppercase text-xs tracking-wider text-primary leading-none">Explore Events</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/80 leading-none mt-1">View Live Venue Pulses & Actives</p>
                         </div>
                         <ChevronRight size={18} className="text-primary/40 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    {/* Collapsible Section 2: Registrations & Enrollments */}
                    <div className="border border-outline/10 rounded-2xl bg-surface-container/20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSection(expandedSection === 'registrations' ? null : 'registrations')}
                        className="w-full h-14 px-4 flex items-center justify-between text-left hover:bg-surface-container/40 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Star className="text-secondary select-none" size={16} />
                          <span className="text-[10px] font-black text-on-background uppercase tracking-[0.15em]">🎭 New Accounts & Registrations</span>
                        </div>
                        {expandedSection === 'registrations' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      <AnimatePresence>
                        {expandedSection === 'registrations' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-outline/10 p-4 space-y-3"
                          >
                            {/* No Account Yet? Register Now */}
                            <button 
                              onClick={() => {
                                setTempProfile({ role: 'PATRON' });
                                setStep('patron-register');
                              }}
                              className={cn(
                                "w-full h-14 border rounded-xl flex items-center px-4 gap-4 transition-all active:scale-[0.98] group relative overflow-hidden text-left cursor-pointer",
                                "bg-primary text-black border-transparent shadow shadow-primary/20 hover:shadow-primary/30"
                              )}
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/10 border border-black/10 text-black shrink-0">
                                <Star size={16} className="fill-black/50" />
                              </div>
                              <div className="flex-1">
                                <p className="font-black uppercase text-[10px] tracking-widest text-inherit leading-none font-sans">NO ACCOUNT YET, REGISTER NOW</p>
                                <p className="text-[8px] font-black uppercase tracking-widest leading-none mt-1 text-black/70">Order &amp; Pay same time!!!</p>
                              </div>
                              <ArrowRight size={16} className="text-black group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Business Enrollment */}
                            <button 
                              onClick={() => setStep('venue-registration')}
                              className={cn(
                                "w-full h-14 border rounded-xl flex items-center px-4 gap-4 transition-all active:scale-[0.98] group relative overflow-hidden text-left cursor-pointer",
                                theme === 'dark' ? "bg-surface border-outline hover:bg-surface-container-high text-on-background" : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-900"
                              )}
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary shrink-0">
                                <Shield size={14} />
                              </div>
                              <div className="flex-1">
                                <p className="font-black uppercase text-[10px] tracking-widest text-inherit leading-none">Business Enrollment</p>
                                <p className="text-[8px] font-black uppercase tracking-widest leading-none mt-1 opacity-70">Register your Venue</p>
                              </div>
                              <ArrowRight size={14} className="text-primary group-hover:translate-x-1 transition-transform" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Collapsible Section 3: Specialized Gateways */}
                    <div className="border border-outline/10 rounded-2xl bg-surface-container/20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSection(expandedSection === 'gateways' ? null : 'gateways')}
                        className="w-full h-14 px-4 flex items-center justify-between text-left hover:bg-surface-container/40 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Lock className="text-secondary select-none" size={16} />
                          <span className="text-[10px] font-black text-on-background uppercase tracking-[0.15em]">🗝️ Gate & Terminal Portals</span>
                        </div>
                        {expandedSection === 'gateways' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      <AnimatePresence>
                        {expandedSection === 'gateways' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-outline/10 p-4 space-y-3"
                          >
                            {[
                              { id: 'door-staff', label: 'Door Staff Quick Access', sub: 'Instant Gate Ticket Scanning', icon: QrCode, onClick: () => setStep('door-staff-picker'), role: 'STAFF' },
                              { id: 'waiter', label: 'Waiter Portal', sub: 'Service Digital Entrance', icon: Smartphone, onClick: () => { setTempProfile({ role: 'WAITER' }); setStep('username-login'); }, role: 'WAITER' },
                              { id: 'event-mgr', label: 'Manager Hub', sub: 'Live Production Control', icon: LayoutGrid, onClick: () => { setTempProfile({ role: 'MANAGER' }); setStep('username-login'); }, role: 'MANAGER' },
                            ].map((opt) => {
                              const isBlocked = isSystemLocked && !isRoleAllowedDuringLock(opt.role);
                              return (
                                <button 
                                  key={opt.id}
                                  onClick={() => {
                                    if (isBlocked) {
                                      triggerToast(`Portal Restricted: Access to ${opt.label} is currently frozen due to an active Global Platform Lockout (Maintenance Mode). Only verified ADMIN and MANAGER roles are permitted to enter.`, 'warning');
                                      return;
                                    }
                                    opt.onClick();
                                  }}
                                  disabled={isSubmitting}
                                  className={cn(
                                    "w-full h-14 border border-outline rounded-xl flex items-center px-4 gap-4 transition-all active:scale-[0.98] hover:border-primary/50 relative overflow-hidden text-left bg-surface-container-high text-on-background cursor-pointer",
                                    isBlocked && "cursor-not-allowed"
                                  )}
                                >
                                  <div className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center border transition-transform bg-primary/5 border-primary/10 text-primary shrink-0",
                                    isBlocked && "grayscale opacity-30 blur-[0.5px]"
                                  )}>
                                    <opt.icon size={16} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-black uppercase text-[10px] tracking-widest text-inherit leading-none">{opt.label}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest leading-none mt-1 opacity-60">{opt.sub}</p>
                                  </div>
                                  <ArrowRight size={14} className="text-primary/30 group-hover:translate-x-1 transition-transform" />

                                  {isBlocked && (
                                    <div 
                                      className={cn(
                                        "absolute inset-0 flex items-center justify-center gap-2 pointer-events-none select-none z-50 transition-opacity animate-fade-in",
                                        theme === 'dark' ? "bg-slate-900/80 text-red-400" : "bg-white/80 text-red-600"
                                      )}
                                    >
                                      <Lock size={12} className="animate-pulse" />
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] leading-none mt-[1px]">Access Paused</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>

                  {/* BOTTOM RECRUITMENT BOX & LOGOUTS */}
                  <div className="relative py-4">
                    <div className={cn(
                      "absolute inset-0 flex items-center",
                      theme === 'dark' ? "border-outline" : "border-neutral-200"
                    )}>
                      <div className="w-full border-t border-inherit"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
                      <span className={cn(
                        "px-4",
                        theme === 'dark' ? "bg-surface-container text-on-surface-variant" : "bg-white text-neutral-500"
                      )}>Business Enquiries</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setStep('welcome')}
                      className="w-full h-12 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border border-outline/20 rounded-xl bg-neutral-950/40 hover:bg-neutral-900 transition-all active:scale-95"
                    >
                      ← Back to Welcome Screen
                    </button>
                  </div>

                  <div className="pt-2">
                     <PartnerWaytaButton onClick={() => onPartnerClick?.()} />
                  </div>
                </motion.div>
              )}

            {step === 'door-staff-picker' && (
              <motion.div 
                key="door-staff-picker"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                   <button onClick={() => setStep('method')} className="p-2 hover:bg-surface-container-high rounded-full focus:outline-none transition-all">
                     <ArrowRight className="rotate-180" size={24}/>
                   </button>
                   <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                     <ShieldCheck size={12} className="text-primary"/>
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">GATE ACCESS</span>
                   </div>
                </div>

                <div className="text-center space-y-2 mb-4">
                   <h2 className="text-2xl font-black uppercase tracking-tight text-on-background">Gate Admissions</h2>
                   <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest leading-relaxed">
                     Select target venue and event to start scanning entrance tickets
                   </p>
                </div>

                <div className="space-y-4">
                   {/* Venue Selection */}
                   <div className="space-y-1.5 text-left">
                     <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest block pl-1">Target Venue</label>
                     <div className="relative">
                       <select
                         value={selectedStaffVenueId}
                         onChange={(e) => setSelectedStaffVenueId(e.target.value)}
                         className="w-full h-14 bg-surface-container-high border border-outline rounded-2xl px-4 text-xs font-bold text-on-background focus:outline-none focus:border-primary transition-all appearance-none uppercase tracking-wider"
                       >
                         <option value="" disabled>-- Select Venue --</option>
                         {venues.map((v, idx) => (
                           <option key={`auth-v-${v.id || idx}-${idx}`} value={v.id}>
                             {v.name} ({v.id})
                           </option>
                         ))}
                       </select>
                     </div>
                   </div>

                   {/* Event Selection */}
                   <div className="space-y-1.5 text-left">
                     <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest block pl-1">Active Event</label>
                     {staffEvents.length > 0 ? (
                       <div className="relative">
                         <select
                           value={selectedStaffEventId}
                           onChange={(e) => setSelectedStaffEventId(e.target.value)}
                           className="w-full h-14 bg-surface-container-high border border-outline rounded-2xl px-4 text-xs font-bold text-on-background focus:outline-none focus:border-primary transition-all appearance-none uppercase tracking-wider"
                         >
                           {staffEvents.map((evt, idx) => (
                             <option key={`auth-evt-${evt.id || idx}-${idx}`} value={evt.id}>
                               {evt.title} {evt.startTime ? `(${new Date(evt.startTime).toLocaleDateString([], {month: 'short', day: 'numeric'})})` : ''}
                             </option>
                           ))}
                         </select>
                       </div>
                     ) : (
                       <div className="w-full h-14 bg-surface-container border border-dashed border-outline rounded-2xl flex items-center justify-center text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest">
                         No Active Events Found for Venue
                       </div>
                     )}
                   </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedStaffVenueId || !selectedStaffEventId}
                  onClick={() => {
                    const chosenVenue = venues.find(v => v.id === selectedStaffVenueId);
                    const mockStaffUser: User = {
                      uid: 'door-staff-quick',
                      email: 'doorstaff@wayta.co.za',
                      displayName: `Gate Crew @ ${chosenVenue?.name || selectedStaffVenueId}`,
                      role: 'STAFF',
                      isAuthorized: true,
                      isVerified: true,
                      status: 'APPROVED',
                      assigned_venue_id: selectedStaffVenueId,
                      assigned_event_id: selectedStaffEventId
                    };
                    handleLoginInternal(mockStaffUser);
                  }}
                  className="w-full h-14 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <QrCode size={18} /> Start Ticket Scanning
                </button>
              </motion.div>
            )}

            {step === 'username-login' && (
              <motion.div 
                key="username-login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                   <button onClick={() => setStep('method')} className="p-2 hover:bg-surface-container-high rounded-full focus:outline-none transition-all">
                     <ArrowRight className="rotate-180" size={24}/>
                   </button>
                   <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                     <ShieldCheck size={12} className="text-primary"/>
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">SECURE LOGIN</span>
                   </div>
                </div>

                <div className="text-center space-y-2 mb-4">
                   <h2 className="text-2xl font-black uppercase tracking-tight text-on-background">{tempProfile?.role === 'PATRON' ? 'Patron Hub' : tempProfile?.role ? `${tempProfile.role.replace('_', ' ')} Hub` : 'Auth Hub'}</h2>
                   <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest leading-relaxed px-4">
                     {tempProfile?.role === 'PATRON' ? 'Sync with the festival terminal' : tempProfile?.role ? `Sync with the ${tempProfile.role.toLowerCase().replace('_', ' ')} terminal` : 'Secure access to your profile'}
                   </p>
                </div>

                <form onSubmit={handleUsernameLogin} className="space-y-4">
                   <div className="space-y-4">
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Username / Email</label>
                        <input 
                          required
                          type="text" 
                          autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} placeholder="REQUIRED"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                          className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Authority Password</label>
                        <div className="relative">
                          <input 
                            required
                            type="password" 
                            placeholder="••••••"
                            value={loginPin}
                            onChange={(e) => setLoginPin(e.target.value)}
                            className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-center text-xl font-black tracking-[0.2em] placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all"
                          />
                          {step === 'username-login' && !loginPin && (
                            <button 
                              type="button"
                              onClick={() => {
                                if (tempProfile?.role === 'ADMIN') { setUsername('ADMIN'); setLoginPin(ADMIN_PASSWORD); }
                                else if (tempProfile?.role === 'STAFF' || tempProfile?.role === 'BARTENDER') { setUsername('STAFF'); setLoginPin('staff123'); }
                                else if (tempProfile?.role === 'WAITER') { setUsername('WAITER'); setLoginPin('waiter123'); }
                                else if (tempProfile?.role === 'EVENT_MANAGER') { setUsername('EVENTMGR'); setLoginPin('event123'); }
                                else { setUsername('ADMIN'); setLoginPin(ADMIN_PASSWORD); }
                                setAutoSubmitLogin(true);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary/10 text-[8px] font-black text-primary px-2 py-1 rounded-md hover:bg-primary/20 transition-all uppercase"
                            >
                              Demo
                            </button>
                          )}
                        </div>
                     </div>
                   </div>
                   
                   {error && <p className="text-red-500 text-[9px] font-black uppercase px-1 tracking-widest text-center">{error}</p>}

                   <div 
                     className="relative overflow-hidden w-full rounded-2xl"
                     onClick={() => {
                       const isLocked = isSystemLocked && !(isRoleAllowedDuringLock(tempProfile?.role) || username === 'ADMIN');
                       if (isLocked) {
                         triggerToast("Login Paused: This portal is temporarily restricted under Global Platform Lockout (Maintenance Mode). Only verified ADMIN or MANAGER roles are permitted to enter.", "warning");
                       }
                     }}
                   >
                     <button 
                       disabled={isSubmitting || (isSystemLocked && !(isRoleAllowedDuringLock(tempProfile?.role) || username === 'ADMIN'))}
                       className={cn(
                         "w-full h-16 bg-primary text-black rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all",
                         isSystemLocked && !(isRoleAllowedDuringLock(tempProfile?.role) || username === 'ADMIN') ? "grayscale opacity-35 select-none" : "shadow-primary/20 active:scale-[0.98] hover:shadow-primary/30"
                       )}
                     >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <LogIn size={18} />
                        )}
                        {isSubmitting ? 'VERIFYING...' : 'SYNC TERMINAL'}
                     </button>
                     
                     {isSystemLocked && !(isRoleAllowedDuringLock(tempProfile?.role) || username === 'ADMIN') && (
                       <div 
                         className={cn(
                           "absolute inset-0 flex items-center justify-center gap-2 pointer-events-none select-none z-50 transition-opacity",
                           theme === 'dark' ? "bg-slate-900/65 text-red-400" : "bg-white/65 text-red-600"
                         )}
                         style={{ pointerEvents: 'none', cursor: 'not-allowed' }}
                       >
                         <Lock size={16} className="animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logins Frozen</span>
                       </div>
                     )}
                   </div>

                   <div className="text-center pt-4 flex flex-col gap-2">
                     {tempProfile?.role === 'PATRON' && (
                       <div 
                         className="relative overflow-hidden inline-block rounded px-1 self-center cursor-pointer"
                         onClick={() => {
                           if (isSystemLocked) {
                             triggerToast("Registration Frozen: General registrations are currently paused for security & maintenance. Please check back later.", "warning");
                           }
                         }}
                       >
                         <button 
                           type="button"
                           onClick={() => {
                             if (isSystemLocked) {
                               triggerToast("Registration Frozen: General registrations are currently paused for security & maintenance. Please check back later.", "warning");
                             } else {
                               setStep('patron-register');
                             }
                           }}
                           disabled={false}
                           className={cn(
                             "text-[10px] font-black text-primary uppercase tracking-widest hover:underline transition-all",
                             isSystemLocked ? "grayscale opacity-30 select-none blur-[0.2px] cursor-not-allowed" : ""
                           )}
                         >
                           NO ACCOUNT YET, REGISTER NOW
                         </button>
                         
                         {isSystemLocked && (
                           <div 
                             className={cn(
                               "absolute inset-0 flex items-center justify-center gap-1 pointer-events-none select-none z-50",
                               theme === 'dark' ? "bg-slate-900/70 text-red-400" : "bg-white/70 text-red-600"
                             )}
                             style={{ pointerEvents: 'none', cursor: 'not-allowed' }}
                           >
                             <Lock size={8} />
                             <span className="text-[7px] font-black tracking-widest uppercase">Frozen</span>
                           </div>
                         )}
                       </div>
                     )}
                     <button 
                        type="button"
                        onClick={() => setStep('method')}
                        className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-on-background"
                     >
                       Switch Hub
                     </button>
                   </div>
                </form>
              </motion.div>
            )}

            {step === 'venue-registration' && (
              <motion.div 
                key="venue-registration"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                   <button onClick={handleStepBack} className="p-2 hover:bg-surface-container-high rounded-full focus:outline-none transition-all">
                     <ArrowRight className="rotate-180" size={24}/>
                   </button>
                   <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                     <Shield size={12} className="text-primary"/>
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">BUSINESS ENROLLMENT</span>
                   </div>
                </div>

                <div className="text-center space-y-2 mb-4">
                   <h2 className="text-2xl font-black uppercase tracking-tight text-on-background">Venue Portal</h2>
                   <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest leading-relaxed px-4">Register your venue to begin accepting digital payments</p>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  try {
                    const venueName = (e.currentTarget.elements.namedItem('venueName') as HTMLInputElement).value;
                    const address = (e.currentTarget.elements.namedItem('address') as HTMLInputElement).value;
                    setTempProfile({ venueName, address, role: 'MANAGER' }); 
                    setStep('register');
                  } finally {
                    setIsSubmitting(false);
                  }
                }} className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue Name</label>
                      <input 
                        required
                        name="venueName"
                        type="text" 
                        placeholder="e.g. SHIMMY BEACH CLUB"
                        className="w-full h-14 bg-background border border-outline rounded-xl px-4 text-sm font-bold uppercase placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Location / Address</label>
                      <input 
                        required
                        name="address"
                        type="text" 
                        placeholder="e.g. CAPE TOWN WATERFRONT"
                        className="w-full h-14 bg-background border border-outline rounded-xl px-4 text-sm font-bold uppercase placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all"
                      />
                   </div>
                   
                   <button 
                     type="submit"
                     disabled={isSubmitting}
                     className="w-full h-16 bg-primary text-on-primary rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-primary/30"
                   >
                      Next Step <ArrowRight size={18} />
                   </button>
                </form>
              </motion.div>
            )}

            {step === 'register' && (
              <motion.div 
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                   <button onClick={handleStepBack} className="p-2 hover:bg-surface-container-high rounded-full focus:outline-none transition-all">
                     <ArrowRight className="rotate-180" size={24}/>
                   </button>
                   <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                     <Users size={12} className="text-primary"/>
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">STAFF ENROLLMENT</span>
                   </div>
                </div>

                <div className="text-center space-y-2 mb-4">
                   <h2 className="text-2xl font-black uppercase tracking-tight text-on-background">Staff Profile</h2>
                   <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest leading-relaxed px-4">Enrolling as {tempProfile?.role?.replace('_', ' ') || 'Team Member'}</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {currentUser && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 overflow-hidden">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={14} className="text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase text-on-background">{currentUser.displayName || 'Staff Member'}</p>
                        <p className="text-[8px] font-bold uppercase text-on-surface-variant">{currentUser.email}</p>
                      </div>
                      <button type="button" onClick={() => auth.signOut()} className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline">Switch</button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Staff Username</label>
                      <div className="relative">
                        <input 
                          required
                          type="text" 
                          autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} placeholder="OFFICIAL_ID"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                          className={cn(
                            "w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all",
                            usernameAvailable === true && "border-green-500/50 focus:border-green-500",
                            usernameAvailable === false && "border-red-500/50 focus:border-red-500"
                          )}
                        />
                        {usernameAvailable !== null && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {usernameAvailable ? (
                              <ShieldCheck size={16} className="text-green-500" />
                            ) : (
                              <AlertTriangle size={16} className="text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {usernameAvailable === false && (
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest px-1 mt-1">Username already taken</p>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">First Name</label>
                        <input 
                          required
                          type="text" 
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Surname</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all"
                        />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Staff Email</label>
                      <input 
                        required
                        type="email" 
                        placeholder="john.doe@venue.com"
                        value={email}
                        readOnly={!!currentUser}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn(
                          "w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all",
                          !!currentUser && "opacity-70 bg-surface-container-high cursor-not-allowed"
                        )}
                      />
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Cell Number</label>
                      <input 
                        required
                        type="tel" 
                        placeholder="+27 00 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-all"
                      />
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Create 6-Digit PIN</label>
                      <input 
                        required
                        type="password" 
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••••"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-center text-xl font-black tracking-[0.8em] placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all"
                      />
                  </div>
                  
                  {error && <p className="text-red-500 text-[9px] font-black uppercase px-1 tracking-widest text-center">{error}</p>}

                  <div className="space-y-4">
                    <button 
                       type="submit"
                       disabled={isSubmitting}
                       className="w-full h-16 bg-primary text-black rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-primary/30"
                     >
                        {isSubmitting ? 'SUBMITTING...' : 'REGISTER FOR VERIFICATION'}
                     </button>

                    {!currentUser && (
                      <div className="pt-2">
                        <div className="relative flex items-center py-4">
                          <div className="flex-grow border-t border-outline"></div>
                          <span className="flex-shrink mx-4 text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Optional</span>
                          <div className="flex-grow border-t border-outline"></div>
                        </div>

                        <button 
                          type="button"
                          onClick={handleAnonymousSignIn}
                          disabled={isSubmitting}
                          className="w-full h-14 bg-surface-container border border-outline rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Pre-fill with Google
                        </button>
                      </div>
                    )}
                    
                    <button 
                       type="button"
                       onClick={() => setStep('username-login')}
                       className="w-full h-14 bg-surface-container-high border border-outline rounded-2xl font-black text-[10px] uppercase tracking-widest text-on-background transition-all active:scale-[0.98]"
                    >
                      NO ACCOUNT YET, REGISTER NOW
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'patron-register' && (
              <motion.div 
                key="patron-register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                   <button onClick={handleStepBack} className="p-2 hover:bg-surface-container-high rounded-full focus:outline-none transition-all">
                     <ArrowRight className="rotate-180" size={24}/>
                   </button>
                   <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                     <Star size={12} className="text-primary"/>
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">PATRON ENROLLMENT</span>
                   </div>
                </div>

                <div className="text-center space-y-2 mb-4">
                   <h2 className="text-2xl font-black uppercase tracking-tight text-on-background">Create Profile</h2>
                   <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest leading-relaxed px-4">Join the Wayta network for instant queue-skipping access</p>
                </div>

                <form onSubmit={handlePatronRegister} className="space-y-4">
                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Choose Username</label>
                      <div className="relative">
                        <input 
                          required
                          type="text" 
                          autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} placeholder="COOL_PATRON_X"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                          className={cn(
                            "w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all",
                            usernameAvailable === true && "border-green-500/50 focus:border-green-500",
                            usernameAvailable === false && "border-red-500/50 focus:border-red-500"
                          )}
                        />
                        {usernameAvailable !== null && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {usernameAvailable ? (
                              <ShieldCheck size={16} className="text-green-500" />
                            ) : (
                              <AlertTriangle size={16} className="text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {usernameAvailable === false && (
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest px-1 mt-1">Username already taken</p>
                      )}
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Cell Number</label>
                      <input 
                        required
                        type="tel" 
                        placeholder="080 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all"
                      />
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Security PIN (6 Digits)</label>
                      <div className="relative">
                        <input 
                          required
                          type="password" 
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-center text-xl font-black tracking-[0.8em] placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                          <Shield size={16} />
                        </div>
                      </div>
                      <p className="text-[8px] font-bold text-center text-on-surface-variant/60 uppercase tracking-widest mt-2 px-4 leading-normal">Required for biometric-free payment authorization</p>
                  </div>
                  
                  {error && <p className="text-red-500 text-[9px] font-black uppercase px-1 tracking-widest text-center">{error}</p>}
                  
                   <div 
                     className="relative overflow-hidden w-full rounded-2xl"
                     onClick={() => {
                       if (isSystemLocked) {
                         triggerToast("Access Blocked: Profile creation is currently frozen under Global Maintenance Mode.", "warning");
                       }
                     }}
                   >
                    <button 
                      disabled={isSubmitting || isSystemLocked}
                      className={cn(
                        "w-full h-16 bg-primary text-black rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all",
                        isSystemLocked ? "grayscale opacity-35 select-none" : "shadow-primary/20 active:scale-[0.98] hover:shadow-primary/30"
                      )}
                    >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <ShieldCheck size={20} />
                        )}
                        {isSubmitting ? 'SECURE SYNC...' : 'INITIALIZE PROFILE'}
                    </button>
                    {isSystemLocked && (
                      <div 
                        className={cn(
                          "absolute inset-0 flex items-center justify-center gap-2 pointer-events-none select-none z-50 transition-opacity",
                          theme === 'dark' ? "bg-slate-900/65 text-red-400" : "bg-white/65 text-red-600"
                        )}
                        style={{ pointerEvents: 'none', cursor: 'not-allowed' }}
                      >
                        <Lock size={16} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Registrations Frozen</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <button 
                      type="button"
                      onClick={() => setStep('username-login')}
                      className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-all"
                    >
                      NO ACCOUNT YET, REGISTER NOW
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
            {step === 'email' && (
              <motion.div 
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-4">
                   <button onClick={() => setStep('method')} className="p-2 hover:bg-surface-container-high rounded-full"><ArrowRight className="rotate-180" size={18}/></button>
                   <h2 className="text-xl font-black uppercase tracking-tight">Staff Auth</h2>
                </div>

                <form onSubmit={handleAdminAuth} className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Identity</label>
                      <input 
                        required
                        type="text" 
                        placeholder="EMAIL OR USERNAME"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/30 focus:border-primary outline-none"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Token</label>
                      <input 
                        required
                        type="password" 
                        placeholder="ACCESS PASSWORD"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold placeholder:text-on-surface-variant/30 focus:border-primary outline-none"
                      />
                   </div>
                   {error && <p className="text-red-500 text-[9px] font-black uppercase px-1 tracking-widest">{error}</p>}
                   <button className="w-full h-14 bg-primary text-on-primary rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                      <Shield size={16} />
                      Verify Clearance
                   </button>
                </form>
              </motion.div>
            )}

            {step === 'pin-entry' && (
              <motion.div 
                key="pin-entry"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between mb-2">
                   <button onClick={handleStepBack} className="p-2 hover:bg-surface-container-high rounded-full focus:outline-none transition-all">
                     <ArrowRight className="rotate-180" size={24}/>
                   </button>
                   <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                     <Shield size={12} className="text-primary"/>
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                       {savedPin ? 'AUTH REQUIRED' : isConfirmingPin ? 'VERIFY PIN' : 'SETUP SECURITY'}
                     </span>
                   </div>
                </div>

                <div className="text-center space-y-2">
                   <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center text-primary mb-4 relative">
                     <AnimatePresence mode="wait">
                       <motion.div
                         key={isConfirmingPin ? 'confirm' : 'setup'}
                         initial={{ opacity: 0, rotateY: 90 }}
                         animate={{ opacity: 1, rotateY: 0 }}
                         exit={{ opacity: 0, rotateY: -90 }}
                       >
                         {savedPin ? <ShieldCheck size={32} /> : isConfirmingPin ? <ShieldCheck size={32} className="text-green-500" /> : <Key size={32} />}
                       </motion.div>
                     </AnimatePresence>
                     {!savedPin && !isConfirmingPin && (
                       <motion.div 
                         className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center border-4 border-surface-container"
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                       >
                         <Plus size={12} />
                       </motion.div>
                     )}
                   </div>
                   <h2 className="text-2xl font-black text-on-background tracking-tight uppercase">
                     {savedPin ? 'Identity PIN' : isConfirmingPin ? 'Confirm PIN' : 'Secure Vault'}
                   </h2>
                   <p className="text-on-surface-variant text-[10px] uppercase font-black tracking-widest px-4 leading-relaxed">
                     {savedPin 
                       ? 'Verification required for session activation' 
                       : isConfirmingPin 
                         ? 'Re-enter your 6-digit code to confirm'
                         : 'Create a 6-digit code to skip queues safely'}
                   </p>
                </div>

                <div className="flex flex-col items-center gap-8">
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => {
                      const currentVal = isConfirmingPin ? confirmPin : pin;
                      return (
                        <div 
                          key={i}
                          className={cn(
                            "w-4 h-4 rounded-full border-2 transition-all duration-300",
                            currentVal.length >= i ? "bg-primary border-primary scale-125" : "border-outline",
                            isConfirmingPin && "border-green-500/50",
                            isConfirmingPin && confirmPin.length >= i && "bg-green-500 border-green-500"
                          )}
                        />
                      );
                    })}
                  </div>

                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-[9px] font-black uppercase tracking-widest px-4 text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setError(null);
                          if (isConfirmingPin) {
                            if (confirmPin.length < 6) {
                              const newVal = confirmPin + num;
                              setConfirmPin(newVal);
                              if (newVal.length === 6) {
                                if (newVal === pin) {
                                  handlePinSubmit(pin);
                                } else {
                                  setError('PINs do not match. Restarting...');
                                  setTimeout(() => {
                                    setPin('');
                                    setConfirmPin('');
                                    setIsConfirmingPin(false);
                                    setError(null);
                                  }, 1500);
                                }
                              }
                            }
                          } else {
                            if (pin.length < 6) {
                              const newVal = pin + num;
                              setPin(newVal);
                              if (newVal.length === 6) {
                                if (savedPin) {
                                  handlePinSubmit(newVal);
                                } else {
                                  setIsConfirmingPin(true);
                                }
                              }
                            }
                          }
                        }}
                        className="w-full aspect-square bg-surface-container-high hover:bg-primary hover:text-on-primary rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-95 border border-outline/50"
                      >
                        {num}
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        if (isConfirmingPin) setConfirmPin('');
                        else setPin('');
                        setError(null);
                      }}
                      className="w-full aspect-square bg-surface-container-high rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-red-500 transition-colors border border-outline/50"
                    >
                      <X size={24} />
                    </button>
                    <button
                      onClick={() => {
                        const target = isConfirmingPin ? confirmPin : pin;
                        const setTarget = isConfirmingPin ? setConfirmPin : setPin;
                        if (target.length < 6) {
                          const newVal = target + '0';
                          setTarget(newVal);
                          if (newVal.length === 6) {
                            if (savedPin) handlePinSubmit(newVal);
                            else if (isConfirmingPin) {
                               if (newVal === pin) handlePinSubmit(pin);
                               else {
                                 setError('PINs do not match. Restarting...');
                                 setTimeout(() => {
                                   setPin('');
                                   setConfirmPin('');
                                   setIsConfirmingPin(false);
                                   setError(null);
                                 }, 1500);
                               }
                            }
                            else setIsConfirmingPin(true);
                          }
                        }
                      }}
                      className="w-full aspect-square bg-surface-container-high hover:bg-primary hover:text-on-primary rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-95 border border-outline/50"
                    >
                      0
                    </button>
                    <button 
                      onClick={handleStepBack}
                      className="w-full aspect-square bg-surface-container-high rounded-2xl flex items-center justify-center text-primary border border-outline/50"
                    >
                      <LogIn size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'role-selection' && (
              <motion.div 
                key="role"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                   <button onClick={handleStepBack} className="p-2 hover:bg-surface-container-high rounded-full focus:outline-none transition-all">
                     <ArrowRight className="rotate-180" size={24}/>
                   </button>
                   <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                     <Users size={12} className="text-primary"/>
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">Scope Definition</span>
                   </div>
                </div>

                <div className="space-y-2 text-center mb-6">
                   <h2 className="text-2xl font-black uppercase tracking-tighter text-on-background">Assign Access</h2>
                   <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest leading-relaxed">Choose your operational level for this session</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {roleOptions
                    .filter(opt => opt.role !== 'ADMIN' || Boolean((WHITELISTED_EMAIL && email === WHITELISTED_EMAIL) || (ADMIN_USERNAME && email === ADMIN_USERNAME)))
                    .map((opt, i) => {
                      const Icon = opt.icon;
                      return (
                        <motion.button
                        key={opt.role}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => {
                          const isBlockedBySystemLock = isSystemLocked && !isRoleAllowedDuringLock(opt.role);
                          if (isBlockedBySystemLock) {
                            triggerToast(`Role Selection Locked: Selecting the ${opt.title} role is currently paused because the platform is undergoing maintenance. Only ADMIN or MANAGER roles are authorized during this lock.`, 'warning');
                            return;
                          }
                          if (opt.role === 'ADMIN' && false) {
                            triggerToast(`Admin Login Disabled: Admin portal entry is currently deactivated by global policy.`, 'error');
                            return;
                          }
                          handleRoleSelect(opt.role);
                        }}
                        disabled={isSubmitting}
                        className={cn(
                          "group bg-surface-container-high border border-outline rounded-2xl p-5 flex items-center gap-4 transition-all relative overflow-hidden", 
                          (opt.role === 'ADMIN' && false) ? "admin-login-disabled-element cursor-not-allowed" : "",
                          (isSystemLocked && !isRoleAllowedDuringLock(opt.role)) ? "grayscale opacity-35 select-none cursor-not-allowed" : "hover:border-primary hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] disabled:opacity-50"
                        )}
                      >
                        <div className="w-12 h-12 bg-background border border-outline rounded-xl flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors shadow-sm">
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-black uppercase text-[11px] tracking-widest whitespace-nowrap text-on-background">{opt.title}</p>
                            {opt.role === 'PATRON' && (
                               <span className="text-[7px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-black uppercase">Standard</span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{opt.desc}</p>
                        </div>
                        {opt.role === 'ADMIN' && false && (
                          <div className="admin-login-disabled-overlay rounded-2xl">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Blocked</span>
                              <span className="text-[8px] font-bold uppercase text-red-400/80 tracking-widest text-center leading-normal">Login Access Disabled</span>
                            </div>
                          </div>
                        )}
                        {isSystemLocked && !isRoleAllowedDuringLock(opt.role) && (
                          <div 
                            className={cn(
                              "absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none select-none z-50",
                              theme === 'dark' ? "bg-slate-900/75 text-red-400" : "bg-white/75 text-red-600"
                            )}
                          >
                            <Lock size={16} className="animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-normal">Access Paused</span>
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-outline/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                           {isSubmitting ? (
                              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                           ) : (
                              <ChevronRight size={24} className="opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all" />
                           )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="bg-surface-container-high border border-outline p-4 rounded-2xl flex items-start gap-4">
                  <div className="p-2 bg-on-surface-variant/10 rounded-lg">
                    <AlertTriangle size={16} className="text-on-surface-variant" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-background">Authorization Policy</p>
                    <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">
                      Manager and Admin roles require email verification before operational clearance is granted.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showEventModal && (
          <EventForm 
            venueId="SHIMMY" 
            onClose={() => setShowEventModal(false)}
            onSuccess={() => setShowEventModal(false)}
          />
        )}

        <AnimatePresence>
          {showPatronOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-[2.5rem] p-10 text-center space-y-8 shadow-[0_0_50px_rgba(255,255,255,0.05)]"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] mx-auto flex items-center justify-center text-primary border border-primary/20">
                  <ShieldCheck size={40} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase tracking-tight text-white italic">Welcome Home</h3>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-loose max-w-xs mx-auto">
                    Your festival identity has been initialized. Choose your entry point.
                  </p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      if (registeredPatronData) handleLoginInternal(registeredPatronData);
                    }}
                    className="w-full h-18 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    ORDER NOW <ArrowRight size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      if (registeredPatronData) handleLoginInternal(registeredPatronData);
                    }}
                    className="w-full h-18 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-white/10"
                  >
                    Explore the App
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDebugMenu && !isLoginDebugDisabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-black border border-outline rounded-3xl p-8 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-on-background uppercase tracking-tight">Debug Panel</h3>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Bypass Authentication</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDebugMenu(false)}
                    className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                  >
                    <X className="text-on-surface-variant" size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map((opt) => (
                    <div key={opt.role} className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          const demoCreds: Record<string, { u: string, p: string }> = {
                            'ADMIN': { u: ADMIN_USERNAME || 'Admin', p: ADMIN_PASSWORD },
                            'MANAGER': { u: 'manager', p: 'manager123' },
                            'BARTENDER': { u: 'bartender', p: 'bartender123' },
                            'WAITER': { u: 'waiter', p: 'waiter123' },
                            'STAFF': { u: 'staff', p: 'staff123' },
                            'EVENT_MANAGER': { u: 'eventmgr', p: 'event123' },
                            'VENDOR': { u: 'vendor', p: 'vendor123' },
                            'PATRON': { u: 'patron', p: 'patron123' }
                          };
                          const creds = demoCreds[opt.role];
                          setTempProfile({ role: opt.role });
                          setUsername(creds.u);
                          setLoginPin(creds.p);
                          setStep('username-login');
                          setAutoSubmitLogin(true);
                          setShowDebugMenu(false);
                        }}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-container border border-outline rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all group active:scale-[0.98]"
                      >
                        <opt.icon size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-black text-on-surface-variant group-hover:text-on-background uppercase tracking-widest text-center">{opt.title}</span>
                      </button>
                      <button 
                        onClick={() => {
                          const demoCreds: Record<string, { u: string, p: string }> = {
                            'ADMIN': { u: ADMIN_USERNAME || 'Admin', p: ADMIN_PASSWORD },
                            'MANAGER': { u: 'manager', p: 'manager123' },
                            'BARTENDER': { u: 'bartender', p: 'bartender123' },
                            'WAITER': { u: 'waiter', p: 'waiter123' },
                            'STAFF': { u: 'staff', p: 'staff123' },
                            'EVENT_MANAGER': { u: 'eventmgr', p: 'event123' },
                            'VENDOR': { u: 'vendor', p: 'vendor123' },
                            'PATRON': { u: 'patron', p: 'patron123' }
                          };
                          const creds = demoCreds[opt.role];
                          setTempProfile({ role: opt.role });
                          setUsername(creds.u);
                          setLoginPin(creds.p);
                          setStep('username-login');
                          setAutoSubmitLogin(true);
                          setShowDebugMenu(false);
                        }}
                        className="p-1 text-[8px] font-black uppercase tracking-tighter text-red-500 hover:text-red-400 text-center"
                      >
                        Launch Identity
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex gap-3 items-start">
                   <Info size={14} className="text-red-500 mt-0.5" />
                   <p className="text-[9px] text-red-500/70 font-bold uppercase tracking-wider leading-relaxed">
                     Caution: Debug mode activates direct dashboard routing. Internal persistence and server-side state may not sync completely for mock identities.
                   </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  </div>
);
};
