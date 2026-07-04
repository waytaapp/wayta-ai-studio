import React from 'react';
import { ShoppingBag, Zap, Wifi, WifiOff, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ServiceStaffFABProps {
  onToggleTerminal: () => void;
  onToggleSimulatedOffline: () => void;
  onOpenScanner: () => void;
  isSimulatedOffline: boolean;
  theme?: 'light' | 'dark';
}

export const ServiceStaffFAB: React.FC<ServiceStaffFABProps> = ({
  onToggleTerminal,
  onToggleSimulatedOffline,
  onOpenScanner,
  isSimulatedOffline,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 right-6 sm:bottom-8 z-[100] flex flex-col gap-3"
    >
        <button
            onClick={onOpenScanner}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border-2",
              "bg-background border-outline text-on-surface hover:border-primary"
            )}
        >
            <QrCode size={24} />
        </button>
        <button
            onClick={onToggleSimulatedOffline}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border-2",
              isSimulatedOffline 
                ? "bg-amber-500 border-black text-black" 
                : "bg-surface-container border-outline text-on-surface"
            )}
        >
            {isSimulatedOffline ? <WifiOff size={24} /> : <Wifi size={24} />}
        </button>
        <button
            onClick={onToggleTerminal}
            className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border-2",
                "bg-primary border-black text-black"
            )}
        >
            <ShoppingBag size={24} />
        </button>
    </motion.div>
  );
};
