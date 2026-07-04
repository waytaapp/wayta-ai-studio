export interface PulseProps {
  color?: string;
}

export const Pulse: React.FC<PulseProps> = ({ color = 'var(--wayta-go)' }) => (
  <span style={{ display: 'inline-flex', position: 'relative', width: 8, height: 8 }}>
    <span style={{ position: 'absolute', inset: 0, background: color, borderRadius: '50%' }} />
    <span
      style={{
        position: 'absolute',
        inset: -2,
        background: color,
        borderRadius: '50%',
        opacity: 0.4,
        animation: 'pulse 1.6s ease-out infinite',
      }}
    />
  </span>
);

export default Pulse;
