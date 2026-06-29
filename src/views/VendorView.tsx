import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { type SidebarItem } from '../components/layout/Sidebar';

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'menu', label: 'Menu', icon: 'coffee' },
  { id: 'inventory', label: 'Stock', icon: 'box', badge: 4 },
  { id: 'orders', label: 'Orders', icon: 'receipt' },
];

const menuItems = [
  { name: 'Black Label NRB', cat: 'Beer', size: '330ml', abv: '5.5%', cost: 'R14', retail: 'R32', margin: '56%', stock: 9, status: 'Bestseller' as const },
  { name: 'Castle Lite NRB', cat: 'Beer', size: '330ml', abv: '4%', cost: 'R15', retail: 'R35', margin: '57%', stock: 12, status: null },
  { name: 'Heineken', cat: 'Beer', size: '330ml', abv: '5%', cost: 'R18', retail: 'R42', margin: '57%', stock: 7, status: 'Bestseller' as const },
  { name: 'Klipdrift Premium', cat: 'Spirits', size: '750ml', abv: '43%', cost: 'R145', retail: 'R480', margin: '70%', stock: 4, status: 'Low Stock' as const },
  { name: 'Jack Daniels', cat: 'Spirits', size: '750ml', abv: '40%', cost: 'R320', retail: 'R780', margin: '59%', stock: 3, status: 'Low Stock' as const },
  { name: 'Savanna Dry', cat: 'Beer', size: '330ml', abv: '6%', cost: 'R19', retail: 'R45', margin: '58%', stock: 8, status: null },
];

const categories = ['All', 'Beer', 'Spirits', 'Wine', 'RTD', 'Soft'];

export const VendorView: React.FC = () => {
  const [view, setView] = useState('dashboard');
  const [cat, setCat] = useState('All');

  const filtered = cat === 'All' ? menuItems : menuItems.filter(m => m.cat === cat);

  return (
    <AppShell role="vendor" currentView={view} onNavigate={setView} venueName="Latitude Rooftop" sidebarItems={sidebarItems}>
      <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
            MENU & INVENTORY
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--fg)' }}>
            Stock Overview
          </div>
        </div>

        {/* Stock metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'SKUs Visible', value: '25' },
            { label: 'Retail Value', value: 'R187K' },
            { label: 'Low Stock', value: '4', warn: true },
            { label: 'Out of Stock', value: '3', stop: true },
          ].map(m => (
            <Surface key={m.label} elevation={1} style={{ padding: 14 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
                color: m.warn ? '#eab308' : m.stop ? '#ef4444' : 'var(--fg)',
                letterSpacing: '-0.02em',
              }}>
                {m.value}
              </div>
            </Surface>
          ))}
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              style={{
                padding: '6px 14px', borderRadius: 999, border: 'none',
                background: cat === c ? 'var(--accent)' : 'var(--bg-elev-1)',
                color: cat === c ? 'var(--fg-on-emerald)' : 'var(--fg-2)',
                fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', transition: 'all var(--dur-base) var(--ease-out)',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Menu table */}
        <Surface elevation={1} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Item', 'Category', 'Size', 'ABV', 'Cost', 'Retail', 'Margin', 'Stock'].map(h => (
                    <th key={h} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'var(--fg-3)', padding: '10px 14px', textAlign: 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.name} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{item.name}</div>
                      {item.status && (
                        <Badge variant={item.status === 'Low Stock' ? 'warn' : 'go'} size="sm">{item.status}</Badge>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-2)' }}>{item.cat}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)' }}>{item.size}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)' }}>{item.abv}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)' }}>{item.cost}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--fg)', fontWeight: 600 }}>{item.retail}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{item.margin}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--fg)', fontWeight: 600 }}>
                      {item.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>
    </AppShell>
  );
};
