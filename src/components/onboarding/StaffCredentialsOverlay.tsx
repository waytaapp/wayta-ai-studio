import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, AlertTriangle } from 'lucide-react';
import { staffService } from '../../services/staffService';
import { User as UserType } from '../../types';

export const StaffCredentialsOverlay: React.FC<{
  user: UserType;
  onComplete: () => void;
}> = ({ user, onComplete }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (!/^\d{6}$/.test(pin)) { setError("PIN must be exactly 6 digits"); return; }
    
    console.log('[ENROLL_STAFF_DEBUG] Enrollment started', { userId: user.uid, username, pin: pin.length + ' digits' });
    setLoading(true);
    setError('');
    try {
      console.log('[ENROLL_STAFF_DEBUG] About to call onComplete callback');
      console.log('[ENROLL_STAFF_DEBUG] Staff credentials updated successfully');
        await staffService.updateStaffCredentials(user.uid, username, pin);
        try {
          console.log('[ENROLL_STAFF_DEBUG] Inside try block, about to call onComplete');
        console.log('[ENROLL_STAFF_DEBUG] onComplete callback finished successfully');
        onComplete();
        } catch (onCompleteError) { console.error('[ENROLL_STAFF_DEBUG] Error FROM ONCOMPLETE CALLBACK:', { message: onCompleteError instanceof Error ? onCompleteError.message : String(onCompleteError), code: onCompleteError instanceof Error && 'code' in onCompleteError ? (onCompleteError as any).code : 'UNKNOWN' }); throw onCompleteError; }
        console.error('[ENROLL_STAFF_DEBUG] Enrollment failed:', { error: e instanceof Error ? e.message : String(e), code: e instanceof Error && 'code' in e ? (e as any).code : 'UNKNOWN', fullError: e });
    } catch (e) {
        setError("Failed to set credentials. Please try again or contact management.");
        setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[200] flex items-center justify-center p-6">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container border border-outline rounded-[3rem] p-8 w-full max-w-sm space-y-8 shadow-2xl"
        >
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                    <Lock size={32} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Staff Onboarding</h2>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Setup your operational terminal security.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant px-1">Unique Username</label>
                  <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <input 
                         required 
                         className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 text-sm font-bold uppercase outline-none focus:border-primary" 
                         value={username} 
                         onChange={(e) => setUsername(e.target.value)}
                         autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} placeholder="Staff Identifier"
                      />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant px-1">6-Digit PIN</label>
                  <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <input 
                         required 
                         type="password"
                         className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 text-sm font-black tracking-[0.4em] outline-none focus:border-primary" 
                         value={pin} 
                         onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                         placeholder="000000"
                         maxLength={6}
                      />
                  </div>
               </div>

               {error && <p className="text-red-500 text-[10px] uppercase font-black flex items-center gap-2"><AlertTriangle size={12} /> {error}</p>}
               
               <button 
                  disabled={loading}
                  type="submit" 
                  className="w-full h-14 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
               >
                 {loading ? 'Authorizing...' : 'Initialize Secure Hub'}
               </button>
            </form>
        </motion.div>
    </div>
  );
};
