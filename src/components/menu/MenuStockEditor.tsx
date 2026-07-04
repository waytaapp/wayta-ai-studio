import { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';

interface StockRow {
  cat: string;
  name: string;
  size: string;
  caseSize: number;
  abv: number;
  unitCost: number;
  retail: number;
  qty: number;
  hot?: boolean;
}

const SA_STOCK: StockRow[] = [
  { cat: 'Beer', name: 'Black Label NRB', size: '330ml', caseSize: 24, abv: 5.5, unitCost: 14, retail: 32, qty: 9, hot: true },
  { cat: 'Beer', name: 'Castle Lite NRB', size: '330ml', caseSize: 24, abv: 4.0, unitCost: 15, retail: 35, qty: 12 },
  { cat: 'Beer', name: 'Heineken', size: '330ml', caseSize: 24, abv: 5.0, unitCost: 18, retail: 42, qty: 7, hot: true },
  { cat: 'Beer', name: 'Corona Extra', size: '330ml', caseSize: 24, abv: 4.5, unitCost: 22, retail: 55, qty: 6 },
  { cat: 'Beer', name: 'Savanna Dry', size: '330ml', caseSize: 24, abv: 6.0, unitCost: 19, retail: 45, qty: 8 },
  { cat: 'Beer', name: "Hunter's Gold", size: '330ml', caseSize: 24, abv: 5.5, unitCost: 17, retail: 42, qty: 5 },
  { cat: 'Spirits', name: 'Klipdrift Premium', size: '750ml', caseSize: 6, abv: 43, unitCost: 145, retail: 480, qty: 4, hot: true },
  { cat: 'Spirits', name: "Jack Daniel's", size: '750ml', caseSize: 6, abv: 40, unitCost: 320, retail: 780, qty: 3 },
  { cat: 'Spirits', name: 'Tanqueray', size: '750ml', caseSize: 6, abv: 43.1, unitCost: 280, retail: 650, qty: 2 },
  { cat: 'Spirits', name: 'Bacardi Carta Blanca', size: '750ml', caseSize: 6, abv: 37.5, unitCost: 195, retail: 520, qty: 3 },
  { cat: 'Spirits', name: 'Absolut Vodka', size: '750ml', caseSize: 6, abv: 40, unitCost: 220, retail: 560, qty: 4 },
  { cat: 'Spirits', name: "Bell's Whisky", size: '750ml', caseSize: 6, abv: 43, unitCost: 195, retail: 480, qty: 2 },
  { cat: 'Wine', name: 'Nederburg Cab Sauv', size: '750ml', caseSize: 6, abv: 14, unitCost: 95, retail: 280, qty: 6, hot: true },
  { cat: 'Wine', name: 'JC le Roux Le Domaine', size: '750ml', caseSize: 6, abv: 7.5, unitCost: 88, retail: 240, qty: 5 },
  { cat: 'Wine', name: 'Robertson Chenin', size: '750ml', caseSize: 6, abv: 12.5, unitCost: 65, retail: 195, qty: 4 },
  { cat: 'RTD', name: 'Brutal Fruit Ruby', size: '275ml', caseSize: 24, abv: 5.5, unitCost: 19, retail: 48, qty: 9, hot: true },
  { cat: 'RTD', name: 'Smirnoff Spin Twist', size: '275ml', caseSize: 24, abv: 5.0, unitCost: 21, retail: 52, qty: 7 },
  { cat: 'RTD', name: 'Bernini Blush', size: '275ml', caseSize: 24, abv: 5.0, unitCost: 19, retail: 48, qty: 6 },
  { cat: 'Soft', name: 'Coca-Cola Original', size: '300ml', caseSize: 24, abv: 0, unitCost: 8, retail: 25, qty: 12 },
  { cat: 'Soft', name: 'Sprite Zero', size: '300ml', caseSize: 24, abv: 0, unitCost: 8, retail: 25, qty: 10 },
  { cat: 'Soft', name: 'Appletiser', size: '275ml', caseSize: 24, abv: 0, unitCost: 11, retail: 35, qty: 8, hot: true },
  { cat: 'Soft', name: 'Red Bull', size: '250ml', caseSize: 24, abv: 0, unitCost: 19, retail: 55, qty: 9 },
  { cat: 'Shots', name: 'Jägermeister', size: '50ml', caseSize: 0, abv: 35, unitCost: 28, retail: 80, qty: 0 },
  { cat: 'Shots', name: 'Patron Silver', size: '50ml', caseSize: 0, abv: 40, unitCost: 65, retail: 165, qty: 0 },
  { cat: 'Shots', name: 'Tequila Gold', size: '50ml', caseSize: 0, abv: 38, unitCost: 22, retail: 75, qty: 0 },
];

const CATS = ['All', 'Beer', 'Spirits', 'Wine', 'RTD', 'Soft', 'Shots'];

function EditableMoney({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent?: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg-elev-2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '4px 8px',
        minWidth: 84,
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: accent ? 'var(--fg-emerald)' : 'var(--fg-3)' }}>R</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          width: 64,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          color: accent ? 'var(--fg)' : 'var(--fg-1)',
          textAlign: 'right',
        }}
      />
    </div>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 6 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', display: 'grid', placeItems: 'center' }}
      >
        <Icon name="minus" size={12} />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        style={{
          width: 40,
          height: 28,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          color: value === 0 ? 'var(--wayta-stop)' : value < 4 ? '#facc15' : 'var(--fg)',
        }}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{ width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', display: 'grid', placeItems: 'center' }}
      >
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}

