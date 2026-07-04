import React, { type SelectHTMLAttributes, forwardRef, type CSSProperties } from 'react';
import { Icon } from './Icon';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  style?: CSSProperties;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, className = '', style = {}, id, children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const [focused, setFocused] = React.useState(false);
    const hasError = Boolean(error);

    return (
      <div className={className} style={style}>
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--fg-3)',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          <select
            ref={ref}
            id={selectId}
            {...props}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            style={{
              appearance: 'none',
              width: '100%',
              background: 'var(--surface)',
              border: `1.5px solid ${focused || hasError ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              padding: '0 36px 0 16px',
              height: '48px',
              color: 'var(--fg)',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              fontWeight: 500,
              boxShadow: focused ? '0 0 0 4px var(--accent-soft)' : 'none',
              transition: 'all 150ms ease',
              cursor: 'pointer',
            }}
          >
            {children}
          </select>
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="chevron-down" size={16} color="var(--fg-3)" />
          </div>
        </div>
        {error && <p style={{ fontSize: '12px', color: 'var(--wayta-stop)', marginTop: '6px' }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: '12px', color: 'var(--fg-3)', marginTop: '6px' }}>{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
