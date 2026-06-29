import { type HTMLAttributes, forwardRef } from 'react';
import { Icon } from './Icon';

export interface InfoCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: string;
  title?: string;
}

export const InfoCard = forwardRef<HTMLDivElement, InfoCardProps>(
  ({ icon = 'info', title, className = '', style = {}, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '14px 16px',
          background: 'var(--accent-soft)',
          border: '1px solid var(--border-emerald)',
          borderRadius: 'var(--r-md)',
          color: 'var(--fg-1)',
          fontSize: '13px',
          lineHeight: '1.45',
          ...style,
        }}
        {...props}
      >
        <div style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }}>
          <Icon name={icon as any} size={16} stroke={2.2} />
        </div>
        {title && (
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{title}</div>
        )}
        <div>{children}</div>
      </div>
    );
  }
);

InfoCard.displayName = 'InfoCard';