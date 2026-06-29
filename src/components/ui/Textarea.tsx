import { forwardRef, useState, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = '', style = {}, id, ...props }, ref) => {
    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const [focused, setFocused] = useState(false);
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
        <textarea
          ref={ref}
          id={inputId}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: `1.5px solid ${focused || hasError ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)',
            padding: '14px 16px',
            color: 'var(--fg)',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            lineHeight: '1.5',
            resize: 'vertical',
            minHeight: '100px',
            outline: 'none',
            transition: 'all 150ms ease',
            boxShadow: focused ? '0 0 0 4px var(--accent-soft)' : 'none',
          }}
        />
        {error && <p style={{ fontSize: '12px', color: 'var(--wayta-stop)', marginTop: '6px' }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: '12px', color: 'var(--fg-3)', marginTop: '6px' }}>{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';