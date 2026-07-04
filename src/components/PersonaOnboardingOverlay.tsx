import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

import { DoNotShowAgain } from './DoNotShowAgain';

interface PersonaOnboardingOverlayProps {
  open: boolean;
  step: number;
  total: number;
  onClose: () => void;
  onDoNotShowAgain?: () => void;
  title?: string;
  children: React.ReactNode;
}

export const PersonaOnboardingOverlay: React.FC<PersonaOnboardingOverlayProps> = ({
  open,
  step,
  total,
  onClose,
  onDoNotShowAgain,
  title,
  children,
}) => {
  if (!open) return null;

  const progress = ((step + 1) / total) * 100;
  const isFinalStep = step === total - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Main Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-[420px] bg-white/60 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden"
          >
            {/* Soft Brand Signature Gradient */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-400/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />

            {/* Progress Header */}
            <div className="relative mb-6 sm:mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-100 rounded-full">
                  <Sparkles size={12} className="text-cyan-600" />
                  <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest">
                    Guide {step + 1} / {total}
                  </span>
                </div>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="space-y-4 sm:space-y-6 relative z-10 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {title && (
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 leading-none">
                  {title}
                </h2>
              )}
              <div className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
                {children}
              </div>
              {onDoNotShowAgain && (
                <div className="pt-2">
                  <DoNotShowAgain onDisable={onDoNotShowAgain} />
                </div>
              )}
            </div>

             {/* Minimal Footer */}
            <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-100 flex flex-col gap-4">
               <div className="flex items-center justify-between gap-4">
                 <button 
                   onClick={onClose}
                   className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                 >
                   Skip Guide
                 </button>
                 {onDoNotShowAgain && (
                   <button 
                    onClick={onDoNotShowAgain}
                    className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                   >
                     Don't Show
                   </button>
                 )}
               </div>
              <div className="flex justify-center">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: total }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        i === step ? "bg-cyan-500 w-4" : "bg-gray-300"
                      )} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
