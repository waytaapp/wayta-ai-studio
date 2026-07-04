import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  ShoppingBag, 
  ChevronRight, 
  Filter, 
  Search, 
  Zap,
  ArrowRight,
  ChevronLeft,
  MoreVertical,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Venue, UserRole } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { orderService } from '../services/orderService';

interface WorkflowViewProps {
  venue: Venue;
  orders: Order[];
  onBack: () => void;
  role: UserRole;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Collected';

export const WorkflowView: React.FC<WorkflowViewProps> = ({ venue, orders: allOrders, onBack, role, theme = 'light', onToggleTheme }) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  const venueOrders = allOrders.filter(o => o.venue_id === venue.id);
  
  const filteredOrders = venueOrders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || (o.items && Array.isArray(o.items) && o.items.some(i => i?.item?.category === categoryFilter));
    return matchesSearch && matchesCategory;
  });

  const columns: { status: OrderStatus; label: string; icon: any; color: string }[] = [
    { status: 'Pending', label: 'Pending', icon: Clock, color: 'text-red-500' },
    { status: 'Preparing', label: 'Preparing', icon: RefreshCw, color: 'text-primary' },
    { status: 'Ready', label: 'Ready', icon: CheckCircle2, color: 'text-emerald-500' },
    { status: 'Collected', label: 'Collected', icon: ShoppingBag, color: 'text-on-surface-variant' }
  ];

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus: Order['status'] = 'Collected';
    if (currentStatus === 'Pending') nextStatus = 'Preparing';
    else if (currentStatus === 'Preparing') nextStatus = 'Ready';
    else if (currentStatus === 'Ready') nextStatus = 'Collected';
    else return;

    try {
      await orderService.updateOrderStatus(orderId, nextStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getCategories = () => {
    const categories = new Set<string>();
    categories.add('All');
    venueOrders.forEach(o => o.items.forEach(i => categories.add(i.item.category)));
    return Array.from(categories);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col w-full pb-32 animate-in fade-in duration-500">
      <header className="p-6 pt-12 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50 border-b border-outline/10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-surface-container border border-outline flex items-center justify-center active:scale-95 transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-on-background">Workflow Hub</h2>
            <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mt-1">Terminal Sequence • {venue.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-surface-container rounded-xl border border-outline/30">
            <button 
              onClick={() => setViewMode('board')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'board' ? "bg-primary text-black" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-primary text-black" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </header>

      <div id="bar-selector" className="px-6 py-4 flex flex-col gap-4">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {getCategories().map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-4 h-9 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                categoryFilter === cat 
                  ? "bg-primary border-primary text-black" 
                  : "bg-surface-container border-outline text-on-surface-variant"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text"
            placeholder="Search order or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-surface-container border border-outline rounded-xl pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      <div id="workflow-board" className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-6 no-scrollbar pb-12">
        {columns.map(col => (
          <div key={col.status} className="w-[300px] flex-shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <col.icon size={16} className={col.color} />
                <h3 className={cn("text-xs font-black uppercase tracking-widest", col.color)}>{col.label}</h3>
              </div>
              <span className="text-[10px] font-black bg-surface-container px-2.5 py-0.5 rounded-full border border-outline">
                {filteredOrders.filter(o => o.status === col.status).length}
              </span>
            </div>

            <div id={col.status === 'Preparing' ? 'ready-trigger' : undefined} className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-12">
              {filteredOrders
                .filter(o => o.status === col.status)
                .map((order, idx) => (
                  <motion.div
                    layout
                    key={`${order.id || 'workflow-order'}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container border border-outline rounded-2xl p-4 flex flex-col gap-4 hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => handleUpdateStatus(order.id, order.status)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[8px] font-black text-primary uppercase tracking-widest">#{order.id.slice(-4).toUpperCase()}</span>
                           <span className="text-[8px] font-bold text-on-surface-variant uppercase">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-tight text-on-background">
                          {order.customer_name || 'Guest'}
                        </h4>
                      </div>
                      <button className="p-1 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={14} />
                      </button>
                    </div>

                    <div className="space-y-1.5 border-t border-outline/20 pt-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[9px] font-bold uppercase text-on-surface-variant tracking-wide">
                          <span>{item.quantity}x {item.item.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-mono font-bold text-primary">{formatCurrency(order.total_amount || order.total)}</span>
                      {col.status !== 'Collected' && (
                        <div className="h-7 px-3 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center gap-2 text-[8px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-black transition-all">
                          {col.status === 'Pending' ? 'Prep' : col.status === 'Preparing' ? 'Ready' : 'Serve'}
                          <ArrowRight size={10} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              
              {filteredOrders.filter(o => o.status === col.status).length === 0 && (
                <div className="h-32 border-2 border-dashed border-outline/30 rounded-2xl flex items-center justify-center opacity-30">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Queue Empty</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-24 left-6 right-6">
        <div id="ai-priority-prep" className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-4 items-center backdrop-blur-md">
          <Zap className="text-primary shrink-0 animate-pulse" size={20} />
          <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest leading-relaxed">
            Sequence Guard: <span className="text-primary italic">Enabled</span> • Orders are synced via port 3000 to all staff terminals.
          </p>
        </div>
      </div>
    </div>
  );
};
