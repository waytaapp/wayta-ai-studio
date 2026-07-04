import React from 'react';
import { Ticket, Users, Sparkles, Map } from 'lucide-react';
import { motion } from 'motion/react';

interface EventManagerIntroProps {
  step: number;
  next: () => void;
  prev: () => void;
  onComplete?: () => void;
}

export const EventManagerIntro: React.FC<EventManagerIntroProps> = ({ step, next, prev, onComplete }) => {
  const steps = [
    {
      icon: Ticket,
      title: 'Logistics Command',
      text: 'Monitor live entry rates and ticket velocity across all gates. Ensure your security deployment matches crowd flow.',
      color: 'text-orange-500',
      bg: 'bg-orange-50'
    },
    {
       icon: Map,
       title: 'Site Awareness',
       text: 'Track real-time throughput at every bar and stage. Identify heatmaps where crowd density is reaching capacity.',
       color: 'text-amber-500',
       bg: 'bg-amber-50'
    },
    {
      icon: Sparkles,
      title: 'Crowd Intelligence',
      text: 'Gemini predicts upcoming rush periods based on historical entry data. Adjust your operations before the peak hits.',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50'
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
          {step === steps.length - 1 ? "Activate Command" : "Next Milestone"}
        </button>
      </div>
    </div>
  );
};
