import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line
} from 'recharts';
import { 
  Users, TrendingUp, Timer, ShoppingBag, 
  ChevronRight, ArrowUpRight, Zap, CheckCircle2, Clock, Play, Package, 
  QrCode, X, Search, MoreVertical, AlertTriangle, Smartphone, ScanLine, ArrowLeft, Plus, Minus,
  Filter, Pause, PlayCircle, Ban, BarChart3 as BarChartIcon,
  Download, Upload, List, LayoutGrid, Edit2, Tag, ArrowDownWideNarrow, ListFilter, ArrowRight, Trash2,
  DollarSign, Briefcase, Calendar, Settings, Home, User, Sparkles, Wand2, Store,
  Activity, Shield, Bell, HardDrive, BarChart2, LogOut, UserPlus, Share2, Star, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { Order, Venue, User as UserType, GuestListItem } from '../types';
import { geminiService } from '../services/geminiService';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { eventService } from '../services/eventService';
import { guestListService } from '../services/guestListService';
import { venueService } from '../services/venueService';
import { vendorService } from '../services/vendorService';
import { orderService } from '../services/orderService';
import { staffService } from '../services/staffService';
import { INVENTORY_TEMPLATE } from '../constants/inventoryTemplates';
import { VenueForm } from '../components/forms/VenueForm';
import { StaffManager } from '../components/StaffManager';
import { InventoryImportModal } from '../components/modals/InventoryImportModal';
import { InventoryItemModal } from '../components/modals/InventoryItemModal';
import { NewEventModal } from '../components/modals/NewEventModal';
import { EventDetailsModal } from '../components/modals/EventDetailsModal';
import { CommandCenterView } from '../components/CommandCenterView';

import { WCapsManager } from '../components/WCapsManager';
import { useViewport } from '../hooks/useViewport';
import { BrandingCustomizer } from '../components/BrandingCustomizer';

interface ManagerDashboardViewProps {
  venue: Venue;
  user: UserType | null;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onHome?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
  onViewEventDashboard?: (eventId: string) => void;
  onViewChange?: (view: any) => void;
  theme?: 'light' | 'dark';
  role?: string;
}

type TabType = 'operations' | 'inventory' | 'staff' | 'insights' | 'vendors' | 'events' | 'settings' | 'guestlist' | 'wcaps' | 'branding';

export const ManagerDashboardView: React.FC<ManagerDashboardViewProps> = ({ 
  venue,
  user,
  orders: initialOrders, 
  onUpdateOrderStatus, 
  onHome,
  onBack,
  onLogout,
  onViewEventDashboard,
  onViewChange,
  theme = 'dark',
  role = 'MANAGER'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('operations');
  const { isMobile, isLandscape } = useViewport();
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [realtimeOrders, setRealtimeOrders] = useState<Order[]>(initialOrders);
  const [isPaused, setIsPaused] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'general' | 'premium'>('all');
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [eventHubVenueId, setEventHubVenueId] = useState<string>(venue.id);
  const [eventHubSelectedEventId, setEventHubSelectedEventId] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingNav(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Modals
  const [showInventoryImport, setShowInventoryImport] = useState(false);
  const [showInventoryItemModal, setShowInventoryItemModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [selectedEventModal, setSelectedEventModal] = useState<Event | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [currentVenue, setCurrentVenue] = useState<Venue>(venue);

  useEffect(() => {
    setCurrentVenue(venue);
  }, [venue]);

  const handleUpdateVenue = async (updates: Partial<Venue>) => {
    try {
      const updated = { ...currentVenue, ...updates };
      setCurrentVenue(updated);
      await venueService.updateVenue(currentVenue.id, updates);
      setShowNotification("Mesh Sync: Venue Config Updated");
      setTimeout(() => setShowNotification(null), 3000);
    } catch (err) {
      console.error("Failed to update venue:", err);
      setShowNotification("Sync Error: Failed to update node");
    }
  };

  const isDark = theme === 'dark';

  // 1. Listen to Realtime Orders (RTD) for low-latency syncing
  useEffect(() => {
    const unsub = orderService.listenToVenueOrders(venue.id, (orders) => {
      setRealtimeOrders(orders);
    });
    return () => unsub();
  }, [venue.id]);

  // 2. Listen to Inventory (Firestore) for persistent data
  useEffect(() => {
    const unsub = inventoryService.listenToInventory(venue.id, setInventory);
    return () => unsub();
  }, [venue.id]);

  // 3. Listen to Events & Vendors
  useEffect(() => {
    if (activeTab === 'events' || activeTab === 'guestlist') {
      const targetVenueId = activeTab === 'events' ? eventHubVenueId : venue.id;
      const unsub = eventService.listenToEvents(targetVenueId, setEvents);
      return () => unsub();
    }
    if (activeTab === 'vendors') {
      const unsub = vendorService.listenToVendors(venue.id, setVendors);
      return () => unsub();
    }
  }, [venue.id, eventHubVenueId, activeTab]);

  // Load all venues for selector in Event Hub
  useEffect(() => {
    const unsub = venueService.listenToVenuesFirestore(setAllVenues);
    return () => unsub();
  }, []);

  // Listen to Staff for assignments
  useEffect(() => {
    if (!venue?.id) return;
    const unsub = staffService.listenToStaff(venue.id, setStaff);
    return () => unsub();
  }, [venue?.id]);

  const [eventHubGuests, setEventHubGuests] = useState<GuestListItem[]>([]);
  useEffect(() => {
    if (activeTab === 'events' && eventHubSelectedEventId) {
      const unsub = guestListService.listenToGuestList(eventHubSelectedEventId, setEventHubGuests);
      return () => unsub();
    }
  }, [eventHubSelectedEventId, activeTab]);

  // Set first event as default for guest list
  useEffect(() => {
    if (activeTab === 'guestlist' && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [activeTab, events]);

  // Pre-select first event when events change on event hub
  useEffect(() => {
    if (activeTab === 'events' && events.length > 0) {
      if (!eventHubSelectedEventId || !events.find(e => e.id === eventHubSelectedEventId)) {
        setEventHubSelectedEventId(events[0].id);
      }
    } else if (activeTab === 'events' && events.length === 0) {
      setEventHubSelectedEventId(null);
    }
  }, [events, activeTab, eventHubVenueId]);

  const activeOrders = realtimeOrders.filter(o => o.status !== 'Collected');
  const collectedOrders = realtimeOrders.filter(o => o.status === 'Collected' || o.status === 'Completed' || o.status === 'collected' || o.status === 'completed');
  const totalRevenue = realtimeOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
  
  let avgVelocityMs = 0;
  if (collectedOrders.length > 0) {
    const totalTime = collectedOrders.reduce((acc, o) => {
      const end = (o as any).completedAt || (o as any).updatedAt || Date.now();
      const start = new Date(o.timestamp).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    avgVelocityMs = totalTime / collectedOrders.length;
  }
  const avgVelocityMins = avgVelocityMs > 0 ? (avgVelocityMs / 60000).toFixed(1) + "m" : "0.0m";

  const targetVelocityMs = 5 * 60000;
  const maxVelocityMs = 15 * 60000;
  let dynamicEfficiency = 100;
  if (avgVelocityMs > targetVelocityMs) {
    if (avgVelocityMs >= maxVelocityMs) {
      dynamicEfficiency = 20;
    } else {
      dynamicEfficiency = 100 - Math.round(((avgVelocityMs - targetVelocityMs) / (maxVelocityMs - targetVelocityMs)) * 80);
    }
  } else if (collectedOrders.length === 0 && realtimeOrders.length > 0) {
    dynamicEfficiency = 100;
  }
  const efficiencyLabel = dynamicEfficiency >= 90 ? "Optimal Base" : dynamicEfficiency >= 70 ? "Nominal Performance" : "Needs Improvement";

  const handleUpdateStatus = (id: string, currentStatus: Order['status']) => {
    let nextStatus: Order['status'] = 'Pending';
    if (currentStatus === 'Pending') nextStatus = 'Preparing';
    else if (currentStatus === 'Preparing') nextStatus = 'Ready';
    else if (currentStatus === 'Ready') nextStatus = 'Collected';
    
    onUpdateOrderStatus(id, nextStatus);

    if (nextStatus === 'Ready') {
      const ord = realtimeOrders.find(o => o.id === id);
      if (ord?.user_id) {
        import('../lib/firebase').then(async ({ doc, getDoc, db }) => {
          const uDoc = await getDoc(doc(db, 'users', ord.user_id));
          if (uDoc.exists()) {
            const emailAddress = uDoc.data()?.email;
            if (emailAddress) {
              const { notificationService } = await import('../services/notificationService');
              notificationService.sendEmailNotification(
                emailAddress,
                'Your order is ready for collection!',
                `Hi ${uDoc.data()?.full_name || 'there'},\n\nGood news! Your order is ready for collection. Please present your collection code at the pick-up counter.\n\nEnjoy!`
              );
            }
          }
        }).catch(e => console.warn('Failed to send Order Ready email:', e));
      }
    }

    setShowNotification(`Order updated to ${nextStatus}`);
    setTimeout(() => setShowNotification(null), 3000);
  };

  const [isSynchronizing, setIsSynchronizing] = useState(false);

  const handleQuickStart = async () => {
    console.log("Quick Start button clicked registered");
    
    if (!venue?.id) {
       console.error("No venue ID found during Quick Start");
       setShowNotification("Mesh Error: No active venue context found");
       return;
    }

    console.log(`Starting sync for venue: ${venue.id}`);
    setIsSynchronizing(true);
    setShowNotification("Mesh Synchronization: Initializing Write Batch...");

    try {
      const itemsWithVenueId = INVENTORY_TEMPLATE.map(item => ({
        ...item,
        stock: 50,
        venue_id: venue.id,
        is_active: true,
        status: 'Available'
      })) as any;
      
      console.log(`Attempting to sync ${itemsWithVenueId.length} items...`);
      const success = await inventoryService.addBulkItems(itemsWithVenueId, user?.uid || 'system');
      
      if (success) {
        console.log("Bulk sync successful");
        // Update venue flag
        await venueService.updateVenue(venue.id, { has_used_quickstart: true });
        setShowNotification("Mesh Synchronization: Template Injected Successfully");
      } else {
        console.error("Bulk sync returned false");
        setShowNotification("Mesh Failure: Write Batch Exception");
      }
    } catch (err) {
      console.error("Critical Quick Start Error:", err);
      setShowNotification("Mesh Failure: Critical Sync Error");
    } finally {
      setIsSynchronizing(true); // Wait for state update
      setTimeout(() => {
        setIsSynchronizing(false);
        setShowNotification(null);
      }, 2000);
    }
  };

  const handleManageEvent = (event: any) => {
    if (onViewEventDashboard) {
      onViewEventDashboard(event.id);
    } else {
      localStorage.setItem('wayta_auto_login_role', 'EVENT_MANAGER');
      localStorage.setItem('wayta_auto_login_event_id', event.id);
      if (onLogout) onLogout();
    }
  };

  const simulateCheckIn = async (event: any) => {
    if (!event || !event.id) return;
    try {
      const newSoldCount = (event.ticketsSold || 0) + 1;
      const targetVenueId = eventHubVenueId || venue.id;
      await eventService.updateEvent(targetVenueId, event.id, {
        ticketsSold: Math.min(event.ticketsTotal || 1000, newSoldCount)
      });
      const randomId = Math.floor(Math.random() * 9000 + 1000);
      const guestData = {
        eventId: event.id,
        venueId: targetVenueId,
        name: `Guest Selector ${randomId}`,
        email: `selector.${randomId}@wayta.co.za`,
        phone: `+2782${randomId}555`,
        status: 'Checked-in' as const,
        addedBy: user?.uid || 'system-gate',
        isVip: Math.random() > 0.7
      };
      await guestListService.addGuest(guestData);
      setShowNotification("Security Gate Admission: Access Key Validated & Check-in Logged");
      setTimeout(() => setShowNotification(null), 3000);
    } catch (e) {
      console.error("Gate simulation error:", e);
    }
  };

  return (
    <div className={cn(
      "min-h-screen pb-32 font-sans selection:bg-primary selection:text-black transition-colors duration-300",
      isDark ? "bg-background text-white" : "bg-background text-on-background"
    )}>
      {/* Floating Header Navigation */}
      <AnimatePresence>
        {showFloatingNav && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "fixed left-1/2 -translate-x-1/2 z-[100] bg-black/95 hover:bg-black backdrop-blur-xl border border-primary/30 p-1 rounded-full flex items-center gap-1 shadow-2xl shadow-primary/10 transition-all max-w-[95vw] overflow-x-auto scrollbar-hide",
              isLandscape && isMobile ? "top-2" : "top-4"
            )}
          >
            {!isMobile && (
              <div className="flex items-center gap-1.5 px-3 py-1 border-r border-white/10 shrink-0 select-none">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93]">Manager DOCK</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {(
                [
                  {id: 'operations', icon: Home, label: 'Ops'},                
                  {id: 'inventory', icon: Package, label: 'Stock'},
                  {id: 'staff', icon: Users, label: 'Staff'},
                  {id: 'events', icon: Calendar, label: 'Event'},
                  {id: 'guestlist', icon: ListFilter, label: 'Guests'},
                  {id: 'wcaps', icon: Sparkles, label: 'W-Caps'},
                  {id: 'branding', icon: Wand2, label: 'Brand'}
                ] as const
              ).map(({id, icon: Icon, label}) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
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

      {/* Sidebar / Nav for Tablet/Desktop, Bottom Nav for Mobile */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-xl border-b px-6 h-20 flex justify-between items-center transition-colors",
        isDark ? "bg-black/80 border-outline/10" : "bg-surface-container/80 border-outline"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('operations')}
            className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            <Home size={18} />
          </button>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] leading-none">{venue.name}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Command Node Alpha</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
          {(
            [
              {id: 'operations', icon: Home},                
              {id: 'inventory', icon: Package},
              {id: 'staff', icon: Users},
              {id: 'insights', icon: BarChartIcon},
              {id: 'vendors', icon: ShoppingBag},
              {id: 'events', icon: Calendar},
              {id: 'guestlist', icon: ListFilter},
              {id: 'wcaps', icon: Sparkles},
              {id: 'branding', icon: Wand2}
            ] as const
          ).map(({id, icon: Icon}) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap",
                activeTab === id ? "bg-primary text-black" : "bg-white/5 text-primary/60 hover:text-primary hover:bg-white/10"
              )}
            >
              <Icon size={12} />
              {id}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hidden sm:flex items-center gap-2",
              isPaused ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]" : 
              "bg-surface-container text-on-surface-variant/50 border border-outline"
            )}
          >
            {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
            {isPaused ? 'Resuming' : 'Halt Sink'}
          </button>
          <button 
            onClick={() => setShowCommandCenter(true)}
            className="h-10 px-6 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Command Center
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* Rapid Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard 
            label="Live Revenue" 
            value={formatCurrency(venue.stats?.live_revenue || totalRevenue)} 
            icon={<span className="text-secondary font-black">R</span>} 
            trend="+14% vs yesterday"
            isDark={isDark}
          />
          <StatsCard 
            label="Active Pulse" 
            value={(venue.stats?.active_pulse || activeOrders.length).toString()} 
            icon={<Zap className="text-primary" />} 
            trend={`${realtimeOrders.filter(o => o.status === 'Preparing').length} preparing`}
            isDark={isDark}
          />
          <StatsCard 
            label="Avg Velocity" 
            value={avgVelocityMins} 
            icon={<Timer className="text-primary" />} 
            trend="-0.5m since shift start"
            isDark={isDark}
          />
          <StatsCard 
            label="Efficiency" 
            value={`${dynamicEfficiency}%`} 
            icon={<Activity className="text-emerald-500" />} 
            trend={efficiencyLabel}
            isDark={isDark}
          />
        </div>

        {/* Dynamic View Injection */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'operations' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center bg-surface-container border border-outline/30 p-6 rounded-3xl">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Active Operations</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">Live Order Management Terminal</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Data Stream</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {activeOrders.map((order, i) => (
                       <OrderTerminal 
                         key={`${order.id}-${i}`} 
                         order={order} 
                         onUpdateStatus={handleUpdateStatus}
                         isDark={isDark}
                       />
                     ))}
                    {activeOrders.length === 0 && (
                      <div className="col-span-full py-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-30">
                        <ShoppingBag size={48} className="mb-4" />
                        <p className="text-sm font-black uppercase tracking-[0.2em]">All Terminals Idle</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-surface-container-high/40 border border-outline rounded-3xl p-8">
                    <h3 className="text-lg font-black uppercase tracking-tight mb-6">Security & Mesh</h3>
                    <div className="space-y-4">
                      <MeshStatus label="Payment Gateway" status="Operational" latency="12ms" isDark={isDark} />
                      <MeshStatus label="Inventory Sync" status="Operational" latency="24ms" isDark={isDark} />
                      <MeshStatus label="FCM Relay" status="Connected" latency="150ms" isDark={isDark} />
                      <MeshStatus label="Admin Auth" status="Verified" latency="--" isDark={isDark} />
                    </div>
                    <div className="mt-8 pt-8 border-t border-white/5">
                      <button className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
                        <Shield size={16} className="text-primary" />
                        Security Audit
                      </button>
                    </div>
                  </div>

                  {/* AI Strategist Fragment */}
                  <div className="bg-primary/5 border border-primary/20 p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform rotate-12 group-hover:scale-125 transition-transform">
                      <Sparkles size={64} className="text-primary" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">✨ AI Strategist</p>
                      <p className="text-sm font-bold leading-relaxed italic text-white/80">
                        "Increase Gin & Tonic price by R10 for the next 2 hours. High demand detected via venue density sensors."
                      </p>
                      <button className="mt-4 h-10 px-6 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                        Accept Strategy
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Operations Shortcuts Grid */}
                  <div className="bg-surface-container border border-outline rounded-3xl p-8 space-y-4">
                    <h3 className="text-lg font-black uppercase tracking-tight">Rapid Access</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {onViewChange && (
                        <button 
                          onClick={() => onViewChange('workflow')}
                          className="h-20 bg-primary hover:bg-primary/95 text-black rounded-2xl flex flex-col items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.1em] shadow-xl shadow-primary/10 active:scale-95 transition-all cursor-pointer"
                        >
                          <Shield size={18} />
                          Command Center
                        </button>
                      )}
                      {onViewChange && (
                        <button 
                          onClick={() => onViewChange('staff-dashboard')}
                          className="h-20 bg-surface-container-high hover:bg-surface-container-high/80 text-primary border border-primary/20 rounded-2xl flex flex-col items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.1em] active:scale-95 transition-all cursor-pointer"
                        >
                          <Users size={18} />
                          Staff View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container border border-outline/30 p-8 rounded-[2.5rem]">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Stock Controllers</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">Direct Manipulation of Consumer Catalog</p>
                  </div>
                  <div className="flex gap-2 bg-background/50 border border-outline rounded-xl p-1">
                    <button 
                      onClick={() => setInventoryFilter('all')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        inventoryFilter === 'all' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
                      )}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setInventoryFilter('general')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        inventoryFilter === 'general' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
                      )}
                    >
                      General
                    </button>
                    <button 
                      onClick={() => setInventoryFilter('premium')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        inventoryFilter === 'premium' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
                      )}
                    >
                      Premium
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!venue.has_used_quickstart && (
                      <button 
                        onClick={handleQuickStart}
                        disabled={isSynchronizing}
                        className="h-12 px-8 bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                      >
                        {isSynchronizing ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Synchronizing...
                          </>
                        ) : (
                          <>
                            <Zap size={16} /> Quick Start
                          </>
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => setShowInventoryItemModal(true)}
                      className="h-12 px-8 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus size={16} /> Add Item
                    </button>
                    <button 
                      onClick={() => setShowInventoryImport(true)}
                      className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all"
                    >
                      <Upload size={16} /> Import
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inventory
                    .filter(item => {
                      if (inventoryFilter === 'general') return !item.is_premium;
                      if (inventoryFilter === 'premium') return item.is_premium;
                      return true;
                    })
                    .map(item => (
                    <InventoryControlCard 
                      key={`inv-${item.id}`} 
                      item={item} 
                      onEdit={() => {
                        setSelectedInventoryItem(item);
                        setShowInventoryItemModal(true);
                      }}
                      onUpdateStock={(delta) => inventoryService.updateStock(item.id, Math.max(0, item.stock + delta))}
                      onToggle={() => inventoryService.toggleStatus(item.id, item.is_active)}
                      onTogglePremium={() => inventoryService.togglePremiumStatus(item.id, item.is_premium)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <StaffManager venueId={venue.id} theme={theme} events={events} currentUserId={user?.uid} />
            )}

            {activeTab === 'events' && (
              <div id="events-hub-root" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 {/* Header Banner */}
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4">
                    <div>
                       <h2 className="text-xl font-black uppercase tracking-tight">Active Activations</h2>
                       <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Venue Schedule, Operations & Telemetry Hub</p>
                    </div>
                    <button 
                      onClick={() => setShowNewEventModal(true)}
                      className="bg-primary text-black h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
                    >
                      <Plus size={16} /> Deploy Event
                    </button>
                 </div>

                 {/* Venue Selector Panel */}
                 <div className="px-4">
                   <div className="bg-surface-container border border-outline rounded-3xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Switch Venue Platform Hub</span>
                         <span className="text-[9px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">
                            {allVenues.find(v => v.id === eventHubVenueId)?.name || 'Standard Location'}
                         </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {allVenues.map((v, vIdx) => {
                            const isSelected = v.id === eventHubVenueId;
                            return (
                               <button
                                  key={`${v.id ?? 'venue'}-${vIdx}`}
                                  onClick={() => {
                                     setEventHubVenueId(v.id);
                                     setEventHubSelectedEventId(null); // Clear selected event to let useEffect auto-select first of new venue
                                  }}
                                  className={cn(
                                     "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border active:scale-95 flex items-center gap-2",
                                     isSelected 
                                        ? "bg-primary text-black border-primary shadow-sm shadow-primary/10" 
                                        : "bg-background text-on-surface-variant border-outline hover:border-primary/40 hover:text-on-surface"
                                  )}
                               >
                                  <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-black" : "bg-on-surface-variant/40")} />
                                  {v.name}
                               </button>
                            );
                         })}
                         {allVenues.length === 0 && (
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Loading integrated venues...</span>
                         )}
                      </div>
                   </div>
                 </div>

                 {/* Main Grid: Scheduled Activations + Real-Time Telemetry Monitor */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 pb-20">
                    {/* Column 1: Scheduled Activations list (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Scheduled Activations ({events.length})</h3>
                          <span className="text-[9px] font-black uppercase text-on-surface-variant">Click card to monitor pulse</span>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {events.map((event, eidx) => {
                             const isSelected = event.id === eventHubSelectedEventId;
                             return (
                                <div 
                                  key={`manager-event-${event.id || 'event'}-${eidx}`} 
                                  onClick={() => setEventHubSelectedEventId(event.id)}
                                  className={cn(
                                     "bg-surface-container border rounded-3xl overflow-hidden group cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between h-48",
                                     isSelected ? "border-primary ring-1 ring-primary" : "border-outline hover:border-primary/50"
                                  )}
                                >
                                   <div className="relative h-20 bg-black">
                                      <img 
                                        src={event.image || '/placeholder.png'} 
                                        className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                                        alt="" 
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
                                      <div className="absolute top-2 right-2 bg-primary text-black px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                         {event.status}
                                      </div>
                                   </div>
                                   <div className="p-4 flex-1 flex flex-col justify-between">
                                      <div>
                                         <h4 className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">{event.title}</h4>
                                         <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">{event.date} • {event.time || (event.startTime + ' - ' + event.endTime)}</p>
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-on-surface-variant border-t border-outline/20 pt-2 mt-2">
                                         <div className="flex items-center gap-1.5">
                                            <Users size={10} className="text-primary" />
                                            <span>{event.ticketsSold || 0} Registered</span>
                                         </div>
                                         <button 
                                            onClick={(e) => {
                                               e.stopPropagation();
                                               setSelectedEventModal(event);
                                            }}
                                            className="text-[8px] font-black uppercase tracking-widest text-primary hover:underline bg-primary/10 px-2 py-1 rounded"
                                         >
                                            Details
                                         </button>
                                      </div>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                       {events.length === 0 && (
                         <div className="py-12 flex flex-col items-center justify-center opacity-30 text-center border-2 border-dashed border-outline/30 rounded-3xl bg-surface-container">
                           <Calendar size={36} className="mb-3 text-on-surface" />
                           <p className="text-[10px] font-black uppercase tracking-widest">No activations scheduled for this venue</p>
                           <button 
                             onClick={() => setShowNewEventModal(true)}
                             className="mt-3 text-primary text-[9px] font-black uppercase tracking-widest underline underline-offset-4"
                           >
                             Create First Event
                           </button>
                         </div>
                       )}
                    </div>

                    {/* Column 2: Live Activity & Gate Monitor Panel (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Real-Time Pulse & Admissions</h3>
                       {(() => {
                          const activeEvent = events.find(e => e.id === eventHubSelectedEventId);
                          if (!activeEvent) {
                             return (
                                <div className="border border-outline bg-surface-container rounded-3xl p-8 flex flex-col items-center justify-center text-center opacity-40 h-64">
                                   <Activity size={32} className="mb-3 text-on-color" />
                                   <p className="text-[10px] font-black uppercase tracking-widest">Select an event from the schedule to activate telemetry monitoring</p>
                                </div>
                             );
                          }
                          const percent = Math.min(100, Math.round(((activeEvent.ticketsSold || 0) / (activeEvent.ticketsTotal || 500)) * 100));
                          return (
                             <div className="border border-outline bg-surface-container rounded-3xl p-5 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-start">
                                   <div className="min-w-0">
                                      <span className="text-[8px] font-black uppercase bg-primary/20 text-primary px-2 py-0.5 rounded tracking-widest">Live telemetry</span>
                                      <h4 className="text-base font-black uppercase tracking-tight mt-1 text-on-surface truncate">{activeEvent.title}</h4>
                                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{activeEvent.date} @ {activeEvent.venueName || 'Venue Hub'}</p>
                                   </div>
                                   <span className="text-[9px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider h-fit shrink-0">
                                      Active
                                   </span>
                                </div>

                                {/* Attendance Progress bar */}
                                <div className="space-y-1 bg-background/50 p-4 rounded-2xl border border-outline/30">
                                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                                      <span className="text-on-surface-variant">Capacity Fill</span>
                                      <span className="text-primary">{activeEvent.ticketsSold || 0} / {activeEvent.ticketsTotal || 500} ({percent}%)</span>
                                   </div>
                                   <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-outline/20">
                                      <div 
                                         className="h-full bg-primary transition-all duration-500" 
                                         style={{ width: `${percent}%` }}
                                      />
                                   </div>
                                </div>

                                {/* Simulate admissions button */}
                                <div className="space-y-2">
                                   <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-widest block">Door Control System</span>
                                   <button
                                      onClick={() => simulateCheckIn(activeEvent)}
                                      className="w-full h-11 bg-primary hover:bg-primary/95 text-black rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-primary/10"
                                   >
                                      <Zap size={12} /> Simulate Gate Check-in
                                   </button>
                                   <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-wider text-center">
                                      Simulates a physical QR code scan at the door, increasing attendee count and updating the guest list instantly.
                                   </p>
                                </div>

                                {/* Guest Check-in stream list */}
                                <div className="space-y-2">
                                   <div className="flex justify-between items-center">
                                      <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-widest">Attendee Stream ({eventHubGuests.length})</span>
                                      <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded animate-pulse uppercase tracking-wider">Live</span>
                                   </div>
                                   <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                      {eventHubGuests.map((guest, gidx) => (
                                         <div key={`manager-guest-${guest.id || 'guest'}-${gidx}`} className="bg-background/40 hover:bg-background/80 border border-outline/25 p-2.5 rounded-xl flex items-center justify-between transition-all">
                                            <div className="space-y-0.5">
                                               <p className="text-[10px] font-black uppercase text-on-surface leading-none">{guest.name}</p>
                                               <p className="text-[8px] font-medium text-on-surface-variant tracking-wider lowercase">{guest.email}</p>
                                            </div>
                                            <div className="text-right">
                                               <span className="inline-block text-[7px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                  Checked In
                                               </span>
                                               <p className="text-[7px] font-semibold text-on-surface-variant uppercase tracking-wider mt-0.5">
                                                  {guest.addedAt ? new Date(guest.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'Just now'}
                                               </p>
                                            </div>
                                         </div>
                                      ))}
                                      {eventHubGuests.length === 0 && (
                                         <div className="text-center py-6 opacity-30">
                                            <p className="text-[9px] font-black uppercase tracking-widest">No attendees checked in yet</p>
                                         </div>
                                      )}
                                   </div>
                                </div>
                             </div>
                          );
                       })()}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'vendors' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-surface-container border border-outline/30 p-8 rounded-[2.5rem]">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Vendor Mesh</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">External Service Partners</p>
                  </div>
                  <button className="h-12 px-8 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all">
                    <Store size={16} /> Deploy Vendor
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {vendors.length > 0 ? vendors.map((vendor, i) => (
                    <div key={`vendor-${vendor.id ?? vendor.uid ?? vendor.business_name ?? i}`} className="bg-surface-container border border-white/5 p-8 rounded-[2.5rem] flex gap-8">
                      <div className="w-24 h-24 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center">
                        <Store size={40} className="text-on-surface-variant/20" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-black uppercase tracking-tight">{vendor.business_name}</h4>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{vendor.category}</p>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            vendor.status === 'Active' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-outline/20 border-outline/30 text-on-surface-variant/40"
                          )}>
                            {vendor.status}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button className="h-10 px-6 bg-white/5 border border-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all">Audit</button>
                          <button className="h-10 px-6 bg-red-500/10 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest text-red-500 hover:bg-red-500 transition-all">Revoke</button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-20 border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center opacity-30">
                       <Store size={48} className="mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest">Zero Vendors Linked</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-8 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-surface-container border border-white/5 p-8 rounded-[3rem]">
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Throughput Matrix</h3>
                        <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mt-1">Real-time Fulfillment Performance</p>
                      </div>
                      <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:border-primary">
                        <option>Current Shift</option>
                        <option>Last 24 Hours</option>
                      </select>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={SAMPLE_CHART_DATA}>
                          <XAxis 
                            dataKey="time" 
                            stroke="#444" 
                            fontSize={10} 
                            fontWeight="bold" 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0f1115', 
                              border: '1px solid #333', 
                              borderRadius: '16px',
                              fontSize: '12px',
                              fontWeight: '900',
                              textTransform: 'uppercase'
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="orders" 
                            stroke="#34d399" 
                            strokeWidth={4} 
                            dot={{ fill: '#34d399', r: 6, strokeWidth: 2, stroke: '#0f1115' }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-surface-container border border-white/5 p-8 rounded-[3rem] space-y-8">
                    <h3 className="text-xl font-black uppercase tracking-tight">Financial Pulse</h3>
                    <div className="space-y-6">
                      <FinancialMetric label="Gross GMV" value={formatCurrency(totalRevenue)} trend="+12.4%" />
                      <FinancialMetric label="Avg Order Value" value={formatCurrency(totalRevenue / (realtimeOrders.length || 1))} trend="+R24" />
                      <FinancialMetric label="Wayta Comm." value={formatCurrency(totalRevenue * 0.12)} trend="Nominal" />
                      <FinancialMetric label="Staff Tips (Est)" value={formatCurrency(totalRevenue * 0.08)} trend="+R450" />
                    </div>
                    <button className="w-full h-16 bg-primary text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20 mt-4 active:scale-95 transition-all">
                      Export Report
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'guestlist' && (
              <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container border border-outline/30 p-8 rounded-[2.5rem]">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Access Control</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">Guest List & Ticket Validation Mesh</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => guestListService.exportToCSV(guests)}
                      className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all active:scale-95"
                    >
                      <Share2 size={16} /> Export
                    </button>
                    <button 
                      onClick={() => setShowAddGuestForm(true)}
                      className="h-12 px-8 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <UserPlus size={16} /> Add Guest
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <aside className="lg:col-span-1 space-y-6">
                    <div className="bg-surface-container border border-outline rounded-3xl p-6">
                      <h4 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4 px-1">Select Event</h4>
                      <div className="space-y-2">
                        {events.map((event, idx) => (
                          <button 
                            key={`ev-sel-${event.id || 'event'}-${idx}`}
                            onClick={() => setSelectedEventId(event.id)}
                            className={cn(
                              "w-full p-4 rounded-2xl border text-left transition-all",
                              selectedEventId === event.id ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/10 text-on-surface-variant/60 hover:border-white/20"
                            )}
                          >
                            <p className="text-xs font-black uppercase tracking-tight">{event.title}</p>
                            <p className="text-[9px] font-bold uppercase mt-1 opacity-60">{event.date}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>

                  <div className="lg:col-span-3 space-y-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                      <input 
                        placeholder="Search Guest Identity..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 text-sm font-bold uppercase outline-none focus:border-primary transition-all"
                      />
                    </div>

                    <div className="bg-surface-container border border-outline rounded-[2.5rem] overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-white/5 border-b border-outline">
                             <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Access</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Actions</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-outline/10">
                             {guests
                                .filter(g => 
                                  g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  g.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((guest, idx) => (
                                <tr key={`g-${guest.id || 'guest'}-${idx}`} className="group hover:bg-white/5 transition-colors">
                                   <td className="px-8 py-5">
                                      <div className="flex items-center gap-3">
                                         <div className={cn(
                                           "w-8 h-8 rounded-lg flex items-center justify-center border",
                                           guest.isVip ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/10 opacity-30"
                                         )}>
                                            {guest.isVip ? <Star size={14} /> : <User size={14} />}
                                         </div>
                                         <div>
                                            <p className="text-sm font-black uppercase tracking-tight">{guest.name}</p>
                                            <p className="text-[10px] font-bold opacity-40">{guest.email || 'NO_IDENTIFIER'}</p>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-8 py-5">
                                      <select 
                                        value={guest.status}
                                        onChange={(e) => guestListService.updateGuest(guest.id, { status: e.target.value as any })}
                                        className={cn(
                                          "bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer",
                                          guest.status === 'Checked-in' ? "text-emerald-500" : "text-on-surface-variant/60"
                                        )}
                                      >
                                         <option value="Invited">Invited</option>
                                         <option value="Confirmed">Confirmed</option>
                                         <option value="Checked-in">Checked-in</option>
                                         <option value="No-show">No-show</option>
                                      </select>
                                   </td>
                                   <td className="px-8 py-5">
                                      <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                                        guest.isVip ? "bg-primary/10 border-primary text-primary" : "bg-white/10 border-white/10 opacity-40"
                                      )}>
                                         {guest.isVip ? 'Priority VIP' : 'Standard'}
                                      </span>
                                   </td>
                                   <td className="px-8 py-5">
                                      <button 
                                        onClick={() => {
                                          if (confirm('Delete guest?')) guestListService.removeGuest(guest.id);
                                        }}
                                        className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                         <Trash2 size={16} />
                                      </button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                       {guests.length === 0 && (
                         <div className="py-24 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                            <Users size={48} />
                            <p className="text-xs font-black uppercase tracking-widest">No Attendees Registered</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'wcaps' && (
               <WCapsManager 
                 venueId={venue.id} 
                 source="venue" 
                 sourceData={currentVenue} 
                 theme={theme} 
               />
            )}
             {activeTab === 'branding' && (
                <BrandingCustomizer
                  venue={currentVenue}
                  onUpdateVenue={handleUpdateVenue}
                  events={events}
                  onUpdateEvent={async (eventId, updates) => {
                    await eventService.updateEvent(venue.id, eventId, updates);
                    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updates } : e));
                  }}
                  theme={theme}
                />
             )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Modals 
        showInventoryImport={showInventoryImport} 
        setShowInventoryImport={setShowInventoryImport}
        showInventoryItemModal={showInventoryItemModal}
        setShowInventoryItemModal={setShowInventoryItemModal}
        selectedInventoryItem={selectedInventoryItem}
        venueId={venue.id}
        user={user}
        venue={currentVenue}
        showNewEventModal={showNewEventModal}
        setShowNewEventModal={setShowNewEventModal}
        selectedEventModal={selectedEventModal}
        setSelectedEventModal={setSelectedEventModal}
        onManageEvent={handleManageEvent}
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
              className={cn(
                "border rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 w-full max-sm:max-w-md space-y-6 shadow-2xl",
                isDark ? "bg-surface-container border-outline" : "bg-surface-container border-outline"
              )}
            >
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase tracking-tight">Register VIP/Guest</h2>
                  <button onClick={() => setShowAddGuestForm(false)} className="p-2 hover:bg-background rounded-full transition-colors">
                     <Plus className="rotate-45" size={24} />
                  </button>
               </div>

               <form onSubmit={async (e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 const guest = {
                   eventId: selectedEventId || '',
                   venueId: venue.id,
                   name: formData.get('name') as string,
                   email: formData.get('email') as string,
                   phone: formData.get('phone') as string,
                   isVip: formData.get('isVip') === 'on',
                   addedBy: user?.uid || '',
                   notes: formData.get('notes') as string
                 };
                 await guestListService.addGuest(guest);
                 setShowAddGuestForm(false);
               }} className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Guest Identity</label>
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
                  <button type="submit" className="w-full py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30">
                    Authorize Entry
                  </button>
               </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Inner Nav */}
      <div className="lg:hidden fixed bottom-24 left-6 right-6 z-40 bg-black border border-white/10 p-1.5 rounded-[2.5rem] flex gap-1 shadow-2xl">
        {(['operations', 'inventory', 'staff', 'insights', 'guestlist'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-4 rounded-3xl flex flex-col items-center gap-1.5 transition-all",
              activeTab === tab ? "bg-primary text-black" : "text-primary/60"
            )}
          >
            {tab === 'operations' && <Activity size={18} />}
            {tab === 'inventory' && <Package size={18} />}
            {tab === 'staff' && <Users size={18} />}
            {tab === 'insights' && <BarChart2 size={18} />}
            {tab === 'guestlist' && <List size={18} />}
            <span className="text-[8px] font-black uppercase tracking-widest">{tab === 'guestlist' ? 'Guests' : tab}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: -24, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-32 left-8 right-8 z-[100] bg-surface-container border border-primary/30 p-5 rounded-2xl flex items-center gap-4"
          >
            <Bell size={24} className="text-primary animate-bounce" />
            <p className="text-xs font-black uppercase tracking-tight text-white">{showNotification}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommandCenter && (
          <CommandCenterView 
            onClose={() => setShowCommandCenter(false)} 
            venue={currentVenue}
            isDark={isDark}
            onUpdateVenue={handleUpdateVenue}
          />
        )}
      </AnimatePresence>

      {/* Debug Overlay */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className={cn(
            "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all shadow-xl",
            isDark ? "bg-surface-container border-outline/10 text-on-surface" : "bg-surface-container border-outline text-on-surface"
          )}
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
        {onLogout && (
          <button 
            onClick={onLogout}
            className={cn(
              "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all shadow-xl flex items-center gap-2",
              isDark ? "bg-surface-container border-outline/10 text-on-surface hover:bg-on-surface/10" : "bg-surface-container border-outline text-on-surface shadow-sm hover:bg-on-surface/5"
            )}
          >
            <LogOut size={16} /> Logout
          </button>
        )}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cn(
                "absolute bottom-14 left-0 w-80 p-6 rounded-3xl border shadow-2xl backdrop-blur-xl max-h-[60vh] overflow-y-auto",
                isDark ? "bg-background/90 border-outline/10 text-on-surface" : "bg-surface-container/90 border-outline text-on-surface"
              )}
            >
              <h4 className="text-xs font-black uppercase tracking-widest mb-4">Venue Debug Data</h4>
              <pre className={cn(
                "text-[10px] sm:text-xs font-mono p-4 rounded-xl overflow-x-auto",
                isDark ? "bg-surface-container text-on-surface-variant/70" : "bg-surface-container text-on-surface-variant/80"
              )}>
                {JSON.stringify(venue, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

// --- Sub-components ---

const StatsCard = ({ label, value, icon, trend, isDark }: any) => (
  <div className={cn(
    "p-6 rounded-[2.5rem] border flex flex-col justify-between h-44 group transition-all hover:scale-[1.02]",
    isDark ? "bg-surface-container border-white/5" : "bg-white border-outline shadow-sm"
  )}>
    <div className="flex justify-between items-start">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border",
        isDark ? "bg-white/5 border-white/10" : "bg-surface-container-lowest border-outline-variant"
      )}>
        {icon}
      </div>
      <div className="h-6 px-3 rounded-full bg-primary/10 border border-primary/20 flex items-center shadow-sm">
        <span className="text-[8px] font-black text-primary uppercase tracking-widest">{trend}</span>
      </div>
    </div>
    <div>
      <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-1", isDark ? "opacity-40" : "text-on-surface-variant")}>{label}</p>
      <p className={cn("text-3xl font-black tracking-tighter uppercase", isDark ? "text-on-surface" : "text-on-surface")}>{value}</p>
    </div>
  </div>
);

const OrderTerminal = ({ order, onUpdateStatus, isDark }: { order: Order, onUpdateStatus: any, isDark: boolean }) => (
  <div className={cn(
    "p-6 rounded-3xl border transition-all hover:border-primary/50 relative overflow-hidden group",
    isDark ? "bg-surface-container-high/40 border-outline/10" : "bg-surface-container border-outline shadow-sm"
  )}>
    {order.status === 'Ready' && (
      <div className="absolute top-0 right-0 p-3">
        <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
      </div>
    )}
    
    <div className="flex justify-between items-start mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-black text-primary p-1 bg-primary/10 rounded uppercase">#{order.id.slice(0, 5)}</span>
          <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <h4 className="text-xl font-black uppercase tracking-tight leading-tight">{order.customer_name}</h4>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className={cn(
          "text-[8px] font-black uppercase px-3 py-1.5 rounded-xl border",
          order.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
          order.status === 'Preparing' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
          "bg-primary/10 border-primary/20 text-primary"
        )}>
          {order.status}
        </div>
        <div className={cn(
          "text-[8px] font-bold px-2 py-1 flex items-center gap-1 rounded-md",
          isDark ? "bg-on-surface/5 opacity-60" : "bg-on-surface/5 text-on-surface-variant"
        )}>
          <User size={10} />
          {order.staff_assigned || "Pool"}
        </div>
      </div>
    </div>

    <div className="space-y-2.5 mb-8">
      {order.items.map((item, i) => (
        <div key={`oi-${(item as any).id ?? item.item?.id ?? item.item?.name ?? (item as any).name ?? 'i'}-${i}`} className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide opacity-80">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>{item.quantity}x {item.item.name}</span>
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between pt-6 border-t border-white/5">
      <p className="text-xl font-mono font-bold tracking-tighter">{formatCurrency(order.total)}</p>
      <button 
        onClick={() => onUpdateStatus(order.id, order.status)}
        className={cn(
          "h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl",
          order.status === 'Pending' ? "bg-primary text-black" :
          order.status === 'Preparing' ? "bg-blue-500 text-white" :
          "bg-emerald-500 text-white"
        )}
      >
        {order.status === 'Pending' ? 'Start Order' : order.status === 'Preparing' ? 'Mark Ready' : 'Handover'}
      </button>
    </div>
  </div>
);

const MeshStatus = ({ label, status, latency, isDark }: any) => (
  <div className={cn(
    "flex justify-between items-center p-4 rounded-2xl border group transition-all",
    isDark ? "bg-surface-container-highest/20 border-outline/10 hover:border-primary/20" : "bg-surface-container/50 border-outline hover:border-primary/20"
  )}>
    <div className="flex flex-col">
      <span className={cn("text-[9px] font-black uppercase tracking-widest", isDark ? "opacity-40" : "text-on-surface-variant")}>{label}</span>
      <span className={cn("text-xs font-black uppercase", isDark ? "text-on-surface" : "text-on-surface")}>{status}</span>
    </div>
    <span className="text-[10px] font-mono font-bold text-primary">{latency}</span>
  </div>
);

const InventoryControlCard = ({ item, onEdit, onUpdateStock, onToggle, onTogglePremium, isDark }: any) => (
  <div className={cn(
    "p-8 rounded-[2.5rem] border transition-all flex flex-col justify-between group",
    isDark ? "bg-surface-container border-outline/10 hover:border-primary/30" : "bg-surface-container border-outline shadow-sm"
  )}>
    <div className="flex justify-between items-start mb-6">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{item.category}</span>
          <button 
            onClick={onTogglePremium}
            className={cn(
              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 shadow-lg transition-all active:scale-95",
              item.is_premium ? "bg-amber-500 text-black shadow-amber-500/20" : "bg-white/5 text-white/40 border border-white/10"
            )}
          >
            {item.is_premium ? <Sparkles size={8} /> : null}
            {item.is_premium ? 'Premium' : 'General'}
          </button>
        </div>
        <h4 className="text-2xl font-black uppercase tracking-tight">{item.name}</h4>
      </div>
      <p className="text-xl font-mono font-bold tracking-tighter">{formatCurrency(item.price)}</p>
    </div>

    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Stock: {item.stock}</span>
            <span className={cn(
              "text-[8px] font-black uppercase",
              item.stock < 10 ? "text-red-500" : "text-emerald-500"
            )}>{item.stock < 10 ? 'Critically Low' : 'Optimal'}</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-700", item.stock < 10 ? "bg-red-500" : "bg-primary")} 
              style={{ width: `${Math.min(100, item.stock)}%` }} 
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onUpdateStock(-1)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all font-bold group-hover:bg-primary group-hover:text-black group-hover:border-primary cursor-pointer"><Minus size={16} /></button>
          <button onClick={() => onUpdateStock(1)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all font-bold group-hover:bg-primary group-hover:text-black group-hover:border-primary cursor-pointer"><Plus size={16} /></button>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={onToggle}
          className={cn(
            "flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95",
            item.is_active !== false ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black"
          )}
        >
          {item.is_active !== false ? 'Disable Item' : 'Enable Item'}
        </button>
        <button 
          onClick={onEdit}
          className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <Settings size={18} className="opacity-40" />
        </button>
      </div>
    </div>
  </div>
);

const FinancialMetric = ({ label, value, trend }: any) => (
  <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 group">
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{label}</span>
      <span className="text-xl font-bold tracking-tight uppercase group-hover:text-primary transition-colors">{value}</span>
    </div>
    <span className={cn(
      "text-[10px] font-black uppercase tracking-tight px-3 py-1 rounded-full",
      trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-500" : "bg-on-surface-variant/10 text-on-surface-variant/40"
    )}>{trend}</span>
  </div>
);

const Modals = ({ 
  showInventoryImport, 
  setShowInventoryImport, 
  showInventoryItemModal, 
  setShowInventoryItemModal, 
  selectedInventoryItem, 
  venueId, 
  user, 
  venue,
  showNewEventModal,
  setShowNewEventModal,
  selectedEventModal,
  setSelectedEventModal,
  onManageEvent
}: any) => (
  <>
    <InventoryImportModal 
      isOpen={showInventoryImport}
      onClose={() => setShowInventoryImport(false)}
      venueId={venueId}
    />
    <InventoryItemModal 
      isOpen={showInventoryItemModal}
      onClose={() => setShowInventoryItemModal(false)}
      venueId={venueId}
      item={selectedInventoryItem}
    />
    <NewEventModal 
      isOpen={showNewEventModal}
      onClose={() => setShowNewEventModal(false)}
      venue={venue}
      user={user}
    />
    <EventDetailsModal 
      isOpen={!!selectedEventModal}
      onClose={() => setSelectedEventModal(null)}
      event={selectedEventModal}
      onManage={() => {
        onManageEvent(selectedEventModal);
        setSelectedEventModal(null);
      }}
    />
  </>
);

const SAMPLE_CHART_DATA = [
  { time: '18:00', orders: 12 },
  { time: '19:00', orders: 28 },
  { time: '20:00', orders: 45 },
  { time: '21:00', orders: 62 },
  { time: '22:00', orders: 54 },
  { time: '23:00', orders: 38 },
  { time: '00:00', orders: 22 },
];
