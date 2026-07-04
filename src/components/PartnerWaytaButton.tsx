import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface PartnerWaytaButtonProps {
  onClick: () => void;
  className?: string;
}

export const PartnerWaytaButton: React.FC<PartnerWaytaButtonProps> = ({ onClick, className }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "h-14 bg-surface-container-high border-2 border-outline rounded-2xl flex items-center justify-center gap-3 group transition-all active:scale-[0.98] hover:border-primary/80 relative overflow-hidden group/btn",
        "before:absolute before:inset-0 before:bg-primary/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        className
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/btn:scale-110 transition-transform">
        <Plus size={16} strokeWidth={3} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-background group-hover/btn:tracking-[0.3em] transition-all">Partner with wayta</span>
    </button>
  );
};
