import { type UserRole } from '../../types';
import { Eyebrow } from '../../ui/Eyebrow';
import { Title } from '../../ui/Title';
import { Lead } from '../../ui/Lead';
import { Icon } from '../../ui/Icon';

interface RoleOption { id: UserRole; label: string; description: string; icon: string }

const roles: RoleOption[] = [
  { id: 'patron', label: 'Patron', description: "I'm here to party. Order, pay, find my crew.", icon: 'sparkle' },
  { id: 'staff', label: 'Staff', description: 'I work the floor. Bartender, waiter, runner.', icon: 'bolt' },
  { id: 'manager', label: 'Venue Manager', description: 'I run operations. Menu, staff, analytics.', icon: 'layers' },
  { id: 'brand', label: 'Brand / Event Manager', description: 'I run campaigns, events, sponsorships.', icon: 'crown' },
  { id: 'admin', label: 'Admin', description: 'Platform ops. Venues, payments, compliance.', icon: 'shield' },
];

export interface RoleScreenProps {
  value: UserRole | null;
  onChange: (role: UserRole) => void;
}

export const RoleScreen: React.FC<RoleScreenProps> = ({ value, onChange }) => (
  <div>
    <Eyebrow>STEP 1 OF 7</Eyebrow>
    <Title>What brings you here?</Title>
    <Lead>Choose your path — each role unlocks different tools.</Lead>

    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {roles.map((r) => {
        const selected = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            style={{
              all: 'unset',
              background: selected ? 'var(--bg-emerald-soft)' : 'var(--bg-elev-1)',
              border: `1.5px solid ${selected ? 'var(--border-emerald)' : 'var(--border)'}`,
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', boxSizing: 'border-box',
              transition: 'all var(--dur-base) var(--ease-out)',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: selected ? 'var(--accent)' : 'var(--bg-elev-2)',
              color: selected ? 'var(--fg-on-emerald)' : 'var(--fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name={r.icon as any} size={18} stroke={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
                {r.label}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 2 }}>{r.description}</div>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: 999,
              border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {selected && <div style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--accent)' }} />}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
