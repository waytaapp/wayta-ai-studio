import React from 'react';
import { Theme, palette, fonts } from './theme';
import { Icon, Eyebrow, Title, Lead, FieldLabel, TextBox } from './ui';

interface ScreenProps { theme: Theme; }

export const Welcome: React.FC<ScreenProps> = ({ theme }) => {
  const c = palette(theme);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Eyebrow theme={theme} accent>● ON-SITE ORDER & PAY</Eyebrow>
      <Title theme={theme}>Welcome to Wayta.</Title>
      <Lead theme={theme}>Order drinks, secure tables and pay on-site at South Africa's nightlife venues. Three steps from the door to the drink in your hand.</Lead>
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[{ n: '01', t: 'Locate', d: 'Auto-detect your venue.' }, { n: '02', t: 'Order & Pay', d: 'One tap from cart.' }, { n: '03', t: 'Collect', d: 'Skip the bar line.' }].map(s => (
          <div key={`digit-${s.n}`} style={{ padding: '14px 14px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14 }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.18em', color: c.accent, fontWeight: 700 }}>{s.n}</div>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, color: c.fg, marginTop: 4, letterSpacing: '-0.01em' }}>{s.t}</div>
            <div style={{ fontSize: 12.5, color: c.fg2, marginTop: 3, lineHeight: 1.4 }}>{s.d}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 26 }}>
        <Eyebrow theme={theme}>OR SIGN UP WITH</Eyebrow>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[{ name: 'google' as const, label: 'Google' }, { name: 'apple' as const, label: 'Apple' }].map(b => (
            <button key={b.label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 18px', borderRadius: 999, background: c.surface, color: c.fg, border: `1px solid ${c.borderStrong}`, fontFamily: fonts.body, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <Icon name={b.name} size={18} stroke={b.name === 'google' ? 0 : 1.5} />{b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Phone: React.FC<ScreenProps> = ({ theme }) => {
  const c = palette(theme);
  const [v, setV] = React.useState('82 614 9023');
  return (
    <div>
      <Eyebrow theme={theme}>STEP 1 OF 6</Eyebrow>
      <Title theme={theme}>What's your number?</Title>
      <Lead theme={theme}>We use it to verify it's you and to text your collection signal when the bar's ready.</Lead>
      <div style={{ marginTop: 28 }}>
        <FieldLabel theme={theme}>MOBILE NUMBER</FieldLabel>
        <TextBox theme={theme} focus mono value={v} onChange={setV}
          prefix={<div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, marginRight: 2, borderRight: `1px solid ${c.border}` }}><div style={{ width: 22, height: 16, borderRadius: 3, background: 'linear-gradient(180deg,#007749 33%,#ffb612 33%,#ffb612 66%,#de3831 66%)' }} /><span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 14, color: c.fg }}>+27</span></div>}
        />
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: c.accentSoft, border: `1px solid ${c.accentBorder}`, borderRadius: 12, color: c.fg2, fontSize: 13, lineHeight: 1.45 }}>
        <div style={{ color: c.accent, flexShrink: 0, marginTop: 1 }}><Icon name="info" size={16} stroke={2.2} /></div>
        <span>SA numbers only during the Sandton / Rosebank / Braamfontein / Hatfield pilot.</span>
      </div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: c.fg3, fontSize: 12.5 }}>
        <Icon name="shield" size={14} stroke={2} /><span>We'll never share your number.</span>
      </div>
    </div>
  );
};

export const OTP: React.FC<ScreenProps> = ({ theme }) => {
  const c = palette(theme);
  const digits = ['4', '8', '2', '6', '', ''];
  return (
    <div>
      <Eyebrow theme={theme}>STEP 2 OF 6</Eyebrow>
      <Title theme={theme}>Enter the 6-digit code</Title>
      <Lead theme={theme}>Sent to <span style={{ color: c.fg, fontWeight: 700 }}>+27 82 614 9023</span>. <a href="#" style={{ color: c.accent, fontWeight: 700, textDecoration: 'none' }}>Change number</a></Lead>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, maxWidth: 420 }}>
        {digits.map((d, i) => (
          <div key={i} style={{ aspectRatio: '1', background: c.surface, border: `1.5px solid ${d || i === 4 ? c.accent : c.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 26, fontWeight: 600, color: c.fg, boxShadow: i === 4 ? `0 0 0 4px ${c.accentSoft}` : 'none' }}>
            {d || (i === 4 && <span style={{ width: 2, height: 26, background: c.accent, animation: 'blinkCaret 1s steps(1) infinite' }} />)}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonts.body, fontSize: 13.5 }}>
        <span style={{ color: c.fg2 }}>Didn't get it?</span>
        <button style={{ background: 'transparent', border: 'none', padding: 0, color: c.accent, fontFamily: fonts.body, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Resend in 0:24</button>
      </div>
    </div>
  );
};

export const Profile: React.FC<ScreenProps> = ({ theme }) => {
  const c = palette(theme);
  const [name, setName] = React.useState('Lerato Molefe');
  const [handle, setHandle] = React.useState('leratom');
  return (
    <div>
      <Eyebrow theme={theme}>STEP 3 OF 6</Eyebrow>
      <Title theme={theme}>Who's ordering?</Title>
      <Lead theme={theme}>So your crew can spot you on the venue map and split rounds.</Lead>
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: c.accent, color: c.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.display, fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', flexShrink: 0 }}>{name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <button style={{ padding: '10px 16px', borderRadius: 999, background: 'transparent', color: c.fg, border: `1px solid ${c.borderStrong}`, fontFamily: fonts.body, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkle" size={14} stroke={2} />Upload photo
          </button>
          <div style={{ fontSize: 12, color: c.fg3, marginTop: 6 }}>Optional · JPG or PNG, max 4 MB</div>
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div><FieldLabel theme={theme}>DISPLAY NAME</FieldLabel><TextBox theme={theme} value={name} onChange={setName} /></div>
        <div>
          <FieldLabel theme={theme}>HANDLE</FieldLabel>
          <TextBox theme={theme} mono value={handle} onChange={setHandle} prefix={<span style={{ fontFamily: fonts.mono, fontSize: 15, color: c.fg3, fontWeight: 600, paddingRight: 4 }}>wayta.co/</span>} />
          <div style={{ marginTop: 8, fontSize: 12.5, color: c.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={14} stroke={2.5} />Handle is available</div>
        </div>
      </div>
    </div>
  );
};
