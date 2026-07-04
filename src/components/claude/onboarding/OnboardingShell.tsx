import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { type UserRole } from '../types';
import { Button } from '../ui/Button';
import { BrandLockup } from '../ui/BrandLockup';
import { ProgressBar } from '../ui/ProgressBar';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { RoleScreen } from './screens/RoleScreen';
import { PhoneScreen } from './screens/PhoneScreen';
import { OTPScreen } from './screens/OTPScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { VenueScreen } from './screens/VenueScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { DoneScreen } from './screens/DoneScreen';
import { useSignup, StageOneFields } from '../signup';

const roleToSignup: Partial<Record<UserRole, 'patron' | 'venue' | 'brand'>> = {
  patron: 'patron',
  staff: 'patron',
  waiter: 'patron',
  manager: 'venue',
  vendor: 'venue',
  brand: 'brand',
};

interface OnboardingData {
  role: UserRole | null;
  phone: string;
  otp: string[];
  displayName: string;
  handle: string;
  paymentMethod: string | null;
  spendingCap: number;
}

const initialData: OnboardingData = {
  role: null,
  phone: '',
  otp: Array(6).fill(''),
  displayName: '',
  handle: '',
  paymentMethod: null,
  spendingCap: 1200,
};

const STEP_NAMES = ['Welcome', 'Role', 'Phone', 'Verify', 'Profile', 'Venue', 'Payment', 'Done'];

export interface OnboardingShellProps {
  /** Called when the flow finishes; receives the chosen role. Falls back to router navigation. */
  onComplete?: (role: UserRole | null) => void;
  /** Called when the user backs out of the first step. Falls back to router navigation. */
  onExit?: () => void;
}

export const OnboardingShell: React.FC<OnboardingShellProps> = ({ onComplete, onExit }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const progress = ((step + 1) / STEP_NAMES.length) * 100;
  const signup = useSignup();

  const update = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const signupRole = data.role ? roleToSignup[data.role] ?? null : null;
  const useStageOne = signupRole !== null;

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: return data.role !== null;
      case 2: return data.phone.length >= 7;
      case 3: return data.otp.every(d => d !== '');
      case 4: return useStageOne ? signup.stage1Complete : (data.displayName.trim().length > 0 && data.handle.trim().length > 0);
      case 5: return true;
      case 6: return data.paymentMethod !== null;
      case 7: return true;
      default: return false;
    }
  };

  const handleRoleChange = (role: UserRole) => {
    update('role', role);
    const sr = roleToSignup[role];
    if (sr) signup.setRole(sr);
  };

  const ctaConfig = () => {
    switch (step) {
      case 0: return { primary: 'Get started', primaryIcon: 'arrow' as const, secondary: 'I already have an account' };
      case 1: return { primary: 'Continue', primaryIcon: 'arrow' as const };
      case 2: return { primary: 'Send code', primaryIcon: 'arrow' as const };
      case 3: return { primary: 'Verify', primaryIcon: 'arrow' as const };
      case 4: return { primary: 'Continue', primaryIcon: 'arrow' as const };
      case 5: return { primary: 'Allow location', primaryIcon: 'arrow' as const, secondary: "I'll use QR scan instead" };
      case 6: return { primary: 'Add payment', primaryIcon: 'arrow' as const, secondary: "Skip — I'll add it later" };
      case 7: return { primary: 'Find a venue', primaryIcon: 'arrow' as const, secondary: 'Invite my crew first' };
      default: return { primary: 'Continue', primaryIcon: 'arrow' as const };
    }
  };

  const handleNext = () => {
    if (step === 4 && useStageOne) signup.completeStage1();
    if (step < STEP_NAMES.length - 1) setStep(s => s + 1);
    else if (onComplete) onComplete(data.role);
    else navigate(`/${data.role || 'patron'}`);
  };

  const handlePrev = () => {
    if (step === 0) {
      if (onExit) onExit();
      else navigate('/');
    } else setStep(s => s - 1);
  };

  const config = ctaConfig();

  const renderScreen = () => {
    switch (step) {
      case 0: return <WelcomeScreen />;
      case 1: return <RoleScreen value={data.role} onChange={handleRoleChange} />;
      case 2: return <PhoneScreen value={data.phone} onChange={(v) => update('phone', v)} />;
      case 3: return <OTPScreen phone={data.phone} digits={data.otp} onChange={(v) => update('otp', v)} />;
      case 4: return useStageOne && signup.stage1Data ? (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
            STAGE 1 OF 2
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(24px, 3vw, 32px)', color: 'var(--fg)', lineHeight: 1.05, letterSpacing: '-0.025em', margin: '8px 0 4px' }}>
            {signupRole === 'patron' ? 'Create your profile' : signupRole === 'venue' ? 'List your venue' : 'Capture your event'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 20, lineHeight: 1.5 }}>
            {signupRole === 'patron'
              ? 'Get a profile in 5 fields. Stage 2 — ID verification — happens when you first pay.'
              : signupRole === 'venue'
              ? 'List the asset. Stage 2 — company docs, banking, FICA, liquor licence — only unlocks when you go live.'
              : 'Capture the event. Stage 2 — brand verification + DOH consent — kicks in when you start marketing.'}
          </div>
          <StageOneFields
            role={signupRole}
            data={signup.stage1Data as any}
            onChange={(d) => signup.updateStage1(d)}
          />
        </div>
      ) : (
        <ProfileScreen
          displayName={data.displayName}
          handle={data.handle}
          onNameChange={(v) => update('displayName', v)}
          onHandleChange={(v) => update('handle', v)}
        />
      );
      case 5: return <VenueScreen />;
      case 6: return (
        <PaymentScreen
          method={data.paymentMethod}
          cap={data.spendingCap}
          onMethodChange={(v) => update('paymentMethod', v)}
          onCapChange={(v) => update('spendingCap', v)}
        />
      );
      case 7: return (
        <DoneScreen
          displayName={data.displayName}
          phone={data.phone}
          handle={data.handle}
          paymentMethod={data.paymentMethod}
          cap={data.spendingCap}
        />
      );
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      color: 'var(--fg)',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 12px',
      }}>
        <button
          type="button"
          onClick={handlePrev}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--fg-2)',
            fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500,
            cursor: 'pointer', padding: '6px 8px', borderRadius: 'var(--r-md)',
          }}
        >
          ← {step === 0 ? 'Exit' : 'Back'}
        </button>
        {step > 0 && step < STEP_NAMES.length - 1 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>
            {step} / {STEP_NAMES.length - 2}
          </span>
        )}
        <div style={{ width: 60 }} />
      </div>

      {/* Progress */}
      <div style={{ padding: '0 24px 8px' }}>
        <ProgressBar value={progress} size="sm" />
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        {step === 0 && (
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
            <BrandLockup size={48} />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.1, 1] }}
            style={{ flex: 1 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <Button
            variant="primary"
            size="lg"
            block
            iconRight={config.primaryIcon}
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {config.primary}
          </Button>
          {config.secondary && step < STEP_NAMES.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              style={{
                background: 'none', border: 'none',
                color: 'var(--fg-2)', fontFamily: 'var(--font-body)',
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                padding: '8px', textAlign: 'center',
              }}
            >
              {config.secondary}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
