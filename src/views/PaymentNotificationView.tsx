import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Bell, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';

export const PaymentNotificationView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const path = window.location.pathname;
  const statusParam = searchParams.get('status');
  
  // Specifically handle failure if the path is /payment-failed
  const status = path.endsWith('/payment-failed') ? 'failed' : (statusParam || 'success');
  const reference = searchParams.get('ref') || 'N/A';

  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-stone-900 border border-white/10 rounded-[3rem] p-10 text-center shadow-2xl"
      >
        <div className="mb-8 flex justify-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mb-6",
              isSuccess ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}
          >
            {isSuccess ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
          </motion.div>
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">
          {isSuccess ? "Payment Received" : "Payment Failed"}
        </h1>
        <p className="text-on-surface-variant/60 text-sm mb-8 leading-relaxed">
          {isSuccess 
            ? "Your funds have been securely routed to the venue. Head to the tracking screen to see your order status."
            : "We couldn't process your payment. Please check your bank details and try again."}
        </p>

        <div className="bg-black/20 rounded-2xl p-6 border border-white/5 mb-8 text-left space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">Transaction Ref</p>
            <p className="font-mono text-sm font-bold text-primary">{reference}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">Network Hub</p>
            <p className="font-mono text-sm font-bold text-white">Payment Notifications Service</p>
          </div>
        </div>

        <button 
          onClick={() => navigate(isSuccess ? '/order-tracking' : '/explore')}
          className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:translate-y-[-2px] transition-all active:scale-95 shadow-[0_10px_20px_-5px_rgba(var(--color-primary),0.3)]"
        >
          {isSuccess ? "Track My Order" : "Go Back & Retry"}
          <ArrowRight size={20} />
        </button>
      </motion.div>

      <div className="mt-12 flex items-center gap-4 text-white/20">
        <Bell size={16} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Wayta Real-time Notification Engine</p>
      </div>
    </div>
  );
};
