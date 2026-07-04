import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import {
  Search, Package, Plus, Minus, Trash2, LogOut, Users, ShoppingBag,

  History, Settings, RefreshCw, Key, CheckCircle, AlertTriangle,

  UserPlus, PlusCircle, Check, Loader2, Play, Activity, TrendingUp, User as UserIcon, UploadCloud

} from 'lucide-react';
import { db, collection, query, where, onSnapshot } from '../lib/firebase';
import { User, Order, MenuItem, Event } from '../types';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { orderService } from '../services/orderService';
import { staffService } from '../services/staffService';
import { cn, formatCurrency, showToast } from '../lib/utils';

export interface EventAdminDashboardViewProps {
  user: User;
  onLogout: () => void;
  onHome: () => void;
  theme?: 'light' | 'dark';
}

export const EventAdminDashboardView: React.FC<EventAdminDashboardViewProps> = ({
  user,
  onLogout,
  onHome,
  theme = 'dark'
}) => {
  // Tabs: 'stock' | 'orders' | 'staff'
  const [activeTab, setActiveTab] = useState<'stock' | 'orders' | 'staff' | 'vendors' | 'history'>('orders');

  // Shared IDs
  const effectiveVenueId = user.assigned_venue_id || 'test_venue_id';
  const effectiveEventId = user.assigned_event_id || 'test_event_id';

  // State Containers
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    stock: true,
    orders: true,
    staff: true,
    sync: false
  });

  // Search queries & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals & Forms
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showYocoSettings, setShowYocoSettings] = useState(false);

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('25');
  const [newItemCategory, setNewItemCategory] = useState('Beer');
  const [newItemStock, setNewItemStock] = useState('100');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemVendor, setNewItemVendor] = useState('');
  const [newItemIsPremium, setNewItemIsPremium] = useState(false);

  // Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState('BARTENDER');
  const [staffPhone, setStaffPhone] = useState('');
  const [generatedCreds, setGeneratedCreds] = useState<{ username: string; pin: string } | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Yoco settings
  const [yocoPrivateKey, setYocoPrivateKey] = useState(() => localStorage.getItem('yoco_private_key') || '');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // 1. Listen to inventory levels
  useEffect(() => {
    setLoading(prev => ({ ...prev, stock: true }));
    const unsub = inventoryService.listenToInventory(effectiveVenueId, (items) => {
      setInventory(items);
      setLoading(prev => ({ ...prev, stock: false }));
    });

    return unsub;
  }, [effectiveVenueId]);

  // 2. Listen to live Venue Orders
  useEffect(() => {
    setLoading(prev => ({ ...prev, orders: true }));
    // Listens to orders for this venue in real-time
    const q = query(
      collection(db, 'orders'),
      where('venue_id', '==', effectiveVenueId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const orderDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));

      // Sort by timestamp descending
      const sorted = orderDocs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setOrders(sorted);
      setLoading(prev => ({ ...prev, orders: false }));

    });

    return unsub;
  }, [effectiveVenueId]);

  // 3. Listen to staff members assigned to this venue/event
  useEffect(() => {
    setLoading(prev => ({ ...prev, staff: true }));
    const unsub = staffService.listenToEventStaff(effectiveEventId, (staff) => {
      setStaffList(staff);
      setLoading(prev => ({ ...prev, staff: false }));
    });

    return unsub;
  }, [effectiveEventId]);

  // Handle Increments & Decrements of Stock Levels
  const adjustStockLevel = async (itemId: string, currentStock: number, delta: number) => {
    const nextStock = Math.max(0, currentStock + delta);
    await inventoryService.updateStock(itemId, nextStock);
    showToast(`Stock updated to ${nextStock} UN`, 'success');
  };

  // Create or Update Inventory Item
  const handleSaveItem = async () => {
    if (!newItemName.trim()) {
      showToast('Item name is required', 'warning');
      return;
    }

    const priceNum = parseFloat(newItemPrice);
    const stockNum = parseInt(newItemStock);

    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Please enter a valid price', 'warning');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Please enter a valid stock value', 'warning');
      return;
    }

    const payload: Omit<InventoryItem, 'id'> = {
      venue_id: effectiveVenueId,
      eventId: effectiveEventId,
      name: newItemName.trim(),
      price: priceNum,
      category: newItemCategory,
      stock: stockNum,
      status: stockNum <= 0 ? 'Sold Out' : (stockNum < 10 ? 'Low Stock' : 'Available'),
      is_active: true,
      assigned_vendor_id: newItemVendor || undefined,
      is_premium: newItemIsPremium,
      code: newItemSku.trim() || undefined
    };

    try {
      if (editingItem && editingItem.id) {
        await inventoryService.updateItem(editingItem.id, payload);
        showToast('Inventory item updated successfully', 'success');
      } else {
        await inventoryService.addItem(payload, user.uid);
        showToast('New stock item added', 'success');
      }

      resetItemForm();
    } catch (err: any) {
      showToast(err.message || 'Failure saving item', 'error');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          if (rows.length === 0) {
            showToast('CSV is empty', 'warning');
            return;
          }

          let added = 0;
          let failed = 0;

          showToast(`Processing ${rows.length} items from CSV...`, 'success');

          const payloads: Omit<InventoryItem, 'id'>[] = [];

          for (const row of rows) {
            const name = row['Name'] || row['name'] || row['Product Name'];
            const category = row['Category'] || row['category'] || 'Uncategorized';
            const priceRaw = row['Price'] || row['price'];
            const stockRaw = row['Stock'] || row['stock'] || row['Quantity'];
            const sku = row['SKU'] || row['sku'] || row['Code'];
            const premiumRaw = row['Premium'] || row['premium'] || row['Is Premium'];

            if (!name) {
              failed++;
              continue;
            }

            const priceNum = parseFloat(priceRaw) || 0;
            const stockNum = parseInt(stockRaw) || 0;
            const isPremium = String(premiumRaw).toLowerCase() === 'true' || String(premiumRaw) === '1' || String(premiumRaw).toLowerCase() === 'yes';

            const payload: Omit<InventoryItem, 'id'> = {
              venue_id: effectiveVenueId,
              eventId: effectiveEventId,
              name: String(name).trim(),
              category: String(category).trim(),
              price: priceNum,
              stock: stockNum,
              status: stockNum <= 0 ? 'Sold Out' : (stockNum < 10 ? 'Low Stock' : 'Available'),
              is_active: true,
              is_premium: isPremium
            };

            if (sku) {
              payload.code = String(sku).trim();
            }

            payloads.push(payload);
          }

          try {
            await inventoryService.addBulkItems(payloads, user.uid);
            added = payloads.length;
            showToast(`CSV Import complete: ${added} added, ${failed} failed`, 'success');
          } catch (err) {
            console.error('Error in bulk import:', err);
            showToast('Failed to import CSV stock via bulk', 'error');
          }
        } catch (error: any) {
          showToast(`Error parsing CSV: ${error.message}`, 'error');
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error) => {
        showToast(`CSV Parse Error: ${error.message}`, 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleEditItemTrigger = (item: InventoryItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemPrice(item.price.toString());
    setNewItemCategory(item.category);
    setNewItemStock(item.stock.toString());
    setNewItemSku(item.code || '');
    setNewItemVendor(item.assigned_vendor_id || '');
    setNewItemIsPremium(item.is_premium || false);
    setShowItemModal(true);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setNewItemName('');
    setNewItemPrice('25');
    setNewItemCategory('Beer');
    setNewItemStock('100');
    setNewItemSku('');
    setNewItemVendor('');
    setNewItemIsPremium(false);
    setShowItemModal(false);
  };

  const handleDeleteItemTrigger = async (itemId: string) => {
    if (confirm('Are you absolutely sure you want to delete this stock item?')) {
      await inventoryService.deleteItem(itemId);
      showToast('Item removed from inventory', 'warning');
    }
  };

  // Staff adding logic
  const handleGenerateDefaultVendor = async () => {
    setEnrolling(true);
    setGeneratedCreds(null);
    try {
      await staffService.enrollStaff(
        effectiveVenueId,
        'Vendor 1',
        'vendor1@wayta.app',
        'VENDOR',
        effectiveEventId,
        '0000000000'
      );
      showToast('Default Vendor 1 generated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error generating vendor', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnrollStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim()) {
      showToast('Please specify employee name and email', 'warning');
      return;
    }

    setEnrolling(true);
    setGeneratedCreds(null);

    try {
      const creds = await staffService.enrollStaff(
        effectiveVenueId,
        staffName.trim(),
        staffEmail.trim().toLowerCase(),
        staffRole,
        effectiveEventId,
        staffPhone
      );

      setGeneratedCreds({
        username: creds.username,
        pin: creds.pin
      });

      showToast('Employee enrolled successfully', 'success');
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
    } catch (err: any) {
      showToast(err.message || 'Error enrolling bartender', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const handleSyncYoco = async (forceMock = false) => {
  setLoading(prev => ({ ...prev, sync: true }));
  setSyncMessage(null);

  try {
    if (!inventory || inventory.length === 0) {
      setSyncMessage('No inventory to sync');
      showToast('No inventory items to sync with Yoco', 'warning');
      setLoading(prev => ({ ...prev, sync: false }));
      return;
    }

    // Import the service function
    const { syncInventoryToYoco } = await import('../services/yocoService')

    // If mock mode, just simulate success
    if (forceMock || !yocoPrivateKey) {
      console.log('🎭 [Mock Mode] Simulating Yoco sync...');
      setSyncMessage('Mock sync completed (no real Yoco API call)');
      showToast('Yoco mock sync completed', 'success');
      setLoading(prev => ({ ...prev, sync: false }));
      return;
    }

    // Real sync with Yoco
    const results = await syncInventoryToYoco(inventory);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    const message = `Yoco sync complete: ${successCount} succeeded, ${failedCount} failed`;
    setSyncMessage(message);
    
    if (failedCount === 0) {
      showToast('All items synced to Yoco successfully!', 'success');
    } else {
      showToast(message, 'warning');
    }

  } catch (error: any) {
    console.error('Yoco sync error:', error);
    setSyncMessage(`Sync failed: ${error.message}`);
    showToast('Failed to sync with Yoco. Check console for details.', 'error');
  } finally {
    setLoading(prev => ({ ...prev, sync: false }));
  }
};

  // Simulate testing order
  const handleSimulateTestingOrder = async () => {
    if (inventory.length === 0) {
      showToast('Must have at least one stock item to place simulated orders', 'warning');
      return;
    }

    const firstNames = ['Sizwe', 'Lerato', 'Gerrit', 'Thabo', 'Chloe', 'Naas', 'Moira', 'Kabelo', 'Jessica'];
    const lastNames = ['Xaba', 'Pretorius', 'Naidoo', 'Lekota', 'Maseko', 'Ndlovu', 'Smit', 'Venter'];
    const randomCustomer = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

    // Pick a random item
    const selectedItem = inventory[Math.floor(Math.random() * inventory.length)];
    const chosenQty = Math.floor(Math.random() * 2) + 1;
    const isVip = Math.random() > 0.6;

    const mockOrderPayload = {
      user_id: `test-patron-${Math.floor(100 + Math.random() * 900)}`,
      venue_id: effectiveVenueId,
      eventId: effectiveEventId,
      event_id: effectiveEventId,
      items: [{ item: selectedItem as any, quantity: chosenQty }],
      status: 'Pending' as const,
      payment_status: 'Paid' as const,
      customer_name: randomCustomer + (isVip ? ' [VIP]' : ''),
      total_amount: selectedItem.price * chosenQty,
      total: selectedItem.price * chosenQty,
      isVip,
      payment_method: 'Wayta Instant Settlement',
      order_number: `ORD-${Math.floor(1000 + Math.random() * 9000)}`
    };

    try {
      await orderService.createOrder(mockOrderPayload, 'test-patron@wayta.co.za');
      showToast(`Simulated paid customer order queued: R${mockOrderPayload.total_amount}`, 'success');
    } catch (err: any) {
      showToast(`Simulate order failed: ${err.message}`, 'error');
    }
  };

  // Status adjustments
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await orderService.updateOrderStatus(orderId, nextStatus, user.uid);
      showToast(`Order updated to: ${nextStatus}`, 'success');
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const categories = [
  'All', 
  'Beer', 
  'Cider',
  'Spirit Aperitif',
  'Wine',
  'Soft Drink', 
  'Water',
  'Energy Drink', 
  'Vape',
  'Hubbly Service',
  'Accessories'
];

  // Save key
  useEffect(() => {
    localStorage.setItem('yoco_private_key', yocoPrivateKey);
  }, [yocoPrivateKey]);

  // Derived variables for dashboards
  const filteredInventory = inventory.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const livePendingOrders = orders.filter(o => String(o.status).toLowerCase() === 'pending');
  const livePreparingOrders = orders.filter(o => {
    const s = String(o.status).toLowerCase();
    return s === 'preparing' || s === 'ready';
  });
  const pastTransactions = orders.filter(o => {
    const s = String(o.status).toLowerCase();
    return s === 'collected' || s === 'completed' || s === 'cancelled';
  });

  const totalRevenue = pastTransactions
    .filter(o => o.payment_status === 'Paid')
    .reduce((curr, next) => curr + (next.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-primary selection:text-black">
      {/* 1. Header Bar */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Event Admin Terminal</h1>
            <p className="text-sm font-black uppercase tracking-tight text-white -mt-0.5">Wayta Order & Stock Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Profile icon — visible but non-functional */}
          <div
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-600 cursor-default select-none pointer-events-none opacity-50"
            aria-disabled="true"
          >
            <UserIcon size={16} />
          </div>
          <button
            onClick={onLogout}
            className="flex h-9 w-9 md:px-4 md:w-auto items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. Top Stats Section */}
      <section className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-950 border-b border-neutral-900">
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Live Orders</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black font-mono tracking-tight text-primary">
              {livePendingOrders.length}
            </span>
            <span className="text-xs font-black uppercase tracking-wide text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
              Queue
            </span>
          </div>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Revenue Settlement</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black font-mono tracking-tight text-emerald-500">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Low Stock Markers</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black font-mono tracking-tight text-rose-500">
              {inventory.filter(i => i.stock < 10).length}
            </span>
            <span className="text-[10px] uppercase font-bold text-rose-500">Alerts</span>
          </div>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Team Active</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black font-mono tracking-tight text-blue-500">
              {staffList.length}
            </span>
            <span className="text-[10px] uppercase font-bold text-blue-400">Bartenders</span>
          </div>
        </div>
      </section>

      {/* 3. Navigation Rails & Tabs */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation panel */}
        <nav className="border-r border-neutral-900 bg-neutral-950 w-20 md:w-64 flex flex-col justify-between p-3 shrink-0">
          <div className="space-y-1.5">
            <button
              onClick={() => setActiveTab('orders')}
              className={cn(
                "w-full flex flex-col md:flex-row items-center gap-3 p-3.5 rounded-2xl font-black uppercase tracking-widest transition-all text-center md:text-left",
                activeTab === 'orders' 
                  ? "bg-primary text-black" 
                  : "text-neutral-500 hover:text-white bg-transparent hover:bg-neutral-900/50"
              )}
            >
              <ShoppingBag size={18} />
              <span className="text-[9px] md:text-xs block">Live Orders</span>
              {livePendingOrders.length > 0 && (
                <span className={cn(
                  "ml-auto text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center",
                  activeTab === 'orders' ? "bg-black text-primary" : "bg-primary text-black"
                )}>
                  {livePendingOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={cn(
                "w-full flex flex-col md:flex-row items-center gap-3 p-3.5 rounded-2xl font-black uppercase tracking-widest transition-all text-center md:text-left",
                activeTab === 'stock' 
                  ? "bg-primary text-black" 
                  : "text-neutral-500 hover:text-white bg-transparent hover:bg-neutral-900/50"
              )}
            >
              <Package size={18} />
              <span className="text-[9px] md:text-xs block">Stock levels</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={cn(
                "w-full flex flex-col md:flex-row items-center gap-3 p-3.5 rounded-2xl font-black uppercase tracking-widest transition-all text-center md:text-left",
                activeTab === 'staff' 
                  ? "bg-primary text-black" 
                  : "text-neutral-500 hover:text-white bg-transparent hover:bg-neutral-900/50"
              )}
            >
              <Users size={18} />
              <span className="text-[9px] md:text-xs block">Team Staff</span>
            </button>

            <button
              onClick={() => setActiveTab('vendors')}
              className={cn(
                "w-full flex flex-col md:flex-row items-center gap-3 p-3.5 rounded-2xl font-black uppercase tracking-widest transition-all text-center md:text-left",
                activeTab === 'vendors' 
                  ? "bg-primary text-black" 
                  : "text-neutral-500 hover:text-white bg-transparent hover:bg-neutral-900/50"
              )}
            >
              <UserIcon size={18} />
              <span className="text-[9px] md:text-xs block">Vendors</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "w-full flex flex-col md:flex-row items-center gap-3 p-3.5 rounded-2xl font-black uppercase tracking-widest transition-all text-center md:text-left",
                activeTab === 'history' 
                  ? "bg-primary text-black" 
                  : "text-neutral-500 hover:text-white bg-transparent hover:bg-neutral-900/50"
              )}
            >
              <History size={18} />
              <span className="text-[9px] md:text-xs block">History</span>
            </button>
          </div>

          <div className="pt-4 border-t border-neutral-900 space-y-2">
            <button
              onClick={() => setShowYocoSettings(true)}
              className={cn(
                "w-full h-12 flex items-center justify-center md:justify-start gap-3 px-3.5 rounded-xl transition-all text-[11px] tracking-wider uppercase font-black border",
                yocoPrivateKey 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                  : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
              )}
            >
              <Settings size={16} />
              <span className="hidden md:inline">Yoco Config</span>
              <span className={cn(
                "ml-auto text-[8px] px-1.5 py-0.5 rounded font-mono font-bold hidden md:inline-block",
                yocoPrivateKey ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-500"
              )}>
                {yocoPrivateKey ? "LIVE" : "DEMO"}
              </span>
            </button>
          </div>
        </nav>

        {/* Primary View Area */}
        <main className="flex-1 overflow-y-auto bg-neutral-950 p-6 md:p-8">
          <AnimatePresence mode="wait">
            {/* TABS VIEW DISPATCHER */}
            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-1">Live Order Monitoring</h2>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest">Real-time status synchronizers with patron & bartender stations</p>
                  </div>
                  <button
                    onClick={handleSimulateTestingOrder}
                    className="h-12 px-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-primary text-primary hover:text-black hover:bg-primary text-xs tracking-wider uppercase font-black flex items-center justify-center gap-2 transition-all shadow-xl"
                  >
                    <Play size={16} />
                    Simulate Patron Order
                  </button>
                </div>

                {loading.orders ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="text-primary animate-spin" size={32} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Active Queue Left */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Incoming Queue ({livePendingOrders.length})</h3>
                      </div>

                      {livePendingOrders.length === 0 ? (
                        <div className="bg-neutral-900/20 border border-dashed border-neutral-900 rounded-[2rem] p-12 text-center text-neutral-600">
                          <ShoppingBag className="mx-auto mb-3 opacity-30" size={32} />
                          <p className="text-xs font-black uppercase tracking-widest">Incoming queue is pristine</p>
                          <p className="text-[10px] text-neutral-600 mt-1">Press simulate button above to append a test user transaction</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {livePendingOrders.map((order, orderIdx) => (
                            <div key={`${order.id || (order as any)._id || 'pending'}-${orderIdx}`} className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 p-6 rounded-[2rem] transition-all duration-300">
                              <div className="flex items-center justify-between gap-4 mb-3 pb-3 border-b border-neutral-800">
                                <div>
                                  <span className="text-[10px] font-mono font-bold text-amber-500 block">
                                    #{order.order_number || order.id.slice(-4)}
                                  </span>
                                  <h4 className="text-sm font-black uppercase text-white tracking-tight mt-0.5">
                                    {order.customer_name || 'Anonymous Guest'}
                                  </h4>
                                </div>
                                <span className="text-xs font-mono font-bold text-neutral-400">
                                  {formatCurrency(order.total_amount)}
                                </span>
                              </div>

                              <div className="space-y-1.5 mb-4">
                                {order.items.map((item, idx) => (
                                  <div key={`${(item as any).id || (item as any)._id || item.item?.id || 'item'}-${idx}`} className="flex justify-between items-center text-xs text-neutral-400 font-bold uppercase">
                                    <span>{item.item?.name || 'Drink'}</span>
                                    <span className="font-mono text-neutral-500">x{item.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'Preparing')}
                                  className="h-10 px-4 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                  Accept & Prepare
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fulfilling Right */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Fulfilling Operations ({livePreparingOrders.length})</h3>
                      </div>

                      {livePreparingOrders.length === 0 ? (
                        <div className="bg-neutral-900/20 border border-dashed border-neutral-900 rounded-[2rem] p-12 text-center text-neutral-600">
                          <Activity className="mx-auto mb-3 opacity-30" size={32} />
                          <p className="text-xs font-black uppercase tracking-widest">Dispatch area empty</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {livePreparingOrders.map((order, orderIdx) => {
                            const isReady = order.status === 'Ready' || order.status === 'ready';
                            return (
                              <div key={`${order.id || (order as any)._id || 'preparing'}-${orderIdx}`} className={cn(
                                "bg-neutral-900 border p-6 rounded-[2rem] transition-all duration-300",
                                isReady ? "border-emerald-500/50" : "border-neutral-800"
                              )}>
                                <div className="flex items-center justify-between gap-4 mb-3 pb-3 border-b border-neutral-800">
                                  <div>
                                    <span className={cn(
                                      "text-[10px] font-mono font-bold block",
                                      isReady ? "text-emerald-500" : "text-amber-500"
                                    )}>
                                      #{order.order_number || order.id.slice(-4)} - {order.status}
                                    </span>
                                    <h4 className="text-sm font-black uppercase text-white tracking-tight mt-0.5">
                                      {order.customer_name || 'Anonymous Guest'}
                                    </h4>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-neutral-400">
                                    {formatCurrency(order.total_amount || order.total)}
                                  </span>
                                </div>

                                <div className="space-y-1.5 mb-4">
                                  {order.items.map((item, idx) => (
                                    <div key={`${(item as any).id || (item as any)._id || item.item?.id || 'item'}-${idx}`} className="flex justify-between items-center text-xs text-neutral-400 font-bold uppercase">
                                      <span>{item.item?.name || 'Drink'}</span>
                                      <span className="font-mono text-neutral-500">x{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex gap-2 justify-end">
                                  {!isReady ? (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'Ready')}
                                      className="h-10 px-4 bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                      Mark Ready
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'Collected')}
                                      className="h-10 px-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                      Mark Handed Over
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stock' && (
              <motion.div
                key="stock"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Headers and Sync */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-neutral-900/30 border border-neutral-900 p-6 rounded-[2rem]">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-white">Stock Level Monitoring panel</h2>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Configure stock levels, price indices or connect Yoco POS items</p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Name,Category,Price,Stock,SKU,Premium\nCastle Lite,Beer,35,100,CL-001,true\nCoke,Soft Drink,20,50,COKE-001,false";
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "inventory_template.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="h-12 px-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all duration-300"
                    >
                      Template
                    </button>
                    <input
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-12 px-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-white hover:border-neutral-500 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all duration-300"
                    >
                      <UploadCloud size={16} />
                      Mass Import
                    </button>
                    <button
                      onClick={() => handleSyncYoco(false)}
                      disabled={loading.sync}
                      className="h-12 px-5 rounded-2xl bg-neutral-800 text-primary border border-neutral-700 hover:border-primary flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all duration-300"
                    >
                      {loading.sync ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                      Sync Yoco API
                    </button>
                    <button
                      onClick={() => handleSyncYoco(true)}
                      disabled={loading.sync}
                      className="h-12 px-5 rounded-2xl bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-500 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all duration-300"
                    >
                      Demo Yoco sync
                    </button>
                    <button
                      onClick={() => setShowItemModal(true)}
                      className="h-12 h-12 px-6 rounded-2xl bg-primary text-black flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all duration-300"
                    >
                      <PlusCircle size={18} />
                      Add Product
                    </button>
                  </div>
                </div>

                {/* Highly Visible Yoco LIVE KEY setup panel */}
                <div className="bg-neutral-900/40 border border-neutral-950 p-5 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4 mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                      <Key size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">Yoco Live Connection Status</h3>
                      <p className="text-[10px] text-neutral-400 uppercase mt-0.5 leading-relaxed font-semibold">
                        {yocoPrivateKey 
                          ? "Using live integration secret key. Active syncing will fetch real Yoco stock data." 
                          : "Synchronizer running in Demo Sandbox. Provide a Live Secret Key for instant field telemetry testing."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <input 
                      type="password"
                      placeholder="sk_live_..."
                      value={yocoPrivateKey}
                      onChange={(e) => setYocoPrivateKey(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 focus:border-neutral-700 outline-none rounded-xl px-4 h-11 text-xs font-mono text-white w-full md:w-64 animate-pulse-slow"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('yoco_private_key', yocoPrivateKey);
                        showToast('Yoco live key configured', 'success');
                      }}
                      className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-[10px] h-11 px-4 rounded-xl shrink-0 transition-all border border-transparent"
                    >
                      Save Key
                    </button>
                  </div>
                </div>

                {syncMessage && (
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-[11px] font-semibold text-neutral-400 flex items-center justify-between gap-4">
                    <span className="flex-1 font-sans">{syncMessage}</span>
                    <button onClick={() => setSyncMessage(null)} className="text-neutral-500 hover:text-white uppercase font-black text-[9px] tracking-widest">Dismiss</button>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input 
                      placeholder="Search live stock catalog..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-4 text-xs font-bold uppercase tracking-wide text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-neutral-700 transition-all"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                          selectedCategory === cat
                            ? "bg-primary border-primary text-black"
                            : "bg-transparent border-neutral-900 text-neutral-500 hover:text-white"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product List */}
                {loading.stock ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="text-primary animate-spin" size={32} />
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="bg-neutral-900/20 border border-dashed border-neutral-900 rounded-[2rem] p-16 text-center text-neutral-600">
                    <Package className="mx-auto mb-3 opacity-30" size={36} />
                    <p className="text-xs font-black uppercase tracking-widest">No stock level markers match filters</p>
                    <p className="text-[10px] text-neutral-600 mt-1">Tap Add Product, or synchronize with Yoco options above</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInventory.map((item, idx) => (
                      <div 
                        key={`${item.id || 'inv'}-${idx}`}
                        onClick={() => handleEditItemTrigger(item)}
                        className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl hover:border-primary cursor-pointer flex flex-col justify-between h-44 transition-all duration-300 relative group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-wider text-primary">{item.category}</span>
                              {item.is_premium && (
                                <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-amber-500/20">Premium</span>
                              )}
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-white mt-1 group-hover:text-primary transition-all line-clamp-2 pr-4">
                              {item.name}
                            </h3>
                            {item.code && (
                              <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest block mt-0.5">
                                SKU: {item.code}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-bold text-neutral-300">
                            {formatCurrency(item.price)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-neutral-800/80 mt-auto">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustStockLevel(item.id, item.stock, -1); }}
                              className="w-7 h-7 rounded-lg bg-neutral-950/80 border border-neutral-800 hover:border-primary hover:text-primary flex items-center justify-center text-neutral-400 active:scale-90 transition-all"
                            >
                              <Minus size={14} />
                            </button>
                            <span className={cn(
                              "text-[10px] font-mono font-bold px-2 py-0.5 rounded border min-w-[3.5rem] text-center",
                              item.stock < 10 
                                ? "bg-red-500/15 border-red-500/20 text-red-500" 
                                : "bg-emerald-500/15 border-emerald-500/20 text-emerald-500"
                            )}>
                              {item.stock} UN
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustStockLevel(item.id, item.stock, 1); }}
                              className="w-7 h-7 rounded-lg bg-neutral-950/80 border border-neutral-800 hover:border-primary hover:text-primary flex items-center justify-center text-neutral-400 active:scale-90 transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleDeleteItemTrigger(item.id); }}
                            className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all duration-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'staff' && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-1">Bartender Members Enrollment</h2>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest">Enlist, view and audit staff accounts aligned to testing synchronized events</p>
                  </div>
                  <button
                    onClick={() => { setGeneratedCreds(null); setShowStaffModal(true); }}
                    className="h-12 px-6 rounded-2xl bg-primary text-black flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-xl"
                  >
                    <UserPlus size={16} />
                    Enroll Team Member
                  </button>
                </div>

                {loading.staff ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="text-primary animate-spin" size={32} />
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="bg-neutral-900/20 border border-dashed border-neutral-900 rounded-[2rem] p-16 text-center text-neutral-600">
                    <Users className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest">No team members registered yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffList.map((member, mIdx) => (
                      <div key={`${member.uid || mIdx}-${mIdx}`} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider">
                            {member.role === 'BARTENDER' ? 'Bartender Pro' : member.role}
                          </span>
                          <h3 className="text-sm font-black uppercase tracking-tight text-white mt-1 pt-0.5">
                            {member.displayName || `${member.firstName} ${member.lastName}`}
                          </h3>
                          <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                            UID: {member.uid.slice(-10)} | {member.email}
                          </span>
                        </div>

                        <div className="pt-4 border-t border-neutral-800/80 mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-neutral-400">
                          <span>Verified: APPROVED</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'vendors' && (
              <motion.div
                key="vendors"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <UserIcon size={24} className="text-primary" /> Event Vendors
                    </h2>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                      Manage vendors and assign specific stock items
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowStaffModal(true); setStaffRole('VENDOR'); }}
                    className="h-10 px-6 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Plus size={14} /> Add Vendor
                  </button>
                </div>

                {staffList.filter(s => s.role === 'VENDOR').length === 0 ? (
                  <div className="bg-neutral-900/20 border border-dashed border-neutral-900 rounded-[2rem] p-16 text-center text-neutral-600">
                    <ShoppingBag className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest">No Vendors Enrolled</p>
                    <p className="text-[10px] uppercase font-bold mt-2 text-neutral-600 leading-relaxed max-w-sm mx-auto">
                      Enroll a vendor above, then assign stock items to them via the Stock Levels tab.
                    </p>
                    <button
                      onClick={handleGenerateDefaultVendor}
                      disabled={enrolling}
                      className="mt-6 h-10 px-6 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all active:scale-95 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {enrolling ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> Generate Default Vendor 1
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffList.filter(s => s.role === 'VENDOR').map((vendor, vIdx) => {
                      const vendorName = vendor.displayName || vendor.username || vendor.email || 'Unnamed Vendor';
                      const assignedStock = inventory.filter(i => i.assigned_vendor_id === vendor.uid);
                      
                      return (
                        <div key={`${vendor.uid || vIdx}-${vIdx}`} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">
                              Vendor Account
                            </span>
                            <h3 className="text-sm font-black uppercase tracking-tight text-white mt-1 pt-0.5">
                              {vendorName}
                            </h3>
                            <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                              UID: {vendor.uid.slice(-10)} | {vendor.email}
                            </span>
                          </div>

                          <div className="pt-4 border-t border-neutral-800 mt-6">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Assigned Stock ({assignedStock.length})</h4>
                            {assignedStock.length > 0 ? (
                              <div className="space-y-1">
                                {assignedStock.slice(0, 3).map((item, idx) => (
                                  <div key={`${item.id || 'item'}-${idx}`} className="text-[10px] font-bold text-neutral-300 flex justify-between items-center bg-neutral-950 px-2 py-1 rounded-md">
                                    <span>{item.name}</span>
                                    <span className="text-primary font-mono">{formatCurrency(item.price)}</span>
                                  </div>
                                ))}
                                {assignedStock.length > 3 && (
                                  <div className="text-[9px] font-black text-neutral-500 text-center pt-1">+ {assignedStock.length - 3} more</div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[9px] text-neutral-600 font-bold uppercase italic">No items assigned yet.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <History size={24} className="text-primary" /> Transactions History
                    </h2>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                      Split by event and individual vendors
                    </p>
                  </div>
                </div>

                {(() => {
                  const completedOrPaid = orders.filter(o => o.status === 'Completed' || o.status === 'completed' || o.status === 'paid' || o.status === 'Collected' || o.status === 'collected');
                  
                  const vendorTotals: Record<string, { total: number; name: string }> = {};
                  let eventTotal = 0;
                  
                  completedOrPaid.forEach(order => {
                    order.items?.forEach(req => {
                      const itemLineTotal = Number(req.item.price) * req.quantity;
                      const assignedVendor = req.item.assigned_vendor_id;
                      
                      if (assignedVendor) {
                        if (!vendorTotals[assignedVendor]) {
                          const vInfo = staffList.find(s => s.uid === assignedVendor);
                          vendorTotals[assignedVendor] = { total: 0, name: vInfo ? (vInfo.displayName || vInfo.username || vInfo.email || assignedVendor) : assignedVendor };
                        }
                        vendorTotals[assignedVendor].total += itemLineTotal;
                      } else {
                        eventTotal += itemLineTotal;
                      }
                    });
                  });

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative flex flex-col justify-between">
                          <span className="text-[9px] font-black uppercase text-primary tracking-wider">Event Stock Defaults</span>
                          <span className="text-2xl font-mono text-white mt-2 block">{formatCurrency(eventTotal)}</span>
                        </div>
                        {Object.entries(vendorTotals).map(([uid, sum]) => (
                          <div key={uid} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative flex flex-col justify-between">
                            <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Vendor: {sum.name}</span>
                            <span className="text-2xl font-mono text-white mt-2 block">{formatCurrency(sum.total)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Recent Completed Orders</h3>
                        </div>
                        {completedOrPaid.length === 0 ? (
                          <div className="p-8 text-center text-[10px] font-bold text-neutral-600 uppercase tracking-widest">No completed transactions yet</div>
                        ) : (
                          <div className="divide-y divide-neutral-800/80">
                            {completedOrPaid.slice().reverse().map((order, orderIdx) => (
                              <div key={`${order.id || orderIdx}-${orderIdx}`} className="p-5 flex justify-between items-center hover:bg-neutral-800/40 transition-colors">
                                <div>
                                  <span className="font-mono text-sm text-white font-bold block">{order.order_number ? `#${order.order_number}` : (order.id.slice(0, 8).toUpperCase())}</span>
                                  <span className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest font-bold">
                                    {order.items?.length || 0} ITEMS | {order.payment_method || 'CARD'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono text-sm text-primary block">{formatCurrency(order.total_amount || order.total || 0)}</span>
                                  <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-bold mt-1 block">
                                    {new Date(order.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* 4. Modals - STOCK LEVEL EDIT MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 min-h-screen bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] w-full max-w-lg p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black uppercase tracking-wider border-b border-neutral-800 pb-3 text-white">
              {editingItem ? 'Modify Stock Level' : 'Append New Inventory Item'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Product Name</label>
                <input 
                  placeholder="e.g. Castle Lite Premium"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold uppercase tracking-wide placeholder:text-neutral-700 outline-none focus:border-neutral-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-3 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-500 text-neutral-300"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Price index (ZAR)</label>
                  <input 
                    type="number"
                    placeholder="35"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Initial Units Stock</label>
                  <input 
                    type="number"
                    placeholder="100"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">SKU code (Optional)</label>
                  <input 
                    placeholder="SKU-XXXX-001"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-500 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox"
                      checked={newItemIsPremium}
                      onChange={(e) => setNewItemIsPremium(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded border border-neutral-700 bg-neutral-950 peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors"></div>
                    <Check className="absolute text-black opacity-0 peer-checked:opacity-100 w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-amber-500 transition-colors">Premium Item</span>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-widest mt-0.5">Visually highlight this item to staff</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Assign Vendor (Optional)</label>
                <select
                  value={newItemVendor}
                  onChange={(e) => setNewItemVendor(e.target.value)}
                  className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-3 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-500 text-neutral-300"
                >
                  <option value="">No Vendor Assignment</option>
                  {staffList.filter(s => s.role === 'VENDOR').map(v => (
                    <option key={v.uid} value={v.uid}>{v.displayName || v.username || v.email || 'Unnamed Vendor'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 pt-4 border-t border-neutral-800 justify-end">
              <button
                onClick={resetItemForm}
                className="h-11 px-6 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white uppercase font-black text-[10px] tracking-widest transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleSaveItem}
                className="h-11 px-6 rounded-xl bg-primary text-black uppercase font-black text-[10px] tracking-widest hover:opacity-90 transition-all"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modals - STAFF ENROLLMENT MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 min-h-screen bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] w-full max-w-lg p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black uppercase tracking-wider border-b border-neutral-800 pb-3 text-white flex items-center gap-2">
              <UserPlus className="text-primary" size={20} />
              Enroll Event Bartender team
            </h3>

            {generatedCreds ? (
              <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                  <CheckCircle size={16} />
                  Employee Registered Successfully
                </div>
                <p className="text-xs text-neutral-400 uppercase font-semibold">Please deliver the generated dynamic login credentials directly to the team member:</p>
                
                <div className="grid grid-cols-2 gap-4 bg-neutral-950 p-4 border border-neutral-900 rounded-xl">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 block mb-0.5">Username</span>
                    <span className="text-sm font-mono font-bold text-white uppercase select-all">{generatedCreds.username}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 block mb-0.5">6-Digit Pin code</span>
                    <span className="text-sm font-mono font-bold text-primary select-all">{generatedCreds.pin}</span>
                  </div>
                </div>

                <button
                  onClick={() => setGeneratedCreds(null)}
                  className="w-full h-11 bg-primary text-black uppercase font-black text-[10px] tracking-widest rounded-xl transition-all"
                >
                  Enroll Another Member
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnrollStaffMember} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">First Name & Surname</label>
                  <input 
                    placeholder="e.g. Jabulani Mofokeng"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    required
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold uppercase tracking-wide placeholder:text-neutral-700 outline-none focus:border-neutral-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Email index Address</label>
                  <input 
                    type="email"
                    placeholder="e.g. jabulani@wayta.co.za"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    required
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold tracking-wide placeholder:text-neutral-700 outline-none focus:border-neutral-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Contact Number</label>
                    <input 
                      placeholder="+27 72 123 4567"
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold tracking-wide outline-none focus:border-neutral-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Assigned Role</label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                      className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-3 text-xs font-bold uppercase tracking-wide outline-none focus:border-neutral-500 text-neutral-300"
                    >
                      <option value="BARTENDER">BARTENDER</option>
                      <option value="VENDOR">VENDOR</option>
                      <option value="EVENT_MANAGER">EVENT_MANAGER (Event Admin / Manager)</option>
                      <option value="MANAGER">MANAGER (Venue Manager)</option>
                      <option value="WAITER">WAITER</option>
                      <option value="STAFF">STAFF</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-neutral-800 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(false)}
                    className="h-11 px-6 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white uppercase font-black text-[10px] tracking-widest transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={enrolling}
                    className="h-11 px-6 rounded-xl bg-primary text-black uppercase font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  >
                    {enrolling && <Loader2 className="animate-spin" size={14} />}
                    {enrolling ? 'Enrolling...' : 'Register team'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. Modals - YOCO CONFIG INTEGRATION */}
      {showYocoSettings && (
        <div className="fixed inset-0 min-h-screen bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] w-full max-w-lg p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black uppercase tracking-wider border-b border-neutral-800 pb-3 text-white flex items-center gap-2">
              <Key className="text-primary" size={20} />
              Yoco API Key Setup
            </h3>

            <p className="text-[10.5px] uppercase font-semibold text-neutral-400 tracking-wide leading-relaxed">
              Retrieve stock quantities and item prices dynamically from your Yoco business portal. Input your <span className="text-white">Live Secret Key</span> below. Leave empty to maintain automatic mock simulation.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">Yoco Private API Secret Key</label>
                <input 
                  type="password"
                  placeholder="sk_live_..."
                  value={yocoPrivateKey}
                  onChange={(e) => setYocoPrivateKey(e.target.value)}
                  className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl px-4 text-xs font-bold outline-none focus:border-neutral-500 text-white"
                />
              </div>

              <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-xl space-y-1 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                <span className="text-[10px] uppercase font-black tracking-widest text-white block mb-1">Testing Information</span>
                <p>• Assumes products in the Yoco catalog will match items by title</p>
                <p>• Successfully imports new non-matching products into the db</p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-4 border-t border-neutral-800 justify-end">
              <button
                onClick={() => setShowYocoSettings(false)}
                className="h-11 px-6 rounded-xl bg-primary text-black uppercase font-black text-[10px] tracking-widest hover:opacity-90 transition-all w-full"
              >
                Apply Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
