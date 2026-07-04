import { useState } from 'react';

export function useOnboarding(totalSteps: number) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < totalSteps - 1) setStep(s => s + 1);
    else setOpen(false);
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const reset = () => {
    setOpen(false);
  };

  return { open, step, total: totalSteps, next, prev, reset };
}
