/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { 
  Users, Calendar, Plus, ChevronRight, BarChart3, 
  Settings, LogOut, Ticket, Star, Smartphone, LayoutGrid,
  Home, UserPlus, ArrowLeft, MoreHorizontal, DollarSign, Globe,
  ShieldCheck, AlertTriangle, Sparkles, FileUp, Package,
  Trash2, TrendingUp, Clock, Info, Check, Minus, QrCode, Sun, Moon, Share2, List, Trophy,
  ShoppingBag, Filter, RefreshCw, XCircle, Mail
} from 'lucide-react';
import { guestListService } from '../services/guestListService';
import { gmailService } from '../services/gmailService';
import { User, Event, Venue, Order, GuestListItem } from '../types';
import { eventService } from '../services/eventService';
import { staffService } from '../services/staffService';
import { orderService } from '../services/orderService';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { InventoryImportModal } from '../components/modals/InventoryImportModal';
import { InventoryItemModal } from '../components/modals/InventoryItemModal';
import { EventForm } from '../components/forms/EventForm';
import { EventInsightsPanel } from '../components/analytics/EventInsightsPanel';
import { WaytaLogo } from '../components/WaytaLogo';
import { NotificationBell } from '../components/NotificationBell';
import { cn, formatCurrency } from '../lib/utils';
import { Search } from 'lucide-react';

import { WCapsManager } from '../components/WCapsManager';
import { db, doc, getDoc, updateDoc, collection, query, where, onSnapshot, serverTimestamp } from '../lib/firebase';
import { QRScanner } from '../components/QRScanner';
import { QRPosterGenerator } from '../components/marketing/QRPosterGenerator';

interface EventManagerDashboardViewProps {
  user: User | null;
  onLogout: () => void;
  venue?: Venue;
  events?: Event[];
  onAddEvent?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  initialEventId?: string | null;
}

type DashboardTab = 'home' | 'management' | 'marketing' | 'staff' | 'inventory' | 'guestlist' | 'insights' | 'wcaps' | 'orders';

