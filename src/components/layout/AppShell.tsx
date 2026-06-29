import { useState, type ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomNav, type UserRole } from './BottomNav';
import { Sidebar, type SidebarItem } from './Sidebar';
import { useViewport } from '../../hooks/useViewport';

export interface AppShellProps {
  children: ReactNode;
  role?: UserRole;
  venueName?: string;
  sidebarItems?: SidebarItem[];
  onNavigate?: (view: string) => void;
  currentView?: string;
  isOffline?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children, role = 'patron', venueName, sidebarItems,
  onNavigate, currentView, isOffline,
}) => {
  const { isDesktop } = useViewport();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showSidebar = isDesktop && sidebarItems && sidebarItems.length > 0;

  const handleNav = (view: string) => {
    onNavigate?.(view);
    setSidebarOpen(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', color: 'var(--fg)',
    }}>
      <TopBar venueName={venueName} onMenuClick={() => setSidebarOpen(true)} isOffline={isOffline} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showSidebar && (
          <Sidebar
            items={sidebarItems!}
            activeItem={currentView || ''}
            onItemClick={handleNav}
            venueName={venueName}
            userRole={role}
          />
        )}

        {!isDesktop && sidebarOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />
            <div style={{
              width: '280px', background: 'var(--bg)', borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
            }}>
              <Sidebar
                items={sidebarItems || []}
                activeItem={currentView || ''}
                onItemClick={handleNav}
                venueName={venueName}
                userRole={role}
              />
            </div>
          </div>
        )}

        <main style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', paddingBottom: isDesktop ? '0' : '80px' }}>
          {children}
        </main>
      </div>

      {!isDesktop && (
        <BottomNav role={role} activeView={currentView || ''} onViewChange={(v) => onNavigate?.(v)} />
      )}
    </div>
  );
};
