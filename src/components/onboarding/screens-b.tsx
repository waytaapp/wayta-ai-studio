import React from 'react';
import { Theme, palette, fonts } from './theme';
import { Icon, Eyebrow, Title, Lead } from './ui';

interface ScreenProps { theme: Theme; }

export const Location: React.FC<ScreenProps> = ({ theme }) => {
  const c = palette(theme);
  const pins = [{ x: '22%', y: '34%', name: 'PULSE', active: true }, { x: '60%', y: '22%', name: 'KONKA', active: false }, { x: '78%', y: '68%', name: 'TOY ROOM', active: false }, { x: '36%', y: '78%', name: 'AYEPYEP', active: false }];
  return (
    <div>
      <Eyebrow theme={theme}>STEP 4 OF 6</Eyebrow>
      <Title theme={theme}>Find the venue, fast.</Title>
      <Lead theme={theme}>Wayta auto-detects which club or festival you're at so the right menu opens the second you walk in.</Lead>
      <div style={{ marginTop: 24, height: 200, borderRadius: 16, background: c.surface, border: `1px solid ${c.border}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${c.border} 1px, transparent 1px),linear-gradient(90deg, ${c.border} 1px, transparent 1px)`, backgroundSize: '24px 24px', opacity: 0.55 }} />
        {pins.map((v, i) => (
          <div key={i} style={{ position: 'absolute', left: v.x, top: v.y, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: v.active ? 14 : 10, height: v.active ? 14 : 10, borderRadius: 999, background: v.active ? c.accent : c.fg3, boxShadow: v.active ? `0 0 0 6px ${c.accentSoft}` : 'none', border: `2px solid ${c.surface}` }} />
            <div style={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: v.active ? c.accent : c.fg3 }}>{v.name}</div>
          </div>
        ))}
        <div style={{ position: 'absolute', top: 12, left: 14, fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.18em', color: c.fg3, fontWeight: 700 }}>● 4 NEARBY</div>
        <div style={{ position: 'absolute', top: 12, right: 14, fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.18em', color: c.accent, fontWeight: 700 }}>SANDTON</div>
      </div>
      <div style={{ marginTop: 18, padding: '14px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14 }}>
        {[{ icon: 'pin' as const, title: 'Used only at venues', body: "We check your location when you open the app inside a partner venue. Nowhere else." }, { icon: 'shield' as const, title: 'Never shared', body: "Your dot doesn't appear to other patrons. Only your invited crew sees you on the map." }].map((row, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: i === arr.length - 1 ? 0 : 14, paddingTop: i === 0 ? 0 : 14, borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${c.border}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: c.accentSoft, color: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={row.icon} size={15} stroke={2} /></div>
            <div><div style={{ fontSize: 13, fontWeight: 700, color: c.fg }}>{row.title}</div><div style={{ fontSize: 12.5, color: c.fg2, lineHeight: 1.45, marginTop: 2 }}>{row.body}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Payment: React.FC<ScreenProps> = ({ theme }) => {
  const c = palette(theme);
  const [picked, setPicked] = React.useState('apple');
  const methods = [
    { id: 'apple', icon: 'apple' as const, title: 'Apple Pay', sub: 'Face ID at the bar — fastest checkout', badge: 'RECOMMENDED' },
    { id: 'card', icon: 'card' as const, title: 'Debit or credit', sub: 'Visa, Mastercard, local SA banks', badge: null },
    { id: 'eft', icon: 'bolt' as const, title: 'Instant EFT', sub: 'Pay direct from your bank — Stitch', badge: null },
  ];
  return (
    <div>
      <Eyebrow theme={theme}>STEP 5 OF 6</Eyebrow>
      <Title theme={theme}>Set up pay-on-tap.</Title>
      <Lead theme={theme}>One method, one tap from the cart. Switch any time from the wallet.</Lead>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {methods.map(m => {
          const selected = picked === m.id;
          return (
            <button key={m.id} onClick={() => setPicked(m.id)} style={{ all: 'unset', background: selected ? c.accentSoft : c.surface, border: `1.5px solid ${selected ? c.accent : c.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxSizing: 'border-box' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: selected ? c.accent : c.surface2, color: selected ? c.onAccent : c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={m.icon} size={18} stroke={1.8} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: c.fg, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.title}
                  {m.badge && <span style={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: c.accent, padding: '3px 7px', borderRadius: 999, background: 'rgba(5,150,105,0.14)', border: `1px solid ${c.accentBorder}` }}>{m.badge}</span>}
                </div>
                <div style={{ fontSize: 12.5, color: c.fg2, marginTop: 2 }}>{m.sub}</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${selected ? c.accent : c.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected && <div style={{ width: 9, height: 9, borderRadius: 999, background: c.accent }} />}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 18, padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><Eyebrow theme={theme}>TONIGHT'S CAP</Eyebrow><span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.fg3, letterSpacing: '0.06em' }}>OPTIONAL</span></div>
        <div style={{ marginTop: 6, fontFamily: fonts.mono, fontWeight: 500, fontSize: 26, letterSpacing: '-0.01em', color: c.fg }}>R1 200<span style={{ color: c.fg3, fontWeight: 400 }}> / night</span></div>
        <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: c.surface2, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '52%', background: c.accent, borderRadius: 999 }} />
          <div style={{ position: 'absolute', left: 'calc(52% - 9px)', top: -6, width: 18, height: 18, borderRadius: 999, background: c.accent, border: `3px solid ${c.bg}`, boxShadow: c.glow }} />
        </div>
      </div>
    </div>
  );
};

export const Done: React.FC<ScreenProps> = ({ theme }) => {
  const c = palette(theme);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ width: 80, height: 80, borderRadius: 999, background: c.accent, color: c.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: c.glow, position: 'relative' }}>
          <Icon name="check" size={40} stroke={3} />
          <div style={{ position: 'absolute', inset: -10, borderRadius: 999, border: `1px solid ${c.accentBorder}`, opacity: 0.6 }} />
          <div style={{ position: 'absolute', inset: -22, borderRadius: 999, border: `1px solid ${c.accentBorder}`, opacity: 0.3 }} />
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <Eyebrow theme={theme} accent>● ACCOUNT READY</Eyebrow>
        <Title theme={theme}>You're on the list.</Title>
        <Lead theme={theme}>Your wallet's loaded, your crew slot's open, and the closest pilot venue is 1.2 km away.</Lead>
      </div>
      <div style={{ marginTop: 24, padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14 }}>
        {[['Mobile', '+27 82 614 9023'], ['Handle', 'wayta.co/leratom'], ['Payment', 'Apple Pay'], ['Cap', 'R1 200 / night']].map(([k, v], i, arr) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px dashed ${c.border}` }}>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.fg3, fontWeight: 600 }}>{k}</span>
            <span style={{ fontFamily: fonts.mono, fontSize: 13.5, fontWeight: 500, color: c.fg }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
