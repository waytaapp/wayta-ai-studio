import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

type OrderStatus = 'new' | 'prepping' | 'ready' | 'collected';

interface Order { id: string; status: OrderStatus; items: string; tab: string; time: string; amount: string; zone: string; customer: string }

const orders: Order[] = [
  { id: '#B-44', status: 'new', items: '2× Heineken · 1× Corona Extra', tab: 'Tab #142', time: '0:18', amount: 'R119', zone: 'W2', customer: 'Sipho' },
  { id: '#B-45', status: 'new', items: '4× Brutal Fruit Ruby', tab: 'Tab #138', time: '0:42', amount: 'R220', zone: 'W2', customer: 'Lerato' },
  { id: '#B-46', status: 'new', items: '1× Tanqueray + Tonic', tab: 'Tab #144', time: '1:02', amount: 'R85', zone: 'W1', customer: 'Nia' },
  { id: '#B-42', status: 'prepping', items: '2× Corona Extra · 1× Klipdrift', tab: 'Tab #134', time: '2:30', amount: 'R195', zone: 'W2', customer: 'Kabelo' },
  { id: '#B-43', status: 'prepping', items: '3× Red Bull · 1× Bottle Klipdrift', tab: 'Tab #131', time: '3:48', amount: 'R460', zone: 'W1', customer: 'Khanyi' },
  { id: '#B-40', status: 'ready', items: '1× Savanna Dry', tab: 'Tab #136', time: '0:30', amount: 'R45', zone: 'W2', customer: 'Jay' },
  { id: '#B-41', status: 'ready', items: '2× Patron shot', tab: 'Tab #138', time: '4:55', amount: 'R320', zone: 'W1', customer: 'Nia' },
  { id: '#B-38', status: 'collected', items: '1× Klipdrift + Coke', tab: 'Tab #140', time: '5:10', amount: 'R280', zone: 'W2', customer: 'Sipho' },
  { id: '#B-37', status: 'collected', items: '2× Heineken', tab: 'Tab #142', time: '7:20', amount: 'R84', zone: 'W2', customer: 'Lerato' },
];

const columns: { key: OrderStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'var(--accent)' },
  { key: 'prepping', label: 'Prepping', color: '#eab308' },
  { key: 'ready', label: 'Ready', color: '#22c55e' },
  { key: 'collected', label: 'Collected', color: 'var(--fg-3)' },
];

export const StaffView: React.FC = () => {
  const [view, setView] = useState('orders');

  return (
    <AppShell role="staff" currentView={view} onNavigate={setView} venueName="Latitude Rooftop" sidebarItems={[]}>
      <div style={{ padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
              LIVE · 23:41
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--fg)', marginTop: 4 }}>
              Order Queue
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge variant="go">{orders.filter(o => o.status === 'new').length} New</Badge>
            <Badge variant="warn">{orders.filter(o => o.status === 'prepping').length} Prep</Badge>
            <Badge variant="neutral">{orders.filter(o => o.status === 'ready').length} Ready</Badge>
          </div>
        </div>

        {/* Kanban columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, minHeight: '60vh' }}>
          {columns.map(col => {
            const colOrders = orders.filter(o => o.status === col.key);
            return (
              <div key={col.key}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: col.color, marginBottom: 10, paddingBottom: 8,
                  borderBottom: `2px solid ${col.color}`,
                }}>
                  {col.label} · {colOrders.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colOrders.map(order => (
                    <Surface key={order.id} elevation={1} style={{
                      padding: 12, cursor: 'pointer',
                      borderLeft: `3px solid ${col.color}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                          {order.id}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                          {order.time}
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.4, marginBottom: 6 }}>
                        {order.items}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-3)' }}>
                        <span>{order.tab} · {order.zone}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{order.amount}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                        {order.customer}
                      </div>
                    </Surface>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom action rail */}
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 'var(--r-lg)',
          background: 'var(--bg-elev-1)', border: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" icon="bolt">Mark ready</Button>
            <Button variant="ghost" size="sm" icon="check">Mark collected</Button>
            <Button variant="ghost" size="sm" icon="warn">Flag issue</Button>
            <Button variant="ghost" size="sm" icon="x">Refuse / 86</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
            <span>Median prep <span style={{ color: 'var(--fg-1)', fontWeight: 700 }}>3:12</span></span>
            <span>SLA <span style={{ color: '#facc15', fontWeight: 700 }}>92%</span></span>
            <Button variant="primary" size="sm" iconRight="arrow">Call next runner</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
