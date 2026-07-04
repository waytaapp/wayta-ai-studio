import React, { useState, useEffect } from 'react';
import { Ticket as TicketIcon, Calendar, MapPin, QrCode, ArrowLeft, CheckCircle2, History, Sparkles, LayoutGrid, List, Search } from 'lucide-react';
import { Ticket } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { TicketQR } from '../components/TicketQR';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, collection, query, where, onSnapshot } from '../lib/firebase';

interface TicketsViewProps {
  tickets: Ticket[];
  onBack?: () => void;
  theme?: 'light' | 'dark';
}

export const TicketsView: React.FC<TicketsViewProps> = ({ tickets, onBack, theme = 'light' }) => {
  const [activeTab, setActiveTab] = useState<'valid' | 'used'>('valid');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [localTickets, setLocalTickets] = useState<Ticket[]>(tickets);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocalTickets(tickets);
      return;
    }
    const q = query(collection(db, 'tickets'), where('user_id', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      docs.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt as any).getTime()) : (new Date(a.timestamp || 0).getTime());
        const dateB = b.createdAt ? (typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt as any).getTime()) : (new Date(b.timestamp || 0).getTime());
        return dateB - dateA;
      });
      setLocalTickets(docs);
    }, (err) => {
      console.error("Failed to fetch tickets in real-time:", err);
    });
    return () => unsub();
  }, [tickets]);

  const searchFilteredTickets = localTickets.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const eventName = t.event_title || '';
    const ticketId = t.id || '';
    return eventName.toLowerCase().includes(term) || ticketId.toLowerCase().includes(term);
  });

  const filteredTickets = searchFilteredTickets.filter(t => {
    const status = (t.status || '').toLowerCase();
    if (activeTab === 'valid') {
      return status === 'valid' || status === 'active';
    } else {
      return status === 'used' || status === 'expired';
    }
  });

  return (
    <div className={cn("min-h-screen pb-32", theme === 'dark' ? "bg-background text-white" : "bg-background text-on-background")}>
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-3xl font-black uppercase tracking-tight">Admission Passes</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex p-1 bg-surface-container rounded-xl">
               <button 
                 onClick={() => setLayout('grid')}
                 className={cn(
                   "p-2 rounded-lg transition-all",
                   layout === 'grid' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
                 )}
               >
                 <LayoutGrid size={18} />
               </button>
               <button 
                 onClick={() => setLayout('list')}
                 className={cn(
                   "p-2 rounded-lg transition-all",
                   layout === 'list' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
                 )}
               >
                 <List size={18} />
               </button>
            </div>

            {/* Status Tabs */}
            <div className="flex p-1 bg-surface-container rounded-2xl max-w-sm">
              <button
                onClick={() => setActiveTab('valid')}
                className={cn(
                  "py-2.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'valid' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <CheckCircle2 size={12} /> Valid
              </button>
              <button
                onClick={() => setActiveTab('used')}
                className={cn(
                  "py-2.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'used' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <History size={12} /> Used
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Ticket Search Bar */}
        <div className="mb-8 relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/70" size={18} />
          <input 
            type="text"
            placeholder="Search passes by event name or pass ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-surface-container border border-outline rounded-2xl pl-12 pr-6 text-sm font-bold uppercase outline-none focus:border-primary transition-all text-on-background"
          />
        </div>

        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant opacity-50 space-y-4">
             <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center">
                <TicketIcon size={40} strokeWidth={1} />
             </div>
             <div className="text-center">
                 <p className="font-black uppercase text-xs tracking-widest">No {activeTab} tickets</p>
                 <p className="text-[10px] font-bold uppercase mt-1">Available passes will show up here</p>
             </div>
          </div>
        ) : (
          <div className={cn(
            layout === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-3"
          )}>
            {filteredTickets.map((ticket, idx) => {
              const statusStr = (ticket.status || '').toLowerCase();
              const displayStatus = statusStr === 'valid' || statusStr === 'active' ? 'Active' : (statusStr === 'used' ? 'Used' : 'Expired');

              return layout === 'grid' ? (
                <motion.div
                  key={`${(ticket as any).id ?? (ticket as any).uid ?? (ticket as any).name ?? idx}-${idx}-grid`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-surface-container-high border border-outline rounded-[2.5rem] overflow-hidden cursor-pointer hover:border-primary/50 transition-all group relative"
                >
                  <div className="relative h-40">
                     {ticket.event_image ? (
                       <img src={ticket.event_image} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105" alt="" />
                     ) : (
                       <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <TicketIcon className="text-primary" size={32} />
                       </div>
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent" />
                     <div className="absolute top-4 right-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md",
                          statusStr === 'valid' || statusStr === 'active' 
                            ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" 
                            : statusStr === 'used'
                              ? "bg-blue-500/20 text-blue-500 border-blue-500/30"
                              : "bg-red-500/20 text-red-500 border-red-500/30"
                        )}>
                          {displayStatus}
                        </span>
                     </div>
                  </div>
                  
                  <div className="p-6 relative">
                     {/* Points Badge */}
                     <div className="absolute -top-6 left-6 bg-primary text-on-primary px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl">
                        <Sparkles size={12} />
                        <span className="text-[10px] font-black uppercase">Admission Ticket</span>
                     </div>

                     <h3 className="font-black text-xl uppercase tracking-tight mb-4 group-hover:text-primary transition-colors line-clamp-1">{ticket.event_title}</h3>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <p className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Tier</p>
                           <p className="text-xs font-black uppercase truncate">{ticket.tier_name}</p>
                        </div>
                        <div className="space-y-1 text-right">
                           <p className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Date</p>
                           <p className="text-xs font-black uppercase truncate">{ticket.event_date}</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                           <p className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Venue</p>
                           <p className="text-xs font-black uppercase truncate">{ticket.venue_name || 'Main Arena'}</p>
                        </div>
                     </div>

                     <div className="mt-6 flex items-center justify-between pt-5 border-t border-dashed border-outline">
                        <div className="flex items-center gap-2">
                           <div className="w-10 h-10 rounded-xl bg-white border border-outline flex items-center justify-center p-0.5 overflow-hidden shadow-inner shrink-0">
                              <TicketQR 
                                ticketId={ticket.id} 
                                size={36}
                              />
                           </div>
                           <div className="text-left">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary block text-left">Tap to scan</span>
                              <span className="text-[8px] font-bold uppercase text-on-surface-variant">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                           </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center font-black text-sm">
                           →
                        </div>
                     </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`${(ticket as any).id ?? (ticket as any).uid ?? (ticket as any).name ?? idx}-${idx}-list`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-surface-container border border-outline rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-container-high transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    {ticket.event_image ? (
                       <img src={ticket.event_image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <TicketIcon className="text-primary" size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm uppercase tracking-tight truncate">{ticket.event_title}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                       <p className="text-[9px] font-black uppercase text-primary tracking-widest">{ticket.tier_name}</p>
                       <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{ticket.event_date}</p>
                       <span className="text-white/20">•</span>
                       <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest truncate max-w-[120px]">{ticket.venue_name || 'Main Arena'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                      statusStr === 'valid' || statusStr === 'active' 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25" 
                        : statusStr === 'used'
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/25"
                          : "bg-red-500/10 text-red-500 border-red-500/25"
                    )}>
                      {displayStatus}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white border border-outline flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-inner font-bold">
                       <TicketQR 
                         ticketId={ticket.id} 
                         size={28}
                       />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="bg-white text-black w-full max-w-sm md:max-w-4xl rounded-[3rem] overflow-hidden relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
               {/* Close button that is always accessible */}
               <button 
                 onClick={() => setSelectedTicket(null)}
                 className="absolute top-6 right-6 z-25 w-12 h-12 rounded-full bg-white border-2 border-black flex items-center justify-center hover:scale-110 transition-all text-black shadow-xl"
               >
                 <ArrowLeft size={24} />
               </button>

               <div className="grid grid-cols-1 md:grid-cols-[1.3fr_auto_1fr] overflow-hidden">
                 {/* Left Column: Details */}
                 <div className="flex flex-col">
                   {/* Ticket Top - Header */}
                   <div className="relative h-48 md:h-56">
                      {selectedTicket.event_image ? (
                        <img src={selectedTicket.event_image} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-surface-container" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                   </div>

                   {/* Ticket Details */}
                   <div className="p-8 md:p-10 pt-4 pb-10 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-2">
                         <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none text-zinc-900">{selectedTicket.event_title}</h2>
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2 bg-black/5 py-2 px-4 rounded-full w-fit">
                            <MapPin size={12} className="text-zinc-600" /> Entry Admission Pass
                         </p>
                      </div>

                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 py-6 border-y border-dashed border-zinc-300">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Class Type</p>
                            <p className="text-sm font-black uppercase tracking-tight text-zinc-800">{selectedTicket.tier_name}</p>
                         </div>
                         <div className="space-y-1 text-right">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Event Date</p>
                            <p className="text-sm font-black uppercase tracking-tight text-zinc-800">{selectedTicket.event_date}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Admit One</p>
                            <p className="text-sm font-black uppercase tracking-tight text-zinc-800">{selectedTicket.customer_name}</p>
                         </div>
                         <div className="space-y-1 text-right">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Value</p>
                            <p className="text-sm font-mono font-black text-zinc-850">{formatCurrency(selectedTicket.price)}</p>
                         </div>
                      </div>

                      {/* Mobile Showcase only */}
                      <div className="md:hidden flex flex-col items-center gap-6 pt-4">
                         <div className="relative group">
                            <div className="absolute -inset-4 bg-emerald-500/10 rounded-[3rem] blur-xl opacity-50 animate-pulse" />
                            <div className="p-6 bg-white border-4 border-black rounded-[2.5rem] relative shadow-2xl">
                               <TicketQR 
                                 ticketId={selectedTicket.id}
                                 size={180}
                               />
                            </div>
                         </div>
                         <div className="text-center space-y-2">
                            <div className="flex items-center gap-3 justify-center mb-1">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                               <p className="text-emerald-500 font-black text-sm uppercase tracking-[0.3em]">Valid Pass</p>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">#{selectedTicket.id.toUpperCase()}</p>
                         </div>
                      </div>
                   </div>
                 </div>

                 {/* Desktop Vertical Dash Divider */}
                 <div className="hidden md:flex flex-col justify-between py-1 relative w-px bg-transparent">
                    <div className="w-10 h-10 rounded-full bg-black/95 -ml-5 -mt-5 absolute top-0 z-10" />
                    <div className="h-full border-r-2 border-dashed border-zinc-200 mx-auto" />
                    <div className="w-10 h-10 rounded-full bg-black/95 -ml-5 -mb-5 absolute bottom-0 z-10" />
                 </div>

                 {/* Right Column: High-Resolution QR Code & Gate Target (Desktop only) */}
                 <div className="hidden md:flex flex-col items-center justify-center p-12 bg-zinc-50 border-l border-zinc-100 rounded-r-[3rem] relative">
                    <div className="absolute top-8 left-8 text-zinc-400 font-extrabold text-[10px] uppercase tracking-widest">Gate Scanner Target</div>
                    <div className="absolute bottom-8 right-8 text-zinc-400 font-extrabold text-[10px] uppercase tracking-widest">Entry Admit One</div>

                    <div className="relative group w-full flex flex-col items-center py-6">
                       <div className="absolute -inset-10 bg-emerald-500/10 rounded-[4rem] blur-3xl opacity-60 transition-all duration-1000 animate-pulse" />
                       
                       <div className="p-10 bg-white border-4 border-black rounded-[3.5rem] relative shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:rotate-1">
                          <TicketQR 
                            ticketId={selectedTicket.id}
                            size={250} // High-res, huge QR perfect for long range scanning
                          />
                       </div>

                       <div className="text-center mt-10 space-y-2">
                          <div className="flex items-center gap-3 justify-center mb-1">
                             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                             <p className="text-emerald-500 font-black text-sm uppercase tracking-[0.3em] font-sans">Valid Pass</p>
                          </div>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">#{selectedTicket.id.toUpperCase()}</p>
                       </div>
                    </div>
                 </div>
               </div>

               {/* Mobile Serrated Edges */}
               <div className="absolute left-0 right-0 py-2 top-[38%] md:hidden flex justify-between pointer-events-none px-0 transform translate-y-[50%]">
                  <div className="w-10 h-10 rounded-full bg-black/95 -ml-5 shadow-inner" />
                  <div className="w-10 h-10 rounded-full bg-black/95 -mr-5 shadow-inner" />
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
