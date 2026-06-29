import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { type SidebarItem } from '../components/layout/Sidebar';

const sidebarItems: SidebarItem[] = [
  { id: 'telemetry', label: 'Telemetry', icon: 'chart' },
  { id: 'venues', label: 'Venues', icon: 'map-pin' },
  { id: 'brands', label: 'Brands', icon: 'sparkle' },
  { id: 'patrons', label: 'Patrons', icon: 'users' },
  { id: 'payments', label: 'Payments', icon: 'card' },
  { id: 'incidents', label: 'Incidents', icon: 'shield', badge: 2 },
];

const venues = [
  { name: 'Latitude Rooftop', covers: 312, gmv: 'R84.2k', prep: '3:12', status: 'ok' as const },
  { name: 'And Club Rosebank', covers: 442, gmv: 'R142.3k', prep: '2:48', status: 'ok' as const },
  { name: 'Kong Lounge', covers: 188, gmv: 'R38.1k', prep: '5:42', status: 'warn' as const },
  { name: 'Loft @ Hatfield', covers: 92, gmv: 'R14.2k', prep: '8:20', status: 'stop' as const },
  { name: 'Mootee Bar', covers: 64, gmv: 'R9.8k', prep: '3:02', status: 'ok' as const },
  { name: 'Eight & Main', covers: 211, gmv: 'R56.7k', prep: '3:48', status: 'ok' as const },
];

const paymentRails = [
  { name: 'Stitch', uptime: '99.8%', status: 'ok' as const },
  { name: 'Yoco', uptime: '99.5%', status: 'ok' as const },
  { name: 'SnapScan', uptime: '92.1%', status: 'degraded' as const },
  { name: 'Zapper', uptime: '99.9%', status: 'ok' as const },
];

export const AdminView: React.FC = () => {
  const [view, setView] = useState('telemetry');

  return (
    <AppShell role="admin" currentView={view} onNavigate={setView} venueName="Platform Ops" sidebarItems={sidebarItems}>
      <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
              FRIDAY · 23:41 · SAST
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--fg)' }}>
              Platform pulse.
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--fg-2)', marginTop: 4 }}>
              14 venues live · 2 incidents flagged · GMV pacing +18% WoW.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{
              padding: '8px 14px', borderRadius: 999, border: 'none',
              background: 'var(--bg-elev-1)', color: 'var(--fg)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            }}>
              <Icon name="search" size={14} /> Lookup user
            </button>
            <button type="button" style={{
              padding: '8px 14px', borderRadius: 999, border: 'none',
              background: '#ef4444', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="shield" size={14} /> Kill switch
            </button>
          </div>
        </div>

        {/* Key metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'GMV Tonight', value: 'R942k', delta: '+18%' },
            { label: 'Active Venues', value: '14', delta: '+2 this wk' },
            { label: 'Patrons Online', value: '3,842', delta: 'LIVE' },
            { label: 'Payment Fail Rate', value: '0.42%', delta: '−0.1%' },
            { label: 'P95 Prep SLA', value: '4:18', delta: 'WATCH' },
          ].map(m => (
            <Surface key={m.label} elevation={1} style={{ padding: 14 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                {m.value}
              </div>
              <div style={{ fontSize: 11, color: m.delta === 'WATCH' ? '#eab308' : 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                {m.delta}
              </div>
            </Surface>
          ))}
        </div>

        {/* Two-column: Venue Health + Incidents */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Venue Health */}
          <Surface elevation={1} style={{ padding: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 12 }}>
              VENUE HEALTH · LIVE SLA
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Venue', 'Covers', 'GMV', 'P95 Prep', 'Status'].map(h => (
                    <th key={h} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'var(--fg-3)', padding: '8px 10px', textAlign: 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {venues.map((v, i) => (
                  <tr key={v.name} style={{ borderBottom: i < venues.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--fg)' }}>{v.name}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--fg-2)' }}>{v.covers}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{v.gmv}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{v.prep}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <Badge variant={v.status === 'stop' ? 'stop' : v.status === 'warn' ? 'warn' : 'go'}>
                        {v.status === 'ok' ? 'OK' : v.status === 'warn' ? 'WARN' : 'STOP'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>

          {/* Incidents */}
          <Surface elevation={1} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="shield" size={16} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
                Incidents · 2 OPEN
              </div>
            </div>
            <div style={{
              padding: 12, borderRadius: 12,
              background: 'var(--wayta-stop-bg)', border: '1px solid rgba(239,68,68,0.3)',
            }}>
              <Badge variant="stop">OPEN</Badge>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', marginTop: 8, marginBottom: 4 }}>
                Loft @ Hatfield
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                Bar 2 terminal offline since 23:18. 14 patrons waiting &gt; 6 min. Auto-paused new orders.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" style={{
                  padding: '6px 12px', borderRadius: 999, border: 'none',
                  background: '#ef4444', color: '#fff',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11.5, cursor: 'pointer',
                }}>
                  Escalate
                </button>
                <button type="button" style={{
                  padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border-strong)',
                  background: 'transparent', color: 'var(--fg)',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11.5, cursor: 'pointer',
                }}>
                  Ping venue
                </button>
              </div>
            </div>
          </Surface>
        </div>

        {/* Payment Rails */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 12 }}>
            PAYMENT RAILS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {paymentRails.map(p => (
              <Surface key={p.name} elevation={1} style={{
                padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderLeft: `3px solid ${p.status === 'degraded' ? '#eab308' : '#22c55e'}`,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{p.name}</div>
                  <Badge variant={p.status === 'degraded' ? 'warn' : 'go'}>{p.uptime}</Badge>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: p.status === 'degraded' ? '#eab308' : '#22c55e',
                  boxShadow: p.status === 'degraded' ? '0 0 8px rgba(234,179,8,0.5)' : '0 0 8px rgba(34,197,94,0.5)',
                }} />
              </Surface>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
