import React from 'react';
import { Store, Package, CreditCard, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

interface VendorIntroProps {
  step: number;
  next: () => void;
  prev: () => void;
  onComplete?: () => void;
}

export const VendorIntro: React.FC<VendorIntroProps> = ({ step, next, prev, onComplete }) => {
  const steps = [
    {
      icon: Store,
      title: 'Merchant Hub',
      text: 'Manage your stall\'s presence. Update your menu, set availability, and monitor your specific revenue stream.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
       icon: Package,
       title: 'Inventory Sync',
       text: 'Track stock in real-time. We automatically hide items as they sell out to prevent customer disappointment.',
       color: 'text-green-500',
       bg: 'bg-green-50'
    },
    {
      icon: CreditCard,
      title: 'Payout Integrity',
      text: 'Monitor your clearing status. Revenue is settled securely through our platform, ensuring you get paid instantly.',
      color: 'text-teal-500',
      bg: 'bg-teal-50'
    }
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div 
        key={step}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-20 h-20 rounded-3xl ${current.bg} flex items-center justify-center mb-6 shadow-sm`}
      >
        <Icon size={32} className={current.color} />
      </motion.div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
        {current.title}
      </h3>
      <p className="text-gray-500 text-sm leading-relaxed mb-8">
        {current.text}
      </p>
      
      <div className="flex gap-3 w-full">
        {step > 0 && (
          <button
            onClick={prev}
            className="flex-1 py-4 bg-gray-50 text-gray-400 font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
          >
            Previous
          </button>
        )}
        <button
          onClick={step === steps.length - 1 ? onComplete || next : next}
          className="flex-[2] py-4 bg-gray-900 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-gray-900/10 active:scale-95 transition-all"
        >
          {step === steps.length - 1 ? "Open Shop" : "Next Milestone"}
        </button>
      </div>
    </div>
  );
};
