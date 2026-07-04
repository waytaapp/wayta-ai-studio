import React, { useState, useEffect } from 'react';
import { motion, PanInfo } from 'motion/react';
import { ArrowLeft, MapPin, Calendar, Clock, Ticket as TicketIcon, ScanLine, Tag, FileText, CheckCircle2, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { Event, User, Ticket } from '../types';
import { eventService } from '../services/eventService';
import { orderService } from '../services/orderService';
import { cn, formatCurrency } from '../lib/utils';
import { wcapsService } from '../services/wcapsService';
import { db, collection, query, getDocs } from '../lib/firebase';
import { z } from 'zod';
import { PaystackPayment } from '../components/payment/PaystackPayment';

interface PatronEventViewProps {
  eventId: string;
  user: User | null;
  onBack: () => void;
  theme?: 'light' | 'dark';
}

export const PatronEventView: React.FC<PatronEventViewProps> = ({ eventId, user, onBack, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [hasPreviousOrders, setHasPreviousOrders] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      const q = query(collection(db, 'users', user.uid, 'wcaps_transactions'));
      getDocs(q)
        .then(snap => setHasPreviousOrders(!snap.empty))
        .catch(err => console.error("Error checking previous orders for patron reward validation:", err));
    }
    
    eventService.getEventById(eventId).then((fetchedEvent) => {
      setEvent(fetchedEvent);
      if (fetchedEvent?.ticketTiers) {
        const initialQuantities: Record<string, number> = {};
        fetchedEvent.ticketTiers.forEach(tier => {
          initialQuantities[tier.name] = 0;
        });
        setQuantities(initialQuantities);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [eventId, user?.uid]);

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>;
  }

  if (!event) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-4">
         <h1 className="text-xl font-black uppercase text-on-background">Event Not Found</h1>
         <button onClick={onBack} className="text-primary font-bold text-sm uppercase">Go Back</button>
       </div>
     );
  }

  const handleUpdateQuantity = (tierName: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [tierName]: Math.max(0, (prev[tierName] || 0) + delta)
    }));
  };

  const selectedTiers = Object.entries(quantities).filter(([_, qty]) => qty > 0);
  const totalQuantity = selectedTiers.reduce((sum, [_, qty]) => sum + qty, 0);
  
  const orderTotal = selectedTiers.reduce((sum, [name, qty]) => {
    const tier = event.ticketTiers?.find(t => t.name === name);
    return sum + (tier?.price || 0) * qty;
  }, 0);

  const handlePurchase = async (reference?: string) => {
    if (totalQuantity === 0 || !event || isProcessing) return;
    setIsProcessing(true);
    try {
      // 1. Update sold counts for each tier
      for (const [tierName, qty] of selectedTiers) {
        await eventService.purchaseTickets(event.id, event.venueId, tierName, qty);
      }
      
      // 2. Award W-Caps & Create formal order record
      if (user) {
        const orderItems = selectedTiers.map(([name, qty]) => {
          const tier = event.ticketTiers?.find(t => t.name === name);
          return {
            item: {
              id: `ticket-${event.id}-${name}`,
              name: `${event.title} - ${name}`,
              price: tier?.price || 0,
              category: 'Tickets',
              description: `Admission for ${event.title}`,
              image: event.image
            } as any,
            quantity: qty
          };
        });

        const orderId = await orderService.createOrder({
          user_id: user.uid,
          venue_id: event.venueId,
          event_id: event.id,
          customer_name: user.displayName || user.full_name || 'Customer',
          total_amount: orderTotal,
          total: orderTotal,
          items: orderItems,
          status: 'ready',
          payment_status: 'Paid',
          payment_method: 'Card',
          table_number: 'N/A',
          payment_gateway_ref: reference || 'N/A'
        }, user.email);

        // 3. Create individual tickets for scanning
        const ticketsToCreate: Omit<Ticket, 'id'>[] = [];
        for (const [tierName, qty] of selectedTiers) {
          const tier = event.ticketTiers?.find(t => t.name === tierName);
          for (let i = 0; i < qty; i++) {
            ticketsToCreate.push({
              order_id: orderId || `temp-${Date.now()}`,
              user_id: user.uid,
              venue_id: event.venueId,
              event_id: event.id,
              tier_name: tierName,
              price: tier?.price || 0,
              status: 'valid',
              timestamp: new Date().toISOString(),
              event_title: event.title,
              event_date: event.date,
              event_image: event.image,
              customer_name: user.displayName || user.full_name || 'Customer'
            });
          }
        }
        await orderService.createTickets(ticketsToCreate);

        await wcapsService.recordOrder(
          user.uid, 
          orderTotal, 
          { id: event.id, name: event.title, type: 'event' },
          user.budget_limit || user.budgetLimit || 0
        );
      }
      
      setPurchaseComplete(true);
    } catch (err) {
      console.error(err);
      alert('Purchase failed: ' + (err as Error).message);
      setIsProcessing(false);
    }
  };

  const estimatedWcaps = wcapsService.calculateEstimatedEarnings(
    orderTotal,
    user?.budget_limit || user?.budgetLimit || 0,
    event.wcaps_config,
    hasPreviousOrders
  );

  if (purchaseComplete) {
    return (
      <div className={cn("min-h-screen pb-32 transition-colors duration-300 flex flex-col items-center justify-center p-6 text-center space-y-6", isDark ? "bg-background text-white" : "bg-background text-on-background")}>
        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center">
           <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        <div>
           <h2 className="text-3xl font-black uppercase tracking-tight">Tickets Secured</h2>
           <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mt-2">See you at {event.title}!</p>
        </div>
        <button onClick={onBack} className="mt-8 h-12 px-8 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20">
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen pb-32 transition-colors duration-300",
      isDark ? "bg-background text-white" : "bg-background text-on-background"
    )}>
      {/* Cover Image & Header */}
      <div className="relative h-[40vh] min-h-[300px] w-full">
         <div className="absolute top-4 left-4 z-50">
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white">
              <ArrowLeft size={18} />
            </button>
         </div>
         <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover" alt="" />
         <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
         <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-primary text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded inline-block mb-3">{event.status || 'Active'}</div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight">{event.title}</h1>
         </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
         {/* Details Column */}
         <div className="md:col-span-2 space-y-8">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-surface-container border border-outline px-4 py-3 rounded-2xl">
                 <Calendar className="text-primary" size={18} />
                 <span className="text-sm font-bold uppercase tracking-widest">{event.date}</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container border border-outline px-4 py-3 rounded-2xl">
                 <Clock className="text-primary" size={18} />
                 <span className="text-sm font-bold uppercase tracking-widest">{event.time || `${event.startTime} - ${event.endTime}`}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 bg-surface-container border border-outline px-4 py-3 rounded-2xl">
                   <MapPin className="text-primary" size={18} />
                   <span className="text-sm font-bold uppercase tracking-widest">{event.location}</span>
                </div>
              )}
            </div>

            <div className="bg-surface-container border border-outline rounded-3xl p-6 md:p-8 space-y-4">
               <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                 <FileText className="text-primary" size={20} /> About This Event
               </h3>
               <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                 {event.description || "Join us for an unforgettable experience. Features full bar, premium VIP sections, and stellar entertainment lineup."}
               </p>
            </div>
         </div>

          {/* Ticket Column */}
          <div className="space-y-6">
             <div className="bg-surface-container-high border border-outline rounded-3xl p-6 sticky top-6">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 mb-6">
                  <TicketIcon className="text-primary" size={20} /> Select Tickets
                </h3>
                
                {event.ticketTiers && event.ticketTiers.length > 0 ? (
                  <div className="space-y-4 mb-6">
                    {event.ticketTiers.map((tier, idx) => {
                      const qty = quantities[tier.name] || 0;
                      return (
                        <div 
                          key={tier.id || `tier-${idx}-${tier.name}`}
                          className={cn(
                            "border rounded-2xl p-4 transition-all",
                            qty > 0 ? "border-primary bg-primary/5" : "border-outline bg-surface-container"
                          )}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                               <span className="font-black uppercase tracking-tight block">{tier.name}</span>
                               <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">{tier.capacity - tier.sold} Available</p>
                            </div>
                            <span className="font-mono font-bold text-primary">{formatCurrency(tier.price)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-4 mt-4">
                             <button 
                               onClick={() => handleUpdateQuantity(tier.name, -1)}
                               className="w-10 h-10 rounded-xl bg-background border border-outline flex items-center justify-center font-black text-lg hover:bg-surface-container-high transition-colors"
                             >-</button>
                             <span className="font-black text-lg">{qty}</span>
                             <button 
                               onClick={() => handleUpdateQuantity(tier.name, 1)}
                               className="w-10 h-10 rounded-xl bg-background border border-outline flex items-center justify-center font-black text-lg hover:bg-surface-container-high transition-colors"
                             >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 opacity-50">
                     <p className="text-xs font-black uppercase tracking-widest">No ticketing available</p>
                  </div>
                )}

                {totalQuantity > 0 && (
                  <div className="space-y-6">
                    {/* Points Estimation */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-black text-xs">W</div>
                          <div>
                             <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5">Estimated Earnings</p>
                             <p className="text-xs font-black text-primary">+{estimatedWcaps} W-Caps</p>
                          </div>
                       </div>
                       <Sparkles size={16} className="text-primary animate-pulse" />
                    </div>
                    
                    <div className="pt-4 border-t border-outline flex justify-between items-end">
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Order Total</p>
                          <p className="text-sm font-bold text-on-surface-variant uppercase">{totalQuantity} Tickets Selected</p>
                       </div>
                       <span className="text-2xl font-mono font-black">{formatCurrency(orderTotal)}</span>
                    </div>

                    <PaystackPayment
                      amount={orderTotal}
                      email={user?.email || 'customer@wayta.co.za'}
                      onSuccess={(reference) => {
                        handlePurchase(reference);
                      }}
                      onClose={() => {
                        setIsProcessing(false);
                      }}
                    >
                      {(initializePayment) => (
                        <div className="relative h-16 bg-surface-container-highest rounded-full overflow-hidden p-2 flex items-center border border-outline mt-6">
                          <motion.div 
                              className="absolute left-2 top-2 bottom-2 w-12 bg-primary rounded-full flex items-center justify-center font-black text-black shadow-lg z-10 cursor-pointer"
                              drag="x"
                              dragConstraints={{ left: 0, right: 280 }}
                              dragElastic={0.1}
                              onDragEnd={(_: any, info: any) => {
                                if (info.offset.x > 200 && !isProcessing) {
                                  setIsProcessing(true);
                                  initializePayment();
                                }
                              }}
                          >
                              &gt;&gt;
                          </motion.div>
                          <span className="w-full text-center text-on-surface-variant font-black text-[10px] uppercase tracking-[0.2em]">
                            {isProcessing ? "PROCESSING..." : "SLIDE TO PAY"}
                          </span>
                        </div>
                      )}
                    </PaystackPayment>
                  </div>
                )}
            </div>
         </div>

      </div>
    </div>
  );
};
