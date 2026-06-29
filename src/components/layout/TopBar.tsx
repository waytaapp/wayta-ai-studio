import { type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useViewport } from '../../hooks/useViewport';

export interface TopBarProps {
  venueName?: string;
  rightContent?: ReactNode;
  onMenuClick?: () => void;
  isOffline?: boolean;
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: 'var(--r-md)',
  border: 'none',
  background: 'transparent',
  color: 'var(--fg-2)',
  cursor: 'pointer',
  transition: 'all var(--dur-base) var(--ease-out)',
};

export const TopBar: React.FC<TopBarProps> = ({ venueName, rightContent, onMenuClick, isOffline }) => {
  const { isDesktop } = useViewport();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!isDesktop && (
          <button type="button" onClick={onMenuClick} style={btnStyle}>
            <Icon name="menu" size={20} />
          </button>
        )}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--fg)' }}>
          Wayta
        </div>
        {venueName && (
          <>
            <span style={{ color: 'var(--fg-3)', fontSize: '18px' }}>/</span>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--fg-2)' }}>
              {venueName}
            </span>
          </>
        )}
        {isOffline && (
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.5)',
          }} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {rightContent}
        <ThemeToggle />
        <button type="button" style={btnStyle} aria-label="Notifications">
          <Icon name="bell" size={20} />
        </button>
        <Avatar name="User" size="sm" />
      </div>
    </header>
  );
};
