import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...t, id };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const typeStyles = {
    success: { icon: 'check-circle', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)' },
    error: { icon: 'x-circle', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)' },
    warning: { icon: 'alert-triangle', color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.4)' },
    info: { icon: 'info', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
  };

  const s = typeStyles[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        position: 'fixed',
        bottom: 'var(--s-6)',
        right: 'var(--s-6)',
        zIndex: 997,
        minWidth: 300,
        maxWidth: 420,
        background: 'var(--bg-elev-2)',
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.color}`,
        borderRadius: 'var(--r-lg)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: s.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={s.icon as any} size={18} stroke={2} color={s.color} />
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--fg)',
          margin: 0,
        }}>{toast.title}</h4>
        {toast.description && (
          <p style={{
            fontSize: '12.5px',
            lineHeight: '1.5',
            color: 'var(--fg-2)',
            margin: '4px 0 0',
          }}>{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: 'transparent',
              color: s.color,
              border: `1px solid ${s.color}`,
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--dur-base) var(--ease-out)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = s.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          color: 'var(--fg-3)',
          padding: 4,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <Icon name="x" size={14} stroke={2} />
      </button>
    </motion.div>
  );
};