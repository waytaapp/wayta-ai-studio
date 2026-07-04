import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'ghost' | 'text' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  block?: boolean;
  loading?: boolean;
}

const sizeStyles: Record<ButtonSize, { height: string; paddingX: string; fontSize: string; iconSize: number }> = {
  sm: { height: '32px', paddingX: '12px', fontSize: '13px', iconSize: 14 },
  md: { height: '40px', paddingX: '16px', fontSize: '14px', iconSize: 16 },
  lg: { height: '48px', paddingX: '22px', fontSize: '15px', iconSize: 18 },
};

const variantStyles: Record<ButtonVariant, { 
  bg: string; color: string; border: string; boxShadow: string; 
  hoverBg: string; activeBg: string; disabledBg: string; disabledColor: string;
}> = {
  primary: {
    bg: 'var(--accent)',
    color: 'var(--fg-on-emerald)',
    border: 'none',
    boxShadow: 'var(--glow-emerald)',
    hoverBg: 'var(--accent-hover)',
    activeBg: 'var(--accent-press)',
    disabledBg: 'var(--surface2)',
    disabledColor: 'var(--fg-3)',
  },
  ghost: {
    bg: 'transparent',
    color: 'var(--fg)',
    border: '1px solid var(--border-strong)',
    boxShadow: 'none',
    hoverBg: 'var(--surface)',
    activeBg: 'var(--surface2)',
    disabledBg: 'transparent',
    disabledColor: 'var(--fg-3)',
  },
  text: {
    bg: 'transparent',
    color: 'var(--fg-2)',
    border: 'none',
    boxShadow: 'none',
    hoverBg: 'transparent',
    activeBg: 'transparent',
    disabledBg: 'transparent',
    disabledColor: 'var(--fg-3)',
  },
  danger: {
    bg: 'var(--wayta-stop)',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
    hoverBg: '#dc2626',
    activeBg: '#b91c1c',
    disabledBg: 'var(--surface2)',
    disabledColor: 'var(--fg-3)',
  },
  outline: {
    bg: 'transparent',
    color: 'var(--fg-emerald)',
    border: '1px solid var(--border-emerald)',
    boxShadow: 'none',
    hoverBg: 'var(--accent-soft)',
    activeBg: 'var(--accent)',
    disabledBg: 'transparent',
    disabledColor: 'var(--fg-3)',
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    icon, 
    iconRight, 
    block = false, 
    loading = false,
    disabled,
    children,
    className = '',
    style = {},
    ...props 
  }, ref) => {
    const s = sizeStyles[size];
    const v = variantStyles[variant];
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={className}
        style={{
          display: block ? 'flex' : 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: block ? '100%' : 'auto',
          height: s.height,
          padding: `0 ${s.paddingX}`,
          background: isDisabled ? v.disabledBg : v.bg,
          color: isDisabled ? v.disabledColor : v.color,
          border: v.border,
          borderRadius: variant === 'primary' || variant === 'outline' || variant === 'danger' ? 'var(--r-pill)' : 'var(--r-md)',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: s.fontSize,
          letterSpacing: '-0.005em',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          boxShadow: isDisabled ? 'none' : v.boxShadow,
          transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
          ...style,
        }}
        onMouseDown={(e) => !isDisabled && (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => !isDisabled && (e.currentTarget.style.transform = '')}
        onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.transform = '')}
        onMouseOver={(e) => !isDisabled && (e.currentTarget.style.background = v.hoverBg)}
        onMouseOut={(e) => !isDisabled && (e.currentTarget.style.background = v.bg)}
        {...props}
      >
        {loading ? (
          <svg width={s.iconSize} height={s.iconSize} viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeDashoffset="31.4" strokeLinecap="round" style={{ animation: 'dash 1.5s ease-in-out infinite' }} />
          </svg>
        ) : icon && <Icon name={icon as any} size={s.iconSize} stroke={2.4} />}
        <span>{children}</span>
        {!loading && iconRight && <Icon name={iconRight as any} size={s.iconSize} stroke={2.4} />}
      </button>
    );
  }
);

Button.displayName = 'Button';