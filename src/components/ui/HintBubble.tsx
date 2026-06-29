import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { Button } from './Button';

export interface HintBubbleProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  targetRef: React.RefObject<HTMLElement>;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export const HintBubble: React.FC<HintBubbleProps> = ({
  isOpen,
  onClose,
  children,
  targetRef,
  position = 'top',
  offset = 10,
  actionLabel,
  onAction,
}) => {
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (!isOpen || !targetRef.current) return;

    const updatePosition = () => {
      const target = targetRef.current!.getBoundingClientRect();
      const bubbleWidth = 280;

      let top = 0, left = 0;

      switch (position) {
        case 'top':
          top = target.top - offset - 120;
          left = target.left + (target.width - bubbleWidth) / 2;
          break;
        case 'bottom':
          top = target.bottom + offset;
          left = target.left + (target.width - bubbleWidth) / 2;
          break;
        case 'left':
          top = target.top + (target.height - 120) / 2;
          left = target.left - offset - bubbleWidth;
          break;
        case 'right':
          top = target.top + (target.height - 120) / 2;
          left = target.right + offset;
          break;
      }

      setStyle({ top: `${top}px`, left: `${left}px`, width: bubbleWidth });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, targetRef, position, offset]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : -10 }}
        style={{
          position: 'fixed',
          zIndex: 999,
          pointerEvents: 'auto',
          ...style,
        }}
      >
        <div style={{
          background: 'var(--bg-elev-3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '12px 14px',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--fg)',
          fontSize: '13.5px',
          lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>{children}</div>
            <button
              onClick={onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                color: 'var(--fg-3)',
                padding: 4,
                display: 'flex',
              }}
            >
              <Icon name="x" size={14} stroke={2} />
            </button>
          </div>
          {actionLabel && onAction && (
            <Button variant="outline" size="sm" onClick={onAction} style={{ marginTop: '12px', width: '100%' }}>
              {actionLabel}
            </Button>
          )}
        </div>
        <div style={{
          position: 'absolute',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          [position === 'top' ? 'bottom' : 'top']: '-8px',
          left: '50%',
          marginLeft: '-8px',
          borderTopColor: position === 'bottom' ? 'var(--border)' : 'transparent',
          borderBottomColor: position === 'top' ? 'var(--border)' : 'transparent',
        }} />
      </motion.div>
    </AnimatePresence>
  );
};

export default HintBubble;