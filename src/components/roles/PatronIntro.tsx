import React from 'react';
import { GlassWater, QrCode, ShieldCheck, Wallet, Sparkles, Music, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface PatronIntroProps {
  step: number;
  next: () => void;
  prev: () => void;
  onComplete?: () => void;
}

export const PatronIntro: React.FC<PatronIntroProps> = ({ step, next, prev, onComplete }) => {
  const steps = [
    {
      icon: GlassWater,
      title: 'Pulse of Sandton',
      text: 'Find venues with active throughput. No more guessing where the vibe is; follow the live Sandton metrics.',
      color: 'text-cyan-500',
      bg: 'bg-cyan-50'
    },
    {
       icon: Music,
       title: 'Vibe Explorer',
       text: 'Filter venues and events by your mood. Whether it\'s Amapiano, Afro-Tech, or a chill VIP lounge, find your perfect match.',
       color: 'text-pink-500',
       bg: 'bg-pink-50'
    },
    {
      icon: Sparkles,
      title: 'AI Mixology',
      text: 'Stuck on what to order? Let Gemini analyze the room\'s energy and suggest the perfect round for the vibe.',
      color: 'text-purple-500',
      bg: 'bg-purple-50'
    },
    {
       icon: QrCode,
       title: 'Zero-Line Queue',
       text: 'Scan any table QR to sync your session. Order and pay in real-time without leaving your conversation.',
       color: 'text-blue-500',
       bg: 'bg-blue-50'
    },
    {
      icon: TrendingUp,
      title: 'Budget Guardrails',
      text: 'Set your spend limit before the first round. We\'ll notify you as you approach your limit to keep your night on track.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
      icon: ShieldCheck,
      title: 'Squad Safety',
      text: 'Stay protected with built-in SOS features and arrival check-ins. We watch your back while you dance.',
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
          {step === steps.length - 1 ? "Start Partying" : "Next Milestone"}
        </button>
      </div>
    </div>
  );
};
