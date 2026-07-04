import React from 'react';
import { BarChart3, Users, ShieldCheck, Store, UserPlus, Terminal, BookOpen, Sliders, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ManagerIntroProps {
  step: number;
  next: () => void;
  prev: () => void;
  onComplete?: () => void;
}

export const ManagerIntro: React.FC<ManagerIntroProps> = ({ step, next, prev, onComplete }) => {
  const steps = [
    {
      icon: Store,
      title: 'Venue Listing',
      text: 'Onboard your venue details. Define your location, visual brand identity, and operating hours for the Sandton ecosystem.',
      color: 'text-cyan-500',
      bg: 'bg-cyan-50'
    },
    {
      icon: UserPlus,
      title: 'Staff Activation',
      text: 'Create digital profiles for your bartenders and waiters. Assign granular permissions and station assignments.',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      icon: Terminal,
      title: 'System Bridge',
      text: 'Connect your existing POS infrastructure. Integrate with Wayta to sync real-time sales, inventory, and order flow.',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      icon: BookOpen,
      title: 'Digital Catalog',
      text: 'Build your venue listing and menu. Host high-res images and set dynamic pricing for peak vibes.',
      color: 'text-purple-500',
      bg: 'bg-purple-50'
    },
    {
      icon: BarChart3,
      title: 'Pulse Analytics',
      text: 'Monitor your business heartbeat in real-time. Watch revenue flow and throughput across every station.',
      color: 'text-pink-500',
      bg: 'bg-pink-50'
    },
    {
      icon: Sliders,
      title: 'Command Control',
      text: 'Full venue control. Manage guest lists, security alerts, and lounge capacity from your palm.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
       icon: TrendingUp,
       title: 'Performance Guard',
       text: 'Staff monitoring. Track prep times and customer ratings to keep your team operating at elite levels.',
       color: 'text-amber-500',
       bg: 'bg-amber-50'
    }
  ];

  const current = steps[step] || steps[0];
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div 
        key={step}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl ${current.bg} flex items-center justify-center mb-4 sm:mb-6 shadow-sm`}
      >
        <Icon size={28} className={cn(current.color, "sm:w-8 sm:h-8")} />
      </motion.div>
      
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 tracking-tight">
        {current.title}
      </h3>
      <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-6 sm:mb-8">
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
          {step === steps.length - 1 ? "Initialize Dashboard" : "Next Milestone"}
        </button>
      </div>
    </div>
  );
};
