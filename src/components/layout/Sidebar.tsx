import { Icon, type IconName } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';

export interface SidebarItem {
  id: string;
  label: string;
  icon: IconName;
  badge?: number;
}

export interface SidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  userName?: string;
  userRole?: string;
  venueName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, activeItem, onItemClick, userName, userRole, venueName }) => (
  <aside style={{
    width: '240px', height: '100%', display: 'flex', flexDirection: 'column',
    borderRight: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
  }}>
    {venueName && (
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--fg)' }}>
          {venueName}
        </div>
        {userRole && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: '4px',
          }}>
            {userRole}
          </div>
        )}
      </div>
    )}

    <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {items.map((item) => {
        const active = activeItem === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: 'var(--r-md)', border: 'none',
              background: active ? 'var(--bg-emerald-soft)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--fg-2)',
              fontFamily: 'var(--font-body)', fontSize: '14px',
              fontWeight: active ? 600 : 500, cursor: 'pointer',
              transition: 'all var(--dur-base) var(--ease-out)',
              width: '100%', textAlign: 'left',
            }}
          >
            <Icon name={item.icon} size={18} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <div style={{
                background: 'var(--accent)', color: 'var(--fg-on-emerald)',
                fontSize: '11px', fontWeight: 700, minWidth: '20px', height: '20px',
                borderRadius: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '0 6px',
              }}>
                {item.badge > 99 ? '99+' : item.badge}
              </div>
            )}
          </button>
        );
      })}
    </nav>

    <div style={{
      padding: '16px 20px', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <Avatar name={userName || 'User'} size="sm" />
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
          {userName || 'User'}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--fg-3)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>
          {userRole || 'Patron'}
        </div>
      </div>
    </div>
  </aside>
);
