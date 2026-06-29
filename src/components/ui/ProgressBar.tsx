import React from 'react';
import { motion } from 'motion/react';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'circular';
  className?: string;
  style?: React.CSSProperties;
}

const sizeStyles = {
  sm: { height: 4, borderRadius: '999px' },
  md: { height: 6, borderRadius: '999px' },
  lg: { height: 8, borderRadius: '999px' },
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = false,
  label,
  size = 'md',
  variant = 'default',
  className = '',
  style = {},
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const s = sizeStyles[size];

  if (variant === 'circular') {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className={className} style={{ ...style, width: 48, height: 48 }}>
        <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="4"
          />
          <motion.circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 360ms cubic-bezier(0.5, 1.5, 0.5, 1)',
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...style, width: '100%' }}>
      {(showLabel || label) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          {label && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{label}</span>}
          {showLabel && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div style={{
        width: '100%',
        height: s.height,
        background: 'var(--surface2)',
        borderRadius: s.borderRadius,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <motion.div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'var(--accent)',
            borderRadius: s.borderRadius,
            transition: 'width 360ms cubic-bezier(0.5, 1.5, 0.5, 1)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;