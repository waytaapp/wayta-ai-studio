import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Package, BarChart3, 
  Settings, LogOut, TrendingUp,
  Home, ArrowLeft, MoreHorizontal, DollarSign,
  Truck, ShoppingBag, Clock, CheckCircle2,
  AlertTriangle, Zap, Search, Plus
} from 'lucide-react';
import { User, Venue, Order } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { useViewport } from '../hooks/useViewport';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { InventoryImportModal } from '../components/modals/InventoryImportModal';
import { InventoryItemModal } from '../components/modals/InventoryItemModal';
import { FileUp } from 'lucide-react';

interface VendorDashboardViewProps {
  user: User | null;
  onLogout: () => void;
  venue?: Venue;
  orders?: Order[];
  onBack?: () => void;
  onHome?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

type DashboardTab = 'home' | 'inventory' | 'orders' | 'settings';

export const VendorDashboardView: React.FC<VendorDashboardViewProps> = ({ 
  user, 
  onLogout, 
  venue,
  orders: allOrders = [],
  onBack,
  onHome,
  theme,
  onToggleTheme
}) => {
  const isDark = theme === 'dark';
  const { isMobile, isLandscape } = useViewport();
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showInventoryItemModal, setShowInventoryItemModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  const [showFloatingNav, setShowFloatingNav] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingNav(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const vendorOrders = allOrders.filter(o => o.venue_id === venue?.id);

  useEffect(() => {
    if (venue?.id) {
      const unsub = inventoryService.listenToInventory(venue.id, (items) => {
        // As a vendor, I might only manage items in certain categories
        // For now, listing all for the venue I'm assigned to
        setInventory(items);
      });
      return () => unsub();
    }
  }, [venue?.id]);

  const handleAddItem = () => {
    setSelectedInventoryItem(null);
    setShowInventoryItemModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setShowInventoryItemModal(true);
  };

  const renderHome = () => (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container border border-outline p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col justify-between h-28 sm:h-32">
          <span className="text-secondary font-black">R</span>
          <div>
            <p className="text-lg sm:text-2xl font-black italic tracking-tighter">R {vendorOrders.reduce((acc, o) => acc + o.total, 0).toLocaleString()}</p>
            <p className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-widest mt-1">Revenue</p>
          </div>
        </div>
        <div className="bg-surface-container border border-outline p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col justify-between h-28 sm:h-32">
          <Truck className="text-secondary" size={16} />
          <div>
            <p className="text-lg sm:text-2xl font-black italic tracking-tighter">14</p>
            <p className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-widest mt-1">Shipments</p>
          </div>
        </div>
        <div className="bg-surface-container border border-outline p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col justify-between h-28 sm:h-32">
          <Package className="text-secondary" size={16} />
          <div>
            <p className="text-lg sm:text-2xl font-black italic tracking-tighter">{inventory.length}</p>
            <p className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-widest mt-1">Managed SKUs</p>
          </div>
        </div>
        <div className="bg-surface-container border border-outline p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col justify-between h-28 sm:h-32 border-secondary/50">
          <TrendingUp className="text-secondary" size={16} />
          <div>
            <p className="text-lg sm:text-2xl font-black italic tracking-tighter">94%</p>
            <p className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase tracking-widest mt-1">Score</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fulfillment Pipeline */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Fulfillment Pipeline</h2>
             <span className="text-[9px] font-black text-secondary bg-secondary/10 px-3 py-1 rounded-full uppercase tracking-widest">Live Flow</span>
          </div>
          
          <div className="bg-surface-container border border-outline rounded-[2.5rem] overflow-hidden">
             {[
               { id: '#TRK-882', status: 'In Transit', target: 'Main Bar', eta: '12m' },
               { id: '#TRK-885', status: 'Loading', target: 'VIP Lounge', eta: '45m' },
               { id: '#TRK-889', status: 'Dispatched', target: 'Pool Deck', eta: '5m' },
             ].map((shipment, i) => (
               <div key={i} className="p-6 border-b border-outline/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-4">
                     <div className={cn(
                       "w-10 h-10 rounded-xl flex items-center justify-center border",
                       shipment.status === 'Dispatched' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-secondary/10 border-secondary/20 text-secondary"
                     )}>
                        <Truck size={18} />
                     </div>
                     <div>
                        <p className="text-sm font-black uppercase tracking-tight">{shipment.id}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{shipment.target}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{shipment.status}</p>
                     <p className="text-sm font-black text-white italic">ETA: {shipment.eta}</p>
                  </div>
               </div>
             ))}
          </div>
        </section>

        {/* SKU Velocity */}
        <section className="space-y-4">
           <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">SKU Velocity</h2>
           <div className="bg-surface-container border border-outline rounded-[2.5rem] p-8 space-y-6">
              {[
                { name: 'Tanqueray Gin', volume: 'high', change: '+22%', progress: 85 },
                { name: 'Belvedere Vodka', volume: 'nominal', change: '+4%', progress: 40 },
                { name: 'Moët Imperial', volume: 'surge', change: '+68%', progress: 95 },
              ].map((sku, i) => (
                <div key={i} className="space-y-2">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-sm font-black uppercase tracking-tight text-white">{sku.name}</p>
                         <p className="text-[10px] font-black text-secondary uppercase tracking-widest">{sku.volume} demand</p>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500">{sku.change}</span>
                   </div>
                   <div className="h-1.5 w-full bg-outline/20 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-1000", sku.volume === 'surge' ? 'bg-secondary' : 'bg-secondary/40')} 
                        style={{ width: `${sku.progress}%` }} 
                      />
                   </div>
                </div>
              ))}
           </div>
        </section>
      </div>

      {/* Logistics Console */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <button 
           onClick={() => setActiveTab('inventory')}
           className="flex items-center gap-6 bg-black border border-outline p-8 rounded-[3rem] hover:border-secondary transition-all text-left relative overflow-hidden group"
         >
            <div className="relative z-10 w-16 h-16 rounded-[1.5rem] bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
              <Truck size={32} />
            </div>
            <div className="relative z-10 flex-1">
              <p className="text-xl font-black uppercase tracking-tighter italic">Stock Registry</p>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mt-1">Manual Inventory Sync</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform">
               <Package size={120} />
            </div>
         </button>
         
         <button 
           onClick={() => setActiveTab('orders')}
           className="flex items-center gap-6 bg-black border border-outline p-8 rounded-[3rem] hover:border-secondary transition-all text-left relative overflow-hidden group"
         >
            <div className="relative z-10 w-16 h-16 rounded-[1.5rem] bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
              <ShoppingBag size={32} />
            </div>
            <div className="relative z-10 flex-1">
              <p className="text-xl font-black uppercase tracking-tighter italic">Supply Requests</p>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mt-1">Open Procurement queue</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform">
               <Clock size={120} />
            </div>
         </button>
      </section>
    </div>
  );

  const handleUpdateStock = async (itemId: string, delta: number) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (item) {
        await inventoryService.updateStock(itemId, Math.max(0, item.stock + delta));
      }
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const renderInventory = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
         <div className="flex items-center gap-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Live SKU Registry</h2>
            {inventory.filter(i => (i.stock ?? 0) <= 5).length > 0 && (
              <span className="bg-amber-500/20 text-amber-500 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {inventory.filter(i => (i.stock ?? 0) <= 5).length} Stock Alerts
              </span>
            )}
         </div>
         <div className="flex gap-2">
           <button 
             onClick={() => setShowInventoryModal(true)}
             className="p-2 bg-secondary/10 border border-secondary/20 rounded-xl text-secondary flex items-center gap-2"
           >
              <FileUp size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Bulk Sync</span>
           </button>
           <button 
             onClick={handleAddItem}
             className="p-2 bg-secondary/10 border border-secondary/20 rounded-xl text-secondary"
           >
              <Plus size={18} />
           </button>
         </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
        <input 
          placeholder="Filter SKU ID or Category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 text-sm font-bold uppercase outline-none focus:border-secondary transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {inventory
          .filter(i => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.category || '').toLowerCase().includes(searchQuery.toLowerCase()))
          .map(item => (
          <div 
            key={item.id} 
            className="bg-surface-container border border-outline p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between group hover:border-secondary transition-all"
          >
             <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
                <div onClick={() => handleEditItem(item)} className="w-14 h-14 bg-background border border-outline rounded-2xl flex items-center justify-center cursor-pointer">
                   <Package size={24} className="text-secondary" />
                </div>
                <div onClick={() => handleEditItem(item)} className="cursor-pointer">
                   <h3 className="text-base font-black uppercase tracking-tight">{item.name}</h3>
                   <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">{item.category}</span>
                </div>
             </div>
             
             <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-3">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleUpdateStock(item.id, -1); }}
                     className="w-7 h-7 rounded bg-emerald-500 hover:bg-emerald-600 active:scale-90 text-black flex items-center justify-center font-bold transition-colors text-sm cursor-pointer"
                     title="Decrease stock"
                   >
                     -
                   </button>
                   <div className="text-right">
                      <div className="flex items-center gap-2 mb-1 justify-end">
                         {item.stock <= 5 && (
                           <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 animate-pulse bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-full">
                             <span className="w-1 h-1 rounded-full bg-amber-500" /> LOW STOCK
                           </span>
                         )}
                         <span className={cn(
                           "text-sm font-black uppercase",
                           item.stock <= 5 ? "text-amber-500" : "text-emerald-500"
                         )}>{item.stock} Units</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-on-surface-variant">{formatCurrency(item.price)}</p>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleUpdateStock(item.id, 1); }}
                     className="w-7 h-7 rounded bg-emerald-500 hover:bg-emerald-600 active:scale-90 text-black flex items-center justify-center font-bold transition-colors text-sm cursor-pointer"
                     title="Increase stock"
                   >
                     +
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-on-background pb-32">
      {/* Floating Header Navigation */}
      <AnimatePresence>
        {showFloatingNav && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "fixed left-1/2 -translate-x-1/2 z-[100] bg-black/95 hover:bg-black backdrop-blur-xl border border-primary/30 p-1 rounded-full flex items-center gap-1 shadow-2xl shadow-primary/10 transition-all max-w-[95vw] overflow-x-auto scrollbar-hide",
              isLandscape && isMobile ? "top-2" : "top-4"
            )}
          >
            {!isMobile && (
              <div className="flex items-center gap-1.5 px-3 py-1 border-r border-white/10 shrink-0 select-none">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93]">Vendor DOCK</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {(
                [
                  {id: 'home', icon: Home, label: 'Home'},
                  {id: 'inventory', icon: Package, label: 'Inventory'},
                  {id: 'orders', icon: ShoppingBag, label: 'Supply'}
                ] as const
              ).map(({id, icon: Icon, label}) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                    activeTab === id 
                      ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={11} className={cn(activeTab === id ? "fill-black" : "")} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-6 bg-surface-container border-b border-outline sticky top-0 z-10 backdrop-blur-xl bg-opacity-80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <Truck className="text-secondary" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Vendor Hub</h1>
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em]">{user?.displayName || 'Supplier Proxy'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onToggleTheme && (
              <button 
                onClick={onToggleTheme}
                className="p-3 bg-surface-container-high border border-outline rounded-xl hover:text-primary transition-colors"
                title="Toggle Theme"
              >
                <Zap size={20} className={cn(isDark ? "text-primary" : "text-on-surface-variant")} />
              </button>
            )}
            <button 
              onClick={onLogout}
              className="p-3 bg-surface-container-high border border-outline rounded-xl hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'orders' && (
              <div className="p-10 border border-outline border-dashed rounded-[3rem] text-center space-y-4">
                 <AlertTriangle className="mx-auto text-on-surface-variant/20" size={48} />
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">No Pending Requests</p>
                    <p className="text-[8px] font-bold uppercase text-on-surface-variant/60 tracking-widest leading-relaxed max-w-[180px] mx-auto">Demand queue is currently optimized.</p>
                 </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 bg-black border border-outline rounded-[2.5rem] p-3 flex items-center justify-around z-50 shadow-2xl safe-bottom">
        <button 
          onClick={() => setActiveTab('home')}
          className={cn(
            "p-4 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'home' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <Home size={20} />
          {activeTab === 'home' && <span className="text-[8px] font-black uppercase tracking-widest">Home</span>}
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={cn(
            "p-4 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'inventory' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <Package size={20} />
          {activeTab === 'inventory' && <span className="text-[8px] font-black uppercase tracking-widest">Inventory</span>}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={cn(
            "p-4 rounded-full flex flex-col items-center gap-1 transition-all",
            activeTab === 'orders' ? "bg-primary text-black" : "text-primary/60 hover:text-primary"
          )}
        >
          <ShoppingBag size={20} />
          {activeTab === 'orders' && <span className="text-[8px] font-black uppercase tracking-widest">Supply</span>}
        </button>
        <button 
          onClick={onLogout}
          className="p-4 rounded-full flex flex-col items-center gap-1 text-on-surface-variant/40 hover:text-red-500 transition-all"
        >
          <LogOut size={20} />
        </button>
      </nav>

      <InventoryImportModal 
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        venueId={venue?.id || ''}
      />

      <InventoryItemModal 
        isOpen={showInventoryItemModal}
        onClose={() => setShowInventoryItemModal(false)}
        venueId={venue?.id || ''}
        item={selectedInventoryItem}
      />
    </div>
  );
};
