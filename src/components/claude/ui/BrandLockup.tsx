import React from 'react';

export interface BrandLockupProps {
  size?: number;
  color?: string;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({ size = 20, color = 'var(--fg)' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <span style={{
      width: size + 4,
      height: size + 4,
      background: 'var(--accent)',
      borderRadius: 6,
      display: 'grid',
      placeItems: 'center',
      color: '#062014',
      fontWeight: 800,
      fontFamily: 'var(--font-display)',
      fontSize: size * 0.7,
    }}>
      W
    </span>
    <span style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: size,
      letterSpacing: '-0.02em',
      color,
    }}>
      wayta
    </span>
  </span>
);

export default BrandLockup;