import { useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { useOverlay } from '../../contexts/OverlayContext';

export function UpdatePrompt() {
  const { needRefresh, update } = usePWA();
  const { toast } = useOverlay();

  useEffect(() => {
    if (!needRefresh) return;
    toast({
      title: 'Update Available',
      description: 'A new version of Wayta is ready.',
      type: 'info',
      action: {
        label: 'Update',
        onClick: update,
      },
    });
  }, [needRefresh, toast, update]);

  return null;
}
