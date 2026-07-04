import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  QrCode, 
  Loader2, 
  ShoppingBag,
  MapPin,
  RefreshCw,
  FileText
} from 'lucide-react';
import { rtdb, handleRTDBError, OperationType, ref, onValue } from '../lib/firebase';
import { useOrderSocket } from '../hooks/useOrderSocket';
import { OrderStatusScreen } from '../components/OrderStatusScreen';
import { Order } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { analyticsService } from '../services/analyticsService';
import QRCode from 'react-qr-code';

interface OrderTrackingViewProps {
  order: Order;
  onClose: () => void;
}

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'collected';

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({ order: initialOrder, onClose }) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const { isConnected } = useOrderSocket(order.id);
  
  // Normalize status for UI mapping
  const normalizeStatus = (status: string): OrderStatus => {
    const s = status.toLowerCase();
    if (s === 'processing' || s === 'preparing') return 'preparing';
    if (s === 'completed' || s === 'collected') return 'collected';
    if (s === 'ready') return 'ready';
    return 'pending';
  };

  const currentStatus = normalizeStatus(order.status);
  const [estimatedTime, setEstimatedTime] = useState<number>(order.status === 'Ready' ? 0 : 8);
  const [testModeLog, setTestModeLog] = useState<string>('');

  useEffect(() => {
    const isTestActive = localStorage.getItem('isTestMode') === 'true';
    if (!isTestActive) return;

    const handleStatusSync = (e: any) => {
      const detail = e.detail;
      if (detail.orderId === order.id || detail.orderId === `sim-${order.id}` || order.id === `sim-${detail.orderId}`) {
        setTestModeLog(`WebSocket Instant Update: Order marked ${detail.status.toUpperCase()}! Bypassed DB polling.`);
        setOrder(prev => ({ ...prev, status: detail.status }));
      } else {
        setTestModeLog(`WS Broadcast: Sim event received for ${detail.customer_name} -> '${detail.status.toUpperCase()}'`);
      }
    };

    window.addEventListener('WAYTA_STATUS_UPDATED', handleStatusSync);
    return () => {
      window.removeEventListener('WAYTA_STATUS_UPDATED', handleStatusSync);
    };
  }, [order.id]);

  useEffect(() => {
    if (currentStatus === 'preparing' && estimatedTime > 2) {
      const timer = setInterval(() => setEstimatedTime(prev => Math.max(2, prev - 1)), 60000);
      return () => clearInterval(timer);
    }
  }, [currentStatus]);

  // Browser Notifications Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Status Change Effects (Haptic + Notifications)
  useEffect(() => {
    if (currentStatus === 'ready') {
      // Haptic
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification("Order Ready! 🍻", {
            body: `Order #${order.id.split('-')[1].toUpperCase()} is ready at the bar.`,
            icon: `${import.meta.env.BASE_URL}favicon.png`,
            tag: `order-ready-${order.id}`
          });
        } catch (err) {
          console.warn("Notification failed:", err);
        }
      }
    }
  }, [currentStatus, order.id]);
  
  // Real-time synchronization
  useEffect(() => {
    if (!order.id) return;
    
    const dbRef = ref(rtdb, `orders/${order.id}`);
    const unsub = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as Order;
        setOrder({ id: snapshot.key!, ...data });
      }
    }, (error) => {
        handleRTDBError(error, OperationType.GET, 'orders/' + order.id);
    });
    
    // Direct Socket Signal for Zero-Latency
    const socketHandler = (e: any) => {
      if (e.detail.orderId === order.id) {
        const newStatus = e.detail.status || (e.type === 'WAYTA_ORDER_READY' ? 'ready' : null);
        console.log(`⚡ Zero-Latency Signal Received via Socket: ${newStatus}`);
        
        if (newStatus) {
          setOrder(prev => ({ ...prev, status: newStatus }));
        }
      }
    };
    window.addEventListener('WAYTA_ORDER_READY', socketHandler);
    window.addEventListener('WAYTA_ORDER_STATUS_UPDATE', socketHandler);
    
    return () => {
      unsub();
      window.removeEventListener('WAYTA_ORDER_READY', socketHandler);
      window.removeEventListener('WAYTA_ORDER_STATUS_UPDATE', socketHandler);
    };
  }, [order.id]);

  // Track collection for analytics
  useEffect(() => {
    if (order.status === 'Ready') {
      analyticsService.logCollectionEvent(
        order.id, 
        'Table 42 • VIP Deck',
        order.items.map(i => ({ name: i.item.name, category: i.item.category }))
      );
    }
  }, [order.id, order.status, order.items]);

  const steps = [
    { id: 'pending', label: 'Received', icon: Clock },
    { id: 'preparing', label: 'Preparing', icon: RefreshCw },
    { id: 'ready', label: 'Ready', icon: CheckCircle2 },
    { id: 'collected', label: 'Served', icon: ShoppingBag },
  ];

  const currentStep = steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-500">
      <header className="p-6 flex items-center gap-4">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black uppercase tracking-tight text-on-background font-display">Live Order</h2>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all duration-500",
            isConnected ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
            {isConnected ? "Live Connection" : "Reconnecting..."}
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8">
        {/* Order Status Hero */}
        <div className="text-center py-8">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={currentStatus === 'ready' ? { 
              scale: [1, 1.1, 1],
              opacity: 1,
              boxShadow: [
                "0 0 0px var(--primary)",
                "0 0 40px var(--primary)",
                "0 0 0px var(--primary)"
              ]
            } : { scale: 1, opacity: 1 }}
            transition={currentStatus === 'ready' ? { 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            } : {}}
            className={cn(
              "w-24 h-24 mx-auto rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl relative transition-all duration-500",
              currentStatus === 'ready' ? "bg-primary text-black ring-8 ring-primary/20" : 
              currentStatus === 'preparing' ? "bg-primary/20 text-primary animate-pulse" :
              "bg-surface-container-high text-on-surface-variant"
            )}
          >
            {currentStatus === 'ready' ? <CheckCircle2 size={40} className="drop-shadow-lg" /> : 
             currentStatus === 'preparing' ? <RefreshCw size={40} className="animate-spin-slow" /> :
             currentStatus === 'collected' ? <ShoppingBag size={40} /> :
             <Clock size={40} />}
            
            {(currentStatus === 'preparing' || currentStatus === 'pending') && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-background rounded-full border border-outline flex items-center justify-center">
                <Loader2 size={14} className="animate-spin text-primary" />
              </div>
            )}
          </motion.div>
          
          <h1 className="text-4xl font-black uppercase tracking-tighter text-on-background mb-2">
            {currentStatus === 'ready' ? "Ready to Collect" : 
             currentStatus === 'preparing' ? "In the Works" : 
             currentStatus === 'collected' ? "Order Served" :
             "Order Received"}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
             {currentStatus === 'preparing' && (
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2">
                   <Clock size={12} className="text-primary" />
                   <span className="text-[9px] font-black uppercase text-primary">Est. {estimatedTime} Mins</span>
                </div>
             )}
             {currentStatus === 'ready' && (
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2 animate-pulse">
                   <CheckCircle2 size={12} className="text-emerald-500" />
                   <span className="text-[9px] font-black uppercase text-emerald-500">Go to Bar Now</span>
                </div>
             )}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">
            {currentStatus === 'ready' ? "Pick up at Bar Terminal 04" : "Processing Production Token"}
          </p>
          {localStorage.getItem('isTestMode') === 'true' && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 uppercase rounded-full animate-fade-in mx-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{testModeLog || "WebSocket Channel Standby: Bypassed normal queue delays"}</span>
            </div>
          )}
        </div>

        {/* Progress Tracker */}
        <div className="bg-surface-container p-6 rounded-3xl border border-outline relative overflow-hidden shadow-sm">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShoppingBag size={80} />
           </div>
           
           <div className="flex justify-between relative">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = i <= currentStep;
                const isCurrent = i === currentStep;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-3 z-10">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                      isCurrent && "bg-primary text-on-primary shadow-lg shadow-primary/20 scale-110",
                      isActive && !isCurrent && "bg-primary/20 text-primary",
                      !isActive && "bg-surface-container-high text-on-surface-variant"
                    )}>
                      <Icon size={20} className={isCurrent ? "animate-pulse" : ""} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      isActive ? "text-on-background" : "text-on-surface-variant"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
              
              {/* Connector lines */}
              <div className="absolute top-6 left-12 right-12 h-0.5 bg-outline -z-0">
                 <div 
                   className="h-full bg-primary transition-all duration-1000" 
                   style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                 />
              </div>
           </div>
        </div>

        {/* Ticket Details */}
        <div className="bg-surface-container rounded-3xl border border-outline overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              <div className="p-8 space-y-8 text-center">
                 {currentStatus === 'ready' ? (
                   <motion.div 
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="space-y-6"
                   >
                     <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl border-4 border-primary">
                        <QRCode value={order.id} size={180} level="H" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Secure Collection Pass</p>
                        <p className="text-sm font-bold text-on-surface-variant uppercase">Scan this at terminal 04</p>
                     </div>
                   </motion.div>
                 ) : (
                   <>
                    <div>
                       <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] block mb-2">Order Identification</span>
                       <p className="text-3xl font-mono font-black tracking-tighter text-on-background italic">#{order.order_number || order.id.split('-')[1].toUpperCase()}</p>
                       <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-1 tracking-widest">Table 42 • VIP Deck</p>
                    </div>

                    <div className="py-4">
                       <OrderStatusScreen orderId={order.id} />
                    </div>
                   </>
                 )}

                 <div className="pt-8 border-t border-outline flex flex-col gap-4">
                 <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Paid</span>
                    <span className="font-mono font-bold text-on-background">{formatCurrency(order.total)}</span>
                 </div>
                 <div className="flex justify-between items-center px-2 italic">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                       <MapPin size={10} /> Secure Point
                    </span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">P2P Verified</span>
                 </div>
              </div>
           </div>

           {/* Perforated detail */}
           <div className="absolute left-0 bottom-24 -translate-x-1/2 w-8 h-8 rounded-full bg-background border-r border-outline" />
           <div className="absolute right-0 bottom-24 translate-x-1/2 w-8 h-8 rounded-full bg-background border-l border-outline" />
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => {
              alert('PDF Generator Extension: Generating receipt for order ' + order.id);
            }}
            className="w-full py-4 bg-primary text-on-primary font-black text-[10px] uppercase tracking-[0.3em] rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <FileText size={16} />
            Generate Receipt PDF
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-4 bg-surface-container border border-outline text-on-surface-variant font-black text-[10px] uppercase tracking-[0.3em] rounded-xl active:scale-95 transition-transform"
          >
            Close Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
