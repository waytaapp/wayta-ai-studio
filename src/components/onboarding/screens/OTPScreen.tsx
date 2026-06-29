import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';

export interface OTPScreenProps {
  phone: string;
  digits: string[];
  onChange: (digits: string[]) => void;
}

export const OTPScreen: React.FC<OTPScreenProps> = ({ phone, digits, onChange }) => {
  const inputRefs = Array.from({ length: 6 }, () => undefined) as (HTMLInputElement | null)[];

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...digits];
    next[i] = v.slice(-1);
    onChange(next);
    if (v && i < 5) inputRefs[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs[i - 1]?.focus();
  };

  return (
    <div>
      <Eyebrow>STEP 3 OF 7</Eyebrow>
      <Title>Enter the 6-digit code</Title>
      <Lead>
        Sent to <span style={{ color: 'var(--fg)', fontWeight: 700 }}>+27 {phone}</span>.
        {' '}<a href="#" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Change number</a>
      </Lead>

      <div style={{
        marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 10, maxWidth: 420,
      }}>
        {digits.map((d, i) => (
          <div key={i} style={{
            aspectRatio: '1',
            background: 'var(--bg-elev-1)',
            border: `1.5px solid ${d ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <input
              ref={(el) => { inputRefs[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                background: 'transparent', border: 'none', outline: 'none',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600, color: 'var(--fg)',
                caretColor: d ? 'transparent' : 'var(--accent)',
              }}
            />
            {!d && i === digits.findIndex((x) => !x) && (
              <div style={{
                position: 'absolute',
                width: 2, height: 26, background: 'var(--accent)',
                animation: 'blink 1s steps(1) infinite',
                pointerEvents: 'none',
              }} />
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 26, display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: 'var(--font-body)', fontSize: 13.5,
      }}>
        <span style={{ color: 'var(--fg-2)' }}>Didn't get it?</span>
        <button type="button" style={{
          background: 'transparent', border: 'none', padding: 0,
          color: 'var(--accent)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13.5,
          cursor: 'pointer',
        }}>Resend in 0:24</button>
      </div>
    </div>
  );
};
