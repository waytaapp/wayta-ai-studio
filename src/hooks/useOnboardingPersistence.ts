import { useState, useEffect } from 'react';

export function useOnboardingPersistence(role: string) {
  const key = `wayta_onboarding_dismissed_${role}`;
  const [disabled, setDisabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  });

  const disable = () => {
    try {
      localStorage.setItem(key, 'true');
    } catch {}
    setDisabled(true);
  };

  return { disabled, disable };
}
