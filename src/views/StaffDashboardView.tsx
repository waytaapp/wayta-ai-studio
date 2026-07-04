import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRScanner } from '../components/QRScanner.tsx';
import { 
  Users, Calendar, Clock, Bell, Settings, 
  LogOut, ClipboardList, AlertCircle, TrendingUp,
  Zap, ChevronRight, LayoutGrid, Smartphone, Package,
  Scan, MessageSquare, Shield, ChevronLeft, ArrowRight, Check, Coffee, LayoutDashboard,
  ArrowDownWideNarrow, ShoppingBag, Sparkles, X, Camera, RefreshCw,
  QrCode, Search, UserCheck, CheckSquare, Play, Pause, AlertTriangle, Home, ScanLine
} from 'lucide-react';
import { User, Event, Venue, Order, Ticket } from '../types';
import { cn } from '../lib/utils';
import { orderService } from '../services/orderService';
import { useViewport } from '../hooks/useViewport';
import { db, doc, getDoc, updateDoc, collection, query, where, onSnapshot } from '../lib/firebase';
import { guestListService } from '../services/guestListService';

interface StaffDashboardViewProps {
  user: User | null;
  onLogout: () => void;
  venue?: Venue;
  orders?: Order[];
  events?: Event[];
  onBack?: () => void;
  onHome?: () => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({ 
  user, 
  onLogout, 
  venue, 
  orders = [], 
  events = [], 
  onBack, 
  onHome, 
  onUpdateOrderStatus,
  theme,
  onToggleTheme
}) => {
  const isDark = theme === 'dark';
  const { isMobile, isLandscape } = useViewport();
  const [activeTab, setActiveTab ] = useState<'hub' | 'orders' | 'events' | 'entrance' | 'inbox' | 'config'>(
    user?.uid === 'door-staff-quick' ? 'entrance' : 'orders'
  );
  const [filter, setFilter] = useState<'all' | 'Pending' | 'VIP'>('all');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedResult, setScannedResult] = useState<{ id: string, type: 'order' | 'ticket' } | null>(null);

