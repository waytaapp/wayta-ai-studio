import React, { useState } from 'react';
import { ShieldCheck, Phone, AlertTriangle, Send, ChevronDown, Droplet, UserCheck, Zap, Hand } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const SafetyView: React.FC = () => {
  const [isPressing, setIsPressing] = useState(false);
  const [reportType, setReportType] = useState('');

  return (
    <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-500 pb-32 bg-background lg:max-w-2xl lg:mx-auto">
      <header className="flex justify-between items-center bg-surface-container p-5 rounded-2xl border border-outline shadow-xl">
        <div className="flex gap-4 items-center">
           <div className="relative">
              <ShieldCheck className="text-primary" size={28} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background shadow-lg" />
           </div>
           <div>
              <h2 className="text-sm font-black text-on-background uppercase tracking-widest leading-none">Security Status</h2>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-1.5">Alpha Patrol Active • SANDTON Central</p>
           </div>
        </div>
      </header>

      {/* SOS Button */}
      <section className="flex flex-col items-center justify-center py-8 gap-8">
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Pulsing Backdrops */}
            <div className="absolute inset-0 bg-error/5 rounded-full animate-ping" />
            <div className="absolute inset-4 bg-error/10 rounded-full animate-pulse" />
            
            <motion.button
              onPointerDown={() => setIsPressing(true)}
              onPointerUp={() => setIsPressing(false)}
              onPointerLeave={() => setIsPressing(false)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative w-52 h-52 rounded-full flex flex-col items-center justify-center gap-2 border-[1px] transition-all duration-300 shadow-2xl",
                isPressing 
                  ? "bg-error text-white border-white/20 scale-95 amber-glow" 
                  : "bg-surface-container text-on-background border-outline"
              )}
            >
              <AlertTriangle size={48} className={cn("transition-all duration-500", isPressing ? "scale-110" : "text-error opacity-80")} />
              <span className="text-[12px] font-black tracking-[0.4em] uppercase mt-2">Trigger SOS</span>
              {isPressing && (
                <div className="absolute inset-0 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              )}
            </motion.button>
        </div>

        <p className="text-center text-on-surface-variant font-bold px-8 text-[11px] uppercase tracking-widest leading-relaxed">
          Hold for 3 seconds to broadcast your <span className="text-on-background">GPS COORDS</span> to the venue security mesh.
        </p>
      </section>

      {/* Emergency Contacts Grid */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">Mesh Support</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container p-5 rounded-2xl border border-outline shadow-xl flex flex-col gap-4">
             <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-amber-500/50"><Droplet size={18} /></div>
             <div>
                <p className="text-xs font-black text-on-background uppercase tracking-widest">Medical</p>
                <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mt-1">Ready • Sector A</p>
             </div>
             <a href="tel:911" className="w-full h-11 bg-surface border border-outline text-on-surface-variant rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors leading-none">
               <Phone size={14} /> Call
             </a>
          </div>
          <div className="bg-surface-container p-5 rounded-2xl border border-outline shadow-xl flex flex-col gap-4">
             <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-emerald-500/50"><UserCheck size={18} /></div>
             <div>
                <p className="text-xs font-black text-on-background uppercase tracking-widest">Floor Spec</p>
                <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mt-1">Patrolling • Table 42</p>
             </div>
             <a href="tel:10111" className="w-full h-11 bg-surface border border-outline text-on-surface-variant rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors leading-none">
               <Phone size={14} /> Call
             </a>
          </div>
        </div>
      </section>

      {/* Incident Reporting */}
      <section className="bg-surface-container p-8 rounded-3xl border border-outline shadow-2xl space-y-6">
        <div className="flex gap-4 items-start">
           <AlertTriangle className="text-on-surface-variant opacity-50 mt-0.5" size={20} />
           <div>
              <h3 className="text-lg font-black text-on-background tracking-tight uppercase">Silent Report</h3>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase leading-relaxed tracking-wider mt-1">Anonymous submission tracked via POPIA standards.</p>
           </div>
        </div>

        <div className="space-y-4">
           <div className="relative">
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full h-14 bg-surface border border-outline rounded-xl px-4 font-bold text-[11px] uppercase tracking-widest text-on-background appearance-none focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              >
                <option value="">Status Code</option>
                <option value="medical">Medical Priority</option>
                <option value="security">Security Alert</option>
                <option value="theft">Asset Recovery</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-50 pointer-events-none" size={16} />
           </div>

           <textarea 
             placeholder="SITUATION BRIEFING..."
             className="w-full p-4 bg-surface border border-outline rounded-xl min-h-[100px] font-bold text-[11px] uppercase tracking-widest text-on-background focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-30"
           />

           <button className="w-full h-14 bg-primary text-on-primary font-black uppercase tracking-[0.3em] text-[10px] rounded-xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all amber-glow leading-none">
              <Send size={16} />
              Transmit Report
           </button>
        </div>
      </section>

      <div className="bg-surface-container border border-outline py-3 px-6 rounded-2xl flex items-center gap-3">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant italic">Bandwidth prioritised for SOS broadcast.</p>
      </div>
    </div>
  );
};
