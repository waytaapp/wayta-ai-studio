import React from 'react';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackColor?: string;
}

const sizeMap = {
  sm: { size: 32, fontSize: 12 },
  md: { size: 40, fontSize: 14 },
  lg: { size: 56, fontSize: 18 },
  xl: { size: 72, fontSize: 24 },
};

const colors = [
  'var(--accent)',
  'var(--wayta-info)',
  'var(--wayta-warn)',
  'var(--wayta-stop)',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ 
  name, 
  src, 
  size = 'md', 
  fallbackColor 
}) => {
  const { size: avatarSize, fontSize } = sizeMap[size];
  const bgColor = fallbackColor || (name ? getColorFromName(name) : 'var(--accent)');
  const fgColor = bgColor === 'var(--accent)' ? 'var(--fg-on-emerald)' : '#ffffff';
  const initials = name ? getInitials(name) : '?';

  return (
    <div
      style={{
        width: avatarSize,
        height: avatarSize,
        borderRadius: '999px',
        background: bgColor,
        color: fgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: fontSize,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {src ? (
        <img 
          src={src} 
          alt={name || 'Avatar'} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} 
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default Avatar;