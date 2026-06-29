import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { ThemeToggle } from '../components/ui/ThemeToggle';

type Door = 'patron' | 'provider';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const [door, setDoor] = useState<Door>('patron');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      color: 'var(--fg)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            Wayta
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.18em', padding: '3px 6px',
            borderRadius: 4, border: '1px solid var(--border)',
            color: 'var(--fg-3)',
          }}>
            BETA
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* Variant label */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.24em', color: 'var(--fg-3)',
        padding: '0 24px', textTransform: 'uppercase',
      }}>
        V A R I A N T  A  ·  S E G M E N T E D  T O G G L E
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '24px', maxWidth: 400, width: '100%',
        margin: '0 auto', boxSizing: 'border-box',
      }}>
        {/* Segmented toggle */}
        <div style={{ marginTop: 32, marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', padding: 4,
            borderRadius: 'var(--r-pill)', border: '1px solid var(--border)',
            background: 'var(--bg-elev-1)',
          }}>
            <button
              type="button"
              onClick={() => setDoor('patron')}
              style={{
                padding: '10px 28px', borderRadius: 'var(--r-pill)', border: 'none',
                background: door === 'patron' ? 'var(--accent)' : 'transparent',
                color: door === 'patron' ? 'var(--fg-on-emerald)' : 'var(--fg-2)',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.12em', cursor: 'pointer',
                transition: 'all var(--dur-base) var(--ease-out)',
              }}
            >
              PATRON
            </button>
            <button
              type="button"
              onClick={() => setDoor('provider')}
              style={{
                padding: '10px 28px', borderRadius: 'var(--r-pill)', border: 'none',
                background: door === 'provider' ? 'var(--accent)' : 'transparent',
                color: door === 'provider' ? 'var(--fg-on-emerald)' : 'var(--fg-2)',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.12em', cursor: 'pointer',
                transition: 'all var(--dur-base) var(--ease-out)',
              }}
            >
              PROVIDER
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px, 4vw, 40px)', color: 'var(--fg)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
          Sign in.
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--fg-2)', marginTop: 8, lineHeight: 1.5 }}>
          One app, two doors. Pick yours.
        </div>

        {/* Content area */}
        <div style={{ marginTop: 32, flex: 1 }}>
          {door === 'patron' ? (
            /* ─── PATRON PANEL ─── */
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 4,
              }}>
                S K I P  T H E  Q U E U E
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 24 }}>
                Order, pay, collect.
              </div>

              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'var(--fg-3)', marginBottom: 8,
              }}>
                MOBILE NUMBER
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-elev-1)',
                border: `1.5px solid ${phoneFocused ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', padding: '14px 16px',
                boxShadow: phoneFocused ? '0 0 0 4px var(--bg-emerald-soft)' : 'none',
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  placeholder="82 555 0177"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
                    minWidth: 0,
                  }}
                />
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                We'll text a 6-digit code.
              </div>
            </div>
          ) : (
            /* ─── PROVIDER PANEL ─── */
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'var(--fg-3)', marginBottom: 24,
              }}>
                SIGN IN TO CONSOLE
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'var(--fg-3)', marginBottom: 8,
                }}>
                  EMAIL
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-elev-1)',
                  border: `1.5px solid ${emailFocused ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-md)', padding: '14px 16px',
                  boxShadow: emailFocused ? '0 0 0 4px var(--bg-emerald-soft)' : 'none',
                  transition: 'all 150ms ease',
                }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="ops@latitude.co.za"
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
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'var(--fg-3)', marginBottom: 8,
                }}>
                  PASSWORD
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-elev-1)',
                  border: `1.5px solid ${passFocused ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-md)', padding: '14px 16px',
                  boxShadow: passFocused ? '0 0 0 4px var(--bg-emerald-soft)' : 'none',
                  transition: 'all 150ms ease',
                }}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    placeholder="••••••••••"
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
                      minWidth: 0,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate(door === 'patron' ? '/onboarding' : `/${door === 'provider' ? 'staff' : 'patron'}`)}
            style={{
              width: '100%', height: 48, padding: '0 22px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--accent)', color: 'var(--fg-on-emerald)',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15,
              border: 'none', cursor: 'pointer',
              boxShadow: 'var(--glow-emerald)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all var(--dur-base) var(--ease-out)',
            }}
          >
            Continue <Icon name="arrow" size={18} />
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            color: 'var(--fg-3)', fontSize: 12.5, fontFamily: 'var(--font-body)',
            padding: '4px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontWeight: 600, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button
            type="button"
            style={{
              width: '100%', height: 48,
              borderRadius: 'var(--r-pill)',
              background: 'transparent', color: 'var(--fg)',
              border: '1px solid var(--border-strong)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="qr" size={18} /> Scan venue QR
          </button>

          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--accent)', fontFamily: 'var(--font-body)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              padding: '8px', textAlign: 'center',
            }}
          >
            New to Wayta? Create a profile →
          </button>

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.18em', color: 'var(--fg-3)',
            textAlign: 'center', paddingTop: 8, paddingBottom: 4,
          }}>
            14 LIVE VENUES JHB · PTA
          </div>
        </div>
      </div>
    </div>
  );
};
