import { type SignupRole, type PatronStage1, type VenueStage1, type BrandStage1 } from './types';

export interface StageOneFieldsProps {
  role: SignupRole;
  data: PatronStage1 | VenueStage1 | BrandStage1;
  onChange: (data: Partial<PatronStage1 | VenueStage1 | BrandStage1>) => void;
}

const inputBoxStyle = (focused: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'var(--bg-elev-1)',
  border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
  borderRadius: 'var(--r-md)', padding: '14px 16px',
  boxShadow: focused ? '0 0 0 4px var(--bg-emerald-soft)' : 'none',
  transition: 'all 150ms ease',
});

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600,
  letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--fg)', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500,
  minWidth: 0,
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; type?: string }> = ({ label, value, onChange, placeholder, mono, type }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>{label}</div>
      <div style={inputBoxStyle(focused)}>
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={mono ? { ...inputStyle, fontFamily: 'var(--font-mono)' } : inputStyle}
        />
      </div>
    </div>
  );
};

import { useState } from 'react';

export const StageOneFields: React.FC<StageOneFieldsProps> = ({ role, data, onChange }) => {
  const set = (key: string, value: string) => onChange({ [key]: value });

  if (role === 'patron') {
    const d = data as PatronStage1;
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First name" value={d.firstName} onChange={(v) => set('firstName', v)} placeholder="Thato" />
          <Field label="Last name" value={d.lastName} onChange={(v) => set('lastName', v)} placeholder="Mokoena" />
        </div>
        <Field label="Mobile number" value={d.mobile} onChange={(v) => set('mobile', v)} placeholder="+27 82 555 0177" mono />
        <Field label="Date of birth" value={d.dob} onChange={(v) => set('dob', v)} placeholder="11 / 04 / 2000" />
        <Field label="City" value={d.city} onChange={(v) => set('city', v)} placeholder="Johannesburg" />
      </div>
    );
  }

  if (role === 'venue') {
    const d = data as VenueStage1;
    return (
      <div>
        <Field label="Venue name" value={d.venueName} onChange={(v) => set('venueName', v)} placeholder="Latitude Rooftop" />
        <Field label="Venue type" value={d.venueType} onChange={(v) => set('venueType', v)} placeholder="Bar" />
        <Field label="Suburb / district" value={d.suburb} onChange={(v) => set('suburb', v)} placeholder="Sandton" />
        <Field label="Operator email" value={d.email} onChange={(v) => set('email', v)} placeholder="ops@latitude.co.za" mono />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Capacity" value={String(d.capacity)} onChange={(v) => set('capacity', v)} placeholder="320" />
          <Field label="Going live by" value={d.goLiveDate} onChange={(v) => set('goLiveDate', v)} placeholder="14 Dec 2025" />
        </div>
      </div>
    );
  }

  if (role === 'brand') {
    const d = data as BrandStage1;
    return (
      <div>
        <Field label="Event / campaign name" value={d.eventName} onChange={(v) => set('eventName', v)} placeholder="Smirnoff Summer Series · Rosebank" />
        <Field label="Host brand" value={d.hostBrand} onChange={(v) => set('hostBrand', v)} placeholder="Smirnoff SA" />
        <Field label="Venue (if known)" value={d.venue} onChange={(v) => set('venue', v)} placeholder="And Club Rosebank" />
        <Field label="Event date" value={d.eventDate} onChange={(v) => set('eventDate', v)} placeholder="07 / 02 / 2026" />
        <Field label="Manager email" value={d.managerEmail} onChange={(v) => set('managerEmail', v)} placeholder="t.naidoo@smirnoff.co.za" mono />
      </div>
    );
  }

  return null;
};
