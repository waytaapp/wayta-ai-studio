import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('wayta-theme') as Theme) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Apply theme to document
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('wayta-theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function usePalette() {
  const { resolvedTheme } = useTheme();
  
  const dark = resolvedTheme === 'dark';
  
  return {
    bg: dark ? '#0a0a0a' : '#ffffff',
    surface: dark ? '#141414' : '#f6f6f4',
    surface2: dark ? '#1c1c1c' : '#ececea',
    border: dark ? '#262626' : '#e6e6e2',
    borderStrong: dark ? '#3a3a3a' : '#cfcfca',
    fg: dark ? '#fafaf9' : '#0a0a0a',
    fg2: dark ? '#a3a3a3' : '#525252',
    fg3: dark ? '#737373' : '#8a8a85',
    accent: dark ? '#34d399' : '#059669',
    accentHover: dark ? '#6ee7b7' : '#10b981',
    accentSoft: dark ? 'rgba(52,211,153,0.14)' : 'rgba(5,150,105,0.10)',
    accentBorder: dark ? 'rgba(52,211,153,0.4)' : 'rgba(5,150,105,0.35)',
    onAccent: dark ? '#062014' : '#ffffff',
    glow: dark 
      ? '0 10px 40px rgba(52,211,153,0.22)' 
      : '0 10px 30px rgba(5,150,105,0.18)',
    
    // Fonts
    fonts: {
      display: '"Space Grotesk", -apple-system, system-ui, sans-serif',
      body: '"Manrope", -apple-system, system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, "SF Mono", monospace',
    },
    
    // Radii
    radii: {
      xs: '4px',
      sm: '8px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      '2xl': '28px',
      pill: '999px',
    },
    
    // Spacing
    spacing: {
      1: '4px', 2: '8px', 3: '12px', 4: '16px',
      5: '20px', 6: '24px', 8: '32px', 10: '40px',
      12: '48px', 16: '64px',
    },
    
    // Motion
    motion: {
      easeOut: 'cubic-bezier(0.2, 0.7, 0.1, 1)',
      easeSnap: 'cubic-bezier(0.5, 1.5, 0.5, 1)',
      durFast: '120ms',
      durBase: '200ms',
      durSlow: '360ms',
    },
    
    // Type scale
    type: {
      hero: '44px',
      h1: '32px',
      h2: '24px',
      h3: '20px',
      h4: '18px',
      bodyLg: '16px',
      body: '15px',
      bodySm: '13px',
      caption: '12px',
      overline: '10.5px',
    },
    
    // Tracking
    tracking: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.02em',
      overline: '0.22em',
    },
    
    // Line heights
    lineHeight: {
      tight: '1.05',
      snug: '1.2',
      normal: '1.45',
      relaxed: '1.5',
    },
  };
}