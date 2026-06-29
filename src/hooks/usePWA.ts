/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePWA() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      if (reg) {
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  const close = () => setNeedRefresh(false);

  const update = () => {
    updateServiceWorker(true);
  };

  return { needRefresh, close, update };
}
