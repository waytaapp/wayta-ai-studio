import React, { useState, useEffect } from 'react';
import { ArrowLeft, Beer, Coffee, Pizza, MapPin, Phone, User, ShoppingBag, Check, Zap, RefreshCw, Ticket, ShieldCheck, X, Plus, Heart, ChevronDown, ChevronUp, Sparkles, ChevronRight, Calendar, AlertTriangle, Pause } from 'lucide-react';
import { Venue, MenuItem, Order, Event, User as UserType, Review } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { paymentService, PaymentMethod } from '../services/paymentService';
import { offlineCache } from '../services/offlineCache';
import { orderService } from '../services/orderService';
import { PaystackPayment } from '../components/payment/PaystackPayment';
import { venueService } from '../services/venueService';
import { eventService } from '../services/eventService';
import { inventoryService } from '../services/inventoryService';
import { Star as StarIcon, MessageCircle } from 'lucide-react';

interface VenueDetailsViewProps {
  venue: Venue;
  budgetRemaining: number;
  budgetLimit?: number;
  onBack: () => void;
  onOrder: (order: any) => void;
  user: UserType | null;
  initialTab?: 'menu' | 'events' | 'info' | 'orders' | 'reviews';
  selectedEventId?: string;
  theme?: 'light' | 'dark';
}

const STALE_TIME = 3600000; // 1 hour in ms

