import { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ active = false, icon, className = '', style = {}, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: active ? 'var(--accent)' : 'var(--bg-elev-2)',
          color: active ? 'var(--fg-on-emerald)' : 'var(--fg-1)',
          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--r-pill)',
          padding: '6px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          ...style,
        }}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);

Chip.displayName = 'Chip';
