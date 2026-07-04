import React from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AdminFABProps {
  onOpenAdmin: () => void;
  theme?: 'light' | 'dark';
}

export const AdminFAB: React.FC<AdminFABProps> = ({
  onOpenAdmin,
  theme = 'dark'
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-24 left-6 sm:bottom-8 z-[100]"
    >
        <button
            onClick={onOpenAdmin}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border-2",
              "bg-black border-yellow-500 text-yellow-400 hover:scale-[1.05] hover:border-yellow-300"
            )}
            title="Enter Wayta Global Administration Console"
        >
            <Shield size={24} />
        </button>
    </motion.div>
  );
};
