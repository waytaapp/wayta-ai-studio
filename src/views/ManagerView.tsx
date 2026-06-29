import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { type SidebarItem } from '../components/layout/Sidebar';

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'operations', label: 'Operations', icon: 'layers' },
  { id: 'staff', label: 'Staff', icon: 'users' },
  { id: 'inventory', label: 'Inventory', icon: 'box' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
];

const staffOnFloor = [
  { name: 'Kabelo M.', role: 'Runner · W2', score: 96, status: 'active' as const, zone: 'Bar 1' },
  { name: 'Lerato K.', role: 'Runner · W1', score: 91, status: 'active' as const, zone: 'Bar 2' },
  { name: 'Sipho D.', role: 'Bar 2', score: 64, status: 'active' as const, zone: 'Bar 2' },
  { name: 'Nia P.', role: 'Door', score: 99, status: 'active' as const, zone: 'Entry' },
];

export const ManagerView: React.FC = () => {
  const [view, setView] = useState('dashboard');

  return (
    <AppShell role="manager" currentView={view} onNavigate={setView} venueName="Latitude Rooftop" sidebarItems={sidebarItems}>
      <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
              TONIGHT · FRI 14 DEC · 23:41
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--fg)' }}>
              Floor's packed.
            </div>
          </div>
          <Badge variant="warn" dot>Alerts · 3</Badge>
        </div>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Revenue Tonight', value: 'R84,210', delta: '+18%', vs: 'vs. last Fri' },
            { label: 'Covers', value: '312', delta: '+24', vs: 'of 320 cap' },
            { label: 'Avg Ticket', value: 'R270', delta: '+4%', vs: 'median' },
            { label: 'Median Prep', value: '3:12', delta: '−12s', vs: 'SLA 92%' },
          ].map(m => (
            <Surface key={m.label} elevation={1} style={{ padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 6 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                {m.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                {m.delta}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>{m.vs}</div>
            </Surface>
          ))}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Smart nudge */}
          <Surface elevation={1} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="sparkle" size={16} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Smart Nudge · 4m ago
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 12 }}>
              Bar 2 is 2× slower than Bar 1. Likely cause: ice shortage. Send a runner to restock — patrons in queue avg. 8:42.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={{
                padding: '8px 14px', borderRadius: 999, border: 'none',
                background: 'var(--accent)', color: 'var(--fg-on-emerald)',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5,
                cursor: 'pointer',
              }}>
                Send runner
              </button>
              <button type="button" style={{
                padding: '8px 14px', borderRadius: 999, border: '1px solid var(--border-strong)',
                background: 'transparent', color: 'var(--fg)', fontFamily: 'var(--font-body)',
                fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
              }}>
                Dismiss
              </button>
            </div>
          </Surface>

          {/* Top SKUs */}
          <Surface elevation={1} style={{ padding: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 12 }}>
              TOP SKUS
            </div>
            {[
              { name: 'Heineken', sold: 142, runner: 'Kabelo M.', zone: 'VIP Booth 3', rev: 'R14,200' },
              { name: 'Klipdrift', sold: 98, runner: 'Lerato K.', zone: 'Bar 1', rev: 'R47,040' },
              { name: 'Savanna Dry', sold: 76, runner: 'Sipho D.', zone: 'Bar 2', rev: 'R3,420' },
            ].map(s => (
              <div key={s.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.sold} sold · {s.runner}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{s.rev}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{s.zone}</div>
                </div>
              </div>
            ))}
          </Surface>
        </div>

        {/* Staff on floor */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 12 }}>
            STAFF ON FLOOR · {staffOnFloor.length} active
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {staffOnFloor.map(s => (
              <Surface key={s.name} elevation={1} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 999,
                  background: 'var(--accent)', color: 'var(--fg-on-emerald)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                }}>
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--fg)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.role}</div>
                </div>
                <Badge variant={s.score > 90 ? 'go' : s.score > 70 ? 'warn' : 'stop'}>{s.score}%</Badge>
              </Surface>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
