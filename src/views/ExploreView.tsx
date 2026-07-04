import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Star, QrCode, MessageSquare, Map as MapIcon, Grid, Sparkles, Wand2, ArrowUpDown, ChevronDown, Ticket, Calendar, ArrowRight } from 'lucide-react';
import { Venue, Event } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { geminiService } from '../services/geminiService';
import { eventService } from '../services/eventService';
import { venueService } from '../services/venueService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { BudgetDialog } from '../components/forms/BudgetDialog';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const waytaMarkerIcon = L.divIcon({
  className: 'wayta-marker',
  html: `<div class="marker-pin"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

interface ExploreViewProps {
  venues: Venue[];
  onSelectVenue: (venue: Venue, initialTab?: string, eventId?: string) => void;
  onSelectEvent?: (eventId: string) => void;
  onScanQR: () => void;
  spent: number;
  budget: number;
  onUpdateBudget: (newBudget: number) => void;
  userEmail?: string;
  user?: import('../types').User | null;
  theme?: 'light' | 'dark';
}

export const ExploreView: React.FC<ExploreViewProps> = ({ 
  venues, 
  onSelectVenue, 
  onSelectEvent,
  onScanQR,
  spent,
  budget,
  onUpdateBudget,
  userEmail = 'patron@wayta.co.za',
  theme = 'dark'
}) => {
  const fallbackVenueImage = 'https://images.unsplash.com/photo-1514525253344-f2526284414a?auto=format&fit=crop&w=800&q=80';
  const fallbackEventImage = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'distance'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Club' | 'Festival' | 'Bar' | 'Lounge'>('All');
  const [filterEventStatus, setFilterEventStatus] = useState<'All' | 'Active' | 'Upcoming'>('All');

  const [vibePrompt, setVibePrompt] = useState('');
  const [vibeSuggestion, setVibeSuggestion] = useState<string | null>(null);
  const [isVibeLoading, setIsVibeLoading] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (venues.length === 0) return;

    // Aggregated listener for the first few venues to show "Featured Experience"
    const unsubs: (() => void)[] = [];
    const eventsMap: Record<string, Event> = {};

    venues.slice(0, 3).forEach(venue => {
      const unsub = eventService.listenToEvents(venue.id, (venueEvents) => {
        venueEvents.forEach(e => {
          eventsMap[e.id] = e;
        });
        const deduplicated = Object.values(eventsMap);
        setFeaturedEvents(deduplicated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 4));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [venues]);

  const handleGetVibeSuggestion = async () => {
    if (!vibePrompt) return;
    setIsVibeLoading(true);
    const suggestion = await geminiService.getVibeSuggestion(vibePrompt, 'Nightclub/Festival');
    setVibeSuggestion(suggestion);
    setIsVibeLoading(false);
  };

  const parseDistance = (dist: string) => {
    const numeric = parseFloat(dist.replace(/[^\d.-]/g, ''));
    return isNaN(numeric) ? 0 : numeric;
  };

  const [selectedCategory, setSelectedCategory] = useState<'Featured' | 'Venues' | 'Events'>('Featured');
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  useEffect(() => {
    const unsubscribe = venueService.listenToAllEvents((events) => {
      setAllEvents(events);
    });
    return () => unsubscribe();
  }, []);

  const filteredVenues = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let results = [...venues];

    if (query) {
      results = results.filter(venue => 
        (venue.name || '').toLowerCase().includes(query) ||
        (venue.location || '').toLowerCase().includes(query) ||
        (venue.type || '').toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory === 'Featured') {
      results = results.filter(v => v.rating >= 4.7);
    }

    // Filter by venue type
    if (filterType !== 'All') {
      results = results.filter(venue => venue.type?.toLowerCase() === filterType.toLowerCase());
    }

    // Filter by event status
    if (filterEventStatus !== 'All') {
      results = results.filter(venue => {
        const venueEvents = allEvents.filter(e => e.venueId === venue.id);
        const now = new Date();
        
        if (filterEventStatus === 'Active') {
          return venueEvents.some(e => {
            const date = new Date(e.date);
            const isToday = date.toDateString() === now.toDateString();
            return isToday; // Simple check for "Active" events being today
          });
        }
        
        if (filterEventStatus === 'Upcoming') {
          return venueEvents.some(e => new Date(e.date) > now);
        }
        
        return true;
      });
    }

    // Sorting logic
    results.sort((a, b) => {
      let valA: number;
      let valB: number;

      if (sortBy === 'rating') {
        valA = a.rating;
        valB = b.rating;
      } else {
        valA = parseDistance(a.distance);
        valB = parseDistance(b.distance);
      }

      if (sortOrder === 'asc') {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });

    return results;
  }, [venues, searchQuery, sortBy, sortOrder, selectedCategory]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let results = [...allEvents];

    if (query) {
      results = results.filter(event => 
        (event.title || '').toLowerCase().includes(query) ||
        (event.genre || '').toLowerCase().includes(query)
      );
    }

    return results;
  }, [allEvents, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto w-full p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 bg-background text-on-background">
      <header className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-primary font-black text-xs uppercase tracking-[0.4em]">Pulse Finder</span>
            <h2 className="text-3xl md:text-5xl font-black flex items-baseline gap-2 text-on-background transition-all">
              Wayta
            </h2>
          </div>
          <div className="flex gap-4">
            <div 
              id="budget-tracker" 
              onClick={() => setShowBudgetDialog(true)}
              className={cn(
                "bg-surface-container border rounded-2xl px-6 py-3 flex flex-col items-end shadow-2xl cursor-pointer transition-all active:scale-95 group relative overflow-hidden",
                budget > 0 && (spent / budget) > 0.8 ? "border-red-500/50" : "border-outline hover:border-primary"
              )}
            >
              {budget > 0 && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-primary/20"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (spent / budget) * 100)}%` }}
                  transition={{ duration: 1 }}
                />
              )}
              {budget > 0 && (spent / budget) > 0.8 && (
                <motion.div 
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-red-500 pointer-events-none"
                />
              )}
              <span className="text-xs font-black uppercase text-on-surface-variant tracking-[0.2em] mb-1 group-hover:text-primary transition-colors relative z-10">Party Budget</span>
              <span className={cn(
                "text-xl font-mono font-bold tracking-tighter relative z-10",
                budget > 0 && (spent / budget) > 0.9 ? "text-red-500" : 
                budget > 0 && (spent / budget) > 0.7 ? "text-orange-500" : "text-emerald-500"
              )}>
                R {(budget - spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <BudgetDialog 
          isOpen={showBudgetDialog}
          onClose={() => setShowBudgetDialog(false)}
          currentBudget={budget}
          onUpdate={onUpdateBudget}
        />

        {/* Tap-to-Table Entry Point Simulation */}
        <button 
          id="qr-scan-trigger"
          onClick={onScanQR}
          className="w-full h-24 bg-primary/5 border-2 border-dashed border-primary/20 rounded-3xl flex items-center justify-center gap-6 group active:scale-[0.97] transition-all overflow-hidden relative"
        >
           <motion.div 
             animate={{ 
               opacity: [0, 0.1, 0],
               scale: [1, 1.2, 1]
             }}
             transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
             className="absolute inset-0 bg-primary"
           />
           <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className="relative">
             <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
             <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-black shadow-2xl shadow-primary/30 relative z-10 transition-transform group-hover:scale-110">
                <QrCode size={28} />
             </div>
           </div>
           <div className="text-left relative z-10">
              <p className="text-xs font-black text-on-background uppercase tracking-[0.2em] mb-1">Tap-to-Table</p>
              <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] opacity-80 group-hover:opacity-100 transition-opacity">Instant Entry Sync</p>
           </div>
           <div className="ml-auto mr-6 relative z-10">
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <ArrowRight size={20} className="text-primary/40 group-hover:text-primary transition-colors" />
              </motion.div>
           </div>
        </button>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative group flex-1" id="venue-selector">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search venue, location, or vibe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-24 bg-surface-container border border-outline rounded-xl focus:ring-1 focus:ring-primary/50 shadow-inner transition-all text-sm text-on-background placeholder:text-on-surface-variant/50"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="h-12 px-4 bg-surface-container border border-outline rounded-xl text-[10px] font-black uppercase tracking-widest text-on-background outline-none appearance-none cursor-pointer pr-10 min-w-[120px]"
              >
                <option value="All">All Types</option>
                <option value="Club">Club</option>
                <option value="Festival">Festival</option>
                <option value="Bar">Bar</option>
                <option value="Lounge">Lounge</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <select 
                value={filterEventStatus}
                onChange={(e) => setFilterEventStatus(e.target.value as any)}
                className="h-12 px-4 bg-surface-container border border-outline rounded-xl text-[10px] font-black uppercase tracking-widest text-on-background outline-none appearance-none cursor-pointer pr-10 min-w-[140px]"
              >
                <option value="All">All Status</option>
                <option value="Active">Active Now</option>
                <option value="Upcoming">Upcoming</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={14} />
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="h-12 px-6 bg-surface-container border border-outline rounded-xl flex items-center gap-3 text-xs font-black uppercase tracking-widest text-on-background hover:bg-surface-container-high transition-all"
            >
              <ArrowUpDown size={16} className="text-primary" />
              <span>Sort: {sortBy} ({sortOrder})</span>
              <ChevronDown size={18} className={cn("transition-transform duration-300", isSortOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-surface-container border border-outline rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Sort By</div>
                      {[
                        { id: 'rating', label: 'Rating' },
                        { id: 'distance', label: 'Distance' }
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortBy(option.id as any);
                            setIsSortOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors",
                            sortBy === option.id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                      
                      <div className="h-px bg-outline/20 my-1mx-2" />
                      
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Order</div>
                      {[
                        { id: 'asc', label: 'Ascending' },
                        { id: 'desc', label: 'Descending' }
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortOrder(option.id as any);
                            setIsSortOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors",
                            sortOrder === option.id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

        <section id="venue-grid" className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="flex space-x-2">
            {(['Featured', 'Venues', 'Events'] as const).map((cat) => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 font-bold rounded-full text-xs uppercase tracking-widest leading-none transition-all",
                  selectedCategory === cat 
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                    : "bg-surface-container border border-outline text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex bg-surface-container p-1 rounded-xl border border-outline shadow-inner">
             <button 
               onClick={() => setViewMode('grid')}
               className={cn(
                 "p-2 rounded-lg transition-all",
                 viewMode === 'grid' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant opacity-50"
               )}
             >
                <Grid size={16} />
             </button>
             <button 
               onClick={() => setViewMode('map')}
               className={cn(
                 "p-2 rounded-lg transition-all",
                 viewMode === 'map' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant opacity-50"
               )}
             >
                <MapIcon size={16} />
             </button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[500px] w-full rounded-3xl overflow-hidden border border-outline shadow-2xl relative z-10"
          >
            <MapContainer 
              center={[-26.1076, 28.0567]} 
              zoom={14} 
              style={{ height: '100%', width: '100%', background: 'var(--background)' }}
              zoomControl={false}
            >
              <TileLayer
                url={theme === 'dark' 
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                }
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {filteredVenues.map((venue, i) => venue.coordinates && (
                <Marker 
                  key={`map-v-${venue.id || venue.name || 'v'}-${i}`} 
                  position={venue.coordinates}
                  icon={waytaMarkerIcon}
                >
                  <Popup className="!rounded-2xl !overflow-hidden border border-outline bg-surface-container">
                    <div className="p-0">
                      <img 
                        src={venue.image || fallbackVenueImage} 
                        onError={(e) => { e.currentTarget.src = fallbackVenueImage; }}
                        className={cn(
                          "w-full h-24 object-cover",
                          theme === 'dark' ? "grayscale opacity-80" : "opacity-100"
                        )} 
                        alt={venue.name} 
                      />
                      <div className="p-3">
                        <h4 className="font-black text-sm uppercase tracking-tight text-on-background">{venue.name}</h4>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">{venue.location}</p>
                        <button 
                           onClick={() => onSelectVenue(venue, 'menu')}
                           className="mt-3 w-full py-2 bg-primary text-on-primary rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          View Venue
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {selectedCategory === 'Events' ? (
                filteredEvents.length > 0 ? (
                  filteredEvents.map((event, i) => {
                    const venue = venues.find(v => v.id === event.venueId);
                    return (
                      <motion.div 
                        key={`ev-list-${event.id || i}-${venue?.id || 'none'}-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}
                        layout
                        onClick={() => {
                          if (onSelectEvent) {
                            onSelectEvent(event.id);
                          } else if (venue) {
                            onSelectVenue(venue, 'menu', event.id);
                          }
                        }}
                        className="bg-surface-container border border-outline rounded-2xl overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform flex flex-col"
                      >
                        <div className="relative h-48 md:h-64 overflow-hidden">
                          <img 
                            src={event.image || (venue?.image || fallbackVenueImage)} 
                            onError={(e) => { e.currentTarget.src = fallbackVenueImage; }}
                            className={cn(
                              "w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000",
                              theme === 'dark' ? "grayscale opacity-80" : "opacity-100"
                            )}
                            alt={event.title} 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                          
                          <div className="absolute top-4 right-4 bg-primary text-on-primary px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-xl">
                            Event
                          </div>

                          <div className="absolute bottom-4 left-4 right-4">
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">{event.date}</span>
                                <span className="w-1 h-1 bg-on-surface-variant/30 rounded-full"></span>
                                <span className="text-xs font-bold text-on-surface-variant">{venue?.name || 'Wayta Venue'}</span>
                             </div>
                             <div className="flex justify-between items-end">
                                <h4 className="text-on-background text-2xl font-black tracking-tight">{event.title}</h4>
                             </div>
                          </div>
                        </div>

                        <div className="p-4 flex justify-between items-center bg-surface-container-high/20 backdrop-blur-sm border-t border-outline/30">
                          <div className="flex items-center gap-2 text-on-surface-variant">
                             <MapPin size={12} className={theme === 'dark' ? "text-primary/70" : "text-secondary/70"} />
                             <span className="text-xs font-bold uppercase tracking-widest">{venue?.location || 'South Africa'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className={cn(
                               "text-xs font-mono font-bold",
                               theme === 'dark' ? "text-primary" : "text-secondary"
                             )}>R {event.ticketPrice || 0}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center col-span-full"
                  >
                    <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant">No active events found</p>
                  </motion.div>
                )
              ) : filteredVenues.length > 0 ? (
                filteredVenues.map((venue, i) => (
                  <motion.div 
                    key={`v-grid-${venue.id || venue.name || 'v'}-${i}`}
                    id={i === 0 ? "venue-card-1" : undefined}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    layout
                    onClick={() => onSelectVenue(venue, 'menu')}
                    className="bg-surface-container border border-outline rounded-2xl overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform flex flex-col"
                  >
                    <div className="relative h-48 md:h-64 overflow-hidden">
                      <img 
                        src={venue.image || fallbackVenueImage} 
                        onError={(e) => { e.currentTarget.src = fallbackVenueImage; }}
                        className={cn(
                          "w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000",
                          theme === 'dark' ? "grayscale opacity-80" : "opacity-100"
                        )}
                        alt={venue.name} 
                      />
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-t via-transparent to-transparent",
                        theme === 'dark' ? "from-black" : "from-white/40"
                      )} />
                      
                      <div className="absolute top-4 right-4 bg-primary text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-xl">
                        {venue.status}
                      </div>

                      <div className="absolute bottom-4 left-4 right-4">
                         <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-xs font-black uppercase tracking-[0.2em]",
                              theme === 'dark' ? "text-primary" : "text-white"
                            )}>{venue.type}</span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-xs font-bold text-white/80">{venue.distance}</span>
                         </div>
                         <div className="flex justify-between items-end">
                            <h4 className="text-white text-2xl font-black tracking-tight">{venue.name}</h4>
                            <div className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/20 transition-colors",
                              theme === 'dark' ? "bg-black/50" : "bg-white/20"
                            )}>
                               <Star size={10} className="fill-primary text-primary" />
                               <span className="text-xs font-black text-white">{venue.rating}</span>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="p-4 flex justify-between items-center bg-surface-container-high/20 backdrop-blur-sm border-t border-outline/30">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                         <MapPin size={12} className="text-primary/70" />
                         <span className="text-xs font-bold uppercase tracking-widest">{venue.location}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1 text-xs font-black text-on-surface-variant uppercase tracking-widest">
                            <MessageSquare size={10} />
                            <span>42 Reviews</span>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center col-span-full"
                >
                  <div className="w-16 h-16 bg-surface-container border border-outline rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
                    <Search className="text-on-surface-variant" size={24} />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant">No venues matching your pulse</p>
                  <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider mt-1">Try a different vibe or setlist</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section id="ai-vibe-order" className="space-y-6">
        <div className="bg-surface-container border border-outline rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={120} className="text-primary" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Wand2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-on-background">AI Vibe-Order</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Gemini Intelligent Round Suggestions</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="What's the energy? (e.g. 'Chill sunset session' or 'Bday celebration')"
                value={vibePrompt}
                onChange={(e) => setVibePrompt(e.target.value)}
                className="flex-1 h-14 bg-background border border-outline rounded-2xl px-6 text-sm font-bold placeholder:text-on-surface-variant focus:border-primary outline-none transition-all"
              />
              <button 
                onClick={handleGetVibeSuggestion}
                disabled={isVibeLoading || !vibePrompt}
                className="h-14 px-8 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isVibeLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16} />}
                Generate Round
              </button>
            </div>

            <AnimatePresence>
              {vibeSuggestion && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl relative">
                    <Sparkles size={14} className="absolute top-4 right-4 text-primary animate-pulse" />
                    <p className="text-sm font-bold italic text-on-background leading-relaxed pr-6">
                      "{vibeSuggestion}"
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                       <button className="h-10 px-6 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/10">Add to Round</button>
                       <button className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-background transition-colors" onClick={() => setVibeSuggestion(null)}>Dismiss</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="space-y-4 pb-8">
         <h3 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant px-1">Upcoming Productions</h3>
         
         {featuredEvents.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {featuredEvents.map((event, i) => {
               const venue = venues.find(v => v.id === event.venueId);
               return (
                 <motion.div 
                   key={`upc-${event.id || i}-${i}`}
                   whileHover={{ y: -4 }}
                   className="relative h-48 md:h-64 rounded-2xl overflow-hidden group shadow-2xl border border-outline cursor-pointer"
                    onClick={() => venue && onSelectVenue(venue, 'menu', event.id)}
                 >
                    <img 
                      src={event.image || (venue?.image) || fallbackEventImage} 
                       onError={(e) => { e.currentTarget.src = fallbackEventImage; }}
                       className={cn(
                         "w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000",
                         theme === 'dark' ? "grayscale opacity-40" : "opacity-90"
                       )} 
                      alt={event.title} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
                    <div className="absolute inset-x-6 inset-y-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-primary text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-primary/10 border border-primary/20 rounded">
                              {event.genre}
                           </span>
                           <span className="text-on-background text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-surface-container border border-outline rounded">
                              {venue?.name}
                           </span>
                        </div>
                        <h4 className="text-on-background text-2xl font-black tracking-tight leading-tight uppercase">{event.title}</h4>
                        <div className="flex items-center gap-4 mt-2">
                           <p className="text-on-surface-variant text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest">
                              <Calendar size={12} className="text-primary" />
                              {event.date}
                           </p>
                           <p className="text-primary text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest">
                              <Ticket size={12} />
                              From {formatCurrency(event.ticketPrice || 0)}
                           </p>
                        </div>
                        <button className="mt-5 bg-primary text-on-primary w-max px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all leading-none whitespace-nowrap">
                           Book Space
                        </button>
                    </div>
                 </motion.div>
               );
             })}
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden group shadow-2xl border border-outline border-dashed opacity-50 flex items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">No Upcoming Events Scheduled</p>
             </div>
           </div>
         )}
      </section>
    </div>
  );
};
