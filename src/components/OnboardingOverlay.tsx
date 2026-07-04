import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface OnboardingStep {
  id: string;
  targetId: string;
  title: string;
  content: string;
  persona: string;
}

interface OnboardingOverlayProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  isVisible: boolean;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ 
  steps, 
  onComplete,
  isVisible 
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const currentStep = steps[currentStepIndex];

  const updateSpotlight = useCallback(() => {
    if (!currentStep) return;
    const element = document.getElementById(currentStep.targetId);
    if (element) {
      setSpotlightRect(element.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isVisible) {
      updateSpotlight();
      window.addEventListener('resize', updateSpotlight);
      window.addEventListener('scroll', updateSpotlight, true);
    }
    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [isVisible, updateSpotlight]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const getPopupPosition = () => {
    if (!spotlightRect) return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    
    const viewportHeight = window.innerHeight;
    const elementCenterY = spotlightRect.top + spotlightRect.height / 2;
    
    // If element is in bottom half, put popup above it
    if (elementCenterY > viewportHeight / 2) {
      return `bottom-[${viewportHeight - spotlightRect.top + 20}px] left-1/2 -translate-x-1/2`;
    } 
    // If element is in top half, put popup below it
    return `top-[${spotlightRect.bottom + 20}px] left-1/2 -translate-x-1/2`;
  };

  if (!isVisible || !currentStep) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Darkened Background with Hole */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left - 8}
                y={spotlightRect.top - 8}
                width={spotlightRect.width + 16}
                height={spotlightRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.45)"
          mask="url(#spotlight-mask)"
          className="pointer-events-auto backdrop-blur-[1px]"
        />
        {spotlightRect && (
           <motion.rect
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            x={spotlightRect.left - 12}
            y={spotlightRect.top - 12}
            width={spotlightRect.width + 24}
            height={spotlightRect.height + 24}
            rx="16"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-[spin_8s_linear_infinite]"
          />
        )}
      </svg>

      {/* Pop-up Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={spotlightRect ? {
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            ...(window.innerWidth < 768 
              ? (spotlightRect.top + spotlightRect.height / 2 > window.innerHeight / 2 
                ? { top: '15%', bottom: 'auto' }
                : { bottom: '15%', top: 'auto' })
              : (spotlightRect.top + spotlightRect.height / 2 > window.innerHeight / 2 
                ? { bottom: Math.max(16, window.innerHeight - spotlightRect.top + 32) }
                : { top: Math.min(window.innerHeight - 340, spotlightRect.bottom + 32) }))
          } : {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000
          }}
          className="pointer-events-auto w-[calc(100vw-32px)] md:w-full md:max-w-sm bg-surface-container/90 backdrop-blur-3xl rounded-[2rem] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-outline overflow-hidden"
        >
          {/* Soft Brand Signature Gradient */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/10 blur-[60px] rounded-full pointer-events-none" />

          <button
            onClick={onComplete}
            className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors z-20"
          >
            <X size={18} />
          </button>

          <div className="space-y-4 sm:space-y-6 relative z-10">
            <div className="space-y-3 sm:space-y-4 max-h-[35vh] sm:max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-2 sm:space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container border border-primary/30 rounded-full">
                  <span className="text-[10px] font-bold font-mono text-on-primary-container uppercase tracking-widest">
                    Step {currentStepIndex + 1} / {steps.length}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-display text-on-surface leading-none tracking-tight">
                  {currentStep.title}
                </h3>
              </div>

              <p className="text-sm sm:text-base text-on-surface-variant font-medium leading-relaxed">
                {currentStep.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-outline-variant">
              <button
                onClick={onComplete}
                className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Skip
              </button>

              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handleBack}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container-high border border-outline text-on-surface-variant hover:text-on-surface transition-all active:scale-90"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="bg-primary text-on-primary h-12 px-8 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                >
                  {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
