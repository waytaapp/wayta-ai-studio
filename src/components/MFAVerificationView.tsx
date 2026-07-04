import React, { useState, useEffect, useRef } from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';

interface MFAVerificationViewProps {
  tempToken: string;       // custom token with mfaPending claim
  maskedPhone: string;     // e.g. "***-***-7821"
  onSuccess: (fullToken: string, role: string) => void;
  onCancel: () => void;
}

export const MFAVerificationView: React.FC<MFAVerificationViewProps> = ({
  tempToken,
  maskedPhone,
  onSuccess,
  onCancel,
}) => {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [expiryTime, setExpiryTime] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(60); // 60 seconds
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sign into Firebase Auth with temp token on mount, then trigger sendMfaCode
  useEffect(() => {
    let active = true;
    const initAuthAndSendCode = async () => {
      try {
        setError(null);
        setIsSending(true);
        // Sign out of any current session first to avoid token conflicts
        await signOut(auth);
        
        // 1. Sign in with the temporary custom token
        await signInWithCustomToken(auth, tempToken);
        if (!active) return;
        setAuthInitialized(true);

        // 2. Call the backend sendMfaCode callable
        const sendMfaCodeFn = httpsCallable(functions, 'sendMfaCode');
        await sendMfaCodeFn();
        
        if (!active) return;
        setSuccessMsg(`Code sent to ${maskedPhone}`);
        setExpiryTime(300);
        setResendCooldown(60);
      } catch (err: any) {
        console.error('Error during temp login or MFA trigger:', err);
        setError(err.message || 'Failed to initialize MFA process. Please try again.');
      } finally {
        if (active) {
          setIsSending(false);
        }
      }
    };

    initAuthAndSendCode();

    // Auto focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => {
      active = false;
    };
  }, [tempToken, maskedPhone]);

  // Timers countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setExpiryTime((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    if (resendCooldown > 0 || isSending || !authInitialized) return;
    try {
      setError(null);
      setSuccessMsg(null);
      setIsSending(true);
      
      const sendMfaCodeFn = httpsCallable(functions, 'sendMfaCode');
      await sendMfaCodeFn();
      
      setSuccessMsg(`Code sent to ${maskedPhone}`);
      setExpiryTime(300);
      setResendCooldown(60);
      setCode(Array(6).fill(''));
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      console.error('Error resending MFA code:', err);
      setError(err.message || 'Failed to resend MFA verification code.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    if (expiryTime === 0) {
      setError('Code expired — resend to try again.');
      return;
    }

    try {
      setError(null);
      setIsVerifying(true);

      const verifyMfaCodeFn = httpsCallable(functions, 'verifyMfaCode');
      const response = await verifyMfaCodeFn({ code: fullCode }) as { data: { token: string; role: string } };

      if (response?.data?.token) {
        // Sign out of the tempAuth
        await signOut(auth);
        
        // Sign in with the returned full token
        await signInWithCustomToken(auth, response.data.token);
        
        onSuccess(response.data.token, response.data.role);
      } else {
        throw new Error('Invalid authentication response from backend.');
      }
    } catch (err: any) {
      console.error('MFA Verification failed:', err);
      // Check for too many attempts (RESOURCE_EXHAUSTED)
      const errCode = err.code || '';
      const errMsg = err.message || '';
      if (
        errCode === 'resource-exhausted' || 
        errMsg.includes('RESOURCE_EXHAUSTED') || 
        errMsg.toLowerCase().includes('too many attempts')
      ) {
        setError('Too many attempts — contact support');
      } else {
        setError(errMsg || 'Verification failed. Please check your code.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      return;
    }

    const newCode = [...code];
    const digitArray = cleaned.split('');
    let currentIndex = index;
    for (const d of digitArray) {
      if (currentIndex < 6) {
        newCode[currentIndex] = d;
        currentIndex++;
      }
    }
    setCode(newCode);

    // Focus next input tile
    const nextIndex = Math.min(currentIndex, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
      e.preventDefault();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-[#111827] flex flex-col justify-center items-center px-6 py-12 z-[999]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <div className="w-full max-w-md bg-[#1f2937] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow decorative element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#059669]/10 rounded-full filter blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#059669]/10 rounded-full filter blur-2xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#059669]/10 text-[#6ee7b7] mb-4 border border-[#059669]/20">
            {/* Lock / Shield SVG Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Security Check</h2>
          <p className="text-sm text-gray-400 mt-2">
            MFA is required for your role. We sent a code to the phone number ending with your registered credentials.
          </p>
          {successMsg && (
            <div className="mt-3 text-xs text-[#10b981] bg-[#10b981]/10 px-3 py-1.5 rounded-full inline-block font-medium border border-[#10b981]/20">
              {successMsg}
            </div>
          )}
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* Individual Input Grid */}
          <div className="flex justify-between gap-2 max-w-sm mx-auto">
            {code.map((digit, i) => (
              <input
                key={i}
                type="text"
                maxLength={6} // allow paste
                ref={(el) => { inputRefs.current[i] = el; }}
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-12 h-15 bg-[#111827] border border-gray-700 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all"
                style={{ width: '48px', height: '60px' }}
                disabled={isSending || isVerifying}
                autoFocus={i === 0}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ))}
          </div>

          {/* Expiry Countdown Timer */}
          <div className="text-center">
            {expiryTime > 0 ? (
              <p className="text-xs text-gray-400 font-medium">
                Code expires in <span className="font-mono text-[#6ee7b7]">{formatTime(expiryTime)}</span>
              </p>
            ) : (
              <p className="text-xs text-red-400 font-semibold">
                Code expired — resend to try again
              </p>
            )}
          </div>

          {/* Inline Error messages wrapper */}
          {error && (
            <div className="p-4 bg-red-950/35 border border-red-500/20 rounded-2xl text-center text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Verify CTA button */}
            <button
              type="submit"
              disabled={isSending || isVerifying || code.some(d => !d) || expiryTime === 0}
              className="w-full h-12 rounded-xl bg-[#059669] text-white font-bold text-sm tracking-wide uppercase hover:bg-[#047857] active:bg-[#065f46] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98]"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              className="w-full h-12 rounded-xl border border-gray-700 bg-transparent text-gray-300 font-semibold text-sm hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Resend Cooldown Option */}
        <div className="mt-6 pt-6 border-t border-gray-850/80 text-center">
          <p className="text-xs text-gray-400">
            Didn't receive a security code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isSending || isVerifying || !authInitialized}
            className="mt-2 text-xs font-bold text-[#059669] hover:text-[#34d399] disabled:opacity-45 disabled:pointer-events-none transition-colors uppercase tracking-wider"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
};
