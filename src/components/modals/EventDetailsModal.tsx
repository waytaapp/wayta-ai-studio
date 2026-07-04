import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, MapPin, Users, ExternalLink, Sparkles, LayoutDashboard } from 'lucide-react';
import { Event } from '../../types';
import { cn } from '../../lib/utils';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onManage: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ isOpen, onClose, event, onManage }) => {
  if (!event) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-surface-container border border-outline rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="relative h-48">
              <img 
                src={event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                className="w-full h-full object-cover grayscale opacity-50" 
                alt="" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors text-white backdrop-blur-sm"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-4 left-6">
                <span className="bg-primary text-black px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  {event.status}
                </span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-2 leading-tight">{event.title}</h2>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background border border-outline rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Date</p>
                    <p className="text-xs font-bold uppercase">{event.date}</p>
                  </div>
                </div>
                <div className="p-4 bg-background border border-outline rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Timeline</p>
                    <p className="text-xs font-bold uppercase">{event.time || `${event.startTime} - ${event.endTime}`}</p>
                  </div>
                </div>
                <div className="p-4 bg-background border border-outline rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Registered</p>
                    <p className="text-xs font-bold uppercase">{event.ticketsSold || 0} / {event.ticketsTotal || '∞'}</p>
                  </div>
                </div>
                <div className="p-4 bg-background border border-outline rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Type</p>
                    <p className="text-xs font-bold uppercase">{event.genre || 'ACTIVATION'}</p>
                  </div>
                </div>
              </div>

              {event.budget && (
                <div className="p-4 bg-background border border-outline rounded-2xl">
                   <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Internal Budget Allocation</p>
                   <p className="font-mono text-sm font-bold text-primary">R {Number(event.budget).toLocaleString()}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Vibe Protocol</p>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">{event.description || 'No activation briefing provided.'}</p>
              </div>
            </div>

            <div className="p-6 border-t border-outline flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 h-12 rounded-xl border border-outline font-black text-[10px] uppercase tracking-widest hover:bg-background transition-colors"
              >
                Close
              </button>
              <button 
                onClick={onManage}
                className="flex-[2] h-12 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <LayoutDashboard size={16} />
                Event Dashboard
                <ExternalLink size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
