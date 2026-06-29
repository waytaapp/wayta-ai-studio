import { type HTMLAttributes, forwardRef } from 'react';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 0 | 1 | 2 | 3;
  padded?: boolean;
  hover?: boolean;
  glass?: boolean;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ elevation = 1, padded = true, hover = false, glass = false, className = '', style = {}, children, ...props }, ref) => {
    const bg = glass 
      ? 'color-mix(in oklab, var(--bg) 80%, transparent)'
      : elevation === 0 
        ? 'transparent' 
        : `var(--bg-elev-${elevation})`;

    const backdrop = glass ? 'blur(12px)' : 'none';
    const border = glass || elevation > 0 ? '1px solid var(--border)' : 'none';

    return (
      <div
        ref={ref}
        className={className}
        style={{
          background: bg,
          backdropFilter: backdrop,
          WebkitBackdropFilter: backdrop,
          border,
          borderRadius: 'var(--r-lg)',
          padding: padded ? 'var(--s-6)' : 0,
          transition: hover ? 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)' : 'none',
          ...style,
        }}
        onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } : undefined}
        onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; } : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Surface.displayName = 'Surface';