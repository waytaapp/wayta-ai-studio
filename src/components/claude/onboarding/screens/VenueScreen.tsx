import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

interface Venue { x: string; y: string; name: string; active: boolean }

const pins: Venue[] = [
  { x: '22%', y: '34%', name: 'PULSE',    active: true  },
  { x: '60%', y: '22%', name: 'KONKA',    active: false },
  { x: '78%', y: '68%', name: 'TOY ROOM', active: false },
  { x: '36%', y: '78%', name: 'AYEPYEP',  active: false },
];

export const VenueScreen: React.FC = () => (
  <div>
    <Eyebrow>STEP 5 OF 7</Eyebrow>
    <Title>Find the venue, fast.</Title>
    <Lead>
      Wayta auto-detects which club or festival you're at so the right menu opens the second you walk in.
    </Lead>

    <div style={{
      marginTop: 24, height: 200, borderRadius: 16,
      background: 'var(--bg-elev-1)', border: '1px solid var(--border)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: '24px 24px', opacity: 0.55,
      }} />
      <div style={{ position: 'absolute', left: '14%', top: 0, bottom: 0, width: 2, background: 'var(--border-strong)', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: '55%', left: 0, right: 0, height: 2, background: 'var(--border-strong)', opacity: 0.5 }} />
      {pins.map((v, i) => (
        <div key={i} style={{
          position: 'absolute', left: v.x, top: v.y,
          transform: 'translate(-50%,-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <div style={{
            width: v.active ? 14 : 10, height: v.active ? 14 : 10, borderRadius: 999,
            background: v.active ? 'var(--accent)' : 'var(--fg-3)',
            boxShadow: v.active ? '0 0 0 6px var(--bg-emerald-soft)' : 'none',
            border: '2px solid var(--bg)',
          }} />
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.12em', color: v.active ? 'var(--accent)' : 'var(--fg-3)',
          }}>{v.name}</div>
        </div>
      ))}
      <div style={{
        position: 'absolute', top: 12, left: 14,
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
        color: 'var(--fg-3)', fontWeight: 700,
      }}>● 4 NEARBY</div>
      <div style={{
        position: 'absolute', top: 12, right: 14,
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
        color: 'var(--accent)', fontWeight: 700,
      }}>SANDTON</div>
    </div>

    <div style={{
      marginTop: 18, padding: '14px 16px',
      background: 'var(--bg-elev-1)', border: '1px solid var(--border)', borderRadius: 14,
    }}>
      {[
        { icon: 'map-pin' as const, title: 'Used only at venues',  body: "We check your location when you open the app inside a partner venue. Nowhere else." },
        { icon: 'shield' as const, title: 'Never shared',         body: "Your dot doesn't appear to other patrons. Only your invited crew sees you on the map." },
      ].map((row, i, arr) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          paddingBottom: i === arr.length - 1 ? 0 : 14,
          paddingTop: i === 0 ? 0 : 14,
          borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'var(--bg-emerald-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name={row.icon} size={15} stroke={2} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{row.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.45, marginTop: 2 }}>{row.body}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
