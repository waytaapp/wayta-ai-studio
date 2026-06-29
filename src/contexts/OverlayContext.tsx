import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode, type RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../components/ui/Icon';
import { Coachmark } from '../components/ui/Coachmark';
import { HintBubble } from '../components/ui/HintBubble';
import { AINudge } from '../components/ui/AINudge';

/* ─── Types ─────────────────────────────────────────────── */

export interface CoachmarkStep {
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface HintConfig {
  content: ReactNode;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface NudgeConfig {
  title: string;
  description: string;
  confidence?: number;
  acceptLabel?: string;
  dismissLabel?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

/* ─── Context ────────────────────────────────────────────── */

interface OverlayContextValue {
  toast: (t: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  startTour: (steps: CoachmarkStep[], startIndex?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  showHint: (hint: HintConfig) => void;
  dismissHint: () => void;
  showNudge: (nudge: NudgeConfig) => void;
  dismissNudge: () => void;
  tourSteps: CoachmarkStep[];
  tourIndex: number;
  isTourOpen: boolean;
  hintConfig: HintConfig | null;
  isHintOpen: boolean;
  nudgeConfig: NudgeConfig | null;
  isNudgeOpen: boolean;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export const useOverlay = () => {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within OverlayProvider');
  return ctx;
};

/* ─── Provider ───────────────────────────────────────────── */

const toastColors: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: { icon: 'check', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)' },
  error: { icon: 'x', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)' },
  warning: { icon: 'bolt', color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.4)' },
  info: { icon: 'info', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
};

export const OverlayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  /* ── Toast ── */
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { ...t, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* ── Coachmark / Tour ── */
  const [tourSteps, setTourSteps] = useState<CoachmarkStep[]>([]);
  const [tourIndex, setTourIndex] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const coachmarkTargetRef = useRef<HTMLElement | null>(null);

  const startTour = useCallback((steps: CoachmarkStep[], startIndex = 0) => {
    setTourSteps(steps);
    setTourIndex(startIndex);
    setIsTourOpen(true);
  }, []);

  const nextStep = useCallback(() => {
    setTourIndex(i => i < tourSteps.length - 1 ? i + 1 : i);
    if (tourIndex >= tourSteps.length - 1) {
      setIsTourOpen(false);
      setTourSteps([]);
      setTourIndex(0);
    }
  }, [tourIndex, tourSteps.length]);

  const prevStep = useCallback(() => {
    setTourIndex(i => Math.max(0, i - 1));
  }, []);

  const endTour = useCallback(() => {
    setIsTourOpen(false);
    setTourSteps([]);
    setTourIndex(0);
  }, []);

  useEffect(() => {
    if (isTourOpen && tourSteps[tourIndex]) {
      coachmarkTargetRef.current = document.querySelector(tourSteps[tourIndex].targetSelector);
    }
  }, [isTourOpen, tourIndex, tourSteps]);

  /* ── Hint ── */
  const [hintConfig, setHintConfig] = useState<HintConfig | null>(null);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const hintTargetRef = useRef<HTMLElement | null>(null);

  const showHint = useCallback((h: HintConfig) => {
    setHintConfig(h);
    setIsHintOpen(true);
  }, []);

  const dismissHint = useCallback(() => {
    setIsHintOpen(false);
  }, []);

  useEffect(() => {
    if (isHintOpen && hintConfig) {
      hintTargetRef.current = document.querySelector(hintConfig.targetSelector);
    }
  }, [isHintOpen, hintConfig]);

  useEffect(() => {
    if (!isHintOpen || !hintConfig?.duration) return;
    const timer = setTimeout(dismissHint, hintConfig.duration);
    return () => clearTimeout(timer);
  }, [isHintOpen, hintConfig?.duration, dismissHint]);

  /* ── AI Nudge ── */
  const [nudgeConfig, setNudgeConfig] = useState<NudgeConfig | null>(null);
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);

  const showNudge = useCallback((n: NudgeConfig) => {
    setNudgeConfig(n);
    setIsNudgeOpen(true);
  }, []);

  const dismissNudge = useCallback(() => {
    setIsNudgeOpen(false);
  }, []);

  /* ── Auto-dismiss toasts ── */
  useEffect(() => {
    if (toasts.length === 0) return;
    toasts.forEach(t => {
      setTimeout(() => dismissToast(t.id), 4000);
    });
  }, [toasts, dismissToast]);

  const currentStep = tourSteps[tourIndex] || null;

  return (
    <OverlayContext.Provider value={{
      toast, dismissToast,
      startTour, nextStep, prevStep, endTour,
      showHint, dismissHint,
      showNudge, dismissNudge,
      tourSteps, tourIndex, isTourOpen,
      hintConfig, isHintOpen,
      nudgeConfig, isNudgeOpen,
    }}>
      {children}

      {/* ── Toast renderer ── */}
      <AnimatePresence>
        {toasts.map(t => {
          const s = toastColors[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 300, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 'var(--s-6)',
                right: 'var(--s-6)',
                zIndex: 997,
                minWidth: 300,
                maxWidth: 420,
                background: 'var(--bg-elev-2)',
                border: `1px solid ${s.border}`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 'var(--r-lg)',
                padding: '14px 16px',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: s.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name={s.icon as any} size={18} stroke={2} color={s.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
                  {t.title}
                </div>
                {t.description && (
                  <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--fg-2)', marginTop: 4 }}>
                    {t.description}
                  </div>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => { t.action!.onClick(); dismissToast(t.id); }}
                    style={{
                      marginTop: 8, padding: '6px 12px',
                      background: 'transparent', color: s.color,
                      border: `1px solid ${s.color}`, borderRadius: 'var(--r-md)',
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                style={{
                  all: 'unset', cursor: 'pointer', color: 'var(--fg-3)',
                  padding: 4, display: 'flex', flexShrink: 0,
                }}
              >
                <Icon name="x" size={14} stroke={2} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ── Coachmark ── */}
      {isTourOpen && currentStep && (
        <Coachmark
          isOpen={isTourOpen}
          onClose={endTour}
          title={currentStep.title}
          description={currentStep.description}
          targetRef={coachmarkTargetRef as unknown as RefObject<HTMLElement | null>}
          position={currentStep.position}
          step={tourIndex + 1}
          totalSteps={tourSteps.length}
          onNext={tourIndex < tourSteps.length - 1 ? nextStep : endTour}
          onPrev={tourIndex > 0 ? prevStep : undefined}
          onSkip={endTour}
        />
      )}

      {/* ── Hint ── */}
      {isHintOpen && hintConfig && (
        <HintBubble
          isOpen={isHintOpen}
          onClose={dismissHint}
          targetRef={hintTargetRef as RefObject<HTMLElement>}
          position={hintConfig.position}
          actionLabel={hintConfig.actionLabel}
          onAction={hintConfig.onAction}
        >
          {hintConfig.content}
        </HintBubble>
      )}

      {/* ── AI Nudge ── */}
      {isNudgeOpen && nudgeConfig && (
        <AINudge
          isOpen={isNudgeOpen}
          onClose={dismissNudge}
          title={nudgeConfig.title}
          description={nudgeConfig.description}
          confidence={nudgeConfig.confidence}
          acceptLabel={nudgeConfig.acceptLabel}
          dismissLabel={nudgeConfig.dismissLabel}
          onAccept={nudgeConfig.onAccept}
          onDismiss={nudgeConfig.onDismiss}
        />
      )}
    </OverlayContext.Provider>
  );
};
