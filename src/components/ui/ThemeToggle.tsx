import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from './Icon';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const icons: Record<string, string> = {
    light: 'sun',
    dark: 'moon',
    system: 'monitor',
  };

  const labels: Record<string, string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all var(--dur-base) var(--ease-out)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      aria-label={`Theme: ${labels[theme]}. Click to cycle.`}
    >
      <Icon name={icons[theme] as any} size={16} />
      <span style={{ textTransform: 'capitalize' }}>{labels[theme]}</span>
    </button>
  );
};