import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Wifi,
  DollarSign,
  Smartphone,
  CheckCircle2,
  Lock,
  Compass,
  LayoutGrid,
  Users,
  Layers,
  ShoppingBag,
  Bell,
  Sliders,
  Plus,
  Beer,
  HelpCircle,
  Activity,
  Award,
  BookOpen,
  PieChart as PieIcon,
  Zap,
  Check
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';

interface QuickTourSandboxViewProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
  triggerAppToast: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void;
}

// Interfaces for our sandboxed tour data
interface MockMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
}

interface MockTicketType {
  name: string;
  price: number;
  capacity: number;
  available: number;
}

export const QuickTourSandboxView: React.FC<QuickTourSandboxViewProps> = ({
  onBack,
  theme = 'dark',
  triggerAppToast
}) => {
  // Role Choice State
  const [selectedPath, setSelectedPath] = useState<'selection' | 'patron' | 'manager'>('selection');
  
  // Patron Tour Steps states
  // 1: Welcome & Budget -> 2: Interactive Ordering -> 3: Check out & Offline-Active Receipt
  const [patronStep, setPatronStep] = useState<number>(1);
  const [patronBudgetInput, setPatronBudgetInput] = useState<string>('150');
  const [patronBudget, setPatronBudget] = useState<number>(150);
  const [patronCart, setPatronCart] = useState<{item: MockMenuItem; quantity: number}[]>([]);
  const [isPatronOffline, setIsPatronOffline] = useState<boolean>(false);

  // Manager Tour Step states
  // 1: Create Event -> 2: Match Venue Inventory/Staff roster -> 3: Realize massive profits (Analytics)
  const [managerStep, setManagerStep] = useState<number>(1);
  const [managerEventName, setManagerEventName] = useState<string>('Amapiano Friday NIGHTS');
  const [managerVenueName, setManagerVenueName] = useState<string>('Pharaoh Landmark Lounge');
  
  // Dynamic system generated objects
  const [eventDate, setEventDate] = useState<string>('Tonight @ 9:00 PM');
  const [tickets, setTickets] = useState<MockTicketType[]>([]);
  const [venueItems, setVenueItems] = useState<MockMenuItem[]>([]);
  const [staffList, setStaffList] = useState<{name: string; role: string; status: 'ACTIVE' | 'PENDING'}[]>([]);
  const [locations, setLocations] = useState<{name: string; activeStock: number; capacityCount: number}[]>([]);

  // Analytics graph metrics state
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);

  // Generated menus templates
  const PATRON_MENU: MockMenuItem[] = [
    { id: '1', name: 'Zodiac Smoke Gin & Tonic', price: 18, category: 'Signature Cocktails', description: 'Dry infused purple gin, compressed rosemary smoke, botanical tonic.' },
    { id: '2', name: 'Golden Honey Old Fashioned', price: 22, category: 'Signature Cocktails', description: 'Saffron bourbon infusion, raw honeycomb block, orange oil mist.' },
    { id: '3', name: 'Veld Draft Dry Ale', price: 8, category: 'Ice Cold Beers', description: 'Crisp micro-brewed premium draft ale local to the valley.' },
    { id: '4', name: 'Zero-Proof Hibiscus Sour', price: 12, category: 'Signature Cocktails', description: 'Spiced ginger reduction, cold brewed hibiscus flower, lime.' },
    { id: '5', name: 'Cured Truffle Salami Plate', price: 26, category: 'Artisanal Platters', description: 'House cured game tenderloin, shaved truffle, local seed crackers.' },
  ];

  // Effect to automatically generate mock data when Operator inputs values
  useEffect(() => {
    if (selectedPath === 'manager') {
      // Intelligently build customized ticket tiers and menus depending on user venue/event inputs
      const safeEvent = managerEventName.trim() || 'Amapiano Friday';
      const safeVenue = managerVenueName.trim() || 'Pharaoh Landmark Lounge';

      // 1. Generate tickets
      setTickets([
        { name: `${safeEvent} General Entry`, price: 25, capacity: 500, available: 320 },
        { name: `${safeEvent} VIP Access Bar-Pass`, price: 65, capacity: 150, available: 45 },
        { name: `VVIP Premium Booth Package`, price: 450, capacity: 12, available: 3 },
      ]);

      // 2. Generate customized menus matching venue name vibe
      const normalizedVenue = safeVenue.toLowerCase();
      let customCategory = 'Artisanal Spirits';
      if (normalizedVenue.includes('lounge') || normalizedVenue.includes('bar')) {
        customCategory = 'Premium Infusions';
      } else if (normalizedVenue.includes('club') || normalizedVenue.includes('rave')) {
        customCategory = 'Neon Speed-Sip Shots';
      }

      setVenueItems([
        { id: 'm1', name: `${safeEvent} Signature Elixir`, price: 24, category: customCategory, description: 'House specialty with customized citrus spray.' },
        { id: 'm2', name: 'Liquid Gold Tequila Reserve', price: 30, category: customCategory, description: 'High density premium batch selected specifically for events.' },
        { id: 'm3', name: 'Spiced Amber Nitro Stout', price: 11, category: 'Draft Kegs', description: 'Served nitrogen fueled for immediate carbonated foam.' },
        { id: 'm4', name: 'Spiced Truffle Pork Ribs', price: 28, category: 'Late Night Fast Bites', description: 'Oven slow-cooked bites for dynamic event intake.' },
      ]);

      // 3. Generate Mock Staff Enrollment
      setStaffList([
        { name: 'Leandro V. (Senior Mixologist)', role: 'Bartender', status: 'ACTIVE' },
        { name: 'Sylvia K. (Sip Runner Coordinator)', role: 'Floor Runner', status: 'ACTIVE' },
        { name: 'Boko N. (Fulfillment Agent)', role: 'Apprentice Bartender', status: 'PENDING' },
      ]);

      // 4. Generate Mock floor plans and stock distribution
      setLocations([
        { name: 'Main Terrace Rooftop Bar', activeStock: 480, capacityCount: 200 },
        { name: 'Cozy Fireplace VIP Mezzanine', activeStock: 120, capacityCount: 50 },
        { name: 'Sub-Bass Underground Vault', activeStock: 350, capacityCount: 150 },
      ]);

      // 5. Generate high conversion Analytics Data
      setAnalyticsData([
        { time: '21:00', sales: 1200, orders: 48, speed: 1.8 },
        { time: '22:00', sales: 4200, orders: 154, speed: 2.1 },
        { time: '23:00', sales: 9800, orders: 382, speed: 1.5 },
        { time: '00:00', sales: 16500, orders: 610, speed: 1.2 },
        { time: '01:00', sales: 24800, orders: 852, speed: 1.6 },
        { time: '02:00', sales: 31200, orders: 1120, speed: 1.9 },
      ]);
    }
  }, [managerEventName, managerVenueName, selectedPath]);

  // Patron Cart Helpers
  const addToCart = (item: MockMenuItem) => {
    const currentCost = patronCart.reduce((sum, entry) => sum + (entry.item.price * entry.quantity), 0);
    if (currentCost + item.price > patronBudget) {
      triggerAppToast(`🚨 Spend Cap Alert: Adding "${item.name}" exceeds your Party limit of $${patronBudget}! Adjust your limit or streamline your basket.`, 'warning');
      return;
    }

    const existing = patronCart.find(e => e.item.id === item.id);
    if (existing) {
      setPatronCart(patronCart.map(e => e.item.id === item.id ? { ...e, quantity: e.quantity + 1 } : e));
    } else {
      setPatronCart([...patronCart, { item, quantity: 1 }]);
    }
    triggerAppToast(`"${item.name}" added to your sandboxed cart.`, 'success');
  };

  const removeFromCart = (itemId: string) => {
    const existing = patronCart.find(e => e.item.id === itemId);
    if (existing && existing.quantity > 1) {
      setPatronCart(patronCart.map(e => e.item.id === itemId ? { ...e, quantity: e.quantity - 1 } : e));
    } else {
      setPatronCart(patronCart.filter(e => e.item.id !== itemId));
    }
  };

  const patronTotal = patronCart.reduce((sum, entry) => sum + (entry.item.price * entry.quantity), 0);

  // Staff action mockups: adjusting inventories
  const adjustStock = (locIndex: number, amount: number) => {
    const nextLocs = [...locations];
    nextLocs[locIndex].activeStock = Math.max(0, nextLocs[locIndex].activeStock + amount);
    setLocations(nextLocs);
    triggerAppToast(`Transferred catalog: Updated stock levels dynamically in ${nextLocs[locIndex].name}.`, 'info');
  };

  // Staff action: enrolling mock bartender
  const authorizeStaff = (index: number) => {
    const nextStaff = [...staffList];
    nextStaff[index].status = 'ACTIVE';
    setStaffList(nextStaff);
    triggerAppToast(`Authorized staff: Mixologist status verified in POS system instantly.`, 'success');
  };

  const resetTour = () => {
    setSelectedPath('selection');
    setPatronStep(1);
    setPatronCart([]);
    setManagerStep(1);
    setPatronBudgetInput('150');
    setPatronBudget(150);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10 flex flex-col min-h-screen">
        
        {/* Top Navbar */}
        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-neutral-900 border border-white/10 rounded-xl flex items-center justify-center hover:bg-neutral-800 transition-all text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-primary/20 text-primary border border-primary/30 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <Sparkles size={10} className="fill-primary" /> SIM INTERACTIVE
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">SANDBOX ENVIRONMENT</span>
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight font-display">Wayta Quick-Tour Sandbox</h2>
            </div>
          </div>

          {selectedPath !== 'selection' && (
            <button 
              onClick={resetTour} 
              className="text-[10px] font-black uppercase tracking-widest text-[#ef4444] bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl transition-all hover:bg-red-500/20"
            >
              Restart Tour Select
            </button>
          )}
        </div>

        {/* 1. SELECTION SCREEN */}
        {selectedPath === 'selection' && (
          <div className="my-auto py-12 text-center max-w-2xl mx-auto space-y-12">
            <div className="space-y-4">
              <span className="py-1 px-3 bg-primary/10 border border-primary/25 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                SELECT EXPERIENTIAL PORTAL
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none font-display">
                EXPERIENCE THE FUTURE OF HOSPITALITY
              </h1>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                Step into our fully mapped, high-fidelity sandbox. No credit cards, no login, and absolutely zero infrastructure downloads needed. Select a path below.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
              {/* patron choice */}
              <motion.button
                whileHover={{ scale: 1.02, translateY: -4 }}
                onClick={() => setSelectedPath('patron')}
                className="bg-neutral-900/60 border border-white/10 p-6 md:p-8 rounded-[2.5rem] text-left hover:border-primary/40 group relative overflow-hidden transition-all text-white cursor-pointer"
              >
                <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Smartphone size={20} />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-primary text-[9px] font-mono uppercase font-black tracking-widest">PATH A</span>
                    <h3 className="text-xl font-black uppercase tracking-tight font-display">The Patron Experience</h3>
                    <p className="text-zinc-400 text-xs font-semibold uppercase">Instant Queue Tapping</p>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-relaxed font-medium">
                    Experience the speed of scanning a bar QR, defining automated budget locks, placing mock orders, and viewing persistent offline-ready payment barcodes.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-black text-primary uppercase pt-2 font-mono">
                    <span>Enter Patron Sandbox</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.button>

              {/* manager choice */}
              <motion.button
                whileHover={{ scale: 1.02, translateY: -4 }}
                onClick={() => setSelectedPath('manager')}
                className="bg-neutral-900/60 border border-white/10 p-6 md:p-8 rounded-[2.5rem] text-left hover:border-emerald-500/40 group relative overflow-hidden transition-all text-white cursor-pointer"
              >
                <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <LayoutGrid size={20} />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-emerald-400 text-[9px] font-mono uppercase font-black tracking-widest">PATH B</span>
                    <h3 className="text-xl font-black uppercase tracking-tight font-display">Venue & Event Manager</h3>
                    <p className="text-emerald-400 text-xs font-semibold uppercase">Zero-Infra Operations Control</p>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-relaxed font-medium">
                    Quickly launch a customized mock event, sync automated menus, match multi-bar inventory balances, authorize live staff mixers, and inspect dynamic sales trends.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase pt-2 font-mono">
                    <span>Enter Operator Dashboard</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.button>
            </div>
          </div>
        )}

        {/* 2. THE PATRON SIMULATED TOUR */}
        {selectedPath === 'patron' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Patron Progress Roadmap Banner */}
            <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">
                  {patronStep}
                </span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary font-mono">PATRON SANDBOX PROGRESS</p>
                  <p className="text-xs font-black uppercase tracking-tight">
                    {patronStep === 1 && "Set Spend Safeguard (Anti-Bill Shock)"}
                    {patronStep === 2 && "Speed-Pick Premium High Density Drinks"}
                    {patronStep === 3 && "Generate Secure Barcode Receipt (Offline Safe)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {patronStep > 1 && (
                  <button 
                    onClick={() => setPatronStep(p => p - 1)}
                    className="px-3.5 h-9 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all text-white"
                  >
                    Back
                  </button>
                )}
                {patronStep < 3 ? (
                  <button 
                    onClick={() => {
                      if (patronStep === 1 && patronBudget <= 0) {
                        triggerAppToast("Value Check: Please define a positive spent threshold.", "warning");
                        return;
                      }
                      setPatronStep(p => p + 1);
                    }}
                    className="px-4 h-9 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all"
                  >
                    Next Step
                  </button>
                ) : (
                  <button 
                    onClick={resetTour}
                    className="px-4 h-9 bg-emerald-500 text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all"
                  >
                    Finish Tour
                  </button>
                )}
              </div>
            </div>

            {/* Simulated Live Mobile Interface Box surrounded by Context Value Indicators */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* A. Dynamic Overlay Guidance (Left Block) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-neutral-900/40 border border-white/5 p-6 rounded-3xl space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/25 text-primary text-[8px] font-mono uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full">
                    <BookOpen size={10} /> VALUE HIGHLIGHT SYSTEM
                  </span>

                  {patronStep === 1 && (
                    <div className="space-y-3">
                      <h4 className="font-black text-sm uppercase tracking-tight text-white leading-tight">Step 1: Automated Party Limits Defeat Stress</h4>
                      <p className="text-zinc-450 text-xs font-medium leading-relaxed">
                        Rather than checking budgets manually in noisy venues, Patrons set a soft spending limit before ordering. This transparent budget barrier locks transactions automatically, protecting wallets from "bill shock".
                      </p>
                      <div className="bg-black/40 border border-white/5 p-3 rounded-xl font-mono text-[9px] uppercase space-y-1">
                        <span className="text-primary font-bold">🛠️ Real-Time Logic Checks</span>
                        <p className="text-zinc-500 font-medium">If any queued drink exceeds the available limit, validation throws a soft warning, allowing the patron to scale their budget on the fly.</p>
                      </div>
                    </div>
                  )}

                  {patronStep === 2 && (
                    <div className="space-y-3">
                      <h4 className="font-black text-sm uppercase tracking-tight text-white leading-tight">Step 2: Micro-Seconds to Sip Conversion</h4>
                      <p className="text-zinc-450 text-xs font-medium leading-relaxed">
                        By deploying the app directly in standard mobile browser contexts, patrons completely skip multi-tier app store waiting lines. They scan the table QR code and can place orders immediately under 3 clicks.
                      </p>
                      <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl font-mono text-[9px] text-primary space-y-1">
                        <span className="font-black uppercase tracking-wider">⚡ THE TRADITIONAL TAX</span>
                        <p className="text-zinc-350 select-none">App Store loading takes ~45 seconds and forces signup first. Wayta-speed is instantaneous. Immediate order fulfillment = immediate club revenues.</p>
                      </div>
                    </div>
                  )}

                  {patronStep === 3 && (
                    <div className="space-y-3">
                      <h4 className="font-black text-sm uppercase tracking-tight text-white leading-tight">Step 3: Underground Offline-First Resilience</h4>
                      <p className="text-zinc-450 text-xs font-medium leading-relaxed">
                        Event basement bars have bad cell grids. Under Wayta, once the transaction compiles, a cryptographic barcode receipt is cached locally on device storage. Even if absolute connectivity drops to 0, collection runner verification works 100% offline.
                      </p>
                      
                      <button
                        onClick={() => {
                          setIsPatronOffline(!isPatronOffline);
                          triggerAppToast(
                            !isPatronOffline 
                              ? "Simulated offline state triggered. Notice how the receipt continues to display flawlessly!" 
                              : "Restored connection status.",
                            !isPatronOffline ? "warning" : "success"
                          );
                        }}
                        className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                          isPatronOffline 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-neutral-800 hover:bg-neutral-700 text-white border-white/5"
                        }`}
                      >
                        {isPatronOffline ? "Reconnect Simulated Network" : "Test Underground Network drop"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulated Order Metrics Tracker */}
                <div className="bg-neutral-900 border border-white/10 p-5 rounded-3xl space-y-4">
                  <span className="text-[9px] text-zinc-500 font-black uppercase font-mono tracking-widest">LIVE WORKFLOW STATISTICS</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">SET LIMIT</span>
                      <p className="text-xl font-black font-mono text-primary">${patronBudget}</p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">SPENT ACTIVE</span>
                      <p className="text-xl font-black font-mono text-white">${patronTotal}</p>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, (patronTotal / (patronBudget || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider text-right">
                    Spent Capacity: {Math.round((patronTotal / (patronBudget || 1)) * 101)}%
                  </p>
                </div>
              </div>

              {/* B. The Simulated Mobile View Terminal (Center Block) */}
              <div className="lg:col-span-7 flex justify-center">
                <div className="w-full max-w-[380px] bg-[#0c0c0e] border-[6px] border-[#18181b] rounded-[3rem] shadow-2xl relative overflow-hidden aspect-[9/19] flex flex-col justify-between select-none">
                  
                  {/* Smartphone Top Notch Speaker */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-5 bg-neutral-950 rounded-b-2xl z-30 flex items-center justify-center">
                    <div className="w-12 h-1 bg-neutral-800 rounded-full" />
                  </div>

                  {/* Mobile header view banner */}
                  <div className="p-5 pt-8 bg-[#121215] border-b border-white/5 flex justify-between items-center z-20">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                      <span className="text-xs font-black uppercase tracking-tight text-white font-display">Clara's Nightspot</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[9px] font-bold uppercase">
                      <Wifi size={10} className={isPatronOffline ? "text-amber-500 animate-pulse" : "text-emerald-500"} />
                      <span>{isPatronOffline ? "OFFLINE GRID" : "CONNECTED"}</span>
                    </div>
                  </div>

                  {/* Body Content depending on Step */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-5 flex flex-col justify-between hide-scrollbar">
                    
                    {/* STEP 1: WELCOME & BUDGET DEFINING */}
                    {patronStep === 1 && (
                      <div className="space-y-6 my-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
                        <div className="text-center space-y-2">
                          <span className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full">
                            PARTY STATEMENT SET-UP
                          </span>
                          <h5 className="font-black uppercase tracking-tight text-base text-white">Rule Your Spending</h5>
                          <p className="text-zinc-500 text-[10px] font-medium max-w-[260px] mx-auto leading-normal">
                            Prevent deep night bill regrets. Define a micro spent guard check before you pick any premium custom beverages.
                          </p>
                        </div>

                        <div className="space-y-3 bg-neutral-900/60 border border-white/5 p-4 rounded-2xl">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono block">Max Allowed Spending Cap ($)</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-mono text-primary font-black">$</span>
                            <input 
                              type="number" 
                              value={patronBudgetInput}
                              onChange={(e) => {
                                setPatronBudgetInput(e.target.value);
                                const num = parseFloat(e.target.value);
                                if (!isNaN(num) && num > 0) setPatronBudget(num);
                              }}
                              className="bg-transparent border-0 border-b border-primary/30 text-2xl font-mono text-white font-black w-full focus:outline-none focus:border-primary"
                              placeholder="200"
                              id="tour-budget-input"
                            />
                          </div>
                          <p className="text-[8px] font-bold text-zinc-500 uppercase mt-2">Any transaction exceeding this will trigger a safeguard warning instantly.</p>
                        </div>

                        <button 
                          onClick={() => {
                            setPatronStep(2);
                            triggerAppToast("Spending cap registered. Welcome to Clara's Nightspot Menu!", "success");
                          }}
                          className="w-full h-12 bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                        >
                          <span>Confirm and Enter Menu</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}

                    {/* STEP 2: HIGH DENSITY INTERACTIVE ORDERING */}
                    {patronStep === 2 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
                        <div className="bg-neutral-900 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 font-mono">My Budget Cap Allowance</p>
                          <span className="font-mono text-xs font-black text-primary">${patronBudget - patronTotal} left</span>
                        </div>

                        {/* List items category selector */}
                        <div className="space-y-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-primary font-mono">⚡ QUICK DRINK SELECTION</p>
                          <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1 hide-scrollbar">
                            {PATRON_MENU.map((item) => {
                              const inCart = patronCart.find(e => e.item.id === item.id);
                              return (
                                <div 
                                  key={item.id} 
                                  className="bg-zinc-950 border border-white/5 p-3 rounded-xl flex justify-between items-center transition-all hover:bg-neutral-900/40 relative group"
                                >
                                  <div className="space-y-1 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none block font-mono">
                                        {item.category}
                                      </span>
                                    </div>
                                    <p className="font-bold text-xs uppercase tracking-tight text-white leading-tight">{item.name}</p>
                                    <p className="text-[9px] text-zinc-500 font-mono font-bold">${item.price}</p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {inCart ? (
                                      <div className="flex items-center gap-2 bg-neutral-900 border border-white/10 rounded-lg p-1">
                                        <button 
                                          onClick={() => removeFromCart(item.id)}
                                          className="w-5 h-5 flex items-center justify-center font-bold text-xs hover:text-red-400"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono text-[10px] font-black px-1">{inCart.quantity}</span>
                                        <button 
                                          onClick={() => addToCart(item)}
                                          className="w-5 h-5 flex items-center justify-center font-bold text-xs hover:text-emerald-400"
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => addToCart(item)}
                                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center border border-primary/15 active:scale-95 transition-all text-sm font-black"
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Order Placement Call-to-action */}
                        {patronCart.length > 0 && (
                          <button 
                            onClick={() => {
                              setPatronStep(3);
                              triggerAppToast("Mock order processed safely! Loading cryptographic offline QR receipt.", "success");
                            }}
                            className="w-full h-11 bg-primary text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                          >
                            <span>Launch Order (${patronTotal})</span>
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* STEP 3: PERSISTENT CRYPTO RECEIPT */}
                    {patronStep === 3 && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-200 text-center">
                        <div className="space-y-2">
                          <CheckCircle2 size={36} className="mx-auto text-primary animate-bounce" />
                          <span className="bg-primary/15 text-primary px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full">
                            TRANSACTION AUTHORIZED
                          </span>
                          <h5 className="font-black uppercase tracking-tight text-xs text-white">Receipt #[WYT-73922]</h5>
                        </div>

                        {/* Interactive secure barcode card with local receipt information */}
                        <div className="bg-neutral-900/80 border border-white/5 rounded-3xl p-4 space-y-4">
                          <div className="space-y-1.5 border-b border-white/5 pb-3">
                            {patronCart.map((c, i) => (
                              <div key={i} className="flex justify-between items-center text-[10px] uppercase font-mono">
                                <span className="text-zinc-400 font-bold">{c.item.name} x{c.quantity}</span>
                                <span className="text-white font-black">${c.item.price * c.quantity}</span>
                              </div>
                            ))}
                          </div>

                          {/* Dummy Barcode element using clean visual grid */}
                          <div className="bg-white p-3.5 rounded-2xl space-y-2">
                            <div className="space-y-0.5 flex flex-col items-center">
                              {/* Simulate custom high fidelity barcode bars */}
                              <div className="w-full h-10 flex gap-[2px]">
                                {[
                                  2, 4, 1, 3, 1, 2, 4, 2, 1, 3, 2, 2, 4, 1, 1, 2, 3, 1, 2, 4, 1, 2, 4, 1, 3, 1, 2, 4, 2, 1, 3, 2, 2, 4, 1, 1, 2, 3, 1, 2, 4
                                ].map((barw, idx) => (
                                  <div 
                                    key={idx} 
                                    className="h-full bg-black flex-1"
                                    style={{ opacity: barw % 2 === 0 ? 1 : 0.05 }}
                                  />
                                ))}
                              </div>
                              <span className="text-[8px] font-black font-mono text-black uppercase tracking-normal mt-1">
                                *W-CAP.SESSION.73922.KEY*
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[8px] uppercase font-bold text-zinc-500 font-mono tracking-widest">
                            <span>Status</span>
                            <span className="text-emerald-400">POS MATCHED SYNCED</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-zinc-500 font-medium leading-relaxed max-w-[260px] mx-auto">
                          Show this cryptographic ticket directly at the bar. The service staff will scan it instantly from their tablet counter terminal—no physical paper tickets, completely offline safe.
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Smartphone Lower Pill Navigation Accent */}
                  <div className="p-4 bg-neutral-950 flex justify-center border-t border-white/5 z-20">
                    <div className="w-24 h-1 bg-neutral-700 rounded-full" />
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. VENUE MANAGER HIGH VELOCITY AUDIT TOUR */}
        {selectedPath === 'manager' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* OperatorProgress Roadmap Banner */}
            <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-black">
                  {managerStep}
                </span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 font-mono">OPERATOR PROGRESS INDEX</p>
                  <p className="text-xs font-black uppercase tracking-tight">
                    {managerStep === 1 && "Create Custom Event Configuration (Zero-Form Automation)"}
                    {managerStep === 2 && "Staff Enrollment & Multi-Bar Stock Adjustments"}
                    {managerStep === 3 && "Deploy Live Analytics Dashboard & Value Score"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {managerStep > 1 && (
                  <button 
                    onClick={() => setManagerStep(p => p - 1)}
                    className="px-3.5 h-9 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all text-white"
                  >
                    Back
                  </button>
                )}
                {managerStep < 3 ? (
                  <button 
                    onClick={() => setManagerStep(p => p + 1)}
                    className="px-4 h-9 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all"
                  >
                    Next Step
                  </button>
                ) : (
                  <button 
                    onClick={resetTour}
                    className="px-4 h-9 bg-emerald-500 text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all"
                  >
                    Finish Tour
                  </button>
                )}
              </div>
            </div>

            {/* Main Interactive Stage for Manager */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Panel: Instructional Microcopy Matrix & Context Value Highlights */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-neutral-900/40 border border-white/5 p-6 rounded-3xl space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full">
                    <Activity size={10} /> VALUE HYPOTHESIS REALIZED
                  </span>

                  {managerStep === 1 && (
                    <div className="space-y-3">
                      <h4 className="font-black text-sm uppercase tracking-tight text-white leading-tight">Zero-Config event setup</h4>
                      <p className="text-zinc-450 text-xs font-medium leading-relaxed">
                        Traditional booking operators spend days typing menus and syncing tickets. Under Wayta, the manager inputs only the Event + Venue identifiers. 
                      </p>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl font-mono text-[9px] text-emerald-300">
                        <span className="font-black uppercase">💡 THE MAGIC WORK</span>
                        <p className="text-zinc-450 select-none">We automatically generate customized menus matching the vibe, realistic multi-tier capacities, and localized stock lists mapped immediately.</p>
                      </div>
                    </div>
                  )}

                  {managerStep === 2 && (
                    <div className="space-y-3">
                      <h4 className="font-black text-sm uppercase tracking-tight text-white leading-tight">Dual-Bar stock balancing</h4>
                      <p className="text-zinc-450 text-xs font-medium leading-relaxed">
                        Ensure zero dryouts. Shifting drinks between VIP bars and main terraces is fully streamlined. Adjust stocks below on the simulator, and observe how staff terminals update in real-time under-second!
                      </p>
                      <p className="text-zinc-500 text-[10px] leading-relaxed">
                        To add mixologists, tap "Approve Credentials" to demonstrate our instant onboarding flow with absolutely zero classroom layout workshops.
                      </p>
                    </div>
                  )}

                  {managerStep === 3 && (
                    <div className="space-y-3">
                      <h4 className="font-black text-sm uppercase tracking-tight text-white leading-tight">Instant Live Cashflow realization</h4>
                      <p className="text-zinc-450 text-xs font-medium leading-relaxed">
                        Unlike traditional offline terminal systems which lock deposits for 3-5 days, Wayta matches API triggers directly to existing POS networks. You observe visual real-time cashflow trends instantly checkable inside your panel.
                      </p>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl font-mono text-[9px] text-emerald-400">
                        <span>💰 ZERO HARDWARE COSTS</span>
                        <p className="text-zinc-450">We run on standard patron mobile viewports & pre-existing tablet configurations. Absolutely zero initial layout risk for venues.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Terminal Stats panel */}
                <div className="bg-neutral-900 border border-white/5 p-4.5 rounded-2xl space-y-3">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest pl-1 font-mono">POS MIRROR ACTIVE FEED</span>
                  <div className="space-y-2 text-[10px] uppercase font-mono">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Venue</span>
                      <span className="text-white font-black">{managerVenueName || 'Clara Lounge'}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Mapped Event</span>
                      <span className="text-white font-black">{managerEventName || 'Amapiano Friday'}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>POS API Integration</span>
                      <span className="text-emerald-400">SYNCHRONIZED DEPLOYED</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: The Interactive Sandbox Workspace Content */}
              <div className="lg:col-span-8">
                <div className="bg-neutral-900 border border-white/10 rounded-[2rem] p-6 lg:p-8 space-y-6">
                  
                  {/* STEP 1: EVENT CREATE PANEL */}
                  {managerStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md tracking-wider font-mono">STAGE A: ZERO CONFIG GENERATION</span>
                        <h4 className="text-lg font-black uppercase tracking-tight text-white font-display">Fast launch setup</h4>
                        <p className="text-zinc-400 text-xs font-medium leading-relaxed">
                          Enter your real nightclub / lounge details. Our system-level mapping engine will automatically populate mock lists corresponding to your specific atmosphere metrics.
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block font-mono">Event Name Identifier</label>
                          <input 
                            type="text" 
                            value={managerEventName}
                            onChange={(e) => setManagerEventName(e.target.value)}
                            className="bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white uppercase font-black w-full focus:outline-none focus:border-primary"
                            placeholder="Amapiano Friday nights"
                            id="tour-event-name"
                          />
                          <p className="text-[8px] text-zinc-500 font-bold">Example: Rooftop Rave, Bass Underground</p>
                        </div>

                        <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block font-mono">Venue Arena Identifier</label>
                          <input 
                            type="text" 
                            value={managerVenueName}
                            onChange={(e) => setManagerVenueName(e.target.value)}
                            className="bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white uppercase font-black w-full focus:outline-none focus:border-primary"
                            placeholder="Pharaoh Landmark Lounge"
                            id="tour-venue-name"
                          />
                          <p className="text-[8px] text-zinc-500 font-bold">Example: Clara Tavern, Horizon Rooftop</p>
                        </div>
                      </div>

                      {/* Dynamic Generated Previews */}
                      <div className="bg-black/40 p-4 border border-white/5 rounded-2xl space-y-4">
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest font-mono">🛠️ AUTO-GENERATED PORTAL PREVIEW</p>
                        <div className="grid md:grid-cols-3 gap-3 text-[10px] font-mono uppercase">
                          <div className="bg-neutral-900/80 border border-white/5 p-3 rounded-xl">
                            <span className="text-[8px] text-zinc-500 font-bold block">Talon Capacity tiers</span>
                            <span className="text-white font-bold block mt-1">3 Mapped Categories</span>
                            <span className="text-zinc-400 font-bold block">{tickets[0]?.name || 'Early Entry'} etc</span>
                          </div>
                          <div className="bg-neutral-900/80 border border-white/5 p-3 rounded-xl">
                            <span className="text-[8px] text-zinc-500 font-bold block">POS Mirrored inventory</span>
                            <span className="text-white font-bold block mt-1">{venueItems.length} Signature Drinks</span>
                            <span className="text-zinc-400 font-bold block">Mapped at POS API speed</span>
                          </div>
                          <div className="bg-neutral-900/80 border border-white/5 p-3 rounded-xl">
                            <span className="text-[8px] text-zinc-500 font-bold block">Active Roster size</span>
                            <span className="text-white font-bold block mt-1">3 Active Mixologists</span>
                            <span className="text-zinc-400 font-bold block">Instant POS enrollment</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setManagerStep(2);
                          triggerAppToast("Mock configuration generated successfully. Enter inventory adjustment stage.", "success");
                        }}
                        className="h-12 bg-primary text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all active:scale-[0.98] w-full flex items-center justify-center gap-2 hover:bg-emerald-400"
                      >
                        <span>Confirm and Configure Inventory Operations</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* STEP 2: INTERACTIVE STAFF & STEWARDSHIP */}
                  {managerStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md tracking-wider font-mono">STAGE B: MULTI-BAR INVENTORY & STAFF ONBOARDING</span>
                        <h4 className="text-lg font-black uppercase tracking-tight text-white font-display">Interactive venue dispatch</h4>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        
                        {/* Interactive Stock Balances */}
                        <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-2xl">
                          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest font-mono">⚡ LIVE BAR STOCK TRANSFERS</p>
                          <div className="space-y-3">
                            {locations.map((loc, idx) => (
                              <div key={idx} className="bg-neutral-900 border border-white/5 p-3 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[150px]">{loc.name}</span>
                                  <span className="font-mono text-[10px] font-black text-emerald-400">{loc.activeStock} items active</span>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => adjustStock(idx, -50)}
                                    className="flex-1 py-1.5 bg-neutral-950 hover:bg-neutral-800 rounded-lg text-[9px] font-black border border-white/5 uppercase font-mono tracking-widest text-red-400"
                                  >
                                    -50 Shipped
                                  </button>
                                  <button 
                                    onClick={() => adjustStock(idx, 50)}
                                    className="flex-1 py-1.5 bg-neutral-950 hover:bg-neutral-800 rounded-lg text-[9px] font-black border border-white/5 uppercase font-mono tracking-widest text-emerald-400"
                                  >
                                    +50 Restock
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Staff Onboarding roster */}
                        <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-2xl">
                          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest font-mono">💖 INSTANT STAFF ENROLLMENTS</p>
                          <div className="space-y-3">
                            {staffList.map((st, idx) => (
                              <div key={idx} className="bg-neutral-900 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-white uppercase tracking-tight leading-tight">{st.name}</p>
                                  <p className="text-[8px] font-bold text-zinc-500 uppercase font-mono tracking-wider">{st.role}</p>
                                </div>

                                {st.status === 'ACTIVE' ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded">
                                    AUTHORIZED
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => authorizeStaff(idx)}
                                    className="bg-emerald-500 text-black hover:bg-emerald-400 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded transition-all active:scale-95"
                                  >
                                    Verify Pass
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      <button 
                        onClick={() => {
                          setManagerStep(3);
                          triggerAppToast("Operational staff sync verified. Loading live analytics data visualization.", "success");
                        }}
                        className="h-12 bg-primary text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all active:scale-[0.98] w-full flex items-center justify-center gap-2 hover:bg-emerald-400"
                      >
                        <span>Confirm and Realize Live Value Dashboard</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* STEP 3: ANALYTICS VALUE REFLECTIONS */}
                  {managerStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
                      
                      {/* Metric summary numbers cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                          <span className="text-[9px] font-black text-zinc-500 block uppercase font-mono tracking-wider">TOTAL MOCK NET TURNOVER</span>
                          <span className="text-2xl font-black font-mono text-primary mt-1 block">$31,200</span>
                          <span className="text-[8px] font-bold text-emerald-400 uppercase mt-1 block">100% POS Verified</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                          <span className="text-[9px] font-black text-zinc-500 block uppercase font-mono tracking-wider">COMMITTED BOTTLE ORDERS</span>
                          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">1,120</span>
                          <span className="text-[8px] font-bold text-emerald-400 uppercase mt-1 block">Zero Cash handling overhead</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                          <span className="text-[9px] font-black text-zinc-500 block uppercase font-mono tracking-wider">MEAN DISPATCH SPEED</span>
                          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">1.5 Min</span>
                          <span className="text-[8px] font-bold text-emerald-400 uppercase mt-1 block">-3x Speed improvements</span>
                        </div>
                      </div>

                      {/* Recharts Area analytics chart */}
                      <div className="bg-black/40 border border-white/5 p-5 rounded-3xl space-y-3">
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest font-mono">📊 Live Night Transaction Sales Wave</p>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData}>
                              <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                              <XAxis dataKey="time" stroke="#666" fontSize={10} />
                              <YAxis stroke="#666" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} />
                              <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" name="Realized Returns ($)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-3xl space-y-3">
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[8px] font-black font-mono px-2 py-0.5 rounded uppercase">SYSTEM COMPARATIVE CONCLUSION</span>
                        <h5 className="font-extrabold text-sm uppercase text-white leading-tight">Zero Hardware, Zero Wait, Maximum Engagement</h5>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                          Traditional hardware POS consoles take days of deployment and cost thousands. Wayta utilizes standard mobile viewports and links directly to pre-existing POS infrastructure via APIs. Realize double drink speeds and absolute operational transparency.
                        </p>
                      </div>

                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
