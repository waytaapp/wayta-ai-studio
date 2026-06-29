import { useState } from 'react';
import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

export interface PhoneScreenProps {
  value: string;
  onChange: (phone: string) => void;
}

export const PhoneScreen: React.FC<PhoneScreenProps> = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <Eyebrow>STEP 2 OF 7</Eyebrow>
      <Title>What's your number?</Title>
      <Lead>
        We use it to verify it's you and to text your collection signal when the bar's ready.
      </Lead>

      <div style={{ marginTop: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)',
          marginBottom: 8,
        }}>
          MOBILE NUMBER
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-elev-1)',
          border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)', padding: '14px 16px',
          boxShadow: focused ? '0 0 0 4px var(--bg-emerald-soft)' : 'none',
          transition: 'all 150ms ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingRight: 12, marginRight: 2,
            borderRight: '1px solid var(--border)',
          }}>
            <div style={{
              width: 22, height: 16, borderRadius: 3,
              background: 'linear-gradient(180deg,#007749 33%,#ffb612 33%,#ffb612 66%,#de3831 66%)',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--fg)' }}>+27</span>
          </div>
          <input
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="82 614 9023"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
              minWidth: 0,
            }}
          />
        </div>
      </div>

      <div style={{
        marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: 'var(--bg-emerald-soft)',
        border: '1px solid var(--border-emerald)', borderRadius: 12,
        color: 'var(--fg-2)', fontSize: 13, lineHeight: 1.45,
      }}>
        <div style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>
          <Icon name="info" size={16} stroke={2.2} />
        </div>
        <span>SA numbers only during the Sandton / Rosebank / Braamfontein / Hatfield pilot.</span>
      </div>

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-3)', fontSize: 12.5 }}>
        <Icon name="shield" size={14} stroke={2} />
        <span>We'll never share your number.</span>
      </div>
    </div>
  );
};
