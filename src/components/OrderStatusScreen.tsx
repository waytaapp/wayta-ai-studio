import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb, db } from "@/src/lib/firebase";
import { doc as fsDoc, onSnapshot as fsOnSnapshot } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Clock, Loader2, QrCode as QrIcon, ShieldCheck } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface OrderStatusScreenProps {
  orderId: string;
}

export const OrderStatusScreen: React.FC<OrderStatusScreenProps> = ({ orderId }) => {
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<number>(10);

  useEffect(() => {
    // Simulate ETA countdown
    const interval = setInterval(() => {
      setEta(prev => (prev > 1 ? prev - 1 : 1));
    }, 60000); // Decerement every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let rtdbUnsubscribed = false;
    let rtdbUnsubscribe: (() => void) | null = null;
    let fsUnsubscribe: (() => void) | null = null;

    const setupRtdb = () => {
      try {
        const statusRef = ref(rtdb, `orders/${orderId}/status`);
        rtdbUnsubscribe = onValue(statusRef, (snapshot) => {
          if (rtdbUnsubscribed) return;
          const data = snapshot.val();
          if (data) {
            setStatus(data);
          }
          setLoading(false);
        }, (error) => {
          console.warn("RTDB Listener Error, falling back to Firestore polling silently:", error);
          rtdbUnsubscribed = true;
          setupFirestoreFallback();
        });
      } catch (err) {
        console.warn("RTDB Setup Error, falling back to Firestore polling silently:", err);
        rtdbUnsubscribed = true;
        setupFirestoreFallback();
      }
    };

    const setupFirestoreFallback = () => {
      try {
        const orderDocRef = fsDoc(db, 'orders', orderId);
        fsUnsubscribe = fsOnSnapshot(orderDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.status) {
              setStatus(data.status);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Fallback Listener Error:", error);
          setLoading(false);
        });
      } catch (err) {
        console.error("Failed to setup Firestore fallback for order:", err);
        setLoading(false);
      }
    };

    setupRtdb();

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
  }, [orderId]);

  const getStatusConfig = () => {
    switch (status) {
      case 'ready':
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-primary" />,
          title: "Order Ready!",
          description: "Head to the bar and show your QR code.",
          color: "border-primary shadow-primary/20",
          bgColor: "bg-primary/10",
          step: 3
        };
      case 'preparing':
      case 'processing':
        return {
          icon: <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />,
          title: "Pouring Drinks...",
          description: "Our bartenders are preparing your order.",
          color: "border-blue-500 shadow-blue-500/20",
          bgColor: "bg-blue-500/10",
          step: 2
        };
      case 'completed':
      case 'collected':
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-400" />,
          title: "Order Collected",
          description: "Enjoy your drinks! See you next round.",
          color: "border-emerald-500 shadow-emerald-500/20",
          bgColor: "bg-emerald-500/10",
          step: 4
        };
      default:
        return {
          icon: <Clock className="w-12 h-12 text-amber-400 animate-pulse" />,
          title: "Order Pending",
          description: "Waiting for a bartender to pick up your order.",
          color: "border-amber-500 shadow-amber-500/20",
          bgColor: "bg-amber-500/10",
          step: 1
        };
    }
  };

  const [showQRManual, setShowQRManual] = useState(false);
  const config = getStatusConfig();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">Connecting to bar...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 space-y-8 max-w-md mx-auto">
      {/* Progress Stepper */}
      <div className="w-full flex justify-between items-center px-4 mb-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500",
              config.step >= s ? "bg-primary text-black" : "bg-surface-container border border-outline text-on-surface-variant/40"
            )}>
              {s === 1 && <Clock size={14} />}
              {s === 2 && <Loader2 size={14} className={config.step === 2 ? "animate-spin" : ""} />}
              {s === 3 && <QrIcon size={14} />}
              {s === 4 && <CheckCircle2 size={14} />}
            </div>
            {s < 4 && (
              <div className={cn(
                "flex-1 h-1 mx-2 rounded-full overflow-hidden bg-surface-container border border-outline/10",
                config.step > s && "bg-primary/20"
              )}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: config.step > s ? "100%" : "0%" }}
                  className="h-full bg-primary"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full p-8 rounded-[2rem] border-2 ${config.color} ${config.bgColor} shadow-2xl flex flex-col items-center text-center space-y-4 relative overflow-hidden group`}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
          <QrIcon size={80} />
        </div>
        
        {config.icon}
        <h2 className="text-2xl font-black uppercase tracking-tight text-on-background">
          {config.title}
        </h2>
        <p className="text-on-surface-variant text-sm font-medium">
          {config.description}
        </p>

        {status !== 'ready' && status !== 'completed' && status !== 'collected' && (
           <div className="mt-4 pt-4 border-t border-outline/10 w-full flex justify-between items-center px-4">
              <div className="text-left">
                <p className="text-[8px] font-black uppercase text-on-surface-variant/60 tracking-widest">Est. Pickup</p>
                <p className="text-sm font-black text-primary uppercase">{eta} Mins</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-on-surface-variant/60 tracking-widest">Bar Loading</p>
                <p className="text-sm font-black text-amber-500 uppercase italic">HIGH VOLUME</p>
              </div>
           </div>
        )}

        {status !== 'ready' && (
          <button 
            onClick={() => setShowQRManual(!showQRManual)}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            {showQRManual ? "Hide Token" : "Preview Pickup Token"}
          </button>
        )}
      </motion.div>

      {/* QR Code Section */}
      <AnimatePresence mode="wait">
        {(status === 'ready' || showQRManual) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center space-y-6"
          >
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-primary/30 border-8 border-primary/20 relative">
              <div className="absolute -top-3 -right-3 bg-primary text-on-primary p-2 rounded-full shadow-lg border-2 border-white z-10">
                <ShieldCheck size={16} />
              </div>
              <QRCodeSVG 
                value={orderId} 
                size={220} 
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.ico", 
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            
            <div className="text-center">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary mb-1">Authenticated Pulse Key</p>
              <code className="text-lg font-mono tracking-widest text-on-background bg-surface-container p-2 px-4 rounded-xl border border-outline-variant">
                #{orderId.slice(-6).toUpperCase()}
              </code>
            </div>
            
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn(
                "flex items-center space-y-2 text-xs font-bold uppercase tracking-widest",
                status === 'ready' ? "text-primary" : "text-on-surface-variant"
              )}
            >
              {status === 'ready' ? "Scan at Bar to Collect" : "Authentication Ready"}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {(status !== 'ready' && !showQRManual) && (
        <div className="flex flex-col items-center space-y-4 opacity-60">
           <div className="w-16 h-1 w-24 bg-outline-variant rounded-full overflow-hidden">
              <motion.div 
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-1/2 h-full bg-primary"
              />
           </div>
           <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-on-surface-variant">
             Securing Queue Position...
           </p>
        </div>
      )}
    </div>
  );
};
