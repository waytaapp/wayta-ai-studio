import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

export interface WelcomeScreenProps {
  /** Hide the gradient "Skip the queue." hero card (used when the desktop brand rail shows it). */
  hideHero?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ hideHero = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    {!hideHero && (
      <div style={{
        padding: '20px 22px', borderRadius: 20,
        background: 'linear-gradient(160deg, var(--accent) 0%, var(--wayta-emerald-700) 100%)',
        color: 'var(--fg-on-emerald)', marginBottom: 22,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em' }}>
            WAYTA / NIGHT.01
          </span>
          <Icon name="sparkle" size={18} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, lineHeight: 1.05, marginTop: 18 }}>
          Skip<br />the queue.
        </div>
      </div>
    )}

    <Eyebrow accent>● ON-SITE ORDER & PAY</Eyebrow>
    <Title>Order drinks. Pay on-site. Collect fast.</Title>
    <Lead>
      Built for clubs, lounges and festivals in Jo'burg and Pretoria. Three steps
      from the door to the drink in your hand.
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
