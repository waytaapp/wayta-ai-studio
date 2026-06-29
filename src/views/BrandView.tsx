import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { type SidebarItem } from '../components/layout/Sidebar';

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'campaigns', label: 'Campaigns', icon: 'sparkle' },
  { id: 'venues', label: 'Venues', icon: 'map-pin' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
];

const campaigns = [
  { name: 'Smirnoff Summer · Rosebank', venue: '@ And Club', dates: '07 Feb → 21 Feb', pourCost: 'R32 / R65', sd: '78%', status: 'Live' as const },
  { name: 'Spin Twist · Hatfield', venue: '@ Kong Lounge', dates: '14 Feb → 28 Feb', pourCost: 'R28 / R52', sd: '0%', status: 'Scheduled' as const },
  { name: 'Black Label Cold Pull', venue: '@ Latitude Rooftop', dates: '01 Dec → 31 Dec', pourCost: 'R14 / R32', sd: '92%', status: 'Live' as const },
];

export const BrandView: React.FC = () => {
  const [view, setView] = useState('dashboard');

  return (
    <AppShell role="brand" currentView={view} onNavigate={setView} venueName="Smirnoff SA" sidebarItems={sidebarItems}>
      <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
            Q1 2026 · CAMPAIGNS
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--fg)' }}>
              Summer Series.
            </div>
            <button type="button" style={{
              padding: '8px 16px', borderRadius: 999, border: 'none',
              background: 'var(--accent)', color: 'var(--fg-on-emerald)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', boxShadow: 'var(--glow-emerald)',
            }}>
              New campaign
            </button>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--fg-2)', marginTop: 4 }}>
            3 campaigns running · 11 venue partners · 4,210 patrons reached this week.
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Sponsored Orders', value: '1,842', delta: '+22%' },
            { label: 'Cost / Pour', value: 'R4.20', delta: '−R0.80' },
            { label: 'Sell-Through', value: '78%', delta: 'On pace' },
            { label: 'Brand Lift', value: '+14 pts', delta: 'vs control' },
          ].map(m => (
            <Surface key={m.label} elevation={1} style={{ padding: 14 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                {m.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>{m.delta}</div>
            </Surface>
          ))}
        </div>

        {/* Campaign cards */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 12 }}>
          ACTIVE CAMPAIGNS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {campaigns.map(c => (
            <Surface key={c.name} elevation={1} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg)' }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 2 }}>{c.venue} · {c.dates}</div>
                </div>
                <Badge variant={c.status === 'Live' ? 'go' : 'neutral'}>{c.status}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--fg-3)' }}>
                <span>Pour cost: <strong style={{ color: 'var(--fg)' }}>{c.pourCost}</strong></span>
                <span>Budget: <strong style={{ color: c.sd === '92%' ? 'var(--accent)' : 'var(--fg)' }}>{c.sd}</strong></span>
              </div>
            </Surface>
          ))}
        </div>
      </div>
    </AppShell>
  );
};
