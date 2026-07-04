import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, X, Sparkles } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const OnboardingPortal: React.FC = () => {
  const { isActive, steps, currentStepIndex, nextStep, prevStep, skipTour, persona } = useOnboarding();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const updateRect = () => {
      const step = steps[currentStepIndex];
      const element = document.getElementById(step.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    // Re-check periodically in case of dynamic layout shifts
    const interval = setInterval(updateRect, 500);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      clearInterval(interval);
    };
  }, [isActive, currentStepIndex, steps]);

  if (!isActive) return null;

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* Dimmed Background with Hole */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] transition-opacity duration-500" />
      
      {targetRect && (
        <motion.div
          initial={false}
          animate={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
          className="absolute bg-white transition-all duration-300 rounded-xl shadow-[0_0_0_2000px_rgba(0,0,0,0.45)]"
          style={{ mixBlendMode: 'hard-light' }}
        />
      )}

      {/* Tooltip / Bottom Sheet */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute z-[1001] pointer-events-auto w-full md:w-[360px] px-3 md:px-0"
          style={targetRect ? {
            left: '50%',
            transform: 'translateX(-50%)',
            ...(window.innerWidth < 768 
              ? (targetRect.top + targetRect.height / 2 > window.innerHeight / 2 
                ? { top: '15%', bottom: 'auto' } // Element in bottom half, card at top
                : { bottom: '15%', top: 'auto' }) // Element in top half, card at bottom
              : {
                  top: Math.min(window.innerHeight - 340, targetRect.bottom + 24),
                  left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left)),
                  transform: 'none'
                })
          } : {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-white/60 backdrop-blur-3xl border border-white/60 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-8 space-y-4 sm:space-y-6 overflow-hidden relative">
            {/* Soft Brand Signature Gradient */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-400/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />

            {/* Progress bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progress}%` }}
                 className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
               />
            </div>

            <button 
              onClick={skipTour}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors z-20"
            >
              <X size={20} />
            </button>

            <div className="flex items-center justify-between relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-100 text-cyan-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} className="text-cyan-500 fill-cyan-500" />
                {persona?.replace(/_/g, ' ')} GUIDE
              </div>
              <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 relative z-10 max-h-[25vh] sm:max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
              <h4 className="text-gray-900 text-lg sm:text-2xl font-black tracking-tight leading-none">
                {currentStep.title}
              </h4>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-semibold">
                {currentStep.content}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 gap-4 relative z-10">
              <div className="hidden md:flex gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 {currentStepIndex + 1} / {steps.length}
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                {currentStepIndex > 0 && (
                  <button 
                    onClick={prevStep}
                    className="p-3 rounded-2xl border border-gray-100 bg-white/50 text-gray-400 hover:text-gray-900 transition-all active:scale-90"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <button 
                  onClick={nextStep}
                  className="flex-1 md:flex-none px-6 py-4 md:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  {currentStepIndex === steps.length - 1 ? 'GET STARTED' : 'CONTINUE'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
};
