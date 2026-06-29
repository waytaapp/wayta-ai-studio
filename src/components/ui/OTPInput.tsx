import React, { useRef, useEffect, useCallback } from 'react';

export interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const target = e.currentTarget as HTMLInputElement;
    if (e.key === 'Backspace' && !target.value && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }, [length]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 1);
    const newValues = value.split('');
    newValues[index] = newValue;
    const joined = newValues.join('');
    onChange(joined);

    if (newValue && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (joined.length === length && onComplete) {
      onComplete(joined);
    }
  }, [value, onChange, onComplete, length]);

  useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          disabled={disabled}
          style={{
            width: 44,
            height: 52,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: 'var(--fg)',
            background: disabled ? 'var(--surface2)' : 'var(--surface)',
            border: `1.5px solid ${error ? 'var(--wayta-stop)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)',
            outline: 'none',
            transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--wayta-stop)' : 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

export default OTPInput;