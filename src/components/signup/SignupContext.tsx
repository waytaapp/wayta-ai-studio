import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  type SignupRole,
  type PatronStage1, type VenueStage1, type BrandStage1,
  DEFAULT_PATRON_1, DEFAULT_VENUE_1, DEFAULT_BRAND_1,
} from './types';

interface SignupContextValue {
  role: SignupRole | null;
  setRole: (r: SignupRole) => void;
  stage1Complete: boolean;
  stage2Complete: boolean;
  stage1Data: PatronStage1 | VenueStage1 | BrandStage1 | null;
  updateStage1: (data: Partial<PatronStage1 | VenueStage1 | BrandStage1>) => void;
  completeStage1: () => void;
  stage2Pending: boolean;
  triggerStage2: () => void;
  completeStage2: () => void;
  reset: () => void;
}

const SignupContext = createContext<SignupContextValue | null>(null);

export const useSignup = () => {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error('useSignup must be used within SignupProvider');
  return ctx;
};

export const useSignupGuard = () => {
  const { stage2Pending, triggerStage2, stage2Complete } = useSignup();
  const guard = useCallback((action: () => void) => {
    if (stage2Pending && !stage2Complete) {
      triggerStage2();
      return false;
    }
    action();
    return true;
  }, [stage2Pending, stage2Complete, triggerStage2]);
  return { stage2Pending, guard, stage2Complete };
};

export const SignupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<SignupRole | null>(null);
  const [stage1Data, setStage1Data] = useState<PatronStage1 | VenueStage1 | BrandStage1 | null>(null);
  const [stage1Complete, setStage1Complete] = useState(false);
  const [stage2Complete, setStage2Complete] = useState(false);
  const [showStage2, setShowStage2] = useState(false);

  const updateStage1 = useCallback((data: Partial<PatronStage1 | VenueStage1 | BrandStage1>) => {
    setStage1Data(prev => {
      if (!prev) {
        if (role === 'patron') return { ...DEFAULT_PATRON_1, ...data } as PatronStage1;
        if (role === 'venue') return { ...DEFAULT_VENUE_1, ...data } as VenueStage1;
        if (role === 'brand') return { ...DEFAULT_BRAND_1, ...data } as BrandStage1;
        return null;
      }
      return { ...prev, ...data };
    });
  }, [role]);

  const completeStage1 = useCallback(() => {
    setStage1Complete(true);
  }, []);

  const triggerStage2 = useCallback(() => {
    setShowStage2(true);
  }, []);

  const completeStage2 = useCallback(() => {
    setStage2Complete(true);
    setShowStage2(false);
  }, []);

  const reset = useCallback(() => {
    setRole(null);
    setStage1Data(null);
    setStage1Complete(false);
    setStage2Complete(false);
    setShowStage2(false);
  }, []);

  const stage2Pending = stage1Complete && !stage2Complete;

  return (
    <SignupContext.Provider value={{
      role, setRole,
      stage1Complete, stage2Complete,
      stage1Data, updateStage1, completeStage1,
      stage2Pending, triggerStage2, completeStage2,
      reset,
    }}>
      {children}
      {showStage2 && <Stage2Overlay />}
    </SignupContext.Provider>
  );
};

/* ─── Stage 2 overlay ─────────────────────────────────── */

import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Eyebrow } from '../ui/Eyebrow';

  const Stage2Overlay: React.FC = () => {
  const { role, completeStage2, stage2Complete } = useSignup();
  const [idNumber, setIdNumber] = useState('');

  if (!role) return null;

  const handleVerify = () => {
    if (role === 'patron') {
      completeStage2();
    } else if (role === 'venue') {
      completeStage2();
    } else {
      completeStage2();
    }
  };

  const handleSkip = () => {
    completeStage2();
  };

  if (stage2Complete) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(2, 16, 11, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: '32px',
            maxWidth: 460,
            width: '90%',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {role === 'patron' && (
            <div>
              <Eyebrow>STAGE 2 · VERIFY</Eyebrow>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--fg)', marginTop: 8, marginBottom: 8 }}>
                One last step
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 24 }}>
                SA law requires ID verification before your first payment. Have your SA ID book or card ready.
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>
                  SA ID NUMBER
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-elev-1)',
                  border: `1.5px solid var(--border)`,
                  borderRadius: 'var(--r-md)', padding: '14px 16px',
                }}>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="000101 0000 000"
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
                      minWidth: 0,
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 24 }}>
                Your ID is checked once at first payment. We never store the number.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="primary" size="lg" block disabled={idNumber.length < 6} onClick={handleVerify}>
                  Verify & continue
                </Button>
              </div>
              <button type="button" onClick={handleSkip} style={{
                width: '100%', background: 'none', border: 'none', color: 'var(--fg-3)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', padding: '10px', textAlign: 'center', marginTop: 8,
              }}>
                Skip — I'll verify later
              </button>
            </div>
          )}

          {(role === 'venue' || role === 'brand') && (
            <div>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--bg-emerald-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Icon name="shield" size={24} />
              </div>
              <Eyebrow>STAGE 2 · VERIFICATION</Eyebrow>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--fg)', marginTop: 8, marginBottom: 8 }}>
                {role === 'venue' ? 'Ready to go live?' : 'Ready to market?'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 24 }}>
                {role === 'venue'
                  ? 'To activate your venue, we need company docs, banking details, FICA clearance and your liquor licence.'
                  : 'To start marketing, we need brand verification and DOH (Department of Health) consent for alcohol promotion.'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {(role === 'venue' ? [
                  'Company registration docs',
                  'Banking details',
                  'FICA clearance',
                  'Liquor licence',
                ] : [
                  'Brand registration verification',
                  'DOH consent for alcohol promotion',
                ]).map(item => (
                  <div key={item} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: 'var(--bg-elev-1)', borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)',
                  }}>
                    <Icon name="upload" size={16} color="var(--accent)" />
                    <span style={{ fontSize: 13.5, color: 'var(--fg)', fontWeight: 500 }}>{item}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3)' }}>Pending</span>
                  </div>
                ))}
              </div>

              <Button variant="primary" size="lg" block onClick={handleVerify}>
                Begin verification
              </Button>
              <button type="button" onClick={handleSkip} style={{
                width: '100%', background: 'none', border: 'none', color: 'var(--fg-3)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', padding: '10px', textAlign: 'center', marginTop: 8,
              }}>
                I'll do this later
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
