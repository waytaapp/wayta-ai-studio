import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info } from 'lucide-react';

interface GuidanceOverlayProps {
  id: string;
  title: string;
  instruction: string;
  onClose: () => void;
}

export const GuidanceOverlay: React.FC<GuidanceOverlayProps> = ({ id, title, instruction, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(`guidance_dismissed_${id}`);
    if (!isDismissed) {
      setShow(true);
    }
  }, [id]);

  const handleDismiss = () => {
    localStorage.setItem(`guidance_dismissed_${id}`, 'true');
    setShow(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-6 right-6 z-[200] p-6 bg-surface-container border border-outline rounded-3xl shadow-2xl flex gap-4 items-start"
        >
          <div className="text-primary mt-1">
            <Info size={24} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-black uppercase text-on-surface">{title}</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">{instruction}</p>
            <button 
              onClick={handleDismiss}
              className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2"
            >
              Don't show again
            </button>
          </div>
          <button onClick={() => setShow(false)} className="text-on-surface-variant">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
