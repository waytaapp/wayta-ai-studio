import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';

export interface AINudgeProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  onDismiss?: () => void;
  title: string;
  description: string;
  acceptLabel?: string;
  dismissLabel?: string;
  confidence?: number;
}

export const AINudge: React.FC<AINudgeProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDismiss,
  title,
  description,
  acceptLabel = 'Apply',
  dismissLabel = 'Dismiss',
  confidence,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          bottom: 'var(--s-6)',
          right: 'var(--s-6)',
          zIndex: 998,
          maxWidth: 380,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid #8b5cf6',
            borderRadius: 'var(--r-lg)',
            padding: '16px 18px',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(139,92,246,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="sparkle" size={18} stroke={2} color="#a855f7" />
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <h4 style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--fg)',
                margin: 0,
              }}>{title}</h4>
              {confidence !== undefined && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: '#a855f7',
                  background: 'rgba(139,92,246,0.12)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}>
                  {Math.round(confidence * 100)}% confident
                </span>
              )}
            </div>
            <p style={{
              fontSize: '12.5px',
              lineHeight: '1.5',
              color: 'var(--fg-2)',
              margin: '6px 0 0',
            }}>{description}</p>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
            }}>
              {onAccept && (
                <button
                  onClick={() => { onAccept(); onClose(); }}
                  style={{
                    padding: '8px 14px',
                    background: '#8b5cf6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--r-md)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background var(--dur-base) var(--ease-out)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#7c3aed'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#8b5cf6'; }}
                >
                  {acceptLabel}
                </button>
              )}
              <button
                onClick={() => { onDismiss?.(); onClose(); }}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  color: 'var(--fg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--dur-base) var(--ease-out)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--fg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-2)'; }}
              >
                {dismissLabel}
              </button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: 'var(--fg-3)',
              padding: 4,
              display: 'flex',
              flexShrink: 0,
            }}
          >
            <Icon name="x" size={16} stroke={2} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AINudge;