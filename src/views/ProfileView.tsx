import React, { useState } from 'react';
import { 
  Settings, CreditCard, Shield, Bell, 
  HelpCircle, LogOut, ChevronRight,
  Zap, Award, Mail, ExternalLink,
  Sun, Moon, Wallet, Plus, ArrowUpRight,
  ShieldCheck, RefreshCcw, Building2,
  Trophy, Star, Crown, Gem, Flame, Check, Trash2,
  Camera, Phone, User2, MapPin, Hammer, LayoutGrid, ShoppingBag, Users as RoleUsers, Fingerprint
} from 'lucide-react';
import { PartnerWaytaButton } from '../components/PartnerWaytaButton';
import { User, SavedPaymentMethod, UserRole as AppUserRole, Order, Transaction, WCapTransaction } from '../types';
import { updateUserProfile, UserRole as ServiceUserRole } from '../services/authService';
import { gmailService, GmailMessage } from '../services/gmailService';
import { userService } from '../services/userService';
import { wcapsService } from '../services/wcapsService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileViewProps {
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onAdminClick?: () => void;
  onPartnerClick?: () => void;
  isBartenderEnabled?: boolean;
  onBartenderClick?: () => void;
  user?: User | null;
  onRestartTour: () => void;
  onUpdateProfile?: (data: any) => Promise<void>;
  orders?: Order[];
  transactions?: Transaction[];
  onViewOrders?: () => void;
  isAdminLoginEnabled?: boolean;
  onAuditClick?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  onLogout, 
  theme, 
  onToggleTheme, 
  onAdminClick, 
  onPartnerClick, 
  isBartenderEnabled, 
  onBartenderClick, 
  user, 
  onRestartTour, 
  onUpdateProfile, 
  orders = [], 
  transactions = [], 
  onViewOrders,
  isAdminLoginEnabled = true,
  onAuditClick
}) => {
  const isAdmin = user?.role === 'ADMIN';
  const isManagement = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const isBartender = user?.role === 'BARTENDER' || user?.role === 'ADMIN';

  // Load original role from localStorage if available, or initialize it
  const [originalRole] = useState<string | null>(() => {
    if (!user?.uid) return null;
    const stored = localStorage.getItem(`wayta_original_role_${user.uid}`);
    if (user.role === 'MANAGER' || user.role === 'ADMIN') {
      localStorage.setItem(`wayta_original_role_${user.uid}`, user.role);
      return user.role;
    }
    return stored;
  });

  // Track if current user is manager or admin (either currently or originally)
  const isEligibleForSwitch = user?.role === 'MANAGER' || user?.role === 'ADMIN' || originalRole === 'MANAGER' || originalRole === 'ADMIN';
  
  const [walletBalance, setWalletBalance] = useState(1450.75);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [hasBiometricsEnrolled, setHasBiometricsEnrolled] = useState(() => typeof window !== 'undefined' && localStorage.getItem('wayta_biometric_enrolled') === 'true');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Gmail Workspace Integration states
  const [gmailConnected, setGmailConnected] = useState(gmailService.isAuthenticated());
  const [gmailEmail, setGmailEmail] = useState(gmailService.getEmail() || '');
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [selectedGmail, setSelectedGmail] = useState<GmailMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  const handleConnectGmail = async () => {
    try {
      setGmailError(null);
      const res = await gmailService.connectGmail();
      setGmailConnected(true);
      setGmailEmail(res.email);
    } catch (err: any) {
      setGmailError(err.message || 'Failed to authenticate Gmail workspace.');
    }
  };

  const handleDisconnectGmail = () => {
    gmailService.disconnect();
    setGmailConnected(false);
    setGmailEmail('');
    setGmailMessages([]);
    setSelectedGmail(null);
  };

  const handleFetchGmailMessages = async () => {
    try {
      setIsLoadingGmail(true);
      setGmailError(null);
      const msgs = await gmailService.listMessages(5);
      setGmailMessages(msgs);
    } catch (err: any) {
      setGmailError(err.message || 'Error fetching messages.');
    } finally {
      setIsLoadingGmail(false);
    }
  };

  const handleSendComposeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      setGmailError('All compose fields are required.');
      return;
    }

    // MANDATORY confirmation dialog before sending emails to obey least-privilege mutable guidelines
    const confirmed = window.confirm(`Confirm action: Send email to "${composeTo}" using your linked Gmail account?`);
    if (!confirmed) return;

    try {
      setIsSendingMail(true);
      setGmailError(null);
      await gmailService.sendEmail(composeTo, composeSubject, composeBody);
      alert('Email sent successfully via your Gmail account!');
      setShowCompose(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      // Refresh inbox list
      handleFetchGmailMessages().catch(() => {});
    } catch (err: any) {
      setGmailError(err.message || 'Failed to send email.');
    } finally {
      setIsSendingMail(false);
    }
  };
  
  // Profile Management State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    full_name: user?.full_name || user?.displayName || '',
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bio: user?.bio || '',
    gender: user?.gender || '',
    id_number: user?.id_number || '',
    working_status: user?.working_status || '',
    photoURL: user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'Wayta'}`
  });

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([
    { id: '1', brand: 'VISA', last4: '4242', isDefault: true },
    { id: '2', brand: 'Mastercard', last4: '5592', isDefault: false }
  ]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ number: '', expiry: '', cvc: '' });

  React.useEffect(() => {
    if (user) {
      setEditedProfile({
        full_name: user.full_name || user.displayName || '',
        displayName: user.displayName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
        gender: user.gender || '',
        id_number: user.id_number || '',
        working_status: user.working_status || '',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName || 'Wayta'}`
      });
    }
  }, [user]);

  // W-Caps State
  const [wcapsTransactions, setWcapsTransactions] = useState<WCapTransaction[]>([]);
  
  React.useEffect(() => {
    if (user?.uid) {
      return wcapsService.listenWcapsTransactions(user.uid, setWcapsTransactions);
    }
  }, [user?.uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // South African phone format validation
    const saPhoneRegex = /^\+27\d{9}$/;
    if (editedProfile.phone && !saPhoneRegex.test(editedProfile.phone)) {
      setPhoneError('Invalid SA format. Use +27XXXXXXXXX');
      return;
    }
    setPhoneError(null);

    if (onUpdateProfile) {
      await onUpdateProfile(editedProfile);
    }
    setIsEditingProfile(false);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    setPaymentMethods(prev => [...prev, { id, brand: 'VISA', last4: newCard.number.slice(-4), isDefault: false }]);
    setShowAddCard(false);
    setNewCard({ number: '', expiry: '', cvc: '' });
  };

  const removeCard = (id: string) => {
    setPaymentMethods(prev => prev.filter(c => c.id !== id));
  };

  const setCardDefault = (id: string) => {
    setPaymentMethods(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));
  };
  
  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) return;
    
    setIsProcessing(true);
    // Simulate payment gateway interaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setWalletBalance(prev => prev + Number(addAmount));
    setAddAmount('');
    setIsProcessing(false);
    setShowAddFunds(false);
  };

  const handleRoleChange = async (role: AppUserRole) => {
    if (!user) return;
    try {
      setIsProcessing(true);
      await updateUserProfile(user.uid, { role: role as unknown as ServiceUserRole });
    } catch (err) {
      console.error('Failed to change role:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const [showPartnerConfirm, setShowPartnerConfirm] = useState(false);

  const handlePartnerClick = () => {
    setShowPartnerConfirm(true);
  };

  const confirmPartnerAction = (shouldLogout: boolean) => {
    setShowPartnerConfirm(false);
    if (shouldLogout) {
      onLogout();
      // Since logout might be async or trigger a redirect, 
      // the parent onPartnerClick should handle the navigation after logout
      // But usually, we just stay logged out and go to the partner page.
      if (onPartnerClick) onPartnerClick();
    }
  };

  return (
    <div className="p-6 space-y-8 pb-32 animate-in slide-in-from-left-4 duration-500 bg-background min-h-screen">
      {/* Profile Incentive */}
      {( !user?.gender || !user?.id_number || !user?.is_profile_complete) && !isEditingProfile && (
        <section className="bg-primary/10 border border-primary/20 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Zap size={48} className="text-primary" />
           </div>
           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shrink-0">
             <ShieldCheck size={24} />
           </div>
           <div className="flex-1 space-y-1">
             <h4 className="text-xs font-black uppercase text-primary tracking-widest">Identity Rewards</h4>
             <p className="text-[10px] font-bold text-on-surface-variant/80 uppercase leading-relaxed">
               Complete your identity profile to earn <span className="text-white">50 Wayta Credit</span> & faster terminal processing.
             </p>
           </div>
           <button 
             onClick={() => setIsEditingProfile(true)}
             className="h-10 px-4 bg-primary text-black rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
           >
             Complete
           </button>
        </section>
      )}

      <AnimatePresence>
        {showPartnerConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container border border-outline rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl space-y-8 text-center"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <LogOut size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-on-background uppercase tracking-tight">Security Check</h3>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest leading-loose">
                    Would you like to <span className="text-primary">Sign Out</span> before visiting the Partnerships page?
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => confirmPartnerAction(true)}
                  className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all"
                >
                  Sign Out & Proceed
                </button>
                <button 
                  onClick={() => confirmPartnerAction(false)}
                  className="w-full h-14 bg-surface-container-high text-on-surface-variant font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all"
                >
                  Stay Signed In
                </button>
                <button 
                  onClick={() => setShowPartnerConfirm(false)}
                  className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-background"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Profile Header */}
      <section id="register-patron-btn" className="flex flex-col items-center text-center gap-5 mt-4">
        <div className="relative group">
          <div className="w-28 h-28 rounded-2xl p-0.5 border border-outline bg-surface-container overflow-hidden shadow-2xl transition-transform group-hover:scale-105 active:scale-95">
            <img 
              src={editedProfile.photoURL || undefined}
              className="w-full h-full object-cover bg-surface" 
              alt="Profile" 
            />
          </div>
          {isEditingProfile && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} />
              <input 
                type="text" 
                className="hidden" 
                placeholder="Photo URL"
                onChange={(e) => {
                  const url = prompt('Enter image URL:');
                  if (url) setEditedProfile(p => ({ ...p, photoURL: url }));
                }}
              />
            </label>
          )}
          <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-[0.2em] border border-background shadow-xl leading-none">
            {user?.role === 'ADMIN' ? 'System Admin' : 
             user?.role === 'MANAGER' ? 'Venue Manager' : 
             user?.role === 'BARTENDER' ? 'Certified Bartender' : 'Wayta Patron'}
          </div>
        </div>
        
        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} className="w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 backdrop-blur-sm p-4 rounded-[2rem] border border-outline/20">
            <div className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="ml-2 mt-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Full Name</label>
                <div className="relative">
                  <User2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="text" 
                    value={editedProfile.full_name}
                    onChange={e => setEditedProfile(p => ({ ...p, full_name: e.target.value, displayName: e.target.value }))}
                    className="w-full h-12 bg-surface-container border border-outline rounded-xl pl-10 pr-4 font-bold text-xs outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-2 mt-2">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="email" 
                    value={editedProfile.email}
                    onChange={e => setEditedProfile(p => ({ ...p, email: e.target.value }))}
                    className="w-full h-12 bg-surface-container border border-outline rounded-xl pl-10 pr-4 font-bold text-xs outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-2 mt-2">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="tel" 
                    value={editedProfile.phone}
                    onChange={e => {
                      setEditedProfile(p => ({ ...p, phone: e.target.value }));
                      if (phoneError) setPhoneError(null);
                    }}
                    className={cn(
                      "w-full h-12 bg-surface-container border rounded-xl pl-10 pr-4 font-bold text-xs outline-none transition-all",
                      phoneError ? "border-error focus:border-error" : "border-outline focus:border-primary"
                    )}
                    placeholder="+27..."
                  />
                </div>
                {phoneError && <p className="text-error text-[10px] font-bold mt-1 px-2">{phoneError}</p>}
              </div>

              <div className="space-y-1">
                <label className="ml-2 mt-2">Residential Area</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="text" 
                    value={editedProfile.address}
                    onChange={e => setEditedProfile(p => ({ ...p, address: e.target.value }))}
                    className="w-full h-12 bg-surface-container border border-outline rounded-xl pl-10 pr-4 font-bold text-xs outline-none focus:border-primary transition-all"
                    placeholder="Physical Address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ml-2 mt-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Gender</label>
                  <select 
                    value={editedProfile.gender}
                    onChange={e => setEditedProfile(p => ({ ...p, gender: e.target.value }))}
                    className="w-full h-12 bg-surface-container border border-outline rounded-xl px-4 font-bold text-xs outline-none focus:border-primary transition-all"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="ml-2 mt-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Working Status</label>
                  <select 
                    value={editedProfile.working_status}
                    onChange={e => setEditedProfile(p => ({ ...p, working_status: e.target.value }))}
                    className="w-full h-12 bg-surface-container border border-outline rounded-xl px-4 font-bold text-xs outline-none focus:border-primary transition-all"
                  >
                    <option value="">Select</option>
                    <option value="Employed">Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Student">Student</option>
                    <option value="Unemployed">Unemployed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-2 mt-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">ID / National Number</label>
                <div className="relative">
                  <Shield size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="text" 
                    value={editedProfile.id_number}
                    onChange={e => setEditedProfile(p => ({ ...p, id_number: e.target.value }))}
                    className="w-full h-12 bg-surface-container border border-outline rounded-xl pl-10 pr-4 font-bold text-xs outline-none focus:border-primary transition-all"
                    placeholder="National ID for verification"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-2 mt-2">Bio / Vibe</label>
                <textarea 
                  value={editedProfile.bio}
                  onChange={e => setEditedProfile(p => ({ ...p, bio: e.target.value }))}
                  className="w-full h-24 bg-surface-container border border-outline rounded-xl p-4 font-bold text-xs outline-none focus:border-primary transition-all resize-none"
                  placeholder="Tell us about your pulse..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 h-12 bg-surface-container border border-outline rounded-xl text-xs font-black uppercase tracking-widest text-on-surface-variant"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 h-12 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Update Mesh Profile
              </button>
            </div>
          </form>
        ) : (
          <div className="relative group text-center px-6">
            <h2 className="text-2xl font-black text-on-background tracking-tight leading-tight">{editedProfile.full_name || editedProfile.displayName}</h2>
            <div className="flex items-center justify-center gap-4 mt-1 opacity-60">
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-[0.2em]">{editedProfile.email}</p>
              {editedProfile.phone && (
                <>
                  <div className="w-1 h-1 rounded-full bg-on-surface-variant" />
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-[0.2em]">{editedProfile.phone}</p>
                </>
              )}
            </div>
            {editedProfile.bio && (
              <p className="max-w-xs mx-auto mt-4 text-xs font-medium text-on-surface-variant leading-relaxed italic">
                "{editedProfile.bio}"
              </p>
            )}
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="absolute -right-12 top-0 p-2 text-on-surface-variant hover:text-primary transition-all hover:scale-110 active:scale-90"
            >
              <Settings size={16} />
            </button>
          </div>
        )}
      </section>

      {/* Secure Role Switcher Dropdown for Eligible Managers */}
      {isEligibleForSwitch && (
        <section className={cn(
          "border p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-visible shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 z-40",
          user?.role === 'ADMIN'
            ? "bg-gradient-to-r from-purple-950/45 via-neutral-950 to-indigo-950/45 border-purple-500/35 shadow-[0_0_30px_rgba(168,85,247,0.12)] text-purple-200"
            : user?.role === 'MANAGER'
              ? "bg-gradient-to-r from-emerald-950/30 via-neutral-950 to-emerald-950/30 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
              : "bg-gradient-to-r from-emerald-500/10 via-primary/5 to-emerald-500/10 border border-primary/20 shadow-lg"
        )} id="profile-staff-access-gateway">
          {user?.role === 'ADMIN' ? (
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          ) : (
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          )}
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border animate-pulse",
              user?.role === 'ADMIN'
                ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            )}>
              <RefreshCcw size={18} />
            </div>
            <div className="text-left">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest font-mono",
                user?.role === 'ADMIN' ? "text-purple-400" : "text-emerald-400"
              )}>STAFF ACCESS GATEWAY</span>
              <h4 className="font-black text-sm uppercase text-white tracking-tight leading-none mt-1">Active Command Mode</h4>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mt-1">
                Current Role: <span className={cn("font-bold", user?.role === 'ADMIN' ? "text-purple-400" : "text-primary")}>
                  {user?.role === 'ADMIN' 
                    ? '🛡️ System Admin' 
                    : user?.role === 'MANAGER' 
                      ? '💼 Venue Manager' 
                      : user?.role === 'BARTENDER' || user?.role === 'STAFF'
                        ? '🍺 Staff Crew'
                        : user?.role === 'EVENT_MANAGER'
                          ? '🎪 Event Manager'
                          : user?.role === 'VENDOR'
                            ? '🏪 Vendor Partner'
                            : user?.role === 'WAITER'
                              ? '🏃‍♂️ Waiter Server'
                              : '🛒 Wayta Patron'}
                </span>
              </p>
            </div>
          </div>
          
          {/* Custom Animated Secure Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className={cn(
                "w-full md:w-48 h-12 px-4 rounded-xl text-white font-bold text-xs uppercase tracking-wider border flex items-center justify-between transition-all duration-200 cursor-pointer shadow-inner relative z-30 hover:scale-[1.02]",
                user?.role === 'ADMIN'
                  ? "bg-purple-950/40 border-purple-500/40 hover:border-purple-400 hover:bg-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-purple-200"
                  : user?.role === 'MANAGER'
                    ? "bg-neutral-900 border-white/10 hover:border-emerald-500/50 hover:bg-neutral-800"
                    : "bg-neutral-900 border-white/10 hover:border-primary/50 hover:bg-neutral-800"
              )}
              id="mode-switch-dropdown-trigger"
            >
              <span className="flex items-center gap-2">
                {user?.role === 'ADMIN' 
                  ? '🛡️ Admin Mode' 
                  : user?.role === 'EVENT_MANAGER'
                    ? '🎪 Event Mgr'
                    : user?.role === 'VENDOR'
                      ? '🏪 Vendor Mode'
                      : user?.role === 'BARTENDER' || user?.role === 'STAFF'
                        ? '🍺 Staff Mode'
                        : user?.role === 'WAITER'
                          ? '🏃‍♂️ Waiter Mode'
                          : user?.role === 'MANAGER' 
                            ? '💼 Manager Mode' 
                            : '🛒 Patron Mode'}
              </span>
              <ChevronRight size={14} className={cn("transition-transform text-zinc-400", showRoleSelector ? "-rotate-90" : "rotate-90")} />
            </button>

            <AnimatePresence>
              {showRoleSelector && (
                <>
                  {/* Invisible background overlay to close dropdown */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowRoleSelector(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute right-0 top-[110%] w-full md:w-60 bg-neutral-950 border rounded-xl shadow-2xl p-1.5 space-y-1 z-50 overflow-hidden max-h-[380px] overflow-y-auto no-scrollbar",
                      user?.role === 'ADMIN' ? "border-purple-500/30" : "border-primary/30"
                    )}
                  >
                    {[
                      ...(user?.role === 'ADMIN' || originalRole === 'ADMIN' ? [
                        { value: 'ADMIN', label: 'Admin Mode', sub: 'System control & audit index', icon: '🛡️' },
                        { value: 'EVENT_MANAGER', label: 'Event Manager', sub: 'Festival production registry', icon: '🎪' },
                        { value: 'VENDOR', label: 'Vendor Partner', sub: 'Stock, sales & product hubs', icon: '🏪' },
                        { value: 'BARTENDER', label: 'Staff Crew', sub: 'Active bar & crew fulfillment', icon: '🍺' },
                        { value: 'WAITER', label: 'Waiter Portal', sub: 'Table service & operations', icon: '🏃‍♂️' }
                      ] : []),
                      { value: 'MANAGER', label: 'Manager Mode', sub: 'Venue command panel access', icon: '💼' },
                      { value: 'PATRON', label: 'Patron Mode', sub: 'Instant order & pay systems', icon: '🛒' }
                    ].map((opt) => {
                      const isActive = (user?.role || 'PATRON') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={async () => {
                            setShowRoleSelector(false);
                            if (onUpdateProfile) {
                              await onUpdateProfile({ role: opt.value as AppUserRole });
                              // Keep originalRole track intact in localStorage
                              localStorage.setItem(`wayta_original_role_${user?.uid}`, originalRole || 'MANAGER');
                            }
                          }}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg flex items-center justify-between text-left transition-all duration-150 cursor-pointer group",
                            isActive 
                              ? opt.value === 'ADMIN'
                                ? "bg-purple-500/20 border border-purple-500/30 text-white"
                                : "bg-emerald-500/20 border border-emerald-500/30 text-white" 
                              : "hover:bg-neutral-900 border border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base select-none">{opt.icon}</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider">{opt.label}</p>
                              <p className="text-[7px] font-bold uppercase tracking-widest text-primary opacity-60 mt-0.5 leading-none">{opt.sub}</p>
                            </div>
                          </div>
                          {isActive && <Check size={12} className={cn(opt.value === 'ADMIN' ? "text-purple-400" : "text-secondary")} />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* W-Caps Loyalty Section */}
      <section className="bg-surface-container rounded-[2rem] p-6 border border-outline relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:scale-110 transition-transform">
           <Trophy size={120} className="text-primary" />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                W
              </div>
              <div>
                <p className="text-xs font-black uppercase text-on-surface-variant tracking-[0.3em]">W-Caps Balance</p>
                <p className="text-2xl font-black text-primary uppercase tracking-tighter">{(user?.wcaps_balance || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
               <span className="text-[10px] font-black text-primary uppercase">Active Mesh Loyalty</span>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <h4 className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">Points History</h4>
                <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{wcapsTransactions.length} Transactions</p>
             </div>
             <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
                {wcapsTransactions.map((tx, idx) => (
                  <div key={`${tx.id || 'wcaps-tx'}-${idx}`} className="flex items-center justify-between p-3 bg-background/40 border border-outline/30 rounded-xl">
                     <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                          tx.type === 'earn' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {tx.type === 'earn' ? '+' : '-'}
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-on-background uppercase line-clamp-1">{tx.description}</p>
                           <p className="text-[8px] font-medium text-on-surface-variant uppercase">{tx.sourceName} • {new Date(tx.timestamp).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <p className={cn(
                       "text-xs font-mono font-bold",
                       tx.type === 'earn' ? "text-emerald-500" : "text-red-500"
                     )}>
                       {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                     </p>
                  </div>
                ))}
                {wcapsTransactions.length === 0 && (
                  <div className="text-center py-8 opacity-40">
                     <p className="text-[9px] font-black uppercase tracking-widest">No mesh activity logged</p>
                  </div>
                )}
             </div>
          </div>

          <div className="mt-6 p-4 bg-background/40 rounded-2xl border border-outline/50">
             <h4 className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest mb-3 border-b border-outline/30 pb-2">Mesh Privileges</h4>
             <ul className="space-y-2">
                <li className="flex items-center gap-2 text-[10px] font-bold text-on-background">
                   <Check size={12} className="text-primary" />
                   <span>Redeem at participating venues</span>
                </li>
                <li className="flex items-center gap-2 text-[10px] font-bold text-on-background">
                   <Check size={12} className="text-primary" />
                   <span>Priority entry with Status Check</span>
                </li>
             </ul>
          </div>
        </div>
      </section>

      {/* Wallet section */}
      <section className="bg-surface-container rounded-[2rem] p-6 border border-outline relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:scale-110 transition-transform">
           <Wallet size={120} className="text-primary" />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Wallet size={20} />
              </div>
              <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.3em]">Wayta Wallet</p>
            </div>
            <button 
              onClick={() => setShowAddFunds(true)}
              className="w-10 h-10 rounded-xl bg-on-background/5 border border-outline flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all active:scale-90"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="space-y-1">
             <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black text-on-surface-variant uppercase">Balance</span>
                <p className="text-4xl font-mono font-bold tracking-tighter text-on-background">R {walletBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
             </div>
             <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
               <RefreshCcw size={12} /> Includes R 250.00 Refund Credit
             </p>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-2">
            <button className="h-11 bg-on-background/5 rounded-xl border border-outline flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-on-background/10 transition-all">
               <ArrowUpRight size={14} className="text-primary" /> Send Pulse
            </button>
            <button className="h-11 bg-on-background/5 rounded-xl border border-outline flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-on-background/10 transition-all">
               <ShieldCheck size={14} className="text-primary" /> Auto-Topup
            </button>
          </div>
        </div>
      </section>

      {/* Order History Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">Order History</h3>
          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{orders.length} Sessions</p>
        </div>

        <div className="bg-surface-container rounded-[2rem] border border-outline overflow-hidden divide-y divide-outline/30">
          {orders.slice(0, 5).map((order, i) => (
              <div key={`profile-ord-${order.id || 'order'}-${i}`} className="p-5 flex items-center justify-between hover:bg-surface-container-high transition-all group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center bg-background border border-outline relative",
                  (order.status === 'Ready' || order.status === 'ready') && "border-emerald-500/50"
                )}>
                  <ShoppingBag size={20} className={cn(
                    "text-on-surface-variant",
                    (order.status === 'Ready' || order.status === 'ready') && "text-emerald-500"
                  )} />
                  {order.status === 'Ready' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-on-background">#{order.id.slice(-6).toUpperCase()}</p>
                    <span className="w-1 h-1 rounded-full bg-outline" />
                    <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">
                      {new Date(order.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-0.5">
                    {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'} • {order.status}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-on-background">R {order.total_amount?.toLocaleString()}</p>
                <button 
                  onClick={() => window.print()}
                  className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Print Slip
                </button>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="p-12 text-center space-y-4 opacity-40">
              <ShoppingBag size={48} className="mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest">No order history found</p>
            </div>
          )}

          {orders.length > 5 && (
            <button 
              onClick={onViewOrders}
              className="w-full h-14 bg-surface-container-high text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              View All History <ChevronRight size={14} />
            </button>
          )}
        </div>
      </section>

      {/* Activity Log Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">Pulse Activity</h3>
          <Shield size={12} className="text-primary opacity-40" />
        </div>

        <div className="space-y-3">
          {transactions.slice(0, 4).map((tx, i) => (
            <div key={`profile-tx-${tx.id || 'tx'}-${i}`} className="bg-surface-container border border-outline rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-background border border-outline flex items-center justify-center text-primary">
                {tx.category === 'Drinks' ? <Flame size={18} /> : <Zap size={18} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-xs text-on-background">{tx.venueName || 'Venue Purchase'}</p>
                  <p className="font-mono text-xs font-bold text-on-background">R {tx.amount?.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{tx.date}</p>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                    tx.status?.toLowerCase() === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-error/10 text-error"
                  )}>
                    {tx.status}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="p-8 text-center bg-surface-container border border-dashed border-outline rounded-3xl opacity-40">
              <p className="text-[9px] font-black uppercase tracking-widest">Awaiting first activity signal</p>
            </div>
          )}
        </div>
      </section>

      {/* Settings Menu */}
      <div className="space-y-8">
         <section>
            <div className="flex justify-between items-center px-1 mb-3">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">Payment Methods</h3>
               <button 
                 onClick={() => setShowAddCard(true)}
                 className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1 hover:underline"
               >
                 <Plus size={10} /> Add Card
               </button>
            </div>
            
            <div className="bg-surface-container rounded-2xl border border-outline overflow-hidden divide-y divide-outline-variant mb-6">
               {paymentMethods.map((card, i) => (
                  <div key={`profile-card-${card.id || 'card'}-${i}`} className="w-full h-16 flex items-center justify-between px-5 hover:bg-surface-container-high transition-colors group">
                     <div className="flex items-center gap-4 text-left">
                        <CreditCard size={18} className={cn("text-on-surface-variant transition-colors", card.isDefault ? "text-primary" : "group-hover:text-primary")} />
                        <div>
                           <p className="font-bold text-xs text-on-background">{card.brand} •••• {card.last4}</p>
                           {card.isDefault && <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">Primary Method</p>}
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        {!card.isDefault && (
                          <button 
                            onClick={() => setCardDefault(card.id)}
                            className="text-xs font-black uppercase text-on-surface-variant hover:text-primary transition-colors px-2 py-1"
                          >
                             Set Default
                          </button>
                        )}
                        <button 
                          onClick={() => removeCard(card.id)}
                          className="p-2 text-on-surface-variant hover:text-error transition-colors"
                        >
                           <Trash2 size={14} />
                        </button>
                     </div>
                  </div>
               ))}
               
               {paymentMethods.length === 0 && (
                 <div className="p-10 text-center space-y-3 opacity-30">
                    <CreditCard size={32} className="mx-auto" />
                    <p className="text-[9px] font-black uppercase tracking-widest">No Active Cards found</p>
                 </div>
               )}
            </div>

             {/* Workspace Integrations Section */}
             <h3 className="px-1 mb-3 text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">Workspace Integrations</h3>
             <div className="bg-surface-container rounded-2xl border border-outline overflow-hidden mb-6">
                 {/* Gmail Integration Card */}
                 <div className="p-5 flex flex-col gap-4">
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4 text-left">
                             <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                 <Mail size={18} />
                             </div>
                             <div>
                                 <p className="font-bold text-xs text-on-background">Google Gmail Account</p>
                                 <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider">
                                     {gmailConnected ? `Linked: ${gmailEmail}` : 'Not Connected'}
                                 </p>
                             </div>
                         </div>
                         {gmailConnected ? (
                             <button 
                                 type="button"
                                 onClick={handleDisconnectGmail}
                                 className="text-[9px] font-black bg-error/10 text-error border border-error/20 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-error hover:text-white transition-all cursor-pointer"
                             >
                                 Disconnect
                             </button>
                         ) : (
                             <button
                                 type="button"
                                 onClick={handleConnectGmail}
                                 className="text-[9px] font-black bg-primary text-black px-3 py-1.5 rounded-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer"
                             >
                                 Link Gmail
                             </button>
                         )}
                     </div>

                     {gmailError && (
                         <div className="bg-error/10 border border-error/20 p-3 rounded-xl text-error text-[10px] font-bold">
                             {gmailError}
                         </div>
                     )}

                     {/* Gmail Quick Actions if connected */}
                     {gmailConnected && (
                         <div className="border-t border-outline/20 pt-4 space-y-4 animate-in fade-in duration-300">
                             <div className="flex gap-2">
                                 <button
                                     type="button"
                                     onClick={handleFetchGmailMessages}
                                     className="flex-1 h-9 bg-surface-container-high border border-outline rounded-lg text-[9px] font-black uppercase tracking-widest text-on-surface hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                 >
                                     <RefreshCcw size={10} className={isLoadingGmail ? "animate-spin" : ""} />
                                     Check Inbox
                                 </button>
                                 <button
                                     type="button"
                                     onClick={() => {
                                         setGmailError(null);
                                         setShowCompose(true);
                                     }}
                                     className="flex-1 h-9 bg-primary/10 border border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                 >
                                     <Plus size={10} />
                                     Compose Mail
                                 </button>
                             </div>

                             {/* Inbox Message List Preview */}
                             {gmailMessages.length > 0 ? (
                                 <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                     <p className="text-[8px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1.5">
                                         Latest Messages
                                     </p>
                                     {gmailMessages.map((msg) => (
                                         <button 
                                             type="button"
                                             key={msg.id} 
                                             onClick={() => setSelectedGmail(msg)}
                                             className="w-full text-left p-2.5 rounded-lg bg-background/40 hover:bg-background border border-outline/30 hover:border-primary/20 transition-all cursor-pointer space-y-1 block"
                                         >
                                             <div className="flex justify-between items-start gap-2">
                                                 <span className="font-bold text-[10px] text-white truncate max-w-[120px]">
                                                     {msg.from?.split('<')[0] || msg.from}
                                                 </span>
                                                 <span className="text-[8px] font-medium text-on-surface-variant/50 font-mono shrink-0">
                                                     {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                                                 </span>
                                             </div>
                                             <p className="font-black text-[9px] text-primary leading-tight truncate">
                                                 {msg.subject}
                                             </p>
                                             <p className="text-[9px] text-on-surface-variant/70 leading-normal truncate">
                                                 {msg.snippet}
                                             </p>
                                         </button>
                                     ))}
                                 </div>
                             ) : (
                                 !isLoadingGmail && (
                                     <p className="text-[9px] font-bold text-on-surface-variant/40 text-center py-2 uppercase tracking-wider">
                                         No messages loaded. Click Check Inbox.
                                     </p>
                                 )
                             )}

                             {isLoadingGmail && (
                                 <p className="text-[9px] font-bold text-primary text-center py-2 uppercase tracking-widest animate-pulse">
                                     Retrieving secure Gmail threads...
                                 </p>
                             )}
                         </div>
                     )}
                 </div>
             </div>

             {/* Composer Modal Overlay */}
             {showCompose && (
                 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                     <div className="w-full max-w-md bg-surface-container border border-outline rounded-[2rem] p-6 space-y-4 animate-in fade-in zoom-in-95">
                         <div className="flex justify-between items-center">
                             <h3 className="text-sm font-black uppercase tracking-wider text-white">New Workspace Message</h3>
                             <button 
                                 type="button"
                                 onClick={() => {
                                     setShowCompose(false);
                                     setGmailError(null);
                                 }}
                                 className="p-1 text-on-surface-variant hover:text-white transition-colors"
                             >
                                 ✕
                             </button>
                         </div>
                         
                         <form onSubmit={handleSendComposeEmail} className="space-y-4">
                             <div className="space-y-1">
                                 <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">To (Recipient)</label>
                                 <input 
                                     type="email"
                                     required
                                     value={composeTo}
                                     onChange={(e) => setComposeTo(e.target.value)}
                                     placeholder="recipient@example.com"
                                     className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary transition-all"
                                 />
                             </div>

                             <div className="space-y-1">
                                 <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Subject</label>
                                 <input 
                                     type="text"
                                     required
                                     value={composeSubject}
                                     onChange={(e) => setComposeSubject(e.target.value)}
                                     placeholder="Email subject line"
                                     className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary transition-all"
                                 />
                             </div>

                             <div className="space-y-1">
                                 <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Message Body</label>
                                 <textarea 
                                     required
                                     value={composeBody}
                                     onChange={(e) => setComposeBody(e.target.value)}
                                     placeholder="Write your email body here..."
                                     rows={6}
                                     className="w-full bg-background border border-outline rounded-xl p-4 text-xs font-medium outline-none focus:border-primary transition-all resize-none"
                                 />
                             </div>

                             {gmailError && (
                                 <p className="text-error text-[10px] font-bold px-1">{gmailError}</p>
                             )}

                             <div className="flex gap-2">
                                 <button 
                                     type="button"
                                     onClick={() => {
                                         setShowCompose(false);
                                         setGmailError(null);
                                     }}
                                     className="flex-1 h-11 bg-background border border-outline rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface"
                                 >
                                     Cancel
                                 </button>
                                 <button 
                                     type="submit"
                                     disabled={isSendingMail}
                                     className="flex-1 h-11 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                 >
                                     {isSendingMail ? 'Sending email...' : 'Send with Gmail'}
                                 </button>
                             </div>
                         </form>
                     </div>
                 </div>
             )}

             {/* Message Reader Modal Overlay */}
             {selectedGmail && (
                 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                     <div className="w-full max-w-lg bg-surface-container border border-outline rounded-[2rem] p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
                         <div className="flex justify-between items-center pb-2 border-b border-outline/20">
                             <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-primary">Gmail Msg Reader</p>
                                 <h4 className="text-xs font-bold text-white leading-tight mt-1">{selectedGmail.subject}</h4>
                             </div>
                             <button 
                                 type="button"
                                 onClick={() => setSelectedGmail(null)}
                                 className="p-1 text-on-surface-variant hover:text-white transition-colors"
                             >
                                 ✕
                             </button>
                         </div>

                         <div className="space-y-1 text-left">
                             <p className="text-[9px] font-bold text-on-surface-variant/80 uppercase">
                                 From: <span className="text-white font-black">{selectedGmail.from}</span>
                             </p>
                             <p className="text-[9px] font-bold text-on-surface-variant/80 uppercase font-mono">
                                 Date: {selectedGmail.date}
                             </p>
                         </div>

                         <div className="flex-1 overflow-y-auto bg-background/55 border border-outline/40 p-4 rounded-xl text-left font-mono font-medium text-xs leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                             {selectedGmail.body || 'No textual content available.'}
                         </div>

                         <div className="flex gap-2">
                             <button 
                                 type="button"
                                 onClick={() => {
                                     setComposeTo(selectedGmail.from?.match(/<([^>]+)>/)?.[1] || selectedGmail.from || '');
                                     setComposeSubject(`Re: ${selectedGmail.subject}`);
                                     setComposeBody(`\n\nOn ${selectedGmail.date}, ${selectedGmail.from} wrote:\n> ${selectedGmail.snippet}`);
                                     setSelectedGmail(null);
                                     setShowCompose(true);
                                 }}
                                 className="flex-1 h-11 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                             >
                                 Reply
                             </button>
                             <button 
                                 type="button"
                                 onClick={() => setSelectedGmail(null)}
                                 className="flex-1 h-11 bg-surface-container-high border border-outline rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface hover:text-white"
                             >
                                 Close Reader
                             </button>
                         </div>
                     </div>
                 </div>
             )}

            <h3 className="px-1 mb-3 text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">Preferences</h3>
            <div className="bg-surface-container rounded-2xl border border-outline overflow-hidden divide-y divide-outline-variant">
               {[
                 { icon: Shield, label: 'POPIA Privacy', sub: 'Sync Settings' },
                 { icon: Bell, label: 'Pulse Alerts', sub: 'Table Notifications' }
               ].map((item, i) => (
                 <button key={`pref-${item.label}`} className="w-full h-16 flex items-center justify-between px-5 hover:bg-surface-container-high transition-colors group">
                    <div className="flex items-center gap-4 text-left">
                       <item.icon size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                       <div>
                          <p className="font-bold text-xs text-on-background">{item.label}</p>
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{item.sub}</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="text-outline-variant group-hover:translate-x-0.5 transition-transform" />
                 </button>
               ))}
               
               {onAuditClick && (
                 <button onClick={onAuditClick} className="w-full h-16 flex items-center justify-between px-5 hover:bg-surface-container-high transition-colors group border-t border-outline-variant animate-pulse" id="audit-deck-trigger">
                    <div className="flex items-center gap-4 text-left">
                       <ShieldCheck size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                       <div>
                          <p className="font-bold text-xs text-on-background">Systems Audit</p>
                          <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Onboarding & Core Failsafes</p>
                       </div>
                    </div>
                    <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded font-black font-mono">AUDIT DECK</span>
                 </button>
               )}

               <button onClick={onRestartTour} className="w-full h-16 flex items-center justify-between px-5 hover:bg-surface-container-high transition-colors group border-t border-outline-variant">
                  <div className="flex items-center gap-4 text-left">
                     <HelpCircle size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                     <div>
                        <p className="font-bold text-xs text-on-background">Help Guide</p>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Restart Feature Tour</p>
                     </div>
                  </div>
                  <RefreshCcw size={14} className="text-primary opacity-60 group-hover:opacity-100 transition-all" />
               </button>

               <button onClick={onToggleTheme} className="w-full h-16 flex items-center justify-between px-5 hover:bg-surface-container-high transition-colors group">
                  <div className="flex items-center gap-4 text-left">
                     {theme === 'dark' ? <Sun size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" /> : <Moon size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />}
                     <div>
                        <p className="font-bold text-xs text-on-background">App Theme</p>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{theme} Mode Active</p>
                     </div>
                  </div>
                  <div className="w-8 h-4 bg-outline rounded-full relative">
                     <div className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300", theme === 'dark' ? "right-0.5 bg-primary" : "left-0.5 bg-on-surface-variant")} />
                  </div>
               </button>

               {/* Biometric Security Control */}
               <div className="w-full h-16 flex items-center justify-between px-5 bg-surface-container/10 group border-t border-outline-variant">
                  <div className="flex items-center gap-4 text-left">
                     <Fingerprint size={18} className="text-primary animate-pulse" />
                     <div>
                        <p className="font-bold text-xs text-on-background">Biometric Security</p>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                           {hasBiometricsEnrolled ? 'FaceID / Fingerprint Active' : 'Not Registered'}
                        </p>
                     </div>
                  </div>
                  {hasBiometricsEnrolled ? (
                     <button 
                        onClick={() => {
                           localStorage.removeItem('wayta_biometric_enrolled');
                           localStorage.removeItem('wayta_biometric_phone');
                           // Clear all matching stored keys
                           for (let key in localStorage) {
                              if (key.startsWith('wayta_biom_id_')) {
                                 localStorage.removeItem(key);
                              }
                           }
                           setHasBiometricsEnrolled(false);
                        }}
                        className="h-8 px-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border border-red-500/20"
                        title="Revoke and unlink biometric keys"
                     >
                        Deauthorize Key
                     </button>
                  ) : (
                     <span className="text-[8px] border border-outline-variant text-zinc-500 font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded">
                        Inactive
                     </span>
                  )}
               </div>
            </div>
         </section>

         {isBartenderEnabled && isBartender && (
           <div className="bg-surface-container border border-outline rounded-3xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1 group-hover:text-primary transition-colors">Role: {user?.role}</h3>
                    <p className="text-lg font-black tracking-tight text-on-background uppercase">Bartender Terminal</p>
                 </div>
                 <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <Zap size={18} fill="currentColor" />
                 </div>
              </div>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase leading-relaxed tracking-wider mb-4">You have active throughput permissions for Wayta Express Point A.</p>
              <div className="h-px w-full bg-outline mb-4" />
              <button 
                onClick={onBartenderClick}
                className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:gap-3 transition-all"
              >
                 Enter Command Center <ChevronRight size={18} />
              </button>
           </div>
         )}

         <button 
           onClick={onLogout}
           className="w-full h-14 bg-surface-container border border-outline rounded-xl flex items-center justify-center gap-3 text-on-surface-variant group active:scale-95 transition-all"
         >
            <LogOut size={16} className="group-hover:text-amber-500 transition-colors" />
            <span className="font-black uppercase tracking-[0.3em] text-[10px]">End Session</span>
         </button>

         <button
            onClick={async () => {
                if (!user || !window.confirm("Are you sure you want to PERMANENTLY delete your account? This action cannot be undone.")) return;
                try {
                    setIsProcessing(true);
                    await userService.permanentlyDeleteUser(user.uid);
                    const { deleteUser } = await import('firebase/auth');
                    const { auth } = await import('../lib/firebase');
                    if (auth.currentUser) await deleteUser(auth.currentUser);
                    onLogout();
                } catch (e) {
                    console.error("Delete account error:", e);
                    alert("Failed to delete account. Please try again.");
                } finally {
                    setIsProcessing(false);
                }
            }}
            className="w-full h-14 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-3 text-red-500 group active:scale-95 transition-all hover:bg-red-500/20 hover:border-red-500/40"
         >
            <Trash2 size={16} className="group-hover:text-red-500 transition-colors" />
            <span className="font-black uppercase tracking-[0.3em] text-[10px]">Delete Account</span>
         </button>

         {onAdminClick && isAdmin && (
            
           <button 
             onClick={onAdminClick}
             className="w-full h-14 relative overflow-hidden bg-surface-container border border-outline rounded-xl flex items-center justify-center gap-3 group transition-all mt-4 active:scale-95 text-on-surface"
           >
              <Settings size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="font-black uppercase tracking-[0.3em] text-[10px]">Admin Dashboard</span>
               {false && (
                 <div className="absolute inset-0 bg-black/65 backdrop-blur-[1.5px] flex items-center justify-center cursor-not-allowed select-none z-10 transition-opacity">
                   <div className="flex flex-col items-center justify-center gap-[1px]">
                     <span className="text-[10px] font-black uppercase text-red-500 tracking-wider leading-none">Blocked</span>
                     <span className="text-[7px] font-black uppercase text-red-400/80 tracking-widest text-center leading-none mt-[2px]">Access Disabled</span>
                   </div>
                 </div>
               )}
           </button>
         )}

         {onPartnerClick && (
            <PartnerWaytaButton onClick={handlePartnerClick} className="w-full mt-4" />
          )}
      </div>

          <div className="p-4 flex flex-col items-center gap-4">
             <p className="text-[9px] font-black uppercase tracking-[0.5em] text-on-surface-variant">Wayta Mobile • V2.4.0 • SANDTON</p>
          </div>

      <AnimatePresence>
        {showAddCard && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAddCard(false)}
               className="absolute inset-0"
            />
            
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-sm bg-surface-container border-t sm:border border-outline rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 pb-4">
                 <h3 className="text-xl font-black uppercase tracking-tight">Add New Card</h3>
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">PCI Compliant Mesh Authorization</p>
              </div>
              
              <form onSubmit={handleAddCard} className="p-8 pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant px-1">Card Number</label>
                  <input 
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    onChange={(e) => setNewCard(p => ({ ...p, number: e.target.value.replace(/\D/g, '') }))}
                    className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-mono text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-on-surface-variant px-1">Expiry</label>
                    <input 
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-mono text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-on-surface-variant px-1">CVC</label>
                    <input 
                      type="text"
                      required
                      placeholder="•••"
                      maxLength={3}
                      className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-mono text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="w-full h-14 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all mt-4"
                >
                  Secure Add Card
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddFunds && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 pb-0 sm:pb-24">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => !isProcessing && setShowAddFunds(false)}
               className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-surface-container border-t sm:border border-outline rounded-t-[2.5rem] sm:rounded-[2rem] overflow-hidden"
            >
              <div className="p-8 pb-4">
                 <div className="w-12 h-1.5 bg-outline/30 rounded-full mx-auto mb-8 sm:hidden" />
                 <h3 className="text-2xl font-black uppercase tracking-tight text-on-background">Load Wallet</h3>
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Select funds to inject into your Wayta session</p>
              </div>
              
              <form onSubmit={handleAddFunds} className="p-8 pt-4 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Amount (ZAR)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-mono font-bold text-primary group-focus-within:scale-110 transition-transform">R</span>
                    <input 
                      type="number"
                      required
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-20 bg-background border border-outline rounded-3xl pl-12 pr-6 text-3xl font-mono font-bold text-on-surface outline-none focus:border-primary transition-colors"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                   {[100, 250, 500, 1000].map(amt => (
                     <button 
                       key={amt}
                       type="button"
                       onClick={() => setAddAmount(amt.toString())}
                       className="h-12 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-tighter hover:border-primary/50 transition-all text-on-surface"
                       disabled={isProcessing}
                     >
                       +{amt}
                     </button>
                   ))}
                </div>

                <div className="pt-4 space-y-4">
                   <button 
                     type="submit"
                     disabled={isProcessing || !addAmount}
                     className="w-full h-16 bg-primary text-black rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl amber-glow disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
                   >
                     {isProcessing ? (
                       <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                     ) : (
                       <>Secure Load <ArrowUpRight size={18} /></>
                     )}
                   </button>
                   
                   <button 
                     type="button"
                     onClick={() => setShowAddFunds(false)}
                     disabled={isProcessing}
                     className="w-full text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant py-2 hover:text-on-surface transition-colors"
                   >
                     Cancel Transaction
                   </button>
                </div>
              </form>
              
              <div className="p-6 bg-surface-container-high/50 border-t border-outline flex items-center justify-center gap-4">
                 <ShieldCheck size={16} className="text-emerald-500" />
                 <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">
                   Bank-grade 256-bit encryption active. Funds compatible with all Wayta mesh venues.
                 </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