export const MenuStockEditor: React.FC = () => {
  const [rows, setRows] = useState(SA_STOCK);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');

  const update = (i: number, key: keyof StockRow, val: number) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  };

  const filtered = rows
    .map((r, i) => ({ ...r, _i: i }))
    .filter((r) => (cat === 'All' || r.cat === cat) && r.name.toLowerCase().includes(q.toLowerCase()));

  const totalRetail = filtered.reduce((s, r) => s + r.retail * r.qty * (r.caseSize || 1), 0);
  const totalSkus = filtered.length;
  const lowStock = filtered.filter((r) => r.qty > 0 && r.qty < 4).length;
  const empty = filtered.filter((r) => r.qty === 0).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
            Stock template · SA bestsellers preloaded
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, marginTop: 4, color: 'var(--fg)' }}>
            Menu &amp; inventory
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" icon="upload">Import CSV</Button>
          <Button variant="outline" size="sm" icon="layers">Use template</Button>
          <Button variant="primary" size="sm" icon="plus">New item</Button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { l: 'SKUs visible', v: totalSkus, sub: `${rows.length} total` },
          { l: 'Retail value on hand', v: `R${totalRetail.toLocaleString('en-ZA')}`, sub: 'cases × bottles × price' },
          { l: 'Low stock', v: lowStock, sub: '< 4 cases', tint: lowStock ? 'warn' : undefined },
          { l: 'Out of stock', v: empty, sub: 'reorder', tint: empty ? 'stop' : undefined },
        ].map((k) => (
          <Card key={k.l} padded={false} style={{
            padding: '10px 14px',
            borderColor: k.tint === 'warn' ? 'rgba(234,179,8,0.4)' : k.tint === 'stop' ? 'rgba(239,68,68,0.4)' : undefined,
          }}>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{k.l}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, marginTop: 2,
              color: k.tint === 'warn' ? '#facc15' : k.tint === 'stop' ? '#f87171' : 'var(--fg)',
            }}>
              {k.v}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {CATS.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
              <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.7 }}>
                {c === 'All' ? rows.length : rows.filter((r) => r.cat === c).length}
              </span>
            </Chip>
          ))}
        </div>
        <Input prefix={<Icon name="search" size={16} color="var(--fg-3)" />} placeholder="Find by name…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
      </div>

      {/* Spreadsheet body */}
      <Card padded={false} style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-elev-1)', zIndex: 1 }}>
              {['Item', 'Category', 'Size', 'Case', 'ABV', 'Unit cost', 'Retail', 'Margin', 'Cases on hand', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left', padding: '10px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.12em',
                    borderBottom: '1px solid var(--border)', fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const margin = (((r.retail - r.unitCost) / r.retail) * 100).toFixed(0);
              const isHigh = +margin >= 60;
              return (
                <tr key={r._i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {r.name}
                      {r.hot && <Badge variant="emerald" size="sm" icon="flame">Bestseller</Badge>}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    <Badge variant="neutral" size="sm">{r.cat}</Badge>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>{r.size}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>{r.caseSize || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>{r.abv}%</td>
                  <td style={{ padding: '6px 12px' }}>
                    <EditableMoney value={r.unitCost} onChange={(v) => update(r._i, 'unitCost', v)} />
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    <EditableMoney value={r.retail} onChange={(v) => update(r._i, 'retail', v)} accent />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: isHigh ? '#4ade80' : 'var(--fg-2)' }}>
                    {margin}%
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    <QtyStepper value={r.qty} onChange={(v) => update(r._i, 'qty', v)} />
                  </td>
                  <td style={{ padding: '10px 12px', width: 32 }}>
                    <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', padding: 4 }}>
                      <Icon name="x" size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
          Auto-saves to your venue draft
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm">Save as template</Button>
          <Button variant="primary" size="sm" iconRight="arrow">Publish menu</Button>
        </div>
      </div>
    </div>
  );
};

export default MenuStockEditor;
