import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Lock, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export const PaymentAuthorizationView: React.FC = () => {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);

  const steps = [
    "Secure Node Handshake...",
    "Validating Mesh Credentials...",
    "Authorizing Digital Settlement...",
    "Verifying Liquidity Sync...",
    "Routing Funds to Venue Terminal..."
  ];

  useEffect(() => {
    if (step < steps.length) {
      const timer = setTimeout(() => {
        setStep(prev => prev + 1);
      }, 1200 + Math.random() * 800);
      return () => clearTimeout(timer);
    } else {
      setComplete(true);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch (e) {
          console.log('Vibration failed', e);
        }
      }
      // Redirect back to app after a short delay
      setTimeout(() => {
        window.location.href = import.meta.env.BASE_URL + 'order-tracking';
      }, 2000);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-stone-900/50 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-12">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-primary),0.3)]">
            <Zap size={24} className="text-black" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Secure Auth</p>
            <p className="text-[8px] font-mono text-white/40">NODE_ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
          </div>
        </div>

        <div className="space-y-8 mb-12">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 border-2 border-white/5 border-t-primary rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {complete ? (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                  >
                    <ShieldCheck size={32} className="text-black" />
                  </motion.div>
                ) : (
                  <Lock size={32} className="text-white/20" />
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
                {complete ? "AUTHORIZED" : "AUTHORIZING"}
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                   {[0, 1, 2, 3].map(i => (
                     <div key={i} className={cn(
                       "w-1.5 h-1.5 rounded-full transition-all duration-500",
                       step > i ? "bg-primary" : "bg-white/10"
                     )} />
                   ))}
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">
                  {complete ? "Payment Verified" : steps[step] || "Finalizing..."}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 font-mono text-[10px] space-y-2">
            <div className="flex justify-between">
              <span className="text-white/40">Protocol</span>
              <span className="text-primary uppercase">WAYTA-MESH-V4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Encryption</span>
              <span className="text-white">AES-256-GCM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Status</span>
              <span className={cn(
                "uppercase",
                complete ? "text-emerald-500" : "text-amber-500"
              )}>
                {complete ? "Stable" : "Processing"}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">
            This window will close automatically
          </p>
        </div>
      </motion.div>

      <div className="mt-12 flex items-center gap-3 opacity-20 hover:opacity-100 transition-opacity">
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest">Digital Settlement Core</span>
      </div>
    </div>
  );
};
