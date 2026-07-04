import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

export interface DoneScreenProps {
  displayName: string;
  phone: string;
  handle: string;
  paymentMethod: string | null;
  cap: number;
}

const paymentLabels: Record<string, string> = { apple: 'Apple Pay', card: 'Debit / Credit', eft: 'Instant EFT' };

export const DoneScreen: React.FC<DoneScreenProps> = ({ displayName, phone, handle, paymentMethod, cap }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 999,
        background: 'var(--accent)', color: 'var(--fg-on-emerald)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Icon name="check" size={40} stroke={3} />
        <div style={{
          position: 'absolute', inset: -10, borderRadius: 999,
          border: '1px solid var(--border-emerald)', opacity: 0.6,
        }} />
        <div style={{
          position: 'absolute', inset: -22, borderRadius: 999,
          border: '1px solid var(--border-emerald)', opacity: 0.3,
        }} />
      </div>
    </div>

    <div style={{ marginTop: 24 }}>
      <Eyebrow accent>● ACCOUNT READY</Eyebrow>
      <Title>You're on the list, {displayName.split(' ')[0] || 'Friend'}.</Title>
      <Lead>
        Your wallet's loaded, your crew slot's open, and the closest pilot
        venue is 1.2 km away.
      </Lead>
    </div>

    <div style={{
      marginTop: 24, padding: '14px 18px',
      background: 'var(--bg-elev-1)', border: '1px solid var(--border)', borderRadius: 14,
    }}>
      {[
        ['Mobile',  `+27 ${phone}`],
        ['Handle',  `wayta.co/${handle}`],
        ['Payment', paymentMethod ? (paymentLabels[paymentMethod] || paymentMethod) : '—'],
        ['Cap',     cap > 0 ? `R${cap.toLocaleString()} / night` : 'None set'],
      ].map(([k, v], i, arr) => (
        <div key={k} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '10px 0',
          borderBottom: i === arr.length - 1 ? 'none' : '1px dashed var(--border)',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 600,
          }}>{k}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  </div>
);
