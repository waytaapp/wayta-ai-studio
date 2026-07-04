import React, { useState } from 'react';
import { Shield, Key, Lock, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AdminLoginOverlayProps {
  onSuccess: () => void;
  onClose: () => void;
  isDark?: boolean;
}

export const AdminLoginOverlay: React.FC<AdminLoginOverlayProps> = ({ onSuccess, onClose, isDark = true }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Credentials come from build-time env (VITE_ADMIN_USERNAME / VITE_ADMIN_PASSWORD);
    // when unset, this overlay rejects everything.
    const adminUsername = import.meta.env.VITE_ADMIN_USERNAME || '';
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
    setTimeout(() => {
      if (adminUsername && adminPassword && username === adminUsername && password === adminPassword) {
        sessionStorage.setItem('admin_verified', 'true');
        onSuccess();
      } else {
        setError('Invalid credentials. Identity mesh rejecting access.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative w-full max-w-md rounded-[2.5rem] border overflow-hidden shadow-2xl",
          "bg-surface-container border-outline"
        )}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-primary transition-all"
        >
          <X size={24} />
        </button>

        <div className="p-10 pb-6 text-center">
          <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-[2rem] mx-auto flex items-center justify-center text-primary mb-6">
            <Shield size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-on-background">Platform Authority</h2>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-2">Wayta Ecosystem Command Center Login</p>
        </div>

        <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Authority ID</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} placeholder="Username"
                  className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm text-on-background outline-none focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Authority Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm text-on-background outline-none focus:border-primary transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-black uppercase text-error tracking-widest text-center"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full h-16 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>Initiate Sequence <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="p-6 bg-surface-container-high border-t border-outline flex items-center justify-center gap-4">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-[8px] font-black text-on-surface-variant/60 uppercase tracking-widest">
            End-to-End Encrypted Session • Pulse Mesh v2.4
          </p>
        </div>
      </motion.div>
    </div>
  );
};
