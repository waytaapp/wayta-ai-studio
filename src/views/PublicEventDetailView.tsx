import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Calendar, Clock, Ticket as TicketIcon, FileText, ChevronRight, Share2, Info, Users, ShieldCheck } from 'lucide-react';
import { Event } from '../types';
import { eventService } from '../services/eventService';
import { cn, formatCurrency } from '../lib/utils';

interface PublicEventDetailViewProps {
  eventId: string;
  onBack: () => void;
  onGetTickets: (eventId: string, tierName?: string) => void;
  theme?: 'light' | 'dark';
}

export const PublicEventDetailView: React.FC<PublicEventDetailViewProps> = ({ 
  eventId, 
  onBack, 
  onGetTickets,
  theme = 'dark' 
}) => {
  const isDark = theme === 'dark';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    eventService.getEventById(eventId).then((fetchedEvent) => {
      setEvent(fetchedEvent);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [eventId]);

  if (loading) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-background">
         <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
         <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Accessing Pulse Core...</p>
       </div>
     );
  }

  if (!event) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-6">
         <div className="w-20 h-20 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center text-red-500">
            <Info size={40} />
         </div>
         <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-on-background">Pulse Not Found</h1>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mt-2">The requested event has been decoupled from the mesh.</p>
         </div>
         <button onClick={onBack} className="h-14 px-8 bg-surface-container border border-outline rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
           Return to Mesh
         </button>
       </div>
     );
  }

  return (
    <div className={cn(
      "min-h-screen pb-32 transition-colors duration-500",
      isDark ? "bg-black text-white" : "bg-neutral-50 text-neutral-900"
    )}>
      {/* Immersive Header */}
      <div className="relative h-[50vh] md:h-[60vh] w-full">
         <div className="absolute top-6 left-6 z-50">
           <button 
            onClick={onBack} 
            className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10 text-white hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
           >
             <ArrowLeft size={20} />
           </button>
         </div>
         <div className="absolute top-6 right-6 z-50">
           <button className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10 text-white hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
             <Share2 size={18} />
           </button>
         </div>
         
         <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'} 
            className="w-full h-full object-cover" 
            alt={event.title} 
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
         
         <div className="absolute bottom-12 left-6 right-6 max-w-4xl mx-auto">
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
           >
             <div className="flex gap-2">
                <span className="bg-primary text-black text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md">{event.status || 'Active'}</span>
                <span className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md">{event.type || event.genre || 'Experience'}</span>
             </div>
             <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-white underline decoration-primary/30 decoration-8 underline-offset-4">{event.title}</h1>
             <p className="text-[12px] md:text-sm font-bold text-white/60 uppercase tracking-[0.3em] flex items-center gap-3">
                <MapPin size={16} className="text-primary" /> {event.venueName || event.location || 'Mesh Location'}
             </p>
           </motion.div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
        {/* Content Section */}
        <div className="lg:col-span-2 space-y-12">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className={cn(
               "p-6 rounded-3xl border flex items-center gap-4",
               isDark ? "bg-surface-container border-outline" : "bg-white border-neutral-200"
             )}>
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                   <Calendar size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Event Date</p>
                   <p className="text-sm font-black uppercase">{event.date}</p>
                </div>
             </div>
             <div className={cn(
               "p-6 rounded-3xl border flex items-center gap-4",
               isDark ? "bg-surface-container border-outline" : "bg-white border-neutral-200"
             )}>
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                   <Clock size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Time Sync</p>
                   <p className="text-sm font-black uppercase">{event.time || `${event.startTime} - ${event.endTime}`}</p>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
               <FileText className="text-primary" size={24} /> Pulse Description
             </h3>
             <div className={cn(
               "p-8 rounded-[2.5rem] border leading-relaxed space-y-4",
               isDark ? "bg-surface-container/40 border-outline/50" : "bg-white border-neutral-200 shadow-sm"
             )}>
               <p className="text-on-surface-variant font-medium">
                 {event.description || "Immerse yourself in a sonic landscape designed for the mesh. Featuring curated talent and technical precision, this experience redefined what live means. Prepare for high-intensity vibes and zero friction access."}
               </p>
               <div className="flex flex-wrap gap-2 pt-4">
                  {['Curated Lineup', 'Fast Entry', 'Cashless Mesh', 'Premium Vibes'].map(tag => (
                    <span key={tag} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-outline/20 opacity-60 bg-surface-container">
                      {tag}
                    </span>
                  ))}
               </div>
             </div>
          </div>

          {/* Lineup / Schedule if available */}
          <div className="space-y-6">
             <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
               <Users className="text-primary" size={24} /> Talent Lineup
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="space-y-3 group cursor-pointer">
                    <div className="aspect-square rounded-3xl border border-outline overflow-hidden">
                       <img src={`https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&w=400&q=80&sig=${i}`} className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0 group-hover:scale-110" alt="Artist" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-center group-hover:text-primary transition-colors">Talent ID 0{i}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Action / Ticketing Section */}
        <div className="space-y-8">
           <div className={cn(
             "p-8 rounded-[3rem] border sticky top-12 space-y-8 shadow-2xl",
             isDark ? "bg-surface-container border-outline shadow-primary/5" : "bg-white border-neutral-200 shadow-xl"
           )}>
              <div className="flex flex-col gap-2">
                 <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Access Matrix</h3>
                 <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-80">Select your entry tier</p>
              </div>

              <div className="space-y-3">
                 {event.ticketTiers && event.ticketTiers.length > 0 ? (
                   event.ticketTiers.map((tier, idx) => (
                     <div 
                      key={tier.id || `tier-${idx}-${tier.name}`}
                      onClick={() => onGetTickets(event.id, tier.name)}
                      className={cn(
                        "p-5 rounded-2xl border transition-all cursor-pointer group active:scale-95",
                        isDark ? "bg-background border-outline hover:border-primary/50" : "bg-neutral-50 border-neutral-200 hover:border-primary/50"
                      )}
                     >
                        <div className="flex justify-between items-start mb-2">
                           <span className="font-black uppercase tracking-tighter text-sm">{tier.name}</span>
                           <span className="font-mono font-black text-primary">{formatCurrency(tier.price)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <div className="flex gap-1">
                              {[1,2,3].map(s => <div key={s} className={cn("w-1 h-3 rounded-full", s <= 3-idx ? "bg-primary" : "bg-outline/20")} />)}
                           </div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                             {tier.capacity - tier.sold < 20 ? `ALMOST OUT! (${tier.capacity - tier.sold} remaining)` : `${tier.capacity - tier.sold} Available`}
                           </p>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="py-12 border border-dashed border-outline rounded-2xl text-center opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No digital access keys <br/> registered for this gate.</p>
                   </div>
                 )}
              </div>

              <div className="space-y-4 pt-4">
                 <button 
                  onClick={() => onGetTickets(event.id)}
                  className="w-full h-20 bg-primary text-black rounded-3xl font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all hover:shadow-primary/30"
                 >
                    Get Pulse Access <ChevronRight size={20} />
                 </button>
                 <div className="flex items-center justify-center gap-2 opacity-50">
                    <ShieldCheck size={14} className="text-primary" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Secured by Wayta Mesh Protocol</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
