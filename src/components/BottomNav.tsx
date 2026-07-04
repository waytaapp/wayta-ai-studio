import React from 'react';
import { Home, Compass, ShoppingBag, ShieldAlert, LayoutDashboard, User, Wallet, Users, BarChart3, UtensilsCrossed, Settings, Ticket, LogIn, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import { useViewport } from '../hooks/useViewport';

interface BottomNavProps {
  currentView: string;
  onViewChange: (view: any) => void;
  userRole?: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, userRole }) => {
  const { isMobile, isLandscape } = useViewport();
  const [offlineOrdersCount, setOfflineOrdersCount] = React.useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const cached = localStorage.getItem('wayta_offline_orders');
      if (!cached) return 0;
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const cached = localStorage.getItem('wayta_offline_orders');
        if (!cached) {
          setOfflineOrdersCount(0);
          return;
        }
        const parsed = JSON.parse(cached);
        setOfflineOrdersCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        setOfflineOrdersCount(0);
      }
    };

    window.addEventListener('wayta_offline_orders_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    
    return () => {
      window.removeEventListener('wayta_offline_orders_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getTabs = () => {
    if (!userRole) {
      // Guest Role
      return [
        { id: 'public-events', label: 'Explore', icon: Compass },
        { id: 'auth', label: 'Sign In', icon: LogIn },
      ];
    }

    switch (userRole) {
      case 'MANAGER':
        return [
          { id: 'manager', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'staff-management', label: 'Staff', icon: Users },
          { id: 'safety', label: 'SOS', icon: ShieldAlert },
          { id: 'profile', label: 'Profile', icon: User },
        ];
      case 'STAFF':
      case 'BARTENDER':
        return [
          { id: 'staff-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'safety', label: 'SOS', icon: ShieldAlert },
          { id: 'profile', label: 'Profile', icon: User },
        ];
      case 'VENDOR':
        return [
          { id: 'vendor-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'wayta-menu', label: 'Menu', icon: UtensilsCrossed },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'profile', label: 'Profile', icon: User },
        ];
      case 'EVENT_MANAGER':
        return [
          { id: 'event-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'events', label: 'Registry', icon: Calendar },
          { id: 'venues', label: 'Venues', icon: UtensilsCrossed }, 
          { id: 'tickets', label: 'Tickets', icon: Ticket },
          { id: 'profile', label: 'Profile', icon: User },
        ];
      case 'ADMIN':
        return [
          { id: 'admin', label: 'System', icon: Settings },
          { id: 'explore', label: 'Explore', icon: Compass },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'safety', label: 'SOS', icon: ShieldAlert },
          { id: 'profile', label: 'Profile', icon: User },
        ];
      default: // PATRON
        return [
          { id: 'explore', label: 'Home', icon: Home },
          { id: 'tickets', label: 'Tickets', icon: Ticket },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'profile', label: 'Profile', icon: User },
        ];
    }
  };

  const tabs = getTabs();

  // Show BottomNav for a wide range of views
  const visibleViews = [
    'explore', 'orders', 'budget', 'safety', 'profile', 'tracking', 
    'wayta-menu', 'wayta-checkout', 'manager', 'vendor-dashboard',
    'event-dashboard', 'waiter-dashboard', 'staff-dashboard', 'admin',
    'public-events', 'public-event-detail', 'patron-event', 'tickets'
  ];

  if (!visibleViews.includes(currentView as any)) {
    return null;
  }

  return (
    <nav className={cn(
      "fixed bottom-0 w-full bg-background/90 backdrop-blur-xl border-t border-outline-variant flex justify-around items-center px-2 pb-safe z-50 transition-all duration-200",
      (isMobile && isLandscape) ? "h-14" : "h-20"
    )}>
      {offlineOrdersCount > 0 && (
        <div className="absolute top-0 left-0 right-0 -translate-y-full bg-[#1c1c1e]/95 border-b border-amber-500/30 flex items-center justify-between px-6 py-2.5 select-none backdrop-blur-md shadow-lg shadow-amber-500/5 transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wide text-amber-500 uppercase">
              Offline Sync Status: <span className="text-white font-extrabold">{offlineOrdersCount}</span> {offlineOrdersCount === 1 ? 'order' : 'orders'} waiting to sync
            </span>
          </div>
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93] font-mono">
            Grid Queue Engaged
          </span>
        </div>
      )}
      <div className="w-full max-w-7xl mx-auto flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id || (tab.id === 'orders' && currentView === 'tracking');
        const hideText = isMobile && isLandscape && tabs.length > 4;
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={() => onViewChange(tab.id as any)}
            className={cn(
              "flex items-center justify-center p-2 rounded-2xl transition-all active:scale-90",
              (isMobile && isLandscape && !hideText) ? "flex-row gap-1.5 px-3 py-1" : "flex-col",
              isActive 
                ? "bg-primary text-black px-4 sm:px-5 shadow-lg shadow-primary/20 scale-105" 
                : "text-primary/60 hover:text-primary"
            )}
          >
            <Icon size={18} className={cn("sm:w-5 sm:h-5 shrink-0", isActive ? "fill-black" : "")} />
            {!hideText && (
              <span className={cn(
                "text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] line-clamp-1",
                (isMobile && isLandscape) ? "mt-0" : "mt-1"
              )}>
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
      </div>
    </nav>
  );
};
