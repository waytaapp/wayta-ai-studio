import React from 'react';
import { Theme, palette, fonts } from './theme';

type IconName = 'arrow'|'back'|'check'|'pin'|'lock'|'apple'|'card'|'sparkle'|'glass'|'users'|'bolt'|'eye'|'info'|'party'|'shield'|'google';
interface IconProps { name: IconName; size?: number; stroke?: number; color?: string; }

export const Icon: React.FC<IconProps> = ({ name, size = 20, stroke = 1.75, color }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color || 'currentColor', strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<IconName, React.ReactNode> = {
    arrow:   (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
    back:    (<><path d="M19 12H5M11 18l-6-6 6-6" /></>),
    check:   (<><path d="M5 13l4 4L19 7" /></>),
    pin:     (<><path d="M12 22s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></>),
    lock:    (<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
    apple:   (<><path d="M16.5 12.5a4 4 0 0 1 2-3.4 4 4 0 0 0-3.2-1.7c-1.4 0-2.6.8-3.3.8-.7 0-1.8-.8-3-.8a4.2 4.2 0 0 0-3.6 2.2c-1.6 2.7-.4 6.7 1 8.9.8 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.2.6-.8 1.1-1.7 1.4-2.7-2-.7-2.7-2.5-2.7-3.4z" /><path d="M14.3 5.6c.6-.7 1-1.7 1-2.6-.9 0-1.9.6-2.6 1.3-.6.6-1.1 1.6-.9 2.5 1 0 2-.5 2.5-1.2z" /></>),
    card:    (<><rect x="2" y="6" width="20" height="13" rx="2.5" /><path d="M2 11h20" /><path d="M6 16h3" /></>),
    sparkle: (<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></>),
    glass:   (<><path d="M6 3h12l-1.5 9a4 4 0 0 1-3 3.4V20h2v1H8.5v-1h2v-4.6a4 4 0 0 1-3-3.4z" /></>),
    users:   (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
    bolt:    (<><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></>),
    eye:     (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>),
    info:    (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-5M12 8h.01" /></>),
    party:   (<><path d="M5 21l4-14 10 4L5 21z" /><path d="M9 7l1-3M14 5l3-1M16 9l3 1M14 13l2 3" /></>),
    shield:  (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>),
    google:  (<><path d="M21.8 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.5c-.2 1.3-.9 2.4-2 3.1v2.6h3.2c1.9-1.7 3.1-4.3 3.1-7.7z" fill="#4285F4" stroke="none" /><path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.8 8.1 22 12 22z" fill="#34A853" stroke="none" /><path d="M6.4 13.9c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.3H3.1C2.4 8.7 2 10.3 2 12s.4 3.3 1.1 4.7l3.3-2.8z" fill="#FBBC05" stroke="none" /><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.8 14.7 2 12 2 8.1 2 4.8 4.2 3.1 7.3l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9z" fill="#EA4335" stroke="none" /></>),
  };
  return <svg {...p}>{paths[name]}</svg>;
};

interface ThemedProps { theme: Theme; children?: React.ReactNode; }

export const Eyebrow: React.FC<ThemedProps & { accent?: boolean }> = ({ theme, accent, children }) => {
  const c = palette(theme);
  return <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, color: accent ? c.accent : c.fg3 }}>{children}</div>;
};

export const Title: React.FC<ThemedProps> = ({ theme, children }) => (
  <h1 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 'clamp(28px, 3.2vw, 36px)', lineHeight: 1.05, letterSpacing: '-0.025em', margin: '12px 0 0', color: palette(theme).fg }}>{children}</h1>
);

export const Lead: React.FC<ThemedProps> = ({ theme, children }) => (
  <p style={{ fontFamily: fonts.body, fontSize: 15.5, lineHeight: 1.5, color: palette(theme).fg2, margin: '12px 0 0', maxWidth: 460 }}>{children}</p>
);

export const FieldLabel: React.FC<ThemedProps> = ({ theme, children }) => (
  <label style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, color: palette(theme).fg3, display: 'block', marginBottom: 8 }}>{children}</label>
);

interface TextBoxProps { theme: Theme; value: string; onChange?: (v: string) => void; placeholder?: string; prefix?: React.ReactNode; type?: string; mono?: boolean; focus?: boolean; autoFocus?: boolean; }

export const TextBox: React.FC<TextBoxProps> = ({ theme, value, onChange, placeholder, prefix, type = 'text', mono, focus, autoFocus }) => {
  const c = palette(theme);
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: c.surface, border: `1.5px solid ${focus ? c.accent : c.border}`, borderRadius: 12, padding: '14px 16px', gap: 10, boxShadow: focus ? `0 0 0 4px ${c.accentSoft}` : 'none', transition: 'all 150ms ease' }}>
      {prefix}
      <input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} type={type} autoFocus={autoFocus}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: c.fg, fontFamily: mono ? fonts.mono : fonts.body, fontSize: 16, fontWeight: 500, letterSpacing: mono ? '0.02em' : 'normal', minWidth: 0 }} />
    </div>
  );
};

interface BtnProps { theme: Theme; children?: React.ReactNode; onClick?: () => void; disabled?: boolean; icon?: IconName; block?: boolean; accent?: boolean; }

export const PrimaryButton: React.FC<BtnProps> = ({ theme, children, icon, onClick, disabled }) => {
  const c = palette(theme);
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '14px 26px', borderRadius: 999, background: disabled ? c.surface2 : c.accent, color: disabled ? c.fg3 : c.onAccent, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: fonts.body, fontWeight: 700, fontSize: 15, letterSpacing: '-0.005em', boxShadow: disabled ? 'none' : c.glow, display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'all 180ms cubic-bezier(.2,.7,.1,1)' }}>
      {children}{icon && <Icon name={icon} size={15} stroke={2.4} />}
    </button>
  );
};

export const TextButton: React.FC<BtnProps> = ({ theme, children, onClick, accent }) => {
  const c = palette(theme);
  return (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', padding: '12px 8px', color: accent ? c.accent : c.fg2, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{children}</button>
  );
};
