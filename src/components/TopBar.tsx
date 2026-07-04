import React from 'react';
import { Menu, Bell, Sun, Moon, QrCode, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WaytaLogo } from './WaytaLogo';
import { cn } from '../lib/utils';
import { User } from '../types';
import { NotificationBell } from './NotificationBell';

interface TopBarProps {
  onProfileClick: () => void;
  onMenuClick: () => void;
  onScanQR?: () => void;
  onAdminClick?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  sticky?: boolean;
  user?: User | null;
  isOffline?: boolean;
  venueName?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onProfileClick, 
  onMenuClick, 
  onScanQR,
  onAdminClick,
  theme, 
  onToggleTheme,
  sticky = true,
  user,
  isOffline = false,
  venueName
}) => {
  return (
    <header className={cn(
      "w-full z-50 border-b border-outline-variant h-16 flex justify-between items-center px-5 transition-all duration-300",
      sticky ? "sticky top-0 bg-background/60 backdrop-blur-xl" : "bg-background",
      "bg-opacity-80"
    )}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="w-9 h-9 bg-surface-container border border-outline rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-all">
          <WaytaLogo size={24} />
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-tight text-on-background uppercase font-display leading-tight">
            {venueName || 'Wayta'}
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold flex items-center gap-1.5">
             <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOffline ? "bg-amber-500" : "bg-tertiary")}></span>
             {isOffline ? (
               <span className="text-amber-500 font-bold uppercase tracking-tight text-[9px]">Offline Cache Active</span>
             ) : (
               "Local Network Active"
             )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user?.role === 'ADMIN' && onAdminClick && (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onAdminClick}
            className="h-10 px-3.5 flex items-center gap-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/35 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:bg-purple-500/20 active:scale-95 transition-all text-xs font-black uppercase tracking-wider"
            title="System Command Console"
          >
            <Shield size={16} className="animate-pulse" />
            <span className="hidden sm:inline">Admin</span>
          </motion.button>
        )}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onScanQR}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm active:scale-90 transition-all"
        >
          <QrCode size={20} />
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onToggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors text-on-surface-variant border border-outline/10 shadow-sm overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'dark' ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-secondary" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
        {user && <NotificationBell userId={user.uid} isDark={theme === 'dark'} />}
        <button id="nav-profile" onClick={onProfileClick} className="flex items-center gap-2 bg-surface-container rounded-xl pl-3 pr-1 py-1 border border-outline/10 active:scale-95 transition-all group">
          <div className="flex flex-col items-end mr-1">
             <span className="text-[8px] font-black uppercase tracking-widest text-primary leading-none mb-0.5">
               {user?.role || 'Guest'}
             </span>
             <span className="text-[7px] font-bold uppercase tracking-tight text-on-surface-variant leading-none">Terminal v2.4</span>
          </div>
          <div className="w-8 h-8 rounded-lg border border-outline overflow-hidden">
            <img 
              src={user?.photoURL || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80"} 
              alt="User" 
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
            />
          </div>
        </button>
      </div>
    </header>
  );
};
