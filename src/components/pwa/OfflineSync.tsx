import { useEffect, useRef } from 'react';
import { createSyncListener, type QueuedMutation } from '../../services/offlineQueue';

type SyncHandler = (mutations: QueuedMutation[]) => Promise<void>;

let globalSyncHandler: SyncHandler | null = null;

export function setSyncHandler(handler: SyncHandler) {
  globalSyncHandler = handler;
}

export function OfflineSync() {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const cleanup = createSyncListener(async (mutations) => {
      if (globalSyncHandler) {
        await globalSyncHandler(mutations);
      }
    });

    return cleanup;
  }, []);

  return null;
}
