import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Settings, 
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  AlertCircle,
  Check,
  CheckCircle2,
  ShoppingBag,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  MoreVertical,
  Pause,
  Play,
  Zap,
  Home,
  User,
  Smartphone,
  RefreshCw,
  ShieldCheck,
  SearchCode,
  ThumbsUp,
  ThumbsDown,
  Barcode,
  ClipboardCheck,
  Activity,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { useViewport } from '../hooks/useViewport';
import { WaytaLogo } from '../components/WaytaLogo';
import { Order, Venue, UserRole, Event, OnboardingRequest } from '../types';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { eventService } from '../services/eventService';
import { vendorService, Vendor } from '../services/vendorService';
import { orderService } from '../services/orderService';
import { verificationService } from '../services/verificationService';
import { EventForm } from '../components/forms/EventForm';
import { VendorForm } from '../components/forms/VendorForm';
import { InventoryImportModal } from '../components/modals/InventoryImportModal';
import { InventoryItemModal } from '../components/modals/InventoryItemModal';
import { FileUp } from 'lucide-react';

interface PartnerDashboardViewProps {
  venue: Venue;
  orders: Order[];
  role: UserRole;
  onBack: () => void;
  onHome: () => void;
  onWorkflowClick?: () => void;
}

export const PartnerDashboardView: React.FC<PartnerDashboardViewProps> = ({ venue, orders: allOrders, role, onBack, onHome, onWorkflowClick }) => {
  if (!venue) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Syncing Venue Node...</p>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'history' | 'vendors' | 'events' | 'admin' | 'profile' | 'users'>('orders');
  const { isMobile, isLandscape } = useViewport();
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingNav(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [isVenueOnline, setIsVenueOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OnboardingRequest[]>([]);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showInventoryItemModal, setShowInventoryItemModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  // States for Rapid Stock Count Audit
  const [auditStation, setAuditStation] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [currentScanningName, setCurrentScanningName] = useState('');
  const [auditCompleted, setAuditCompleted] = useState(false);
  const [showAuditSubMenu, setShowAuditSubMenu] = useState(false);

  const venueOrders = allOrders.filter(o => o.venue_id === venue.id);

  useEffect(() => {
    const unsubInventory = inventoryService.listenToInventory(venue.id, setInventory);
    const unsubEvents = eventService.listenToEvents(venue.id, setEvents);
    const unsubVendors = vendorService.listenToVendors(venue.id, setVendors);

    return () => {
      unsubInventory();
      unsubEvents();
      unsubVendors();
    };
  }, [venue.id]);

  useEffect(() => {
    if (activeTab === 'admin' && role === 'ADMIN') {
      const fetchRequests = async () => {
        const requests = await verificationService.getPendingRequests();
        if (requests) setPendingRequests(requests);
      };
      fetchRequests();
    }
  }, [activeTab, role]);

  const handleVerifyRequest = async (requestId: string, status: 'Approved' | 'Rejected') => {
    try {
      await verificationService.updateRequestStatus(requestId, status);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setShowNotification(`Request ${status.toLowerCase()} successfully`);
      setTimeout(() => setShowNotification(null), 3000);
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await orderService.updateOrderStatus(id, status);
      setShowNotification(`Order ${id.substring(0, 8)} updated to ${status}`);
      setTimeout(() => setShowNotification(null), 3000);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] => {
    switch (currentStatus) {
      case 'Pending': return 'Preparing';
      case 'Preparing': return 'Ready';
      case 'Ready': return 'Collected';
      default: return currentStatus;
    }
  };

  const handleAddItem = () => {
    setSelectedInventoryItem(null);
    setShowInventoryItemModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setShowInventoryItemModal(true);
  };

  const stats = [
    { 
      label: 'Session Revenue', 
      value: formatCurrency(venueOrders.reduce((acc, o) => acc + o.total, 0)), 
      trend: '+12%', 
      icon: DollarSign 
    },
    { 
      label: 'Active Orders', 
      value: venueOrders.filter(o => o.status !== 'Collected').length.toString(), 
      trend: 'High Pulse', 
      icon: Zap 
    },
    { 
      label: 'Wait Time', 
      value: '6.5m', 
      trend: '-2m', 
      icon: Clock 
    },
  ];

  const handleToggleStock = (itemId: string, currentIsActive: boolean | undefined) => {
    inventoryService.toggleStatus(itemId, currentIsActive);
  };

  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    inventoryService.updatePrice(itemId, newPrice);
  };

  const startAudit = (stationName: string) => {
    setAuditStation(stationName);
    setIsAuditing(true);
    setAuditProgress(0);
    setAuditCompleted(false);
    setScannedItems([]);
    setCurrentScanningName('');

    // Fetch products belonging to the venue or fallbacks if none
    const itemsToAudit = inventory.length > 0 ? inventory : [
      { id: 'f01', name: 'Heineken 330ml', stock: 120, code: 'HEI-330', category: 'Beers' },
      { id: 'f02', name: 'Castle Lite 340ml', stock: 180, code: 'CAS-340', category: 'Beers' },
      { id: 'f03', name: 'Jägermeister 750ml', stock: 12, code: 'JAG-750', category: 'Spirits' },
      { id: 'f04', name: 'Corona 355ml', stock: 95, code: 'COR-355', category: 'Beers' },
      { id: 'f05', name: 'Red Bull 250ml', stock: 240, code: 'REB-250', category: 'Energy' },
    ];

    let currentIdx = 0;
    const intervalTime = 300; // scan an item every 300ms
    const totalSteps = itemsToAudit.length;

    const interval = setInterval(() => {
      if (currentIdx < totalSteps) {
        const item = itemsToAudit[currentIdx];
        setCurrentScanningName(item.name);
        
        // Simulating scanned quantity. In 1 or 2 items, let's create a discrepancy
        // to make the system highly diagnostic.
        let scannedQty = item.stock;
        if (currentIdx === 1) {
          scannedQty = Math.max(0, item.stock - 3); // Shortage
        } else if (currentIdx === totalSteps - 1 && item.stock > 0) {
          scannedQty = item.stock + 2; // Surplus
        }

        const discrepancy = scannedQty - item.stock;

        setScannedItems(prev => [
          ...prev, 
          {
            id: item.id,
            name: item.name,
            code: item.code || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
            expected: item.stock,
            scanned: scannedQty,
            discrepancy,
            status: discrepancy === 0 ? 'Match' : discrepancy < 0 ? 'Shortage' : 'Surplus'
          }
        ]);

        const percent = Math.round(((currentIdx + 1) / totalSteps) * 100);
        setAuditProgress(percent);
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsAuditing(false);
        setAuditCompleted(true);
      }
    }, intervalTime);
  };

  const handleReconcileLedger = async () => {
    try {
      const dbUpdates = scannedItems.filter(item => item.discrepancy !== 0);
      let updatedCount = 0;
      for (const updateItem of dbUpdates) {
        // If it's a real item in the inventory state (has a match), let's call updateStock
        const exists = inventory.find(i => i.id === updateItem.id);
        if (exists) {
          await inventoryService.updateStock(updateItem.id, updateItem.scanned);
          updatedCount++;
        }
      }
      
      setShowNotification(`Success: Reconciled ledger! Synced ${updatedCount} physical counts to database.`);
      setTimeout(() => setShowNotification(null), 3000);
      setAuditCompleted(false);
      setAuditStation(null);
      setScannedItems([]);
    } catch (err: any) {
      console.error("Ledger reconciliation failed:", err);
      setShowNotification("Error reconciling ledger");
      setTimeout(() => setShowNotification(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col w-full pb-32">
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
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93]">Partner DOCK</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {(
                [
                  {id: 'orders', icon: ShoppingBag, label: 'Orders'},
                  {id: 'inventory', icon: Package, label: 'Audit'},
                  {id: 'vendors', icon: Users, label: 'Vendors'},
                  {id: 'events', icon: Calendar, label: 'Events'}
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

      {/* Dynamic Header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl z-50 bg-background/80 backdrop-blur-xl border-b border-outline px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="w-10 h-10 rounded-xl bg-surface-container border border-outline flex items-center justify-center active:scale-90 transition-all" title="Back">
              <ArrowLeft size={18} />
            </button>
            <button onClick={onHome} className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-primary/20" title="Home">
              <Home size={18} />
            </button>
          </div>
          <div>
             <h2 className="text-sm font-black uppercase tracking-tight text-on-background leading-none">{venue.name}</h2>
             <div className="flex items-center gap-1.5 mt-1">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isVenueOnline ? "bg-emerald-500" : "bg-red-500")} />
                <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">{isVenueOnline ? 'Online' : 'Offline'}</span>
             </div>
          </div>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={() => setIsVenueOnline(!isVenueOnline)}
             className={cn(
               "h-10 px-4 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2",
               isVenueOnline ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
             )}
           >
             {isVenueOnline ? <Pause size={14} /> : <Play size={14} />}
             <span className="hidden sm:inline">{isVenueOnline ? 'Pause Orders' : 'Go Live'}</span>
           </button>
        </div>
      </header>

      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-6 right-6 z-[100] bg-emerald-500 text-black p-5 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.4)] flex items-center gap-4"
          >
            <Smartphone size={24} className="shrink-0" />
            <p className="text-xs font-black uppercase tracking-tight leading-tight">{showNotification}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-32 px-6 max-w-5xl mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="flex bg-surface-container p-1 rounded-2xl border border-outline mb-6 sm:mb-8 overflow-x-auto no-scrollbar scroll-smooth">
           {[
             { id: 'orders', label: 'Monitor', icon: LayoutDashboard, navId: 'nav-dashboard' },
             { id: 'workflow', label: 'Workflow', icon: RefreshCw, action: onWorkflowClick },
             { id: 'inventory', label: 'Inventory', icon: Package, navId: 'extension-hub', allowed: ['MANAGER', 'ADMIN'] },
             { id: 'events', label: 'Events', icon: BarChart3, navId: 'staff-performance', allowed: ['MANAGER', 'ADMIN'] },
             { id: 'vendors', label: 'Vendors', icon: Search, allowed: ['MANAGER', 'ADMIN'] },
             { id: 'admin', label: 'Verifications', icon: ShieldCheck, allowed: ['ADMIN'] },
             { id: 'profile', label: 'Profile', icon: User, allowed: ['BARTENDER', 'MANAGER', 'ADMIN'] },
           ]
           .filter(tab => !tab.allowed || tab.allowed.includes(role))
           .map(tab => (
             <button
               key={tab.id}
               id={(tab as any).navId}
               onClick={() => {
                 if (tab.action) {
                   tab.action();
                 } else {
                   setActiveTab(tab.id as any);
                 }
               }}
               className={cn(
                 "flex-1 min-w-[70px] sm:min-w-[100px] py-3 sm:py-4 px-2 rounded-xl flex flex-col items-center gap-1 transition-all shrink-0",
                 activeTab === tab.id ? "bg-primary text-black font-black" : "text-on-surface-variant hover:bg-white/5 font-bold"
               )}
             >
               <tab.icon size={window.innerWidth < 640 ? 16 : 18} />
               <span className="text-[7px] sm:text-[9px] uppercase tracking-widest text-center truncate w-full">{tab.label}</span>
             </button>
           ))}
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6" id="sales-metrics">
              {stats.map((s, i) => (
                <motion.div 
                   key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "bg-surface-container-high/60 p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-outline flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-all shadow-xl",
                    i === 2 && "col-span-2 md:col-span-1" // Make last item full width on mobile if odd
                  )}
                >
                  <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-24 sm:h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                  <div className="flex justify-between items-start relative z-10">
                    <div className="p-2 sm:p-3 bg-background/50 rounded-xl sm:rounded-2xl border border-outline/50 text-primary">
                      <s.icon size={window.innerWidth < 640 ? 18 : 24} />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 sm:py-1.5 rounded-full tracking-widest">
                      {s.trend}
                    </span>
                  </div>
                  <div className="mt-4 sm:mt-8 relative z-10">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-on-surface-variant mb-1 sm:mb-2">{s.label}</p>
                    <h3 className="text-xl sm:text-4xl font-mono font-bold tracking-tighter text-on-surface">{s.value}</h3>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Active Orders List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Active Operations</h3>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-bold text-emerald-500 uppercase">Live Stream</span>
                   </div>
                </div>

                {/* AI Prep Plan Section */}
                 <motion.div 
                   id="ai-prep"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="p-5 bg-surface-container rounded-3xl border-l-4 border-primary text-on-surface shadow-2xl"
                 >
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Zap size={14} className="text-primary" />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-primary">✨ AI Priority Prep</p>
                    </div>
                    <p className="text-xs font-bold text-on-surface-variant leading-relaxed uppercase italic">
                       "Prepare all 4 Gins at once to save time. Optimized build order active."
                    </p>
                 </motion.div>

                 {/* AI Intelligence Feed for Manager Onboarding */}
                 <motion.div 
                   id="ai-decoder"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="p-6 bg-surface-container rounded-[2rem] text-on-surface shadow-2xl border border-outline"
                 >
                    <p className="text-[10px] font-black uppercase text-primary mb-4 tracking-widest">✨ INTELLIGENCE FEED</p>
                    <div className="bg-primary text-black p-4 rounded-2xl text-xs font-black uppercase tracking-tight shadow-lg shadow-primary/20">
                       STRATEGY: Tequila demand up. Activate secondary bar station for throughput optimization.
                    </div>
                 </motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="order_queue_list">
                  {venueOrders.map(o => (
                    <div key={o.id} className="bg-surface-container border border-outline rounded-3xl p-6 hover:border-primary/50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-primary p-1 bg-primary/10 rounded uppercase">#{o.id.substring(0, 8)}</span>
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">{new Date(o.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <h4 className="text-lg font-black uppercase tracking-tight">Order #{o.id.substring(0, 4)}</h4>
                        </div>
                        <div className={cn(
                          "text-[9px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5",
                          o.status === 'Pending' ? "bg-amber-500/10 text-amber-500" :
                          o.status === 'Preparing' ? "bg-blue-500/10 text-blue-500" :
                          o.status === 'Ready' ? "bg-emerald-500/10 text-emerald-500" :
                          "bg-on-surface-variant/10 text-on-surface-variant"
                        )}>
                          {o.status === 'Collected' && <Check size={10} />}
                          {o.status}
                        </div>
                      </div>

                      <div className="space-y-2 mb-6">
                         {o.items.map((item, idx) => (
                           <div key={`${(item as any).id ?? item.item?.id ?? item.item?.name ?? (item as any).name ?? idx}-${idx}`} className="flex items-center gap-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">
                              <div className={cn("w-1.5 h-1.5 rounded-full", o.status === 'Collected' ? 'bg-on-surface-variant' : 'bg-primary')} />
                              {item.quantity}x {item.item.name}
                           </div>
                         ))}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-outline">
                         <p className="text-xl font-mono font-bold tracking-tighter">{formatCurrency(o.total)}</p>
                         <div className="flex gap-2">
                             {o.status !== 'Collected' ? (
                                <button 
                                  id="status_toggle_btn"
                                  onClick={() => updateOrderStatus(o.id, getNextStatus(o.status))}
                                  className={cn(
                                    "h-10 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2",
                                    o.status === 'Pending' ? "bg-primary text-black" :
                                    o.status === 'Preparing' ? "bg-blue-500 text-white" :
                                    "bg-emerald-500 text-black"
                                  )}
                                >
                                   {o.status === 'Pending' ? 'Start Order' : 
                                    o.status === 'Preparing' ? 'Mark Ready' : 'Mark Collected'}
                                </button>
                             ) : (
                               <div className="flex items-center gap-2 text-on-surface-variant text-[9px] font-black uppercase tracking-widest px-3">
                                  <CheckCircle2 size={14} /> Completed
                               </div>
                             )}
                            <button className="h-10 w-10 border border-outline rounded-xl flex items-center justify-center text-on-surface-variant hover:text-red-500 transition-colors">
                               <MoreVertical size={16} />
                            </button>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bartender Terminal Pulse */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant px-2">Terminal Pulse</h3>
                <div className="bg-surface-container-high/40 border border-outline rounded-3xl p-6 space-y-6" id="terminal-pulse">
                   {/* Diagnostic Audit Sub-Menu Button Trigger */}
                   <div className="relative border-b border-white/5 pb-4">
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                           <Activity size={12} className="text-primary animate-pulse" />
                           Rapid Station Audit
                         </p>
                         <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Audit current stations against real-time ledger</p>
                       </div>
                       <button 
                         id="audit-submenu-toggle"
                         onClick={() => setShowAuditSubMenu(!showAuditSubMenu)}
                         className="h-8 px-3 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 text-primary"
                       >
                         Trigger Audit Menu
                         <ChevronDown size={14} className={cn("transition-transform text-primary", showAuditSubMenu ? "rotate-180" : "")} />
                       </button>
                     </div>

                     {/* Dropdown Menu Items */}
                     <AnimatePresence>
                       {showAuditSubMenu && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.95, y: -10 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95, y: -10 }}
                           className="absolute right-0 top-10 z-20 w-48 bg-surface-container border border-outline/50 rounded-2xl p-2 shadow-2xl space-y-1 block"
                         >
                           <p className="text-[7px] text-zinc-500 font-black uppercase tracking-wider px-2 py-1">Select Station to Audit</p>
                           {[
                             { label: 'Audit Station A', value: 'Station A' },
                             { label: 'Audit Station B', value: 'Station B' },
                             { label: 'Audit VIP Deck', value: 'VIP Deck' }
                           ].map((opt) => (
                             <button
                               key={opt.value}
                               disabled={isAuditing}
                               onClick={() => {
                                 setShowAuditSubMenu(false);
                                 startAudit(opt.value);
                               }}
                               className="w-full text-left h-8 px-2.5 rounded-xl hover:bg-white/5 text-[9px] font-black text-on-surface uppercase tracking-wider transition-all flex items-center gap-2 text-white"
                             >
                               <Barcode size={10} className="text-primary" />
                               {opt.label}
                             </button>
                           ))}
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   {[
                     { name: 'Station A', staff: 'Marcus R.', status: 'Active', latency: '42ms' },
                     { name: 'Station B', staff: 'Sarah L.', status: 'Busy', latency: '85ms' },
                     { name: 'VIP Deck', staff: 'David K.', status: 'Idle', latency: '38ms' },
                   ].map((terminal, i) => (
                     <div key={i} className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="text-xs font-black uppercase text-white">{terminal.name}</p>
                              <p className="text-[8px] font-bold text-on-surface-variant uppercase">{terminal.staff}</p>
                           </div>
                           <div className="flex items-center gap-2">
                             <button
                               disabled={isAuditing}
                               onClick={() => startAudit(terminal.name)}
                               className="h-7 px-2.5 bg-primary/10 hover:bg-primary hover:text-black border border-primary/20 hover:border-primary text-primary rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                               title={`Trigger stock count audit for ${terminal.name}`}
                             >
                               <Barcode size={10} />
                               Audit
                             </button>
                             <div className={cn(
                               "text-[8px] font-black uppercase px-2 py-1 rounded-lg",
                               terminal.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" :
                               terminal.status === 'Busy' ? "bg-amber-500/10 text-amber-500" :
                               "bg-on-surface-variant/10 text-on-surface-variant"
                             )}>
                                {terminal.status}
                             </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className={cn("h-full bg-primary", i === 1 ? 'w-[80%]' : 'w-[40%]')} />
                           </div>
                           <span className="text-[8px] font-bold text-on-surface-variant tracking-tighter">{terminal.latency}</span>
                        </div>
                     </div>
                   ))}

                   {/* Active Audit Simulation Drawer */}
                   <AnimatePresence>
                     {isAuditing && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         exit={{ opacity: 0, height: 0 }}
                         className="overflow-hidden border border-primary/30 bg-primary/5 rounded-2xl p-4 space-y-4"
                       >
                         <div className="flex justify-between items-center pb-2 border-b border-primary/15">
                           <div className="flex items-center gap-2">
                             <Activity size={14} className="text-primary animate-pulse" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-primary">Digital Stock Scanner</span>
                           </div>
                           <span className="text-[9px] font-mono text-primary font-bold">{auditProgress}%</span>
                         </div>
                         
                         <div className="space-y-2">
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               className="h-full bg-primary"
                               style={{ width: `${auditProgress}%` }}
                               transition={{ ease: "easeOut" }}
                             />
                           </div>
                           <div className="flex justify-between text-[8px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                             <span className="truncate max-w-[15rem]">SCANNING: "{currentScanningName || 'Starting laser link...'}"</span>
                             <span className="animate-pulse">LASER LIVE 🔴</span>
                           </div>
                         </div>

                         {/* Mini progress tracker */}
                         <div className="max-h-28 overflow-y-auto space-y-1.5 divide-y divide-white/5 text-[10px]">
                           {scannedItems.slice(-3).map((item, idx) => (
                             <div key={`scanned-item-${(item as any).id ?? item.code ?? item.name ?? idx}`} className="flex justify-between items-center py-1 font-mono text-[9px]">
                               <span className="text-zinc-400 font-bold truncate max-w-[10rem]">{item.name}</span>
                               <span className="text-primary font-bold">{item.scanned} / {item.expected} Scanned</span>
                             </div>
                           ))}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {/* Audit Completed Summary Drawer */}
                   <AnimatePresence>
                     {auditCompleted && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         exit={{ opacity: 0, height: 0 }}
                         className="overflow-hidden border border-outline bg-background rounded-2xl p-4 space-y-4 shadow-xl"
                       >
                         <div className="flex justify-between items-center pb-2 border-b border-white/5">
                           <div className="flex items-center gap-2">
                             <ClipboardCheck size={14} className="text-emerald-400" />
                             <div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Audit Complete</span>
                               <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider">Reports for: {auditStation}</p>
                             </div>
                           </div>
                           <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">PASSED MATCHES</span>
                         </div>

                         {/* Results Ledger list */}
                         <div className="max-h-[12rem] overflow-y-auto space-y-2 border border-white/5 p-2 rounded-xl bg-black/10">
                           {scannedItems.map((item, idx) => {
                             const isDiscrepant = item.discrepancy !== 0;
                             return (
                               <div key={`scanned-result-${(item as any).id ?? item.code ?? item.name ?? idx}`} className="flex justify-between items-center border-b border-white/5 last:border-b-0 pb-1.5 last:pb-0 font-mono text-[9px]">
                                 <div>
                                   <p className="font-bold text-white uppercase truncate max-w-[10rem]">{item.name}</p>
                                   <p className="text-[7px] text-zinc-500">{item.code}</p>
                                 </div>
                                 <div className="flex items-center gap-3">
                                   <div className="text-right">
                                     <p className="text-zinc-400">Phys: <span className="font-bold text-white">{item.scanned}</span></p>
                                     <p className="text-zinc-500 font-bold">Sys: {item.expected}</p>
                                   </div>
                                   <span className={cn(
                                     "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                     item.status === 'Match' ? "bg-emerald-500/15 text-emerald-400" :
                                     item.status === 'Shortage' ? "bg-rose-500/15 text-rose-400 border border-rose-500/25" :
                                     "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                                   )}>
                                     {isDiscrepant ? `${item.discrepancy > 0 ? '+' : ''}${item.discrepancy}` : 'OK'}
                                   </span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>

                         {/* Summary Metrics */}
                         <div className="grid grid-cols-3 gap-2 p-2 bg-white/5 border border-white/5 rounded-xl text-center text-[8px] font-mono leading-tight">
                           <div>
                             <span className="text-zinc-500 block uppercase">Checked</span>
                             <span className="text-white font-bold text-sm block mt-0.5">{scannedItems.length}</span>
                           </div>
                           <div className="border-l border-white/5">
                             <span className="text-zinc-500 block uppercase">Matches</span>
                             <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                               {scannedItems.filter(i => i.discrepancy === 0).length}
                             </span>
                           </div>
                           <div className="border-l border-white/5">
                             <span className="text-zinc-500 block uppercase">Warnings</span>
                             <span className={cn("font-bold text-sm block mt-0.5", scannedItems.some(i => i.discrepancy !== 0) ? "text-amber-400" : "text-zinc-500")}>
                               {scannedItems.filter(i => i.discrepancy !== 0).length}
                             </span>
                           </div>
                         </div>

                         {/* Reconciliation options */}
                         <div className="flex gap-2 pt-1">
                           <button 
                             onClick={() => { setAuditCompleted(false); setAuditStation(null); }}
                             className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all animate-none"
                           >
                             Dismiss
                           </button>
                           {scannedItems.some(i => i.discrepancy !== 0) && (
                             <button 
                               onClick={handleReconcileLedger}
                               className="flex-1 py-1.5 bg-primary hover:bg-primary-hover text-black rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 font-sans font-bold"
                             >
                               <RefreshCw size={10} className="animate-spin-slow" />
                               Reconcile Stock
                             </button>
                           )}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                   
                   <div className="pt-4 border-t border-outline">
                      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                         <Zap size={14} className="text-primary animate-pulse" />
                         <p className="text-[9px] font-black text-on-surface-variant uppercase leading-tight">
                            Command Link: <span className="text-primary">100% Reliable</span>
                         </p>
                      </div>
                   </div>

                   <div id="collection_ready_btn" className="p-8 border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-[2rem] text-center group hover:bg-emerald-500/10 transition-colors">
                       <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="text-emerald-500" size={24} />
                       </div>
                       <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Collection Zone</p>
                       <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter leading-tight">
                          Drop finished orders here to ping the next customer in queue.
                       </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                  <input 
                    placeholder="Search Menu Terminals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                 <button 
                   onClick={() => setShowInventoryModal(true)}
                   className="flex-1 md:flex-none h-14 px-6 border border-outline rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all hover:border-primary"
                 >
                    <FileUp size={18} /> Import CSV
                 </button>
                 <button 
                   onClick={handleAddItem}
                   className="flex-1 md:flex-none h-14 px-8 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                 >
                    <Plus size={18} /> Add Item
                 </button>
               </div>
            </div>

            <div className="bg-surface-container rounded-[2.5rem] border border-outline overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-surface-container-high/50 border-b border-outline">
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Product Terminal</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Pricing (ZAR)</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Stock Level</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Ops</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-outline">
                       {inventory
                        .filter(i => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(item => (
                          <tr 
                            key={item.id} 
                            onClick={() => handleEditItem(item)}
                            className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                          >
                            <td className="px-8 py-6">
                               <div className="flex flex-col">
                                  <span className="font-black text-sm uppercase tracking-tight">{item.name}</span>
                                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">{item.category}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold">{formatCurrency(item.price)}</span>
                                  <button onClick={() => handleUpdatePrice(item.id, item.price + 50)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                     <Edit size={12} />
                                  </button>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
                                     <div className={cn(
                                       "h-full rounded-full transition-all",
                                       item.stock > 10 ? "bg-emerald-500 w-full" :
                                       item.stock > 0 ? "bg-amber-500 w-1/3" : "bg-red-500 w-0"
                                     )} />
                                  </div>
                                  <span className="text-[10px] font-bold text-on-surface-variant">{item.stock} Units</span>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <span className={cn(
                                 "text-[8px] font-black uppercase px-2 py-1 rounded-lg border",
                                 item.status === 'Available' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                 item.status === 'Low Stock' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                 "bg-red-500/10 border-red-500/20 text-red-500"
                               )}>
                                 {item.status}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleToggleStock(item.id, item.is_active)}
                                    className="p-2 bg-white/5 rounded-lg border border-outline hover:border-primary transition-all"
                                  >
                                    {item.status === 'Sold Out' ? <TrendingUp size={14} className="text-emerald-500" /> : <MoreVertical size={14} />}
                                  </button>
                                  <button className="p-2 bg-white/5 rounded-lg border border-outline hover:border-red-500 transition-all">
                                    <Trash2 size={14} className="text-on-surface-variant hover:text-red-500" />
                                  </button>
                               </div>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-surface-container-high/40 p-8 rounded-3xl border border-outline">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6">Activity Audit Log</h3>
                <div className="space-y-4">
                   {[
                     { desc: 'Inventory Reset by Manager', time: '10:45 PM', status: 'Authorized' },
                     { desc: 'New Vendor Onboarded: Sip & Savor', time: '09:30 PM', status: 'Authorized' },
                     { desc: 'Password Reset: Bartender 02', time: '08:15 PM', status: 'Security' },
                     { desc: 'Price Adjustment: Moët Imperial', time: '07:45 PM', status: 'Pricing' },
                   ].map((log, i) => (
                     <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                        <div>
                           <p className="text-sm font-bold text-white uppercase">{log.desc}</p>
                           <p className="text-[8px] font-black text-on-surface-variant uppercase mt-1">{log.time} • {log.status}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container border border-outline p-8 rounded-[2.5rem] gap-4">
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tight">Vendor Mesh</h3>
                   <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Unified supplier integration hub</p>
                </div>
                <button 
                  onClick={() => setShowVendorForm(true)}
                  className="h-14 px-8 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center gap-3 active:scale-95 transition-all"
                >
                   <Plus size={18} /> Connect Provider
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map(v => (
                  <div key={v.id} className="bg-surface-container p-8 rounded-[2rem] border border-outline hover:border-primary/50 transition-all group">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary border border-white/5">
                           <LayoutDashboard size={20} />
                        </div>
                        <div className={cn(
                          "text-[8px] font-black uppercase px-2 py-1 rounded-lg",
                          v.status === 'Approved' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                           {v.status}
                        </div>
                     </div>
                     <p className="text-[9px] font-black tracking-[0.2em] text-primary uppercase mb-1">{v.category}</p>
                     <h4 className="text-xl font-black uppercase mb-1">{v.name}</h4>
                     <p className="text-xs font-bold text-on-surface-variant truncate mb-6">{v.contact}</p>
                     
                     <div className="pt-6 border-t border-outline flex gap-2">
                        <button className="flex-1 h-10 bg-white/5 border border-outline rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-primary transition-all">Portal</button>
                        <button className="h-10 w-10 border border-outline rounded-xl flex items-center justify-center text-on-surface-variant hover:text-red-500"><Trash2 size={14} /></button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Activation Pipeline</h3>
                <button 
                  onClick={() => setShowEventForm(true)}
                  className="h-10 px-6 bg-primary text-black rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
                >
                   <Plus size={14} /> New Event
                </button>
             </div>

             <div className="space-y-4">
                {events.map(event => (
                  <div key={event.id} className="bg-surface-container-high/40 p-8 rounded-[2.5rem] border border-outline flex flex-col md:flex-row items-center gap-8 group hover:bg-surface-container-high/60 transition-all">
                     <div className="w-full md:w-48 h-32 bg-background rounded-2xl overflow-hidden border border-outline group-hover:border-primary/30 transition-all">
                        <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                           <BarChart3 className="text-primary/20" size={40} />
                        </div>
                     </div>
                     
                     <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                           <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                              event.status === 'Live' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-on-surface-variant/10 border-on-surface-variant/20 text-on-surface-variant"
                           )}>
                              {event.status}
                           </span>
                           <h4 className="text-2xl font-black uppercase tracking-tight">{event.title}</h4>
                        </div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{event.date} • {event.ticketsSold}/{event.ticketsTotal} Capacity</p>
                        
                        <div className="w-full max-w-xs bg-background h-1.5 rounded-full mt-4 overflow-hidden mx-auto md:mx-0">
                           <div 
                              className="h-full bg-primary transition-all duration-1000" 
                              style={{ width: `${(event.ticketsSold / event.ticketsTotal) * 100}%` }} 
                           />
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <button className="h-12 px-8 bg-white/5 border border-outline rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-primary transition-all">Analytics</button>
                        <button className="h-12 w-12 bg-white/5 border border-outline rounded-2xl flex items-center justify-center hover:bg-red-500/10 hover:border-red-500 transition-all">
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'admin' && role === 'ADMIN' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container border border-outline p-8 rounded-[2.5rem] gap-4">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Security Clearing</h3>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Pending venue & staff onboarding requests</p>
              </div>
              <div className="bg-primary/10 border border-primary/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                <SearchCode size={20} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{pendingRequests.length} Pending Actions</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.length === 0 ? (
                <div className="bg-surface-container border border-outline border-dashed rounded-[2rem] p-20 flex flex-col items-center justify-center text-center opacity-50">
                  <ShieldCheck size={64} className="text-on-surface-variant mb-6" />
                  <p className="text-lg font-black uppercase tracking-tight">System Secure</p>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">No pending verifications required</p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-surface-container border border-outline rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 group hover:border-primary/30 transition-all"
                  >
                    <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center border border-outline shadow-inner">
                      {req.type === 'VENUE' ? <LayoutDashboard className="text-primary" /> : <User className="text-secondary" />}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20">{req.type}</span>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">#{req.id.substring(0, 8)}</span>
                      </div>
                      <h4 className="text-xl font-black uppercase tracking-tight">{req.name}</h4>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{req.email} • Assigned: {new Date(req.timestamp).toLocaleDateString()}</p>
                      
                      <div className="mt-4 flex gap-2 flex-wrap">
                        {req.details && Object.entries(req.details).map(([key, val]) => (
                          <div key={key} className="bg-background/50 border border-outline px-3 py-1 rounded-full flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase text-on-surface-variant">{key}:</span>
                            <span className="text-[8px] font-bold text-on-surface uppercase">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVerifyRequest(req.id, 'Approved')}
                        className="h-14 px-8 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <ThumbsUp size={16} /> Approve
                      </button>
                      <button 
                        onClick={() => handleVerifyRequest(req.id, 'Rejected')}
                        className="h-14 px-8 bg-surface-container-high border border-outline text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500 active:scale-95 transition-all"
                      >
                        <ThumbsDown size={16} /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
             <div className="bg-surface-container rounded-[3rem] border border-outline p-10 flex flex-col md:flex-row items-center gap-10">
                <div className="relative">
                   <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-2xl shadow-primary/30">
                      <img 
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80" 
                        alt="Bartender Profile"
                        className="w-full h-full object-cover"
                      />
                   </div>
                   <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full border-4 border-surface-container flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                   </div>
                </div>
                <div className="text-center md:text-left flex-1">
                   <p className="text-xs font-black text-primary uppercase tracking-[0.4em] mb-2">Authenticated Bartender</p>
                   <h3 className="text-4xl font-black uppercase tracking-tight mb-2">Marcus R.</h3>
                   <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Clock size={12} /> Shift: 18:00 - 02:00</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Terminal A Authorized</span>
                   </div>
                </div>
                <div className="flex gap-4">
                    <div className="bg-surface-container p-6 rounded-3xl border border-outline text-center px-10">
                       <p className="text-[10px] font-black text-on-surface-variant uppercase mb-1">Shift Rating</p>
                       <p className="text-2xl font-black text-primary">4.9 ★</p>
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Performance Analytics */}
                <div className="bg-surface-container-high/20 p-8 rounded-[40px] border border-outline space-y-6">
                   <h4 className="text-xl font-black uppercase tracking-tight">Shift Performance</h4>
                   <div className="space-y-4">
                      {[
                        { label: 'Serviced Orders', value: '42', color: 'text-primary' },
                        { label: 'Avg Prep Time', value: '3.8m', color: 'text-emerald-500' },
                        { label: 'Total Tips (Est)', value: 'R1,250', color: 'text-white' },
                        { label: 'Efficiency Score', value: '96%', color: 'text-primary' },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                           <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{item.label}</span>
                           <span className={cn("text-lg font-black", item.color)}>{item.value}</span>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Personal Settings */}
                <div className="bg-surface-container-high/20 p-8 rounded-[40px] border border-outline space-y-6">
                   <h4 className="text-xl font-black uppercase tracking-tight">Access Control</h4>
                   <div className="space-y-4">
                      <button className="w-full h-14 bg-white/5 border border-outline rounded-2xl px-6 flex items-center justify-between group hover:border-primary transition-all">
                         <div className="text-left">
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Terminal PIN</p>
                            <p className="text-sm font-bold text-white uppercase tracking-widest">••••••</p>
                         </div>
                         <Edit size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <button className="w-full h-14 bg-white/5 border border-outline rounded-2xl px-6 flex items-center justify-between group hover:border-primary transition-all">
                         <div className="text-left">
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Notification Sound</p>
                            <p className="text-sm font-bold text-white uppercase tracking-widest">Vibrant Alert</p>
                         </div>
                         <Edit size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                   </div>
                   <div className="pt-4">
                      <button 
                        onClick={onBack}
                        className="w-full h-14 bg-red-500 text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all"
                      >
                        Terminate Session
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Safety Alert (Bottom) */}
      <div className="fixed bottom-24 left-6 right-6">
         <div className="bg-surface-container-high rounded-2xl border border-outline p-4 flex gap-4 items-center shadow-2xl">
            <AlertCircle className="text-primary shrink-0" size={24} />
            <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest leading-relaxed">
               <span className="text-primary">System Integrity: 100%</span> • All transactions encrypted via Wayta Mesh Port 443. Live inventory syncing to consumer layer.
            </p>
         </div>
      </div>

      {showVendorForm && (
        <VendorForm 
          venueId={venue.id} 
          onClose={() => setShowVendorForm(false)} 
        />
      )}

      {showEventForm && (
        <EventForm 
          venueId={venue.id} 
          onClose={() => setShowEventForm(false)} 
        />
      )}

      <InventoryImportModal 
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        venueId={venue.id}
      />

      <InventoryItemModal 
        isOpen={showInventoryItemModal}
        onClose={() => setShowInventoryItemModal(false)}
        venueId={venue.id}
        item={selectedInventoryItem}
      />
    </div>
  );
};
