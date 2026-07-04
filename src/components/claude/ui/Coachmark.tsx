import { useEffect, type RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';

export interface CoachmarkProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  targetRef: RefObject<HTMLElement | null>;
  position?: 'top' | 'bottom' | 'left' | 'right';
  step?: number;
  totalSteps?: number;
  onNext?: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
}

export const Coachmark: React.FC<CoachmarkProps> = ({
  isOpen,
  onClose,
  title,
  description,
  targetRef,
  position = 'bottom',
  step,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) => {
  useEffect(() => {
    if (!isOpen || !targetRef.current) return;
  }, [isOpen, targetRef]);

  if (!isOpen) return null;

  const target = targetRef.current?.getBoundingClientRect();
  const coachWidth = 320;
  const gap = 12;

  let left = target ? target.left + target.width / 2 - coachWidth / 2 : '50%';
  if (typeof left === 'number') {
    if (left < 16) left = 16;
    if (left + coachWidth > window.innerWidth - 16) left = window.innerWidth - coachWidth - 16;
    left = `${left}px`;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 16, 11, 0.7)',
          backdropFilter: 'blur(2px)',
          zIndex: 998,
        }}
        onClick={onClose}
      />
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: position === 'bottom' ? 16 : -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: position === 'bottom' ? 16 : -16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            zIndex: 999,
            width: coachWidth,
            left,
            top: target ? `${position === 'bottom' ? target.bottom + gap : target.top - gap - 200}px` : '50%',
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {(step !== undefined || totalSteps !== undefined) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--fg-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Step {step || 1} of {totalSteps || 1}
              </span>
              {onSkip && <button onClick={onSkip} style={{ all: 'unset', color: 'var(--fg-3)', fontSize: '12px', cursor: 'pointer' }}>Skip</button>}
            </div>
          )}
          
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--fg)', margin: '0 0 8px' }}>{title}</h4>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg-2)', margin: '0 0 16px' }}>{description}</p>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {onPrev && step && step > 1 && <Button variant="ghost" size="sm" onClick={onPrev}>Back</Button>}
            {onNext && step !== totalSteps && <Button variant="primary" size="sm" onClick={onNext}>Next</Button>}
            {onNext && step === totalSteps && <Button variant="primary" size="sm" onClick={onNext}>Got it</Button>}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};