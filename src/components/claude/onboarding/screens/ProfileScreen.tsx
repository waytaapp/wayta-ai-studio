import { useState } from 'react';
import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

export interface ProfileScreenProps {
  displayName: string;
  handle: string;
  onNameChange: (name: string) => void;
  onHandleChange: (handle: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ displayName, handle, onNameChange, onHandleChange }) => {
  const [nameFocused, setNameFocused] = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);

  return (
    <div>
      <Eyebrow>STEP 4 OF 7</Eyebrow>
      <Title>Who's ordering?</Title>
      <Lead>So your crew can spot you on the venue map and split rounds.</Lead>

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 999,
          background: 'var(--accent)', color: 'var(--fg-on-emerald)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28,
          letterSpacing: '-0.02em', flexShrink: 0,
        }}>
          {displayName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <button type="button" style={{
            padding: '10px 16px', borderRadius: 999,
            background: 'transparent', color: 'var(--fg)',
            border: '1px solid var(--border-strong)',
            fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="sparkle" size={14} stroke={2} />Upload photo
          </button>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 6 }}>
            Optional · JPG or PNG, max 4 MB
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)',
            marginBottom: 8,
          }}>
            DISPLAY NAME
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-elev-1)',
            border: `1.5px solid ${nameFocused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)', padding: '14px 16px',
            boxShadow: nameFocused ? '0 0 0 4px var(--bg-emerald-soft)' : 'none',
            transition: 'all 150ms ease',
          }}>
            <input
              type="text"
              value={displayName}
              onChange={(e) => onNameChange(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="Lerato Molefe"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--fg)', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500,
                minWidth: 0,
              }}
            />
          </div>
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)',
            marginBottom: 8,
          }}>
            HANDLE
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-elev-1)',
            border: `1.5px solid ${handleFocused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)', padding: '14px 16px',
            boxShadow: handleFocused ? '0 0 0 4px var(--bg-emerald-soft)' : 'none',
            transition: 'all 150ms ease',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--fg-3)', fontWeight: 600, paddingRight: 4 }}>
              wayta.co/
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => onHandleChange(e.target.value)}
              onFocus={() => setHandleFocused(true)}
              onBlur={() => setHandleFocused(false)}
              placeholder="leratom"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
                minWidth: 0,
              }}
            />
          </div>
          <div style={{
            marginTop: 8, fontSize: 12.5, color: 'var(--accent)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="check" size={14} stroke={2.5} />Handle is available
          </div>
        </div>
      </div>
    </div>
  );
};
