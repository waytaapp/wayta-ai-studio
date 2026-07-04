import { type HTMLAttributes, forwardRef } from 'react';

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const Title = forwardRef<HTMLHeadingElement, TitleProps>(
  ({ children, className = '', style = {}, ...props }, ref) => {
    return (
      <h1
        ref={ref}
        className={className}
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(28px, 3.2vw, 36px)',
          lineHeight: '1.05',
          letterSpacing: '-0.025em',
          margin: '12px 0 0',
          color: 'var(--fg)',
          textWrap: 'pretty',
          ...style,
        }}
        {...props}
      >
        {children}
      </h1>
    );
  }
);

Title.displayName = 'Title';