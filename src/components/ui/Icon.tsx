

type IconName = 
  | 'arrow' | 'back' | 'check' | 'pin' | 'lock' | 'apple' | 'card' 
  | 'sparkle' | 'glass' | 'users' | 'bolt' | 'eye' | 'info' 
  | 'party' | 'shield' | 'google' | 'mail' | 'phone' | 'wallet'
  | 'chevron-down' | 'chevron-up' | 'chevron-left' | 'chevron-right'
  | 'plus' | 'minus' | 'x' | 'search' | 'burger' | 'bell'
  | 'qr' | 'home' | 'receipt' | 'chart' | 'layers' | 'coffee'
  | 'box' | 'crown' | 'star' | 'list' | 'grid' | 'upload'
  | 'flame' | 'map-pin' | 'credit-card' | 'shopping-bag' | 'user'
  | 'log-in' | 'scan' | 'menu' | 'more-horizontal' | 'moon' | 'sun';

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  check: <path d="M5 13l4 4L19 7" />,
  pin: <><path d="M12 22s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  apple: <><path d="M16.5 12.5a4 4 0 0 1 2-3.4 4 4 0 0 0-3.2-1.7c-1.4 0-2.6.8-3.3.8-.7 0-1.8-.8-3-.8a4.2 4.2 0 0 0-3.6 2.2c-1.6 2.7-.4 6.7 1 8.9.8 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.2.6-.8 1.1-1.7 1.4-2.7-2-.7-2.7-2.5-2.7-3.4z" /><path d="M14.3 5.6c.6-.7 1-1.7 1-2.6-.9 0-1.9.6-2.6 1.3-.6.6-1.1 1.6-.9 2.5 1 0 2-.5 2.5-1.2z" /></>,
  card: <><rect x="2" y="6" width="20" height="13" rx="2.5" /><path d="M2 11h20" /><path d="M6 16h3" /></>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></>,
  glass: <><path d="M6 3h12l-1.5 9a4 4 0 0 1-3 3.4V20h2v1H8.5v-1h2v-4.6a4 4 0 0 1-3-3.4z" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-5M12 8h.01" /></>,
  party: <><path d="M5 21l4-14 10 4L5 21z" /><path d="M9 7l1-3M14 5l3-1M16 9l3 1M14 13l2 3" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  google: (
    <>
      <path d="M21.8 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.5c-.2 1.3-.9 2.4-2 3.1v2.6h3.2c1.9-1.7 3.1-4.3 3.1-7.7z" fill="#4285F4" stroke="none" />
      <path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.8 8.1 22 12 22z" fill="#34A853" stroke="none" />
      <path d="M6.4 13.9c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.3H3.1C2.4 8.7 2 10.3 2 12s.4 3.3 1.1 4.7l3.3-2.8z" fill="#FBBC05" stroke="none" />
      <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.8 14.7 2 12 2 8.1 2 4.8 4.2 3.1 7.3l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9z" fill="#EA4335" stroke="none" />
    </>
  ),
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>,
  phone: <><path d="M4 5c0-1 1-2 2-2h2l2 5-2 1c1 2 3 4 5 5l1-2 5 2v2c0 1-1 2-2 2C9 18 4 13 4 5z"/></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14" r="1.2" fill="currentColor"/></>,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-up': <path d="M6 15l6-6 6 6" />,
  'chevron-left': <path d="M15 18l-6-6 6-6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  burger: <path d="M3 6h18M3 12h18M3 18h18" />,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7z"/><path d="M10 19a2 2 0 0 0 4 0"/></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 21h3M21 17v4"/></>,
  home: <><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"/></>,
  receipt: <><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3z"/><path d="M9 8h10M9 12h10M9 16h6"/></>,
  chart: <><path d="M4 20V8M10 20v-7M16 20V4M22 20H2"/></>,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5"/></>,
  coffee: <><path d="M4 9h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z"/><path d="M18 11h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v3M12 3v3M16 3v3"/></>,
  box: <><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>,
  crown: <><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></>,
  star: <><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  upload: <><path d="M12 3v14M6 9l6-6 6 6"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></>,
  flame: <><path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-4 3-5-1 3 2 3 2 0V3z"/></>,
  'map-pin': <><path d="M12 22s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></>,
  'credit-card': <><rect x="2" y="6" width="20" height="13" rx="2.5"/><path d="M2 11h20"/><path d="M6 16h3"/></>,
  'shopping-bag': <path d="M6 3h12l2 16H8l2-16z" />,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>,
  'log-in': <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></>,
  scan: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 21h3M21 17v4"/></>,
  menu: <path d="M3 12h18M3 6h18M3 18h18" />,
  'more-horizontal': <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
  moon: <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
};

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 20, 
  stroke = 1.75, 
  color = 'currentColor',
  className = '',
  ...props 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...props.style }}
    {...props}
  >
    {paths[name] || paths.info}
  </svg>
);

export type { IconName, IconProps };