  const [showFloatingNav, setShowFloatingNav] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingNav(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Entrance Scanner States
  const [guestList, setGuestList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState<'All' | 'Invited' | 'Confirmed' | 'Checked-in' | 'No-show'>('All');
  const [entranceScanInput, setEntranceScanInput] = useState('');
  const [entranceScanStatus, setEntranceScanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [entranceScanMessage, setEntranceScanMessage] = useState('');
  const [entranceVerifiedData, setEntranceVerifiedData] = useState<any | null>(null);
  const [entranceScannedType, setEntranceScannedType] = useState<'ticket' | 'order' | 'guest' | null>(null);
  const [entranceIsSubmitting, setEntranceIsSubmitting] = useState(false);
  const [activeEntranceScanner, setActiveEntranceScanner] = useState<boolean>(
    user?.uid === 'door-staff-quick' ? true : false
  );
  const [simulationActiveTab, setSimulationActiveTab] = useState<'guest' | 'ticket' | 'order'>('guest');
  const [liveSimulationLog, setLiveSimulationLog] = useState<string>("WS Channel Standby: Awaiting live orders & handshakes...");

  useEffect(() => {
    const isTestActive = localStorage.getItem('isTestMode') === 'true';
    if (!isTestActive) return;

    const handleOrder = (e: any) => {
      const data = e.detail;
      setLiveSimulationLog(`[WS REAL-TIME] New Order #${data.order_number} submitted by ${data.customer_name} of ${data.items || 'Beverages'}`);
    };

    const handleStatus = (e: any) => {
      const data = e.detail;
      setLiveSimulationLog(`[WS REAL-TIME] Order #${data.orderId.substring(0, 8)} status set to ${data.status.toUpperCase()}`);
    };

    window.addEventListener('WAYTA_ORDER_SUBMITTED', handleOrder);
    window.addEventListener('WAYTA_STATUS_UPDATED', handleStatus);
    return () => {
      window.removeEventListener('WAYTA_ORDER_SUBMITTED', handleOrder);
      window.removeEventListener('WAYTA_STATUS_UPDATED', handleStatus);
    };
  }, []);

  // Load real-time data for venue entrance desk
  useEffect(() => {
    if (!venue?.id) return;
    
    // Listen to all guest list profiles for this venue
    const qGuests = query(collection(db, 'guest_lists'), where('venueId', '==', venue.id));
    const unsubGuests = onSnapshot(qGuests, (snapshot) => {
      const gs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGuestList(gs);
    }, (err) => {
      console.error('[Entrance Dashboard] Failed load guest lists:', err);
    });

    // Listen to all admission tickets for this venue
    const qTickets = query(collection(db, 'tickets'), where('venue_id', '==', venue.id));
    const unsubTickets = onSnapshot(qTickets, (snapshot) => {
      const tks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTicketsList(tks);
    }, (err) => {
      console.error('[Entrance Dashboard] Failed load tickets:', err);
    });

    return () => {
      unsubGuests();
      unsubTickets();
    };
  }, [venue?.id]);

  const handleScan = (decodedText: string) => {
    if (decodedText.startsWith('TICKET_ID:')) {
      const ticketId = decodedText.split(':')[1];
      setScannedResult({ id: ticketId, type: 'ticket' });
    } else {
      setScannedResult({ id: decodedText, type: 'order' });
    }
  };

  const handleVerifyResult = async () => {
    if (!scannedResult) return;
    
    if (scannedResult.type === 'order') {
       if (onUpdateOrderStatus) {
         onUpdateOrderStatus(scannedResult.id, 'Collected');
         setScannedResult(null);
         setShowScanner(false);
         alert('Order Verified & Collected');
       }
    } else {
       // Ticket processing
       try {
         await orderService.updateTicketStatus(scannedResult.id, 'used', user?.uid);
         setScannedResult(null);
         setShowScanner(false);
         alert('Admission Ticket Verified & Used');
       } catch (err) {
         console.error(err);
         alert('Failed to verify ticket');
       }
    }
  };

  // Dedicated Entrance Processor
  const handleEntranceScan = async (decodedText: string) => {
    if (!decodedText) return;
    setEntranceScanStatus('loading');
    setEntranceScanMessage('Consulting live Firestore ledger...');
    setEntranceVerifiedData(null);
    setEntranceScannedType(null);

    const token = decodedText.trim();

    try {
      // 1. GUEST LIST scan (e.g., GUEST_ID:... or GUEST_LIST_ID:...)
      if (token.startsWith('GUEST_ID:') || token.startsWith('GUEST_LIST_ID:')) {
        const guestId = token.includes('GUEST_ID:') ? token.split('GUEST_ID:')[1] : token.split('GUEST_LIST_ID:')[1];
        const guestRef = doc(db, 'guest_lists', guestId);
        const guestSnap = await getDoc(guestRef);

        if (!guestSnap.exists()) {
          setEntranceScanStatus('error');
          setEntranceScanMessage('Invitation token unrecognized. Record does not exist in guest registration rules.');
          return;
        }

        const guestData = { id: guestSnap.id, ...guestSnap.data() } as any;
        setEntranceVerifiedData(guestData);
        setEntranceScannedType('guest');

        if (guestData.status === 'Checked-in') {
          setEntranceScanStatus('error');
          setEntranceScanMessage(`${guestData.name || 'Patron'} has ALREADY checked in. Entry denied to prevent double-admission.`);
        } else {
          setEntranceScanStatus('success');
          setEntranceScanMessage('Authorized invite confirmed! Ready to check-in.');
        }
        return;
      }

      // 2. TICKET scan (e.g., TICKET_ID:...)
      if (token.startsWith('TICKET_ID:')) {
        const ticketId = token.split('TICKET_ID:')[1];
        const ticketRef = doc(db, 'tickets', ticketId);
        const ticketSnap = await getDoc(ticketRef);

        if (!ticketSnap.exists()) {
          setEntranceScanStatus('error');
          setEntranceScanMessage('Invalid ticket signature. No registered transaction found inside system ledger.');
          return;
        }

        const ticketData = { id: ticketSnap.id, ...ticketSnap.data() } as any;
        setEntranceVerifiedData(ticketData);
        setEntranceScannedType('ticket');

        if (ticketData.status === 'used') {
          setEntranceScanStatus('error');
          setEntranceScanMessage(`Ticket has been marked USED on ${ticketData.scanned_at ? new Date(ticketData.scanned_at).toLocaleString() : 'earlier shift'}. Entry is locked.`);
        } else if (ticketData.status === 'expired') {
          setEntranceScanStatus('error');
          setEntranceScanMessage('Ticket expired or venue date invalid. Verification failed.');
        } else {
          setEntranceScanStatus('success');
          setEntranceScanMessage('Secure digital ticket active! Clear to issue admission.');
        }
        return;
      }

      // 3. Fallback Order & Direct matches
      // Let's check if the token is an order ID
      const orderRef = doc(db, 'orders', token);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = { id: orderSnap.id, ...orderSnap.data() } as any;
        setEntranceVerifiedData(orderData);
        setEntranceScannedType('order');

        if (orderData.status === 'Collected') {
          setEntranceScanStatus('error');
          setEntranceScanMessage('This purchase order was already COLLECTED. Distribution is locked.');
        } else {
          setEntranceScanStatus('success');
          setEntranceScanMessage(`Order picked up. Confirm to complete handing over items.`);
        }
        return;
      }

      // Try as guest direct ID matching
      const guestDirectRef = doc(db, 'guest_lists', token);
      const guestDirectSnap = await getDoc(guestDirectRef);
      if (guestDirectSnap.exists()) {
        const guestData = { id: guestDirectSnap.id, ...guestDirectSnap.data() } as any;
        setEntranceVerifiedData(guestData);
        setEntranceScannedType('guest');

        if (guestData.status === 'Checked-in') {
          setEntranceScanStatus('error');
          setEntranceScanMessage(`${guestData.name || 'Patron'} has ALREADY checked in. Entry denied.`);
        } else {
          setEntranceScanStatus('success');
          setEntranceScanMessage('Authorized guest invite verified. Ready to register entrance.');
        }
        return;
      }

      // Try as ticket direct ID matching
      const ticketDirectRef = doc(db, 'tickets', token);
      const ticketDirectSnap = await getDoc(ticketDirectRef);
      if (ticketDirectSnap.exists()) {
        const ticketData = { id: ticketDirectSnap.id, ...ticketDirectSnap.data() } as any;
        setEntranceVerifiedData(ticketData);
        setEntranceScannedType('ticket');

        if (ticketData.status === 'used') {
          setEntranceScanStatus('error');
          setEntranceScanMessage('Secure digital ticket has already been used.');
        } else if (ticketData.status === 'expired') {
          setEntranceScanStatus('error');
          setEntranceScanMessage('Ticket expired or invalid.');
        } else {
          setEntranceScanStatus('success');
          setEntranceScanMessage('Ticket active and validated successfully.');
        }
        return;
      }

      // 4. If all fail, display unknown
      setEntranceScanStatus('error');
      setEntranceScanMessage('Unknown barcode or token format. Try scanning with focused target.');

    } catch (err: any) {
      console.error(err);
      setEntranceScanStatus('error');
      setEntranceScanMessage(err.message || 'Ledger interrogation failed. Check network link and try again.');
    }
  };

  const commitEntranceVerification = async () => {
    if (!entranceVerifiedData || !entranceScannedType) return;
    setEntranceIsSubmitting(true);

    try {
      if (entranceScannedType === 'guest') {
        await guestListService.updateGuest(entranceVerifiedData.id, { status: 'Checked-in' });
        setEntranceScanStatus('success');
        setEntranceScanMessage(`Check-in verified successfully. Authorized entry stamped for ${entranceVerifiedData.name}.`);
        setEntranceVerifiedData((prev: any) => prev ? { ...prev, status: 'Checked-in' } : null);
      } else if (entranceScannedType === 'ticket') {
        await orderService.updateTicketStatus(entranceVerifiedData.id, 'used', user?.uid || 'staff');
        setEntranceScanStatus('success');
        setEntranceScanMessage('Digital ticket stamp validated. Admission cleared.');
        setEntranceVerifiedData((prev: any) => prev ? { ...prev, status: 'used', scanned_at: new Date().toISOString() } : null);
      } else if (entranceScannedType === 'order') {
        if (onUpdateOrderStatus) {
          onUpdateOrderStatus(entranceVerifiedData.id, 'Collected');
        } else {
          await updateDoc(doc(db, 'orders', entranceVerifiedData.id), { status: 'Collected' });
        }
        setEntranceScanStatus('success');
        setEntranceScanMessage('Purchase collection executed. Handover registered inside logistics database.');
        setEntranceVerifiedData((prev: any) => prev ? { ...prev, status: 'Collected' } : null);
      }

      // Deactivate scanner automatically upon successful commits
      setActiveEntranceScanner(false);
    } catch (err: any) {
      console.error(err);
      setEntranceScanMessage(err.message || 'Operation forbidden. Database rejected write transaction.');
    } finally {
      setEntranceIsSubmitting(false);
    }
  };

  const handleManualEntranceCheckin = async (guestId: string) => {
    try {
      await guestListService.updateGuest(guestId, { status: 'Checked-in' });
    } catch (err) {
      console.error("Manual check-in failed:", err);
    }
  };

  const [isScanning, setIsScanning] = useState(false);

  const getTimeAgo = (timestamp: string | number | Date) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes}m ago`;
  };

  const isVIP = (order: Order) => {
    if (!order || !order.items || !Array.isArray(order.items)) return false;
    return order.items.some(i => i?.item?.category === 'Bottle Service');
  };

  const renderHub = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {localStorage.getItem('isTestMode') === 'true' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl flex items-center justify-between text-xs font-bold text-emerald-400 gap-3">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-400 animate-pulse" />
            <div>
              <span className="text-[8px] font-black uppercase tracking-wider block opacity-60 font-sans">WS TEST MODE BARTENDER HUB</span>
              <span className="font-sans leading-tight block mt-0.5">{liveSimulationLog}</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        </div>
      )}
      <section className="bg-primary/5 border border-primary/20 p-8 rounded-[3rem] relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-1">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Shift Integrity</h3>
               <h2 className={cn(
                 "text-4xl font-black uppercase tracking-tighter italic",
                 isDark ? "text-white" : "text-on-background"
               )}>Active Session</h2>
               <div className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mt-2 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                 {events.length > 0 
                   ? events.map(e => e.title).join(' • ') 
                   : (venue?.name || 'Manning Bar Station')} • {orders.length} Active Orders
               </div>
            </div>
         </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-surface-container border border-white/5 p-8 rounded-[2.5rem] flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
               <TrendingUp size={32} />
            </div>
            <div>
               <p className="text-2xl font-black text-white italic">142</p>
               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Total Serviced</p>
            </div>
         </div>
         <div className="bg-surface-container border border-white/5 p-8 rounded-[2.5rem] flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
               <Clock size={32} />
            </div>
            <div>
               <p className="text-2xl font-black text-white italic">3m 12s</p>
               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Avg Pulse</p>
            </div>
         </div>
      </div>
    </div>
  );

  const renderOrders = () => {
    const filteredOrders = orders.filter(o => {
      const status = (o.status || 'Pending').charAt(0).toUpperCase() + (o.status || 'Pending').slice(1).toLowerCase();
      if (status === 'Collected' || status === 'Completed') return false;
      if (filter === 'Pending') return status === 'Pending';
      if (filter === 'VIP') return isVIP(o);
      return true;
    });

    const columns = [
      { id: 'Pending', label: 'New Orders', color: 'text-red-500', dot: 'bg-red-500 animate-ping' },
      { id: 'Preparing', label: 'In Progress', color: 'text-orange-500', dot: 'bg-orange-500 animate-pulse' },
      { id: 'Ready', label: 'Collection Ready', color: 'text-emerald-500', dot: 'bg-emerald-500' },
    ] as const;

    const handleDragStart = (e: React.DragEvent, orderId: string) => {
      e.dataTransfer.setData('orderId', orderId);
    };

    const handleDrop = (e: React.DragEvent, status: Order['status']) => {
      e.preventDefault();
      const orderId = e.dataTransfer.getData('orderId');
      if (orderId && onUpdateOrderStatus) {
        onUpdateOrderStatus(orderId, status);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };

    return (
      <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
        {localStorage.getItem('isTestMode') === 'true' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl flex items-center justify-between text-xs font-bold text-emerald-400 gap-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-400 animate-pulse" />
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider block opacity-60 font-sans">WS TEST MODE BARTENDER QUEUE</span>
                <span className="font-sans leading-tight block mt-0.5">{liveSimulationLog}</span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
        )}
        {/* Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 p-1.5 bg-black/50 border border-white/5 rounded-2xl w-fit">
            {(['all', 'Pending', 'VIP'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "px-6 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center",
                  filter === tab 
                    ? "bg-surface-container-highest text-on-surface-variant border border-outline shadow-lg" 
                    : "text-on-surface-variant/40 hover:text-on-surface-variant"
                )}
              >
                {tab === 'all' ? 'All' : tab === 'VIP' ? 'VIP' : tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
             <div className="w-11 h-11 rounded-xl bg-surface-container border border-outline flex items-center justify-center text-on-surface-variant/40">
                <ClipboardList size={18} />
             </div>
             <button className="h-11 px-4 bg-surface-container border border-outline rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
                <ArrowDownWideNarrow size={14} /> Newest First
             </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar min-h-[60vh]">
          {columns.map(col => (
            <div 
              key={col.id} 
              className="flex flex-col gap-4 min-w-[320px] flex-1"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id as Order['status'])}
            >
              <div className="flex items-center justify-between px-2 py-1 bg-black/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", col.dot)} />
                  <h3 className={cn("text-xs font-black uppercase tracking-[0.2em]", col.color)}>{col.label}</h3>
                  <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", 
                    col.id === 'Pending' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                    col.id === 'Preparing' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  )}>
                    {filteredOrders.filter(o => ((o.status || 'Pending').charAt(0).toUpperCase() + (o.status || 'Pending').slice(1).toLowerCase()) === col.id).length}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.filter(order => {
                    const status = (order.status || 'Pending').charAt(0).toUpperCase() + (order.status || 'Pending').slice(1).toLowerCase();
                    return status === col.id;
                  }).map((order, idx) => {
                    const vip = isVIP(order);
                    return (
                      <motion.div
                        key={`stf-ord-${order.id}-${idx}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e as React.DragEvent, order.id)}
                        className={cn(
                          "bg-surface-container/80 border border-white/5 rounded-2xl p-5 space-y-4 group transition-all relative overflow-hidden",
                          vip ? "border-l-4 border-l-orange-500 shadow-[inset_4px_0_0_rgba(249,115,22,0.1)]" : ""
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-white italic">#{order.order_number || order.id.slice(-4).toUpperCase()}</span>
                              {order.customer_name && (
                                <span className="text-sm font-black uppercase text-primary/90 truncate max-w-[150px] tracking-widest">{order.customer_name.split(' ')[0]}</span>
                              )}
                              {vip && (
                                <span className="text-[8px] font-black uppercase bg-orange-500/20 text-orange-500 border border-orange-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Zap size={8} fill="currentColor" /> VIP
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-on-surface-variant/60">
                               <Smartphone size={10} />
                               <span className="text-[10px] font-bold uppercase tracking-tight">Table {order.id[0]}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{getTimeAgo(order.timestamp)}</span>
                          </div>
                        </div>

                        <div className="space-y-2 py-3 border-y border-white/5">
                          {order.items && Array.isArray(order.items) && order.items.map((item, idx) => (
                            <div key={`order-item-${order.id}-${(item as any).id || (item as any).name || idx}`} className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                              <span className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-tight">
                                <span className={cn("font-black mr-2", col.id === 'Pending' ? "text-red-500" : col.id === 'Preparing' ? "text-orange-500" : "text-emerald-500")}>
                                  {item.quantity}x
                                </span>
                                {item?.item?.name ?? 'Unknown Item'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          {col.id === 'Pending' && (
                            <motion.button
                              onClick={() => onUpdateOrderStatus?.(order.id, 'Preparing')}
                              className="w-full h-11 bg-surface-container-highest border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-all"
                            >
                              START <ArrowRight size={14} />
                            </motion.button>
                          )}
                          {col.id === 'Preparing' && (
                            <>
                              <motion.button
                                onClick={() => onUpdateOrderStatus?.(order.id, 'Pending')}
                                className="flex-1 h-11 bg-black/50 border border-white/5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:text-on-surface transition-all"
                              >
                                <ChevronLeft size={14} /> NEW
                              </motion.button>
                              <motion.button
                                onClick={() => onUpdateOrderStatus?.(order.id, 'Ready')}
                                className="flex-1 h-11 bg-surface-container-highest border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-all"
                              >
                                READY <ArrowRight size={14} />
                              </motion.button>
                            </>
                          )}
                          {col.id === 'Ready' && (
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}
                                onClick={() => onUpdateOrderStatus?.(order.id, 'Preparing')}
                                className="flex-1 h-11 bg-black/50 border border-white/5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:text-on-surface transition-all"
                              >
                                <ChevronLeft size={14} /> IN PROGRESS
                              </motion.button>
                              <motion.button
                                whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}
                                onClick={() => setShowScanner(true)}
                                className="flex-1 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all"
                              >
                                <Scan size={14} /> SCAN TO COLLECT
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {filteredOrders.filter(o => o.status === col.id).length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-20">
                    <Coffee size={32} className="mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Queue Clear</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEntrance = () => {
    const totalGuestsCount = guestList.length;
    const checkedGuestsCount = guestList.filter(g => g.status === 'Checked-in').length;
    const totalTicketsCount = ticketsList.length;
    const usedTicketsCount = ticketsList.filter(t => t.status === 'used').length;

    // Filter guest list
    const filteredGuests = guestList.filter(g => {
      const gName = g.name || '';
      const gEmail = g.email || '';
      const matchesSearch = 
        gName.toLowerCase().includes(guestSearch.toLowerCase()) || 
        gEmail.toLowerCase().includes(guestSearch.toLowerCase());
      
      if (guestFilter === 'All') return matchesSearch;
      return g.status === guestFilter && matchesSearch;
    });

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Entrance Gate Header */}
        <div className="bg-surface-container border border-white/5 p-8 rounded-[3rem] relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">Gate Admission Terminal</h2>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-2">
                Venue Entrance Verification Workspace
              </p>
            </div>
            
            {/* Live Analytics counter */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              {/* Guest invitations statistics */}
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl min-w-[150px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-wider">Guest RSVP</span>
                  <span className="text-xs font-black text-primary">{checkedGuestsCount}/{totalGuestsCount}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${totalGuestsCount > 0 ? (checkedGuestsCount / totalGuestsCount) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-[8px] font-bold text-on-surface-variant/40 mt-1 uppercase">Checked-in Attendee ratio</div>
              </div>

              {/* Tickets statistics */}
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl min-w-[150px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-wider">Tickets Sold</span>
                  <span className="text-xs font-black text-emerald-400">{usedTicketsCount}/{totalTicketsCount}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-500" 
                    style={{ width: `${totalTicketsCount > 0 ? (usedTicketsCount / totalTicketsCount) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-[8px] font-bold text-on-surface-variant/40 mt-1 uppercase">Scanned Ticket ratio</div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Verification Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: SCANNING DESK WORKSTATION */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container border border-white/5 p-6 rounded-[2.5rem] space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Camera size={16} className="text-primary" />
                  Capture Feed
                </h3>
                <div className="flex items-center gap-2 bg-black/60 p-1 rounded-xl border border-white/5">
                  <button 
                    onClick={() => setActiveEntranceScanner(false)}
                    className={cn(
                      "text-[9px] font-black uppercase h-11 px-4 rounded-lg transition-all flex items-center justify-center",
                      !activeEntranceScanner ? "bg-primary text-black" : "text-on-surface-variant hover:text-white"
                    )}
                  >
                    Simulate
                  </button>
                  <button 
                    onClick={() => setActiveEntranceScanner(true)}
                    className={cn(
                      "text-[9px] font-black uppercase h-11 px-4 rounded-lg transition-all flex items-center justify-center",
                      activeEntranceScanner ? "bg-primary text-black" : "text-on-surface-variant hover:text-white"
                    )}
                  >
                    Webcam
                  </button>
                </div>
              </div>

              {/* Camera view toggles */}
              {activeEntranceScanner ? (
                <div className="bg-black border border-white/5 rounded-2xl overflow-hidden relative aspect-video flex flex-col justify-between p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
                  <div className="relative z-10 flex justify-between items-center">
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      Live Feed Active
                    </span>
                    <button 
                      onClick={() => setActiveEntranceScanner(false)}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="h-full py-4 flex items-center justify-center">
                    <QRScanner onScan={(text) => handleEntranceScan(text)} onClose={() => setActiveEntranceScanner(false)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Digital simulator workspace */}
                  <div className="bg-black/30 border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-on-surface-variant/80 tracking-widest">
                        Sandbox Simulator Console
                      </span>
                      <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Reactive Preview
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/50 leading-relaxed uppercase">
                      Select any registered list entities below to immediately simulate a scan barcode entry on this controller.
                    </p>

                    {/* Simulation Subtabs */}
                    <div className="grid grid-cols-3 gap-2 bg-black/60 p-1 rounded-xl border border-white/5">
                      {(['guest', 'ticket', 'order'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSimulationActiveTab(tab)}
                          className={cn(
                            "text-[8px] font-black uppercase h-11 flex items-center justify-center rounded-lg transition-all",
                            simulationActiveTab === tab ? "bg-white/10 text-white border border-white/10" : "text-on-surface-variant hover:text-white"
                          )}
                        >
                          {tab}s
                        </button>
                      ))}
                    </div>

                    {/* Simulation options */}
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {simulationActiveTab === 'guest' && (
                        guestList.length > 0 ? (
                          guestList.slice(0, 4).map((g, idx) => (
                            <button
                              key={`sim-guest-${g.id}-${idx}`}
                              onClick={() => handleEntranceScan(`GUEST_ID:${g.id}`)}
                              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl transition-all flex items-center justify-between group min-h-[44px]"
                            >
                              <div className="truncate pr-2">
                                <p className="text-[11px] font-black text-white truncate-1-line uppercase whitespace-nowrap">{g.name}</p>
                                <p className="text-[8px] font-medium text-on-surface-variant/40 mt-0.5 tracking-wider uppercase">
                                  {g.isVip ? 'VIP Invite' : 'Standard Invite'} • {g.status}
                                </p>
                              </div>
                              <span className="text-[8px] bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-all px-2 py-1 rounded-md font-black uppercase tracking-wider shrink-0">
                                Simulate
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="text-[9px] text-center text-on-surface-variant/30 py-6 uppercase">No guests in the ledger</p>
                        )
                      )}

                      {simulationActiveTab === 'ticket' && (
                        ticketsList.length > 0 ? (
                          ticketsList.slice(0, 4).map((t, idx) => (
                            <button
                              key={`sim-ticket-${t.id}-${idx}`}
                              onClick={() => handleEntranceScan(`TICKET_ID:${t.id}`)}
                              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl transition-all flex items-center justify-between group min-h-[44px]"
                            >
                              <div className="truncate pr-2">
                                <p className="text-[11px] font-black text-white truncate uppercase whitespace-nowrap">{t.customer_name || 'Anonymous User'}</p>
                                <p className="text-[8px] font-medium text-on-surface-variant/40 mt-0.5 tracking-wider uppercase">
                                  {t.tier_name} • {t.status}
                                </p>
                              </div>
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-400 group-hover:text-black transition-all px-2 py-1 rounded-md font-black uppercase tracking-wider shrink-0">
                                Simulate
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-[9px] text-on-surface-variant/30 uppercase">No active venue tickets found</p>
                            <p className="text-[8px] text-on-surface-variant/20 uppercase mt-1">Please buy a ticket on client interface first</p>
                          </div>
                        )
                      )}

                      {simulationActiveTab === 'order' && (
                        orders && orders.length > 0 ? (
                          orders.slice(0, 4).map((o, idx) => (
                            <button
                              key={`sim-order-${o.id}-${idx}`}
                              onClick={() => handleEntranceScan(o.id)}
                              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl transition-all flex items-center justify-between group min-h-[44px]"
                            >
                              <div className="truncate pr-2">
                                <p className="text-[11px] font-black text-white truncate uppercase">Order #{o.order_number || o.id.slice(-4)}</p>
                                <p className="text-[8px] font-medium text-on-surface-variant/40 mt-0.5 tracking-wider uppercase">
                                  Value: R{o.total_amount} • {o.status}
                                </p>
                              </div>
                              <span className="text-[8px] bg-blue-500/10 text-blue-400 group-hover:bg-blue-400 group-hover:text-black transition-all px-2 py-1 rounded-md font-black uppercase tracking-wider shrink-0">
                                Simulate
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="text-[9px] text-center text-on-surface-variant/30 py-6 uppercase">No active orders</p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Input Workspace */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                <label className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest block">
                  Manual Code Entry / Override
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCode size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
                    <input 
                      type="text" 
                      value={entranceScanInput}
                      onChange={(e) => setEntranceScanInput(e.target.value)}
                      placeholder="Paste ID, TICKET_ID:, GUEST_ID:"
                      className="w-full h-11 bg-black/60 border border-white/5 hover:border-white/10 focus:border-primary rounded-xl pl-11 pr-4 text-xs font-mono text-white placeholder-on-surface-variant/30 focus:outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (entranceScanInput) {
                        handleEntranceScan(entranceScanInput);
                        setEntranceScanInput('');
                      }
                    }}
                    className="px-4 h-11 bg-primary text-black hover:bg-primary/80 transition-all font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: LEDGER ENQUIRY & VERIFICATION DETAILED RESPONSE */}
          <div className="lg:col-span-7">
            <div className="bg-surface-container border border-white/5 rounded-[2.5rem] p-8 h-full flex flex-col justify-between">
              
              <AnimatePresence mode="wait">
                {entranceScanStatus === 'idle' && (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-6"
                  >
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-on-surface-variant/30 relative">
                      <div className="absolute inset-0 border border-dashed border-primary/20 rounded-full animate-spin [animation-duration:15s]" />
                      <Scan size={36} className="text-on-surface-variant/40 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-white tracking-widest mt-2">Awaiting Code Input</h4>
                      <p className="text-[10px] text-on-surface-variant/40 max-w-xs mx-auto mt-2 tracking-wide leading-relaxed uppercase">
                        Awaiting secure gate tickets, orders, or guest RSVPs. Use simulated triggers or barcode scanner device.
                      </p>
                    </div>
                  </motion.div>
                )}

                {entranceScanStatus === 'loading' && (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4"
                  >
                    <RefreshCw size={40} className="text-primary animate-spin" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">{entranceScanMessage}</p>
                      <p className="text-[8px] text-on-surface-variant/30 uppercase tracking-widest mt-1">Interrogating secure cloud ledger integrity</p>
                    </div>
                  </motion.div>
                )}

                {entranceScanStatus === 'error' && (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 flex flex-col justify-between py-2 space-y-6"
                  >
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400">
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-red-500/60 uppercase tracking-widest">Verification Alarm</p>
                          <p className="text-xs font-black text-white uppercase tracking-wider">Access Blocked / Failed</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-red-200/80 uppercase tracking-wide leading-relaxed font-mono">
                        {entranceScanMessage}
                      </p>
                    </div>

                    {/* Show scanned data summary if exists */}
                    {entranceVerifiedData && (
                      <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-3 font-mono text-[10.5px]">
                        <p className="text-on-surface-variant/40 border-b border-white/5 pb-2 uppercase text-[9px] tracking-widest">Record Profile Trace</p>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-on-surface-variant/50 uppercase">Type:</span>
                          <span className="col-span-2 text-white font-bold uppercase">{entranceScannedType}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-on-surface-variant/50 uppercase">Name:</span>
                          <span className="col-span-2 text-white font-bold uppercase">
                            {entranceVerifiedData.name || entranceVerifiedData.customer_name || 'N/A'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-on-surface-variant/50 uppercase">Status:</span>
                          <span className="col-span-2 text-red-400 font-bold uppercase">{entranceVerifiedData.status}</span>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => setEntranceScanStatus('idle')}
                      className="w-full h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black text-white uppercase tracking-widest rounded-2xl cursor-pointer"
                    >
                      Dismiss Alarm & Reset Scanner
                    </button>
                  </motion.div>
                )}

                {entranceScanStatus === 'success' && entranceVerifiedData && (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 flex flex-col justify-between py-2 space-y-6"
                  >
                    <div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                            <CheckSquare size={20} />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">
                              {entranceScannedType === 'guest' ? 'Invitee Verified' : entranceScannedType === 'ticket' ? 'Admission Ticket Verified' : 'Order Document Verified'}
                            </p>
                            <p className="text-xs font-black text-white uppercase tracking-wider">Authentication Approved</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-emerald-200/80 mt-3 font-mono uppercase tracking-wide">
                          {entranceScanMessage}
                        </p>
                      </div>

                      {/* Display detail metrics based on data type */}
                      <div className="bg-black/30 border border-white/5 p-6 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest">
                            Database Metadata Profile
                          </span>
                          <span className={cn(
                            "text-[8px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono",
                            entranceVerifiedData.status === 'Checked-in' || entranceVerifiedData.status === 'used' || entranceVerifiedData.status === 'Collected'
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            Status: {entranceVerifiedData.status}
                          </span>
                        </div>

                        {/* Guest List fields */}
                        {entranceScannedType === 'guest' && (
                          <div className="space-y-2.5 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase">Attendee Name</span>
                              <span className="text-white font-bold uppercase">{entranceVerifiedData.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase">Email</span>
                              <span className="text-white font-medium">{entranceVerifiedData.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase">Pass Class</span>
                              <span className={cn("font-bold uppercase", entranceVerifiedData.isVip ? "text-primary text-[11px]" : "text-white")}>
                                {entranceVerifiedData.isVip ? '✦ VIP PASS' : 'STANDARD invite'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase font-mono font-bold">DB Record ID</span>
                              <span className="text-on-surface-variant/40 text-[10px]">{entranceVerifiedData.id.slice(0, 10)}...</span>
                            </div>
                          </div>
                        )}

                        {/* Ticket fields */}
                        {entranceScannedType === 'ticket' && (
                          <div className="space-y-2.5 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase">Holder</span>
                              <span className="text-white font-bold uppercase">{entranceVerifiedData.customer_name || 'Anonymous User'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase font-mono">Event Class</span>
                              <span className="text-white font-bold uppercase">{entranceVerifiedData.event_title}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase">Tier Tier / Cost</span>
                              <span className="text-white font-bold uppercase">{entranceVerifiedData.tier_name} (R{entranceVerifiedData.price})</span>
                            </div>
                            <div className="flex justify-between font-mono">
                              <span className="text-on-surface-variant/50 uppercase">Ticket Sign</span>
                              <span className="text-on-surface-variant/40 text-[10px]">{entranceVerifiedData.id}</span>
                            </div>
                          </div>
                        )}

                        {/* Order fields */}
                        {entranceScannedType === 'order' && (
                          <div className="space-y-2.5 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase">Order Ref.</span>
                              <span className="text-white font-bold uppercase">#{entranceVerifiedData.order_number || entranceVerifiedData.id.slice(-5)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant/50 uppercase">Settlement</span>
                              <span className="text-emerald-400 font-bold border-b border-dashed border-emerald-400/40">PAID - R{entranceVerifiedData.total_amount}</span>
                            </div>
                            <div className="border-t border-white/5 pt-2 mt-2 space-y-1">
                              <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block mb-1">Items To Distribute</span>
                              {(entranceVerifiedData.items || []).map((item: any, idx: number) => (
                                <div key={`${item.id || item._id || 'item'}-${idx}`} className="flex justify-between items-center text-[11px]">
                                  <span className="text-white font-medium uppercase">{item.item?.name || item.product_id} x{item.quantity}</span>
                                  <span className="text-on-surface-variant/60 font-bold font-mono">R{item.item?.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      {/* Only show commit action button if status is checkable/valid */}
                      {(entranceVerifiedData.status === 'Invited' || entranceVerifiedData.status === 'Confirmed' || entranceVerifiedData.status === 'valid' || entranceVerifiedData.status === 'Pending' || entranceVerifiedData.status === 'Paid') ? (
                        <button 
                          onClick={commitEntranceVerification}
                          disabled={entranceIsSubmitting}
                          className="w-full h-14 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 transition-all font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-95"
                        >
                          {entranceIsSubmitting ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <>
                              <UserCheck size={18} />
                              {entranceScannedType === 'guest' ? 'Stamp Entrance Check In' : entranceScannedType === 'ticket' ? 'Authorize Ticket Admission' : 'Register Items Distributed'}
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-[10px] font-mono text-center uppercase tracking-wide leading-relaxed">
                          ⚠️ Record is locked in the past transaction. Double admission blocked.
                        </div>
                      )}
                      
                      <button 
                        onClick={() => {
                          setEntranceScanStatus('idle');
                          setEntranceVerifiedData(null);
                        }}
                        className="w-full text-[9px] font-black uppercase text-on-surface-variant/60 hover:text-white transition-colors h-11 flex items-center justify-center text-center"
                      >
                        Reset Scanner Workspace
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: MANUAL DIRECT ENTRY SEARCH TABLE (DIRECT ACTION CHECK IN) */}
        <div className="bg-surface-container border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
            <div>
              <h3 className="text-xl font-black uppercase text-white tracking-tighter italic font-mono">Live Registration Database</h3>
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Manual lookup table</p>
            </div>

            {/* Filter widgets */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial min-w-[200px]">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input 
                  type="text" 
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full h-10 bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 text-xs text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary transition-all font-mono"
                />
              </div>

              {/* Status categories */}
              <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto text-nowrap">
                {(['All', 'Invited', 'Confirmed', 'Checked-in'] as const).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setGuestFilter(tag)}
                    className={cn(
                      "text-[9px] font-bold uppercase px-4 h-11 rounded-lg transition-all cursor-pointer flex items-center justify-center",
                      guestFilter === tag ? "bg-white/10 text-white" : "text-on-surface-variant/60 hover:text-white"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List display */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest font-mono">
                  <th className="pb-4 font-bold">Attendee Guest</th>
                  <th className="pb-4 font-bold">Contact Profile</th>
                  <th className="pb-4 font-bold">Class Status</th>
                  <th className="pb-4 font-bold">Arrival Date</th>
                  <th className="pb-4 font-bold text-right">Verification Handshake</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredGuests.length > 0 ? (
                  filteredGuests.map((g, idx) => (
                    <tr key={`${g.id || 'guest'}-${idx}`} className="group hover:bg-white/[0.01]/10 transition-colors">
                      <td className="py-4 font-black text-white uppercase flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-primary">
                          {g.name ? g.name.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div>
                          <p className="font-sans font-medium text-white">{g.name}</p>
                          <p className="text-[8px] font-bold text-on-surface-variant/30 tracking-wider">
                            {g.id}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 text-on-surface-variant/80 font-mono text-xs font-medium">
                        <p>{g.email}</p>
                        <p className="text-[10px] text-on-surface-variant/40 mt-0.5">{g.phone || 'No phone recorded'}</p>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-1 rounded-md border",
                          g.isVip 
                            ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]" 
                            : "bg-white/5 text-on-surface-variant/60 border-white/5"
                        )}>
                          {g.isVip ? '✦ VIP PASS' : 'STANDARD invite'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 w-fit",
                          g.status === 'Checked-in' 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10" 
                            : g.status === 'Confirmed' 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/10" 
                            : "bg-white/5 text-on-surface-variant/40 border-white/5"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full-custom rounded-full",
                            g.status === 'Checked-in' ? "bg-emerald-400" : g.status === 'Confirmed' ? "bg-blue-400" : "bg-neutral-600"
                          )} />
                          {g.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {g.status === 'Checked-in' ? (
                          <span className="text-[9px] font-black uppercase text-emerald-500/40 tracking-wider inline-flex items-center gap-1">
                            <CheckSquare size={12} /> Stamped Check-in
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleManualEntranceCheckin(g.id)}
                            className="bg-primary hover:bg-primary/80 text-black h-11 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 hover:shadow-lg hover:shadow-primary/10 active:scale-95"
                          >
                            <UserCheck size={12} /> Verify Entry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center opacity-30 font-bold uppercase tracking-widest text-on-surface-variant">
                      No Records matched search scope
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className={cn("min-h-screen pb-32", isDark ? "bg-black text-white" : "bg-background text-on-background")}>
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
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93]">Staff DOCK</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {(
                [
                  {id: 'hub', icon: Home, label: 'Hub'},
                  {id: 'orders', icon: ShoppingBag, label: 'Orders'},
                  {id: 'events', icon: Calendar, label: 'Events'},
                  {id: 'entrance', icon: ScanLine, label: 'Gates'},
                  {id: 'config', icon: Settings, label: 'Config'}
                ] as const
              ).map(({id, icon: Icon, label}) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 sm:px-4 h-11 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
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
      <header className="p-8 border-b border-outline bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            {onBack && (
              <button 
                onClick={onBack} 
                className="w-12 h-12 rounded-2xl bg-surface-container border border-outline flex items-center justify-center active:scale-95 transition-all text-on-surface hover:text-primary mr-1"
                title="Go back"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
              <Users size={32} />
            </div>
            <div>
              <h1 className={cn("text-2xl font-black uppercase tracking-tighter italic", isDark ? "text-white" : "text-on-background")}>Staff Terminal</h1>
              <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.4em]">{user?.displayName || 'OPERATIVE'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {onToggleTheme && (
               <button 
                 onClick={onToggleTheme}
                 className="w-12 h-12 rounded-2xl bg-surface-container border border-outline flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
               >
                 <Sparkles size={20} />
               </button>
             )}
             <button className="w-12 h-12 rounded-2xl bg-surface-container border border-outline flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface transition-colors relative group">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full group-hover:scale-125 transition-transform" />
             </button>
             <button 
               onClick={onLogout}
               className="w-12 h-12 rounded-2xl bg-surface-container border border-outline flex items-center justify-center text-on-surface-variant/60 hover:text-red-500 transition-colors"
             >
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'hub' && renderHub()}
            {activeTab === 'events' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center bg-surface-container border border-white/5 p-8 rounded-[3rem]">
                    <div>
                       <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">Event Sync</h2>
                       <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-2">Personal Schedule Matrix</p>
                    </div>
                    <div className="bg-primary/10 p-4 rounded-3xl border border-primary/20">
                       <Calendar className="text-primary" size={32} />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.length > 0 ? events.map((e, i) => (
                       <div key={`${e.id || 'e'}-${i}`} className="bg-surface-container border border-white/5 p-8 rounded-[2.5rem] group hover:border-primary transition-all">
                          <h3 className="text-2xl font-black uppercase text-white mb-2">{e.title}</h3>
                          <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-6">{e.date} • {e.venueId || 'Main Stage'}</p>
                          <button className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-black transition-all">Status Check</button>
                       </div>
                    )) : (
                       <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
                          <Calendar size={64} className="mb-4" />
                          <p className="text-sm font-black uppercase tracking-widest">No Events Assigned</p>
                       </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'entrance' && renderEntrance()}
            {activeTab === 'inbox' && (
              <div className="space-y-6 text-center py-20">
                 <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary border border-primary/20 mb-8">
                    <MessageSquare size={48} />
                 </div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">Encrypted Inbox</h2>
                 <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] max-w-xs mx-auto leading-relaxed">
                    All operational communications are end-to-end synchronized. No active pings.
                 </p>
              </div>
            )}
            {activeTab === 'config' && (
              <div className="space-y-8">
                 <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">Terminal Config</h2>
                 <div className="bg-surface-container border border-white/5 rounded-[3rem] p-10 space-y-10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 overflow-hidden">
                             <img src={user?.photoURL || ''} alt="User" className="w-full h-full object-cover grayscale" />
                          </div>
                          <div>
                             <p className="text-xl font-black uppercase text-white leading-none">{user?.displayName}</p>
                             <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Personnel ID: {user?.uid.slice(0, 8)}</p>
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <button className="h-14 px-8 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all">
                          <span className="text-[10px] font-black uppercase tracking-widest">Notification Mesh</span>
                          <div className="w-10 h-6 bg-primary rounded-full relative">
                             <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                          </div>
                       </button>
                       <button onClick={onLogout} className="h-14 px-8 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-500 hover:bg-red-500/20 transition-all">
                          <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>
                          <LogOut size={18} />
                       </button>
                    </div>
                 </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Scanning Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-surface-container border border-outline rounded-[3rem] p-8 w-full max-w-md space-y-6 shadow-2xl relative"
            >
               <button onClick={() => setShowScanner(false)} className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant/40 hover:text-white hover:bg-white/5 transition-all">
                 <X size={24} />
               </button>

               <div className="text-center space-y-2">
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic">Collection terminal</h3>
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Awaiting Secure Token Scan</p>
               </div>

               <div className="bg-black/50 rounded-2xl overflow-hidden border border-white/5 aspect-square relative">
                 {showScanner && !scannedResult && (
                   <QRScanner 
                     onScan={handleScan} 
                     onClose={() => setShowScanner(false)} 
                   />
                 )}
                 {!scannedResult && !showScanner && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                     <Camera size={64} className="text-primary" />
                   </div>
                 )}
               </div>

               {scannedResult && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl space-y-4"
                 >
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black">
                       <Check size={20} />
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase text-emerald-500/60 tracking-widest">
                         {scannedResult.type === 'ticket' ? 'Ticket Verified' : 'Order Token Verified'}
                       </p>
                       <p className="text-sm font-black text-white italic truncate max-w-[200px] uppercase">#{scannedResult.id}</p>
                     </div>
                   </div>
                   <button 
                     onClick={handleVerifyResult}
                     className="w-full h-14 bg-emerald-500 text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     <Sparkles size={16} /> {scannedResult.type === 'ticket' ? 'Process Admission' : 'Complete Collection'}
                   </button>
                   <button onClick={() => setScannedResult(null)} className="w-full h-11 flex items-center justify-center text-[10px] font-black uppercase text-on-surface-variant hover:text-white transition-all">Rescan</button>
                 </motion.div>
               )}

               <div className="flex items-center gap-3 justify-center text-[8px] font-black uppercase text-on-surface-variant/30 tracking-[0.3em]">
                 <Shield size={12} />
                 <span>Military Grade Verification</span>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/95 border border-white/10 p-2 rounded-[2.5rem] backdrop-blur-2xl flex items-center gap-2 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-[95vw] overflow-x-auto text-nowrap md:overflow-visible">
        {(['hub', 'orders', 'events', 'entrance', 'inbox', 'config'] as const).map((tab) => (
            <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={cn(
                 "flex items-center gap-3 px-5 h-12 rounded-[2rem] transition-all cursor-pointer",
                 activeTab === tab ? "bg-primary text-black font-black" : "text-primary/60 hover:text-primary"
               )}
            >
            {tab === 'hub' && <LayoutDashboard size={18} />}
            {tab === 'orders' && <ShoppingBag size={18} />}
            {tab === 'events' && <Calendar size={18} />}
            {tab === 'entrance' && <QrCode size={18} />}
            {tab === 'inbox' && <MessageSquare size={18} />}
            {tab === 'config' && <Settings size={18} />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{tab}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
