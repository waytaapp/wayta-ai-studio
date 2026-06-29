import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { type UserRole } from '../components/layout/BottomNav';
import { type SidebarItem } from '../components/layout/Sidebar';
import { Title } from '../components/ui/Title';
import { Lead } from '../components/ui/Lead';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';

const roleSidebar: Record<string, SidebarItem[]> = {
  patron: [],
  staff: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'orders', label: 'Orders', icon: 'receipt', badge: 12 },
    { id: 'menu', label: 'Menu', icon: 'coffee' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
  ],
  manager: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'operations', label: 'Operations', icon: 'layers' },
    { id: 'staff', label: 'Staff', icon: 'users' },
    { id: 'inventory', label: 'Inventory', icon: 'box' },
    { id: 'insights', label: 'Insights', icon: 'chart' },
  ],
  brand: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'events', label: 'Events', icon: 'sparkle' },
    { id: 'venues', label: 'Venues', icon: 'map-pin' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
  ],
  admin: [
    { id: 'telemetry', label: 'Telemetry', icon: 'chart' },
    { id: 'venues', label: 'Venues', icon: 'map-pin' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'kill-switches', label: 'Kill Switches', icon: 'shield' },
    { id: 'audit', label: 'Audit Trail', icon: 'list' },
  ],
};

interface DashboardViewProps {
  role: UserRole;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ role }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sidebarItems = roleSidebar[role] || [];

  return (
    <AppShell
      role={role}
      venueName="The Emerald Lounge"
      sidebarItems={sidebarItems}
      currentView={currentView}
      onNavigate={setCurrentView}
    >
      <div style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Title>{role.charAt(0).toUpperCase() + role.slice(1)} Dashboard</Title>
          <Badge variant="neutral">{now}</Badge>
        </div>
        <Lead>Role: <strong>{role}</strong> &middot; View: <strong>{currentView}</strong></Lead>
        <div style={{ height: 32 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <Surface elevation={1}>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>
                Active Orders
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>
                24
              </div>
            </div>
          </Surface>
          <Surface elevation={1}>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>
                Today's Revenue
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>
                $3,420
              </div>
            </div>
          </Surface>
          <Surface elevation={1}>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>
                Active Staff
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>
                8
              </div>
            </div>
          </Surface>
          <Surface elevation={1} glass>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>
                Wait Time
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>
                12m
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </AppShell>
  );
};
