import React from 'react';

/**
 * Brand rail for the onboarding shell — the "Signal Green" hero panel.
 *
 * On desktop it sits beside the form (full height, ~42% width). On mobile it
 * collapses (`compact`) into a slim header bar showing just the lockup and the
 * step counter. Colours come from the app's design tokens so it flips with the
 * light/dark theme automatically.
 */
export interface BrandPanelProps {
  /** Zero-based index of the active step. */
  step: number;
  /** Total number of steps in the flow. */
  total: number;
  /** Render the slim mobile header instead of the full hero. */
  compact: boolean;
}

const FEATURES = [
  { n: '01', t: 'Locate' },
  { n: '02', t: 'Order & Pay' },
  { n: '03', t: 'Collect' },
] as const;

export const BrandPanel: React.FC<BrandPanelProps> = ({ step, total, compact }) => {
  const onAccent = 'var(--fg-on-emerald)';
  const dimBorder = 'rgba(6,32,20,0.28)';

  return (
    <div
      style={{
        background: 'var(--accent)',
        color: onAccent,
        padding: compact ? '18px 22px' : '40px 42px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        height: compact ? 'auto' : '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Ambient light + shadow wash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.20) 0, transparent 45%),' +
            'radial-gradient(circle at 80% 75%, rgba(0,0,0,0.20) 0, transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top row: lockup + step counter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: onAccent,
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            W
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: '-0.02em',
            }}
          >
            wayta
          </div>
        </div>
        {/* Counter hidden in compact mode so the floating theme toggle doesn't overlap it. */}
        {!compact && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.2em',
              fontWeight: 700,
              opacity: 0.85,
            }}
          >
            {String(step + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        )}
      </div>

      {!compact && (
        <>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative',
              marginTop: 60,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.24em',
                fontWeight: 700,
                opacity: 0.85,
              }}
            >
              NIGHTLIFE TOOLKIT
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 4.4vw, 64px)',
                lineHeight: 0.95,
                letterSpacing: '-0.035em',
              }}
            >
              Skip
              <br />
              the queue.
            </div>
            <div
              style={{
                marginTop: 22,
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                lineHeight: 1.55,
                maxWidth: 380,
                opacity: 0.92,
              }}
            >
              Order, pay and collect at packed clubs and festival peaks — without
              losing the night to lines.
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              display: 'flex',
              gap: 14,
              paddingTop: 26,
              borderTop: `1px solid ${dimBorder}`,
            }}
          >
            {FEATURES.map((s) => (
              <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    opacity: 0.7,
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.t}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BrandPanel;
