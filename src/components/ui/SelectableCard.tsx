import { type HTMLAttributes, forwardRef } from 'react';
import { Icon } from './Icon';

export interface SelectableCardProps extends HTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: string;
  iconBg?: string;
  badge?: string;
  title: string;
  subtitle?: string;
  onSelect?: () => void;
}

export const SelectableCard = forwardRef<HTMLButtonElement, SelectableCardProps>(
  ({ selected = false, icon, iconBg, badge, title, subtitle, onSelect, className = '', style = {}, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        className={className}
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '14px 16px',
          borderRadius: 'var(--r-lg)',
          background: selected ? 'var(--accent-soft)' : 'var(--surface)',
          border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
          cursor: 'pointer',
          boxSizing: 'border-box',
          width: '100%',
          textAlign: 'left',
          transition: 'all var(--dur-base) var(--ease-out)',
          ...style,
        }}
        {...props}
      >
        {icon && (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: selected ? 'var(--accent)' : (iconBg || 'var(--surface2)'),
            color: selected ? 'var(--fg-on-emerald)' : 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name={icon as any} size={18} stroke={1.8} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {title}
            {badge && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--fg-emerald)',
                padding: '3px 7px',
                borderRadius: '999px',
                background: 'var(--accent-soft)',
                border: '1px solid var(--border-emerald)',
              }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12.5px', color: 'var(--fg-2)', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '999px',
          border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {selected && <div style={{ width: 9, height: 9, borderRadius: '999px', background: 'var(--accent)' }} />}
        </div>
      </button>
    );
  }
);

SelectableCard.displayName = 'SelectableCard';