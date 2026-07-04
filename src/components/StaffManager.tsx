import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Event } from '../types';
import { staffService } from '../services/staffService';
import { cn } from '../lib/utils';
import { 
  User2, Shield, Trash2, Search, Filter, 
  UserPlus, Phone, Mail, Sparkles, Check, 
  CheckCircle, AlertCircle, Copy, X, 
  RefreshCw, AlertTriangle, Info, ChevronDown, 
  Users, UsersRound, HelpCircle
} from 'lucide-react';

interface StaffManagerProps {
  venueId: string;
  theme: 'light' | 'dark';
  events?: Event[];
  currentUserId?: string;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ venueId, theme, events = [], currentUserId }) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGender, setNewGender] = useState('Prefer not to say');
  const [newRole, setNewRole] = useState('BARTENDER');
  
  // Advanced UX Notification States
  const [generatedCreds, setGeneratedCreds] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Searching & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  const isDark = theme === 'dark';

  // Live Firebase connection setup
  useEffect(() => {
    if (!venueId) return;
    const unsub = staffService.listenToStaff(venueId, setStaff);
    return () => unsub();
  }, [venueId]);

  // Handle staff registration
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Core check
    if (!newName.trim()) {
      setErrorMessage('Full Name is required');
      return;
    }
    if (!newEmail.trim()) {
      setErrorMessage('Email address is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const result = await staffService.enrollStaff(
        venueId, 
        newName.trim(), 
        newEmail.trim(), 
        newRole, 
        undefined, 
        newPhone.trim(), 
        newGender
      );
      
      setGeneratedCreds(result);
      setShowAddForm(false);
      setNewEmail('');
      setNewName('');
      setNewPhone('');
      setNewGender('Prefer not to say');
      setNewRole('BARTENDER');
    } catch (error: any) {
      console.error('Enrollment failed:', error);
      setErrorMessage(error.message || 'Staff enrollment failed. Email might already exist in client files.');
    } finally {
      setLoading(false);
    }
  };

  // Iframe-compliant copy feature (Never triggers window.alert)
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch(err => {
        console.error('Failed to copy staff credentials:', err);
        setErrorMessage('Failed to write credentials to system clipboard.');
      });
  };

  // Live dynamic analytics counts
  const stats = useMemo(() => {
    const counts = {
      total: staff.length,
      bartender: 0,
      waiter: 0,
      manager: 0,
      eventSpec: 0
    };

    staff.forEach(item => {
      if (item.role === 'BARTENDER') counts.bartender++;
      else if (item.role === 'WAITER') counts.waiter++;
      else if (item.role === 'MANAGER') counts.manager++;
      else if (item.role === 'EVENT_MANAGER') counts.eventSpec++;
    });

    return counts;
  }, [staff]);

  // Reactive Search and Filter implementation
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = 
        (member.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.phone || '').includes(searchQuery);

      if (selectedRoleFilter === 'ALL') return matchesSearch;
      return member.role === selectedRoleFilter && matchesSearch;
    });
  }, [staff, searchQuery, selectedRoleFilter]);

  return (
    <div className="p-4 md:p-8 space-y-8 relative max-w-7xl mx-auto">
      {/* Header and Add Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tight text-on-background flex items-center gap-2">
            <UsersRound className="text-primary" size={24} />
            Establishment Team Members
          </h3>
          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">
            Assign duties, manage authorization roles, and register secure gate codes
          </p>
        </div>
        
        <button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErrorMessage('');
          }}
          className={cn(
            "h-12 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2",
            showAddForm 
              ? "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80" 
              : "bg-primary text-on-primary hover:bg-primary/90 shadow-lg shadow-primary/10 active:scale-95"
          )}
        >
          {showAddForm ? (
            <>
              <X size={14} /> Close
            </>
          ) : (
            <>
              <UserPlus size={14} /> Add Team Member
            </>
          )}
        </button>
      </div>

      {/* Live Operational Insights Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 select-none">
        <div className="bg-surface-container border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Active Staff</span>
          <p className="text-3xl font-black text-white mt-1">{stats.total}</p>
          <span className="text-[8px] text-on-surface-variant/30 mt-1 uppercase">Total Team Assets</span>
        </div>
        <div className="bg-surface-container border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Bartenders</span>
          <p className="text-3xl font-black text-primary mt-1">{stats.bartender}</p>
          <span className="text-[8px] text-on-surface-variant/30 mt-1 uppercase">Bar Counter Staff</span>
        </div>
        <div className="bg-surface-container border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Waiters</span>
          <p className="text-3xl font-black text-amber-400 mt-1">{stats.waiter}</p>
          <span className="text-[8px] text-on-surface-variant/30 mt-1 uppercase">Distribution Logistics</span>
        </div>
        <div className="bg-surface-container border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Managers</span>
          <p className="text-3xl font-black text-emerald-400 mt-1">{stats.manager}</p>
          <span className="text-[8px] text-on-surface-variant/30 mt-1 uppercase">Assistant Operators</span>
        </div>
        <div className="bg-surface-container border border-white/5 p-4 rounded-2xl flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[9px] font-black uppercase text-on-surface-variant/40 tracking-wider">Event Specialists</span>
          <p className="text-3xl font-black text-blue-400 mt-1">{stats.eventSpec}</p>
          <span className="text-[8px] text-on-surface-variant/30 mt-1 uppercase">Activation Hosts</span>
        </div>
      </div>
      
      {/* Search and Filters Controller Dashboard */}
      <div className="bg-surface-container/60 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone number..."
            className="w-full h-11 bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 text-xs text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary transition-all font-mono"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto text-nowrap p-0.5">
          {[
            { label: 'All Roles', value: 'ALL' },
            { label: 'Bartenders', value: 'BARTENDER' },
            { label: 'Waiters', value: 'WAITER' },
            { label: 'Managers', value: 'MANAGER' },
            { label: 'Hosts', value: 'EVENT_MANAGER' }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setSelectedRoleFilter(item.value)}
              className={cn(
                "text-[9px] font-bold uppercase px-3.5 py-2.5 rounded-xl transition-all cursor-pointer",
                selectedRoleFilter === item.value 
                  ? "bg-white/10 text-white border border-white/10 font-black" 
                  : "text-on-surface-variant/60 hover:text-white hover:bg-white/[0.02]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ADD STAFF Collapsible Section */}
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddStaff} className="p-6 md:p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl bg-surface-container relative">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5 font-mono">
                  <UserPlus size={16} className="text-primary" />
                  New Staff Registration Desk
                </span>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-on-surface-variant/60 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-black text-red-400 uppercase tracking-wider">Registration Error</h5>
                    <p className="text-[10.5px] font-mono text-white/90 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block text-on-surface-variant/60">Full Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Sipho Nkosi"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-background/50 border border-white/5 rounded-xl p-3.5 font-bold text-xs text-white outline-none focus:border-primary transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block text-on-surface-variant/60">Email Address *</label>
                  <input 
                    type="email"
                    required
                    placeholder="staff.member@wayta.co.za"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-background/50 border border-white/5 rounded-xl p-3.5 font-bold text-xs text-white outline-none focus:border-primary transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block text-on-surface-variant/60">Phone Number (Optional)</label>
                  <input 
                    type="tel"
                    placeholder="e.g. +27 82 123 4567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-background/50 border border-white/5 rounded-xl p-3.5 font-bold text-xs text-white outline-none focus:border-primary transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block text-on-surface-variant/60">Gender Identification</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full bg-background/50 border border-white/5 rounded-xl p-3.5 font-bold text-xs text-white outline-none focus:border-primary transition-all font-mono appearance-none"
                  >
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block text-on-surface-variant/60">Role Assignment</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { role: 'BARTENDER', label: 'Bartender', info: 'Counter sales & drink prep' },
                      { role: 'WAITER', label: 'Waiter', info: 'Floor runner & logistics' },
                      { role: 'MANAGER', label: 'Assistant Manager', info: 'Gate and terminal oversight' },
                      { role: 'EVENT_MANAGER', label: 'Event Host', info: 'Assisted setup coordinator' }
                    ].map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setNewRole(item.role)}
                        className={cn(
                          "p-4 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer h-24",
                          newRole === item.role 
                            ? "bg-primary/10 border-primary text-white" 
                            : "bg-background/20 border-white/5 text-on-surface-variant/80 hover:border-white/15"
                        )}
                      >
                        <span className="text-xs font-black uppercase tracking-wide">{item.label}</span>
                        <span className="text-[8px] opacity-40 mt-1 uppercase font-mono font-medium leading-tight">{item.info}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full h-14 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer",
                  loading && "opacity-50"
                )}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Enrolling Profile...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> GENERATE TEAM CREDENTIALS
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credentials Modal (Iframe-compliant copy actions) */}
      <AnimatePresence>
        {generatedCreds && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="w-full max-w-md p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative bg-surface-container overflow-hidden"
            >
              {/* Copy Success Feedback banner */}
              <AnimatePresence>
                {copySuccess && (
                  <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="absolute top-0 left-0 right-0 bg-emerald-500 text-black text-center py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Copied to Clipboard Successfully
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center mb-6 mt-4">
                 <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <Shield className="text-emerald-400" size={32} />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tight text-white italic">Profile Activated</h3>
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-2 text-emerald-400">Database Entry Hardened & Encrypted</p>
              </div>

              <div className="space-y-4 mb-6">
                 {/* Expose PIN warn instruction */}
                 <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-2.5">
                   <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                   <p className="text-[9.5px] uppercase font-mono leading-relaxed text-amber-200">
                     Warning: The access PIN is cryptographically hashed once closed. Please store it safely now.
                   </p>
                 </div>

                 <div className="p-4 rounded-xl border border-white/5 bg-black/40">
                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 mb-1">Handle / Name</p>
                    <p className="text-base font-black uppercase text-white">{generatedCreds.displayName}</p>
                 </div>
                 <div className="p-4 rounded-xl border border-white/5 bg-black/40">
                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 mb-1">Username (Login ID)</p>
                    <p className="text-sm font-black text-white font-mono">{generatedCreds.username}</p>
                 </div>
                 <div className="p-4.5 rounded-xl border border-primary/30 bg-primary/5 text-center cursor-pointer hover:bg-primary/10 transition-all group"
                      onClick={() => copyToClipboard(`WAYTA LOGIN\nUser: ${generatedCreds.username}\nPIN: ${generatedCreds.pin}`)}>
                    <p className="text-[8px] font-black uppercase text-primary mb-1">Access PIN (6-Digits)</p>
                    <p className="text-3xl font-mono font-black tracking-[0.4em] text-primary">{generatedCreds.pin}</p>
                    <span className="text-[7.5px] font-bold uppercase text-primary/40 group-hover:text-primary transition-colors block mt-2">
                       Click barcode box to copy all details
                    </span>
                 </div>
                 <div className="p-4 rounded-xl border border-white/5 bg-black/40 flex justify-between items-center">
                    <div>
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 mb-0.5">Primary Role</p>
                      <p className="text-xs font-black uppercase text-white tracking-wide">{generatedCreds.role}</p>
                    </div>
                    <span className="text-[8px] bg-white/5 border border-white/10 text-white font-semibold uppercase px-2 py-1 rounded">Active</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => copyToClipboard(`WAYTA LOGIN\nUser: ${generatedCreds.username}\nPIN: ${generatedCreds.pin}`)}
                   className="h-12 rounded-xl border border-white/10 hover:border-white/25 flex items-center justify-center font-black text-[9px] uppercase tracking-widest text-white transition-all cursor-pointer bg-white/5 hover:bg-white/10"
                 >
                   <Copy size={12} className="mr-1.5" /> Copy Login Info
                 </button>
                 <button 
                   onClick={() => setGeneratedCreds(null)}
                   className="h-12 bg-primary text-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all cursor-pointer hover:bg-primary/80"
                 >
                   Done / Close
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredStaff.map(member => {
            const isMe = member.uid === currentUserId;
            return (
              <motion.div 
                layout
                key={`staff-${member.uid}`} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-6 rounded-3xl border flex flex-col justify-between gap-6 transition-all bg-surface-container shadow-sm relative group",
                  isMe 
                    ? "border-primary/30 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.02)]" 
                    : "border-white/5 hover:border-white/10"
                )}
              >
                {/* Active Personal Indicator */}
                {isMe && (
                  <span className="absolute top-4 right-4 bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase px-2.5 py-1 rounded-md">
                     You (Owner / Manager)
                  </span>
                )}

                <div className="space-y-4">
                  {/* Avatar and Name */}
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-black/40 border border-white/5 rounded-xl flex items-center justify-center shadow-inner text-primary select-none font-bold text-sm shrink-0">
                      {member.displayName ? member.displayName.charAt(0).toUpperCase() : <User2 size={18} />}
                    </div>
                    <div className="truncate">
                      <span className="font-black uppercase tracking-tight block text-white truncate text-sm">
                        {member.displayName || member.username || 'Unnamed Staff'}
                      </span>
                      <span className="text-[9px] font-mono font-medium text-on-surface-variant/50 tracking-wider uppercase block mt-0.5 truncate">
                        ID: {member.uid.split('-')[0] || member.uid.slice(0, 8)} • @{member.username || 'staff'}
                      </span>
                    </div>
                  </div>

                  {/* Core Badge Labels */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    {/* Contact detail lists */}
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/70">
                      <Mail size={12} className="text-on-surface-variant/30 text-xs shrink-0" />
                      <span className="truncate font-mono">{member.email || 'No email recorded'}</span>
                    </div>
                    {((member as any).phone || (member as any).phone_number) && (
                      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/75">
                        <Phone size={12} className="text-on-surface-variant/30 text-xs shrink-0" />
                        <span className="font-mono">{(member as any).phone || (member as any).phone_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-t border-white/5 pt-4">
                  {/* Action Dropdowns */}
                  <div className="space-y-2.5">
                    {/* Dynamic Event Assign */}
                    {events && events.length > 0 && (
                      <div>
                        <span className="text-[7.5px] font-black uppercase text-on-surface-variant/40 tracking-wider block mb-1">Duties Assignment</span>
                        <div className="relative">
                          <select 
                            value={(member as any).assigned_event_id || ''}
                            disabled={isMe}
                            onChange={(e) => staffService.updateStaffEventAssignment(member.uid, e.target.value || null)}
                            className={cn(
                              "w-full bg-black/30 border border-white/5 rounded-xl p-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all text-white appearance-none cursor-pointer pr-10",
                              isMe && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <option value="">Full Venue Pool</option>
                            {events.map(ev => (
                              <option key={ev.id} value={ev.id}>{ev.title || ev.name || 'Unnamed Activation'}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/50" />
                        </div>
                      </div>
                    )}

                    {/* Role selector dropdown */}
                    <div>
                      <span className="text-[7.5px] font-black uppercase text-on-surface-variant/40 tracking-wider block mb-1">Security / Staff Role</span>
                      <div className="relative">
                        <select 
                          value={member.role}
                          disabled={isMe}
                          onChange={(e) => staffService.updateStaffRole(member.uid, e.target.value)}
                          className={cn(
                            "w-full bg-black/30 border border-white/5 rounded-xl p-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all text-white appearance-none cursor-pointer pr-10",
                            isMe && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <option value="BARTENDER">Bartender</option>
                          <option value="WAITER">Waiter</option>
                          <option value="MANAGER">Manager Assistant</option>
                          <option value="EVENT_MANAGER">Event Specialist</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/50" />
                      </div>
                    </div>
                  </div>

                  {/* Removing Action Desk */}
                  {!isMe && (
                    <div className="border-t border-white/5 pt-4">
                      {confirmDeleteId === member.uid ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3">
                          <p className="text-[9px] font-bold text-red-200 uppercase font-mono text-center tracking-wide leading-tight">
                            Confirm removing {member.displayName || 'Staff'}?
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={deletingId === member.uid}
                              onClick={() => setConfirmDeleteId(null)}
                              className="h-9 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === member.uid}
                              onClick={async () => {
                                try {
                                  setDeletingId(member.uid);
                                  await staffService.deleteStaff(member.uid);
                                  setConfirmDeleteId(null);
                                } catch(err: any) {
                                  console.error("Failed to delete staff:", err);
                                  setErrorMessage(err.message || "Failed to remove staff member");
                                } finally {
                                  setDeletingId(null);
                                }
                              }}
                              className="h-9 bg-red-500 text-black hover:bg-red-400 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                            >
                              {deletingId === member.uid ? 'Wait...' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmDeleteId(member.uid)}
                          className="w-full h-11 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs text-on-surface-variant group-hover:text-red-400 cursor-pointer text-[9px] font-black uppercase tracking-widest"
                          title="Remove Staff Member"
                        >
                          <Trash2 size={13} /> Remove Member
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredStaff.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 py-16 text-center bg-surface-container/30 border border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 select-none">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-on-surface-variant/20">
              <Users size={28} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-widest">No Staff Members Found</h4>
              <p className="text-[10px] text-on-surface-variant/40 max-w-xs mx-auto mt-1 uppercase tracking-wide leading-relaxed">
                Try revising the selected role filter or search parameters.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
