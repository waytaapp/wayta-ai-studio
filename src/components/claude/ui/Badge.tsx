import { type HTMLAttributes, forwardRef } from 'react';
import { Icon } from './Icon';

export type BadgeVariant = 'neutral' | 'emerald' | 'emeraldSolid' | 'go' | 'warn' | 'stop' | 'live';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  neutral: { bg: 'var(--bg-elev-2)', color: 'var(--fg-1)', border: '1px solid var(--border)' },
  emerald: { bg: 'var(--accent-soft)', color: 'var(--fg-emerald)', border: '1px solid var(--border-emerald)' },
  emeraldSolid: { bg: 'var(--accent)', color: 'var(--fg-on-emerald)', border: 'none' },
  go: { bg: 'rgba(22,163,74,0.12)', color: '#4ade80', border: '1px solid rgba(22,163,74,0.4)' },
  warn: { bg: 'rgba(234,179,8,0.12)', color: '#facc15', border: '1px solid rgba(234,179,8,0.4)' },
  stop: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' },
  live: { bg: 'var(--wayta-go)', color: '#022c22', border: 'none' },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', icon, dot, children, className = '', style = {}, ...props }, ref) => {
    const small = size === 'sm';
    const v = variantStyles[variant];

    return (
      <span
        ref={ref}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: small ? '2px 8px' : '4px 10px',
          background: v.bg,
          color: v.color,
          border: v.border,
          borderRadius: 'var(--r-pill)',
          fontFamily: 'var(--font-mono)',
          fontSize: small ? '10px' : '11px',
          fontWeight: 600,
          letterSpacing: 'var(--tracking-overline)',
          textTransform: 'uppercase',
          ...style,
        }}
        {...props}
      >
        {dot && (
          <span
            style={{
              width: small ? '5px' : '6px',
              height: small ? '5px' : '6px',
              borderRadius: '50%',
              background: variant === 'live' ? '#ffffff' : 'currentColor',
              animation: variant === 'live' ? 'wayta-pulse 1.6s ease-out infinite' : 'none',
            }}
          />
        )}
        {icon && <Icon name={icon as any} size={small ? 10 : 11} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';