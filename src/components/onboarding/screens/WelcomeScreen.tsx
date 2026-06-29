import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

export const WelcomeScreen: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <Eyebrow accent>● ON-SITE ORDER & PAY</Eyebrow>
    <Title>Welcome to Wayta.</Title>
    <Lead>
      Order drinks, secure tables and pay on-site at South Africa's nightlife venues.
      Three steps from the door to the drink in your hand.
    </Lead>

    <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {[
        { n: '01', t: 'Locate',      d: 'Auto-detect your venue.' },
        { n: '02', t: 'Order & Pay', d: 'One tap from cart.' },
        { n: '03', t: 'Collect',     d: 'Skip the bar line.' },
      ].map(s => (
        <div key={s.n} style={{
          padding: '14px 14px 16px',
          background: 'var(--bg-elev-1)', border: '1px solid var(--border)', borderRadius: 14,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--accent)', fontWeight: 700 }}>
            {s.n}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--fg)', marginTop: 4, letterSpacing: '-0.01em' }}>
            {s.t}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 3, lineHeight: 1.4 }}>
            {s.d}
          </div>
        </div>
      ))}
    </div>

    <div style={{ marginTop: 26 }}>
      <Eyebrow>OR SIGN UP WITH</Eyebrow>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 18px', borderRadius: 999,
          background: 'var(--bg-elev-1)', color: 'var(--fg)',
          border: '1px solid var(--border-strong)',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <Icon name="google" size={18} stroke={0} />Google
        </button>
        <button type="button" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 18px', borderRadius: 999,
          background: 'var(--bg-elev-1)', color: 'var(--fg)',
          border: '1px solid var(--border-strong)',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <Icon name="apple" size={18} stroke={1.5} />Apple
        </button>
      </div>
    </div>
  </div>
);
