import { useState, useCallback } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { useOverlay } from '../contexts/OverlayContext';

const venues = [
  { name: 'Latitude Rooftop', status: 'Busy', dist: '0.3 km', area: 'Rooftop bar · Sandton', emoji: '🌆' },
  { name: 'And Club Rosebank', status: 'Packed', dist: '1.1 km', area: 'House music · Rosebank', emoji: '🎵' },
  { name: 'Kong Lounge', status: 'Open', dist: '2.4 km', area: 'Cocktails · Hatfield', emoji: '🍸' },
];

const crew = [
  { name: 'Sipho', status: 'Main bar · 12m ago', pingable: true },
  { name: 'Khanyi', status: 'VIP Booth 3 · now', pingable: true },
  { name: 'Nia', status: 'Dancefloor · 4m ago', pingable: false },
  { name: 'Jay', status: 'Not at venue', pingable: true },
];

export const PatronView: React.FC = () => {
  const [view, setView] = useState('home');
  const budget = 860;
  const budgetMax = 1200;
  const overlay = useOverlay();

  const showToastDemo = useCallback(() => {
    overlay.toast({ type: 'success', title: 'Order placed!', description: 'Heineken ×2 added to tab #142.' });
  }, [overlay]);

  const showNudgeDemo = useCallback(() => {
    overlay.showNudge({
      title: 'Bundle & save',
      description: 'You usually get Heineken. Bundle 2 shots, save R20.',
      confidence: 0.84,
      acceptLabel: 'Add bundle',
      dismissLabel: 'No thanks',
      onAccept: () => overlay.toast({ type: 'success', title: 'Bundle added!', description: 'R20 saved on this round.' }),
    });
  }, [overlay]);

  const startTourDemo = useCallback(() => {
    overlay.startTour([
      { title: 'Your order live', description: 'Track your order status here — from prep to pickup.', targetSelector: '#order-card', position: 'bottom' },
      { title: 'Wallet & budget', description: 'Set a nightly cap so you never overspend.', targetSelector: '#wallet-card', position: 'bottom' },
      { title: 'Nearby venues', description: 'Browse what\'s happening at partner venues tonight.', targetSelector: '#venues-section', position: 'top' },
    ]);
  }, [overlay]);

  return (
    <AppShell role="patron" currentView={view} onNavigate={setView}>
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
            TONIGHT
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--fg)', letterSpacing: '-0.025em' }}>
            Hey, Thato.
          </div>
        </div>

        {/* Active order */}
        <Surface id="order-card" elevation={1} style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Badge variant="go">LIVE</Badge>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>
              PICKUP · W2
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>#B-42</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 2 }}>2× Heineken · 1× Savanna Dry</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>2:30</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>elapsed</div>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 4, borderRadius: 4, background: 'var(--bg-elev-2)' }}>
            <div style={{ width: '60%', height: '100%', borderRadius: 4, background: 'var(--accent)' }} />
          </div>
        </Surface>

        {/* Wallet */}
        <Surface id="wallet-card" elevation={1} glass style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
              TONIGHT WALLET
            </div>
            <Badge variant="neutral">FNB · 9821</Badge>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            R{budget.toLocaleString()}<span style={{ fontSize: 18, color: 'var(--fg-3)', fontWeight: 500 }}> / R{budgetMax.toLocaleString()}</span>
          </div>
          <ProgressBar value={(budget / budgetMax) * 100} size="sm" />
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 6 }}>
            Pace: R215/h · stop at 01:38
          </div>
        </Surface>

        {/* Nearby venues */}
        <div id="venues-section" style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 12 }}>
            TONIGHT NEAR YOU · 3 LIVE
          </div>
          {venues.map((v) => (
            <Surface key={v.name} elevation={1} style={{ padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28 }}>{v.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: 'var(--fg)' }}>{v.name}</div>
                  <Badge variant={v.status === 'Packed' ? 'warn' : v.status === 'Busy' ? 'go' : 'neutral'}>{v.status}</Badge>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 2 }}>{v.area}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>{v.dist}</div>
            </Surface>
          ))}
        </div>

        {/* Crew */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 12 }}>
            CREW NEARBY · 3 OF 5
          </div>
          {crew.map((c) => (
            <Surface key={c.name} elevation={1} style={{ padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 999,
                background: 'var(--accent)', color: 'var(--fg-on-emerald)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                flexShrink: 0,
              }}>
                {c.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.status}</div>
              </div>
              {c.pingable && (
                <button type="button" style={{
                  padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border-strong)',
                  background: 'transparent', color: 'var(--fg)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  Ping
                </button>
              )}
            </Surface>
          ))}
        </div>

        {/* Overlay demo triggers */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Button variant="outline" size="sm" icon="bell" onClick={showToastDemo}>Toast</Button>
          <Button variant="outline" size="sm" icon="sparkle" onClick={showNudgeDemo}>Nudge</Button>
          <Button variant="outline" size="sm" icon="info" onClick={startTourDemo}>Tour</Button>
        </div>
      </div>
    </AppShell>
  );
};
