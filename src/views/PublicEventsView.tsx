import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Tag, ArrowRight, Search, SlidersHorizontal, Clock, Building2, Store } from 'lucide-react';
import { Event, Venue } from '../types';
import { eventService } from '../services/eventService';
import { venueService } from '../services/venueService';
import { cn } from '../lib/utils';
import { WaytaLogo } from '../components/WaytaLogo';

interface PublicEventsViewProps {
  onViewDetails: (eventId: string) => void;
  onLogin: () => void;
  theme?: 'light' | 'dark';
}

export const PublicEventsView: React.FC<PublicEventsViewProps> = ({ 
  onViewDetails, 
  onLogin,
  theme = 'dark' 
}) => {
  const isDark = theme === 'dark';
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'venues'>('events');

  useEffect(() => {
    setLoading(true);
    const unsubEvents = eventService.listenToAllEventsFirestore((allEvents) => {
      const filtered = allEvents.filter(e => e.status !== 'Past' && e.status !== 'Cancelled');
      setEvents(filtered);
    });

    const unsubVenues = venueService.listenToVenuesFirestore((allVenues) => {
      setVenues(allVenues);
      setLoading(false);
    });

    return () => {
      unsubEvents();
      unsubVenues();
    };
  }, []);

  const genres = Array.from(new Set(events.map(e => e.type || e.genre).filter(Boolean)));

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.venueName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !activeGenre || (e.type || e.genre) === activeGenre;
    return matchesSearch && matchesGenre;
  });

  const filteredVenues = venues.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(
      "min-h-screen pb-32 transition-colors duration-500",
      isDark ? "bg-black text-white" : "bg-neutral-50 text-neutral-900"
    )}>
      {/* Top Header / Nav */}
      <div className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <WaytaLogo size={32} />
          <div className="hidden md:block h-6 w-px bg-white/10 mx-2" />
          <p className="hidden md:block text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Live Mesh Dashboard</p>
        </div>
        <button 
          onClick={onLogin}
          className="h-10 px-6 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          Access Portal
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative h-[60vh] md:h-[75vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80" 
            className="w-full h-full object-cover opacity-40 scale-110 blur-[2px]"
            alt="Crowd"
          />
          <div className={cn(
            "absolute inset-0 bg-gradient-to-b",
            isDark ? "from-black/20 via-black/40 to-black" : "from-black/10 via-neutral-50/40 to-neutral-50"
          )} />
        </div>

        <div className="relative z-10 text-center px-6 space-y-6 max-w-2xl mt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md mb-4"
          >
             <p className="text-primary text-[8px] font-black uppercase tracking-[0.3em]">The Digital Mesh Experience</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-[calc(-0.05em)] leading-[0.8] mb-4">
              Access the <br/><span className="text-primary">Experience</span>
            </h1>
            <p className={cn(
              "text-xs md:text-sm font-black uppercase tracking-[0.4em] opacity-60 mt-6",
              isDark ? "text-white" : "text-black"
            )}>
              Discovery • Beats • Cashless Mesh
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
        {/* Main Control Panel */}
        <div className={cn(
          "p-8 rounded-[3rem] border shadow-2xl backdrop-blur-3xl mb-12",
          isDark ? "bg-surface-container/60 border-outline shadow-black/60" : "bg-white/60 border-neutral-200"
        )}>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={24} />
                <input 
                  type="text"
                  placeholder="Search events, venues, vibes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-16 bg-background/50 border border-outline rounded-[1.5rem] pl-14 pr-6 text-sm font-bold placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-all"
                />
              </div>
              
              <div className="bg-background/40 p-1.5 rounded-[1.5rem] border border-outline flex gap-1 h-16 shrink-0 md:w-64">
                <button
                  onClick={() => setActiveTab('events')}
                  className={cn(
                    "flex-1 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest",
                    activeTab === 'events' ? "bg-primary text-black" : "text-on-surface-variant hover:bg-white/5"
                  )}
                >
                  <Calendar size={14} />
                  Events
                </button>
                <button
                  onClick={() => setActiveTab('venues')}
                  className={cn(
                    "flex-1 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest",
                    activeTab === 'venues' ? "bg-primary text-black" : "text-on-surface-variant hover:bg-white/5"
                  )}
                >
                  <Building2 size={14} />
                  Venues
                </button>
              </div>
            </div>

            {activeTab === 'events' && genres.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                  onClick={() => setActiveGenre(null)}
                  className={cn(
                    "h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border",
                    !activeGenre ? "bg-primary text-black border-primary" : "bg-background border-outline text-on-surface-variant hover:border-primary/50"
                  )}
                >
                  All Pulsing
                </button>
                {genres.map(genre => (
                  <button 
                    key={genre}
                    onClick={() => setActiveGenre(genre)}
                    className={cn(
                      "h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border",
                      activeGenre === genre ? "bg-primary text-black border-primary" : "bg-background border-outline text-on-surface-variant hover:border-primary/50"
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'events' ? (
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
               <h2 className="text-2xl font-black uppercase tracking-tight italic">Live Pulses</h2>
               <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{filteredEvents.length} Active</p>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-60">Scanning Pulse Mesh...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map((event, i) => (
                  <motion.div
                    key={`${event.id || 'event'}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "group rounded-[3rem] border overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2",
                      isDark ? "bg-surface-container border-outline hover:border-primary/30" : "bg-white border-neutral-200 hover:border-primary/30"
                    )}
                  >
                    <div className="relative h-64 overflow-hidden">
                       <img 
                        src={event.image || 'https://images.unsplash.com/photo-1514525253361-bee2348b3b64?auto=format&fit=crop&w=800&q=80'} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt={event.title}
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                       <div className="absolute top-6 right-6 bg-primary text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                          {event.status || 'Live'}
                       </div>
                    </div>

                    <div className="p-8 space-y-6">
                      <div className="space-y-2">
                        <span className="text-primary text-[10px] font-black uppercase tracking-widest">{event.type || event.genre || 'Event'}</span>
                        <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">{event.title}</h3>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                           <MapPin size={12} className="text-primary" /> {event.venueName || 'Main Stage'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-outline/30 pt-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Calendar size={14} className="text-primary/60" />
                            <p className="text-[10px] font-black uppercase tracking-widest">{event.date}</p>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Clock size={14} className="text-primary/60" />
                            <p className="text-[10px] font-black uppercase tracking-widest">{event.startTime} - {event.endTime}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onViewDetails(event.id)}
                          className="h-14 w-14 bg-primary text-black rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                          <ArrowRight size={24} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState onReset={() => { setSearchQuery(''); setActiveGenre(null); }} />
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
               <h2 className="text-2xl font-black uppercase tracking-tight italic">Partner Venues</h2>
               <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{filteredVenues.length} Online</p>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-60">Locating Partners...</p>
              </div>
            ) : filteredVenues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredVenues.map((venue, i) => (
                  <motion.div
                    key={`${venue.id || 'venue'}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "group rounded-[3rem] border overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2",
                      isDark ? "bg-surface-container border-outline hover:border-primary/30" : "bg-white border-neutral-200 hover:border-primary/30"
                    )}
                  >
                    <div className="relative h-48 overflow-hidden">
                       <img 
                        src={venue.image || 'https://images.unsplash.com/photo-1514525253361-bee2348b3b64?auto=format&fit=crop&w=800&q=80'} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
                        alt={venue.name}
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="p-8 space-y-6">
                      <div className="space-y-2">
                        <span className="text-primary text-[10px] font-black uppercase tracking-widest">{venue.type}</span>
                        <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">{venue.name}</h3>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                           <MapPin size={12} className="text-primary" /> {venue.location}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-outline/30 pt-6">
                        <div className="flex -space-x-3">
                           {[1,2,3,4].map(num => (
                             <div key={`user-${num}-${venue.id || i}`} className="w-8 h-8 rounded-full border-2 border-background bg-surface-container flex items-center justify-center overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${num+10}`} alt="User" />
                             </div>
                           ))}
                           <div className="w-8 h-8 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[8px] font-black text-black">
                              +24
                           </div>
                        </div>
                        <button 
                          onClick={onLogin}
                          className="px-6 h-12 bg-white/5 border border-outline rounded-xl font-black text-[9px] uppercase tracking-widest text-on-surface hover:bg-primary hover:text-black hover:border-primary transition-all"
                        >
                          Join Mesh
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState onReset={() => { setSearchQuery(''); }} />
            )}
          </div>
        )}
      </div>

      <footer className="mt-48 py-24 border-t border-outline/10 text-center space-y-8 bg-surface-container-low/30">
         <div className="flex justify-center gap-8 mb-4">
            <WaytaLogo size={40} className="grayscale opacity-20" />
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-30 px-6">Wayta Live Mesh • Access the Experience • v2.4.0</p>
         <div className="flex justify-center gap-12 text-[8px] font-black uppercase tracking-widest opacity-20">
            <span className="cursor-pointer hover:opacity-100 transition-opacity">Privacy Shield</span>
            <span className="cursor-pointer hover:opacity-100 transition-opacity">Mesh Protocols</span>
            <span className="cursor-pointer hover:opacity-100 transition-opacity">Legal Node</span>
         </div>
      </footer>
    </div>
  );
};

const EmptyState = ({ onReset }: { onReset: () => void }) => (
  <div className="text-center py-24 space-y-6">
    <div className="w-24 h-24 bg-surface-container rounded-[2rem] flex items-center justify-center mx-auto text-on-surface-variant/20 border border-outline/10">
       <Store size={48} />
    </div>
    <div>
      <p className="text-xl font-black uppercase tracking-tight">No Entities Detected</p>
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mt-2">The selected coordinates returned null result.</p>
    </div>
    <button onClick={onReset} className="h-12 px-8 bg-primary/10 text-primary border border-primary/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-all">Reset Matrix Scan</button>
  </div>
);
