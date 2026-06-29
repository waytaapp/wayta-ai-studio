import { type HTMLAttributes, forwardRef } from 'react';

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  accent?: boolean;
}

export const Eyebrow = forwardRef<HTMLSpanElement, EyebrowProps>(
  ({ accent = false, className = '', style = {}, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={className}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--t-overline)',
          letterSpacing: 'var(--tracking-overline)',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: accent ? 'var(--fg-emerald)' : 'var(--fg-3)',
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Eyebrow.displayName = 'Eyebrow';