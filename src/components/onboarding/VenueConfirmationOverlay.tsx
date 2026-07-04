import React from 'react';
import { motion } from 'motion/react';
import { Check, Info } from 'lucide-react';

export const VenueConfirmationOverlay: React.FC<{
  venueName: string;
  onConfirm: () => void;
}> = ({ venueName, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[200] flex items-center justify-center p-6">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container border border-outline rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl space-y-8"
        >
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                    <Info size={32} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Confirm Designation</h2>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Confirm your active session location.</p>
            </div>

            <div className="bg-background border border-outline p-6 rounded-3xl">
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Active Assignment</p>
                <p className="text-xl font-black text-primary uppercase">{venueName}</p>
            </div>
            
            <button 
               onClick={onConfirm}
               className="w-full h-14 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 flex items-center justify-center gap-2"
            >
               Confirm & Start Session <Check size={16} />
            </button>
        </motion.div>
    </div>
  );
};
