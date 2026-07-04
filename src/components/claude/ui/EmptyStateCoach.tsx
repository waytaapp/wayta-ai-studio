import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';

export interface EmptyStateCoachProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  illustration?: React.ReactNode;
}

export const EmptyStateCoach: React.FC<EmptyStateCoachProps> = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: 'var(--s-12) var(--s-6)',
      color: 'var(--fg-2)',
    }}>
      {illustration ? (
        <div style={{ marginBottom: 'var(--s-6)' }}>{illustration}</div>
      ) : (
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          background: 'var(--accent-soft)',
          border: '1px solid var(--border-emerald)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--s-6)',
        }}>
          <Icon name={icon as any} size={36} stroke={1.5} color="var(--accent)" />
        </div>
      )}
      
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--fg)',
        margin: '0 0 8px',
      }}>{title}</h3>
      
      <p style={{
        fontSize: 15,
        lineHeight: 1.6,
        maxWidth: 360,
        margin: 0,
      }}>{description}</p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: 'var(--s-6)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="ghost" size="md" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button variant="primary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyStateCoach;