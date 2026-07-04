import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

interface Method { id: string; icon: string; title: string; sub: string; badge: string | null }

const methods: Method[] = [
  { id: 'apple', icon: 'apple', title: 'Apple Pay',       sub: 'Face ID at the bar — fastest checkout', badge: 'RECOMMENDED' },
  { id: 'card',  icon: 'card',  title: 'Debit or credit', sub: 'Visa, Mastercard, local SA banks',      badge: null },
  { id: 'eft',   icon: 'bolt',  title: 'Instant EFT',     sub: 'Pay direct from your bank — Stitch',    badge: null },
];

export interface PaymentScreenProps {
  method: string | null;
  cap: number;
  onMethodChange: (method: string) => void;
  onCapChange: (cap: number) => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ method, cap, onMethodChange, onCapChange }) => {
  return (
    <div>
      <Eyebrow>STEP 6 OF 7</Eyebrow>
      <Title>Set up pay-on-tap.</Title>
      <Lead>One method, one tap from the cart. Switch any time from the wallet.</Lead>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {methods.map((m) => {
          const selected = method === m.id;
          return (
            <button key={m.id} type="button" onClick={() => onMethodChange(m.id)} style={{
              all: 'unset',
              background: selected ? 'var(--bg-emerald-soft)' : 'var(--bg-elev-1)',
              border: `1.5px solid ${selected ? 'var(--border-emerald)' : 'var(--border)'}`,
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', boxSizing: 'border-box',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11,
                background: selected ? 'var(--accent)' : 'var(--bg-elev-2)',
                color: selected ? 'var(--fg-on-emerald)' : 'var(--fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name={m.icon as any} size={18} stroke={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--fg)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {m.title}
                  {m.badge && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.16em', color: 'var(--accent)',
                      padding: '3px 7px', borderRadius: 999,
                      border: '1px solid var(--border-emerald)',
                    }}>{m.badge}</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 2 }}>{m.sub}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: 999,
                border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {selected && <div style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--accent)' }} />}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 18, padding: '14px 18px',
        background: 'var(--bg-elev-1)', border: '1px solid var(--border)', borderRadius: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Eyebrow>TONIGHT'S CAP</Eyebrow>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.06em' }}>
            OPTIONAL
          </span>
        </div>
        <div style={{
          marginTop: 6, fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 26,
          letterSpacing: '-0.01em', color: 'var(--fg)',
        }}>
          R{cap.toLocaleString()}<span style={{ color: 'var(--fg-3)', fontWeight: 400 }}> / night</span>
        </div>
        <input
          type="range"
          min={0}
          max={2000}
          step={50}
          value={cap}
          onChange={(e) => onCapChange(Number(e.target.value))}
          style={{
            marginTop: 12, width: '100%', height: 6, borderRadius: 999,
            appearance: 'none', background: 'var(--bg-elev-2)', outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
};
