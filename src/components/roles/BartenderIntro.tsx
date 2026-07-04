import React from 'react';
import { LayoutDashboard, Zap, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface BartenderIntroProps {
  step: number;
  next: () => void;
  prev: () => void;
  onComplete?: () => void;
}

export const BartenderIntro: React.FC<BartenderIntroProps> = ({ step, next, prev, onComplete }) => {
  const steps = [
    {
      icon: LayoutDashboard,
      title: 'Terminal Ops',
      text: 'Welcome to the front lines. This dashboard tracks your station\'s active throughput and prep efficiency.',
      color: 'text-cyan-500',
      bg: 'bg-cyan-50'
    },
    {
       icon: Zap,
       title: 'Visual Flow',
       text: 'Manage the rush with a visual Kanban workflow designed for high-velocity environments. Drag, tap, and fulfill.',
       color: 'text-blue-500',
       bg: 'bg-blue-50'
    },
    {
      icon: Sparkles,
      title: 'AI Sequencing',
      text: 'Let Gemini group similar orders for you. Maximize your throughput by following optimized batch suggestions.',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      icon: RefreshCw,
      title: 'Hybrid Mode',
      text: 'Finished your shift? Switch to Patron mode instantly to enjoy the club without switching accounts.',
      color: 'text-violet-500',
      bg: 'bg-violet-50'
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
          {step === steps.length - 1 ? "Initialize Station" : "Next Milestone"}
        </button>
      </div>
    </div>
  );
};
