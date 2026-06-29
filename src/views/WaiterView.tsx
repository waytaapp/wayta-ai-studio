import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';

interface Table { id: string; name: string; occupied: boolean; covers: number; orderItems: number; time: string; status: 'free' | 'ordering' | 'waiting' | 'served' }

const tables: Table[] = [
  { id: 'T1', name: 'Table 1', occupied: true, covers: 4, orderItems: 3, time: '0:18', status: 'ordering' },
  { id: 'T2', name: 'Table 2', occupied: true, covers: 2, orderItems: 5, time: '0:42', status: 'waiting' },
  { id: 'T3', name: 'Table 3', occupied: false, covers: 0, orderItems: 0, time: '—', status: 'free' },
  { id: 'T4', name: 'VIP Booth', occupied: true, covers: 6, orderItems: 8, time: '1:02', status: 'served' },
  { id: 'T5', name: 'Bar Rail', occupied: true, covers: 1, orderItems: 2, time: '0:08', status: 'ordering' },
  { id: 'T6', name: 'Table 6', occupied: false, covers: 0, orderItems: 0, time: '—', status: 'free' },
];

export const WaiterView: React.FC = () => {
  const [view, setView] = useState('tables');

  return (
    <AppShell role="waiter" currentView={view} onNavigate={setView}>
      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
            YOUR SECTION
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--fg)' }}>
            Tables
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {tables.map((t) => {
            const statusColor = t.status === 'free' ? 'var(--fg-3)' : t.status === 'waiting' ? '#eab308' : t.status === 'served' ? '#22c55e' : 'var(--accent)';
            return (
              <Surface key={t.id} elevation={1} glass style={{
                padding: 16, cursor: 'pointer',
                borderLeft: `3px solid ${statusColor}`,
                opacity: t.occupied ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: 'var(--fg)' }}>
                    {t.name}
                  </div>
                  <Badge variant={t.status === 'free' ? 'neutral' : t.status === 'waiting' ? 'warn' : t.status === 'served' ? 'go' : 'emerald'}>
                    {t.status}
                  </Badge>
                </div>
                {t.occupied && (
                  <>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12.5, color: 'var(--fg-2)' }}>
                      <span>{t.covers} covers</span>
                      <span>{t.orderItems} items</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--fg-3)' }}>
                      <span>{t.time}</span>
                      <button type="button" style={{
                        padding: '4px 10px', borderRadius: 999,
                        border: '1px solid var(--border-strong)', background: 'transparent',
                        color: 'var(--fg)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}>
                        Serve
                      </button>
                    </div>
                  </>
                )}
              </Surface>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};
