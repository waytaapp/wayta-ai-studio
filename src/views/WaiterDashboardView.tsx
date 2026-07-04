import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone, Clock, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, LogOut, Coffee, MapPin,
  MessageSquare, User as UserIcon, ArrowRight, Check,
  Filter, Star, Home, ShoppingBag
} from 'lucide-react';
import { User, Order, Venue } from '../types';
import { cn } from '../lib/utils';
import { useViewport } from '../hooks/useViewport';

interface WaiterDashboardViewProps {
  user: User | null;
  onLogout: () => void;
  venue?: Venue;
  orders?: Order[];
  onOrderAction?: (orderId: string, status: Order['status']) => void;
  onBack?: () => void;
  onHome?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

type FilterTab = 'all' | 'Pending' | 'VIP';

const isVIP = (order: Order) => {
  if (!order || !order.items || !Array.isArray(order.items)) return false;
  return order.items.some(i => i?.item?.category === 'Bottle Service');
};

const getNextStatus = (status: Order['status']): Order['status'] | null => {
  if (status === 'Pending') return 'Preparing';
  if (status === 'Preparing') return 'Ready';
  if (status === 'Ready') return 'Collected';
  return null;
};

const getPrevStatus = (status: Order['status']): Order['status'] | null => {
  if (status === 'Preparing') return 'Pending';
  if (status === 'Ready') return 'Preparing';
  return null;
};

export const WaiterDashboardView: React.FC<WaiterDashboardViewProps> = ({
  user,
  onLogout,
  venue,
  orders = [],
  onOrderAction,
  onBack,
  onHome
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const { isMobile, isLandscape } = useViewport();
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingNav(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredOrders = orders.filter(o => {
    if (o.status === 'Collected') return false;
    if (filter === 'Pending') return o.status === 'Pending';
    if (filter === 'VIP') return isVIP(o);
    return true;
  });

  const newOrders = filteredOrders.filter(o => o.status === 'Pending');
  const inProgress = filteredOrders.filter(o => o.status === 'Preparing');
  const collectionReady = filteredOrders.filter(o => o.status === 'Ready');

  const handleMove = (orderId: string, newStatus: Order['status']) => {
    onOrderAction?.(orderId, newStatus);
  };

  const renderOrderCard = (order: Order, idx?: number) => {
    const vip = isVIP(order);
    const next = getNextStatus(order.status);
    const prev = getPrevStatus(order.status);

    return (
      <motion.div
        key={`${order.id || 'waiter-order'}-${idx ?? 0}`}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'bg-surface-container border border-outline/30 rounded-2xl p-4 space-y-3',
          vip ? 'border-l-4 border-l-orange-500' : ''
        )}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              #{order.order_number || order.id.slice(-4).toUpperCase()}
            </span>
            {vip && (
              <span className="text-[9px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-500 border border-orange-500/30 px-2 py-0.5 rounded-full">
                VIP
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant">
            <Clock size={11} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Customer & Items */}
        {order.customer_name && (
          <p className="text-sm font-black uppercase tracking-tight text-on-background truncate">
            {order.customer_name.split(' ')[0]}
          </p>
        )}
        <div className="space-y-1">
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={`${(item as any).id ?? item.item?.id ?? item.item?.name ?? (item as any).name ?? idx}`} className="flex items-center gap-2">
              <span className="text-xs font-black text-primary">{item.quantity}x</span>
              <span className="text-xs font-bold text-on-surface-variant truncate">{item.item.name}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest">
              +{order.items.length - 3} more
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-outline/20">
          {prev && (
            <button
              onClick={() => handleMove(order.id, prev)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-outline/30 text-on-surface-variant hover:text-on-background hover:bg-surface-variant transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <ChevronLeft size={13} />
              {prev === 'Pending' ? 'New' : 'Prep'}
            </button>
          )}
          {next && (
            <button
              onClick={() => handleMove(order.id, next)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                next === 'Preparing' ? 'bg-orange-500 text-black hover:bg-orange-400' :
                next === 'Ready' ? 'bg-emerald-500 text-black hover:bg-emerald-400' :
                'bg-primary text-black hover:bg-primary/90'
              )}
            >
              {next === 'Ready' ? (
                <><ArrowRight size={13} /> Ready</>
              ) : (
                <><ArrowRight size={13} /> Start</>
              )}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const KanbanColumn = ({
    title,
    orders: colOrders,
    accentColor,
    dotColor,
  }: {
    title: string;
    orders: Order[];
    accentColor: string;
    dotColor: string;
  }) => (
    <div className="flex flex-col gap-4 min-w-[280px] w-full sm:w-[calc(33.333%-1rem)]">
      {/* Column Header */}
      <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-2 pt-1">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <h3 className={`text-sm font-black uppercase tracking-widest ${accentColor}`}>{title}</h3>
        </div>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
          accentColor.includes('red') ? 'bg-red-500/10 border-red-500/20 text-red-500' :
          accentColor.includes('orange') ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
          'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
        }`}>
          {colOrders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {colOrders.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant/40">
              <Coffee size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-[10px] font-black uppercase tracking-widest">No orders</p>
            </div>
          ) : (
            colOrders.map((order, idx) => renderOrderCard(order, idx))
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-on-background pb-20 flex flex-col">
      {/* Floating Header Navigation */}
      <AnimatePresence>
        {showFloatingNav && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "fixed left-1/2 -translate-x-1/2 z-[100] bg-black/95 hover:bg-black backdrop-blur-xl border border-primary/30 p-1 rounded-full flex items-center gap-1 shadow-2xl transition-all max-w-[95vw]",
              isLandscape && isMobile ? "top-2" : "top-4"
            )}
          >
            {!isMobile && (
              <div className="flex items-center gap-1.5 px-3 py-1 border-r border-white/10 shrink-0 select-none">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93]">Waiter DOCK</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {(
                [
                  {id: 'all', icon: Home, label: 'All Orders'},
                  {id: 'Pending', icon: Clock, label: 'Pending'},
                  {id: 'VIP', icon: Star, label: 'VIP Service'}
                ] as const
              ).map(({id, icon: Icon, label}) => (
                <button
                  key={id}
                  onClick={() => {
                    setFilter(id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                    filter === id 
                      ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={11} className={cn(filter === id ? "fill-black" : "")} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-6 bg-surface-container border-b border-outline sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Coffee className="text-orange-500" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-on-background">
                {venue?.name || 'Bar Station'}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {user?.displayName || 'Bartender'} • Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onHome && (
              <button
                onClick={onHome}
                className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center"
              >
                <MapPin size={16} />
              </button>
            )}
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-xl bg-surface-container border border-outline/30 text-on-surface-variant flex items-center justify-center hover:text-on-background transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar sticky top-[88px] z-10 bg-background border-b border-outline/20">
        {(['all', 'Pending', 'VIP'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all',
              filter === tab
                ? 'bg-primary text-black'
                : 'bg-surface-container border border-outline/30 text-on-surface-variant hover:text-on-background'
            )}
          >
            {tab === 'all' ? 'All' : tab === 'Pending' ? 'Pending' : '⭐ VIP'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-on-surface-variant/60">
          <span className="text-[10px] font-black uppercase tracking-widest">
            {orders.filter(o => o.status !== 'Collected').length} active
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 min-w-fit sm:min-w-0 sm:grid sm:grid-cols-3 h-full">
          <KanbanColumn
            title="New Orders"
            orders={newOrders}
            accentColor="text-red-500"
            dotColor="bg-red-500 animate-ping"
          />
          <KanbanColumn
            title="In Progress"
            orders={inProgress}
            accentColor="text-orange-500"
            dotColor="bg-orange-500 animate-pulse"
          />
          <KanbanColumn
            title="Collection Ready"
            orders={collectionReady}
            accentColor="text-emerald-500"
            dotColor="bg-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
