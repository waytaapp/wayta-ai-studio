import { Icon, type IconName } from '../ui/Icon';
import { useViewport } from '../../hooks/useViewport';

export type UserRole = 'patron' | 'staff' | 'manager' | 'brand' | 'admin' | 'waiter' | 'vendor';

interface Tab { id: string; label: string; icon: IconName }

const tabs: Record<UserRole, Tab[]> = {
  patron: [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'tickets', label: 'Tickets', icon: 'card' },
    { id: 'orders', label: 'Orders', icon: 'receipt' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ],
  staff: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'orders', label: 'Orders', icon: 'receipt' },
    { id: 'menu', label: 'Menu', icon: 'coffee' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ],
  manager: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'operations', label: 'Ops', icon: 'layers' },
    { id: 'staff', label: 'Staff', icon: 'users' },
    { id: 'insights', label: 'Insights', icon: 'chart' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ],
  brand: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'events', label: 'Events', icon: 'sparkle' },
    { id: 'venues', label: 'Venues', icon: 'map-pin' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ],
  admin: [
    { id: 'system', label: 'System', icon: 'shield' },
    { id: 'explore', label: 'Explore', icon: 'search' },
    { id: 'orders', label: 'Orders', icon: 'receipt' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ],
  waiter: [
    { id: 'tables', label: 'Tables', icon: 'grid' },
    { id: 'orders', label: 'Orders', icon: 'receipt' },
    { id: 'menu', label: 'Menu', icon: 'coffee' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ],
  vendor: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'menu', label: 'Menu', icon: 'coffee' },
    { id: 'inventory', label: 'Stock', icon: 'box' },
    { id: 'orders', label: 'Orders', icon: 'receipt' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ],
};

export interface BottomNavProps {
  role: UserRole;
  activeView: string;
  onViewChange: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role, activeView, onViewChange }) => {
  const { isMobile } = useViewport();
  const navTabs = tabs[role] || tabs.patron;
  const showLabels = isMobile;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        width: '100%',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 12px',
        height: '72px',
        borderTop: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--bg) 90%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {navTabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onViewChange(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--fg-3)',
              cursor: 'pointer',
              transition: 'all var(--dur-base) var(--ease-out)',
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: isActive ? 600 : 500,
              borderRadius: 'var(--r-md)',
              position: 'relative',
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: '3px',
                  borderRadius: '0 0 4px 4px',
                  background: 'var(--accent)',
                }}
              />
            )}
            <Icon name={tab.icon} size={22} />
            {showLabels && <span>{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};