export const VenueDetailsView: React.FC<VenueDetailsViewProps> = ({ 
  venue, 
  budgetRemaining, 
  budgetLimit = 0,
  onBack, 
  onOrder, 
  user,
  initialTab = 'menu',
  selectedEventId,
  theme = 'dark'
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [ticketCart, setTicketCart] = useState<{ event: Event; quantity: number }[]>([]);
  const [view, setView] = useState<'menu' | 'events' | 'info' | 'orders' | 'reviews'>(initialTab);
  const [currentVenue, setCurrentVenue] = useState<Venue>(venue);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const [showArrivalConfirmation, setShowArrivalConfirmation] = useState(false);
  const [hasConfirmedArrival, setHasConfirmedArrival] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [menuTier, setMenuTier] = useState<'general' | 'premium'>('general');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderingStep, setOrderingStep] = useState<string>('Initializing');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');
  const [paystackTrigger, setPaystackTrigger] = useState<(() => void) | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<{ item: MenuItem; overflow: number } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [venueOrders, setVenueOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [flyingItems, setFlyingItems] = useState<{ id: number; x: number; y: number; item: MenuItem }[]>([]);
  const [hasCompletedOrder, setHasCompletedOrder] = useState(false);
  const [lastRound, setLastRound] = useState<{ item: MenuItem; quantity: number }[] | null>(null);

  const fallbackImage = 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80';

  useEffect(() => {
    if (!venue.id) return;
    const unsubscribe = venueService.listenToVenue(venue.id, (updatedVenue) => {
      setCurrentVenue(updatedVenue);
    });
    return () => unsubscribe();
  }, [venue.id]);

  useEffect(() => {
    if (!venue.id) return;
    const unsubscribe = venueService.listenToReviews(venue.id, (loadedReviews) => {
      setReviews(loadedReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    });
    return () => unsubscribe();
  }, [venue.id]);

  useEffect(() => {
    if (!user || !user.uid || !venue || !venue.id) return;
    
    let unsubscribe: () => void;
    
    if (user.role === 'MANAGER' || user.role === 'ADMIN' || user.role === 'BARTENDER') {
      unsubscribe = orderService.listenToVenueOrders(venue.id, (orders) => {
        setVenueOrders(orders);
      });
    } else {
      unsubscribe = orderService.listenToUserOrders(user.uid, (orders) => {
        const filtered = orders.filter(o => o.venue_id === venue.id);
        setVenueOrders(filtered);
        
        // Task 7: Check for completed orders to leave a review
        const completed = orders.some(o => o.venue_id === venue.id && o.status.toLowerCase() === 'completed');
        setHasCompletedOrder(completed);

        // Extract last completed order for "Repeat last round"
        const lastCompleted = [...orders]
          .filter(o => o.venue_id === venue.id && o.status.toLowerCase() !== 'cancelled')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        if (lastCompleted) {
          setLastRound(lastCompleted.items);
        }
      });
    }
    
    return () => unsubscribe && unsubscribe();
  }, [venue.id, user?.uid, user?.role]);

  useEffect(() => {
    if (!venue.id) return;

    // Task 13: Query events from Firestore
    const unsubEvents = venueService.listenToEventsFirestore(venue.id, (dbEvents) => {
      setEvents(dbEvents);
      if (selectedEventId) {
        const found = dbEvents.find(e => e.id === selectedEventId);
        if (found) setSelectedEvent(found);
      }
    });

    // Modified Task 2: Query menu items from Firestore (optionally for a specific event)
    const unsubMenu = inventoryService.listenToInventory(venue.id, (dbItems) => {
      // Map InventoryItem to MenuItem type for the view
      const mappedItems: MenuItem[] = dbItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category as any,
        description: item.description || '',
        image: item.image || '',
        stock_quantity: item.stock,
        isSoldOut: item.status === 'Sold Out',
        is_premium: item.is_premium
      }));
      setMenuItems(mappedItems);
      setIsLoading(false);
      setLastUpdated(Date.now());
    }, selectedEventId);

    return () => {
      unsubEvents();
      unsubMenu();
    };
  }, [venue.id, selectedEventId]);

  const toggleFavorite = (itemId: string) => {
    setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, isFavorite: !m.isFavorite } : m));
  };

  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const performAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
    if (e) {
      setAddedItems(prev => new Set(prev).add(item.id));
      setTimeout(() => {
        setAddedItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 1000);

      const id = Date.now();
      setFlyingItems(prev => [...prev, { id, x: e.clientX, y: e.clientY, item }]);
      setTimeout(() => {
        setFlyingItems(prev => prev.filter(fi => fi.id !== id));
      }, 800);
    }

    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { item, quantity: 1 }];
    });
    setConfirmingItem(null);
  };

  const addToCart = (item: MenuItem, e?: React.MouseEvent) => {
    const currentTotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);
    const potentialTotal = currentTotal + item.price;
    if (budgetLimit > 0 && potentialTotal > budgetRemaining) {
      setConfirmingItem({ item, overflow: potentialTotal - budgetRemaining });
      return;
    }
    performAddToCart(item, e);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.item.id !== itemId);
    });
  };

  const addTicketToCart = (event: Event) => {
    setTicketCart(prev => {
        const existing = prev.find(i => i.event.id === event.id);
        if (existing) return prev.map(i => i.event.id === event.id ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { event, quantity: 1 }];
    });
  };

  const repeatLastRound = () => {
    if (!lastRound) return;
    setCart(prev => {
      const next = [...prev];
      lastRound.forEach(li => {
        const existing = next.find(ni => ni.item.id === li.item.id);
        if (existing) {
          existing.quantity += li.quantity;
        } else {
          next.push({ item: li.item, quantity: li.quantity });
        }
      });
      return next;
    });
  };

  const removeTicketFromCart = (eventId: string) => {
    setTicketCart(prev => {
        const existing = prev.find(i => i.event.id === eventId);
        if (existing && existing.quantity > 1) {
            return prev.map(i => i.event.id === eventId ? { ...i, quantity: i.quantity - 1 } : i);
        }
        return prev.filter(i => i.event.id !== eventId);
    });
  };

  const menuTotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);
  const ticketTotal = ticketCart.reduce((acc, curr) => acc + ((curr.event.ticketPrice || 0) * curr.quantity), 0);
  const total = menuTotal + ticketTotal;
  const remainingAfterOrder = budgetRemaining - total;
  const isOverBudget = budgetLimit > 0 && remainingAfterOrder < 0;


  const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category)))];
  
  const filteredMenu = menuItems.filter(m => {
    const matchesCategory = activeCategory === 'All' || m.category === activeCategory;
    const matchesTier = menuTier === 'premium' ? m.is_premium : !m.is_premium;
    return matchesCategory && matchesTier;
  });

  const handleCheckoutInitiation = () => {
    setShowCheckoutConfirmation(false);
    setShowPinModal(true);
    setPinValue('');
    setPinError(false);
  };

  const handleCheckoutInitiationWithPaystack = (initializePayment: () => void) => {
    setPaystackTrigger(() => initializePayment);
    setShowCheckoutConfirmation(false);
    setShowPinModal(true);
    setPinValue('');
    setPinError(false);
  };

  const handleArrivalSuccess = () => {
    setHasConfirmedArrival(true);
    setShowArrivalConfirmation(false);
    setShowCheckoutConfirmation(true); // Open the checkout confirmation after arrival is confirmed
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinValue === user?.pin) {
      setShowPinModal(false);
      if (selectedMethod === 'CARD' && paystackTrigger) {
        paystackTrigger();
      } else {
        handleCheckout();
      }
    } else {
      setPinError(true);
      setPinValue('');
    }
  };

  const handleCheckout = async (paystackReference?: string) => {
    try {
      setIsOrdering(true);
      setOrderingStep('Syncing with Bar...');
      
      if (selectedMethod === 'STITCH') {
        setOrderingStep('Redirecting to Stitch...');
        const reference = `WAYTA-ST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const { paymentUrl } = await paymentService.initiateStitchPayment(total, reference);
        window.location.href = paymentUrl;
        return;
      }

      if (selectedMethod === 'CARD') {
        setOrderingStep('Verifying Paystack Transaction...');
      } else {
        // Simulating split settlement sequence for alternative payment methods
        await new Promise(r => setTimeout(r, 800));
        setOrderingStep('Verifying Settlement...');
        await new Promise(r => setTimeout(r, 800));
        setOrderingStep('Securing Funds...');
        await new Promise(r => setTimeout(r, 1200));
      }
      setOrderingStep('Finalizing Order...');
      
      const transactionIdToUse = paystackReference || `TX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([150, 50, 150]);
        } catch (e) {
          console.log('Vibration failed', e);
        }
      }
      // Create the new order object
      const eventIdToUse = selectedEventId || selectedEvent?.id || (ticketCart.length > 0 ? ticketCart[0].event.id : undefined);
      const newOrder: Order = {
        id: transactionIdToUse,
        user_id: user?.uid || 'anonymous',
        venue_id: venue.id,
        event_id: eventIdToUse,
        items: [
          ...cart,
          ...ticketCart.map(t => ({ 
            item: { 
              id: t.event.id, 
              name: `${t.event.title} [Access Key]`, 
              price: t.event.ticketPrice || 0, 
              category: 'Other' as any, 
              description: 'Event Access Key',
              image: t.event.image || ''
            }, 
            quantity: t.quantity 
          }))
        ] as any,
        status: 'Pending',
        payment_status: 'Paid',
        payment_gateway_ref: paystackReference || undefined,
        total_amount: total,
        total: total,
        wayta_commission: total * 0.05,
        timestamp: new Date().toISOString(),
        customer_name: user?.full_name || user?.displayName || 'Customer',
      };

      // Show Visual Pulse Confirmation instead of alert
      setIsOrdering(false);
      setHasCompletedOrder(true);
      setCart([]);
      setTicketCart([]);
      setShowCheckoutConfirmation(false);
      
      // Brief delay for the user to see the success state
      setTimeout(async () => {
        try {
          await onOrder(newOrder);
        } catch (err) {
          console.error("Deferred order notification failed:", err);
        }
      }, 1500);
    } catch (error) {
      console.error("Split Settlement Sync Failed:", error);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full min-h-screen bg-background text-on-background pb-32">
      {/* Hero Section */}
      <section className="relative h-72 md:h-96 w-full overflow-hidden">
        <img 
          src={selectedEvent?.image || venue.image || fallbackImage} 
          onError={(e) => { e.currentTarget.src = fallbackImage; }}
          className={cn(
            "w-full h-full object-cover",
            theme === 'dark' ? "grayscale brightness-50" : "opacity-90"
          )} 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 w-10 h-10 bg-surface/50 backdrop-blur-md rounded-full flex items-center justify-center text-on-surface border border-outline z-10 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="absolute bottom-10 left-6 right-6 md:left-12">
          <div className="flex items-center gap-2 mb-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-max">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">
              {selectedEvent ? 'Event Live' : 'Active Pulse'}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-on-background font-display tracking-tight uppercase">
            {selectedEvent ? selectedEvent.title : venue.name}
          </h1>
          <div className="flex flex-col gap-1 mt-1">
            <p className="text-on-surface-variant text-xs md:text-sm flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <MapPin size={12} className={selectedEvent ? "text-primary" : "text-primary"} />
              {venue.location} {selectedEvent ? `• ${venue.name}` : '• VIP DECK'}
            </p>
            {selectedEvent && (
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Ticket size={12} />
                Accessing {selectedEvent.title} Menu
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="sticky top-16 bg-background/90 backdrop-blur-md z-40 px-6 py-4 flex gap-8 border-b border-outline overflow-x-auto no-scrollbar shadow-sm">
        {['menu', 'events', 'info', 'orders', 'reviews']
          .filter(t => selectedEventId ? t !== 'events' : true)
          .map((t) => (
          <button 
            key={t}
            onClick={() => setView(t as any)}
            className={cn(
              "text-[11px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap py-2 px-4 rounded-full relative",
              view === t ? "bg-primary text-black" : "text-primary hover:text-primary/80"
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="p-6">
        {currentVenue.status === 'Closed' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={20} />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-red-500">Closed for service</p>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5">The terminal is offline. Re-entry suggested later.</p>
              </div>
            </div>
          </div>
        )}
        
        {currentVenue.isOrderingEnabled === false && currentVenue.status !== 'Closed' && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Pause className="text-orange-500" size={20} />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-orange-500">Ordering Paused</p>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5">Kitchen/Bar is currently reaching capacity. Orders temporarily halted.</p>
              </div>
            </div>
          </div>
        )}

        {view === 'menu' && (
          <div className="space-y-6">
             {/* AI Vibe Section from Onboarding Snippet */}
             {selectedEvent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between shadow-lg mb-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                      <Ticket size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary">Event Exclusive Menu</h4>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5">Showing items for {selectedEvent.title}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 px-2 py-1 rounded">
                    Verified
                  </div>
                </motion.div>
              )}
             <motion.div 
               id="ai-vibe"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="p-5 bg-surface-container rounded-2xl border-l-4 border-primary text-on-surface shadow-xl flex items-center justify-between group"
             >
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">✨ Vibe-Order AI</p>
                  <p className="text-sm italic text-on-surface-variant font-medium font-mono">"Try the Frozen Paloma—perfect for this heat."</p>
                </div>
                {lastRound && (
                  <button 
                    onClick={repeatLastRound}
                    className="h-10 px-4 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all active:scale-95 whitespace-nowrap"
                  >
                    Repeat Last Round
                  </button>
                )}
             </motion.div>

             <div className="flex flex-col gap-6">
               <div className="flex p-1.5 bg-surface-container rounded-2xl border border-outline w-full max-w-sm mx-auto">
                 <button 
                   onClick={() => setMenuTier('general')}
                   className={cn(
                     "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                     menuTier === 'general' ? "bg-primary text-black shadow-lg" : "text-primary/60 hover:text-primary"
                   )}
                 >
                   General Menu
                 </button>
                 <button 
                   onClick={() => setMenuTier('premium')}
                   className={cn(
                     "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                     menuTier === 'premium' ? "bg-amber-500 text-black shadow-lg" : "text-amber-500/60 hover:text-amber-500"
                   )}
                 >
                   <Sparkles size={12} />
                   Premium Tier
                 </button>
               </div>

               <div className="flex justify-between items-center px-1">
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant">
                      {menuTier === 'premium' ? 'Curated Selection' : 'Inventory Catalog'}
                    </h3>
                    {lastUpdated && (
                      <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mt-1">
                        Last Updated: {new Date(lastUpdated).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {categories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                          activeCategory === cat ? (menuTier === 'premium' ? "bg-amber-500 border-amber-500 text-black" : "bg-primary border-primary text-on-primary") : "bg-surface-container border-outline text-on-surface-variant"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
               </div>
                          {isLoading ? (
               <div className="space-y-4">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-24 bg-surface-container animate-pulse rounded-2xl border border-outline" />
                 ))}
               </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMenu.map((item, i) => (
                    <div key={`mi-${item.id || 'idx'}-${i}`} className={cn(
                      "bg-surface-container p-4 rounded-2xl border flex gap-4 items-center group relative overflow-hidden transition-all shadow-sm",
                      menuTier === 'premium' ? "border-amber-500/40 shadow-xl shadow-amber-500/5 bg-amber-500/[0.02]" : "border-outline/50",
                      item.isSoldOut ? "opacity-50 grayscale" : "active:bg-surface-container-high"
                    )}>
                      {item.isFavorite && !item.isSoldOut && (
                        <div className="absolute top-2 right-2 text-red-500">
                          <Heart size={12} fill="currentColor" />
                        </div>
                      )}
                      
                      <div className="relative w-20 h-20 shrink-0">
                        <img 
                          src={item.image || fallbackImage} 
                          onError={(e) => { e.currentTarget.src = fallbackImage; }}
                          className={cn(
                            "w-full h-full rounded-xl object-cover",
                            theme === 'dark' ? "grayscale opacity-80" : "opacity-100"
                          )} 
                          alt="" 
                        />
                        {item.isSoldOut && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest text-center px-1">Sold Out</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm md:text-base text-on-background truncate">{item.name}</h4>
                          {item.is_premium && (
                            <Sparkles size={10} className="text-amber-500" />
                          )}
                        </div>
                        <p className="text-[10px] md:text-xs text-on-surface-variant line-clamp-2 mt-0.5 font-medium">{item.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 ">
                           <p className={cn("font-mono text-xs md:text-sm font-bold tracking-tight", menuTier === 'premium' ? "text-amber-500" : "text-primary")}>
                             {formatCurrency(item.price)}
                           </p>
                           {item.is_premium && (
                             <span className="text-[8px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">Premium</span>
                           )}
                        </div>
                      </div>

                       <div className="flex flex-col items-center gap-2">
                         <button 
                          onClick={(e) => !item.isSoldOut && currentVenue.isOrderingEnabled !== false && currentVenue.status !== 'Closed' && addToCart(item, e)}
                          disabled={item.isSoldOut || currentVenue.isOrderingEnabled === false || currentVenue.status === 'Closed'}
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl transition-all shadow-lg",
                            (item.isSoldOut || currentVenue.isOrderingEnabled === false || currentVenue.status === 'Closed')
                             ? "bg-surface-container-highest text-on-surface-variant/40 border border-outline cursor-not-allowed" 
                             : addedItems.has(item.id)
                               ? "bg-emerald-500 text-black border border-emerald-500"
                               : (menuTier === 'premium' ? "bg-amber-500 text-black border border-amber-500 active:scale-90" : "bg-primary text-black border border-primary active:scale-90")
                          )}
                        >
                          {item.isSoldOut || currentVenue.isOrderingEnabled === false || currentVenue.status === 'Closed' ? <X size={16} /> : addedItems.has(item.id) ? <Check size={20} /> : '+'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredMenu.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-30 text-center">
                      <ShoppingBag size={48} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">No items found in {menuTier} tier</p>
                      <p className="text-[10px] font-bold uppercase mt-2">Try switching tiers or categories</p>
                    </div>
                  )}
                </div>
              )}
           </div>
          </div>
        )}

        {view === 'events' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center px-1">
                <div>
                   <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/70">Access Keys</h3>
                   <p className="text-[7px] font-black text-on-surface-variant/60 uppercase tracking-widest mt-1">Verified Digital Ticketing • SANDTON</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event, i) => (
                  <div key={`ev-list-${event.id || i}-${i}`} className="bg-surface-container rounded-2xl border border-outline overflow-hidden group">
                     <div 
                       onClick={() => setSelectedEvent(event)}
                       className="relative h-40 overflow-hidden cursor-pointer"
                     >
                        <img 
                          src={event.image || fallbackImage} 
                          onError={(e) => { e.currentTarget.src = fallbackImage; }}
                          className={cn(
                            "w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000",
                            theme === 'dark' ? "grayscale opacity-50" : "opacity-90"
                          )} 
                          alt={event.title} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                        <div className="absolute top-4 right-4 bg-primary text-on-primary px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                           {event.ticketsTotal - event.ticketsSold} Left
                        </div>
                     </div>
                     <div className="p-5 space-y-4">
                        <div onClick={() => setSelectedEvent(event)} className="cursor-pointer">
                           <h4 className="text-xl font-black text-on-background uppercase tracking-tight">{event.title}</h4>
                           <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">{event.date}</p>
                        </div>
                        <div className="flex justify-between items-center bg-background/50 p-3 rounded-xl border border-outline/50">
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase text-on-surface-variant/60 tracking-widest">Entry Access</span>
                              <span className="text-lg font-mono font-black text-primary">{formatCurrency(event.ticketPrice || 0)}</span>
                           </div>
                           <div className="flex items-center gap-3">
                              {ticketCart.find(t => t.event.id === event.id) && (
                                 <button 
                                   onClick={() => removeTicketFromCart(event.id)}
                                   className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline flex items-center justify-center text-on-surface transition-colors"
                                 >
                                   -
                                 </button>
                               )}
                              <span className="text-sm font-black text-on-background">
                                 {ticketCart.find(t => t.event.id === event.id)?.quantity || 0}
                              </span>
                              <button 
                                onClick={() => addTicketToCart(event)}
                                className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black shadow-lg active:scale-95 transition-all"
                              >
                                +
                              </button>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase text-on-surface-variant/60 tracking-[0.2em] justify-center pt-2">
                           <RefreshCw size={10} className="animate-spin-slow" />
                           <span>Instant Verification Enabled</span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {view === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-300">
             <div className="space-y-6">
                {selectedEvent && (
                  <div className="bg-surface-container p-6 rounded-2xl border border-primary/20 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Calendar size={20} />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-on-background">Event Details</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase text-on-surface-variant/60 tracking-widest">Production Title</p>
                        <p className="text-sm font-bold text-on-background">{selectedEvent.title}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-on-surface-variant/60 tracking-widest">Genre / Pulse</p>
                        <p className="text-sm font-bold text-on-background">{selectedEvent.genre}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-on-surface-variant/60 tracking-widest">Access Key Price</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(selectedEvent.ticketPrice || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-surface-container p-6 rounded-2xl border border-outline space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant border-b border-outline pb-3">Venue Logistics</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary"><User size={20} /></div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Floor Manager</p>
                            <p className="font-bold text-on-background">{venue.contactName} <span className="text-[10px] text-emerald-500 ml-2">• ACTIVE</span></p>
                          </div>
                      </div>

                      <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary"><Phone size={20} /></div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Direct Line (Sync Enabled)</p>
                            <p className="font-bold text-on-background">{venue.phone}</p>
                          </div>
                      </div>
                    </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="h-64 rounded-2xl overflow-hidden border border-outline relative bg-surface-container">
                    <img 
                      src="https://images.unsplash.com/photo-1526778546194-fc56da87157a?auto=format&fit=crop&w=600&q=80" 
                      className="w-full h-full object-cover grayscale opacity-20" 
                      alt="Map" 
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-2xl mb-2">
                          <MapPin size={16} />
                      </div>
                      <span className="text-[10px] font-black text-on-background uppercase tracking-widest">Table 42 • VIP Deck</span>
                    </div>
                </div>
             </div>
          </div>
        )}

        {view === 'reviews' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/70">Venue Feedback</h3>
                <p className="text-[7px] font-black text-on-surface-variant/60 uppercase tracking-widest mt-1">Verified Patron Reviews • {venue.name}</p>
              </div>
            </div>

            {/* Review Form */}
            {user && (
              <div className="bg-surface-container p-6 rounded-2xl border border-outline space-y-4">
                <h4 className="text-sm font-black uppercase tracking-tight text-on-background">Rate your experience</h4>
                {!hasCompletedOrder ? (
                  <div className="p-4 bg-background/50 border border-dashed border-outline rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant leading-relaxed">
                      Complete an order at this venue to leave a review.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewRating(star)}
                          className="transition-transform active:scale-90"
                        >
                          <StarIcon
                            size={24}
                            className={cn(
                              "transition-colors",
                              star <= newRating ? "text-primary fill-primary" : "text-on-surface-variant/30"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tell us about the music, the crowd, and the service..."
                        className="w-full bg-background border border-outline rounded-xl p-4 text-xs font-medium focus:border-primary outline-none min-h-[100px] resize-none"
                      />
                      <button
                        disabled={isSubmittingReview || newRating === 0}
                        onClick={async () => {
                          if (!user || newRating === 0) return;
                          setIsSubmittingReview(true);
                          try {
                            await venueService.addReview(venue.id, {
                              user_id: user.uid,
                              user_name: user.displayName || 'User',
                              rating: newRating,
                              comment: newComment
                            });
                            setNewRating(0);
                            setNewComment('');
                          } finally {
                            setIsSubmittingReview(false);
                          }
                        }}
                        className="w-full h-12 bg-primary text-black rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmittingReview ? <RefreshCw size={14} className="animate-spin" /> : <StarIcon size={14} />}
                        Submit Review
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review, i) => (
                  <div key={`rev-patron-${review.id || i}-${i}`} className="bg-surface-container p-5 rounded-2xl border border-outline space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary border border-outline">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-on-background">{review.user_name}</p>
                          <p className="text-[8px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            size={10}
                            className={cn(star <= review.rating ? "text-primary fill-primary" : "text-on-surface-variant/30")}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-outline rounded-3xl opacity-50">
                  <MessageCircle size={48} className="text-outline mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Be the first to review this venue</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'orders' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/70">Venue History</h3>
                <p className="text-[7px] font-black text-on-surface-variant/60 uppercase tracking-widest mt-1">Direct Terminal Sync • {venue.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              {venueOrders.length > 0 ? (
                venueOrders.map((order) => (
                  <div key={`vord-${order.id}`} className="bg-surface-container rounded-2xl border border-outline overflow-hidden">
                    <button
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-surface-container-high transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px]",
                          order.status === 'Ready' || order.status === 'ready' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                          order.status === 'Preparing' || order.status === 'preparing' ? "bg-primary/10 text-primary border border-primary/20" :
                          "bg-surface-container-high text-on-surface-variant border border-outline"
                        )}>
                          #{order.id.slice(-4).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-on-background uppercase tracking-tight">
                              {order.customer_name || 'Customer'}
                            </h4>
                            <span className="w-1 h-1 bg-outline rounded-full" />
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase">
                              {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                              (order.status === 'Ready' || order.status === 'ready') ? "bg-emerald-500 text-black" :
                              (order.status === 'Preparing' || order.status === 'preparing') ? "bg-primary text-black" :
                              "bg-surface-container-high text-on-surface-variant"
                            )}>
                              {order.status}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-primary">{formatCurrency(order.total || order.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                      {expandedOrderId === order.id ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
                    </button>

                    <AnimatePresence>
                      {expandedOrderId === order.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-outline/30 overflow-hidden"
                        >
                          <div className="p-5 bg-background/30 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-outline/10">
                              <span className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">Order Details</span>
                              <span className="text-[9px] font-mono font-bold text-on-surface-variant/50">{order.id}</span>
                            </div>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={`oi-ord-${order.id}-${idx}`} className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-on-background uppercase">{item.quantity}x {item.item.name}</span>
                                  <span className="text-[9px] font-mono text-on-surface-variant">{formatCurrency(item.item.price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-outline/10 flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-on-background">Total Settlement</span>
                              <span className="text-sm font-mono font-black text-primary">{formatCurrency(order.total || order.total_amount)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-outline rounded-3xl opacity-50">
                  <ShoppingBag size={48} className="text-outline mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">No orders in this terminal</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cart Summary & Budget Awareness FAB */}
      {(cart.length > 0 || ticketCart.length > 0) && (
        <div id="skip-queue-card" className="fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl w-full z-50 space-y-3 px-4">
           {/* Budget Awareness Overlay */}
           {budgetLimit > 0 && (
             <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className={cn(
                 "bg-surface-container p-3 rounded-xl border border-outline flex items-center justify-between shadow-xl",
                 isOverBudget && "border-error/50 bg-error/5"
               )}
             >
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-8 h-8 rounded-lg flex items-center justify-center",
                     isOverBudget ? "bg-error text-white" : "bg-primary/20 text-primary"
                   )}>
                      <Zap size={14} className={isOverBudget ? "animate-pulse" : ""} />
                   </div>
                   <div>
                      <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">Post-Order Budget</p>
                      <p className={cn("text-xs font-bold", isOverBudget ? "text-error" : "text-on-background")}>
                         {isOverBudget ? "Exceeds Night Limit" : `${formatCurrency(remainingAfterOrder)} remaining`}
                      </p>
                   </div>
                </div>
             </motion.div>
           )}

            <motion.div 
              id="order-now-btn-container"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <button 
                id="order-now-btn"
                onClick={() => setShowCheckoutConfirmation(true)}
                disabled={isOrdering}
                className={cn(
                  "w-full h-14 rounded-xl shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-all disabled:opacity-50",
                  isOverBudget ? "bg-error text-white" : "bg-primary text-on-primary"
                )}
              >
                 {isOrdering ? (
                   <div className="w-full flex items-center justify-center gap-3">
                     <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                     <span className="font-black uppercase tracking-widest text-xs">P2P Sync Active...</span>
                   </div>
                 ) : (
                   <>
                     <div className="flex items-center gap-3">
                       <motion.div 
                         key={cart.length + ticketCart.length}
                         initial={{ scale: 1.2, rotate: -10 }}
                         animate={{ scale: 1, rotate: 0 }}
                         className="bg-on-primary/20 w-8 h-8 rounded-lg flex items-center justify-center"
                       >
                          <span className="text-[10px] font-black">{cart.reduce((a,c) => a + c.quantity, 0) + ticketCart.reduce((a,c) => a + c.quantity, 0)}</span>
                       </motion.div>
                       <span className="font-black uppercase tracking-tighter text-sm">Checkout Order</span>
                     </div>
                     <span className="text-lg font-mono font-black">{formatCurrency(total)}</span>
                   </>
                 )}
              </button>
            </motion.div>
        </div>
      )}

      {/* Checkout Confirmation Modal */}
      <AnimatePresence>
        {showCheckoutConfirmation && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-surface-container border-t sm:border border-outline rounded-t-[1.5rem] sm:rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center">
                   <div>
                      <h3 className="text-xl sm:text-2xl font-black text-on-background uppercase tracking-tight">Order Summary</h3>
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest mt-0.5">{venue.name} Terminal Alpha</p>
                   </div>
                   <button 
                     onClick={() => setShowCheckoutConfirmation(false)}
                     className="w-8 h-8 rounded-full bg-surface-container-high border border-outline flex items-center justify-center font-black"
                   >
                      <X size={16} />
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="bg-background/50 rounded-2xl border border-outline divide-y divide-outline/30">
                      {cart.map(({ item, quantity }) => (
                         <div key={`cart-${item.id}`} className="p-4 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                               <span className="text-xs font-black text-primary p-1 px-2 bg-primary/10 rounded-lg">{quantity}x</span>
                               <span className="text-[11px] font-bold uppercase tracking-wider">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className="font-mono text-[11px]">{formatCurrency(item.price * quantity)}</span>
                               <button 
                                 onClick={() => removeFromCart(item.id)}
                                 className="p-1 px-2 text-on-surface-variant/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-[9px] font-black uppercase"
                               >
                                  Remove
                               </button>
                            </div>
                         </div>
                      ))}
                      {ticketCart.map(({ event, quantity }) => (
                         <div key={`tcart-${event.id}`} className="p-4 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                               <span className="text-xs font-black text-primary p-1 px-2 bg-primary/10 rounded-lg">{quantity}x</span>
                               <span className="text-[11px] font-bold uppercase tracking-wider">{event.title} [Access Key]</span>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className="font-mono text-[11px]">{formatCurrency((event.ticketPrice || 0) * quantity)}</span>
                               <button 
                                 onClick={() => removeTicketFromCart(event.id)}
                                 className="p-1 px-2 text-on-surface-variant/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-[9px] font-black uppercase"
                               >
                                  Remove
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>

                   <div className="flex justify-between items-center px-4">
                      <span className="text-[10px] font-black uppercase text-on-surface-variant/60 tracking-[0.2em]">Settlement Logic</span>
                      <span className="text-sm font-black text-primary">{formatCurrency(total)}</span>
                   </div>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <Check size={16} />
                   </div>
                   <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-relaxed">
                      Instant split-settlement technology active. 5% wayta fee included. 95% revenue routed to terminal.
                   </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">Select Payment Method</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {(['CARD'] as PaymentMethod[]).map((method) => (
                      <button
                        key={`pm-${method}`}
                        onClick={() => setSelectedMethod(method)}
                        className={cn(
                          "h-12 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                          selectedMethod === method
                            ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20"
                            : "bg-surface-container-high border-outline text-on-surface-variant hover:bg-surface-container"
                        )}
                      >
                        {method === 'STITCH' ? 'PAY BY BANK (STITCH)' : method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-surface-container-high border-t border-outline flex gap-3">
                 <button 
                   onClick={() => setShowCheckoutConfirmation(false)}
                   className="h-14 px-6 bg-surface-container border border-outline rounded-xl font-black uppercase tracking-widest text-[10px] text-on-surface-variant/60 hover:text-on-surface transition-colors"
                 >
                    Add More
                 </button>
                 {selectedMethod === 'CARD' ? (
                   <PaystackPayment
                     amount={total}
                     email={user?.email || 'customer@wayta.co.za'}
                     onSuccess={(reference) => {
                       handleCheckout(reference);
                     }}
                     onClose={() => {
                       setIsOrdering(false);
                     }}
                   >
                     {(initializePayment) => (
                       <button 
                         onClick={() => handleCheckoutInitiationWithPaystack(initializePayment)}
                         disabled={isOrdering}
                         className="flex-1 h-14 bg-primary text-black rounded-xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                       >
                          {isOrdering ? (
                             <RefreshCw size={16} className="animate-spin" />
                          ) : (
                             <ShoppingBag size={16} />
                          )}
                          Verify & Pay {formatCurrency(total)}
                       </button>
                     )}
                   </PaystackPayment>
                 ) : (
                   <button 
                     onClick={handleCheckoutInitiation}
                     disabled={isOrdering}
                     className="flex-1 h-14 bg-primary text-black rounded-xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   >
                      {isOrdering ? (
                         <RefreshCw size={16} className="animate-spin" />
                      ) : (
                         <ShoppingBag size={16} />
                      )}
                      Verify & Pay {formatCurrency(total)}
                   </button>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN Confirmation Modal */}
      <AnimatePresence>
        {isOrdering && (
          <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-on-background">
             <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="relative"
             >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 border-4 border-primary border-t-transparent rounded-full" 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <motion.div 
                     animate={{ scale: [1, 1.1, 1] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/40"
                   >
                      <Zap size={40} className="text-black" />
                   </motion.div>
                </div>
             </motion.div>
             <h2 className="text-2xl font-black uppercase tracking-tight mt-12 mb-2">{orderingStep}</h2>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Mesh Authorization v2.4 Active • Secure Node</p>
             
             <div className="w-48 h-1 bg-primary/20 rounded-full overflow-hidden mt-8">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                  className="h-full bg-primary shadow-[0_0_10px_var(--primary)]"
                />
             </div>
          </div>
        )}

        {hasCompletedOrder && !isOrdering && (
          <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
             <motion.div
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="relative"
             >
                <motion.div 
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-32 h-32 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40"
                >
                   <Check size={64} className="text-black" />
                </motion.div>
                
                {/* Pulse ripples */}
                {[1, 2, 3].map((i) => (
                   <motion.div
                     key={i}
                     initial={{ scale: 1, opacity: 0.5 }}
                     animate={{ scale: 2, opacity: 0 }}
                     transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                     className="absolute inset-0 border-2 border-emerald-500 rounded-[2.5rem] -z-10"
                   />
                ))}
             </motion.div>
             <h2 className="text-3xl font-black uppercase tracking-tighter text-on-background mt-16 mb-2">Order Confirmed</h2>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Transaction Settled Successfully</p>
             
             <div className="mt-12 p-4 bg-surface-container rounded-2xl border border-outline flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary font-mono font-bold">#42</div>
                <div className="text-left">
                   <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Collection Point</p>
                   <p className="text-sm font-bold text-on-background">VIP Deck • {venue.name}</p>
                </div>
             </div>
          </div>
        )}

        {showPinModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-background/95 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container border border-outline rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-sm w-full shadow-2xl space-y-6 sm:space-y-8"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={32} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-xl font-black text-on-background uppercase tracking-tight">Security Check</h3>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest leading-loose">
                       Enter your 6-digit PIN to authorize the <span className="text-primary">Instant Pay</span> request.
                    </p>
                 </div>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-6">
                 <div className="relative">
                    <input 
                      autoFocus
                      required
                      type="password" 
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="0 0 0 0 0 0"
                      value={pinValue}
                      onChange={(e) => {
                        setPinValue(e.target.value.replace(/\D/g, ''));
                        setPinError(false);
                      }}
                      className={cn(
                        "w-full h-16 bg-background border rounded-2xl px-4 text-center text-3xl font-black tracking-[0.2em] outline-none transition-all",
                        pinError ? "border-error text-error animate-shake" : "border-outline focus:border-primary"
                      )}
                    />
                    {pinError && (
                      <p className="text-[9px] font-black text-error uppercase tracking-widest text-center mt-3 animate-in fade-in">
                        Invalid PIN code. Access Denied.
                      </p>
                    )}
                 </div>

                 <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowPinModal(false)}
                      className="flex-1 h-14 bg-surface-container-high text-on-surface-variant font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 h-14 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                       Confirm
                    </button>
                 </div>
              </form>
              
              <p className="text-[8px] font-black text-center text-on-surface-variant/60 uppercase tracking-widest">
                 Authorized via Wayta Secure Mesh v2.4
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Threshold Alert Modal */}
      <AnimatePresence>
        {confirmingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container border border-outline rounded-[1.5rem] sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center">
                  <Zap size={32} className="animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-on-background uppercase tracking-tight">Threshold Warning</h3>
                  <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
                    This exceeds your 'Night Out' budget by <span className="text-error font-black">R{confirmingItem.overflow}</span>. 
                    Proceed anyway?
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => performAddToCart(confirmingItem.item)}
                  className="w-full h-14 bg-error text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-xl active:scale-95 transition-all leading-none"
                >
                  Confirm & Sync
                </button>
                <button 
                  onClick={() => setConfirmingItem(null)}
                  className="w-full h-14 bg-surface-container-high text-on-surface-variant font-black uppercase tracking-widest text-[11px] rounded-xl active:scale-95 transition-all leading-none"
                >
                  Adjust Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Detail Overlay */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-background/95 backdrop-blur-xl">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-surface-container border-t sm:border border-outline rounded-t-[1.5rem] sm:rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="relative h-48 sm:h-80 shrink-0">
                <img src={selectedEvent.image || undefined} className="w-full h-full object-cover grayscale opacity-60" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-surface/50 backdrop-blur-md rounded-full flex items-center justify-center text-on-surface active:scale-90 transition-all border border-outline"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
                <div className="absolute bottom-6 left-6 sm:left-8 right-6 sm:right-8">
                   <span className="px-3 py-1 bg-primary text-on-primary rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-2 sm:mb-3 inline-block shadow-lg shadow-primary/20">
                      Confirmed Event
                   </span>
                   <h2 className="text-2xl sm:text-5xl font-black text-on-background uppercase tracking-tight leading-none truncate">{selectedEvent.title}</h2>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar">
                <div className="flex flex-wrap gap-4 sm:gap-8">
                   <div>
                      <p className="text-[8px] sm:text-[10px] font-black text-on-surface-variant/70 uppercase tracking-widest mb-1">Schedule</p>
                      <p className="text-xs sm:text-sm font-bold text-on-primary-container">{selectedEvent.date}</p>
                   </div>
                   <div>
                      <p className="text-[8px] sm:text-[10px] font-black text-on-surface-variant/70 uppercase tracking-widest mb-1">Access Tier</p>
                      <p className="text-xs sm:text-sm font-bold text-on-primary-container">General Admission</p>
                   </div>
                   <div>
                      <p className="text-[8px] sm:text-[10px] font-black text-on-surface-variant/70 uppercase tracking-widest mb-1">Availability</p>
                      <p className="text-xs sm:text-sm font-bold text-emerald-500">{selectedEvent.ticketsTotal - selectedEvent.ticketsSold} Tickets Remaining</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-on-surface-variant/70 uppercase tracking-widest border-b border-outline pb-2">Event Manifesto</h4>
                   <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                      Experience the pulse of {venue.name} with {selectedEvent.title}. A curated sonic journey featuring the continent's finest selectors. Secure your access key for a night of uncompromising digital efficiency.
                   </p>
                </div>

                <div className="bg-background/50 border border-outline rounded-3xl p-6 flex items-center justify-between shadow-inner">
                   <div>
                      <p className="text-2xl font-mono font-black text-primary">{formatCurrency(selectedEvent.ticketPrice || 0)}</p>
                      <p className="text-[8px] font-black text-on-surface-variant/60 uppercase tracking-widest mt-1">Inclusive of instant verification</p>
                   </div>
                   <div className="flex items-center gap-4">
                      {ticketCart.find(t => t.event.id === selectedEvent.id) && (
                        <div className="flex items-center gap-4 bg-surface-container rounded-2xl border border-outline p-1 pr-3">
                           <button 
                             onClick={() => removeTicketFromCart(selectedEvent.id)}
                             className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-black text-on-surface"
                           >
                             -
                           </button>
                           <span className="text-sm font-black w-4 text-center">
                              {ticketCart.find(t => t.event.id === selectedEvent.id)?.quantity}
                           </span>
                           <button 
                             onClick={() => addTicketToCart(selectedEvent)}
                             className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-black text-on-surface"
                           >
                             +
                           </button>
                        </div>
                      )}
                      
                      {!ticketCart.find(t => t.event.id === selectedEvent.id) && (
                         <button 
                           onClick={() => addTicketToCart(selectedEvent)}
                           className="h-14 px-8 bg-primary text-on-primary rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
                         >
                            <Ticket size={16} />
                            Claim Access
                         </button>
                      )}
                   </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest justify-center pt-4 opacity-50">
                   <Zap size={12} />
                   Verified by Wayta Pulse Security
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {flyingItems.map(fi => (
          <motion.div
            key={`fly-${fi.id}`}
            initial={{ x: fi.x - 20, y: fi.y - 20, scale: 1, opacity: 1 }}
            animate={{ 
              x: window.innerWidth / 2, 
              y: window.innerHeight - 100,
              scale: 0.2,
              opacity: 0
            }}
            transition={{ duration: 0.8, ease: "circIn" }}
            className="fixed z-[999] pointer-events-none"
          >
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-black border-2 border-white shadow-2xl">
              <ShoppingBag size={20} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showArrivalConfirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-surface-container border border-outline rounded-[2.5rem] p-8 w-full max-w-md text-center space-y-6 shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <MapPin size={120} className="text-primary" />
                </div>
                
                <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center mx-auto text-primary border border-primary/20">
                   <MapPin size={36} />
                </div>
                
                <div className="space-y-2 relative z-10">
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Location Verification</h3>
                   <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
                     Are you currently at <span className="font-black text-primary">{venue.name}</span>? 
                     Payment authorization is only valid within the mesh location.
                   </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3 relative z-10">
                   <button 
                     onClick={handleArrivalSuccess}
                     className="w-full h-16 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20 active:scale-95 transition-all"
                   >
                     Confirm Arrival
                   </button>
                   <button 
                     onClick={() => setShowArrivalConfirmation(false)}
                     className="w-full h-14 bg-surface-container-high border border-outline text-on-surface uppercase text-[10px] font-black tracking-widest rounded-2xl"
                   >
                     Cancel
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
