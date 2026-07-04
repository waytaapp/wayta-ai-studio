import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Clock, 
  History, 
  Ban, 
  ChevronRight, 
  Search,
  ExternalLink,
  ChevronLeft,
  Edit2,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  RefreshCw,
  Zap,
  Printer,
  Download,
  Mail,
  QrCode,
  MapPin,
  FileText
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Order as GlobalOrder, Venue, OrderItem } from '../types';
import { orderService } from '../services/orderService';
import { extensionService } from '../services/extensionService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'react-qr-code';

interface OrdersViewProps {
  orders: GlobalOrder[];
  venues: Venue[];
  events?: import('../types').Event[];
  onOrderClick: (order: GlobalOrder) => void;
  onBack?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ 
  orders, 
  venues, 
  events = [], 
  onOrderClick, 
  onBack,
  theme,
  onToggleTheme
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'live' | 'past' | 'abandoned'>('live');
  const [viewingOrder, setViewingOrder] = useState<GlobalOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);

  const counts = useMemo(() => {
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let collected = 0;

    orders.forEach(order => {
      const status = (order.status || '').toLowerCase();
      if (status === 'pending' || status === 'paid') {
        pending++;
      } else if (status === 'preparing' || status === 'processing') {
        preparing++;
      } else if (status === 'ready') {
        ready++;
      } else if (status === 'collected' || status === 'completed') {
        collected++;
      }
    });

    return { pending, preparing, ready, collected };
  }, [orders]);

  const getVenueName = (venueId: string) => {
    return venues.find(v => v.id === venueId)?.name || 'Unknown Venue';
  };

  const getFilteredOrders = () => {
    return orders.filter(order => {
      const status = (order.status || '').toLowerCase();
      const isLive = status === 'pending' || status === 'paid' || status === 'preparing' || status === 'ready';
      const isPast = status === 'collected' || status === 'completed';
      const isAbandoned = order.payment_status === 'Pending' && !isLive;

      if (activeTab === 'live' && !isLive) return false;
      if (activeTab === 'past' && !isPast) return false;
      if (activeTab === 'abandoned' && !isAbandoned) return false;

      const venueName = getVenueName(order.venue_id);
      return (venueName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (order.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const filteredOrders = getFilteredOrders();

  const groupedOrders = useMemo(() => {
    const groups: Record<string, GlobalOrder[]> = {};
    filteredOrders.forEach(order => {
      let groupName = 'Unknown Venue';
      if (order.event_id) {
        const event = events.find(e => e.id === order.event_id);
        if (event) {
          groupName = `EVENT: ${event.title}`;
        } else {
          groupName = getVenueName(order.venue_id);
        }
      } else {
        groupName = getVenueName(order.venue_id);
      }
      
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(order);
    });
    return groups;
  }, [filteredOrders, venues, events]);

  const handlePrintInvoice = (order: GlobalOrder) => {
    const doc = new jsPDF() as any;
    const venueName = getVenueName(order.venue_id);
    
    // Header
    doc.setFontSize(22);
    doc.text('WAYTA INVOICE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Order ID: ${order.id}`, 105, 30, { align: 'center' });
    doc.text(`Date: ${new Date(order.timestamp).toLocaleString()}`, 105, 35, { align: 'center' });
    
    // Venue Details
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(venueName, 20, 50);
    doc.setFontSize(10);
    doc.text('Authorized Wayta Partner', 20, 56);
    
    // Items Table
    const tableData = (order.items || []).map(item => [
      item.item?.name || 'Item',
      item.quantity.toString(),
      formatCurrency(item.item?.price || 0),
      formatCurrency((item.item?.price || 0) * item.quantity)
    ]);
    
    (doc as any).autoTable({
      startY: 70,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: [0, 0, 0], textColor: [255, 255, 255] },
    });
    
    const finalY = (doc as any).lastAutoTable.cursor.y + 10;
    
    // Summary
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Amount Paid: ${formatCurrency(order.total || order.total_amount)}`, 140, finalY);
    
    // Footer
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150);
    doc.text('Thank you for using Wayta. This is a computer-generated invoice.', 105, 280, { align: 'center' });
    
    doc.save(`Invoice_${order.id.substring(0, 8)}.pdf`);
  };

  const handleEmailInvoice = async (order: GlobalOrder) => {
    if (!order.customer_name) return;
    setIsSendingEmail(order.id);
    const venueName = getVenueName(order.venue_id);
    const itemsList = (order.items || []).map(i => `${i.quantity}x ${i.item?.name || 'Item'} - ${formatCurrency((i.item?.price || 0) * i.quantity)}`).join('<br/>');
    
    try {
      // In a real app we'd get the user email from auth context, here we simulate
      await extensionService.sendEmail(
        'customer@example.com',
        `Wayta Invoice: ${venueName}`,
        `Hi, your invoice for order #${order.id.substring(0, 8)} at ${venueName} is ready. Total: ${formatCurrency(order.total || order.total_amount)}`,
        `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Wayta Invoice</h2>
            <p><strong>Venue:</strong> ${venueName}</p>
            <p><strong>Order #:</strong> ${order.id.substring(0,8)}</p>
            <p><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
            <hr/>
            <div style="margin: 20px 0;">
              ${itemsList}
            </div>
            <hr/>
            <h3>Total Paid: ${formatCurrency(order.total || order.total_amount)}</h3>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">Safe travels! Team Wayta.</p>
          </div>
        `
      );
      alert('Invoice sent to your email!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingEmail(null);
    }
  };

  const tabs = [
    { id: 'live', label: 'Active', icon: Zap },
    { id: 'past', label: 'History', icon: History },
    { id: 'abandoned', label: 'Unpaid', icon: Ban },
  ];

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="p-6 pt-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
           {onBack && (
             <button onClick={onBack} className="w-10 h-10 rounded-xl bg-surface-container border border-outline flex items-center justify-center mr-2">
               <ChevronLeft size={20} />
             </button>
           )}
           <h2 className="text-2xl font-black uppercase tracking-tight text-on-background italic">Pulse Summary</h2>
        </div>
      </header>

      {/* Stat Cards ROW */}
      <div className="px-6 mb-6 grid grid-cols-4 gap-3">
        <div className="bg-surface-container/60 border border-outline rounded-2xl p-3 flex flex-col justify-between items-start gap-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-wider truncate">Pending</span>
          </div>
          <span className="text-lg sm:text-xl font-mono font-bold text-on-background">{counts.pending}</span>
        </div>

        <div className="bg-surface-container/60 border border-outline rounded-2xl p-3 flex flex-col justify-between items-start gap-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-wider truncate">Preparing</span>
          </div>
          <span className="text-lg sm:text-xl font-mono font-bold text-on-background">{counts.preparing}</span>
        </div>

        <div className="bg-surface-container/60 border border-outline rounded-2xl p-3 flex flex-col justify-between items-start gap-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-wider truncate">Ready</span>
          </div>
          <span className="text-lg sm:text-xl font-mono font-bold text-on-background">{counts.ready}</span>
        </div>

        <div className="bg-surface-container/60 border border-outline rounded-2xl p-3 flex flex-col justify-between items-start gap-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-wider truncate">Collected</span>
          </div>
          <span className="text-lg sm:text-xl font-mono font-bold text-on-background">{counts.collected}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="bg-surface-container p-1.5 rounded-2xl border border-outline flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all",
                activeTab === tab.id 
                  ? "bg-primary text-black font-black shadow-lg shadow-primary/20" 
                  : "text-on-surface-variant font-bold hover:bg-white/5"
              )}
            >
              <tab.icon size={16} />
              <span className="text-[10px] uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-8">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
          <input 
            type="text"
            placeholder="Search venue or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 text-xs font-bold outline-none focus:border-primary transition-all text-on-surface"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="px-6 space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + searchQuery}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {Object.keys(groupedOrders).length > 0 ? (
              Object.entries(groupedOrders).map(([venueName, venueOrders]) => (
                <div key={venueName} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-outline/30 pb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/60 px-1">
                      {venueName}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {venueOrders.map((order, idx) => {
                      const isReady = order.status?.toLowerCase() === 'ready';
                      return (
                        <div key={`${order.id || 'order'}-${idx}`} className="relative">
                          <button
                            onClick={() => {
                              const status = order.status?.toLowerCase();
                              const isTicket = !!order.event_id || !!order.eventId;
                              const isLive = status === 'pending' || status === 'paid' || status === 'preparing' || status === 'ready';
                              
                              if (isTicket) {
                                setViewingOrder(order);
                              } else if (isLive && onOrderClick) {
                                onOrderClick(order);
                              } else {
                                setViewingOrder(order);
                              }
                            }}
                            className={cn(
                              "w-full bg-surface-container border border-outline rounded-3xl p-6 flex flex-col gap-4 text-left group hover:border-primary/50 transition-all active:scale-[0.98] relative overflow-hidden",
                              isReady && "border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                            )}
                          >
                            {isReady && (
                              <motion.div 
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-3xl -mr-12 -mt-12 rounded-full"
                              />
                            )}
                            
                            <div className="flex justify-between items-start relative z-10">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">#{order.order_number || order.id.substring(0, 8)}</p>
                                <h4 className="text-sm font-black text-on-background uppercase">{(order.items || []).length} Items Selected</h4>
                              </div>
                              <div className={cn(
                                "text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                                (order.status?.toLowerCase() === 'ready' || order.status?.toLowerCase() === 'completed') && "bg-emerald-500 text-black border-emerald-400",
                                (order.status?.toLowerCase() === 'preparing' || order.status?.toLowerCase() === 'paid') && "bg-primary/20 text-primary border-primary/30",
                                order.status?.toLowerCase() === 'collected' && "bg-surface-container-high text-on-surface-variant border-outline",
                                (order.payment_status === 'Pending' || order.status?.toLowerCase() === 'cancelled') && "bg-red-500/10 text-red-500 border-red-500/20"
                              )}>
                                {order.status?.toLowerCase() === 'ready' && <QrCode size={10} />}
                                {order.status}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 py-2 border-y border-outline/30">
                              {order.items?.map((item, i) => (
                                <span key={`ord-item-idx-${order.id}-${item.item?.id || 'item'}-${i}`} className="text-[9px] font-bold text-on-surface-variant border border-outline/50 px-2 py-1 rounded-lg bg-surface-container-high/50">
                                  {item.quantity}x {item.item?.name || 'Item'}
                                </span>
                              ))}
                              {order.items?.length > 3 && (
                                <span className="text-[9px] font-black text-primary px-2 py-1">+ {order.items.length - 3} More</span>
                              )}
                            </div>

                            <div className="flex justify-between items-end relative z-10">
                              <div className="flex items-center gap-3">
                                 <div className="flex items-center gap-1.5 text-on-surface-variant/40">
                                    <Clock size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                      {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </div>
                                 <div className="flex items-center gap-1.5 text-on-surface-variant/40">
                                    <MapPin size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[80px]">{getVenueName(order.venue_id)}</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-lg font-mono font-bold text-on-background tracking-tighter">{formatCurrency(order.total || order.total_amount)}</p>
                                 <div className="flex items-center justify-end gap-2 mt-1">
                                    {isReady ? (
                                      <span className="text-emerald-500 text-[8px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                                        Collection Ready <Check size={8} />
                                      </span>
                                    ) : (
                                      <span className="group-hover:text-primary text-on-surface-variant/30 text-[8px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                        Track Detail <ChevronRight size={8} />
                                      </span>
                                    )}
                                 </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-32 h-32 bg-surface-container rounded-3xl flex items-center justify-center mb-6 border border-outline/30 relative">
                  <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-3xl" />
                  <ShoppingBag size={64} className="text-on-surface-variant/20 relative z-10" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-on-background">No Pulse Sequences</h3>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mt-2 max-w-[200px] leading-relaxed">
                  Your session history for {activeTab} sequences is currently empty in this sector.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {activeTab === 'abandoned' && orders.some(o => o.payment_status === 'Pending') && (
        <div className="px-6 mt-8">
           <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex gap-4 items-center">
              <Ban className="text-red-500 shrink-0" size={20} />
              <p className="text-[9px] font-bold text-red-500/60 uppercase tracking-widest leading-relaxed">
                Abandoned orders expire after 60 minutes. Settle balance to avoid account restriction in mesh venues.
              </p>
           </div>
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {viewingOrder && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingOrder(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="relative w-full max-w-lg bg-surface-container border border-outline rounded-t-[40px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-8 pb-0 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight italic">Order Analysis</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                    Sequence #{viewingOrder.id.substring(0, 8)} • {getVenueName(viewingOrder.venue_id)}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingOrder(null)}
                  className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 no-scrollbar">
                {/* QR Code for Ready Orders (Excluded for Tickets) */}
                {(viewingOrder.status?.toLowerCase() === 'ready' && !(!!viewingOrder.event_id || !!viewingOrder.eventId)) && (
                  <div className="flex flex-col items-center gap-4 bg-emerald-500/5 p-8 rounded-3xl border border-emerald-500/20">
                     <div className="bg-white p-6 rounded-2xl shadow-2xl">
                        <QRCode 
                          value={viewingOrder.id} 
                          size={160}
                          level="H"
                        />
                     </div>
                     <div className="text-center">
                        <p className="text-emerald-500 font-black text-xs uppercase tracking-widest">Collection Pass</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-1">Show to bartender for scan</p>
                     </div>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Manifest Items</h5>
                  {viewingOrder.items?.map((item, idx) => (
                    <div key={`viewing-item-idx-${viewingOrder.id}-${item.item?.id || 'item'}-${idx}`} className="bg-background/40 border border-outline/30 p-5 rounded-2xl flex items-center justify-between group hover:border-[#ffe15d]/30 transition-all">
                      <div className="flex-1">
                        <h5 className="text-[12px] font-black uppercase tracking-widest group-hover:text-[#ffe15d] transition-colors">{item.item?.name || (item as any).name || 'Unknown Supply'}</h5>
                        <p className="text-[10px] font-mono font-bold text-on-surface-variant mt-1.5">
                           {formatCurrency(item.item?.price || 0)} <span className="mx-2 opacity-30">x</span> <span className="text-[#ffe15d]">{item.quantity}</span>
                        </p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-black font-mono">{formatCurrency((item.item?.price || 0) * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status History / Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-high/40 p-4 rounded-2xl border border-outline/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Processed At</p>
                    <p className="text-xs font-bold uppercase">{new Date(viewingOrder.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="bg-surface-container-high/40 p-4 rounded-2xl border border-outline/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Payment</p>
                    <p className={cn(
                      "text-xs font-bold uppercase",
                      viewingOrder.payment_status === 'Paid' ? "text-emerald-500" : "text-red-500"
                    )}>{viewingOrder.payment_status}</p>
                  </div>
                </div>
              </div>

              {/* Summary & Footer Actions */}
              <div className="p-8 pt-0 space-y-4">
                <div className="flex flex-col gap-4 p-6 bg-surface-container-high rounded-[2rem] border border-outline">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Sequence Value</p>
                      <p className="text-3xl font-black tracking-tighter text-white">{formatCurrency(viewingOrder.total || viewingOrder.total_amount)}</p>
                    </div>
                    {(viewingOrder.status?.toLowerCase() === 'collected' || viewingOrder.status?.toLowerCase() === 'completed') && (
                       <div className="flex gap-2">
                          <button 
                            onClick={() => handlePrintInvoice(viewingOrder)}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all"
                            title="Download PDF"
                          >
                            <Download size={20} />
                          </button>
                          <button 
                            onClick={() => handleEmailInvoice(viewingOrder)}
                            disabled={!!isSendingEmail}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                            title="Send to Email"
                          >
                            {isSendingEmail === viewingOrder.id ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Mail size={20} />}
                          </button>
                       </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setViewingOrder(null)}
                    className="w-full h-16 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-primary/20"
                  >
                    Dismiss Analysis
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


