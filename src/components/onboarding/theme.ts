export type Theme = 'light' | 'dark';

export interface Palette {
  bg: string; surface: string; surface2: string; border: string; borderStrong: string;
  fg: string; fg2: string; fg3: string; accent: string; accentHover: string;
  accentSoft: string; accentBorder: string; onAccent: string; glow: string;
}

export const palette = (theme: Theme): Palette => {
  const dark = theme === 'dark';
  return {
    bg:           dark ? '#0a0a0a' : '#ffffff',
    surface:      dark ? '#141414' : '#f6f6f4',
    surface2:     dark ? '#1c1c1c' : '#ececea',
    border:       dark ? '#262626' : '#e6e6e2',
    borderStrong: dark ? '#3a3a3a' : '#cfcfca',
    fg:           dark ? '#fafaf9' : '#0a0a0a',
    fg2:          dark ? '#a3a3a3' : '#525252',
    fg3:          dark ? '#737373' : '#8a8a85',
    accent:       dark ? '#34d399' : '#059669',
    accentHover:  dark ? '#6ee7b7' : '#10b981',
    accentSoft:   dark ? 'rgba(52,211,153,0.14)' : 'rgba(5,150,105,0.10)',
    accentBorder: dark ? 'rgba(52,211,153,0.4)'  : 'rgba(5,150,105,0.35)',
    onAccent:     dark ? '#062014' : '#ffffff',
    glow:         dark ? '0 10px 40px rgba(52,211,153,0.22)' : '0 10px 30px rgba(5,150,105,0.18)',
  };
};

export const fonts = {
  display: '"Space Grotesk", -apple-system, system-ui, sans-serif',
  body:    '"Manrope", -apple-system, system-ui, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, "SF Mono", monospace',
};