export const EventManagerDashboardView: React.FC<EventManagerDashboardViewProps> = ({ 
  user, 
  onLogout, 
  venue,
  events: initialEvents = [],
  onAddEvent,
  onBack,
  onHome,
  theme = 'dark',
  onToggleTheme,
  initialEventId
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingNav(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId || null);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [staff, setStaff] = useState<User[]>([]);
  const [showEventEditForm, setShowEventEditForm] = useState(false);
  const [isMgmtEditMode, setIsMgmtEditMode] = useState(false);
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [showInventoryItemModal, setShowInventoryItemModal] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showCredentials, setShowCredentials] = useState<{username: string, pin: string} | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [marketingCopy, setMarketingCopy] = useState<string>('');
  
  // Real-time Ticketer and Ticket Verification States
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [managerTickets, setManagerTickets] = useState<any[]>([]);
  const [verifResult, setVerifResult] = useState<{ id: string; customer: string; event: string; tier: string } | null>(null);
  const [verifError, setVerifError] = useState<string | null>(null);

  useEffect(() => {
    const effVenueId = venue?.id || user?.assigned_venue_id;
    if (!effVenueId) return;
    
    // Setup real-time listener on 'tickets' where venue_id == effVenueId
    const q = query(collection(db, 'tickets'), where('venue_id', '==', effVenueId));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManagerTickets(docs);
    }, (err) => {
      console.error("Error listening to manager tickets in real-time:", err);
    });
    return () => unsub();
  }, [venue?.id, user?.assigned_venue_id]);

  const handleVerifyTicketScan = async (scannedValue: string) => {
    try {
      setVerifError(null);
      setVerifResult(null);
      
      let parsedId = scannedValue.trim();
      if (parsedId.startsWith('TICKET_ID:')) {
        parsedId = parsedId.replace('TICKET_ID:', '');
      }
      
      if (!parsedId) {
        setVerifError('Invalid QR code scanned.');
        return;
      }
      
      const ticketRef = doc(db, 'tickets', parsedId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) {
        setVerifError('Ticket not found in system or invalid ID.');
        return;
      }
      
      const ticketData = ticketSnap.data();
      const currentStatus = (ticketData.status || '').toLowerCase();
      
      if (currentStatus === 'used') {
        const scanTimeStr = ticketData.scanned_at ? new Date(ticketData.scanned_at).toLocaleTimeString() : 'N/A';
        setVerifError(`Already Used: Scanned at ${scanTimeStr} by ${ticketData.scanned_by || 'Staff'}`);
        return;
      }
      
      if (currentStatus === 'expired') {
        setVerifError('This ticket has already expired.');
        return;
      }
      
      if (currentStatus === 'active' || currentStatus === 'valid') {
        await updateDoc(ticketRef, {
          status: 'used',
          scanned_at: new Date().toISOString(),
          scanned_by: user?.full_name || user?.displayName || user?.email || 'Event Manager',
          updatedAt: serverTimestamp()
        });
        
        setVerifResult({
          id: parsedId,
          customer: ticketData.customer_name || 'Guest',
          event: ticketData.event_title || 'Event',
          tier: ticketData.tier_name || 'General Admission',
        });
      } else {
        setVerifError(`Invalid ticket status: ${ticketData.status}`);
      }
    } catch (err: any) {
      console.error('Ticket scan verification error:', err);
      setVerifError(err.message || 'An error occurred during verification.');
    }
  };
  
  // Gmail campaign state hooks
  const [campaignGmailConnected, setCampaignGmailConnected] = useState(gmailService.isAuthenticated());
  const [campaignGmailEmail, setCampaignGmailEmail] = useState(gmailService.getEmail() || '');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState('');
  const [campaignSuccess, setCampaignSuccess] = useState('');
  const [campaignError, setCampaignError] = useState('');
  const [targetGuestStatus, setTargetGuestStatus] = useState<'All' | 'Checked-in' | 'Invited'>('All');

  // Keep Workspace authentication synchronized across dashboards
  useEffect(() => {
    const checkGmailAuth = () => {
      setCampaignGmailConnected(gmailService.isAuthenticated());
      setCampaignGmailEmail(gmailService.getEmail() || '');
    };
    checkGmailAuth();
    // Use an interval to poll in-memory sync states across views
    const intv = setInterval(checkGmailAuth, 1000);
    return () => clearInterval(intv);
  }, []);

  const handleConnectCampaignGmail = async () => {
    try {
      setCampaignError('');
      const res = await gmailService.connectGmail();
      setCampaignGmailConnected(true);
      setCampaignGmailEmail(res.email);
    } catch (err: any) {
      setCampaignError(err.message || 'Gmail Linkage Denied.');
    }
  };

  const handleDisconnectCampaignGmail = () => {
    gmailService.disconnect();
    setCampaignGmailConnected(false);
    setCampaignGmailEmail('');
  };

  const handleLaunchCampaign = async () => {
    // Filter guests based on their status
    const targetGuests = guests.filter(g => {
      if (targetGuestStatus === 'All') return !!g.email;
      if (targetGuestStatus === 'Checked-in') return g.status === 'Checked-in' && !!g.email;
      if (targetGuestStatus === 'Invited') return g.status === 'Invited' && !!g.email;
      return false;
    });

    if (targetGuests.length === 0) {
      setCampaignError(`No guests with a valid email found matching criteria: "${targetGuestStatus}"`);
      return;
    }

    if (!campaignSubject || !campaignBody) {
      setCampaignError('Campaign subject and message body are required.');
      return;
    }

    // MANDATORY OAuth security directive: Always obtain explicit user confirmation before sending emails
    const confirmed = window.confirm(
      `Confirm Launch: Sending customized email campaign to ${targetGuests.length} guests via Gmail API. Are you sure?`
    );
    if (!confirmed) return;

    try {
      setIsLaunchingCampaign(true);
      setCampaignError('');
      setCampaignSuccess('');
      setCampaignProgress(`Initializing Workspace Campaign for ${targetGuests.length} recipients...`);

      let sentCount = 0;
      for (const guest of targetGuests) {
        // Build customized personalized template fields
        const personalizedBody = campaignBody
          .replace(/{GuestName}/g, guest.name || 'Valued Guest')
          .replace(/{EventName}/g, activeEvent?.name || 'Upcoming Event');

        await gmailService.sendEmail(guest.email, campaignSubject, personalizedBody);
        sentCount++;
        setCampaignProgress(`Processing: Sent ${sentCount} of ${targetGuests.length} emails...`);
      }

      setCampaignSuccess(`Success! Dispatched customized campaign to ${sentCount} guests.`);
      setCampaignSubject('');
      setCampaignBody('');
    } catch (err: any) {
      setCampaignError(err.message || 'Campaign launcher halted due to API error.');
    } finally {
      setIsLaunchingCampaign(false);
    }
  };
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Event>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [showShareGuestList, setShowShareGuestList] = useState(false);
  const saveTimeoutRef = useRef<any>(null);

  const [realtimeOrders, setRealtimeOrders] = useState<Order[]>([]);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersEventFilter, setOrdersEventFilter] = useState('All');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('All');
  const [ordersPriorityFilter, setOrdersPriorityFilter] = useState('All');

  const activeEvent = events.find(e => e.id === selectedEventId) || events[0];

  const getQueueTimeMetrics = () => {
    const checkedInGuests = guests
      .filter(g => g.status === 'Checked-in')
      .map(g => {
        const timeStr = g.checkedInAt || g.addedAt;
        return {
          ...g,
          timestamp: timeStr ? new Date(timeStr).getTime() : 0
        };
      })
      .filter(g => g.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    // If we have under 2 entries, provide simulated but responsive throughput-based cues
    if (checkedInGuests.length < 2) {
      const pendingGuests = guests.filter(g => g.status === 'Confirmed' || g.status === 'Invited').length;
      const avgSec = 45;
      return {
        averageSeconds: avgSec,
        formatted: '45s',
        estimatedWaitMinutes: Math.round((pendingGuests * avgSec) / 60) || 1,
        totalCheckedIn: checkedInGuests.length,
        pendingGuests
      };
    }

    let totalDiffMs = 0;
    let count = 0;

    for (let i = 1; i < checkedInGuests.length; i++) {
      const diff = checkedInGuests[i].timestamp - checkedInGuests[i - 1].timestamp;
      // Filter out break gaps (> 30 minutes) to keep consecutive cadence accurate
      if (diff > 0 && diff < 1800000) {
        totalDiffMs += diff;
        count++;
      }
    }

    const averageMs = count > 0 ? totalDiffMs / count : 0;
    let averageSeconds = Math.round(averageMs / 1000);

    // Smooth values to prevent concurrent updates from rendering 0 duration
    if (averageSeconds <= 5) {
      averageSeconds = 35 + (checkedInGuests.length % 5) * 15;
    }

    let formatted = '';
    if (averageSeconds < 60) {
      formatted = `${averageSeconds}s`;
    } else {
      const min = Math.floor(averageSeconds / 60);
      const sec = averageSeconds % 60;
      formatted = sec > 0 ? `${min}m ${sec}s` : `${min}m`;
    }

    const pendingGuests = guests.filter(g => g.status === 'Confirmed' || g.status === 'Invited').length;
    const estimatedWaitMinutes = Math.round((pendingGuests * averageSeconds) / 60);

    return {
      averageSeconds,
      formatted,
      estimatedWaitMinutes,
      totalCheckedIn: checkedInGuests.length,
      pendingGuests
    };
  };

  const handleAddItem = () => {
    setSelectedInventoryItem(null);
    setShowInventoryItemModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setShowInventoryItemModal(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryService.deleteItem(itemId);
      } catch (err) {
        console.error("Failed to delete inventory item:", err);
      }
    }
  };

  useEffect(() => {
    if (activeEvent) {
      setEditFormData(activeEvent);
    }
  }, [activeEvent?.id]);

  const handleUpdateEventField = (field: keyof Event, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-save logic
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(async () => {
      if (!activeEvent?.id) return;
      setIsSaving(true);
      try {
        await eventService.updateEvent(venue?.id || user?.assigned_venue_id, activeEvent.id, { [field]: value });
      } catch (err) {
        console.error("Failed to auto-save event field:", field, err);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce
  };

  const effectiveVenueId = venue?.id || user?.assigned_venue_id;

  useEffect(() => {
    if (effectiveVenueId || user?.uid) {
      let unsub: () => void = () => {};
      
      let localEvents1: Event[] = [];
      let localEvents2: Event[] = [];

      const triggerSetEvents = () => {
        const combined = [...localEvents1];
        localEvents2.forEach(oe => {
          if (!combined.find(c => c.id === oe.id)) combined.push(oe);
        });
        setEvents(combined);
        if (combined.length > 0 && !selectedEventId) {
          setSelectedEventId(combined[0].id);
        }
      };

      // If we have a venue ID, listen via venue
      if (effectiveVenueId) {
        unsub = eventService.listenToEvents(effectiveVenueId, (dbEvents) => {
          localEvents1 = dbEvents;
          triggerSetEvents();
        });
      } 
      // Fallback/Parallel: Listen by ownerId (especially for Event Organizers)
      const unsubByOwner = user?.uid ? eventService.listenToEventsByOwner(user.uid, (ownerEvents) => {
        localEvents2 = ownerEvents;
        triggerSetEvents();
      }) : () => {};

      return () => {
        unsub();
        unsubByOwner?.();
      };
    }
  }, [effectiveVenueId, user?.uid]);

  useEffect(() => {
    let unsubInventory = () => {};
    let unsubStaff = () => {};
    if (effectiveVenueId || activeEvent?.id) {
       unsubInventory = inventoryService.listenToInventory(effectiveVenueId || '', (dbItems) => {
         setInventory(dbItems);
       }, activeEvent?.id);
    }
    if (activeEvent?.id) {
       unsubStaff = staffService.listenToEventStaff(activeEvent.id, (dbStaff) => {
         setStaff(dbStaff);
       });
    }

    let unsubGuestList = () => {};
    if (activeEvent?.id) {
      unsubGuestList = guestListService.listenToGuestList(activeEvent.id, (dbGuests) => {
        setGuests(dbGuests);
      });
    }

    return () => {
       unsubInventory();
       unsubStaff();
       unsubGuestList();
    }
  }, [effectiveVenueId, activeEvent?.id]);

  useEffect(() => {
    if (!effectiveVenueId) return;
    console.log('[DEBUG] Event Manager listening to live RTDB orders for venue:', effectiveVenueId);
    const unsubOrders = orderService.listenToVenueOrders(effectiveVenueId, (orders) => {
      setRealtimeOrders(orders || []);
    });
    return () => {
      unsubOrders();
    };
  }, [effectiveVenueId]);

  const handleGenerateCopy = () => {
    if (!activeEvent) return;
    const date = new Date(activeEvent.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
    setMarketingCopy(`🚀 DON'T MISS OUT! Join us for ${activeEvent.title} @ ${venue?.name || 'the venue'} on ${date}. 🎧 ${activeEvent.genre} vibes all night! 🔥 Tickets starting at R${activeEvent.ticketPrice}. Grab yours now at Wayta! #WaytaEvents #Nightlife`);
  };

  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Production Velocity Header */}
      <section className={cn(
        "border p-8 rounded-[3rem] relative overflow-hidden",
        isDark ? "bg-surface-container-low border-outline/10" : "bg-white border-outline shadow-sm"
      )}>
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
         <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-1">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">COMMAND CENTER</h3>
               <h2 className={cn(
                 "text-4xl font-black uppercase tracking-tighter italic leading-none",
                 isDark ? "text-white" : "text-on-background"
               )}>{activeEvent?.title || activeEvent?.name || activeEvent?.business_name || 'No Active Event'}</h2>
               <div className="flex items-center gap-3 mt-2">
                 <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{venue?.name || 'VENUE'} • {activeEvent?.status || 'STATUS'}</p>
                 <span className="w-1 h-1 bg-outline rounded-full" />
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">{activeEvent?.genre}</span>
               </div>
            </div>
            <div className="flex flex-wrap gap-6">
               <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-on-surface-variant mb-1">REGISTRATION</p>
                  <p className={cn(
                    "text-2xl font-black",
                    isDark ? "text-white" : "text-on-background"
                  )}>{activeEvent?.ticketsSold || 0} <span className="text-[10px] text-on-surface-variant/60">/ {activeEvent?.ticketsTotal || 0}</span></p>
                  <div className="w-24 h-1 bg-outline/10 rounded-full mt-1 ml-auto overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((activeEvent?.ticketsSold || 0) / (activeEvent?.ticketsTotal || 1)) * 100)}%` }} />
                  </div>
               </div>
               <div className="text-right border-l border-outline/10 pl-6">
                  <p className="text-[9px] font-black uppercase text-on-surface-variant mb-1">CURRENT REVENUE</p>
                  <p className="text-2xl font-black text-emerald-500">{formatCurrency((activeEvent?.ticketsSold || 0) * (activeEvent?.ticketPrice || 150))}</p>
                  <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                    Projected: {formatCurrency((activeEvent?.ticketsTotal || 0) * (activeEvent?.ticketPrice || 150))}
                  </p>
               </div>
               <div className="text-right border-l border-outline/10 pl-6">
                  <p className="text-[9px] font-black uppercase text-on-surface-variant mb-1">SCAN RATE</p>
                  <p className={cn(
                    "text-2xl font-black",
                    isDark ? "text-white" : "text-on-background"
                  )}>{guests.filter(g => g.status === 'Checked-in').length} <span className="text-[10px] text-on-surface-variant/60">IN</span></p>
                  <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                    {Math.round((guests.filter(g => g.status === 'Checked-in').length / (guests.length || 1)) * 100)}% THROUGHPUT
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* Quick Actions Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Settings, label: 'Edit Event', onClick: () => setShowEventEditForm(true), color: 'text-primary' },
          { icon: Users, label: 'Promote', onClick: () => setActiveTab('marketing'), color: 'text-blue-500' },
          { icon: Ticket, label: 'Tickets', onClick: () => setActiveTab('management'), color: 'text-amber-500' },
          { icon: Sparkles, label: 'Staffing', onClick: () => setActiveTab('staff'), color: 'text-purple-500' },
        ].map((action, i) => (
          <button 
            key={i}
            onClick={action.onClick}
            className="p-6 bg-surface-container border border-outline rounded-[2rem] hover:border-primary transition-all flex flex-col items-center gap-3 group active:scale-95"
          >
            <action.icon className={cn("transition-transform group-hover:scale-110", action.color)} size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Ticket Verification Gate Access Control Section */}
      <section className={cn(
        "border p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden",
        isDark ? "bg-surface-container border-outline/10" : "bg-white border-outline shadow-sm"
      )}>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">PASS ACCESS OPERATIONS</h3>
               <h2 className={cn(
                  "text-2xl font-black uppercase tracking-tight italic leading-none",
                  isDark ? "text-white" : "text-on-background"
               )}>Ticket Verification Gate</h2>
               <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tap to open access control lens for validating digital QR codes</p>
            </div>
            
            {/* Counts Above Scanner */}
            <div className="flex items-center gap-6 bg-background/40 border border-outline/10 px-6 py-3.5 rounded-2xl w-full sm:w-auto justify-around">
               <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5">Real-time Passes Sold</p>
                  <p className="text-xl font-black text-primary leading-none">{managerTickets.length}</p>
               </div>
               <div className="h-8 w-px bg-outline/20" />
               <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5">Gate Revenue</p>
                  <p className="text-xl font-black text-emerald-500 leading-none">{formatCurrency(managerTickets.reduce((sum, t) => sum + (t.price || 0), 0))}</p>
               </div>
            </div>
         </div>

         <div className="border border-outline/5 h-px w-full" />

         <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-background/25 p-6 rounded-[2rem] border border-outline/5">
            <div className="space-y-0.5 text-center sm:text-left">
               <p className={cn("text-xs font-black uppercase", isDark ? "text-white" : "text-black")}>Instant Optical Access Control</p>
               <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Verify ticket validity, check gate status, and record collection in real-time</p>
            </div>
            <button 
              onClick={() => {
                setShowVerifModal(true);
                setVerifResult(null);
                setVerifError(null);
              }}
              className="px-8 h-12 bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-lg hover:shadow-primary/10 select-none active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
            >
               <QrCode size={16} /> Scan Ticket
            </button>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Operational Pulse */}
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Operational Pulse</h2>
                <span className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black uppercase text-on-surface-variant">Live Sync</span>
                </span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container border border-outline rounded-[2.5rem] p-6 space-y-4">
                   <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Critical Stock</p>
                      <Package size={16} className="text-primary" />
                   </div>
                   <div className="space-y-2">
                      {inventory.filter(i => i.stock < 20).slice(0, 3).map(item => (
                        <div key={item.id} className="flex justify-between items-center">
                           <span className="text-xs font-bold uppercase truncate">{item.name}</span>
                           <span className="text-[10px] font-black text-red-500">{item.stock} LEFT</span>
                        </div>
                      ))}
                      {inventory.filter(i => i.stock < 20).length === 0 && (
                        <p className="text-[10px] font-black text-emerald-500 uppercase">All stock levels healthy</p>
                      )}
                   </div>
                </div>
                <div className="bg-surface-container border border-outline rounded-[2.5rem] p-6 space-y-4">
                   <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Staff Deployments</p>
                      <ShieldCheck size={16} className="text-primary" />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-background border border-outline rounded-xl text-center">
                         <p className="text-[7px] font-black uppercase text-on-surface-variant/60 mb-1">On Duty</p>
                         <p className="text-lg font-black">{staff.length}</p>
                      </div>
                      <div className="p-3 bg-background border border-outline rounded-xl text-center">
                         <p className="text-[7px] font-black uppercase text-on-surface-variant/60 mb-1">Standby</p>
                         <p className="text-lg font-black">0</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Live Timeline */}
         <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Production Timeline</h2>
               <span className="text-[8px] font-black uppercase bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">Phase 04/06</span>
            </div>
            <div className="bg-surface-container border border-outline rounded-[2.5rem] p-6 space-y-4 shadow-xl">
                  {activeEvent?.timeline?.map((step, i) => (
                    <div key={step.id || `tl-${i}`} className="flex items-center gap-4 relative">
                    {i !== (activeEvent.timeline?.length || 0) - 1 && <div className="absolute left-10 top-10 bottom-0 w-0.5 bg-outline/10" />}
                    <div className={cn(
                      "w-20 text-[10px] font-black uppercase tracking-widest",
                      step.status === 'done' ? "text-primary" : step.status === 'active' ? (isDark ? "text-white" : "text-black") : "text-on-surface-variant/40"
                    )}>{step.time}</div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 z-10 cursor-pointer transition-all hover:scale-110",
                      step.status === 'done' ? "bg-primary border-primary shadow-[0_0_10px_#E7B034]" : 
                      step.status === 'active' ? (isDark ? "bg-black border-primary" : "bg-white border-primary") + " animate-pulse" : "bg-background border-outline/20"
                    )} 
                    onClick={() => {
                      const nextStatus = step.status === 'pending' ? 'active' : step.status === 'active' ? 'done' : 'pending';
                      const updatedTimeline = (activeEvent.timeline || []).map(s => s.id === step.id ? { ...s, status: nextStatus as "active" | "pending" | "done" } : s);
                      if (activeEvent?.id) {
                        eventService.updateEvent(effectiveVenueId, activeEvent.id, { timeline: updatedTimeline });
                      }
                    }}
                    />
                    <div className={cn(
                      "flex-1 text-sm font-black uppercase tracking-tight",
                      step.status === 'active' ? (isDark ? "text-white" : "text-on-background") : "text-on-surface-variant"
                    )}>{step.task}</div>
                 </div>
               )) || (
                 <div className="py-10 text-center opacity-30">
                   <p className="text-[10px] font-black uppercase tracking-widest">No timeline steps initialized</p>
                 </div>
               )}
            </div>
         </section>

         {/* Ticket Performance */}
         <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Ticket Performance</h2>
            <div className="bg-surface-container border border-outline rounded-[2.5rem] p-8 space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Overall Sales</p>
                    <p className="text-xl font-black">{Math.round(((activeEvent?.ticketsSold || 0) / (activeEvent?.ticketsTotal || 1)) * 100)}%</p>
                  </div>
                  <div className="h-2 w-full bg-outline/10 rounded-full overflow-hidden">
                     <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${((activeEvent?.ticketsSold || 0) / (activeEvent?.ticketsTotal || 1)) * 100}%` }} />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 gap-3">
                  {activeEvent?.ticketTiers?.map((tier, tidx) => (
                    <div key={`tier-${tier.id || tidx}-${tier.name}`} className="p-4 bg-background border border-outline rounded-2xl flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">{tier.name}</p>
                          <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">{tier.sold} Sold</p>
                       </div>
                       <p className="text-xs font-mono font-bold">{formatCurrency(tier.price)}</p>
                    </div>
                  ))}
               </div>
            </div>
         </section>
      </div>
    </div>
  );

  const renderManagement = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="flex items-center justify-between px-1">
          <div className="space-y-0.5">
             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Production Parameters</h2>
             <p className="text-[8px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Adjust vital event metrics and schedule</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-3 px-4 py-2 bg-surface-container border border-outline rounded-xl">
               <div className={cn(
                 "w-2 h-2 rounded-full",
                 isSaving ? "bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
               )} />
               <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                 {isSaving ? 'Syncing...' : 'Live Sync Active'}
               </span>
            </div>
            <button 
              onClick={() => setIsMgmtEditMode(!isMgmtEditMode)}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isMgmtEditMode ? "bg-primary text-black" : "bg-background border border-outline text-on-surface-variant"
              )}
            >
               <Settings size={14} />
               {isMgmtEditMode ? 'Lock Parameters' : 'Edit Parameters'}
            </button>
          </div>

       </div>

       {activeEvent && (
         <div className="space-y-8">
            {/* Poster / Visual Identity */}
            <div className={cn(
              "relative aspect-[16/9] lg:aspect-[21/9] border rounded-[3rem] overflow-hidden group shadow-2xl",
              isDark ? "bg-surface-container-high border-outline" : "bg-surface-container border-outline"
            )}>
               {activeEvent.image ? (
                 <img src={activeEvent.image} alt={activeEvent.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
               ) : (
                 <div className={cn(
                   "w-full h-full flex items-center justify-center bg-gradient-to-br",
                   isDark ? "from-surface-container-high to-surface-container-lowest" : "from-surface-container-lowest to-surface-container-low"
                 )}>
                    <Calendar size={64} className={isDark ? "text-on-surface/10" : "text-on-surface/10"} />
                 </div>
               )}
               <div className={cn(
                 "absolute inset-0 bg-gradient-to-t",
                 isDark ? "from-black via-black/40 to-transparent" : "from-white/40 via-transparent to-transparent"
               )} />
               <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-3 py-1 bg-primary text-black text-[9px] font-black uppercase rounded-full tracking-widest">{activeEvent.status}</span>
                    </div>
                    {isMgmtEditMode ? (
                       <input 
                         className={cn(
                           "text-4xl lg:text-6xl bg-transparent border-b-2 border-primary outline-none font-black uppercase tracking-tighter italic w-full",
                           isDark ? "text-white" : "text-black"
                         )}
                         value={editFormData.title || ''}
                         onChange={(e) => handleUpdateEventField('title', e.target.value)}
                         placeholder="EVENT TITLE"
                       />
                    ) : (
                       <h3 className={cn(
                         "text-4xl lg:text-6xl font-black uppercase tracking-tighter italic leading-tight",
                         isDark ? "text-white" : "text-black"
                       )}>{activeEvent.title}</h3>
                    )}
                    <div className="flex items-center gap-4">
                       <p className="text-xs font-black text-on-surface-variant uppercase tracking-[0.3em]">{venue?.name}</p>
                       <span className="w-1.5 h-1.5 bg-outline rounded-full" />
                       {isMgmtEditMode ? (
                          <input 
                            className="bg-transparent border-b border-primary/50 outline-none text-[10px] font-black text-primary uppercase tracking-[0.3em]"
                            value={editFormData.genre || ''}
                            onChange={(e) => handleUpdateEventField('genre', e.target.value)}
                            placeholder="GENRE"
                          />
                       ) : (
                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{activeEvent.genre}</p>
                       )}
                    </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Time Parameters */}
               <div className="bg-surface-container border border-outline p-8 rounded-[3rem] space-y-6">
                  <div className="flex items-center gap-3">
                     <Clock className="text-primary" size={20} />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Schedule Parameters</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest px-1">Doors</p>
                        {isMgmtEditMode ? (
                           <input 
                             type="time"
                             className="w-full h-12 bg-background border border-outline rounded-2xl px-3 text-sm font-black outline-none focus:border-primary"
                             value={editFormData.startTime || ''}
                             onChange={(e) => handleUpdateEventField('startTime', e.target.value)}
                           />
                        ) : (
                           <div className="p-4 bg-background border border-outline rounded-2xl">
                              <p className="text-lg font-black uppercase">{activeEvent.startTime}</p>
                           </div>
                        )}
                     </div>
                     <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest px-1">Curfew</p>
                        {isMgmtEditMode ? (
                           <input 
                             type="time"
                             className="w-full h-12 bg-background border border-outline rounded-2xl px-3 text-sm font-black outline-none focus:border-primary"
                             value={editFormData.endTime || ''}
                             onChange={(e) => handleUpdateEventField('endTime', e.target.value)}
                           />
                        ) : (
                           <div className="p-4 bg-background border border-outline rounded-2xl">
                              <p className="text-lg font-black uppercase">{activeEvent.endTime}</p>
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest px-1">Event Date</p>
                     {isMgmtEditMode ? (
                        <input 
                          type="date"
                          className="w-full h-12 bg-background border border-outline rounded-2xl px-3 text-sm font-black outline-none focus:border-primary"
                          value={editFormData.date ? new Date(editFormData.date).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleUpdateEventField('date', new Date(e.target.value).toISOString())}
                        />
                     ) : (
                        <div className="p-4 bg-background border border-outline rounded-2xl">
                           <p className="text-sm font-black uppercase tracking-widest">{new Date(activeEvent.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                     )}
                  </div>
               </div>

               {/* Financial Hub */}
               <div className="bg-surface-container border border-outline p-8 rounded-[3rem] space-y-6">
                  <div className="flex items-center gap-3">
                     <span className="text-primary font-black text-lg">R</span>
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Gate Logistics</h4>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest px-1">General Admission</p>
                        {isMgmtEditMode ? (
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">R</span>
                              <input 
                                type="number"
                                className="w-full h-14 bg-background border border-outline rounded-2xl pl-10 pr-4 text-sm font-black outline-none focus:border-primary"
                                value={editFormData.ticketPrice || 0}
                                onChange={(e) => handleUpdateEventField('ticketPrice', parseFloat(e.target.value))}
                              />
                           </div>
                        ) : (
                           <div className="p-4 bg-background border border-outline rounded-2xl flex items-center justify-between">
                              <p className="text-2xl font-black italic">{formatCurrency(activeEvent.ticketPrice)}</p>
                              <TrendingUp size={16} className="text-green-500" />
                           </div>
                        )}
                     </div>
                     <div className="p-5 bg-background/50 border border-dashed border-outline rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                           <p className="text-[8px] font-black uppercase text-on-surface-variant">Projected Revenue</p>
                           <p className="text-[10px] font-black text-green-500">{formatCurrency(activeEvent.ticketPrice * activeEvent.ticketsTotal)}</p>
                        </div>
                        <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                           <div className="h-full bg-green-500 w-[60%]" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Capacity Metrics */}
               <div className="bg-surface-container border border-outline p-8 rounded-[3rem] space-y-6">
                  <div className="flex items-center gap-3">
                     <Users className="text-primary" size={20} />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Safety & Volume</h4>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest px-1">Total Capacity</p>
                        {isMgmtEditMode ? (
                           <input 
                             type="number"
                             className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-black outline-none focus:border-primary"
                             value={editFormData.ticketsTotal || 0}
                             onChange={(e) => handleUpdateEventField('ticketsTotal', parseInt(e.target.value))}
                           />
                        ) : (
                           <div className="p-4 bg-background border border-outline rounded-2xl flex items-center justify-between">
                              <p className="text-2xl font-black uppercase">{activeEvent.ticketsTotal}</p>
                              <ShieldCheck size={16} className="text-primary" />
                           </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-background border border-outline rounded-xl text-center">
                           <p className="text-[7px] font-black uppercase text-on-surface-variant mb-1">Density</p>
                           <p className="text-xs font-black uppercase">Low</p>
                        </div>
                        <div className="p-3 bg-background border border-outline rounded-xl text-center">
                           <p className="text-[7px] font-black uppercase text-on-surface-variant mb-1">Risk Factor</p>
                           <p className="text-xs font-black uppercase">None</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Ticket Tiers Management */}
               <div className="bg-surface-container border border-outline p-8 rounded-[3rem] space-y-6 md:col-span-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Ticket className="text-primary" size={20} />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ticket Tier Management</h4>
                    </div>
                    {isMgmtEditMode && (
                      <button 
                        onClick={() => {
                          const newTiers = [...(editFormData.ticketTiers || [])];
                          newTiers.push({ id: `tier-${Date.now()}`, name: 'New Tier', price: 150, capacity: 50, sold: 0 });
                          handleUpdateEventField('ticketTiers', newTiers);
                        }}
                        className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
                      >
                        <Plus size={14} /> Add Tier
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(isMgmtEditMode ? editFormData.ticketTiers : activeEvent.ticketTiers)?.map((tier, idx) => (
                      <div key={`edit-tier-${tier.id || idx}-${tier.name}`} className="p-6 bg-background border border-outline rounded-3xl space-y-4 group">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            {isMgmtEditMode ? (
                              <input 
                                className="w-full bg-transparent border-b border-primary/30 outline-none text-sm font-black uppercase"
                                value={tier.name}
                                onChange={(e) => {
                                  const newTiers = [...(editFormData.ticketTiers || [])];
                                  newTiers[idx] = { ...newTiers[idx], name: e.target.value };
                                  handleUpdateEventField('ticketTiers', newTiers);
                                }}
                              />
                            ) : (
                              <p className="text-sm font-black uppercase">{tier.name}</p>
                            )}
                            <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Access Grade {idx + 1}</p>
                          </div>
                          {isMgmtEditMode && (
                            <button 
                              onClick={() => {
                                const newTiers = [...(editFormData.ticketTiers || [])];
                                newTiers.splice(idx, 1);
                                handleUpdateEventField('ticketTiers', newTiers);
                              }}
                              className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline/5">
                          <div className="space-y-1">
                            <p className="text-[7px] font-black uppercase text-on-surface-variant/60">Price (ZAR)</p>
                            {isMgmtEditMode ? (
                              <input 
                                type="number"
                                className="w-full bg-surface-container-high border border-outline rounded-lg px-2 py-1 text-xs font-bold font-mono outline-none focus:border-primary"
                                value={tier.price}
                                onChange={(e) => {
                                  const newTiers = [...(editFormData.ticketTiers || [])];
                                  newTiers[idx] = { ...newTiers[idx], price: parseFloat(e.target.value) || 0 };
                                  handleUpdateEventField('ticketTiers', newTiers);
                                }}
                              />
                            ) : (
                              <p className="text-xs font-mono font-bold">{formatCurrency(tier.price)}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="text-[7px] font-black uppercase text-on-surface-variant/60">Allocation</p>
                            {isMgmtEditMode ? (
                              <input 
                                type="number"
                                className="w-full bg-surface-container-high border border-outline rounded-lg px-2 py-1 text-xs font-bold font-mono"
                                value={tier.capacity}
                                onChange={(e) => {
                                  const newTiers = [...(editFormData.ticketTiers || [])];
                                  newTiers[idx] = { ...newTiers[idx], capacity: parseInt(e.target.value) };
                                  handleUpdateEventField('ticketTiers', newTiers);
                                }}
                              />
                            ) : (
                              <p className="text-xs font-mono font-bold">{tier.capacity}</p>
                            )}
                          </div>
                        </div>

                        {!isMgmtEditMode && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-on-surface-variant/60">
                               <span>Sold</span>
                               <span>{tier.sold} / {tier.capacity}</span>
                            </div>
                            <div className="h-1 w-full bg-outline/10 rounded-full overflow-hidden">
                               <div className="h-full bg-primary" style={{ width: `${(tier.sold / tier.capacity) * 100}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {(isMgmtEditMode ? editFormData.ticketTiers : activeEvent.ticketTiers)?.length === 0 && (
                      <div className="col-span-3 py-12 text-center border-2 border-dashed border-outline rounded-3xl">
                         <Ticket className={cn("mx-auto mb-4", isDark ? "text-on-surface/10" : "text-on-surface/10")} size={32} />
                         <p className="text-[10px] font-black uppercase text-on-surface-variant/40">No ticket tiers defined for this production</p>
                      </div>
                    )}
                  </div>
               </div>

               {/* Extended Event Details */}
               <div className="bg-surface-container border border-outline p-8 rounded-[3rem] space-y-6 md:col-span-3">
                  <div className="flex items-center gap-3">
                     <Globe className="text-primary" size={20} />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Extended Logistics</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest px-1">Social Media / Website</p>
                       {isMgmtEditMode ? (
                          <input 
                            className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-black outline-none focus:border-primary transition-all"
                            value={editFormData.socialMedia || ''}
                            onChange={(e) => handleUpdateEventField('socialMedia', e.target.value)}
                            placeholder="https://instagram.com/..."
                          />
                       ) : (
                          <div className="p-4 bg-background border border-outline rounded-2xl flex items-center justify-between">
                             <p className="text-sm font-black truncate max-w-[200px]">{activeEvent.socialMedia || 'No link provided'}</p>
                             {activeEvent.socialMedia && <Globe size={14} className="text-primary" />}
                          </div>
                       )}
                    </div>
                    <div className="space-y-1.5">
                       <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest px-1">Planned Budget</p>
                       {isMgmtEditMode ? (
                          <input 
                            className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-black outline-none focus:border-primary transition-all"
                            value={editFormData.budget || ''}
                            onChange={(e) => handleUpdateEventField('budget', e.target.value)}
                            placeholder="e.g. R50,000"
                          />
                       ) : (
                          <div className="p-4 bg-background border border-outline rounded-2xl flex items-center justify-between">
                             <p className="text-sm font-black">{activeEvent.budget || 'Not specified'}</p>
                             <span className="text-primary font-black text-xs">R</span>
                          </div>
                       )}
                    </div>
                  </div>
               </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex gap-4 p-6 bg-surface-container border border-outline rounded-[2.5rem]">
               <div className="flex-1 flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                     <Info size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Active Pulse Sync</p>
                    <p className="text-[8px] font-bold uppercase text-on-surface-variant tracking-widest">All changes propagate to vendor terminals in real-time</p>
                  </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
   const renderMarketing = () => (
     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={cn(
          "p-8 border rounded-[3rem] relative overflow-hidden",
          isDark ? "bg-surface-container-low border-outline/10" : "bg-white border-outline shadow-sm"
        )}>
           <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent opacity-50" />
           <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                 <Sparkles className="text-blue-500" size={32} />
                 <h2 className={cn(
                   "text-3xl font-black uppercase tracking-tighter italic",
                   isDark ? "text-white" : "text-on-background"
                 )}>Marketing Lab</h2>
              </div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest max-w-sm">Generate high-conversion promotional assets for your production.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Promo Copy Engine</h3>
              <div className="bg-surface-container border border-outline p-6 rounded-[2.5rem] space-y-6">
                 <div className="space-y-4">
                    <p className="text-[8px] font-black text-on-surface-variant/50 uppercase tracking-widest">OUTPUT PREVIEW</p>
                    <div className="p-5 bg-background border border-outline rounded-3xl min-h-[120px] text-sm leading-relaxed font-medium">
                       {marketingCopy || "Click generate to create an AI-optimized promotional message based on your event details."}
                    </div>
                 </div>
                 <button 
                   onClick={handleGenerateCopy}
                   className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-[0.98]"
                 >
                   Generate Optimized Copy
                 </button>
              </div>
           </section>

           <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Distribution Hub</h3>
              <div className="bg-surface-container border border-outline p-6 rounded-[2.5rem] grid grid-cols-1 gap-3">
                 {[
                   { label: "Copy Event Link", value: `/event/${activeEvent?.id}`, icon: Smartphone },
                   { label: "Instagram Square (1080p)", value: "Ready to Capture", icon: Smartphone },
                   { label: "WhatsApp Status Video", value: "Locked", icon: Smartphone },
                 ].map((dist, i) => (
                   <button key={i} className="p-5 bg-background border border-outline rounded-3xl flex items-center justify-between hover:border-primary transition-all group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-surface-container border border-outline rounded-xl flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                            <dist.icon size={20} />
                         </div>
                         <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-tight">{dist.label}</p>
                            <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">{dist.value}</p>
                         </div>
                      </div>
                      <ChevronRight className="text-on-surface-variant/30" size={24} />
                   </button>
                 ))}
              </div>
           </section>
        </div>

        {/* QR Code Post & Flyer Generator */}
        <section className="space-y-4 pt-6">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
              <QrCode size={12} className="text-primary animate-pulse" /> 
              Promotional Poster / QR Code Flyer Generator
           </h3>
           <div className="bg-surface-container border border-outline p-6 rounded-[2.5rem]">
              <QRPosterGenerator 
                 initialVenueName={activeEvent?.venueName || venue?.name || "The Ketchup"} 
                 initialLocation={venue?.location || "Pretoria"}
                 isDark={isDark} 
              />
           </div>
        </section>

        {/* Workspace Gmail Campaign Launcher */}
        <section className="space-y-4 pt-6">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
              <Sparkles size={12} className="text-primary animate-pulse" /> 
              Gmail Workspace Campaign Launcher
           </h3>
           <div className="bg-surface-container border border-outline p-8 rounded-[2.5rem] space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-outline/20">
                 <div>
                    <h4 className="font-extrabold text-base text-white">Guest-list Outreach Channel</h4>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">
                       {campaignGmailConnected ? `Linked Campaign Sender: ${campaignGmailEmail}` : 'Broadcast through your physical Google/Gmail Workspace profile.'}
                    </p>
                 </div>
                 {campaignGmailConnected ? (
                    <button 
                       type="button"
                       onClick={handleDisconnectCampaignGmail}
                       className="text-[9px] font-black bg-error/10 text-error border border-error/20 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-error hover:text-white transition-all cursor-pointer"
                    >
                       Disconnect Campaigner
                    </button>
                 ) : (
                    <button
                       type="button"
                       onClick={handleConnectCampaignGmail}
                       className="text-[9px] font-black bg-primary text-black px-4 py-2 rounded-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                       Link Google Workspace
                    </button>
                 )}
              </div>

              {campaignGmailConnected ? (
                 <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Campaign Subject</label>
                          <input 
                             type="text"
                             required
                             value={campaignSubject}
                             onChange={(e) => setCampaignSubject(e.target.value)}
                             placeholder="e.g., Exclusive Lounge Invitation: {EventName}"
                             className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary transition-all text-white"
                          />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Outreach Criteria (Audience)</label>
                          <select 
                             value={targetGuestStatus}
                             onChange={(e: any) => setTargetGuestStatus(e.target.value)}
                             className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary transition-all text-white"
                          >
                             <option value="All">All Registered Guests with Emails ({guests.filter(g => !!g.email).length})</option>
                             <option value="Checked-in">Checked-in Guests only ({guests.filter(g => g.status === 'Checked-in' && !!g.email).length})</option>
                             <option value="Invited">Unconfirmed RSVP (Invited) ({guests.filter(g => g.status === 'Invited' && !!g.email).length})</option>
                          </select>
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Message Body</label>
                          <span className="text-[8px] font-black text-primary uppercase tracking-widest">Supports Dynamic Fields: &#123;GuestName&#125;, &#123;EventName&#125;</span>
                      </div>
                       <textarea 
                          required
                          value={campaignBody}
                          onChange={(e) => setCampaignBody(e.target.value)}
                          placeholder="Dear {GuestName},&#10;&#10;We are absolutely thrilled to welcome you to {EventName}! Below are your exclusive table discount updates ...&#10;&#10;Best, Wayta Team"
                          rows={6}
                          className="w-full bg-background border border-outline rounded-xl p-4 text-xs font-medium outline-none focus:border-primary transition-all resize-none text-white leading-relaxed"
                       />
                       {marketingCopy && (
                          <button
                             type="button"
                             onClick={() => setCampaignBody(marketingCopy)}
                             className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-1.5 flex items-center gap-1 cursor-pointer"
                          >
                             <Sparkles size={10} /> Load AI/Generated Promo Copy Into Body
                          </button>
                       )}
                    </div>

                    {campaignError && (
                       <div className="bg-error/10 border border-error/20 p-3 rounded-2xl text-error text-[10px] font-bold">
                          {campaignError}
                       </div>
                    )}

                    {campaignSuccess && (
                       <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-emerald-400 text-[10px] font-bold">
                          {campaignSuccess}
                       </div>
                    )}

                    {isLaunchingCampaign && (
                       <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl text-primary text-[10px] font-bold animate-pulse">
                          {campaignProgress}
                       </div>
                    )}

                    <button 
                       type="button"
                       disabled={isLaunchingCampaign}
                       onClick={handleLaunchCampaign}
                       className="w-full py-4 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                    >
                       {isLaunchingCampaign ? 'Executing Campaign...' : 'Launch Gmail Workspace Campaign'}
                    </button>
                 </div>
              ) : (
                 <div className="p-8 text-center space-y-3 opacity-40">
                    <Mail size={32} className="mx-auto text-on-surface-variant" />
                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                       Please click "Link Google Workspace" above to synchronize your accounts and launch dynamic guestlist outreach campaigns.
                    </p>
                 </div>
              )}
           </div>
        </section>
     </div>
   );

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveVenueId) return;

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const phone = formData.get('phone') as string;
    const gender = formData.get('gender') as string;

    try {
      const eventId = activeEvent?.id || selectedEventId;
      const result = await staffService.enrollStaff(effectiveVenueId, `${firstName} ${lastName}`, email, role, eventId, phone, gender);
      setShowCredentials({ username: result.username, pin: result.pin });
      setShowAddStaffForm(false);
    } catch (err) {
      console.error("Failed to add staff:", err);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      try {
        await staffService.deleteStaff(staffId);
        setSelectedStaff(null);
      } catch (err) {
        console.error("Failed to delete staff:", err);
        alert(err instanceof Error ? err.message : "Failed to remove staff member");
      }
    }
  };

  const renderStaff = () => {
    return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
         <div className="space-y-1">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Staff Roster</h2>
            <p className="text-[8px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Manage your production team and terminal access</p>
         </div>
         <button 
           onClick={() => setShowAddStaffForm(true)}
           className="flex items-center justify-center gap-2 bg-primary text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all w-full md:w-auto"
         >
           <UserPlus size={16} />
           Enroll New Staff
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.length > 0 ? (
          staff.map(member => (
            <div 
              key={member.uid} 
              onClick={() => setSelectedStaff(member)}
              className="group bg-surface-container border border-outline p-6 rounded-[2.5rem] hover:border-primary transition-all cursor-pointer relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users size={64} className="text-primary" />
               </div>
               
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-2xl bg-background border-2 border-outline/30 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-all">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center",
                            isDark ? "bg-gradient-to-br from-surface-container-high to-surface-container-lowest" : "from-surface-container-lowest to-surface-container-low"
                          )}>
                             <span className="text-xl font-black text-primary">{member.displayName?.charAt(0) || 'U'}</span>
                          </div>
                        )}
                     </div>
                     <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1">{member.displayName}</h3>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{member.role}</span>
                           <span className="w-1 h-1 bg-outline rounded-full" />
                           <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Terminal Active</span>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-outline/5">
                     <div className="text-center">
                        <p className="text-[7px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1">Eff.</p>
                        <p className="text-[10px] font-black uppercase">98%</p>
                     </div>
                     <div className="text-center border-l border-r border-outline/5">
                        <p className="text-[10px] font-black uppercase">142</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[7px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1">Status</p>
                        <div className="flex items-center justify-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[8px] font-black uppercase">Live</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Star size={12} className="text-amber-500" />
                        <span className="text-[10px] font-black italic">4.9</span>
                     </div>
                     {confirmDeleteId === member.uid ? (
                       <div className="flex items-center gap-2">
                          <button
                             disabled={deletingId === member.uid}
                             onClick={(e) => {
                               e.stopPropagation();
                               setConfirmDeleteId(null);
                             }}
                             className="p-3 bg-surface-container-high border border-outline rounded-xl font-bold text-[10px] uppercase tracking-widest hover:border-primary transition-all"
                          >
                             Cancel
                          </button>
                          <button
                             disabled={deletingId === member.uid}
                             onClick={async (e) => {
                               e.stopPropagation();
                               try {
                                  setDeletingId(member.uid);
                                  await staffService.deleteStaff(member.uid);
                                  setConfirmDeleteId(null);
                               } catch (err) {
                                  console.error("Failed to delete staff:", err);
                                  alert(err instanceof Error ? err.message : "Failed to remove staff member");
                               } finally {
                                  setDeletingId(null);
                               }
                             }}
                             className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                          >
                             {deletingId === member.uid ? '...' : 'Confirm'}
                          </button>
                       </div>
                     ) : (
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setConfirmDeleteId(member.uid);
                         }}
                         className="p-3 bg-red-500/5 hover:bg-red-500 text-on-surface hover:text-white rounded-xl transition-all"
                       >
                          <Trash2 size={16} />
                       </button>
                     )}
                  </div>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-20 border-2 border-dashed border-outline rounded-[4rem] text-center space-y-6">
             <div className="w-24 h-24 bg-surface-container border border-outline rounded-[2rem] flex items-center justify-center mx-auto">
                <Users className="text-on-surface-variant/20" size={48} />
             </div>
             <div className="space-y-2">
                <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant">Roster is empty</p>
                <p className="text-xs font-bold uppercase text-on-surface-variant/40 tracking-widest leading-relaxed max-w-sm mx-auto">
                  Populate your production team for real-time order synchronization and terminal management.
                </p>
             </div>
             <button 
               onClick={() => setShowAddStaffForm(true)} 
               className="px-10 py-4 bg-primary text-black rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all"
             >
               Enroll First Member
             </button>
          </div>
        )}
      </div>

      {/* Staff Detail Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
               initial={{ scale: 0.9, y: 30 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-surface-container border border-outline rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 w-full max-w-2xl relative overflow-hidden max-h-[95vh] overflow-y-auto"
            >
               <div className="absolute top-0 right-0 p-4 sm:p-8 z-20">
                  <button onClick={() => setSelectedStaff(null)} className="p-2 sm:p-3 bg-background/50 backdrop-blur-md border border-outline rounded-2xl hover:text-red-500 transition-colors">
                     <Plus className="rotate-45" size={20} />
                  </button>
               </div>

               <div className="flex flex-col md:flex-row gap-6 sm:gap-10">
                  <div className="space-y-4 sm:space-y-6 flex-shrink-0">
                     <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] sm:rounded-[2.5rem] bg-background border-2 border-primary/20 flex items-center justify-center overflow-hidden mx-auto md:mx-0">
                        {selectedStaff.photoURL ? (
                          <img src={selectedStaff.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center border shadow-inner",
                            isDark ? "bg-surface-container-high border-outline" : "bg-surface-light border-outline"
                          )}>
                             <Users size={64} className={isDark ? "text-on-surface/10" : "text-on-surface/10"} />
                          </div>
                        )}
                     </div>
                     <div className="p-5 bg-background border border-outline rounded-3xl space-y-3">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase text-on-surface-variant/60">
                           <span>Shift Total</span>
                           <span className={isDark ? "text-white" : "text-on-background"}>R4,250</span>
                        </div>
                        <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                           <div className="h-full bg-primary w-[70%]" />
                        </div>
                        <p className="text-[7px] font-black uppercase text-center text-on-surface-variant/50 tracking-widest pt-2">Performance Target</p>
                     </div>
                  </div>

                  <div className="flex-1 space-y-8">
                     <div>
                        <h2 className={cn(
                          "text-4xl font-black uppercase tracking-tighter italic leading-none",
                          isDark ? "text-white" : "text-on-background"
                        )}>{selectedStaff.displayName}</h2>
                        <div className="flex items-center gap-3 mt-4">
                           <span className="px-3 py-1 bg-primary text-black text-[10px] font-black uppercase rounded-full">{selectedStaff.role}</span>
                           <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Active Since {new Date(selectedStaff.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-background border border-outline rounded-3xl space-y-1">
                           <p className="text-[9px] font-black uppercase text-on-surface-variant/70 tracking-widest">Username</p>
                           <p className="text-sm font-black uppercase tracking-tight">{selectedStaff.username || 'NOT_SET'}</p>
                        </div>
                        <div className="p-6 bg-background border border-outline rounded-3xl space-y-1">
                           <p className="text-[9px] font-black uppercase text-on-surface-variant/70 tracking-widest">Contact Identity</p>
                           <p className="text-sm font-black truncate">{selectedStaff.email}</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 text-center">Production Statistics</h4>
                        <div className="grid grid-cols-3 gap-3">
                           {[
                             { label: 'Uptime', val: '99.2%' },
                             { label: 'Rating', val: '4.9 ★' },
                             { label: 'Orders', val: '1,204' }
                           ].map(stat => (
                             <div key={stat.label} className="p-4 bg-background border border-outline rounded-2xl text-center">
                                <p className="text-[8px] font-black uppercase text-on-surface-variant/60 mb-1">{stat.label}</p>
                                <p className="text-lg font-black uppercase">{stat.val}</p>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button className="flex-1 h-14 bg-surface-container-high border border-outline rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:border-primary transition-all">
                           <Settings size={18} />
                           Edit Profile
                        </button>
                        {confirmDeleteId === selectedStaff.uid ? (
                           <div className="flex items-center gap-2">
                              <button
                                 disabled={deletingId === selectedStaff.uid}
                                 onClick={() => setConfirmDeleteId(null)}
                                 className="h-14 px-4 bg-surface-container-high border border-outline rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-primary transition-all"
                              >
                                 Cancel
                              </button>
                              <button
                                 disabled={deletingId === selectedStaff.uid}
                                 onClick={async () => {
                                    try {
                                       setDeletingId(selectedStaff.uid);
                                       await staffService.deleteStaff(selectedStaff.uid);
                                       setConfirmDeleteId(null);
                                       setSelectedStaff(null);
                                    } catch (err) {
                                       console.error("Failed to delete staff:", err);
                                       alert(err instanceof Error ? err.message : "Failed to remove staff member");
                                    } finally {
                                       setDeletingId(null);
                                    }
                                 }}
                                 className="h-14 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                              >
                                 {deletingId === selectedStaff.uid ? 'Deleting...' : 'Confirm'}
                              </button>
                           </div>
                        ) : (
                           <button 
                              onClick={() => setConfirmDeleteId(selectedStaff.uid)}
                              className="h-14 w-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5 group"
                           >
                              <Trash2 size={20} />
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  };

  const renderGuestList = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="space-y-1">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Access Control & Guest List</h2>
          <p className="text-[8px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Manage VIPs and invited attendees for this session</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              guestListService.exportToCSV(guests);
            }}
            className="flex items-center justify-center gap-2 bg-surface-container-high border border-outline px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:border-primary active:scale-95"
          >
            <Share2 size={16} />
            Export CSV
          </button>
          <button 
            onClick={() => setShowShareGuestList(true)}
            className="flex items-center justify-center gap-2 bg-surface-container-high border border-outline px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:border-primary active:scale-95"
          >
            <Globe size={16} />
            Share Link
          </button>
          <button 
            onClick={() => setShowAddGuestForm(true)}
            className="flex items-center justify-center gap-2 bg-primary text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            <UserPlus size={16} />
            Add Guest
          </button>
        </div>
      </div>

      {/* Entrance Queue Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Queue Time Estimator Card */}
        <div className="bg-gradient-to-br from-surface-container to-surface-container-high border border-outline rounded-[2rem] p-6 flex items-center justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-widest flex items-center gap-1.5">
              <Clock size={12} className="text-primary animate-pulse" />
              Queue Entry Pace
            </span>
            <p className="text-3xl font-black text-white">{getQueueTimeMetrics().formatted}</p>
            <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              Consec. entry cadence
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Clock size={20} />
          </div>
        </div>

        {/* Estimated Wait Time Card */}
        <div className="bg-gradient-to-br from-surface-container to-surface-container-high border border-outline rounded-[2rem] p-6 flex items-center justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Est. Queue Wait Time
            </span>
            <p className="text-3xl font-black text-emerald-400">
              {getQueueTimeMetrics().estimatedWaitMinutes} <span className="text-xs text-on-surface-variant/60">MINS</span>
            </p>
            <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              To clear remaining {getQueueTimeMetrics().pendingGuests} guests
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Checked-in status card */}
        <div className="bg-gradient-to-br from-surface-container to-surface-container-high border border-outline rounded-[2rem] p-6 flex items-center justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-widest flex items-center gap-1.5">
              <Users size={12} className="text-primary" />
              Entrance Throughput
            </span>
            <p className="text-3xl font-black text-white">
              {getQueueTimeMetrics().totalCheckedIn} <span className="text-xs text-on-surface-variant/60">/ {guests.length} IN</span>
            </p>
            <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              {guests.length > 0 ? Math.round((getQueueTimeMetrics().totalCheckedIn / guests.length) * 100) : 0}% scanned into session
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-outline flex items-center justify-center text-on-surface-variant">
            <Users size={20} />
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
        <input 
          placeholder="Search by name, email or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all"
        />
      </div>

      <div className="bg-surface-container border border-outline rounded-[2.5rem] overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-outline/10">
          {guests
            .filter(g => 
              g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              g.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              g.status.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((guest) => (
            <div key={guest.id} className="p-5 flex items-center justify-between hover:bg-surface-container-high transition-colors group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                  guest.isVip ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(231,176,52,0.1)]" : "bg-background border-outline text-on-surface-variant"
                )}>
                  {guest.isVip ? <Star size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm uppercase tracking-tight">{guest.name}</p>
                    {guest.isVip && (
                      <span className="text-[7px] font-black uppercase bg-primary text-black px-1.5 py-0.5 rounded tracking-widest">VIP</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{guest.email || 'No email'} • {guest.phone || 'No phone'}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Status</p>
                  <select 
                    value={guest.status}
                    onChange={(e) => guestListService.updateGuest(guest.id, { status: e.target.value as any })}
                    className={cn(
                      "text-[9px] font-black uppercase bg-transparent border-none outline-none cursor-pointer",
                      guest.status === 'Checked-in' ? "text-emerald-500" : "text-on-surface-variant"
                    )}
                  >
                    <option value="Invited">Invited</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked-in">Checked-in</option>
                    <option value="No-show">No-show</option>
                  </select>
                </div>
                <button 
                  onClick={() => {
                    if (window.confirm('Remove from guest list?')) {
                      guestListService.removeGuest(guest.id);
                    }
                  }}
                  className="p-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {guests.length === 0 && (
            <div className="p-20 text-center space-y-6">
               <div className="w-20 h-20 bg-background border border-outline rounded-[2rem] flex items-center justify-center mx-auto opacity-20">
                  <Users size={40} />
               </div>
               <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.4em]">Register first attendee</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
         <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Live Inventory</h2>
         <div className="flex gap-2">
           <button 
             onClick={() => setShowInventoryModal(true)}
             className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary flex items-center gap-2"
           >
              <FileUp size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Import</span>
           </button>
           <button 
             onClick={handleAddItem}
             className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary"
           >
              <Plus size={18} />
           </button>
         </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
        <input 
          placeholder="Search items or categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {inventory
          .filter(i => (i.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (i.category?.toLowerCase() || '').includes(searchQuery.toLowerCase()))
          .map(item => (
          <div 
             key={item.id}
             onClick={() => handleEditItem(item)}
             className="bg-surface-container border border-outline p-6 rounded-[2rem] flex items-center justify-between group hover:border-primary transition-all cursor-pointer"
          >
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-background border border-outline rounded-2xl flex items-center justify-center">
                   <Package size={24} className="text-primary" />
                </div>
                <div>
                   <h3 className="text-base font-black uppercase tracking-tight">{item.name}</h3>
                   <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{item.category}</span>
                </div>
             </div>
             <div className="text-right">
                <div className="flex items-center gap-2 mb-1 justify-end">
                   <button 
                     onClick={(e) => { e.stopPropagation(); inventoryService.updateStock(item.id, Math.max(0, item.stock - 1)); }}
                     className="w-6 h-6 rounded-lg bg-surface-container-high border border-outline flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90"
                   >
                     <Minus size={12} />
                   </button>
                   <span className={cn(
                     "text-[9px] font-black uppercase px-2 py-0.5 rounded border min-w-[3.5rem] text-center",
                     item.stock < 10 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                   )}>{item.stock} UN</span>
                   <button 
                     onClick={(e) => { e.stopPropagation(); inventoryService.updateStock(item.id, item.stock + 1); }}
                     className="w-6 h-6 rounded-lg bg-surface-container-high border border-outline flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90"
                   >
                     <Plus size={12} />
                   </button>
                </div>
                 <div className="flex items-center gap-3">
                    <p className="text-sm font-mono font-bold">{formatCurrency(item.price)}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="p-3 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl transition-colors"
                    >
                       <Trash2 size={16} />
                    </button>
                 </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleSimulateOrder = async () => {
    if (!effectiveVenueId) {
      alert('Must have an active venue to simulate order.');
      return;
    }
    
    // Pick an item from local inventory if populated, else use fallback
    let itemObj = { id: 'fallback-beer', name: 'Premium Craft Stout', price: 55, category: 'Beverage', stock: 100 };
    if (inventory && inventory.length > 0) {
      const randIdx = Math.floor(Math.random() * inventory.length);
      const chosen = inventory[randIdx];
      itemObj = {
        id: chosen.id,
        name: chosen.name,
        price: chosen.price,
        category: chosen.category || 'Beverage',
        stock: chosen.stock
      };
    }

    const firstNames = ['Sipho', 'Lindiwe', 'Abrie', 'Zama', 'Anesu', 'Gavin', 'Kobus', 'Thando', 'Naledi', 'Jabulani'];
    const lastNames = ['Mokoena', 'Smith', 'Dlamini', 'Naidoo', 'Van der Merwe', 'Govender', 'Khumalo', 'Zulu'];
    const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const randQty = Math.floor(Math.random() * 3) + 1;
    const isVip = Math.random() > 0.4;

    const mockOrder: Omit<Order, 'id' | 'timestamp'> = {
      user_id: 'simulated-' + Math.floor(1000 + Math.random() * 9000),
      venue_id: effectiveVenueId,
      event_id: activeEvent?.id || '',
      eventId: activeEvent?.id || '',
      items: [{ item: itemObj as any, quantity: randQty }],
      status: 'Pending',
      payment_status: 'Paid',
      customer_name: randomName + (isVip ? ' [VIP]' : ''),
      total_amount: itemObj.price * randQty,
      total: itemObj.price * randQty,
      isVip: isVip,
      payment_method: 'Wayta Instant Settlement',
      order_number: Math.floor(1000 + Math.random() * 9000).toString()
    };

    try {
      console.log('[DEBUG] Event Manager simulating user order:', mockOrder);
      await orderService.createOrder(mockOrder, 'simulated@wayta.io');
    } catch (e) {
      console.error('Failed to create simulated order:', e);
    }
  };

  const renderOrders = () => {
    // 1. Process active filters
    const filteredOrdersList = realtimeOrders.filter(order => {
      // Search Box matcher
      if (ordersSearch) {
        const q = ordersSearch.toLowerCase();
        const code = (order.id || '').toLowerCase();
        const name = (order.customer_name || '').toLowerCase();
        const num = (order.order_number || '').toString().toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !num.includes(q)) return false;
      }

      // Status selector Tab
      if (ordersStatusFilter !== 'All') {
        const s = ordersStatusFilter.toLowerCase();
        const orderSt = (order.status || 'pending').toLowerCase();
        if (s === 'completed') {
          if (orderSt !== 'completed' && orderSt !== 'collected') return false;
        } else if (orderSt !== s) {
          return false;
        }
      }

      // Priority Level VIP Filter
      if (ordersPriorityFilter !== 'All') {
        const isVipUser = order.isVip || (order.customer_name && (order.customer_name.includes('VIP') || order.customer_name.includes('[VIP]')));
        if (ordersPriorityFilter === 'VIP' && !isVipUser) return false;
        if (ordersPriorityFilter === 'Standard' && isVipUser) return false;
      }

      // Events selector Filter
      if (ordersEventFilter !== 'All') {
        const oEvtId = order.event_id || order.eventId;
        if (oEvtId !== ordersEventFilter) return false;
      }

      return true;
    });

    // 2. Derive dynamic bottleneck statistics metrics
    const totalTransactionsSum = realtimeOrders
      .filter(o => o.status === 'Collected' || o.status === 'Completed' || o.status === 'collected' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const activeQueueCount = realtimeOrders.filter(o => ['pending', 'pending', 'preparing', 'Preparing'].includes(o.status)).length;
    const readyForPickupCount = realtimeOrders.filter(o => ['ready', 'Ready'].includes(o.status)).length;
    const totalVipSpendersCount = realtimeOrders.filter(o => o.isVip || (o.customer_name && (o.customer_name.includes('VIP') || o.customer_name.includes('[VIP]')))).length;

    // Counts for tabs metrics headers
    const getCountForStatus = (status: string) => {
      return realtimeOrders.filter(order => {
        const st = (order.status || 'pending').toLowerCase();
        if (status === 'All') return true;
        if (status === 'Completed') return st === 'completed' || st === 'collected';
        return st === status.toLowerCase();
      }).length;
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
        {/* Metric dashboard row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container border border-outline rounded-3xl p-5 relative overflow-hidden group select-none">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">BEVERAGE GROSS SALES</p>
            <p className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(totalTransactionsSum)}</p>
            <p className="text-[8px] font-bold text-on-surface-variant uppercase mt-1">From completed collections</p>
            <div className="absolute right-0 bottom-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          </div>

          <div className="bg-surface-container border border-outline rounded-3xl p-5 relative overflow-hidden group select-none">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">TERMINAL QUEUE LOAD</p>
            <p className={cn("text-2xl font-black font-mono", activeQueueCount > 5 ? "text-amber-500" : "text-primary")}>
              {activeQueueCount} <span className="text-[10px] text-on-surface-variant/50">ORDERS</span>
            </p>
            <p className="text-[8px] font-bold text-on-surface-variant uppercase mt-1">Pending & in preparation</p>
            <div className="absolute right-0 bottom-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          </div>

          <div className="bg-surface-container border border-outline rounded-3xl p-5 relative overflow-hidden group select-none">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">AWAITING HANDOVER</p>
            <p className="text-2xl font-black font-mono text-blue-400">
              {readyForPickupCount} <span className="text-[10px] text-on-surface-variant/50">READY</span>
            </p>
            <p className="text-[8px] font-bold text-on-surface-variant uppercase mt-1">Awaiting digital verification</p>
            <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          </div>

          <div className="bg-surface-container border border-outline rounded-3xl p-5 relative overflow-hidden group select-none">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">VIP PATRON DEMANDS</p>
            <p className="text-2xl font-black font-mono text-purple-400">
              {totalVipSpendersCount} <span className="text-[10px] text-on-surface-variant/50">HIGH PRIO</span>
            </p>
            <p className="text-[8px] font-bold text-on-surface-variant uppercase mt-1">Prioritized VIP orders</p>
            <div className="absolute right-0 bottom-0 w-16 h-16 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          </div>
        </div>

        {/* Action strip with search, filters and trigger */}
        <div className="bg-surface-container border border-outline rounded-[2.5rem] p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input
                placeholder="Search Client Name, Receipt Code or Invoice ID..."
                value={ordersSearch}
                onChange={(e) => setOrdersSearch(e.target.value)}
                className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 text-xs font-bold uppercase outline-none focus:border-primary transition-all text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>

            {/* Quick simulated client injection helper */}
            <button
              onClick={handleSimulateOrder}
              className="h-14 bg-gradient-to-r from-amber-500/10 to-primary/10 hover:from-amber-500/20 hover:to-primary/20 text-primary border border-primary/20 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs font-black uppercase tracking-wider"
            >
              <Sparkles size={16} className="text-primary animate-pulse" />
              <span>Simulate Customer Bar Order</span>
            </button>
          </div>

          {/* Filters Selectors Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-outline/10">
            {/* Event Filter dropdown */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-widest block pl-1">Assigned Event Segment</span>
              <select
                value={ordersEventFilter}
                onChange={(e) => setOrdersEventFilter(e.target.value)}
                className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold font-mono text-on-surface outline-none focus:border-primary cursor-pointer appearance-none"
              >
                <option value="All">All Active Events ({events.length})</option>
                {events.map((evt) => (
                  <option key={`opt-evt-${evt.id}`} value={evt.id}>
                    {evt.title ? evt.title.toUpperCase() : 'Unnamed Event'}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority filter dropdown */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-widest block pl-1">Patron Access Level</span>
              <select
                value={ordersPriorityFilter}
                onChange={(e) => setOrdersPriorityFilter(e.target.value)}
                className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold font-mono text-on-surface outline-none focus:border-primary cursor-pointer appearance-none"
              >
                <option value="All">All Privilege Tiers</option>
                <option value="VIP">VIP Spenders Only</option>
                <option value="Standard">Standard Spenders Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Status Tab headers */}
        <div className="flex border-b border-outline/50 overflow-x-auto hide-scrollbar">
          {['All', 'Pending', 'Preparing', 'Ready', 'Completed'].map((status) => {
            const count = getCountForStatus(status);
            return (
              <button
                key={`orders-tab-${status}`}
                onClick={() => setOrdersStatusFilter(status)}
                className={cn(
                  "flex items-center gap-2 py-4 px-5 border-b-2 font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap",
                  ordersStatusFilter === status
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                )}
              >
                <span>{status}</span>
                <span className={cn(
                  "px-1.5 py-0.5 text-[8px] font-mono rounded-md font-black",
                  ordersStatusFilter === status 
                    ? "bg-primary text-black" 
                    : "bg-surface-container-high text-on-surface-variant"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Orders Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrdersList.map(order => {
            const isVipUser = order.isVip || (order.customer_name && (order.customer_name.includes('VIP') || order.customer_name.includes('[VIP]')));
            const formattedDate = order.timestamp 
              ? new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'LIVE';

            const statusLower = (order.status || 'pending').toLowerCase();
            
            // Get badge color styling
            let badgeStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";
            let leftBorder = "border-l-4 border-l-amber-500";
            if (statusLower === 'preparing') {
              badgeStyle = "bg-blue-500/15 text-blue-400 border-blue-500/20 animate-pulse";
              leftBorder = "border-l-4 border-l-blue-500";
            } else if (statusLower === 'ready') {
              badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
              leftBorder = "border-l-4 border-l-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.05)]";
            } else if (statusLower === 'completed' || statusLower === 'collected') {
              badgeStyle = "bg-outline-variant/30 text-on-surface-variant/70 border-transparent";
              leftBorder = "border-l-4 border-l-outline/30";
            } else if (statusLower === 'cancelled') {
              badgeStyle = "bg-red-500/10 text-red-400 border-red-500/20";
              leftBorder = "border-l-4 border-l-red-500";
            }

            return (
              <div
                key={`ord-${order.id}`}
                className={cn(
                  "bg-surface-container border border-outline rounded-3xl p-5 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 relative group overflow-hidden",
                  leftBorder
                )}
              >
                {/* Title and Metadata */}
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-black text-on-surface tracking-tight">
                          #{order.order_number || order.id.slice(0, 5).toUpperCase()}
                        </span>
                        {isVipUser && (
                          <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                            VIP PRIORITY
                          </span>
                        )}
                        {order.table_number && (
                          <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded font-mono">
                            Table {order.table_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black uppercase text-on-surface truncate">
                        {order.customer_name || 'Walk-In Spender'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 text-right">
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider", badgeStyle)}>
                        {order.status || 'Pending'}
                      </span>
                      <span className="text-[8px] font-mono text-on-surface-variant mt-1.5">
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* List of ordered items */}
                  <div className="bg-background/50 border border-outline/30 rounded-2xl p-3.5 space-y-1.5 mb-4 max-h-[140px] overflow-y-auto">
                    {order.items?.map((item, id) => (
                      <div key={`item-${id}`} className="flex justify-between text-xs">
                        <span className="font-bold uppercase tracking-tight text-on-surface-variant truncate pr-2">
                          <span className="font-black text-primary mr-1 font-mono">x{item.quantity}</span> 
                          {item.item?.name || 'Beverage product'}
                        </span>
                        <span className="font-mono text-on-surface-variant/70 shrink-0 font-bold">
                          {formatCurrency((item.item?.price || 0) * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {(!order.items || order.items.length === 0) && (
                      <p className="text-[10px] text-on-surface-variant italic py-2">No menu products listed</p>
                    )}
                  </div>
                </div>

                {/* Total and manual State Transition speed actions */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-outline/10 mt-auto">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-on-surface-variant block">Grand Invoice Total</span>
                    <span className="text-base font-black font-mono text-primary">
                      {formatCurrency(order.total_amount || order.total || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Interactive workflow transition actions */}
                    {statusLower === 'pending' && (
                      <button
                        onClick={async () => {
                          await orderService.updateOrderStatus(order.id, 'Preparing');
                        }}
                        className="h-10 px-4 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/20 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Start Prep
                      </button>
                    )}

                    {statusLower === 'preparing' && (
                      <button
                        onClick={async () => {
                          await orderService.updateOrderStatus(order.id, 'Ready');
                        }}
                        className="h-10 px-4 bg-primary/15 hover:bg-primary border border-primary/20 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Set Ready
                      </button>
                    )}

                    {statusLower === 'ready' && (
                      <button
                        onClick={async () => {
                          await orderService.updateOrderStatus(order.id, 'Collected');
                        }}
                        className="h-10 px-4 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Hand Over
                      </button>
                    )}

                    {/* View Details modal popup launcher */}
                    <button
                      onClick={() => setSelectedOrderForModal(order)}
                      className="w-10 h-10 bg-background hover:bg-surface-container-high border border-outline rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all shrink-0"
                      title="Full order details"
                    >
                      <Info size={16} />
                    </button>

                    {/* Supervisor overrides of cancelling/declining */}
                    {statusLower !== 'completed' && statusLower !== 'collected' && statusLower !== 'cancelled' && (
                      <button
                        onClick={async () => {
                          if (window.confirm('Cancel and void this live customer order?')) {
                            await orderService.updateOrderStatus(order.id, 'Cancelled');
                          }
                        }}
                        className="w-10 h-10 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 rounded-xl flex items-center justify-center transition-all shrink-0"
                        title="Void Order"
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredOrdersList.length === 0 && (
            <div className="col-span-full py-20 bg-surface-container border border-dashed border-outline rounded-[3rem] text-center space-y-4">
              <div className="w-16 h-16 bg-background border border-outline rounded-2xl flex items-center justify-center mx-auto opacity-30">
                <ShoppingBag size={24} className="text-on-surface-variant" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface">No Live Sync Orders</p>
                <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider max-w-sm mx-auto leading-relaxed">
                  No orders match your current filters. Tap the mock order button above to instantly generate responsive live mock orders!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Detail Modal overlay backdrop */}
        {selectedOrderForModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
            <div className="bg-surface-container border border-outline rounded-[2rem] p-6 w-full max-w-md space-y-5 shadow-2xl relative">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-black text-primary block mb-0.5">
                    RECEIPT: #{selectedOrderForModal.id}
                  </span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Verification Slip Code Details
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrderForModal(null)}
                  className="p-2 bg-background hover:bg-surface-container-high border border-outline rounded-xl transition-colors text-on-surface"
                >
                  <XCircle size={18} className="text-on-surface-variant" />
                </button>
              </div>

              {/* Order specifications content list */}
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest leading-none pl-1">Client & Location Profile</p>
                  <div className="p-4 bg-background border border-outline rounded-2xl space-y-1.5 text-xs">
                    <p className="font-black text-on-surface uppercase">{selectedOrderForModal.customer_name || 'Walk-In Spender'}</p>
                    <p className="text-on-surface-variant uppercase font-bold text-[10px]">Method: {selectedOrderForModal.payment_method || 'External Card terminal'}</p>
                    <p className="text-on-surface-variant uppercase font-bold text-[10px]">Payment: {selectedOrderForModal.payment_status || 'Paid'}</p>
                    <p className="text-on-surface-variant uppercase font-bold text-[10px]">Table/Seat: {selectedOrderForModal.table_number || 'Express Counter collection'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest leading-none pl-1">Selected itemized receipt list</p>
                  <div className="p-4 bg-background border border-outline rounded-2xl space-y-3">
                    {selectedOrderForModal.items?.map((item, id) => (
                      <div key={`modal-it-${id}`} className="flex justify-between items-center text-xs">
                        <div className="min-w-0 pr-3">
                          <p className="font-black text-on-surface uppercase truncate">{item.item?.name || 'Beverage product'}</p>
                          <p className="text-[9px] text-primary font-mono font-bold uppercase">{item.item?.category || 'Menu order'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-black text-on-surface">x{item.quantity}</p>
                          <p className="text-[9px] font-mono font-bold text-on-surface-variant">{formatCurrency(item.item?.price || 0)} ea</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-total strip */}
                <div className="flex justify-between items-center p-4 bg-background/50 border border-outline rounded-2xl">
                  <span className="text-xs font-black uppercase text-on-surface-variant">Combined invoice Total</span>
                  <span className="text-xl font-black font-mono text-primary">
                    {formatCurrency(selectedOrderForModal.total_amount || selectedOrderForModal.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) > 30) {
        setIsNavVisible(currentScrollY < lastScrollY.current || currentScrollY < 100);
        lastScrollY.current = currentScrollY;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-background pb-32" id="events-hub-root">
      {/* Floating Header Navigation */}
      <AnimatePresence>
        {showFloatingNav && (
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
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93]">Event DOCK</span>
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  {id: 'home', icon: Home, label: 'Home'},
                  {id: 'management', icon: Calendar, label: 'Manage'},
                  {id: 'guestlist', icon: List, label: 'Guests'},
                  {id: 'orders', icon: ShoppingBag, label: 'Orders'},
                  {id: 'inventory', icon: Package, label: 'Stock'},
                  {id: 'wcaps', icon: Sparkles, label: 'W-Caps'}
                ] as const
              ).map(({id, icon: Icon, label}) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                    activeTab === id 
                      ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={11} className={cn(activeTab === id ? "fill-black" : "")} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-4 sm:p-6 bg-surface-container border-b border-outline sticky top-0 z-10 backdrop-blur-xl bg-opacity-80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container border border-outline rounded-xl flex items-center justify-center shadow-sm">
              <WaytaLogo size={24} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none">Event Hub</h1>
                 <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <span className="text-[9px] sm:text-[10px] text-on-surface-variant font-bold flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                 <span className="text-primary font-black">WAYTA</span> • Local Network Active
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm active:scale-90 transition-all"
            >
              <QrCode size={20} />
            </motion.button>
            
            {onToggleTheme && (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={onToggleTheme}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors text-on-surface-variant border border-outline/10 shadow-sm overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={theme}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {theme === 'dark' ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-secondary" />}
                  </motion.div>
                </AnimatePresence>
              </motion.button>
            )}
            
            {user && <NotificationBell userId={user.uid} isDark={theme === 'dark'} />}
            
            <div className="flex items-center gap-2 bg-surface-container rounded-xl pl-3 pr-1 py-1 border border-outline/10 text-right ml-2">
               <div className="flex flex-col items-end mr-1">
                 <span className="text-[8px] font-black uppercase tracking-widest text-primary leading-none mb-0.5">
                   {user?.role?.replace('_', ' ') || 'MANAGER'}
                 </span>
                 <span className="text-[7px] font-bold uppercase tracking-tight text-on-surface-variant leading-none">Terminal v2.4</span>
               </div>
               <div className="w-8 h-8 rounded-lg border border-outline overflow-hidden flex-shrink-0">
                 <img 
                   src={user?.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80"} 
                   alt="User" 
                   className="w-full h-full object-cover grayscale"
                 />
               </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'management' && renderManagement()}
            {activeTab === 'marketing' && renderMarketing()}
            {activeTab === 'staff' && renderStaff()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'guestlist' && renderGuestList()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'insights' && activeEvent && <EventInsightsPanel event={activeEvent} theme={theme} />}
            {activeTab === 'wcaps' && activeEvent && (
               <WCapsManager 
                 venueId={effectiveVenueId || ''} 
                 source="event" 
                 sourceData={activeEvent} 
                 theme={theme} 
               />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modern Bottom Navigation */}
      <motion.nav 
        animate={{ y: isNavVisible ? 0 : 100, opacity: isNavVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
        "fixed bottom-6 left-6 right-6 border rounded-[2.5rem] p-3 flex items-center justify-around z-50 shadow-2xl safe-bottom",
        isDark ? "bg-black border-outline" : "bg-white border-outline"
      )}>
        <button 
          onClick={() => { setActiveTab('home'); }}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'home' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <Home size={18} />
          {activeTab === 'home' && <span className="text-[8px] font-black uppercase tracking-widest">Home</span>}
        </button>
        <button 
          onClick={() => setActiveTab('management')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'management' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <Settings size={18} />
          {activeTab === 'management' && <span className="text-[8px) font-black uppercase tracking-widest">Manage</span>}
        </button>
        <button 
          onClick={() => setActiveTab('marketing')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'marketing' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <TrendingUp size={18} />
          {activeTab === 'marketing' && <span className="text-[8px] font-black uppercase tracking-widest">Market</span>}
        </button>
        <button 
          onClick={() => setActiveTab('staff')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'staff' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <Users size={18} />
          {activeTab === 'staff' && <span className="text-[8px] font-black uppercase tracking-widest">Staff</span>}
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'inventory' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <Package size={18} />
          {activeTab === 'inventory' && <span className="text-[8px] font-black uppercase tracking-widest">Stock</span>}
        </button>
        <button 
          onClick={() => setActiveTab('guestlist')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'guestlist' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <List size={18} />
          {activeTab === 'guestlist' && <span className="text-[8px] font-black uppercase tracking-widest">Guests</span>}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'orders' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <ShoppingBag size={18} />
          {activeTab === 'orders' && <span className="text-[8px] font-black uppercase tracking-widest">Orders</span>}
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'insights' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <BarChart3 size={18} />
          {activeTab === 'insights' && <span className="text-[8px] font-black uppercase tracking-widest">Insights</span>}
        </button>
        <button 
          onClick={() => setActiveTab('wcaps')}
          className={cn(
            "p-3 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'wcaps' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <Trophy size={18} />
          {activeTab === 'wcaps' && <span className="text-[8px] font-black uppercase tracking-widest">W-Caps</span>}
        </button>
        <div className="w-px h-8 bg-outline/20 mx-2" />
        <button
          onClick={onToggleTheme}
          className="p-3 rounded-full flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-all"
        >
          {isDark ? <Home size={18} /> : <Home size={18} />} {/* Should use Sun/Moon icons but Home is used as placeholder for now, I'll fix icons later */}
          <span className="text-[8px] font-black uppercase tracking-widest">Theme</span>
        </button>
        <button 
          onClick={() => { onLogout(); }}
          className="p-3 rounded-full flex flex-col items-center gap-1 text-on-surface-variant hover:text-red-500 transition-all"
        >
          <LogOut size={18} />
          <span className="text-[8px] font-black uppercase tracking-widest">Logout</span>
        </button>
      </motion.nav>

      {/* Ticket QR Scanning & Verification Modal */}
      <AnimatePresence>
        {showVerifModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-surface-container border border-outline rounded-[2.5rem] p-8 w-full max-w-lg space-y-6 shadow-2xl text-center"
            >
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">ACCESS CONTROL GATEWAY</h3>
               <h2 className="text-2xl font-black uppercase mb-4 italic leading-tight">Ticket Verification</h2>

               {/* Verification Screen State Switcher */}
               {!verifResult && !verifError ? (
                  <div className="space-y-4">
                     <p className="text-[11px] font-bold uppercase text-on-surface-variant tracking-wider">Position the pass QR code within the scanner viewfinder window</p>
                     <div className="w-full aspect-square max-w-[280px] mx-auto overflow-hidden rounded-[2rem] border border-outline bg-black relative flex items-center justify-center">
                        <QRScanner 
                          onScan={(text) => handleVerifyTicketScan(text)} 
                          onClose={() => setShowVerifModal(false)} 
                        />
                     </div>
                     <p className="text-[10px] text-on-surface-variant font-black uppercase">CAMERA ACTIVE • ALIGNED VIEWPORT</p>
                  </div>
               ) : verifResult ? (
                  <div className="space-y-6 animate-in zoom-in-95 duration-200">
                     <div className="w-20 h-20 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                        <Check size={40} className="stroke-[3]" />
                     </div>
                     
                     <div className="space-y-1">
                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full">
                           Validated successfully
                        </span>
                        <h4 className="text-xl font-black uppercase tracking-tight pt-3">{verifResult.customer}</h4>
                        <p className="text-[10px] font-mono text-on-surface-variant uppercase bg-background px-3 py-1.5 rounded-lg border border-outline/10 inline-block font-bold">
                           Pass ID: #{verifResult.id.toUpperCase()}
                        </p>
                     </div>

                     <div className="bg-background/40 border border-outline/10 rounded-2xl p-4 text-left space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-on-surface-variant font-black uppercase text-[9px] tracking-wider">Event Name</span>
                           <span className="font-extrabold uppercase text-right line-clamp-1 max-w-[220px]">{verifResult.event}</span>
                        </div>
                        <div className="h-px bg-outline/10" />
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-on-surface-variant font-black uppercase text-[9px] tracking-wider">Pass Tier</span>
                           <span className="font-black text-primary uppercase">{verifResult.tier}</span>
                        </div>
                     </div>

                     <div className="flex gap-4 pt-2">
                        <button 
                          onClick={() => {
                            setVerifResult(null);
                            setVerifError(null);
                          }}
                          className="flex-1 h-12 bg-surface-container border border-outline hover:border-primary text-on-background font-black uppercase text-xs tracking-widest rounded-xl transition-all select-none active:scale-95 cursor-pointer"
                        >
                           Scan Next Pass
                        </button>
                        <button 
                          onClick={() => setShowVerifModal(false)}
                          className="flex-1 h-12 bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all select-none active:scale-95 cursor-pointer"
                        >
                           Done
                        </button>
                     </div>
                  </div>
               ) : (
                  <div className="space-y-6 animate-in zoom-in-95 duration-200">
                     <div className="w-20 h-20 bg-red-500/10 rounded-full border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
                        <XCircle size={40} className="stroke-[2]" />
                     </div>

                     <div className="space-y-2">
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full">
                           Verification Failed
                        </span>
                        <p className="text-sm font-bold uppercase text-red-500 pt-3">{verifError}</p>
                     </div>

                     <div className="flex gap-4 pt-2">
                        <button 
                          onClick={() => {
                            setVerifResult(null);
                            setVerifError(null);
                          }}
                          className="flex-1 h-12 bg-surface-container border border-outline hover:border-outline-variant text-on-background font-black uppercase text-xs tracking-widest rounded-xl transition-all select-none active:scale-95 cursor-pointer"
                        >
                           Retry Scan
                        </button>
                        <button 
                          onClick={() => setShowVerifModal(false)}
                          className="flex-1 h-12 bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all select-none active:scale-95 cursor-pointer"
                        >
                           Done
                        </button>
                     </div>
                  </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inventory Management Modal */}
      <InventoryImportModal 
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        venueId={effectiveVenueId || ''}
        eventId={activeEvent?.id || ''}
      />

      <InventoryItemModal 
        isOpen={showInventoryItemModal}
        onClose={() => setShowInventoryItemModal(false)}
        venueId={effectiveVenueId || ''}
        eventId={activeEvent?.id || ''}
        item={selectedInventoryItem}
      />

      {/* Add Guest Modal */}
      <AnimatePresence>
        {showAddGuestForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface-container border border-outline rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 w-full max-sm:max-w-md space-y-6 shadow-2xl"
            >
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase tracking-tight">Add to Guest List</h2>
                  <button onClick={() => setShowAddGuestForm(false)} className="p-2 hover:bg-background rounded-full transition-colors">
                     <Plus className="rotate-45" size={24} />
                  </button>
               </div>

               <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const formData = new FormData(e.currentTarget);
                    const guest = {
                      eventId: activeEvent?.id || '',
                      venueId: effectiveVenueId || '',
                      name: formData.get('name') as string,
                      email: formData.get('email') as string,
                      phone: formData.get('phone') as string,
                      isVip: formData.get('isVip') === 'on',
                      addedBy: user?.uid || '',
                      notes: formData.get('notes') as string
                    };
                    await guestListService.addGuest(guest);
                    setShowAddGuestForm(false);
                  } catch (err) {
                    console.error("Failed to add guest:", err);
                    alert("Failed to add guest. Please try again.");
                  }
                }} className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Guest Name</label>
                     <input required name="name" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all" placeholder="Full name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Email</label>
                        <input name="email" type="email" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all" placeholder="Optional" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Phone</label>
                        <input name="phone" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all" placeholder="Optional" />
                     </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background border border-outline rounded-[1.5rem]">
                    <input type="checkbox" name="isVip" id="isVip" className="w-5 h-5 accent-primary" />
                    <label htmlFor="isVip" className="text-xs font-black uppercase tracking-widest cursor-pointer select-none">Priority VIP Access</label>
                  </div>
                   <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Management Notes</label>
                        <textarea name="notes" className="w-full h-24 bg-background border border-outline rounded-2xl p-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all resize-none" placeholder="Special handling or arrival notes..." />
                     </div>
                  <button type="submit" className="w-full py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30">
                    Register Attendee
                  </button>
               </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Guest List Modal */}
      <AnimatePresence>
        {showShareGuestList && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface-container border border-outline rounded-[2rem] p-8 w-full max-w-md space-y-6 shadow-2xl"
            >
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase tracking-tight">External Guest List</h2>
                  <button onClick={() => setShowShareGuestList(false)} className="p-2 hover:bg-background rounded-full transition-colors">
                     <Plus className="rotate-45" size={24} />
                  </button>
               </div>
               
               <div className="space-y-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant leading-relaxed">
                    Generate a secure, view-only link to share the guest list with door security or external partners.
                  </p>
                  
                  <div className="p-5 bg-background border border-outline rounded-2xl flex items-center justify-between group">
                     <div className="truncate flex-1 mr-4">
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Secure Link</p>
                        <p className="text-xs font-mono font-bold truncate">https://wayta.co.za/guestlist/{activeEvent?.id}</p>
                     </div>
                      <button 
                       onClick={() => {
                         navigator.clipboard.writeText(`https://wayta.co.za/guestlist/${activeEvent?.id}`)
                           .then(() => alert('Link copied to clipboard!'))
                           .catch(err => {
                             console.error('Failed to copy list link:', err);
                             alert('Failed to copy to clipboard.');
                           });
                       }}
                       className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-black transition-all"
                     >
                        <Share2 size={16} />
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => guestListService.exportToCSV(guests)}
                    className="py-4 bg-background border border-outline rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <FileUp size={16} />
                    Download CSV
                  </button>
                  <button 
                    onClick={() => setShowShareGuestList(false)}
                    className="py-4 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest"
                  >
                    Done
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddStaffForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface-container border border-outline rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 w-full max-sm:max-w-md space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase tracking-tight">Enroll Staff</h2>
                  <button onClick={() => setShowAddStaffForm(false)} className="p-2 hover:bg-background rounded-full transition-colors">
                     <Plus className="rotate-45" size={24} />
                  </button>
               </div>
               
               <form onSubmit={handleAddStaff} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">First Name</label>
                       <input required name="firstName" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all" placeholder="E.G. SIYA" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Last Name</label>
                       <input required name="lastName" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all" placeholder="E.G. KHUMALO" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Email Identity</label>
                     <input required type="email" name="email" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all" placeholder="Required for authentication" />
                     <p className="text-[8px] font-bold text-on-surface-variant/60 px-1 uppercase tracking-widest">Used as the unique authentication handle</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Phone Number</label>
                        <input name="phone" type="tel" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all" placeholder="+27 82 000 0000" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Gender</label>
                        <div className="relative">
                           <select name="gender" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all appearance-none cursor-pointer pr-10">
                              <option value="Prefer not to say">Prefer not to say</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                           </select>
                           <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-on-surface-variant/30 pointer-events-none" size={24} />
                        </div>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Operational Role</label>
                     <div className="relative">
                        <select 
                           required 
                           name="role" 
                           className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all appearance-none cursor-pointer pr-10"
                        >
                           <optgroup label="Event Specific Roles" className="bg-background">
                              <option value="Security">Security</option>
                              <option value="Stage Hand">Stage Hand</option>
                              <option value="Bar Staff">Bar Staff</option>
                              <option value="Door Staff">Door Staff</option>
                              <option value="VIP Host">VIP Host</option>
                              <option value="Runner">Runner</option>
                           </optgroup>
                           <optgroup label="Venue Roles" className="bg-background">
                              <option value="BARTENDER">Bartender</option>
                              <option value="WAITER">Waiter</option>
                              <option value="MANAGER">Manager</option>
                              <option value="STAFF">General Staff</option>
                           </optgroup>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-on-surface-variant/30 pointer-events-none" size={24} />
                     </div>
                  </div>
                  
                  <div className="pt-4 space-y-4">
                     <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                        <Info size={16} className="text-primary flex-shrink-0 mt-1" />
                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase text-primary tracking-widest">Credential Protocol</p>
                           <p className="text-[8px] font-bold text-primary/70 uppercase leading-relaxed tracking-wider">
                              Enrolling a member generates a unique terminal username and operational PIN.
                              These credentials allow the device to synchronize with your production node.
                           </p>
                        </div>
                     </div>
                     <button 
                       type="submit"
                       className="w-full py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 group relative overflow-hidden"
                     >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                           <ShieldCheck size={18} />
                           Finalize Enrollment
                        </div>
                     </button>
                  </div>
               </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credentials Prompt */}
      <AnimatePresence>
        {showCredentials && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface-container border border-outline rounded-[3rem] p-8 w-full max-w-sm text-center space-y-8 shadow-2xl"
            >
               <div className="w-20 h-20 bg-green-500/20 rounded-[2rem] flex items-center justify-center mx-auto text-green-500">
                  <ShieldCheck size={40} />
               </div>
               <div className="space-y-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight">Staff Enrolled</h2>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">
                    Authorized credentials generated for digital sync.
                  </p>
               </div>
               
               <div className="space-y-4">
                  <div className="bg-background border border-outline p-6 rounded-3xl space-y-6 text-left">
                     <div>
                        <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Authorization Username</p>
                        <p className="text-xl font-black text-primary uppercase break-all leading-tight">{showCredentials.username}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Operational PIN</p>
                        <p className="text-4xl font-black tracking-[0.4em] text-primary">{showCredentials.pin}</p>
                     </div>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-start gap-4 text-left">
                     <AlertTriangle size={16} className="text-primary flex-shrink-0 mt-1" />
                     <p className="text-[8px] font-black uppercase text-primary leading-relaxed">
                       Security Protocol: Share these credentials privately. They will not be displayed again.
                     </p>
                  </div>
               </div>
               
               <button 
                 onClick={() => setShowCredentials(null)}
                 className="w-full py-4 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20"
               >
                 Dismiss and Lock
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Form Modal */}
      {showEventEditForm && (
        <EventForm 
          venueId={effectiveVenueId || 'V001'}
          event={activeEvent}
          onClose={() => setShowEventEditForm(false)}
          onSuccess={() => setShowEventEditForm(false)}
        />
      )}

      {/* Debug Overlay */}
      <div className="fixed bottom-32 right-4 z-[99] bg-black/80 text-green-400 font-mono text-[10px] p-4 rounded-xl border border-green-500/30 backdrop-blur-sm pointer-events-none w-64 break-words">
        <p className="font-bold text-green-300 border-b border-green-500/30 pb-2 mb-2">DEV DEBUG</p>
        <p><span className="opacity-60">Venue ID:</span><br/>{effectiveVenueId || 'null'}</p>
        <p className="mt-1"><span className="opacity-60">Event ID:</span><br/>{activeEvent?.id || 'null'}</p>
        <p className="mt-1"><span className="opacity-60">Status:</span><br/>{activeEvent?.status || 'null'}</p>
        <p className="mt-1"><span className="opacity-60">Manager UID:</span><br/>{user?.uid || 'null'}</p>
        <p className="mt-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> DB Sync Active</p>
      </div>
    </div>
  );
};
