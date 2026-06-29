import React, { type InputHTMLAttributes, forwardRef, type CSSProperties } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'prefix'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  mono?: boolean;
  style?: CSSProperties;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, mono, className = '', style = {}, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const [focused, setFocused] = React.useState(false);
    const hasError = Boolean(error);

    return (
      <div className={className} style={style}>
        {label && (
          <label htmlFor={inputId} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
            display: 'block',
            marginBottom: '8px',
          }}>
            {label}
          </label>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--surface)',
          border: `1.5px solid ${focused || hasError ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)',
          padding: '0 16px',
          height: '48px',
          transition: 'all 150ms ease',
          boxShadow: focused ? '0 0 0 4px var(--accent-soft)' : 'none',
        }}>
          {prefix && <span style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 600 }}>{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            {...props}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--fg)',
              fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
              fontSize: '16px',
              fontWeight: 500,
              letterSpacing: mono ? '0.02em' : 'normal',
              minWidth: 0,
            }}
          />
          {suffix && <span style={{ color: 'var(--fg-2)' }}>{suffix}</span>}
        </div>
        {error && <p style={{ fontSize: '12px', color: 'var(--wayta-stop)', marginTop: '6px' }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: '12px', color: 'var(--fg-3)', marginTop: '6px' }}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;