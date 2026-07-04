import { type HTMLAttributes, forwardRef } from 'react';

export interface FieldLabelProps extends HTMLAttributes<HTMLLabelElement> {}

export const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className = '', style = {}, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={className}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: 'var(--fg-3)',
          display: 'block',
          marginBottom: 8,
          ...style,
        }}
        {...props}
      >
        {children}
      </label>
    );
  }
);

FieldLabel.displayName = 'FieldLabel';