import { type HTMLAttributes, forwardRef } from 'react';

export interface LeadProps extends HTMLAttributes<HTMLParagraphElement> {}

export const Lead = forwardRef<HTMLParagraphElement, LeadProps>(
  ({ children, className = '', style = {}, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={className}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '15.5px',
          lineHeight: '1.5',
          color: 'var(--fg-2)',
          margin: '12px 0 0',
          textWrap: 'pretty',
          maxWidth: '460px',
          ...style,
        }}
        {...props}
      >
        {children}
      </p>
    );
  }
);

Lead.displayName = 'Lead';